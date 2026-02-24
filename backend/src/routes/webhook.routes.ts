import { Router } from 'express';
import {
    handleWebhook,
    connectWhatsApp,
    disconnectWhatsApp,
    getQRCode,
    getConnectionStatus,
    getBotMemory,
    addBotMemory,
    deleteBotMemory,
    getHandoffs,
    acknowledgeHandoff,
    sendTestMessage,
} from '../controllers/conversations.controller';
import { authMiddleware } from '../middleware/auth';

const router = Router();

// ── Webhook endpoint — no auth (Evolution API sends here) ────
router.post('/whatsapp', handleWebhook);

// ── WhatsApp Management — requires CRM auth ──────────────────
router.post('/whatsapp/connect', authMiddleware, connectWhatsApp);
router.get('/whatsapp/qr', authMiddleware, getQRCode);
router.get('/whatsapp/status', authMiddleware, getConnectionStatus);
router.post('/whatsapp/test', authMiddleware, sendTestMessage);
router.delete('/whatsapp/disconnect', authMiddleware, disconnectWhatsApp);

// ── Bot Memory (Learning) ─────────────────────────────────────
router.get('/bot/memory', authMiddleware, getBotMemory);
router.post('/bot/memory', authMiddleware, addBotMemory);
router.delete('/bot/memory/:id', authMiddleware, deleteBotMemory);

// ── Bot Handoffs ──────────────────────────────────────────────
router.get('/bot/handoffs', authMiddleware, getHandoffs);
router.patch('/bot/handoffs/:id/acknowledge', authMiddleware, acknowledgeHandoff);

export default router;
