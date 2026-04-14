// Audit Repository - Track score changes

import { getPool } from '../config/database';

export interface AuditLog {
    id: string;
    eventId: string;
    entityType: string;
    entityId: string;
    action: string;
    previousValue: any;
    newValue: any;
    source: string;
    byUserId: string;
    createdAt: Date;
}

export interface CreateAuditLogInput {
    eventId: string;
    entityType: string;
    entityId: string;
    action: string;
    previousValue?: any;
    newValue: any;
    source: 'online' | 'offline';
    byUserId: string;
}

const mapRowToAuditLog = (row: any): AuditLog => ({
    id: row.id,
    eventId: row.event_id,
    entityType: row.entity_type,
    entityId: row.entity_id,
    action: row.action,
    previousValue: row.previous_value,
    newValue: row.new_value,
    source: row.source,
    byUserId: row.by_user_id,
    createdAt: row.created_at
});

/**
 * Create an audit log entry.
 */
export const createAuditLog = async (input: CreateAuditLogInput): Promise<AuditLog> => {
    const pool = getPool();
    const res = await pool.query(
        `INSERT INTO audit_log (event_id, entity_type, entity_id, action, previous_value, new_value, source, by_user_id)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
         RETURNING *`,
        [
            input.eventId,
            input.entityType,
            input.entityId,
            input.action,
            input.previousValue ? JSON.stringify(input.previousValue) : null,
            JSON.stringify(input.newValue),
            input.source,
            input.byUserId
        ]
    );
    return mapRowToAuditLog(res.rows[0]);
};

/**
 * Get audit logs for an entity.
 */
export const getAuditLogs = async (entityType: string, entityId: string): Promise<AuditLog[]> => {
    const pool = getPool();
    const res = await pool.query(
        `SELECT * FROM audit_log WHERE entity_type = $1 AND entity_id = $2 ORDER BY created_at DESC`,
        [entityType, entityId]
    );
    return res.rows.map(mapRowToAuditLog);
};

/**
 * Get all audit logs for an event.
 */
export const getEventAuditLogs = async (eventId: string): Promise<AuditLog[]> => {
    const pool = getPool();
    const res = await pool.query(
        `SELECT * FROM audit_log WHERE event_id = $1 ORDER BY created_at DESC`,
        [eventId]
    );
    return res.rows.map(mapRowToAuditLog);
};
