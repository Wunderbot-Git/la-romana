import { getPool } from '../config/database';
import { Flight } from '@ryder-cup/shared';

// Uses flights table:
// id, event_id, flight_number, front_state, back_state, created_at

export const createFlight = async (eventId: string, flightNumber: number): Promise<Flight> => {
    const pool = getPool();
    const res = await pool.query(
        `INSERT INTO flights (event_id, flight_number)
         VALUES ($1, $2)
         RETURNING *`,
        [eventId, flightNumber]
    );

    const row = res.rows[0];
    return {
        id: row.id,
        eventId: row.event_id,
        flightNumber: row.flight_number,
        frontState: row.front_state,
        backState: row.back_state,
        createdAt: row.created_at.toISOString()
    };
};

export const getFlightsByEventId = async (eventId: string): Promise<Flight[]> => {
    const pool = getPool();
    const res = await pool.query(
        'SELECT * FROM flights WHERE event_id = $1 ORDER BY flight_number ASC',
        [eventId]
    );

    return res.rows.map(row => ({
        id: row.id,
        eventId: row.event_id,
        flightNumber: row.flight_number,
        frontState: row.front_state,
        backState: row.back_state,
        createdAt: row.created_at.toISOString()
    }));
};

export const getFlightById = async (flightId: string): Promise<Flight | null> => {
    const pool = getPool();
    const res = await pool.query('SELECT * FROM flights WHERE id = $1', [flightId]);
    if (res.rows.length === 0) return null;

    const row = res.rows[0];
    return {
        id: row.id,
        eventId: row.event_id,
        flightNumber: row.flight_number,
        frontState: row.front_state,
        backState: row.back_state,
        createdAt: row.created_at.toISOString()
    };
};
