import { getPool } from '../config/database';
import { EventMember, EventRole } from '@ryder-cup/shared';

export const addMember = async (eventId: string, userId: string, role: EventRole): Promise<EventMember> => {
    const pool = getPool();
    // Check if entry exists to return it or handle upsert?
    // Prompt implies simple add. Schema has UNIQUE(event_id, user_id).
    // Let's use ON CONFLICT DO NOTHING and return existing, or let it fail?
    // Service layer should handle "already joined". Repo just tries to insert.

    const res = await pool.query(
        'INSERT INTO event_members (event_id, user_id, role) VALUES ($1, $2, $3) RETURNING *',
        [eventId, userId, role]
    );

    // Map snake_case DB to camelCase Interface
    const row = res.rows[0];
    return {
        id: row.id,
        eventId: row.event_id,
        userId: row.user_id,
        role: row.role,
        createdAt: row.created_at.toISOString()
    };
};

export const findMember = async (eventId: string, userId: string): Promise<EventMember | null> => {
    const pool = getPool();
    const res = await pool.query(
        'SELECT * FROM event_members WHERE event_id = $1 AND user_id = $2',
        [eventId, userId]
    );

    if (!res.rows[0]) return null;

    const row = res.rows[0];
    return {
        id: row.id,
        eventId: row.event_id,
        userId: row.user_id,
        role: row.role,
        createdAt: row.created_at.toISOString()
    };
};

export const listMembers = async (eventId: string): Promise<EventMember[]> => {
    const pool = getPool();
    const res = await pool.query(
        'SELECT * FROM event_members WHERE event_id = $1 ORDER BY created_at ASC',
        [eventId]
    );

    return res.rows.map(row => ({
        id: row.id,
        eventId: row.event_id,
        userId: row.user_id,
        role: row.role,
        createdAt: row.created_at.toISOString()
    }));
};

export const isOrganizer = async (eventId: string, userId: string): Promise<boolean> => {
    const member = await findMember(eventId, userId);
    return member?.role === 'organizer';
};
