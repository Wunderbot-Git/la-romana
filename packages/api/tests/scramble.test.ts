import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { setupTestDb, closeTestPool, truncateTables } from './helpers/db';
import { buildApp } from '../src/app';

describe('Mixed Scramble Stroke Index', () => {
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
        const orgEmail = `org-scramble-${Date.now()}@test.com`;
        await app.inject({ method: 'POST', url: '/auth/signup', payload: { email: orgEmail, password: 'Password123' } });
        const orgLogin = await app.inject({ method: 'POST', url: '/auth/login', payload: { email: orgEmail, password: 'Password123' } });
        organizerToken = JSON.parse(orgLogin.body).token;

        // Create Player
        const playerEmail = `p1-scramble-${Date.now()}@test.com`;
        await app.inject({ method: 'POST', url: '/auth/signup', payload: { email: playerEmail, password: 'Password123' } });
        const p1Login = await app.inject({ method: 'POST', url: '/auth/login', payload: { email: playerEmail, password: 'Password123' } });
        playerToken = JSON.parse(p1Login.body).token;

        // Create Event
        const eventRes = await app.inject({
            method: 'POST',
            url: '/events',
            headers: { Authorization: `Bearer ${organizerToken}` },
            payload: { name: 'Scramble Cup', startDate: '2024-01-01', endDate: '2024-01-03', format: 'scramble' }
        });
        eventId = JSON.parse(eventRes.body).id;
    });

    afterAll(async () => {
        await app.close();
        await closeTestPool();
    });

    const generateExampleIndexes = () => {
        return Array.from({ length: 18 }, (_, i) => ({
            holeNumber: i + 1,
            strokeIndex: 18 - i // Reverse 18 to 1
        }));
    };

    it('should set mixed scramble stroke indexes successfully', async () => {
        const indexes = generateExampleIndexes();
        const res = await app.inject({
            method: 'PUT',
            url: `/events/${eventId}/scramble-si`,
            headers: { Authorization: `Bearer ${organizerToken}` },
            payload: { indexes }
        });

        if (res.statusCode !== 200) {
            console.log('Set Scramble SI Error:', res.body);
        }
        expect(res.statusCode).toBe(200);
    });

    it('should retrieve stored scramble stroke indexes', async () => {
        const res = await app.inject({
            method: 'GET',
            url: `/events/${eventId}/scramble-si`,
            headers: { Authorization: `Bearer ${playerToken}` }
        });

        expect(res.statusCode).toBe(200);
        const fetched = JSON.parse(res.body);
        expect(fetched).toHaveLength(18);
        expect(fetched[0].holeNumber).toBe(1);
        expect(fetched[0].strokeIndex).toBe(18); // Check reverse mapping
        expect(fetched[17].holeNumber).toBe(18);
        expect(fetched[17].strokeIndex).toBe(1);
    });

    it('should reject non-organizers setting scramble SI', async () => {
        const indexes = generateExampleIndexes();
        const res = await app.inject({
            method: 'PUT',
            url: `/events/${eventId}/scramble-si`,
            headers: { Authorization: `Bearer ${playerToken}` },
            payload: { indexes }
        });
        expect(res.statusCode).toBe(403);
    });

    it('should reject duplicate stroke indexes', async () => {
        const indexes = generateExampleIndexes();
        indexes[1].strokeIndex = indexes[0].strokeIndex; // Duplicate

        const res = await app.inject({
            method: 'PUT',
            url: `/events/${eventId}/scramble-si`,
            headers: { Authorization: `Bearer ${organizerToken}` },
            payload: { indexes }
        });
        expect(res.statusCode).toBe(400);
        expect(JSON.parse(res.body).error).toContain('Duplicate stroke index');
    });

    it('should reject non-18 hole inputs', async () => {
        const indexes = generateExampleIndexes().slice(0, 5);

        const res = await app.inject({
            method: 'PUT',
            url: `/events/${eventId}/scramble-si`,
            headers: { Authorization: `Bearer ${organizerToken}` },
            payload: { indexes }
        });
        expect(res.statusCode).toBe(400);
        expect(JSON.parse(res.body).error).toContain('Must provide stroke indexes for exactly 18 holes');
    });
});
