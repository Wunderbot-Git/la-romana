import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { setupTestDb, closeTestPool, truncateTables } from './helpers/db';
import { buildApp } from '../src/app';

describe('Flight Authorization', () => {
    let app: any;
    let organizerToken: string;
    let player1Token: string;
    let player2Token: string;
    let eventId: string;
    let flight1Id: string;
    let flight2Id: string;
    let teeId: string;

    beforeAll(async () => {
        await setupTestDb();
        await truncateTables();
        app = buildApp();
        await app.ready();

        // 1. Create Organizer
        const orgEmail = `org-auth-${Date.now()}@test.com`;
        await app.inject({ method: 'POST', url: '/auth/signup', payload: { email: orgEmail, password: 'Password123' } });
        const orgLogin = await app.inject({ method: 'POST', url: '/auth/login', payload: { email: orgEmail, password: 'Password123' } });
        organizerToken = JSON.parse(orgLogin.body).token;

        // 2. Create Event
        const eventRes = await app.inject({
            method: 'POST',
            url: '/events',
            headers: { Authorization: `Bearer ${organizerToken}` },
            payload: { name: 'Auth Cup', startDate: '2024-01-01', endDate: '2024-01-03', format: 'singles' }
        });
        eventId = JSON.parse(eventRes.body).id;

        // 3. Create Course & Flights
        const courseRes = await app.inject({
            method: 'POST',
            url: `/events/${eventId}/course`,
            headers: { Authorization: `Bearer ${organizerToken}` },
            payload: { name: 'C', tees: [{ name: 'T', holes: Array.from({ length: 18 }, (_, i) => ({ holeNumber: i + 1, strokeIndex: i + 1 })) }] }
        });
        teeId = JSON.parse(courseRes.body).tees[0].id;

        const flightsRes = await app.inject({
            method: 'POST',
            url: `/events/${eventId}/flights`,
            headers: { Authorization: `Bearer ${organizerToken}` },
            payload: { count: 2 }
        });
        const flights = JSON.parse(flightsRes.body);
        flight1Id = flights[0].id;
        flight2Id = flights[1].id;

        // 4. Create Players (Users)
        // Player 1
        const p1Email = `p1-auth-${Date.now()}@test.com`;
        await app.inject({ method: 'POST', url: '/auth/signup', payload: { email: p1Email, password: 'Password123' } });
        const p1Login = await app.inject({ method: 'POST', url: '/auth/login', payload: { email: p1Email, password: 'Password123' } });
        player1Token = JSON.parse(p1Login.body).token;
        const p1Create = await app.inject({
            method: 'POST',
            url: `/events/${eventId}/players`,
            headers: { Authorization: `Bearer ${organizerToken}` },
            payload: { firstName: 'Player', lastName: 'One', handicapIndex: 0, teeId, userId: JSON.parse(p1Login.body).user.id }
        });
        const p1Id = JSON.parse(p1Create.body).id;

        // Player 2
        const p2Email = `p2-auth-${Date.now()}@test.com`;
        await app.inject({ method: 'POST', url: '/auth/signup', payload: { email: p2Email, password: 'Password123' } });
        const p2Login = await app.inject({ method: 'POST', url: '/auth/login', payload: { email: p2Email, password: 'Password123' } });
        player2Token = JSON.parse(p2Login.body).token;
        const p2Create = await app.inject({
            method: 'POST',
            url: `/events/${eventId}/players`,
            headers: { Authorization: `Bearer ${organizerToken}` },
            payload: { firstName: 'Player', lastName: 'Two', handicapIndex: 0, teeId, userId: JSON.parse(p2Login.body).user.id }
        });
        const p2Id = JSON.parse(p2Create.body).id;

        // 5. Assign Players
        await app.inject({
            method: 'POST',
            url: `/events/${eventId}/flights/${flight1Id}/assign`,
            headers: { Authorization: `Bearer ${organizerToken}` },
            payload: { playerId: p1Id, team: 'red', position: 1 }
        });

        await app.inject({
            method: 'POST',
            url: `/events/${eventId}/flights/${flight2Id}/assign`,
            headers: { Authorization: `Bearer ${organizerToken}` },
            payload: { playerId: p2Id, team: 'red', position: 1 }
        });
    });

    afterAll(async () => {
        await app.close();
        await closeTestPool();
    });

    it('should allow organizer to access any flight', async () => {
        const res = await app.inject({
            method: 'GET',
            url: `/events/${eventId}/flights/${flight1Id}`,
            headers: { Authorization: `Bearer ${organizerToken}` }
        });
        expect(res.statusCode).toBe(200);
    });

    it('should allow player to access their OWN flight', async () => {
        const res = await app.inject({
            method: 'GET',
            url: `/events/${eventId}/flights/${flight1Id}`,
            headers: { Authorization: `Bearer ${player1Token}` }
        });
        expect(res.statusCode).toBe(200);
        expect(JSON.parse(res.body).id).toBe(flight1Id);
    });

    it('should DENY player access to OTHER flight', async () => {
        const res = await app.inject({
            method: 'GET',
            url: `/events/${eventId}/flights/${flight2Id}`,
            headers: { Authorization: `Bearer ${player1Token}` }
        });
        expect(res.statusCode).toBe(403);
    });

    it('should DENY access to non-participant', async () => {
        const u3 = `u3-auth-${Date.now()}@test.com`;
        await app.inject({ method: 'POST', url: '/auth/signup', payload: { email: u3, password: 'Password123' } });
        const login = await app.inject({ method: 'POST', url: '/auth/login', payload: { email: u3, password: 'Password123' } });
        const token = JSON.parse(login.body).token;

        const res = await app.inject({
            method: 'GET',
            url: `/events/${eventId}/flights/${flight1Id}`,
            headers: { Authorization: `Bearer ${token}` }
        });
        expect(res.statusCode).toBe(403);
    });
});
