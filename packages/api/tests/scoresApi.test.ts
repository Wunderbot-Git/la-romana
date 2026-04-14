import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { buildApp } from '../src/app';
import { FastifyInstance } from 'fastify';
import { getPool } from '../src/config/database';
import { randomUUID } from 'crypto';

describe('Score API Endpoints', () => {
    let app: FastifyInstance;
    let testFlightId: string;
    let testPlayerId: string;
    let testEventId: string;
    let testUserId: string;
    let authToken: string;

    beforeAll(async () => {
        app = await buildApp();
        await app.ready();
        const pool = getPool();

        // Create test user
        const email = `scoreapi-${Date.now()}@test.com`;
        const userRes = await pool.query(
            `INSERT INTO users (email, password_hash) VALUES ($1, $2) RETURNING id`,
            [email, 'hash']
        );
        testUserId = userRes.rows[0].id;

        // Generate auth token
        authToken = app.jwt.sign({ id: testUserId, email });

        // Create test event (LIVE)
        const eventCode = `TST${Date.now()}`.slice(0, 8);
        const eventRes = await pool.query(
            `INSERT INTO events (name, event_code, status, created_by_user_id) VALUES ($1, $2, 'live', $3) RETURNING id`,
            [`Score API Event ${Date.now()}`, eventCode, testUserId]
        );
        testEventId = eventRes.rows[0].id;

        // Create test flight
        const flightRes = await pool.query(
            `INSERT INTO flights (event_id, flight_number) VALUES ($1, 1) RETURNING id`,
            [testEventId]
        );
        testFlightId = flightRes.rows[0].id;

        // Create test player
        const playerRes = await pool.query(
            `INSERT INTO players (event_id, first_name, last_name, handicap_index) VALUES ($1, 'API', 'Tester', 10) RETURNING id`,
            [testEventId]
        );
        testPlayerId = playerRes.rows[0].id;
    });

    afterAll(async () => {
        const pool = getPool();
        await pool.query('DELETE FROM hole_scores WHERE flight_id = $1', [testFlightId]);
        await pool.query('DELETE FROM scramble_team_scores WHERE flight_id = $1', [testFlightId]);
        await pool.query('DELETE FROM players WHERE event_id = $1', [testEventId]);
        await pool.query('DELETE FROM flights WHERE event_id = $1', [testEventId]);
        await pool.query('DELETE FROM events WHERE id = $1', [testEventId]);
        await pool.query('DELETE FROM users WHERE id = $1', [testUserId]);
        await app.close();
    });

    describe('Hole Scores', () => {
        it('should submit single score', async () => {
            const res = await app.inject({
                method: 'PUT',
                url: `/events/${testEventId}/flights/${testFlightId}/scores`,
                headers: { Authorization: `Bearer ${authToken}` },
                payload: {
                    scores: [{
                        playerId: testPlayerId,
                        holeNumber: 1,
                        grossScore: 4,
                        mutationId: randomUUID()
                    }]
                }
            });

            expect(res.statusCode).toBe(200);
            const body = JSON.parse(res.body);
            expect(body.success).toBe(true);
            expect(body.created).toBe(1);
        });

        it('should get flight scores', async () => {
            const res = await app.inject({
                method: 'GET',
                url: `/events/${testEventId}/flights/${testFlightId}/scores`,
                headers: { Authorization: `Bearer ${authToken}` }
            });

            expect(res.statusCode).toBe(200);
            const body = JSON.parse(res.body);
            expect(body.scores).toBeDefined();
            expect(body.scores.length).toBeGreaterThan(0);
        });

        it('should reject invalid hole number', async () => {
            const res = await app.inject({
                method: 'PUT',
                url: `/events/${testEventId}/flights/${testFlightId}/scores`,
                headers: { Authorization: `Bearer ${authToken}` },
                payload: {
                    scores: [{
                        playerId: testPlayerId,
                        holeNumber: 19,
                        grossScore: 4,
                        mutationId: randomUUID()
                    }]
                }
            });

            expect(res.statusCode).toBe(400);
        });
    });

    describe('Scramble Scores', () => {
        it('should submit scramble score', async () => {
            const res = await app.inject({
                method: 'PUT',
                url: `/events/${testEventId}/flights/${testFlightId}/scramble-scores`,
                headers: { Authorization: `Bearer ${authToken}` },
                payload: {
                    scores: [{
                        team: 'red',
                        holeNumber: 10,
                        grossScore: 4,
                        mutationId: randomUUID()
                    }]
                }
            });

            expect(res.statusCode).toBe(200);
            const body = JSON.parse(res.body);
            expect(body.success).toBe(true);
        });

        it('should reject front 9 for scramble', async () => {
            const res = await app.inject({
                method: 'PUT',
                url: `/events/${testEventId}/flights/${testFlightId}/scramble-scores`,
                headers: { Authorization: `Bearer ${authToken}` },
                payload: {
                    scores: [{
                        team: 'red',
                        holeNumber: 5,
                        grossScore: 4,
                        mutationId: randomUUID()
                    }]
                }
            });

            expect(res.statusCode).toBe(400);
        });
    });

    describe('Event State Validation', () => {
        it('should reject when event not live', async () => {
            const pool = getPool();

            // Create draft event
            const eventCode = `DFT${Date.now()}`.slice(0, 8);
            const eventRes = await pool.query(
                `INSERT INTO events (name, event_code, status, created_by_user_id) VALUES ($1, $2, 'draft', $3) RETURNING id`,
                [`Draft Event ${Date.now()}`, eventCode, testUserId]
            );
            const draftEventId = eventRes.rows[0].id;

            const flightRes = await pool.query(
                `INSERT INTO flights (event_id, flight_number) VALUES ($1, 1) RETURNING id`,
                [draftEventId]
            );
            const draftFlightId = flightRes.rows[0].id;

            const res = await app.inject({
                method: 'PUT',
                url: `/events/${draftEventId}/flights/${draftFlightId}/scores`,
                headers: { Authorization: `Bearer ${authToken}` },
                payload: {
                    scores: [{
                        playerId: testPlayerId,
                        holeNumber: 1,
                        grossScore: 4,
                        mutationId: randomUUID()
                    }]
                }
            });

            expect(res.statusCode).toBe(403);

            // Cleanup
            await pool.query('DELETE FROM flights WHERE id = $1', [draftFlightId]);
            await pool.query('DELETE FROM events WHERE id = $1', [draftEventId]);
        });
    });
});
