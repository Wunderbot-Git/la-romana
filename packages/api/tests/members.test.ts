import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { setupTestDb, closeTestPool, truncateTables } from './helpers/db';
import { buildApp } from '../src/app';

describe('Event Members', () => {
    let app: any;
    let organizerToken: string;
    let playerToken: string;
    let player2Token: string;
    let eventId: string;

    beforeAll(async () => {
        await setupTestDb();
        await truncateTables();
        app = buildApp();
        await app.ready();

        // Create Organizer
        const orgEmail = `org-${Date.now()}@test.com`;
        await app.inject({ method: 'POST', url: '/auth/signup', payload: { email: orgEmail, password: 'Password123' } });
        const orgLogin = await app.inject({ method: 'POST', url: '/auth/login', payload: { email: orgEmail, password: 'Password123' } });
        organizerToken = JSON.parse(orgLogin.body).token;

        // Create Player 1
        const playerEmail = `p1-${Date.now()}@test.com`;
        await app.inject({ method: 'POST', url: '/auth/signup', payload: { email: playerEmail, password: 'Password123' } });
        const p1Login = await app.inject({ method: 'POST', url: '/auth/login', payload: { email: playerEmail, password: 'Password123' } });
        playerToken = JSON.parse(p1Login.body).token;

        // Create Player 2
        const player2Email = `p2-${Date.now()}@test.com`;
        await app.inject({ method: 'POST', url: '/auth/signup', payload: { email: player2Email, password: 'Password123' } });
        const p2Login = await app.inject({ method: 'POST', url: '/auth/login', payload: { email: player2Email, password: 'Password123' } });
        player2Token = JSON.parse(p2Login.body).token;
    });

    afterAll(async () => {
        await app.close();
        await closeTestPool();
    });

    it('should assign organizer role on event creation', async () => {
        const res = await app.inject({
            method: 'POST',
            url: '/events',
            headers: { Authorization: `Bearer ${organizerToken}` },
            payload: { name: 'Member Test Event', startDate: '2024-01-01', endDate: '2024-01-03', format: 'singles' }
        });
        expect(res.statusCode).toBe(201);
        eventId = JSON.parse(res.body).id;

        const membersRes = await app.inject({
            method: 'GET',
            url: `/events/${eventId}/members`,
            headers: { Authorization: `Bearer ${organizerToken}` }
        });

        expect(membersRes.statusCode).toBe(200);
        const members = JSON.parse(membersRes.body);
        expect(members).toHaveLength(1);
        expect(members[0].role).toBe('organizer');
    });

    it('should allow player to join event', async () => {
        const res = await app.inject({
            method: 'POST',
            url: `/events/${eventId}/join`,
            headers: { Authorization: `Bearer ${playerToken}` }
        });

        expect(res.statusCode).toBe(201);
        const body = JSON.parse(res.body);
        expect(body.role).toBe('player');
        expect(body.eventId).toBe(eventId);
    });

    it('should prevent player from joining same event twice', async () => {
        const res = await app.inject({
            method: 'POST',
            url: `/events/${eventId}/join`,
            headers: { Authorization: `Bearer ${playerToken}` }
        });

        expect(res.statusCode).toBe(409);
        expect(JSON.parse(res.body).error).toBe('User already joined this event');
    });

    it('should allow multiple players to join', async () => {
        const res = await app.inject({
            method: 'POST',
            url: `/events/${eventId}/join`,
            headers: { Authorization: `Bearer ${player2Token}` }
        });

        expect(res.statusCode).toBe(201);
    });

    it('should list all members correctly', async () => {
        const res = await app.inject({
            method: 'GET',
            url: `/events/${eventId}/members`,
            headers: { Authorization: `Bearer ${organizerToken}` }
        });

        expect(res.statusCode).toBe(200);
        const members = JSON.parse(res.body);
        expect(members).toHaveLength(3); // 1 Org + 2 Players

        const roles = members.map((m: any) => m.role);
        expect(roles).toContain('organizer');
        expect(roles).toContain('player');
        expect(roles.filter((r: string) => r === 'player').length).toBe(2);
    });

    it('should return 404 for joining non-existent event', async () => {
        const res = await app.inject({
            method: 'POST',
            url: `/events/${'00000000-0000-0000-0000-000000000000'}/join`,
            headers: { Authorization: `Bearer ${playerToken}` }
        });

        expect(res.statusCode).toBe(404);
    });
});
