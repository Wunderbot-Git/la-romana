import { Pool } from 'pg';
import { migrate } from 'postgres-migrations';
import path from 'path';
import { config as envConfig } from './env';

const poolConfig = {
    connectionString: envConfig.databaseUrl,
    max: 20,
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 2000,
};

let pool: Pool | null = null;

export const getPool = (): Pool => {
    if (!pool) {
        if (!envConfig.databaseUrl) {
            throw new Error('DATABASE_URL environment variable is not defined');
        }
        pool = new Pool(poolConfig);
    }
    return pool;
};

export const closePool = async (): Promise<void> => {
    if (pool) {
        await pool.end();
        pool = null;
    }
};

export const runMigrations = async (): Promise<void> => {
    const dbPool = getPool();
    // postgres-migrations expects a client or config, we can pass the pool which behaves like a client factory
    // actually looking at docs, createDb is for creating DB. migrate takes client config or pg.Client.
    // safer to get a client from pool
    const client = await dbPool.connect();
    try {
        const isCompiled = __dirname.includes('dist');
        const migrationsDirectory = isCompiled
            ? path.join(__dirname, '../../../migrations')
            : path.join(__dirname, '../../migrations');
        await migrate({ client }, migrationsDirectory);
        console.log('Migrations completed successfully');
    } finally {
        client.release();
    }
};
