import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { getTestPool, closeTestPool, truncateTables, setupTestDb } from './helpers/db';

describe('Database Integration', () => {
    // Only run these tests if we have a DB connection, or they will fail.
    // For now, we assume if DATABASE_URL_TEST is set, we run them.
    // If not, we might want to skip.

    beforeAll(async () => {
        // Ensure migrations run
        try {
            await setupTestDb();
        } catch (e) {
            console.error("Failed to setup test DB - is Postgres running?", e);
            throw e;
        }
    });

    afterAll(async () => {
        await closeTestPool();
    });

    it('should connect to the database', async () => {
        const pool = getTestPool();
        const client = await pool.connect();
        try {
            const result = await client.query('SELECT 1 as val');
            expect(result.rows[0].val).toBe(1);
        } finally {
            client.release();
        }
    });

    it('should have created the users table', async () => {
        const pool = getTestPool();
        const result = await pool.query("SELECT to_regclass('public.users') as table_exists");
        expect(result.rows[0].table_exists).toBe('users');
    });

    it('should have created the events table', async () => {
        const pool = getTestPool();
        const result = await pool.query("SELECT to_regclass('public.events') as table_exists");
        expect(result.rows[0].table_exists).toBe('events');
    });
});
