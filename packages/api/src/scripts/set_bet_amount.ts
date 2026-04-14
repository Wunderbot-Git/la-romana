import { getPool } from '../config/database';

async function main() {
    const pool = getPool();

    try {
        await pool.query('UPDATE events SET bet_amount = 10000 WHERE bet_amount = 0 OR bet_amount IS NULL');
        console.log("Updated events with bet_amount = 10000");
    } catch (err) {
        console.error("Error:", err);
    } finally {
        await pool.end();
    }
}

main();
