/**
 * Legacy WhatsApp Bridge — Lightweight Evolution API substitute
 * Uses @whiskeysockets/baileys directly. Exposes endpoints that
 * match what the Legacy CRM backend expects from Evolution API.
 *
 * Endpoints:
 *   POST /instance/create            → connects / starts QR
 *   GET  /instance/connect/:name     → returns QR code base64
 *   GET  /instance/connectionState/:name → returns state
 *   POST /message/sendText/:name     → sends text message
 */

const express = require('express');
const makeWASocket = require('@whiskeysockets/baileys').default;
const {
    useMultiFileAuthState,
    DisconnectReason,
    fetchLatestBaileysVersion,
    makeCacheableSignalKeyStore,
} = require('@whiskeysockets/baileys');
const QRCode = require('qrcode');
const pino = require('pino');
const path = require('path');
const fs = require('fs');
const axios = require('axios');
const util = require('util');

// --- DEBUG OVERRIDE TO FILE ---
const logFile = fs.createWriteStream(path.join(__dirname, 'debug.log'), { flags: 'a' });
const originalLog = console.log;
const originalError = console.error;
console.log = function () {
    logFile.write(util.format.apply(null, arguments) + '\n');
    originalLog.apply(console, arguments);
};
console.error = function () {
    logFile.write('ERROR: ' + util.format.apply(null, arguments) + '\n');
    originalError.apply(console, arguments);
};
// ------------------------------

const app = express();
app.use(express.json());

// ── Config ────────────────────────────────────────────────────
const PORT = process.env.PORT || 8081;
const API_KEY = process.env.EVOLUTION_API_KEY || 'legacy-evolution-api-key-2026';
// Force 127.0.0.1 instead of localhost to avoid IPv6 issues on Windows Node 18+
const WEBHOOK_URL = process.env.WEBHOOK_URL || 'http://127.0.0.1:3001/api/webhook/whatsapp';
const SESSIONS_DIR = path.join(__dirname, 'sessions');

if (!fs.existsSync(SESSIONS_DIR)) fs.mkdirSync(SESSIONS_DIR, { recursive: true });

// ── State per instance ────────────────────────────────────────
const instances = {};

// ── Auth middleware ───────────────────────────────────────────
function authCheck(req, res, next) {
    const key = req.headers['apikey'] || req.headers['api-key'] || req.query.apikey;
    if (key !== API_KEY) return res.status(401).json({ error: 'Unauthorized' });
    next();
}

