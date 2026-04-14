// Spectator Repository - CRUD for spectator tokens

import { getPool } from '../config/database';

export interface SpectatorToken {
    id: string;
    eventId: string;
    token: string;
    createdByUserId: string;
    createdAt: Date;
    expiresAt: Date | null;
}

const mapRowToSpectatorToken = (row: any): SpectatorToken => ({
    id: row.id,
    eventId: row.event_id,
    token: row.token,
    createdByUserId: row.created_by_user_id,
    createdAt: row.created_at,
    expiresAt: row.expires_at
});

/**
 * Create a new spectator token.
 */
export const createSpectatorToken = async (
    eventId: string,
    token: string,
    createdByUserId: string,
    expiresAt?: Date
): Promise<SpectatorToken> => {
    const pool = getPool();
    const res = await pool.query(
        `INSERT INTO spectator_tokens (event_id, token, created_by_user_id, expires_at)
         VALUES ($1, $2, $3, $4)
         RETURNING *`,
        [eventId, token, createdByUserId, expiresAt || null]
    );
    return mapRowToSpectatorToken(res.rows[0]);
};

/**
 * Find spectator token by token string.
 */
export const findByToken = async (token: string): Promise<SpectatorToken | null> => {
    const pool = getPool();
    const res = await pool.query(
        `SELECT * FROM spectator_tokens WHERE token = $1`,
        [token]
    );
    if (res.rows.length === 0) return null;
    return mapRowToSpectatorToken(res.rows[0]);
};

/**
 * Revoke (delete) a spectator token.
 */
export const revokeToken = async (tokenId: string): Promise<void> => {
    const pool = getPool();
    await pool.query('DELETE FROM spectator_tokens WHERE id = $1', [tokenId]);
};

/**
 * Get all tokens for an event.
 */
export const getTokensForEvent = async (eventId: string): Promise<SpectatorToken[]> => {
    const pool = getPool();
    const res = await pool.query(
        `SELECT * FROM spectator_tokens WHERE event_id = $1 ORDER BY created_at DESC`,
        [eventId]
    );
    return res.rows.map(mapRowToSpectatorToken);
};
