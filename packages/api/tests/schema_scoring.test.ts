import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { getTestPool, closeTestPool, setupTestDb } from './helpers/db';
import { v4 as uuidv4 } from 'uuid'; // We need IDs for testing logic

describe('Schema Scoring Tables', () => {
    let pool: any;
    let userId: string;
    let eventId: string;
    let flightId: string;
    let playerId: string;

    beforeAll(async () => {
        try {
            await setupTestDb();
            const { truncateTables } = await import('./helpers/db');
            await truncateTables();
            pool = getTestPool();
            const client = await pool.connect();
            try {
                // Setup base data
                const email = 'scorer-' + Date.now() + '@example.com';
                const userRes = await client.query("INSERT INTO users (email, password_hash) VALUES ($1, 'hash') RETURNING id", [email]);
                userId = userRes.rows[0].id;

                const eventRes = await client.query("INSERT INTO events (name, event_code, created_by_user_id) VALUES ('Score Event', 'SCOR01', $1) RETURNING id", [userId]);
                eventId = eventRes.rows[0].id;

                const flightRes = await client.query("INSERT INTO flights (event_id, flight_number) VALUES ($1, 1) RETURNING id", [eventId]);
                flightId = flightRes.rows[0].id;

                const teeRes = await client.query("INSERT INTO courses (event_id, name, source) VALUES ($1, 'C', 'manual') RETURNING id", [eventId])
                    .then((res: any) => client.query("INSERT INTO tees (course_id, name) VALUES ($1, 'T') RETURNING id", [res.rows[0].id]));

                const playerRes = await client.query(
                    "INSERT INTO players (event_id, first_name, last_name, handicap_index, team, position, tee_id, flight_id) VALUES ($1, 'P1', 'Test', 10, 'red', 1, $2, $3) RETURNING id",
                    [eventId, teeRes.rows[0].id, flightId]
                );
                playerId = playerRes.rows[0].id;

            } finally {
                client.release();
            }
        } catch (e) {
            console.error("Failed to setup test DB", e);
            throw e;
        }
    });

    afterAll(async () => {
        await closeTestPool();
    });

    it('should have created all scoring tables', async () => {
        const tables = ['hole_overrides', 'mixed_scramble_stroke_index', 'hole_scores', 'scramble_team_scores', 'audit_log', 'spectator_tokens'];
        for (const table of tables) {
            const result = await pool.query(`SELECT to_regclass('public.${table}') as table_exists`);
            expect(result.rows[0].table_exists).toBe(table);
        }
    });

    it('should enforce unique score per player per hole', async () => {
        const mutationId1 = uuidv4();
        const mutationId2 = uuidv4();

        await pool.query(
            "INSERT INTO hole_scores (event_id, flight_id, player_id, hole_number, gross_score, entered_by_user_id, client_timestamp, mutation_id) VALUES ($1, $2, $3, 1, 4, $4, NOW(), $5)",
            [eventId, flightId, playerId, userId, mutationId1]
        );

        await expect(
            pool.query(
                "INSERT INTO hole_scores (event_id, flight_id, player_id, hole_number, gross_score, entered_by_user_id, client_timestamp, mutation_id) VALUES ($1, $2, $3, 1, 5, $4, NOW(), $5)",
                [eventId, flightId, playerId, userId, mutationId2]
            )
        ).rejects.toThrow(/unique constraint/);
    });

    it('should enforce mutation_id uniqueness', async () => {
        const mutationId = uuidv4();

        await expect(
            pool.query(
                "INSERT INTO hole_scores (event_id, flight_id, player_id, hole_number, gross_score, entered_by_user_id, client_timestamp, mutation_id) VALUES ($1, $2, $3, 2, 4, $4, NOW(), $5)",
                [eventId, flightId, playerId, userId, mutationId]
            )
        ).resolves.not.toThrow();

        // Use same mutation ID for different hole
        await expect(
            pool.query(
                "INSERT INTO hole_scores (event_id, flight_id, player_id, hole_number, gross_score, entered_by_user_id, client_timestamp, mutation_id) VALUES ($1, $2, $3, 3, 4, $4, NOW(), $5)",
                [eventId, flightId, playerId, userId, mutationId]
            )
        ).rejects.toThrow(/unique constraint/);
    });

    it('should store JSONB in audit log', async () => {
        const prev = { value: "old" };
        const curr = { value: "new", complex: [1, 2] };

        await expect(
            pool.query(
                "INSERT INTO audit_log (event_id, entity_type, entity_id, action, by_user_id, previous_value, new_value) VALUES ($1, 'player', $2, 'update', $3, $4, $5)",
                [eventId, playerId, userId, prev, curr]
            )
        ).resolves.not.toThrow();

        const res = await pool.query("SELECT new_value FROM audit_log WHERE entity_id = $1", [playerId]);
        expect(res.rows[0].new_value).toEqual(curr);
    });

});
