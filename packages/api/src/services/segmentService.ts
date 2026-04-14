// Segment Service - Manage front/back 9 segment state

import { getPool } from '../config/database';
import { createAuditLog } from '../repositories/auditRepository';
import { getFlightHoleScores } from '../repositories/holeScoreRepository';
import { getFlightScrambleScores } from '../repositories/scrambleScoreRepository';
import { invalidateLeaderboardCache } from './leaderboardService';

export type SegmentType = 'front' | 'back';
export type SegmentState = 'open' | 'completed' | 'reopened';

export interface SegmentInfo {
    flightId: string;
    segment: SegmentType;
    state: SegmentState;
    missingScores: { playerId?: string; holeNumber: number; team?: string }[];
    canComplete: boolean;
    canReopen: boolean;
}

/**
 * Get segment status for a flight.
 */
export const getSegmentStatus = async (flightId: string, segment: SegmentType): Promise<SegmentInfo> => {
    const pool = getPool();

    // Get flight info
    const flightRes = await pool.query(
        `SELECT id, event_id, front_state, back_state FROM flights WHERE id = $1`,
        [flightId]
    );
    if (flightRes.rows.length === 0) {
        throw new Error('Flight not found');
    }

    const flight = flightRes.rows[0];
    const currentState: SegmentState = segment === 'front' ? flight.front_state : flight.back_state;

    // Get players in flight
    const playersRes = await pool.query(
        `SELECT id, team FROM players WHERE flight_id = $1`,
        [flightId]
    );
    const players = playersRes.rows;

    // Check for missing scores
    const missingScores: SegmentInfo['missingScores'] = [];

    if (segment === 'front') {
        // Front 9: need hole scores 1-9 for all players
        const holeScores = await getFlightHoleScores(flightId);

        for (const player of players) {
            for (let hole = 1; hole <= 9; hole++) {
                const hasScore = holeScores.some(
                    s => s.playerId === player.id && s.holeNumber === hole
                );
                if (!hasScore) {
                    missingScores.push({ playerId: player.id, holeNumber: hole });
                }
            }
        }
    } else {
        // Back 9: need scramble scores 10-18 for both teams
        const scrambleScores = await getFlightScrambleScores(flightId);

        for (const team of ['red', 'blue'] as const) {
            for (let hole = 10; hole <= 18; hole++) {
                const hasScore = scrambleScores.some(
                    s => s.team === team && s.holeNumber === hole
                );
                if (!hasScore) {
                    missingScores.push({ team, holeNumber: hole });
                }
            }
        }
    }

    return {
        flightId,
        segment,
        state: currentState,
        missingScores,
        canComplete: currentState !== 'completed' && missingScores.length === 0,
        canReopen: currentState === 'completed'
    };
};

/**
 * Complete a segment (mark as done).
 */
export const completeSegment = async (
    flightId: string,
    segment: SegmentType,
    userId: string
): Promise<SegmentInfo> => {
    const pool = getPool();

    // Check current status
    const status = await getSegmentStatus(flightId, segment);

    if (status.state === 'completed') {
        throw new Error('Segment is already completed');
    }

    if (status.missingScores.length > 0) {
        throw new Error(`Cannot complete segment with ${status.missingScores.length} missing scores`);
    }

    // Get event_id for audit
    const flightRes = await pool.query('SELECT event_id FROM flights WHERE id = $1', [flightId]);
    const eventId = flightRes.rows[0].event_id;

    // Update segment state
    const column = segment === 'front' ? 'front_state' : 'back_state';
    await pool.query(
        `UPDATE flights SET ${column} = 'completed' WHERE id = $1`,
        [flightId]
    );

    // Create audit log
    await createAuditLog({
        eventId,
        entityType: 'segment',
        entityId: flightId,
        action: 'complete',
        previousValue: { segment, state: status.state },
        newValue: { segment, state: 'completed' },
        source: 'online',
        byUserId: userId
    });

    // Invalidate leaderboard cache
    invalidateLeaderboardCache(eventId);

    return getSegmentStatus(flightId, segment);
};

/**
 * Reopen a segment (allow editing).
 */
export const reopenSegment = async (
    flightId: string,
    segment: SegmentType,
    userId: string
): Promise<SegmentInfo> => {
    const pool = getPool();

    // Check current status
    const status = await getSegmentStatus(flightId, segment);

    if (status.state !== 'completed') {
        throw new Error('Cannot reopen segment that is not completed');
    }

    // Get event_id for audit
    const flightRes = await pool.query('SELECT event_id FROM flights WHERE id = $1', [flightId]);
    const eventId = flightRes.rows[0].event_id;

    // Update segment state
    const column = segment === 'front' ? 'front_state' : 'back_state';
    await pool.query(
        `UPDATE flights SET ${column} = 'reopened' WHERE id = $1`,
        [flightId]
    );

    // Create audit log
    await createAuditLog({
        eventId,
        entityType: 'segment',
        entityId: flightId,
        action: 'reopen',
        previousValue: { segment, state: 'completed' },
        newValue: { segment, state: 'reopened' },
        source: 'online',
        byUserId: userId
    });

    // Invalidate leaderboard cache
    invalidateLeaderboardCache(eventId);

    return getSegmentStatus(flightId, segment);
};

/**
 * Check if editing a score requires segment reopen.
 */
export const checkRequiresReopen = async (
    flightId: string,
    holeNumber: number
): Promise<{ requiresReopen: boolean; segment: SegmentType | null }> => {
    const segment: SegmentType = holeNumber <= 9 ? 'front' : 'back';
    const status = await getSegmentStatus(flightId, segment);

    if (status.state === 'completed') {
        return { requiresReopen: true, segment };
    }

    return { requiresReopen: false, segment: null };
};
