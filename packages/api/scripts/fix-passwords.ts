
import { Pool } from 'pg';
import 'dotenv/config';

async function main() {
    const connectionString = 'postgresql://postgres:postgres@localhost:5432/ryder_cup_dev';
    const pool = new Pool({ connectionString });

    // Valid hash for 'password' (generated and verified in previous step)
    const validHash = '$2b$10$245Ip3FTGHuy.ukd0H6EGuZCP4584SuUiQhsZR1yY8ytWVyimwU9.';

    console.log('Updating all users to have valid password hash...');
    const res = await pool.query('UPDATE users SET password_hash = $1', [validHash]);
    console.log(`Updated ${res.rowCount} users.`);

    await pool.end();
}

main().catch(console.error);
