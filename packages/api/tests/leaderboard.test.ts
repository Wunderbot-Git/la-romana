import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { buildApp } from '../src/app';
import { FastifyInstance } from 'fastify';
import { getPool } from '../src/config/database';

describe('Leaderboard and History API', () => {
    let app: FastifyInstance;
    let testEventId: string;
    let testFlightId: string;
    let testUserId: string;
    let authToken: string;

    beforeAll(async () => {
        app = await buildApp();
        await app.ready();
        const pool = getPool();

        // Create test user
        const email = `leaderboard-${Date.now()}@test.com`;
        const userRes = await pool.query(
            `INSERT INTO users (email, password_hash) VALUES ($1, $2) RETURNING id`,
            [email, 'hash']
        );
        testUserId = userRes.rows[0].id;
        authToken = app.jwt.sign({ id: testUserId, email });

        // Create test event
        const eventCode = `LBD${Date.now()}`.slice(0, 8);
        const eventRes = await pool.query(
            `INSERT INTO events (name, event_code, status, created_by_user_id) VALUES ($1, $2, 'live', $3) RETURNING id`,
            [`Leaderboard Test ${Date.now()}`, eventCode, testUserId]
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
        await pool.query('DELETE FROM flights WHERE event_id = $1', [testEventId]);
        await pool.query('DELETE FROM events WHERE id = $1', [testEventId]);
        await pool.query('DELETE FROM users WHERE id = $1', [testUserId]);
        await app.close();
    });

    describe('Leaderboard', () => {
        it('should get leaderboard for event', async () => {
            const res = await app.inject({
                method: 'GET',
                url: `/events/${testEventId}/leaderboard`
            });

            expect(res.statusCode).toBe(200);
            const body = JSON.parse(res.body);
            expect(body.eventId).toBe(testEventId);
            expect(body.tournament).toBeDefined();
            expect(body.momentum).toBeDefined();
            expect(body.flights).toBeDefined();
        });

        it('should return 404 for non-existent event', async () => {
            const res = await app.inject({
                method: 'GET',
                url: `/events/00000000-0000-0000-0000-000000000000/leaderboard`
            });

            expect(res.statusCode).toBe(404);
        });

        it('should show tournament point totals', async () => {
            const res = await app.inject({
                method: 'GET',
                url: `/events/${testEventId}/leaderboard`
            });

            const body = JSON.parse(res.body);
            expect(body.tournament.redPoints).toBeDefined();
            expect(body.tournament.bluePoints).toBeDefined();
            expect(body.tournament.totalPoints).toBeDefined();
            expect(body.tournament.pointsToWin).toBeDefined();
        });

        it('should show momentum indicator', async () => {
            const res = await app.inject({
                method: 'GET',
                url: `/events/${testEventId}/leaderboard`
            });

            const body = JSON.parse(res.body);
            expect(body.momentum.direction).toBeDefined();
            expect(body.momentum.strength).toBeDefined();
        });
    });

    describe('Match History', () => {
        it('should get match history for flight', async () => {
            const res = await app.inject({
                method: 'GET',
                url: `/events/${testEventId}/flights/${testFlightId}/history`,
                headers: { Authorization: `Bearer ${authToken}` }
            });

            expect(res.statusCode).toBe(200);
            const body = JSON.parse(res.body);
            // May return null matches if no players assigned
            expect(body).toBeDefined();
        });

        it('should return 404 for non-existent flight', async () => {
            const res = await app.inject({
                method: 'GET',
                url: `/events/${testEventId}/flights/00000000-0000-0000-0000-000000000000/history`,
                headers: { Authorization: `Bearer ${authToken}` }
            });

            expect(res.statusCode).toBe(404);
        });
    });
});
