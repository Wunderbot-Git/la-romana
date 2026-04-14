import { getPool } from '../config/database';
import bcrypt from 'bcrypt';

async function main() {
    const pool = getPool();
    try {
        const hashedPassword = await bcrypt.hash('password', 10);
        await pool.query('UPDATE users SET password_hash = $1 WHERE email = $2', [hashedPassword, 'admin@ryder2026.com']);
        console.log("Password reset for admin@ryder2026.com to 'password'");
    } catch (err) {
        console.error("Error:", err);
    } finally {
        await pool.end();
    }
}

main();
