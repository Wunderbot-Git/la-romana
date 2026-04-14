import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { setupTestDb, closeTestPool, truncateTables } from './helpers/db';
import { buildApp } from '../src/app';

describe('Stroke Index Overrides', () => {
    let app: any;
    let organizerToken: string;
    let playerToken: string;
    let eventId: string;
    let teeId: string;
    let holeIds: string[] = [];

    beforeAll(async () => {
        await setupTestDb();
        await truncateTables();
        app = buildApp();
        await app.ready();

        // Create Organizer
        const orgEmail = `org-overrides-${Date.now()}@test.com`;
        await app.inject({ method: 'POST', url: '/auth/signup', payload: { email: orgEmail, password: 'Password123' } });
        const orgLogin = await app.inject({ method: 'POST', url: '/auth/login', payload: { email: orgEmail, password: 'Password123' } });
        organizerToken = JSON.parse(orgLogin.body).token;

        // Create Player
        const playerEmail = `p1-overrides-${Date.now()}@test.com`;
        await app.inject({ method: 'POST', url: '/auth/signup', payload: { email: playerEmail, password: 'Password123' } });
        const p1Login = await app.inject({ method: 'POST', url: '/auth/login', payload: { email: playerEmail, password: 'Password123' } });
        playerToken = JSON.parse(p1Login.body).token;

        // Create Event
        const eventRes = await app.inject({
            method: 'POST',
            url: '/events',
            headers: { Authorization: `Bearer ${organizerToken}` },
            payload: { name: 'Override Cup', startDate: '2024-01-01', endDate: '2024-01-03', format: 'singles' }
        });
        eventId = JSON.parse(eventRes.body).id;

        // Create Course
        const holes = Array.from({ length: 18 }, (_, i) => ({
            holeNumber: i + 1,
            par: 4,
            strokeIndex: i + 1 // 1 through 18 default
        }));

        const coursePayload = {
            name: 'Override Golf Club',
            tees: [{ name: 'Black', holes }]
        };

        const courseRes = await app.inject({
            method: 'POST',
            url: `/events/${eventId}/course`,
            headers: { Authorization: `Bearer ${organizerToken}` },
            payload: coursePayload
        });

        const course = JSON.parse(courseRes.body);
        teeId = course.tees[0].id;
        holeIds = course.tees[0].holes.map((h: any) => h.id);
    });

    afterAll(async () => {
        await app.close();
        await closeTestPool();
    });

    it('should set stroke index overrides successfully', async () => {
        // Reverse stroke indexes: 18 down to 1
        const overrides = holeIds.map((hid, i) => ({
            holeId: hid,
            strokeIndex: 18 - i
        }));

        const res = await app.inject({
            method: 'PUT',
            url: `/events/${eventId}/overrides`,
            headers: { Authorization: `Bearer ${organizerToken}` },
            payload: { teeId, overrides }
        });

        if (res.statusCode !== 200) {
            console.log('Set Override Error:', res.body);
        }
        expect(res.statusCode).toBe(200);
    });

    it('should retrieve effective holes with overrides applied', async () => {
        const res = await app.inject({
            method: 'GET',
            url: `/events/${eventId}/overrides?teeId=${teeId}`,
            headers: { Authorization: `Bearer ${playerToken}` }
        });

        expect(res.statusCode).toBe(200);
        const holes = JSON.parse(res.body);
        expect(holes).toHaveLength(18);

        // Check first hole (Index 0): originally SI 1, now SI 18
        expect(holes[0].originalStrokeIndex).toBe(1);
        if (holes[0].strokeIndex !== 18) {
            console.log('Effective Holes Mismatch. First Hole:', holes[0]);
            console.log('Overrides Response Body:', res.body);
        }
        expect(holes[0].strokeIndex).toBe(18);
        expect(holes[0].isOverridden).toBe(true);

        // Check last hole (Index 17): originally SI 18, now SI 1
        expect(holes[17].strokeIndex).toBe(1);
    });

    it('should default to original indexes if no overrides exist', async () => {
        // Create new event event2, course 2 is expensive...
        // Let's just create a new Tee on existing course? No, structure is fixed.
        // We'll trust the logic: logic says get fallback.
        // Let's create a partial event flow quickly.

        // Actually, let's create a fresh event/course for "no override" test to be clean
        const eventRes2 = await app.inject({
            method: 'POST',
            url: '/events',
            headers: { Authorization: `Bearer ${organizerToken}` },
            payload: { name: 'No Override Cup', startDate: '2024-01-01', endDate: '2024-01-03', format: 'singles' }
        });
        const eventId2 = JSON.parse(eventRes2.body).id;
        const holes = Array.from({ length: 18 }, (_, i) => ({ holeNumber: i + 1, par: 4, strokeIndex: i + 1 }));
        const courseRes2 = await app.inject({
            method: 'POST',
            url: `/events/${eventId2}/course`,
            headers: { Authorization: `Bearer ${organizerToken}` },
            payload: { name: 'Clean Course', tees: [{ name: 'White', holes }] }
        });
        const teeId2 = JSON.parse(courseRes2.body).tees[0].id;

        const res = await app.inject({
            method: 'GET',
            url: `/events/${eventId2}/overrides?teeId=${teeId2}`,
            headers: { Authorization: `Bearer ${playerToken}` }
        });

        expect(res.statusCode).toBe(200);
        const fetchedHoles = JSON.parse(res.body);
        expect(fetchedHoles[0].strokeIndex).toBe(1); // Default
        expect(fetchedHoles[0].isOverridden).toBe(false);
    });

    it('should reject non-organizers setting overrides', async () => {
        const overrides = holeIds.map((hid, i) => ({ holeId: hid, strokeIndex: i + 1 }));
        const res = await app.inject({
            method: 'PUT',
            url: `/events/${eventId}/overrides`,
            headers: { Authorization: `Bearer ${playerToken}` },
            payload: { teeId, overrides }
        });
        expect(res.statusCode).toBe(403);
    });

    it('should reject duplicate stroke indexes in overrides', async () => {
        // Set all to 1
        const overrides = holeIds.map(hid => ({ holeId: hid, strokeIndex: 1 }));
        const res = await app.inject({
            method: 'PUT',
            url: `/events/${eventId}/overrides`,
            headers: { Authorization: `Bearer ${organizerToken}` },
            payload: { teeId, overrides }
        });
        expect(res.statusCode).toBe(400);
        expect(JSON.parse(res.body).error).toContain('Duplicate stroke index');
    });

    it('should reject incomplete overrides (not 18 holes)', async () => {
        const overrides = holeIds.slice(0, 10).map((hid, i) => ({ holeId: hid, strokeIndex: i + 1 }));
        const res = await app.inject({
            method: 'PUT',
            url: `/events/${eventId}/overrides`,
            headers: { Authorization: `Bearer ${organizerToken}` },
            payload: { teeId, overrides }
        });
        expect(res.statusCode).toBe(400);
        expect(JSON.parse(res.body).error).toContain('Must provide overrides for exactly 18 holes');
    });
});
