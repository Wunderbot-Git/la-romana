
import { getPool } from '../src/config/database';
import 'dotenv/config';

async function main() {
    const pool = getPool();
    const res = await pool.query("SELECT id FROM events WHERE event_code = 'RYDER0'");
    console.log(res.rows[0].id);
    await pool.end();
}
main().catch(console.error);
