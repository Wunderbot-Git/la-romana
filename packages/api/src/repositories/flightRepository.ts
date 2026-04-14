import { getPool } from '../config/database';
import { Flight, RoundState } from '@ryder-cup/shared';

const mapRow = (row: any): Flight => ({
    id: row.id,
    eventId: row.event_id,
    roundId: row.round_id,
    flightNumber: row.flight_number,
    state: row.state as RoundState,
    createdAt: row.created_at.toISOString(),
});

export const createFlight = async (
    eventId: string,
    roundId: string,
    flightNumber: number
): Promise<Flight> => {
    const pool = getPool();
    const res = await pool.query(
        `INSERT INTO flights (event_id, round_id, flight_number) VALUES ($1, $2, $3) RETURNING *`,
        [eventId, roundId, flightNumber]
    );
    return mapRow(res.rows[0]);
};

export const getFlightsByRoundId = async (roundId: string): Promise<Flight[]> => {
    const pool = getPool();
    const res = await pool.query(
        'SELECT * FROM flights WHERE round_id = $1 ORDER BY flight_number ASC',
        [roundId]
    );
    return res.rows.map(mapRow);
};

export const getFlightsByEventId = async (eventId: string): Promise<Flight[]> => {
    const pool = getPool();
    const res = await pool.query(
        'SELECT * FROM flights WHERE event_id = $1 ORDER BY flight_number ASC',
        [eventId]
    );
    return res.rows.map(mapRow);
};

export const getFlightById = async (flightId: string): Promise<Flight | null> => {
    const pool = getPool();
    const res = await pool.query('SELECT * FROM flights WHERE id = $1', [flightId]);
    return res.rows[0] ? mapRow(res.rows[0]) : null;
};

export const updateFlightState = async (
    flightId: string,
    state: RoundState
): Promise<Flight | null> => {
    const pool = getPool();
    const res = await pool.query(
        `UPDATE flights SET state = $1 WHERE id = $2 RETURNING *`,
        [state, flightId]
    );
    return res.rows[0] ? mapRow(res.rows[0]) : null;
};
