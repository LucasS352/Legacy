import { Request, Response } from 'express';
import { db } from '../config/database';
import { aiService, buildLeadContext, getRelevantMemories, buildCompressedHistory } from '../services/ai.service';
import { getWebSocketServer } from '../services/websocket.service';

// Handle incoming WhatsApp webhook messages
export async function handleWebhook(req: Request, res: Response): Promise<void> {
    try {
        // Different WhatsApp providers (Evolution API, Baileys, etc.) send different formats
        // We normalize the incoming payload here
        const body = req.body;

        // Immediately respond 200 to the webhook provider so it doesn't retry
        res.status(200).json({ received: true });

        // Process asynchronously
        await processIncomingMessage(body);
    } catch (err) {
        console.error('Webhook error:', err);
        // Already responded 200 above
    }
}

async function processIncomingMessage(payload: Record<string, unknown>): Promise<void> {
    try {
        // Normalize message from different WhatsApp providers
        const normalized = normalizeWebhookPayload(payload);
        if (!normalized) return;

        const { phone, name, message, whatsappId, chatId } = normalized;

        // Find or create lead
        let lead = await db('leads').where({ phone }).first();

        if (!lead) {
            // Get default funnel (trabalhista) and default stage (recebido)
            const defaultFunnel = await db('funnels').where({ slug: 'trabalhista' }).first();
            const defaultStage = await db('stages').where({ slug: 'recebido' }).first();

            if (!defaultFunnel || !defaultStage) {
                console.error('Default funnel/stage not found. Please run seed.sql');
                return;
            }

            const [leadId] = await db('leads').insert({
                name: name || phone,
                phone,
                origin: 'whatsapp',
                funnel_id: defaultFunnel.id,
                stage_id: defaultStage.id,
                whatsapp_id: whatsappId,
                bot_active: 1,
            });

            lead = await db('leads').where({ id: leadId }).first();

            // Create bot session
            const sessionToken = `sess_${leadId}_${Date.now()}`;
            await db('bot_sessions').insert({
                lead_id: leadId,
                session_token: sessionToken,
                step: 'greeting',
                is_active: 1,
            });

            await db('leads').where({ id: leadId }).update({ bot_session_id: sessionToken });
        }

        // Find or create conversation
        let conversation = await db('conversations').where({ lead_id: lead.id }).first();
        if (!conversation) {
            const [convId] = await db('conversations').insert({
                lead_id: lead.id,
                whatsapp_chat_id: chatId || whatsappId,
                channel: 'whatsapp',
                status: 'open',
            });
            conversation = await db('conversations').where({ id: convId }).first();
        }

        // Store the message
        await db('messages').insert({
            conversation_id: conversation.id,
            lead_id: lead.id,
            content: message,
            direction: 'inbound',
            sender: 'lead',
        });

        // Update conversation last message
        await db('conversations').where({ id: conversation.id }).update({
            last_message_at: new Date(),
            unread_count: db.raw('unread_count + 1'),
        });

        // Update lead
        await db('leads').where({ id: lead.id }).update({ updated_at: new Date() });

        // Notify CRM via WebSocket (real-time update)
        const wss = getWebSocketServer();
        if (wss) {
            wss.emit('new_message', {
                lead_id: lead.id,
                lead_name: lead.name,
                message: message.substring(0, 100),
                conversation_id: conversation.id,
            });
        }

        // Process AI bot response if bot is active
        if (lead.bot_active) {
            await processAIBotResponse(lead, message, conversation.id);
        }
    } catch (err) {
        console.error('Process incoming message error:', err);
    }
}

