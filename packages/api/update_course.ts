import { getPool } from './src/config/database';

// Pars for all holes
const pars = [4, 5, 4, 4, 3, 4, 3, 5, 4, 5, 4, 3, 4, 4, 3, 4, 4, 5];

// HCP mapping based on the image: HCP indices 1 to 18 mapped back to the 18 holes
const hcpAzulBlanca = [3, 9, 17, 15, 7, 5, 13, 11, 1, 10, 2, 4, 6, 16, 18, 14, 8, 12];
const hcpRojas = [3, 9, 17, 11, 5, 15, 13, 7, 1, 6, 2, 10, 4, 12, 18, 14, 16, 8];
const hcpMixta = [3, 9, 17, 15, 6, 10, 13, 7, 1, 8, 2, 4, 5, 16, 18, 14, 12, 11];

async function run() {
    const pool = getPool();
    try {
        console.log('--- Updating Course Data for 2026 Event ---');

        // Find the event
        const eventRes = await pool.query(`SELECT id FROM events WHERE name = 'Ryder Cup 2026'`);
        if (eventRes.rows.length === 0) {
            console.error('Event not found.');
            return;
        }
        const eventId = eventRes.rows[0].id;

        // Update Mixed Scramble SI directly
        console.log('Updating mixed-scramble stroke indexes...');
        // Clear first
        await pool.query(`DELETE FROM mixed_scramble_stroke_index WHERE event_id = $1`, [eventId]);
        // Insert
        for (let i = 0; i < 18; i++) {
            await pool.query(`
                INSERT INTO mixed_scramble_stroke_index (event_id, hole_number, stroke_index)
                VALUES ($1, $2, $3)
            `, [eventId, i + 1, hcpMixta[i]]);
        }

        // Find course and tees
        const courseRes = await pool.query(`SELECT id FROM courses WHERE event_id = $1`, [eventId]);
        if (courseRes.rows.length === 0) {
            console.error('Course not found.');
            return;
        }
        const courseId = courseRes.rows[0].id;
        const teesRes = await pool.query(`SELECT id, name FROM tees WHERE course_id = $1`, [courseId]);

        for (const tee of teesRes.rows) {
            console.log(`Updating holes for Tee: ${tee.name}`);
            const isRojo = tee.name === 'Rojas';
            const hcpArray = isRojo ? hcpRojas : hcpAzulBlanca;

            for (let i = 0; i < 18; i++) {
                const holeNumber = i + 1;
                const par = pars[i];
                const hcp = hcpArray[i];

                await pool.query(`
                    UPDATE holes 
                    SET par = $1, stroke_index = $2
                    WHERE tee_id = $3 AND hole_number = $4
                `, [par, hcp, tee.id, holeNumber]);
            }
        }

        console.log('--- Course Update Complete ---');

    } catch (e) {
        console.error(e);
    } finally {
        await pool.end();
    }
}

run();
