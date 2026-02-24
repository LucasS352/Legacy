import knex from 'knex';
import { config } from './env';

export const db = knex({
    client: 'mysql2',
    connection: {
        host: config.db.host,
        port: config.db.port,
        database: config.db.name,
        user: config.db.user,
        password: config.db.password,
        charset: 'utf8mb4',
        timezone: 'America/Sao_Paulo',
    },
    pool: {
        min: 2,
        max: 10,
        acquireTimeoutMillis: 30000,
        createTimeoutMillis: 30000,
        idleTimeoutMillis: 30000,
    },
    debug: config.nodeEnv === 'development',
});

export async function testConnection(): Promise<void> {
    try {
        await db.raw('SELECT 1');
        console.log('✅ Database connected successfully');
    } catch (error) {
        console.error('❌ Database connection failed:', error);
        throw error;
    }
}
