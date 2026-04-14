import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { buildApp } from '../src/app';
import { FastifyInstance } from 'fastify';
import { getPool } from '../src/config/database';

describe('API Integration and Wiring', () => {
    let app: FastifyInstance;

    beforeAll(async () => {
        app = await buildApp();
        await app.ready();
    });

    afterAll(async () => {
        await app.close();
    });

    describe('CORS', () => {
        it('should respond to OPTIONS with CORS headers', async () => {
            const res = await app.inject({
                method: 'OPTIONS',
                url: '/api',
                headers: { Origin: 'http://localhost:3000' }
            });

            expect(res.statusCode).toBe(204);
            expect(res.headers['access-control-allow-origin']).toBeDefined();
            expect(res.headers['access-control-allow-methods']).toContain('GET');
            expect(res.headers['access-control-allow-methods']).toContain('POST');
        });

        it('should include CORS headers on regular requests', async () => {
            const res = await app.inject({
                method: 'GET',
                url: '/health',
                headers: { Origin: 'http://localhost:3000' }
            });

            expect(res.statusCode).toBe(200);
            expect(res.headers['access-control-allow-origin']).toBeDefined();
        });
    });

    describe('API Info', () => {
        it('should return API info', async () => {
            const res = await app.inject({
                method: 'GET',
                url: '/api'
            });

            expect(res.statusCode).toBe(200);
            const body = JSON.parse(res.body);
            expect(body.name).toBe('Ryder Cup Par00 API');
            expect(body.version).toBe('0.1.0');
            expect(body.endpoints).toBeDefined();
        });
    });

    describe('Error Handling', () => {
        it('should reject invalid routes with 404', async () => {
            const res = await app.inject({
                method: 'GET',
                url: '/nonexistent/route/here'
            });

            expect(res.statusCode).toBe(404);
        });
    });

    describe('Health Check', () => {
        it('should return health status', async () => {
            const res = await app.inject({
                method: 'GET',
                url: '/health'
            });

            expect(res.statusCode).toBe(200);
            const body = JSON.parse(res.body);
            expect(body.status).toBe('ok');
            expect(body.database).toBe('connected');
            expect(body.timestamp).toBeDefined();
        });
    });
});

describe('Complete Tournament Flow', () => {
    let app: FastifyInstance;
    let organizerToken: string;
    let organizerId: string;
    let eventId: string;
    let flightId: string;

    beforeAll(async () => {
        app = await buildApp();
        await app.ready();
        const pool = getPool();

        // Create test user directly
        const email = `flow-organizer-${Date.now()}@test.com`;
        const userRes = await pool.query(
            `INSERT INTO users (email, password_hash) VALUES ($1, $2) RETURNING id`,
            [email, 'hash']
        );
        organizerId = userRes.rows[0].id;
        organizerToken = app.jwt.sign({ id: organizerId, email });

        // Create event
        const eventCode = `INT${Date.now()}`.slice(0, 8);
        const eventRes = await pool.query(
            `INSERT INTO events (name, event_code, status, created_by_user_id) VALUES ($1, $2, 'live', $3) RETURNING id`,
            [`Integration Event`, eventCode, organizerId]
        );
        eventId = eventRes.rows[0].id;

        // Create flight
        const flightRes = await pool.query(
            `INSERT INTO flights (event_id, flight_number) VALUES ($1, 1) RETURNING id`,
            [eventId]
        );
        flightId = flightRes.rows[0].id;
    });

    afterAll(async () => {
        const pool = getPool();
        if (eventId) {
            await pool.query('DELETE FROM spectator_tokens WHERE event_id = $1', [eventId]);
            await pool.query('DELETE FROM flights WHERE event_id = $1', [eventId]);
            await pool.query('DELETE FROM events WHERE id = $1', [eventId]);
        }
        if (organizerId) {
            await pool.query('DELETE FROM users WHERE id = $1', [organizerId]);
        }
        await app.close();
    });

    it('should get leaderboard', async () => {
        const res = await app.inject({
            method: 'GET',
            url: `/events/${eventId}/leaderboard`
        });

        expect(res.statusCode).toBe(200);
        const body = JSON.parse(res.body);
        expect(body.tournament).toBeDefined();
        expect(body.flights).toBeDefined();
    });

    it('should get segment status', async () => {
        const res = await app.inject({
            method: 'GET',
            url: `/events/${eventId}/flights/${flightId}/segment/front`,
            headers: { Authorization: `Bearer ${organizerToken}` }
        });

        expect(res.statusCode).toBe(200);
        const body = JSON.parse(res.body);
        expect(body.segment).toBe('front');
    });

    it('should create spectator link', async () => {
        const res = await app.inject({
            method: 'POST',
            url: `/events/${eventId}/spectator-link`,
            headers: { Authorization: `Bearer ${organizerToken}` },
            payload: {}
        });

        expect(res.statusCode).toBe(201);
        const body = JSON.parse(res.body);
        expect(body.token.length).toBe(64);

        // Verify spectator can access leaderboard
        const spectatorRes = await app.inject({
            method: 'GET',
            url: `/spectate/${body.token}/leaderboard`
        });
        expect(spectatorRes.statusCode).toBe(200);
    });
});
