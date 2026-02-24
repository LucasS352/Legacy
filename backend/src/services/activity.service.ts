import { db } from '../config/database';

interface ActivityParams {
    user_id?: number;
    lead_id?: number;
    action: string;
    entity_type?: string;
    entity_id?: number;
    old_value?: unknown;
    new_value?: unknown;
    ip_address?: string;
}

export async function logActivity(params: ActivityParams): Promise<void> {
    try {
        await db('activity_log').insert({
            user_id: params.user_id || null,
            lead_id: params.lead_id || null,
            action: params.action,
            entity_type: params.entity_type || null,
            entity_id: params.entity_id || null,
            old_value: params.old_value ? JSON.stringify(params.old_value) : null,
            new_value: params.new_value ? JSON.stringify(params.new_value) : null,
            ip_address: params.ip_address || null,
        });
    } catch (err) {
        // Don't throw — activity logging should never break the main flow
        console.error('[ActivityLog] Error:', err);
    }
}
