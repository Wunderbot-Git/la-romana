import { getPool } from '../config/database';

async function main() {
    const pool = getPool();
    try {
        const res = await pool.query('SELECT id, email, name FROM users');
        console.table(res.rows);
    } catch (err) {
        console.error("Error:", err);
    } finally {
        await pool.end();
    }
}

main();
