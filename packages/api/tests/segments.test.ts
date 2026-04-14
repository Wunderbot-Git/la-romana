import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { buildApp } from '../src/app';
import { FastifyInstance } from 'fastify';
import { getPool } from '../src/config/database';

describe('Segment Management API', () => {
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
        const email = `segment-${Date.now()}@test.com`;
        const userRes = await pool.query(
            `INSERT INTO users (email, password_hash) VALUES ($1, $2) RETURNING id`,
            [email, 'hash']
        );
        testUserId = userRes.rows[0].id;
        authToken = app.jwt.sign({ id: testUserId, email });

        // Create test event
        const eventCode = `SEG${Date.now()}`.slice(0, 8);
        const eventRes = await pool.query(
            `INSERT INTO events (name, event_code, status, created_by_user_id) VALUES ($1, $2, 'live', $3) RETURNING id`,
            [`Segment Test ${Date.now()}`, eventCode, testUserId]
        );
        testEventId = eventRes.rows[0].id;

        // Create test flight
        const flightRes = await pool.query(
            `INSERT INTO flights (event_id, flight_number, front_state, back_state) VALUES ($1, 1, 'open', 'open') RETURNING id`,
            [testEventId]
        );
        testFlightId = flightRes.rows[0].id;
    });

    afterAll(async () => {
        const pool = getPool();
        await pool.query('DELETE FROM audit_log WHERE event_id = $1', [testEventId]);
        await pool.query('DELETE FROM flights WHERE event_id = $1', [testEventId]);
        await pool.query('DELETE FROM events WHERE id = $1', [testEventId]);
        await pool.query('DELETE FROM users WHERE id = $1', [testUserId]);
        await app.close();
    });

    describe('GET /segment/:segment', () => {
        it('should get front segment status', async () => {
            const res = await app.inject({
                method: 'GET',
                url: `/events/${testEventId}/flights/${testFlightId}/segment/front`,
                headers: { Authorization: `Bearer ${authToken}` }
            });

            expect(res.statusCode).toBe(200);
            const body = JSON.parse(res.body);
            expect(body.segment).toBe('front');
            expect(body.state).toBe('open');
            expect(body.canComplete).toBeDefined();
        });

        it('should reject invalid segment', async () => {
            const res = await app.inject({
                method: 'GET',
                url: `/events/${testEventId}/flights/${testFlightId}/segment/invalid`,
                headers: { Authorization: `Bearer ${authToken}` }
            });

            expect(res.statusCode).toBe(400);
        });
    });

    describe('POST /segment/:segment/complete', () => {
        it('should complete segment when no players (no scores needed)', async () => {
            const res = await app.inject({
                method: 'POST',
                url: `/events/${testEventId}/flights/${testFlightId}/segment/front/complete`,
                headers: { Authorization: `Bearer ${authToken}` }
            });

            // With no players, segment can be completed
            expect(res.statusCode).toBe(200);
            const body = JSON.parse(res.body);
            expect(body.state).toBe('completed');
        });

        it('should reject completing already completed segment', async () => {
            const res = await app.inject({
                method: 'POST',
                url: `/events/${testEventId}/flights/${testFlightId}/segment/front/complete`,
                headers: { Authorization: `Bearer ${authToken}` }
            });

            expect(res.statusCode).toBe(409);
            const body = JSON.parse(res.body);
            expect(body.error).toContain('already completed');
        });
    });

    describe('POST /segment/:segment/reopen', () => {
        it('should reopen completed segment', async () => {
            // Front was completed above
            const res = await app.inject({
                method: 'POST',
                url: `/events/${testEventId}/flights/${testFlightId}/segment/front/reopen`,
                headers: { Authorization: `Bearer ${authToken}` }
            });

            expect(res.statusCode).toBe(200);
            const body = JSON.parse(res.body);
            expect(body.state).toBe('reopened');
        });

        it('should reject reopen when not completed', async () => {
            // Back is still 'open'
            const res = await app.inject({
                method: 'POST',
                url: `/events/${testEventId}/flights/${testFlightId}/segment/back/reopen`,
                headers: { Authorization: `Bearer ${authToken}` }
            });

            expect(res.statusCode).toBe(400);
            const body = JSON.parse(res.body);
            expect(body.error).toContain('not completed');
        });
    });

    describe('Segment status flow', () => {
        it('should create audit log on segment actions', async () => {
            const pool = getPool();
            const auditRes = await pool.query(
                `SELECT * FROM audit_log WHERE event_id = $1 AND entity_type = 'segment'`,
                [testEventId]
            );
            // Should have at least complete and reopen logs
            expect(auditRes.rows.length).toBeGreaterThanOrEqual(2);
        });
    });
});
