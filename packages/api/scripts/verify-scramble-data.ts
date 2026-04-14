
import { getPool } from '../src/config/database';
import 'dotenv/config';

async function main() {
    const pool = getPool();
    try {
        console.log('Verifying Scramble Data...');
        const res = await pool.query(`
            SELECT hole_number, count(*) as count, min(gross_score) as min_score, max(gross_score) as max_score
            FROM hole_scores
            WHERE hole_number >= 10
            GROUP BY hole_number
            ORDER BY hole_number
        `);
        console.table(res.rows);

        if (res.rows.length === 0) {
            console.log('NO Back 9 scores found!');
        } else {
            console.log('Back 9 scores found.');
        }

    } catch (err) {
        console.error(err);
    } finally {
        await pool.end();
    }
}

main();
