import { getPool } from '../config/database';
import { Pool } from 'pg';
import bcrypt from 'bcrypt';

export interface CreateUserInput {
    email: string;
    name: string;
    passwordHash: string;
}

export interface User {
    id: string;
    email: string;
    name: string;
    app_role: 'admin' | 'user';
    password_hash: string;
    created_at: Date;
}

export const createUser = async (input: CreateUserInput): Promise<User> => {
    const pool = getPool();
    const res = await pool.query(
        'INSERT INTO users (email, name, password_hash) VALUES ($1, $2, $3) RETURNING *',
        [input.email, input.name, input.passwordHash]
    );
    return res.rows[0];
};

export const findByEmail = async (email: string): Promise<User | null> => {
    const pool = getPool();
    const res = await pool.query('SELECT * FROM users WHERE email = $1', [email]);
    return res.rows[0] || null;
};

export const findById = async (id: string): Promise<User | null> => {
    const pool = getPool();
    const res = await pool.query('SELECT * FROM users WHERE id = $1', [id]);
    return res.rows[0] || null;
};

export const storeResetToken = async (userId: string, token: string, expiresAt: Date): Promise<void> => {
    const pool = getPool();
    await pool.query(
        'INSERT INTO password_reset_tokens (user_id, token, expires_at) VALUES ($1, $2, $3)',
        [userId, token, expiresAt]
    );
};

export const findResetToken = async (token: string): Promise<{ userId: string; expiresAt: Date; used: boolean } | null> => {
    const pool = getPool();
    const res = await pool.query(
        'SELECT user_id, expires_at, used FROM password_reset_tokens WHERE token = $1',
        [token]
    );
    if (!res.rows[0]) return null;
    return {
        userId: res.rows[0].user_id,
        expiresAt: res.rows[0].expires_at,
        used: res.rows[0].used
    };
};

export const markTokenUsed = async (token: string): Promise<void> => {
    const pool = getPool();
    await pool.query('UPDATE password_reset_tokens SET used = TRUE WHERE token = $1', [token]);
};

export const updatePassword = async (userId: string, passwordHash: string): Promise<void> => {
    const pool = getPool();
    await pool.query('UPDATE users SET password_hash = $1 WHERE id = $2', [passwordHash, userId]);
};

export const updateName = async (userId: string, name: string): Promise<User> => {
    const pool = getPool();
    const res = await pool.query('UPDATE users SET name = $1 WHERE id = $2 RETURNING *', [name, userId]);
    return res.rows[0];
};
