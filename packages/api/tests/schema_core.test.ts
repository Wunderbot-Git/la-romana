import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { getTestPool, closeTestPool, setupTestDb, truncateTables } from './helpers/db';

describe('Schema Core Tables', () => {
    beforeAll(async () => {
        try {
            await setupTestDb();
            await truncateTables();
        } catch (e) {
            console.error("Failed to setup test DB", e);
            throw e;
        }
    });

    afterAll(async () => {
        await closeTestPool();
    });

    it('should have created all core tables', async () => {
        const pool = getTestPool();
        const tables = ['event_members', 'flights', 'players', 'courses', 'tees', 'holes'];

        for (const table of tables) {
            const result = await pool.query(`SELECT to_regclass('public.${table}') as table_exists`);
            expect(result.rows[0].table_exists).toBe(table);
        }
    });

    it('should enforce unique constraint on event_members', async () => {
        const pool = getTestPool();
        const client = await pool.connect();
        try {
            // Create user and event
            const email = `test-${Date.now()}@example.com`;
            const userRes = await client.query("INSERT INTO users (email, password_hash) VALUES ($1, 'hash') RETURNING id", [email]);
            const userId = userRes.rows[0].id;

            const eventRes = await client.query("INSERT INTO events (name, event_code, created_by_user_id) VALUES ('Test Event', 'TEST01', $1) RETURNING id", [userId]);
            const eventId = eventRes.rows[0].id;

            // Insert member
            await client.query("INSERT INTO event_members (event_id, user_id, role) VALUES ($1, $2, 'organizer')", [eventId, userId]);

            // Try duplicate
            await expect(
                client.query("INSERT INTO event_members (event_id, user_id, role) VALUES ($1, $2, 'player')", [eventId, userId])
            ).rejects.toThrow(/unique constraint/);

        } finally {
            client.release();
        }
    });

    it('should enforce check constraints on players', async () => {
        const pool = getTestPool();
        const client = await pool.connect();
        try {
            // Create user and event (reusing logic or creating fresh)
            const email = `player-${Date.now()}@example.com`;
            const userRes = await client.query("INSERT INTO users (email, password_hash) VALUES ($1, 'hash') RETURNING id", [email]);
            const userId = userRes.rows[0].id;
            const eventRes = await client.query("INSERT INTO events (name, event_code, created_by_user_id) VALUES ('Player Event', 'PLYR01', $1) RETURNING id", [userId]);
            const eventId = eventRes.rows[0].id;

            // Invalid Team
            await expect(
                client.query("INSERT INTO players (event_id, first_name, last_name, handicap_index, team, position) VALUES ($1, 'Name', 'Test', 10.0, 'green', 1)", [eventId])
            ).rejects.toThrow(/check constraint "players_team_check"/);

            // Invalid Position
            await expect(
                client.query("INSERT INTO players (event_id, first_name, last_name, handicap_index, team, position) VALUES ($1, 'Name', 'Test', 10.0, 'red', 3)", [eventId])
            ).rejects.toThrow(/check constraint "players_position_check"/);

        } finally {
            client.release();
        }
    });

    it('should enforce foreign key constraints', async () => {
        const pool = getTestPool();
        const client = await pool.connect();
        try {
            await expect(
                client.query("INSERT INTO flights (event_id, flight_number) VALUES ('00000000-0000-0000-0000-000000000000', 1)")
            ).rejects.toThrow(/violates foreign key constraint/);
        } finally {
            client.release();
        }
    });

    it('should enforce hole number constraints', async () => {
        const pool = getTestPool();
        const client = await pool.connect();
        try {
            // Setup course/tee
            const email = `holes-${Date.now()}@example.com`;
            const userRes = await client.query("INSERT INTO users (email, password_hash) VALUES ($1, 'hash') RETURNING id", [email]);
            const userId = userRes.rows[0].id;
            const eventRes = await client.query("INSERT INTO events (name, event_code, created_by_user_id) VALUES ('Hole Event', 'HOLE01', $1) RETURNING id", [userId]);
            const eventId = eventRes.rows[0].id;
            const courseRes = await client.query("INSERT INTO courses (event_id, name, source) VALUES ($1, 'Course', 'manual') RETURNING id", [eventId]);
            const courseId = courseRes.rows[0].id;
            const teeRes = await client.query("INSERT INTO tees (course_id, name) VALUES ($1, 'White') RETURNING id", [courseId]);
            const teeId = teeRes.rows[0].id;

            // Invalid Hole Number
            await expect(
                client.query("INSERT INTO holes (tee_id, hole_number, stroke_index) VALUES ($1, 19, 1)", [teeId])
            ).rejects.toThrow(/check constraint "holes_hole_number_check"/);

            // Invalid Stroke Index
            await expect(
                client.query("INSERT INTO holes (tee_id, hole_number, stroke_index) VALUES ($1, 1, 19)", [teeId])
            ).rejects.toThrow(/check constraint "holes_stroke_index_check"/);

        } finally {
            client.release();
        }
    });

});
