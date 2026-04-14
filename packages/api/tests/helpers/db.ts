import { Pool } from 'pg';
import { config } from '../../src/config/env';

// Override config for test environment if needed, but logic is in env.ts
const testPoolConfig = {
    connectionString: config.databaseUrl,
    max: 10,
    idleTimeoutMillis: 1000,
    connectionTimeoutMillis: 2000,
};

let testPool: Pool | null = null;

export const getTestPool = (): Pool => {
    if (!testPool) {
        if (!config.databaseUrl) {
            throw new Error('DATABASE_URL_TEST (mapped to databaseUrl) is not defined');
        }
        testPool = new Pool(testPoolConfig);
    }
    return testPool;
};

export const closeTestPool = async (): Promise<void> => {
    if (testPool) {
        await testPool.end();
        testPool = null;
    }
};

export const truncateTables = async (): Promise<void> => {
    const pool = getTestPool();
    // Use TRUNCATE ... CASCADE to clear all data
    // Querying information_schema to find all tables
    const client = await pool.connect();
    try {
        const res = await client.query(`
            SELECT table_name
            FROM information_schema.tables
            WHERE table_schema = 'public'
            AND table_type = 'BASE TABLE'
            AND table_name != 'migrations'
        `);

        if (res.rows.length === 0) return;

        const tables = res.rows.map(r => `"${r.table_name}"`).join(', ');
        await client.query(`TRUNCATE TABLE ${tables} CASCADE`);
    } finally {
        client.release();
    }
};

// Setup function to ensure migrations are run (idempotent)
export const setupTestDb = async (): Promise<void> => {
    // Migrations are usually run before tests or once globally
    // For now, we assume they are run via npm run migrate or at app start
    // We can explicitly run them here if needed
    const { runMigrations } = await import('../../src/config/database');
    await runMigrations();
};
