// Spectator Service - Token generation and validation

import { randomBytes } from 'crypto';
import { createSpectatorToken, findByToken, SpectatorToken } from '../repositories/spectatorRepository';

export interface SpectatorLink {
    token: string;
    eventId: string;
    url: string;
    expiresAt: Date | null;
}

/**
 * Generate a secure random token (32 bytes, hex encoded = 64 chars).
 */
export const generateToken = (): string => {
    return randomBytes(32).toString('hex');
};

/**
 * Create a spectator link for an event.
 */
export const createSpectatorLink = async (
    eventId: string,
    createdByUserId: string,
    expiresAt?: Date,
    baseUrl: string = '/spectate'
): Promise<SpectatorLink> => {
    const token = generateToken();

    const spectatorToken = await createSpectatorToken(eventId, token, createdByUserId, expiresAt);

    return {
        token: spectatorToken.token,
        eventId: spectatorToken.eventId,
        url: `${baseUrl}/${spectatorToken.token}`,
        expiresAt: spectatorToken.expiresAt
    };
};

/**
 * Validate a spectator token.
 * Returns the token if valid, null if invalid/expired.
 */
export const validateSpectatorToken = async (token: string): Promise<SpectatorToken | null> => {
    const spectatorToken = await findByToken(token);

    if (!spectatorToken) {
        return null;
    }

    // Check expiration
    if (spectatorToken.expiresAt && new Date() > spectatorToken.expiresAt) {
        return null;
    }

    return spectatorToken;
};
