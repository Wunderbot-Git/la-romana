import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { setupTestDb, closeTestPool, truncateTables } from './helpers/db';
import { buildApp } from '../src/app';

describe('Player Management', () => {
    let app: any;
    let organizerToken: string;
    let playerToken: string;
    let eventId: string;
    let teeId: string;

    beforeAll(async () => {
        await setupTestDb();
        await truncateTables();
        app = buildApp();
        await app.ready();

        // Create Organizer
        const orgEmail = `org-players-${Date.now()}@test.com`;
        await app.inject({ method: 'POST', url: '/auth/signup', payload: { email: orgEmail, password: 'Password123' } });
        const orgLogin = await app.inject({ method: 'POST', url: '/auth/login', payload: { email: orgEmail, password: 'Password123' } });
        organizerToken = JSON.parse(orgLogin.body).token;

        // Create Player (User)
        const playerEmail = `p1-players-${Date.now()}@test.com`;
        await app.inject({ method: 'POST', url: '/auth/signup', payload: { email: playerEmail, password: 'Password123' } });
        const p1Login = await app.inject({ method: 'POST', url: '/auth/login', payload: { email: playerEmail, password: 'Password123' } });
        playerToken = JSON.parse(p1Login.body).token;

        // Create Event
        const eventRes = await app.inject({
            method: 'POST',
            url: '/events',
            headers: { Authorization: `Bearer ${organizerToken}` },
            payload: { name: 'Player Cup', startDate: '2024-01-01', endDate: '2024-01-03', format: 'singles' }
        });
        eventId = JSON.parse(eventRes.body).id;

        // Create Course and Tee
        const holes = Array.from({ length: 18 }, (_, i) => ({ holeNumber: i + 1, par: 4, strokeIndex: i + 1 }));
        const courseRes = await app.inject({
            method: 'POST',
            url: `/events/${eventId}/course`,
            headers: { Authorization: `Bearer ${organizerToken}` },
            payload: { name: 'Player Course', tees: [{ name: 'Blue', holes }] }
        });
        teeId = JSON.parse(courseRes.body).tees[0].id;
    });

    afterAll(async () => {
        await app.close();
        await closeTestPool();
    });

    it('should create a player successfully (Organizer)', async () => {
        const payload = {
            firstName: 'Tiger',
            lastName: 'Woods',
            handicapIndex: 0.0,
            teeId
        };

        const res = await app.inject({
            method: 'POST',
            url: `/events/${eventId}/players`,
            headers: { Authorization: `Bearer ${organizerToken}` },
            payload
        });

        if (res.statusCode !== 201) {
            console.log('Create Player Error Body:', JSON.stringify(res.body, null, 2));
        }
        expect(res.statusCode).toBe(201);
        const player = JSON.parse(res.body);
        expect(player.id).toBeDefined();
        expect(player.firstName).toBe('Tiger');
        expect(player.eventId).toBe(eventId);
    });

    it('should retrieve players for event', async () => {
        const res = await app.inject({
            method: 'GET',
            url: `/events/${eventId}/players`,
            headers: { Authorization: `Bearer ${playerToken}` }
        });

        expect(res.statusCode).toBe(200);
        const players = JSON.parse(res.body);
        expect(players.length).toBeGreaterThan(0);
        expect(players[0].lastName).toBe('Woods');
    });

    it('should update player details', async () => {
        // Get player to find ID
        const listRes = await app.inject({ method: 'GET', url: `/events/${eventId}/players`, headers: { Authorization: `Bearer ${organizerToken}` } });
        const player = JSON.parse(listRes.body)[0];

        const res = await app.inject({
            method: 'PUT',
            url: `/events/${eventId}/players/${player.id}`,
            headers: { Authorization: `Bearer ${organizerToken}` },
            payload: { handicapIndex: 2.5 }
        });

        expect(res.statusCode).toBe(200);
        expect(JSON.parse(res.body).handicapIndex).toBe(2.5);
    });

    it('should delete player', async () => {
        // Create dummy player to delete
        const payload = { firstName: 'Delete', lastName: 'Me', handicapIndex: 10, teeId };
        const create = await app.inject({ method: 'POST', url: `/events/${eventId}/players`, headers: { Authorization: `Bearer ${organizerToken}` }, payload });
        const playerId = JSON.parse(create.body).id;

        const res = await app.inject({
            method: 'DELETE',
            url: `/events/${eventId}/players/${playerId}`,
            headers: { Authorization: `Bearer ${organizerToken}` }
        });

        expect(res.statusCode).toBe(200);

        // Verify gone
        const list = await app.inject({ method: 'GET', url: `/events/${eventId}/players`, headers: { Authorization: `Bearer ${organizerToken}` } });
        const players = JSON.parse(list.body);
        expect(players.find((p: any) => p.id === playerId)).toBeUndefined();
    });

    it('should reject non-organizer modification', async () => {
        const payload = { firstName: 'Hacker', lastName: 'One', handicapIndex: 20, teeId };
        const res = await app.inject({
            method: 'POST',
            url: `/events/${eventId}/players`,
            headers: { Authorization: `Bearer ${playerToken}` },
            payload
        });
        expect(res.statusCode).toBe(403);
    });

    it('should validate handicap range', async () => {
        const payload = { firstName: 'Bad', lastName: 'Capper', handicapIndex: 100, teeId };
        const res = await app.inject({
            method: 'POST',
            url: `/events/${eventId}/players`,
            headers: { Authorization: `Bearer ${organizerToken}` },
            payload
        });
        expect(res.statusCode).toBe(400);
        expect(JSON.parse(res.body).error).toContain('Handicap index must be');
    });

    it('should validate tee exists', async () => {
        const payload = { firstName: 'Bad', lastName: 'Tee', handicapIndex: 5, teeId: '00000000-0000-0000-0000-000000000000' };
        const res = await app.inject({
            method: 'POST',
            url: `/events/${eventId}/players`,
            headers: { Authorization: `Bearer ${organizerToken}` },
            payload
        });
        expect(res.statusCode).toBe(400);
    });
});
