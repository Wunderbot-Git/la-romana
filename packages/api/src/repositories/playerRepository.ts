import { getPool } from '../config/database';
import { Player, CreatePlayerRequest, UpdatePlayerRequest } from '@ryder-cup/shared';

// Uses players table
// id, event_id, first_name, last_name, handicap_index, tee_id, flight_id, user_id, created_at, updated_at

const mapRowToPlayer = (row: any): Player => ({
    id: row.id,
    eventId: row.event_id,
    firstName: row.first_name,
    lastName: row.last_name,
    handicapIndex: parseFloat(row.handicap_index),
    teeId: row.tee_id,
    flightId: row.flight_id || undefined,
    team: row.team || undefined,
    position: row.position || undefined,
    userId: row.user_id || undefined,
    createdAt: row.created_at.toISOString(),
    updatedAt: row.updated_at.toISOString()
});

export const createPlayer = async (eventId: string, data: CreatePlayerRequest): Promise<Player> => {
    const pool = getPool();
    const res = await pool.query(
        `INSERT INTO players (event_id, first_name, last_name, handicap_index, tee_id, user_id)
         VALUES ($1, $2, $3, $4, $5, $6)
         RETURNING *`,
        [eventId, data.firstName, data.lastName, data.handicapIndex, data.teeId, data.userId]
    );
    return mapRowToPlayer(res.rows[0]);
};

export const getPlayersByEventId = async (eventId: string): Promise<Player[]> => {
    const pool = getPool();
    const res = await pool.query(
        'SELECT * FROM players WHERE event_id = $1 ORDER BY last_name ASC, first_name ASC',
        [eventId]
    );
    return res.rows.map(mapRowToPlayer);
};

export const getPlayerById = async (playerId: string): Promise<Player | null> => {
    const pool = getPool();
    const res = await pool.query('SELECT * FROM players WHERE id = $1', [playerId]);
    if (res.rows.length === 0) return null;
    return mapRowToPlayer(res.rows[0]);
};

export const getPlayerByUserId = async (eventId: string, userId: string): Promise<Player | null> => {
    const pool = getPool();
    const res = await pool.query(
        'SELECT * FROM players WHERE event_id = $1 AND user_id = $2',
        [eventId, userId]
    );
    if (res.rows.length === 0) return null;
    return mapRowToPlayer(res.rows[0]);
};

export const updatePlayer = async (playerId: string, data: UpdatePlayerRequest): Promise<Player | null> => {
    const pool = getPool();

    // Dynamic update query
    const updates: string[] = [];
    const values: any[] = [];
    let idx = 1;

    if (data.firstName !== undefined) { updates.push(`first_name = $${idx++}`); values.push(data.firstName); }
    if (data.lastName !== undefined) { updates.push(`last_name = $${idx++}`); values.push(data.lastName); }
    if (data.handicapIndex !== undefined) { updates.push(`handicap_index = $${idx++}`); values.push(data.handicapIndex); }
    if (data.teeId !== undefined) { updates.push(`tee_id = $${idx++}`); values.push(data.teeId); }
    if (data.flightId !== undefined) { updates.push(`flight_id = $${idx++}`); values.push(data.flightId); }
    if (data.userId !== undefined) { updates.push(`user_id = $${idx++}`); values.push(data.userId); }

    if (updates.length === 0) return getPlayerById(playerId);

    updates.push(`updated_at = NOW()`);
    values.push(playerId); // Add ID for WHERE clause

    const query = `
        UPDATE players 
        SET ${updates.join(', ')}
        WHERE id = $${idx}
        RETURNING *
    `;

    const res = await pool.query(query, values);
    if (res.rows.length === 0) return null;
    return mapRowToPlayer(res.rows[0]);
};

// Assignment Helpers (could be in flightRepo or playerRepo - player table owns FK)

export const assignPlayerToFlight = async (playerId: string, flightId: string, team: 'red' | 'blue', position: 1 | 2): Promise<void> => {
    const pool = getPool();
    await pool.query(
        'UPDATE players SET flight_id = $1, team = $2, position = $3 WHERE id = $4',
        [flightId, team, position, playerId]
    );
};

export const unassignPlayerFromFlight = async (playerId: string): Promise<void> => {
    const pool = getPool();
    await pool.query(
        'UPDATE players SET flight_id = NULL, team = NULL, position = NULL WHERE id = $1',
        [playerId]
    );
};

export const deletePlayer = async (playerId: string): Promise<void> => {
    const pool = getPool();
    await pool.query('DELETE FROM players WHERE id = $1', [playerId]);
};
