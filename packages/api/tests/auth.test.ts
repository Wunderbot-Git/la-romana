import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { setupTestDb, closeTestPool, truncateTables, getTestPool } from './helpers/db';
import { buildApp } from '../src/app';

describe('Auth Routes', () => {
    let app: any;

    beforeAll(async () => {
        await setupTestDb();
        await truncateTables();
        app = buildApp();
        await app.ready();
    });

    afterAll(async () => {
        await app.close();
        await closeTestPool();
    });

    it('should register a new user successfully', async () => {
        const email = `newuser-${Date.now()}@example.com`;
        const response = await app.inject({
            method: 'POST',
            url: '/auth/signup',
            payload: {
                email,
                password: 'Password123'
            }
        });

        expect(response.statusCode).toBe(201);
        const body = JSON.parse(response.body);
        expect(body.user).toHaveProperty('id');
        expect(body.user.email).toBe(email);
        expect(body.user).not.toHaveProperty('password');
        expect(body.user).not.toHaveProperty('passwordHash');
    });

    it('should reject invalid email', async () => {
        const response = await app.inject({
            method: 'POST',
            url: '/auth/signup',
            payload: {
                email: 'invalid-email',
                password: 'Password123'
            }
        });

        expect(response.statusCode).toBe(400);
        expect(JSON.parse(response.body).error).toMatch(/Invalid email/);
    });

    it('should reject weak password', async () => {
        const response = await app.inject({
            method: 'POST',
            url: '/auth/signup',
            payload: {
                email: `weakpw-${Date.now()}@example.com`,
                password: 'weak'
            }
        });

        expect(response.statusCode).toBe(400);
        expect(JSON.parse(response.body).error).toMatch(/Password must be at least 8 characters/);
    });

    it('should prevent duplicate registration', async () => {
        const email = `duplicate-${Date.now()}@example.com`;

        // First registration
        await app.inject({
            method: 'POST',
            url: '/auth/signup',
            payload: {
                email,
                password: 'Password123'
            }
        });

        // Second registration
        const response = await app.inject({
            method: 'POST',
            url: '/auth/signup',
            payload: {
                email,
                password: 'OtherPassword123'
            }
        });

        expect(response.statusCode).toBe(409);
        expect(JSON.parse(response.body).error).toBe('Email already registered');
    });

    it('should login successfully with correct credentials', async () => {
        const email = `login-${Date.now()}@example.com`;
        const password = 'Password123';

        // Register first
        await app.inject({
            method: 'POST',
            url: '/auth/signup',
            payload: { email, password }
        });

        // Login
        const response = await app.inject({
            method: 'POST',
            url: '/auth/login',
            payload: { email, password }
        });

        expect(response.statusCode).toBe(200);
        const body = JSON.parse(response.body);
        expect(body).toHaveProperty('token');
        expect(body.user.email).toBe(email);
    });

    it('should reject login with incorrect password', async () => {
        const email = `wrongpw-${Date.now()}@example.com`;
        const password = 'Password123';

        await app.inject({
            method: 'POST',
            url: '/auth/signup',
            payload: { email, password }
        });

        const response = await app.inject({
            method: 'POST',
            url: '/auth/login',
            payload: { email, password: 'WrongPassword' }
        });

        expect(response.statusCode).toBe(401);
    });

    it('should reject login for non-existent user', async () => {
        const response = await app.inject({
            method: 'POST',
            url: '/auth/login',
            payload: {
                email: `nonexistent-${Date.now()}@example.com`,
                password: 'Password123'
            }
        });

        expect(response.statusCode).toBe(401);
    });

    it('should access protected route with valid token', async () => {
        const email = `me-${Date.now()}@example.com`;
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

        const token = JSON.parse(loginRes.body).token;

        const response = await app.inject({
            method: 'GET',
            url: '/auth/me',
            headers: { Authorization: `Bearer ${token}` }
        });

        expect(response.statusCode).toBe(200);
        expect(JSON.parse(response.body).email).toBe(email);
    });

    it('should reject access to protected route without token', async () => {
        const response = await app.inject({
            method: 'GET',
            url: '/auth/me'
        });

        expect(response.statusCode).toBe(401);
    });

    it('should reject access to protected route with invalid token', async () => {
        const response = await app.inject({
            method: 'GET',
            url: '/auth/me',
            headers: { Authorization: `Bearer invalid-token` }
        });

        expect(response.statusCode).toBe(401); // fastify-jwt returns 401 or 500 depending on error, usually 401 with right setup
    });

    it('should full password reset flow', async () => {
        const email = `reset-${Date.now()}@example.com`;
        const oldPassword = 'OldPassword123';
        const newPassword = 'NewPassword123';

        // 1. Register
        await app.inject({
            method: 'POST',
            url: '/auth/signup',
            payload: { email, password: oldPassword }
        });

        // 2. Request Reset (Need to intercept token from DB since we don't return it)
        await app.inject({
            method: 'POST',
            url: '/auth/reset-password/request',
            payload: { email }
        });

        // Fetch token from DB
        const { getPool } = await import('../src/config/database');
        const pool = getPool();
        const res = await pool.query(`
            SELECT t.token 
            FROM password_reset_tokens t
            JOIN users u ON u.id = t.user_id
            WHERE u.email = $1
            ORDER BY t.created_at DESC LIMIT 1
        `, [email]);

        const token = res.rows[0].token;
        expect(token).toBeDefined();

        // 3. Confirm Reset
        const resetRes = await app.inject({
            method: 'POST',
            url: '/auth/reset-password/confirm',
            payload: { token, newPassword }
        });
        expect(resetRes.statusCode).toBe(200);

        // 4. Verify Old Password Fails
        const failLogin = await app.inject({
            method: 'POST',
            url: '/auth/login',
            payload: { email, password: oldPassword }
        });
        expect(failLogin.statusCode).toBe(401);

        // 5. Verify New Password Works
        const successLogin = await app.inject({
            method: 'POST',
            url: '/auth/login',
            payload: { email, password: newPassword }
        });
        expect(successLogin.statusCode).toBe(200);
    });

    it('should reject used reset token', async () => {
        // Setup user & used token manually or reuse flow? 
        // Reusing flow logic for simplicity:
        const email = `usedtoken-${Date.now()}@example.com`;
        await app.inject({ method: 'POST', url: '/auth/signup', payload: { email, password: 'Password123' } });
        await app.inject({ method: 'POST', url: '/auth/reset-password/request', payload: { email } });

        const { getPool } = await import('../src/config/database');
        const pool = getPool();
        const res = await pool.query(`SELECT t.token FROM password_reset_tokens t JOIN users u ON u.id = t.user_id WHERE u.email = $1`, [email]);
        const token = res.rows[0].token;

        // Use it once
        await app.inject({
            method: 'POST',
            url: '/auth/reset-password/confirm',
            payload: { token, newPassword: 'AnyPassword123' }
        });

        // Try again
        const response = await app.inject({
            method: 'POST',
            url: '/auth/reset-password/confirm',
            payload: { token, newPassword: 'AnotherPassword123' }
        });

        expect(response.statusCode).toBe(400);
        expect(JSON.parse(response.body).error).toMatch(/used/);
    });
});
