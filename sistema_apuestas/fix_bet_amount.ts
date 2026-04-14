import { getPool } from './packages/api/src/config/database';

async function main() {
    const pool = getPool();
    await pool.query('UPDATE events SET bet_amount = 10000 WHERE bet_amount = 0 OR bet_amount IS NULL');
    console.log("Updated events with bet_amount = 10000");
    process.exit(0);
}
main();
