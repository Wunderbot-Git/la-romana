
import { getLeaderboard } from '../src/services/leaderboardService';
import { getPool } from '../src/config/database';
import 'dotenv/config';

async function main() {
    const pool = getPool();
    try {
        // Get event ID
        const res = await pool.query('SELECT id FROM events LIMIT 1');
        const eventId = res.rows[0].id;

        console.log('Calculating Leaderboard for Event:', eventId);
        const data = await getLeaderboard(eventId);

        console.log('--- Matches ---');
        data.matches.forEach(m => {
            console.log(`[${m.segmentType}] ${m.flightName} Status: ${m.status}`);
            if (m.segmentType === 'scramble') {
                console.log('   Scramble Match Found!');
                console.log('   Red Scores:', JSON.stringify(m.redPlayers[0].scores));
            }
        });

    } catch (err) {
        console.error(err);
    } finally {
        await pool.end();
    }
}

main();
