-- ============================================================
-- LEGACY BOT — Migration Script
-- Run this ONCE to upgrade the schema for the complete bot.
-- Compatible with existing data (uses IF NOT EXISTS + ALTER).
-- ============================================================

USE legacy;

SET FOREIGN_KEY_CHECKS = 0;

-- ============================================================
-- FIX: conversations table — add missing columns
-- The controller uses 'channel' and 'updated_at' but schema had
-- only 'whatsapp_chat_id'. We add the missing ones safely.
-- ============================================================
ALTER TABLE conversations
    ADD COLUMN IF NOT EXISTS channel ENUM('whatsapp','email','manual') DEFAULT 'whatsapp'  AFTER lead_id,
    ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP  AFTER status,
    MODIFY COLUMN status ENUM('open','in_progress','resolved') DEFAULT 'open';

-- ============================================================
-- FIX: leads table — add bot_stage column for state machine
-- ============================================================
ALTER TABLE leads
    ADD COLUMN IF NOT EXISTS bot_stage VARCHAR(50) DEFAULT 'reception' AFTER bot_active,
    ADD COLUMN IF NOT EXISTS bot_last_seen TIMESTAMP NULL DEFAULT NULL AFTER bot_stage;

-- ============================================================
-- FIX: bot_sessions — expand step enum for 10-stage funnel
-- ============================================================
ALTER TABLE bot_sessions
    MODIFY COLUMN step ENUM(
        'reception',
        'case_identification',
        'cpf_collection',
        'approval_hook',
        'payment_objection',
        'document_request',
        'insecurity_handling',
        'documents_received',
        'timeline_question',
        'followup',
        'done'
    ) DEFAULT 'reception';

-- ============================================================
-- NEW: bot_memory — self-learning pattern storage
-- The bot learns from successful interactions automatically.
-- ============================================================
CREATE TABLE IF NOT EXISTS bot_memory (
    id INT AUTO_INCREMENT PRIMARY KEY,

    -- What kind of pattern this is
    category ENUM(
        'objection',          -- client expressed doubt/fear
        'question',           -- client asked a specific question
        'success_pattern',    -- message sequence that led to CPF given
        'error_pattern',      -- response that confused the client
        'case_type_signal'    -- keywords that point to a legal area
    ) NOT NULL,

    -- Raw text pattern that triggered this memory
    trigger_pattern TEXT NOT NULL,

    -- The response that worked well (for success/objection)
    successful_response TEXT DEFAULT NULL,

    -- Which legal area this pattern is associated with (nullable)
    legal_area ENUM('trabalhista','consumidor','cibernetico','pix') DEFAULT NULL,

    -- Did the lead advance in the funnel after this response?
    lead_converted TINYINT(1) DEFAULT 0,

    -- How many times this pattern was seen and reused
    usage_count INT DEFAULT 1,

    -- Confidence score 0-100 (updated by learning engine)
    confidence_score TINYINT UNSIGNED DEFAULT 50,

    -- Soft-delete: assessor can disable a bad pattern without losing history
    is_active TINYINT(1) DEFAULT 1,

    last_used_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    created_at   TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    INDEX idx_memory_category (category),
    INDEX idx_memory_area (legal_area),
    INDEX idx_memory_usage  (usage_count DESC),
    INDEX idx_memory_active (is_active),
    FULLTEXT INDEX ft_trigger (trigger_pattern)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================================
-- NEW: bot_handoffs — log when bot passes lead to assessor
-- ============================================================
CREATE TABLE IF NOT EXISTS bot_handoffs (
    id INT AUTO_INCREMENT PRIMARY KEY,
    lead_id INT NOT NULL,
    reason ENUM('documents_received','client_request','assessor_override','error') DEFAULT 'documents_received',
    bot_stage_at_handoff VARCHAR(50) DEFAULT NULL,
    summary TEXT DEFAULT NULL,         -- AI-generated summary for the assessor
    notified_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    acknowledged_by INT DEFAULT NULL,  -- user_id of the assessor who picked up
    acknowledged_at TIMESTAMP NULL DEFAULT NULL,
    FOREIGN KEY (lead_id) REFERENCES leads(id) ON DELETE CASCADE,
    FOREIGN KEY (acknowledged_by) REFERENCES users(id) ON DELETE SET NULL,
    INDEX idx_handoff_lead (lead_id),
    INDEX idx_handoff_ack (acknowledged_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================================
-- Seed initial bot memory with proven objection handlers
-- (Based on real conversation patterns from Wesley & Adriana)
-- ============================================================
INSERT IGNORE INTO bot_memory (category, trigger_pattern, successful_response, legal_area, lead_converted, confidence_score) VALUES
('objection', 'é golpe|é piramide|desconfio|não confio|tenho medo de golpe',
 'Eu entendo sua insegurança, hoje em dia existem muitos golpistas. Mas te garanto: nosso serviço é sério. Se fosse um golpista, estaria aqui te cobrando R$100 para limpar seu nome. Trabalhamos só com êxito — pode ficar tranquilo(a)! 🙏',
 NULL, 1, 90),

('question', 'quanto custa|quanto vou pagar|tem taxa|cobra quanto|valor',
 'Não cobramos nada dos nossos clientes. Trabalhamos em cima de resultado: se ganharmos a indenização, você paga os honorários advocatícios. Caso contrário, você não tem que pagar NADA 👍',
 NULL, 1, 95),

('question', 'quanto tempo|quando fica pronto|prazo|demora quanto',
 'O prazo depende do juiz responsável pelo seu caso. Assim que tivermos atualizações, entraremos em contato diretamente! 🙏',
 NULL, 1, 85),

('case_type_signal', 'demitido|demissão|fui mandado embora|aviso prévio|horas extras|fgts|assédio',
 NULL, 'trabalhista', 0, 90),

('case_type_signal', 'copasa|cemig|conta de luz|fatura errada|cobrança indevida|negativado|serasa|spc|faculdade|curso',
 NULL, 'consumidor', 0, 88),

('case_type_signal', 'whatsapp hackeado|conta invadida|clonaram|fraude online|dados roubados|phishing',
 NULL, 'cibernetico', 0, 92),

('case_type_signal', 'pix|caí em golpe|transferência|fui enganado|falso vendedor|boleto falso',
 NULL, 'pix', 0, 92),

('success_pattern', 'obrigado|ótimo|certo|pode ser|sim|vou mandar|ok|manda aí',
 NULL, NULL, 1, 70);

SET FOREIGN_KEY_CHECKS = 1;
