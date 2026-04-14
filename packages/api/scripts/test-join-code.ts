
import { buildApp } from '../src/app';
import { getPool } from '../src/config/database';
import 'dotenv/config';

async function main() {
    const app = buildApp();

    // 1. Login as organizer to get a token (or create a new temp user)
    // Actually, let's create a temp user to join
    const pool = getPool();
    const email = `joiner-${Date.now()}@test.com`;
    const res = await pool.query("INSERT INTO users (email, password_hash) VALUES ($1, 'hash') RETURNING id", [email]);
    const userId = res.rows[0].id;

    const token = app.jwt.sign({ userId, email });

    // 2. Try to join by code
    const response = await app.inject({
        method: 'POST',
        url: '/events/join',
        headers: {
            Authorization: `Bearer ${token}`
        },
        payload: {
            eventCode: 'RYDER0'
        }
    });

    console.log('Status Code:', response.statusCode);
    console.log('Response:', response.body);

    await pool.end();
}

main().catch(console.error);
