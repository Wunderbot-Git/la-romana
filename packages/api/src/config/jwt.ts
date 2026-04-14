import { config as envConfig } from './env';

export interface TokenPayload {
    userId: string;
    email: string;
    role?: string;
    iat?: number;
    exp?: number;
}

export const jwtConfig = {
    secret: process.env.JWT_SECRET || 'development-secret-change-in-prod',
    sign: {
        expiresIn: '7d'
    }
};
