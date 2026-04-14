import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { buildApp } from '../src/app';
import { FastifyInstance } from 'fastify';
import { getPool } from '../src/config/database';

describe('Spectator Access API', () => {
    let app: FastifyInstance;
    let testEventId: string;
    let testFlightId: string;
    let testUserId: string;
    let authToken: string;
    let spectatorToken: string;

    beforeAll(async () => {
        app = await buildApp();
        await app.ready();
        const pool = getPool();

        // Create test user
        const email = `spectator-${Date.now()}@test.com`;
        const userRes = await pool.query(
            `INSERT INTO users (email, password_hash) VALUES ($1, $2) RETURNING id`,
            [email, 'hash']
        );
        testUserId = userRes.rows[0].id;
        authToken = app.jwt.sign({ id: testUserId, email });

        // Create test event
        const eventCode = `SPC${Date.now()}`.slice(0, 8);
        const eventRes = await pool.query(
            `INSERT INTO events (name, event_code, status, created_by_user_id) VALUES ($1, $2, 'live', $3) RETURNING id`,
            [`Spectator Test ${Date.now()}`, eventCode, testUserId]
        );
        testEventId = eventRes.rows[0].id;

        // Create test flight
        const flightRes = await pool.query(
            `INSERT INTO flights (event_id, flight_number) VALUES ($1, 1) RETURNING id`,
            [testEventId]
        );
        testFlightId = flightRes.rows[0].id;
    });

    afterAll(async () => {
        const pool = getPool();
        await pool.query('DELETE FROM spectator_tokens WHERE event_id = $1', [testEventId]);
        await pool.query('DELETE FROM flights WHERE event_id = $1', [testEventId]);
        await pool.query('DELETE FROM events WHERE id = $1', [testEventId]);
        await pool.query('DELETE FROM users WHERE id = $1', [testUserId]);
        await app.close();
    });

    describe('Create spectator link', () => {
        it('should create spectator link', async () => {
            const res = await app.inject({
                method: 'POST',
                url: `/events/${testEventId}/spectator-link`,
                headers: { Authorization: `Bearer ${authToken}` },
                payload: {}
            });

            expect(res.statusCode).toBe(201);
            const body = JSON.parse(res.body);
            expect(body.token).toBeDefined();
            expect(body.token.length).toBe(64);
            expect(body.url).toContain(body.token);
            spectatorToken = body.token;
        });

        it('should create multiple links for same event', async () => {
            const res = await app.inject({
                method: 'POST',
                url: `/events/${testEventId}/spectator-link`,
                headers: { Authorization: `Bearer ${authToken}` },
                payload: { expiresInDays: 7 }
            });

            expect(res.statusCode).toBe(201);
            const body = JSON.parse(res.body);
            expect(body.token).not.toBe(spectatorToken);
        });
    });

    describe('Public spectator access', () => {
        it('should get leaderboard with valid token', async () => {
            const res = await app.inject({
                method: 'GET',
                url: `/spectate/${spectatorToken}/leaderboard`
            });

            expect(res.statusCode).toBe(200);
            const body = JSON.parse(res.body);
            expect(body.eventId).toBe(testEventId);
            expect(body.tournament).toBeDefined();
        });

        it('should return 404 for invalid token', async () => {
            const res = await app.inject({
                method: 'GET',
                url: '/spectate/invalidtoken123/leaderboard'
            });

            expect(res.statusCode).toBe(404);
        });

        it('should get flight history with valid token', async () => {
            const res = await app.inject({
                method: 'GET',
                url: `/spectate/${spectatorToken}/flights/${testFlightId}/history`
            });

            expect(res.statusCode).toBe(200);
        });
    });

    describe('Token management', () => {
        it('should list tokens for event', async () => {
            const res = await app.inject({
                method: 'GET',
                url: `/events/${testEventId}/spectator-links`,
                headers: { Authorization: `Bearer ${authToken}` }
            });

            expect(res.statusCode).toBe(200);
            const body = JSON.parse(res.body);
            expect(body.tokens.length).toBeGreaterThanOrEqual(2);
        });
    });
});
