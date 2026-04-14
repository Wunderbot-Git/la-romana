import { describe, it, expect } from 'vitest';
import { buildApp } from '../src/app';

describe('Health Endpoint', () => {
    it('should return 200 and formatted response', async () => {
        const app = buildApp();
        const response = await app.inject({
            method: 'GET',
            url: '/health',
        });

        expect(response.statusCode).toBe(200);
        const body = JSON.parse(response.payload);
        expect(body.status).toBe('ok');
        expect(body.timestamp).toBeDefined();
        // Database might be connected or disconnected depending on environment, but field should exist
        expect(body.database).toMatch(/connected|disconnected/);
    });
});