async function processAIBotResponse(
    lead: Record<string, unknown>,
    userMessage: string,
    conversationId: number
): Promise<void> {
    try {
        // Get full conversation history with sender info for compression
        const rawHistory = await db('messages')
            .where('conversation_id', conversationId)
            .orderBy('sent_at', 'asc')
            .limit(20)
            .select('content', 'direction', 'sender');

        // Build compressed history (last 6 msgs + summary of older ones)
        const conversationHistory = buildCompressedHistory(
            rawHistory as Array<{ direction: string; content: string; sender: string }>
        );

        // Exclude the last message (current user msg) from history sent to AI
        const historyWithoutLast = conversationHistory.slice(0, -1);

        // Build rich lead context with current bot stage
        const leadContext = await buildLeadContext(lead.id as number);

        // Get relevant memory patterns for smarter replies
        const memories = await getRelevantMemories(userMessage);

        const botReply = await aiService.generateBotReply(
            historyWithoutLast,
            userMessage,
            leadContext,
            memories
        );

        if (!botReply) return;

        await db('messages').insert({
            conversation_id: conversationId,
            lead_id: lead.id as number,
            content: botReply,
            direction: 'outbound',
            sender: 'bot',
        });

        const wss = getWebSocketServer();
        if (wss) {
            wss.emit('bot_response', { lead_id: lead.id, message: botReply });
        }

        await aiService.sendWhatsAppMessage(String(lead.phone || ''), botReply);
    } catch (err) {
        console.error('AI bot processing error:', err);
    }
}


function normalizeWebhookPayload(payload: Record<string, unknown>): {
    phone: string;
    name: string;
    message: string;
    whatsappId: string;
    chatId: string;
} | null {
    try {
        // Only process messages.upsert events — ignore connection.update, qrcode.updated, etc.
        const event = String(payload.event || '');
        if (event && event !== 'messages.upsert') return null;

        // Evolution API / Baileys bridge format: { event, instance, data: msg }
        if (payload.data && typeof payload.data === 'object') {
            const data = payload.data as Record<string, unknown>;
            const key = data.key as Record<string, unknown>;
            const messageContent = data.message as Record<string, unknown>;

            if (!key || !messageContent) return null;

            // CRITICAL: Ignore messages sent BY the bot (fromMe = true)
            if (key.fromMe === true) {
                console.log('[Webhook] Skipping outbound message (fromMe=true)');
                return null;
            }

            // Ignore group messages
            const remoteJid = String(key.remoteJid || '');
            if (remoteJid.includes('@g.us')) {
                console.log('[Webhook] Skipping group message');
                return null;
            }

            const phone = remoteJid.replace('@s.whatsapp.net', '').replace('@c.us', '');
            if (!phone) return null;

            const message =
                (messageContent.conversation as string) ||
                (messageContent.extendedTextMessage as Record<string, string>)?.text ||
                '[Media]';

            const pushName = String(data.pushName || phone);

            return {
                phone,
                name: pushName,
                message,
                whatsappId: remoteJid,
                chatId: remoteJid,
            };
        }

        // Generic/Baileys format
        if (payload.phone && payload.message) {
            return {
                phone: String(payload.phone),
                name: String(payload.name || payload.phone),
                message: String(payload.message),
                whatsappId: String(payload.whatsappId || payload.phone),
                chatId: String(payload.chatId || payload.phone),
            };
        }

        return null;
    } catch {
        return null;
    }
}

// Get conversations list for a lead
export async function getConversations(req: Request, res: Response): Promise<void> {
    const { lead_id } = req.params;
    try {
        const messages = await db('messages')
            .where({ lead_id: Number(lead_id) })
            .orderBy('sent_at', 'asc');

        res.json({ success: true, data: messages });
    } catch (err) {
        console.error('Get conversations error:', err);
        res.status(500).json({ success: false, error: 'Erro ao buscar conversas' });
    }
}

// Send a manual message from assessor
export async function sendMessage(req: Request, res: Response): Promise<void> {
    const { lead_id } = req.params;
    const { content } = req.body;

    if (!content) {
        res.status(400).json({ success: false, error: 'Conteúdo é obrigatório' });
        return;
    }

    try {
        const lead = await db('leads').where({ id: Number(lead_id) }).first();
        if (!lead) {
            res.status(404).json({ success: false, error: 'Lead não encontrado' });
            return;
        }

        const conversation = await db('conversations').where({ lead_id: Number(lead_id) }).first();
        if (!conversation) {
            res.status(404).json({ success: false, error: 'Conversa não encontrada' });
            return;
        }

        const [msgId] = await db('messages').insert({
            conversation_id: conversation.id,
            lead_id: Number(lead_id),
            content,
            direction: 'outbound',
            sender: 'assessor',
            sender_user_id: req.user?.userId,
        });

        const message = await db('messages').where({ id: msgId }).first();

        res.status(201).json({ success: true, data: message });
    } catch (err) {
        console.error('Send message error:', err);
        res.status(500).json({ success: false, error: 'Erro ao enviar mensagem' });
    }
}
