const { Client } = require('pg');
require('dotenv').config({ path: 'packages/api/.env' });

async function main() {
    const client = new Client({
        connectionString: process.env.DATABASE_URL
    });
    await client.connect();
    try {
        const res = await client.query('SELECT id, email, name, role FROM users');
        console.table(res.rows);
    } catch (err) {
        console.error(err);
    } finally {
        await client.end();
        process.exit(0);
    }
}
main();
