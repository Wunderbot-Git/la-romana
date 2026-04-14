import { getPool } from '../config/database';

export interface PlayerInvite {
    id: string; // The token
    eventId: string;
    playerId: string;
    claimedByUserId: string | null;
    createdAt: Date;
    expiresAt: Date;
    playerName?: string;
    eventName?: string;
}

export const createInvite = async (eventId: string, playerId: string): Promise<string> => {
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7); // Valid for 7 days

    const pool = getPool();
    const res = await pool.query(
        `INSERT INTO player_invites (event_id, player_id, expires_at) 
         VALUES ($1, $2, $3)
         ON CONFLICT (player_id) 
         DO UPDATE SET id = gen_random_uuid(), expires_at = EXCLUDED.expires_at, claimed_by_user_id = NULL
         RETURNING id`,
        [eventId, playerId, expiresAt]
    );
    return res.rows[0].id;
};

export const getInvite = async (inviteId: string): Promise<PlayerInvite | null> => {
    const pool = getPool();
    try {
        const res = await pool.query(
            `SELECT pi.id, pi.event_id, pi.player_id, pi.claimed_by_user_id, pi.created_at, pi.expires_at,
                    p.first_name, p.last_name, e.name as event_name
             FROM player_invites pi
             JOIN players p ON p.id = pi.player_id
             JOIN events e ON e.id = pi.event_id
             WHERE pi.id = $1`,
            [inviteId]
        );
        if (!res.rows[0]) return null;
        const row = res.rows[0];
        return {
            id: row.id,
            eventId: row.event_id,
            playerId: row.player_id,
            claimedByUserId: row.claimed_by_user_id,
            createdAt: row.created_at,
            expiresAt: row.expires_at,
            playerName: [row.first_name, row.last_name].filter((n: string) => n && n !== '-').join(' ').trim(),
            eventName: row.event_name
        };
    } catch (e: any) {
        // Handle invalid UUID format if someone sends a bad token
        if (e.code === '22P02') return null;
        throw e;
    }
};

export const claimInvite = async (inviteId: string, userId: string, playerId: string): Promise<void> => {
    const pool = getPool();
    const client = await pool.connect();
    try {
        await client.query('BEGIN');

        // Atomic claim: only succeeds if not already claimed and not expired
        const claimRes = await client.query(
            `UPDATE player_invites
             SET claimed_by_user_id = $1
             WHERE id = $2
               AND claimed_by_user_id IS NULL
               AND expires_at > NOW()
             RETURNING event_id, player_id`,
            [userId, inviteId]
        );

        if (claimRes.rowCount === 0) {
            throw new Error('Invite already claimed or expired');
        }

        const updateRes = await client.query(
            `UPDATE players SET user_id = $1 WHERE id = $2`,
            [userId, playerId]
        );

        if (updateRes.rowCount === 0) {
            throw new Error('Player not found');
        }

        await client.query('COMMIT');
    } catch (e) {
        await client.query('ROLLBACK');
        throw e;
    } finally {
        client.release();
    }
};
