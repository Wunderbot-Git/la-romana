
import { Pool } from 'pg';
import 'dotenv/config';
import bcrypt from 'bcrypt';

async function main() {
    const connectionString = 'postgresql://postgres:postgres@localhost:5432/ryder_cup_dev';
    const pool = new Pool({ connectionString });
    const email = 'organizer@ryder.test';
    const password = 'password';

    console.log(`Checking user: ${email}`);
    const res = await pool.query('SELECT * FROM users WHERE email = $1', [email]);
    const user = res.rows[0];

    if (!user) {
        console.log('User not found in DB');
    } else {
        console.log('User found in DB');
        console.log('Stored Hash:', user.password_hash);
        console.log('Stored Hash Length:', user.password_hash.length);

        try {
            // Test if bcrypt works at all locally
            console.log('Hashing "password" locally...');
            const testHash = await bcrypt.hash(password, 10);
            console.log('Test Hash:', testHash);
            console.log('Test Hash Length:', testHash.length);

            const selfMatch = await bcrypt.compare(password, testHash);
            console.log('Self Match:', selfMatch);

            const match = await bcrypt.compare(password, user.password_hash);
            console.log('Stored Match:', match);

            // If match fails, let's fix it right here
            if (!match) {
                console.log('Fixing password hash in DB...');
                await pool.query('UPDATE users SET password_hash = $1 WHERE email = $2', [testHash, email]);
                console.log('Password updated. Verifying again...');
                const res2 = await pool.query('SELECT * FROM users WHERE email = $1', [email]);
                const match2 = await bcrypt.compare(password, res2.rows[0].password_hash);
                console.log('Re-verification:', match2);
            }

        } catch (e) {
            console.error('Bcrypt error:', e);
        }
    }

    await pool.end();
}

main().catch(console.error);