// ── Create / connect instance ─────────────────────────────────
async function connectInstance(instanceName) {
    if (instances[instanceName]?.sock) {
        const state = instances[instanceName].state;
        if (state === 'open') return instances[instanceName];
        // If already connecting but QR not ready yet, return current state
        if (state === 'connecting') return instances[instanceName];
    }

    const authDir = path.join(SESSIONS_DIR, instanceName);
    if (!fs.existsSync(authDir)) fs.mkdirSync(authDir, { recursive: true });

    const { state, saveCreds } = await useMultiFileAuthState(authDir);
    const { version } = await fetchLatestBaileysVersion();

    if (!instances[instanceName]) {
        instances[instanceName] = { state: 'connecting', qrBase64: null, phone: null, sock: null };
    } else {
        instances[instanceName].state = 'connecting';
    }

    // The original `logger` variable is no longer needed as pino instances are created inline.
    // const logger = pino({ level: 'silent' });

    const sock = makeWASocket({
        version,
        auth: {
            creds: state.creds,
            keys: state.keys,
        },
        printQRInTerminal: true,   // Also print in terminal for debugging
        logger: pino({ level: 'warn' }), // Change silent to warn to see Baileys errors
        browser: ['Legacy CRM (Windows)', 'Chrome', '1.0.0'],
        // Use Baileys default browser — avoids 515 rejection from WhatsApp
        generateHighQualityLinkPreview: false,
        syncFullHistory: false,
        keepAliveIntervalMs: 10000,
        connectTimeoutMs: 60000,
        retryRequestDelayMs: 500,
        defaultQueryTimeoutMs: undefined, // no timeout
        maxMsgRetryCount: 5,
        fireInitQueries: true,
        emitOwnEvents: false,
    });

    instances[instanceName].sock = sock;

    sock.ev.on('creds.update', saveCreds);

    // Handle QR code
    sock.ev.on('connection.update', async (update) => {
        const { connection, lastDisconnect, qr } = update;

        if (qr) {
            console.log(`[${instanceName}] QR Code received`);
            try {
                const qrBase64 = await QRCode.toDataURL(qr);
                instances[instanceName].qrBase64 = qrBase64;
                instances[instanceName].state = 'connecting';
            } catch (e) {
                console.error('QR generation error:', e);
            }

            // Notify backend via webhook
            try {
                await axios.post(WEBHOOK_URL, {
                    event: 'qrcode.updated',
                    instance: instanceName,
                    data: { qrcode: { base64: instances[instanceName].qrBase64 } },
                }, { timeout: 5000 }).catch(() => { });
            } catch { }
        }

        if (connection === 'open') {
            console.log(`[${instanceName}] ✅ WhatsApp connected!`);
            const phone = sock.user?.id?.split(':')[0] || sock.user?.id;
            instances[instanceName].state = 'open';
            instances[instanceName].phone = phone;
            instances[instanceName].qrBase64 = null;

            // Notify backend
            try {
                await axios.post(WEBHOOK_URL, {
                    event: 'connection.update',
                    instance: instanceName,
                    data: { state: 'open', phone },
                }, { timeout: 5000 }).catch(() => { });
            } catch { }
        }

        if (connection === 'close') {
            const reason = lastDisconnect?.error?.output?.statusCode;
            const errorMsg = String(lastDisconnect?.error?.message || '');
            const shouldReconnect = reason !== DisconnectReason.loggedOut;

            // Only treat as bad session for genuine MAC/crypto corruption
            // 515 = temporary WhatsApp server error (NOT a bad local session)
            // 408 = QR timeout (normal — just reconnect)
            const isBadSession = errorMsg.includes('Bad MAC') || errorMsg.includes('bad-session');

            console.log(`[${instanceName}] Connection closed. Reason: ${reason} | ${errorMsg || 'no message'}. BadSession: ${isBadSession}. Reconnect: ${shouldReconnect}`);
            instances[instanceName].state = 'close';

            if (isBadSession) {
                console.log(`[${instanceName}] 🔄 Corrupted session — clearing and reconnecting...`);
                try { fs.rmSync(authDir, { recursive: true, force: true }); } catch { }
                instances[instanceName] = { state: 'connecting', qrBase64: null, phone: null, sock: null };
                setTimeout(() => connectInstance(instanceName), 3000);
            } else if (!shouldReconnect) {
                // Explicitly logged out
                console.log(`[${instanceName}] 🔴 Logged out — clearing session.`);
                try { fs.rmSync(authDir, { recursive: true, force: true }); } catch { }
                instances[instanceName] = { state: 'disconnected', qrBase64: null, phone: null, sock: null };
            } else {
                // Normal disconnect (408 timeout, 515 server error, network issue etc.) — just reconnect
                const delay = reason === 515 ? 8000 : 3000; // Wait longer after 515
                console.log(`[${instanceName}] 🔄 Reconnecting in ${delay}ms...`);
                setTimeout(() => connectInstance(instanceName), delay);
            }

            // Notify backend
            try {
                await axios.post(WEBHOOK_URL, {
                    event: 'connection.update',
                    instance: instanceName,
                    data: { state: 'close' },
                }, { timeout: 5000 }).catch(() => { });
            } catch { }
        }
    });

    // Forward incoming messages to backend webhook
    sock.ev.on('messages.upsert', async ({ messages, type }) => {
        console.log(`[${instanceName}] 🔔 messages.upsert triggered | type:`, type, '| messages count:', messages.length);
        // Sometimes new messages come as 'append' instead of 'notify' in newer Baileys versions
        if (type !== 'notify' && type !== 'append') return;

        for (const msg of messages) {
            console.log(`[${instanceName}] 📩 Received message. Upserting to webhook...`);
            try {
                await axios.post(WEBHOOK_URL, {
                    event: 'messages.upsert',
                    instance: instanceName,
                    data: msg,
                }, { timeout: 8000 }).catch((e) => {
                    console.error(`[${instanceName}] ❌ Webhook post error:`, e.message);
                });
            } catch (err) {
                console.error(`[${instanceName}] ❌ Webhook try-catch error:`, err.message);
            }
        }
    });

    return instances[instanceName];
}

// ─────────────────────────────────────────────────────────────
// API Routes (matching Evolution API structure)
// ─────────────────────────────────────────────────────────────

// POST /instance/create — create or reconnect instance
app.post('/instance/create', authCheck, async (req, res) => {
    const { instanceName = 'legacy-crm' } = req.body;
    console.log(`[API] Create/connect instance: ${instanceName}`);
    try {
        const inst = await connectInstance(instanceName);
        res.json({
            instance: { instanceName, state: inst.state },
            hash: { apikey: API_KEY },
            qrcode: inst.qrBase64 ? { base64: inst.qrBase64 } : undefined,
        });
    } catch (err) {
        console.error('Create instance error:', err);
        res.status(500).json({ error: String(err.message) });
    }
});

// GET /instance/connect/:name — get QR code
app.get('/instance/connect/:name', authCheck, async (req, res) => {
    const { name } = req.params;
    const inst = instances[name];

    if (!inst) {
        // Auto-create if not exists
        try {
            const newInst = await connectInstance(name);
            return res.json({ base64: newInst.qrBase64, state: newInst.state });
        } catch (err) {
            return res.status(500).json({ error: String(err.message) });
        }
    }

    // Poll a bit for QR if connecting
    let waited = 0;
    while (!inst.qrBase64 && inst.state !== 'open' && waited < 5000) {
        await new Promise(r => setTimeout(r, 500));
        waited += 500;
    }

    res.json({ base64: inst.qrBase64 || null, state: inst.state });
});

