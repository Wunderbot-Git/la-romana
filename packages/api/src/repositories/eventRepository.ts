import { getPool } from '../config/database';
import { Event, CreateEventRequest, UpdateEventRequest, EventState } from '@ryder-cup/shared';

export const createEvent = async (input: CreateEventRequest, userId: string, eventCode: string): Promise<Event> => {
    const pool = getPool();
    const res = await pool.query(
        'INSERT INTO events (name, start_date, end_date, format, status, event_code, created_by_user_id) VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *',
        [input.name, input.startDate, input.endDate, input.format, 'draft', eventCode, userId]
    );
    return res.rows[0];
};

export const getEventById = async (id: string): Promise<Event | null> => {
    const pool = getPool();
    const res = await pool.query('SELECT * FROM events WHERE id = $1', [id]);
    return res.rows[0] || null;
};

export const getAllEvents = async (): Promise<Event[]> => {
    const pool = getPool();
    const res = await pool.query('SELECT * FROM events ORDER BY created_at DESC');
    return res.rows;
};

export const updateEvent = async (id: string, input: UpdateEventRequest): Promise<Event | null> => {
    const pool = getPool();

    // Dynamic query building could be better with a helper/query builder
    const fields: string[] = [];
    const values: any[] = [];
    let idx = 1;

    if (input.name) {
        fields.push(`name = $${idx++}`);
        values.push(input.name);
    }
    if (input.startDate) {
        fields.push(`start_date = $${idx++}`);
        values.push(input.startDate);
    }
    if (input.endDate) {
        fields.push(`end_date = $${idx++}`);
        values.push(input.endDate);
    }
    if (input.format) {
        fields.push(`format = $${idx++}`);
        values.push(input.format);
    }
    if (input.status) {
        fields.push(`status = $${idx++}`);
        values.push(input.status);
    }
    if (input.betAmount !== undefined) {
        fields.push(`bet_amount = $${idx++}`);
        values.push(input.betAmount);
    }

    if (fields.length === 0) return getEventById(id);

    values.push(id);
    const query = `UPDATE events SET ${fields.join(', ')} WHERE id = $${idx} RETURNING *`;

    const res = await pool.query(query, values);
    return res.rows[0] || null;
};

export const deleteEvent = async (id: string): Promise<void> => {
    const pool = getPool();
    await pool.query('DELETE FROM events WHERE id = $1', [id]);
};

export const findByCode = async (code: string): Promise<Event | null> => {
    const pool = getPool();
    const res = await pool.query('SELECT * FROM events WHERE event_code = $1', [code]);
    return res.rows[0] || null;
};
