import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { setupTestDb, closeTestPool, truncateTables } from './helpers/db';
import { buildApp } from '../src/app';

describe('Course and Tee Setup', () => {
    let app: any;
    let organizerToken: string;
    let playerToken: string;
    let eventId: string;

    beforeAll(async () => {
        await setupTestDb();
        await truncateTables();
        app = buildApp();
        await app.ready();

        // Create Organizer
        const orgEmail = `org-course-${Date.now()}@test.com`;
        await app.inject({ method: 'POST', url: '/auth/signup', payload: { email: orgEmail, password: 'Password123' } });
        const orgLogin = await app.inject({ method: 'POST', url: '/auth/login', payload: { email: orgEmail, password: 'Password123' } });
        organizerToken = JSON.parse(orgLogin.body).token;

        // Create Player
        const playerEmail = `p1-course-${Date.now()}@test.com`;
        await app.inject({ method: 'POST', url: '/auth/signup', payload: { email: playerEmail, password: 'Password123' } });
        const p1Login = await app.inject({ method: 'POST', url: '/auth/login', payload: { email: playerEmail, password: 'Password123' } });
        playerToken = JSON.parse(p1Login.body).token;

        // Create Event
        const res = await app.inject({
            method: 'POST',
            url: '/events',
            headers: { Authorization: `Bearer ${organizerToken}` },
            payload: { name: 'Ryder Cup Golf Course', startDate: '2024-01-01', endDate: '2024-01-03', format: 'singles' }
        });
        eventId = JSON.parse(res.body).id;
    });

    afterAll(async () => {
        await app.close();
        await closeTestPool();
    });

    const generateHoles = (startHole = 1) => {
        return Array.from({ length: 18 }, (_, i) => ({
            holeNumber: i + 1,
            par: 4,
            strokeIndex: i + 1
        }));
    };

    it('should create a course with tees and holes successfully', async () => {
        const payload = {
            name: 'Marco Simone Golf Club',
            tees: [
                {
                    name: 'Championship',
                    holes: generateHoles()
                },
                {
                    name: 'Resort',
                    holes: generateHoles()
                }
            ]
        };

        const res = await app.inject({
            method: 'POST',
            url: `/events/${eventId}/course`,
            headers: { Authorization: `Bearer ${organizerToken}` },
            payload
        });

        expect(res.statusCode).toBe(201);
        const body = JSON.parse(res.body);
        expect(body.name).toBe(payload.name);
        expect(body.tees).toHaveLength(2);
        expect(body.tees[0].holes).toHaveLength(18);
    });

    it('should prevent duplicate course creation for the same event', async () => {
        const payload = {
            name: 'Another Golf Club',
            tees: [{ name: 'Test', holes: generateHoles() }]
        };

        const res = await app.inject({
            method: 'POST',
            url: `/events/${eventId}/course`,
            headers: { Authorization: `Bearer ${organizerToken}` },
            payload
        });

        expect(res.statusCode).toBe(409);
        expect(JSON.parse(res.body).error).toBe('Event already has a course assigned');
    });

    it('should reject course creation by non-organizer', async () => {
        // Create another event for this test
        const eventRes = await app.inject({
            method: 'POST',
            url: '/events',
            headers: { Authorization: `Bearer ${organizerToken}` },
            payload: { name: 'Ryder Cup Golf Course 2', startDate: '2024-01-01', endDate: '2024-01-03', format: 'singles' }
        });
        const event2Id = JSON.parse(eventRes.body).id;

        const res = await app.inject({
            method: 'POST',
            url: `/events/${event2Id}/course`,
            headers: { Authorization: `Bearer ${playerToken}` },
            payload: { name: 'Hacker Course', tees: [] }
        });

        expect(res.statusCode).toBe(403);
    });

    it('should validate 18 holes requirement', async () => {
        // Create another event
        const eventRes = await app.inject({
            method: 'POST',
            url: '/events',
            headers: { Authorization: `Bearer ${organizerToken}` },
            payload: { name: 'Ryder Cup Golf Course 3', startDate: '2024-01-01', endDate: '2024-01-03', format: 'singles' }
        });
        const event3Id = JSON.parse(eventRes.body).id;

        const holes = generateHoles().slice(0, 17); // 17 holes
        const payload = {
            name: 'Short Course',
            tees: [{ name: 'Short Tee', holes }]
        };

        const res = await app.inject({
            method: 'POST',
            url: `/events/${event3Id}/course`,
            headers: { Authorization: `Bearer ${organizerToken}` },
            payload
        });

        expect(res.statusCode).toBe(400);
        expect(JSON.parse(res.body).error).toContain('must have exactly 18 holes');
    });

    it('should validate unique stroke indexes', async () => {
        // Create another event
        const eventRes = await app.inject({
            method: 'POST',
            url: '/events',
            headers: { Authorization: `Bearer ${organizerToken}` },
            payload: { name: 'Ryder Cup Golf Course 4', startDate: '2024-01-01', endDate: '2024-01-03', format: 'singles' }
        });
        const event4Id = JSON.parse(eventRes.body).id;

        const holes = generateHoles();
        holes[1].strokeIndex = 1; // Duplicate index 1 at hole 2

        const payload = {
            name: 'Bad Math Course',
            tees: [{ name: 'Bad Tee', holes }]
        };

        const res = await app.inject({
            method: 'POST',
            url: `/events/${event4Id}/course`,
            headers: { Authorization: `Bearer ${organizerToken}` },
            payload
        });

        expect(res.statusCode).toBe(400);
        expect(JSON.parse(res.body).error).toContain('Duplicate stroke index');
    });
});
