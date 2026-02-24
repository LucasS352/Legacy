import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(__dirname, '../../.env') });

export const config = {
    port: parseInt(process.env.PORT || '3001', 10),
    nodeEnv: process.env.NODE_ENV || 'development',
    frontendUrl: process.env.FRONTEND_URL || 'http://localhost:8080',

    db: {
        host: process.env.DB_HOST || '127.0.0.1',
        port: parseInt(process.env.DB_PORT || '3307', 10),
        name: process.env.DB_NAME || 'legacy',
        user: process.env.DB_USER || 'root',
        password: process.env.DB_PASSWORD || '',
    },

    jwt: {
        secret: process.env.JWT_SECRET || 'fallback-secret-change-in-production',
        expiresIn: process.env.JWT_EXPIRES_IN || '7d',
    },

    googleAi: {
        apiKey: process.env.GOOGLE_AI_API_KEY || '',
        model: process.env.GOOGLE_AI_MODEL || 'gemini-1.5-flash',
    },

    whatsapp: {
        apiUrl: process.env.WHATSAPP_API_URL || 'http://localhost:8081',
        apiKey: process.env.WHATSAPP_API_KEY || '',
        instance: process.env.WHATSAPP_INSTANCE || 'legacy-crm',
    },

    webhookSecret: process.env.WEBHOOK_SECRET || 'webhook-secret',
};
