
import { buildApp } from '../src/app';
import { getPool } from '../src/config/database';
import 'dotenv/config';

async function main() {
    const app = buildApp();
    const pool = getPool();

    // Get event ID for RYDER0
    const eventRes = await pool.query("SELECT id FROM events WHERE event_code = 'RYDER0'");
    const eventId = eventRes.rows[0].id;

    // Check response
    const response = await app.inject({
        method: 'GET',
        url: `/events/${eventId}/leaderboard`
    });

    if (response.statusCode !== 200) {
        console.error('Failed to get leaderboard:', response.statusCode, response.body);
        process.exit(1);
    }

    const data = JSON.parse(response.body);

    if (data.matches && data.matches.length > 0) {
        const m = data.matches[0];
        console.log('Match ID:', m.id);

        if (m.parValues && Array.isArray(m.parValues) && m.parValues.length === 18) {
            console.log('✅ parValues present and length 18');
        } else {
            console.error('❌ parValues missing or invalid:', m.parValues);
        }

        if (m.hcpValues && Array.isArray(m.hcpValues) && m.hcpValues.length === 18) {
            console.log('✅ hcpValues present and length 18');
        } else {
            console.error('❌ hcpValues missing or invalid:', m.hcpValues);
        }
    } else {
        console.error('❌ No matches found to verify');
    }

    await pool.end();
}

main().catch(console.error);
