import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { setupTestDb, closeTestPool, truncateTables } from './helpers/db';
import { buildApp } from '../src/app';

describe('Event Routes', () => {
    let app: any;
    let authToken: string;

    beforeAll(async () => {
        await setupTestDb();
        await truncateTables();
        app = buildApp();
        await app.ready();

        // Create user and login to get token
        const email = `organizer-${Date.now()}@example.com`;
        const password = 'Password123';

        await app.inject({
            method: 'POST',
            url: '/auth/signup',
            payload: { email, password }
        });

        const loginRes = await app.inject({
            method: 'POST',
            url: '/auth/login',
            payload: { email, password }
        });

        authToken = JSON.parse(loginRes.body).token;
    });

    afterAll(async () => {
        await app.close();
        await closeTestPool();
    });

    let eventId: string;

    it('should create an event successfully', async () => {
        const response = await app.inject({
            method: 'POST',
            url: '/events',
            headers: { Authorization: `Bearer ${authToken}` },
            payload: {
                name: 'Ryder Cup 2024',
                startDate: '2024-09-27',
                endDate: '2024-09-29',
                format: 'singles1'
            }
        });

        if (response.statusCode !== 201) {
            console.log('Create Event Failed:', response.body);
        }

        expect(response.statusCode).toBe(201);
        const body = JSON.parse(response.body);
        expect(body).toHaveProperty('id');
        expect(body.name).toBe('Ryder Cup 2024');
        eventId = body.id;
    });

    it('should fail to create event with invalid dates', async () => {
        const response = await app.inject({
            method: 'POST',
            url: '/events',
            headers: { Authorization: `Bearer ${authToken}` },
            payload: {
                name: 'Bad Dates',
                startDate: '2024-09-30',
                endDate: '2024-09-29', // End before start
                format: 'singles1'
            }
        });

        expect(response.statusCode).toBe(400);
        expect(JSON.parse(response.body).error).toMatch(/Start date must be before/);
    });

    it('should get all events', async () => {
        const response = await app.inject({
            method: 'GET',
            url: '/events'
        });

        expect(response.statusCode).toBe(200);
        const body = JSON.parse(response.body);
        expect(Array.isArray(body)).toBe(true);
        expect(body.length).toBeGreaterThan(0);
        expect(body.some((e: any) => e.id === eventId)).toBe(true);
    });

    it('should get single event', async () => {
        const response = await app.inject({
            method: 'GET',
            url: `/events/${eventId}`
        });

        expect(response.statusCode).toBe(200);
        const body = JSON.parse(response.body);
        expect(body.id).toBe(eventId);
    });

    it('should update event', async () => {
        const response = await app.inject({
            method: 'PUT',
            url: `/events/${eventId}`,
            headers: { Authorization: `Bearer ${authToken}` },
            payload: {
                name: 'Ryder Cup 2024 Updated',
                status: 'live'
            }
        });

        expect(response.statusCode).toBe(200);
        const body = JSON.parse(response.body);
        expect(body.name).toBe('Ryder Cup 2024 Updated');
        expect(body.status).toBe('live');
    });

    it('should delete event', async () => {
        const response = await app.inject({
            method: 'DELETE',
            url: `/events/${eventId}`,
            headers: { Authorization: `Bearer ${authToken}` }
        });

        expect(response.statusCode).toBe(200);

        // Verify deletion
        const getRes = await app.inject({
            method: 'GET',
            url: `/events/${eventId}`
        });
        expect(getRes.statusCode).toBe(404);
    });
});
