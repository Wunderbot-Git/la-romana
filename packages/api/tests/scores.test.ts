import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { buildApp } from '../src/app';
import { FastifyInstance } from 'fastify';
import { getPool } from '../src/config/database';
import { upsertHoleScore, upsertHoleScoresBatch } from '../src/repositories/holeScoreRepository';
import { upsertScrambleScore } from '../src/repositories/scrambleScoreRepository';
import { createAuditLog, getAuditLogs } from '../src/repositories/auditRepository';
import { randomUUID } from 'crypto';

describe('Score Repositories', () => {
    let app: FastifyInstance;
    let testFlightId: string;
    let testPlayerId: string;
    let testEventId: string;
    let testUserId: string;

    beforeAll(async () => {
        app = await buildApp();
        const pool = getPool();

        // Create test user
        const userRes = await pool.query(
            `INSERT INTO users (email, password_hash) VALUES ($1, $2) RETURNING id`,
            [`score-test-${Date.now()}@test.com`, 'hash']
        );
        testUserId = userRes.rows[0].id;

        // Create test event
        const eventCode = `TST${Date.now()}`.slice(0, 8);
        const eventRes = await pool.query(
            `INSERT INTO events (name, event_code, status, created_by_user_id) VALUES ($1, $2, 'live', $3) RETURNING id`,
            [`Score Test Event ${Date.now()}`, eventCode, testUserId]
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
            `INSERT INTO players (event_id, first_name, last_name, handicap_index) VALUES ($1, 'Test', 'Player', 10) RETURNING id`,
            [testEventId]
        );
        testPlayerId = playerRes.rows[0].id;
    });

    afterAll(async () => {
        const pool = getPool();
        await pool.query('DELETE FROM hole_scores WHERE flight_id = $1', [testFlightId]);
        await pool.query('DELETE FROM scramble_team_scores WHERE flight_id = $1', [testFlightId]);
        await pool.query('DELETE FROM audit_log WHERE event_id = $1', [testEventId]);
        await pool.query('DELETE FROM players WHERE event_id = $1', [testEventId]);
        await pool.query('DELETE FROM flights WHERE event_id = $1', [testEventId]);
        await pool.query('DELETE FROM events WHERE id = $1', [testEventId]);
        await pool.query('DELETE FROM users WHERE id = $1', [testUserId]);
        await app.close();
    });

    describe('Hole Score Repository', () => {
        it('should create new score', async () => {
            const result = await upsertHoleScore({
                eventId: testEventId,
                flightId: testFlightId,
                playerId: testPlayerId,
                holeNumber: 1,
                grossScore: 4,
                mutationId: randomUUID(),
                enteredByUserId: testUserId
            });

            expect(result.wasCreated).toBe(true);
            expect(result.score.grossScore).toBe(4);
            expect(result.score.version).toBe(1);
        });

        it('should be idempotent with same mutationId', async () => {
            const mutationId = randomUUID();

            const first = await upsertHoleScore({
                eventId: testEventId,
                flightId: testFlightId,
                playerId: testPlayerId,
                holeNumber: 2,
                grossScore: 5,
                mutationId,
                enteredByUserId: testUserId
            });

            const second = await upsertHoleScore({
                eventId: testEventId,
                flightId: testFlightId,
                playerId: testPlayerId,
                holeNumber: 2,
                grossScore: 5,
                mutationId,
                enteredByUserId: testUserId
            });

            expect(first.score.id).toBe(second.score.id);
            expect(second.wasCreated).toBe(false);
        });

        it('should update with different mutationId and increment version', async () => {
            await upsertHoleScore({
                eventId: testEventId,
                flightId: testFlightId,
                playerId: testPlayerId,
                holeNumber: 3,
                grossScore: 4,
                mutationId: randomUUID(),
                enteredByUserId: testUserId
            });

            const updated = await upsertHoleScore({
                eventId: testEventId,
                flightId: testFlightId,
                playerId: testPlayerId,
                holeNumber: 3,
                grossScore: 5,
                mutationId: randomUUID(),
                enteredByUserId: testUserId
            });

            expect(updated.previousValue).toBe(4);
            expect(updated.score.grossScore).toBe(5);
            expect(updated.score.version).toBe(2);
        });

        it('should batch upsert scores', async () => {
            const result = await upsertHoleScoresBatch([
                { eventId: testEventId, flightId: testFlightId, playerId: testPlayerId, holeNumber: 4, grossScore: 4, mutationId: randomUUID(), enteredByUserId: testUserId },
                { eventId: testEventId, flightId: testFlightId, playerId: testPlayerId, holeNumber: 5, grossScore: 3, mutationId: randomUUID(), enteredByUserId: testUserId }
            ]);

            expect(result.scores).toHaveLength(2);
            expect(result.created).toBe(2);
        });
    });

    describe('Scramble Score Repository', () => {
        it('should create scramble score for back 9', async () => {
            const result = await upsertScrambleScore({
                eventId: testEventId,
                flightId: testFlightId,
                team: 'red',
                holeNumber: 10,
                grossScore: 4,
                mutationId: randomUUID(),
                enteredByUserId: testUserId
            });

            expect(result.wasCreated).toBe(true);
            expect(result.score.holeNumber).toBe(10);
        });

        it('should reject front 9 holes', async () => {
            await expect(upsertScrambleScore({
                eventId: testEventId,
                flightId: testFlightId,
                team: 'red',
                holeNumber: 5,
                grossScore: 4,
                mutationId: randomUUID(),
                enteredByUserId: testUserId
            })).rejects.toThrow('Scramble scores must be for holes 10-18');
        });
    });

    describe('Audit Repository', () => {
        let testEntityId: string;

        beforeAll(() => {
            testEntityId = randomUUID();
        });

        it('should create audit log', async () => {
            const log = await createAuditLog({
                eventId: testEventId,
                entityType: 'hole_score',
                entityId: testEntityId,
                action: 'update',
                previousValue: { grossScore: 4 },
                newValue: { grossScore: 5 },
                source: 'online',
                byUserId: testUserId
            });

            expect(log.action).toBe('update');
            expect(log.entityType).toBe('hole_score');
        });

        it('should retrieve audit logs', async () => {
            const logs = await getAuditLogs('hole_score', testEntityId);
            expect(logs.length).toBeGreaterThan(0);
        });
    });
});