// GET /instance/connectionState/:name — get connection state
app.get('/instance/connectionState/:name', authCheck, async (req, res) => {
    const { name } = req.params;
    const inst = instances[name];

    if (!inst) {
        return res.json({ instance: { instanceName: name, state: 'disconnected' } });
    }

    const phone = inst.phone;
    res.json({
        instance: { instanceName: name, state: inst.state },
        state: inst.state,
        phone,
    });
});

// POST /message/sendText/:name — send a text message
// Accepts Evolution API v1 format: { number, text } 
// and v2 format: { number, textMessage: { text } }
app.post('/message/sendText/:name', authCheck, async (req, res) => {
    const { name } = req.params;
    const { number, text, textMessage } = req.body;
    const inst = instances[name];

    if (!inst || inst.state !== 'open') {
        return res.status(400).json({ error: 'Instance not connected' });
    }

    // Resolve text content from either format
    const textContent = text || textMessage?.text || (typeof textMessage === 'string' ? textMessage : '') || '';

    if (!textContent) {
        console.warn(`[${name}] sendText called with empty content. Body:`, req.body);
        return res.status(400).json({ error: 'Message text is empty' });
    }

    try {
        const jid = number.includes('@') ? number : `${number}@s.whatsapp.net`;
        await inst.sock.sendMessage(jid, { text: textContent });
        res.json({ success: true, message: 'Message sent' });
    } catch (err) {
        console.error('Send message error:', err);
        res.status(500).json({ error: String(err.message) });
    }
});

// POST /message/sendMedia/:name — send media (url or base64)
app.post('/message/sendMedia/:name', authCheck, async (req, res) => {
    const { name } = req.params;
    const { number, mediaMessage } = req.body;
    const inst = instances[name];

    if (!inst || inst.state !== 'open') {
        return res.status(400).json({ error: 'Instance not connected' });
    }

    try {
        const jid = number.includes('@') ? number : `${number}@s.whatsapp.net`;
        const mediaType = mediaMessage?.mediatype || 'image';
        const payload = {};

        if (mediaMessage?.url) {
            payload.url = mediaMessage.url;
        } else if (mediaMessage?.base64) {
            payload.base64 = mediaMessage.base64;
        }
        if (mediaMessage?.caption) payload.caption = mediaMessage.caption;

        await inst.sock.sendMessage(jid, { [mediaType]: payload });
        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ error: String(err.message) });
    }
});

// DELETE /instance/logout/:name — disconnect and clear session
app.delete('/instance/logout/:name', authCheck, async (req, res) => {
    const { name } = req.params;
    const inst = instances[name];

    try {
        if (inst?.sock) {
            try {
                await inst.sock.logout();
            } catch { /* already disconnected */ }
        }

        // Clear session files
        const authDir = path.join(SESSIONS_DIR, name);
        if (fs.existsSync(authDir)) {
            fs.rmSync(authDir, { recursive: true, force: true });
        }

        instances[name] = { state: 'disconnected', qrBase64: null, phone: null, sock: null };

        // Notify backend
        try {
            await axios.post(WEBHOOK_URL, {
                event: 'connection.update',
                instance: name,
                data: { state: 'close' },
            }, { timeout: 5000 }).catch(() => { });
        } catch { }

        console.log(`[${name}] ✅ Logged out and session cleared`);
        res.json({ success: true, message: 'Desconectado com sucesso' });
    } catch (err) {
        console.error('Logout error:', err);
        res.status(500).json({ error: String(err.message) });
    }
});

// GET /instance/fetchInstances — list all
app.get('/instance/fetchInstances', authCheck, (req, res) => {
    const list = Object.entries(instances).map(([name, inst]) => ({
        instance: { instanceName: name, state: inst.state },
        phone: inst.phone,
    }));
    res.json(list);
});

// Health check
app.get('/health', (req, res) => res.json({ status: 'ok', instances: Object.keys(instances).length }));

// ─────────────────────────────────────────────────────────────
// Start
// ─────────────────────────────────────────────────────────────
app.listen(PORT, () => {
    console.log('');
    console.log('╔══════════════════════════════════════════════════════╗');
    console.log(`║  🤖 Legacy WhatsApp Bridge                           ║`);
    console.log(`║  📡 Running on: http://localhost:${PORT}               ║`);
    console.log(`║  🔑 API Key:    ${API_KEY.slice(0, 20)}...    ║`);
    console.log(`║  📬 Webhook:    ${WEBHOOK_URL.slice(0, 30)}...    ║`);
    console.log('╚══════════════════════════════════════════════════════╝');
    console.log('');
    console.log('Auto-connecting instance "legacy-crm"...');

    // Auto-connect default instance on startup
    connectInstance('legacy-crm').catch(console.error);
});
