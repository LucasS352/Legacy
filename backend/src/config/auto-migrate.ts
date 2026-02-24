/**
 * auto-migrate.ts
 * Runs schema migrations automatically on server startup.
 * Uses IF NOT EXISTS and ADD COLUMN IF NOT EXISTS so it's safe
 * to run multiple times (idempotent).
 */

import { db } from './database';

export async function runAutoMigrations(): Promise<void> {
    console.log('[DB] Running auto-migrations...');

    try {
        // ── 1. Add missing columns to conversations ──────────────
        await db.raw(`
            ALTER TABLE conversations
                ADD COLUMN IF NOT EXISTS channel ENUM('whatsapp','email','manual') DEFAULT 'whatsapp' AFTER lead_id,
                ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP AFTER status
        `).catch(() => {/* column may already exist */ });

        // ── 2. Add bot tracking columns to leads ─────────────────
        await db.raw(`
            ALTER TABLE leads
                ADD COLUMN IF NOT EXISTS bot_stage VARCHAR(50) DEFAULT 'reception' AFTER bot_active,
                ADD COLUMN IF NOT EXISTS bot_last_seen TIMESTAMP NULL DEFAULT NULL AFTER bot_stage
        `).catch(() => {/* column may already exist */ });

        // ── 3. Expand bot_sessions step enum for 10-stage funnel ─
        await db.raw(`
            ALTER TABLE bot_sessions
                MODIFY COLUMN step ENUM(
                    'reception','case_identification','cpf_collection',
                    'approval_hook','payment_objection','document_request',
                    'insecurity_handling','documents_received',
                    'timeline_question','followup','done'
                ) DEFAULT 'reception'
        `).catch(() => {/* already correct */ });

        // ── 4. Create bot_memory (self-learning) table ────────────
        await db.raw(`
            CREATE TABLE IF NOT EXISTS bot_memory (
                id INT AUTO_INCREMENT PRIMARY KEY,
                category ENUM('objection','question','success_pattern','error_pattern','case_type_signal') NOT NULL,
                trigger_pattern TEXT NOT NULL,
                successful_response TEXT DEFAULT NULL,
                legal_area ENUM('trabalhista','consumidor','cibernetico','pix') DEFAULT NULL,
                lead_converted TINYINT(1) DEFAULT 0,
                usage_count INT DEFAULT 1,
                confidence_score TINYINT UNSIGNED DEFAULT 50,
                is_active TINYINT(1) DEFAULT 1,
                last_used_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                INDEX idx_memory_category (category),
                INDEX idx_memory_area (legal_area),
                INDEX idx_memory_usage (usage_count DESC),
                INDEX idx_memory_active (is_active)
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
        `);

        // ── 5. Create bot_handoffs table ──────────────────────────
        await db.raw(`
            CREATE TABLE IF NOT EXISTS bot_handoffs (
                id INT AUTO_INCREMENT PRIMARY KEY,
                lead_id INT NOT NULL,
                reason ENUM('documents_received','client_request','assessor_override','error') DEFAULT 'documents_received',
                bot_stage_at_handoff VARCHAR(50) DEFAULT NULL,
                summary TEXT DEFAULT NULL,
                notified_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                acknowledged_by INT DEFAULT NULL,
                acknowledged_at TIMESTAMP NULL DEFAULT NULL,
                FOREIGN KEY (lead_id) REFERENCES leads(id) ON DELETE CASCADE,
                INDEX idx_handoff_lead (lead_id),
                INDEX idx_handoff_ack (acknowledged_at)
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
        `);

        // ── 6. Seed initial bot memory patterns (if empty) ───────
        const count = await db('bot_memory').count('id as c').first();
        const memoryCount = parseInt(String((count as { c: string }).c || '0'), 10);

        if (memoryCount === 0) {
            await db('bot_memory').insert([
                {
                    category: 'objection',
                    trigger_pattern: 'é golpe|piramide|desconfio|não confio|tenho medo de golpe',
                    successful_response: 'Eu entendo sua insegurança! Mas te garanto: nosso serviço é sério. Se fosse um golpista, estaria te cobrando R$100 agora. Trabalhamos só com êxito — sem ganhar, você não paga NADA 🙏',
                    legal_area: null,
                    lead_converted: 1,
                    confidence_score: 90,
                },
                {
                    category: 'question',
                    trigger_pattern: 'quanto custa|tem taxa|cobra quanto|valor|honorário|é de graça',
                    successful_response: 'Não cobramos nada adiantado. Trabalhamos em cima de resultado: se ganharmos, você paga os honorários. Caso contrário, você não paga NADA 👍',
                    legal_area: null,
                    lead_converted: 1,
                    confidence_score: 95,
                },
                {
                    category: 'question',
                    trigger_pattern: 'quanto tempo|quando fica pronto|prazo|demora quanto|quando termina',
                    successful_response: 'O prazo depende do juiz responsável pelo seu caso. Assim que tivermos atualizações, entraremos em contato direto! 🙏',
                    legal_area: null,
                    lead_converted: 1,
                    confidence_score: 85,
                },
                {
                    category: 'case_type_signal',
                    trigger_pattern: 'demitido|demissão|mandado embora|aviso prévio|horas extras|fgts|assédio|carteira de trabalho',
                    successful_response: null,
                    legal_area: 'trabalhista',
                    lead_converted: 0,
                    confidence_score: 90,
                },
                {
                    category: 'case_type_signal',
                    trigger_pattern: 'copasa|cemig|cobrança indevida|negativado|serasa|spc|faculdade|curso',
                    successful_response: null,
                    legal_area: 'consumidor',
                    lead_converted: 0,
                    confidence_score: 88,
                },
                {
                    category: 'case_type_signal',
                    trigger_pattern: 'whatsapp hackeado|conta invadida|clonaram|dados roubados|phishing|fraude online',
                    successful_response: null,
                    legal_area: 'cibernetico',
                    lead_converted: 0,
                    confidence_score: 92,
                },
                {
                    category: 'case_type_signal',
                    trigger_pattern: 'pix|caí em golpe|fui enganado|falso vendedor|boleto falso|estelionato',
                    successful_response: null,
                    legal_area: 'pix',
                    lead_converted: 0,
                    confidence_score: 92,
                },
            ]);
            console.log('[DB] Seeded initial bot_memory patterns (7 patterns)');
        }

        console.log('[DB] ✅ Auto-migrations completed successfully');
    } catch (err) {
        console.error('[DB] ❌ Migration error (non-fatal):', err);
        // Don't throw — migrations shouldn't block server startup
    }
}
