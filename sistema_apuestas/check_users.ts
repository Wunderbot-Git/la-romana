import { getPool } from './packages/api/src/config/database';

async function main() {
    const pool = getPool();
    try {
        const res = await pool.query('SELECT id, email, name, role FROM users');
        console.table(res.rows);
    } catch (err) {
        console.error(err);
    } finally {
        await pool.end();
        process.exit(0);
    }
}
main();
