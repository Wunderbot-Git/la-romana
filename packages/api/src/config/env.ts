import dotenv from 'dotenv';
import path from 'path';

// Load .env from root
dotenv.config({ path: path.join(__dirname, '../../../../.env') });

export const config = {
    port: process.env.PORT ? parseInt(process.env.PORT, 10) : 3001,
    nodeEnv: process.env.NODE_ENV || 'development',
    databaseUrl: process.env.NODE_ENV === 'test' ? process.env.DATABASE_URL_TEST : process.env.DATABASE_URL,
};
