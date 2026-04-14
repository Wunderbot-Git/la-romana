import * as roundRepo from '../repositories/roundRepository';
import { Round, RoundState, CreateRoundRequest, UpdateRoundRequest } from '@ryder-cup/shared';
import { getPool } from '../config/database';

const validatePct = (value: number | undefined, label: string): void => {
    if (value === undefined) return;
    if (!(value > 0 && value <= 1)) {
        throw new Error(`${label} must be between 0 (exclusive) and 1 (inclusive)`);
    }
};

export const createRound = async (
    eventId: string,
    req: CreateRoundRequest
): Promise<Round> => {
    if (!Number.isInteger(req.roundNumber) || req.roundNumber < 1) {
        throw new Error('roundNumber must be a positive integer');
    }
    if (!req.courseId) {
        throw new Error('courseId is required');
    }
    validatePct(req.hcpSinglesPct, 'hcpSinglesPct');
    validatePct(req.hcpFourballPct, 'hcpFourballPct');

    // Verify the course belongs to the event
    const pool = getPool();
    const courseCheck = await pool.query(
        'SELECT id FROM courses WHERE id = $1 AND event_id = $2',
        [req.courseId, eventId]
    );
    if (courseCheck.rowCount === 0) {
        throw new Error('Course not found for this event');
    }

    return roundRepo.createRound({
        eventId,
        roundNumber: req.roundNumber,
        courseId: req.courseId,
        scheduledAt: req.scheduledAt ?? null,
        hcpSinglesPct: req.hcpSinglesPct,
        hcpFourballPct: req.hcpFourballPct,
    });
};

export const listRounds = async (eventId: string): Promise<Round[]> => {
    return roundRepo.listRoundsForEvent(eventId);
};

export const getRound = async (roundId: string): Promise<Round | null> => {
    return roundRepo.getRoundById(roundId);
};

export const updateRound = async (
    roundId: string,
    req: UpdateRoundRequest
): Promise<Round> => {
    validatePct(req.hcpSinglesPct, 'hcpSinglesPct');
    validatePct(req.hcpFourballPct, 'hcpFourballPct');

    const existing = await roundRepo.getRoundById(roundId);
    if (!existing) throw new Error('Round not found');

    const updated = await roundRepo.updateRound(roundId, req);
    if (!updated) throw new Error('Round not found');
    return updated;
};

export const setRoundState = async (
    roundId: string,
    state: RoundState
): Promise<Round> => {
    return updateRound(roundId, { state });
};

export const deleteRound = async (roundId: string): Promise<void> => {
    const existing = await roundRepo.getRoundById(roundId);
    if (!existing) throw new Error('Round not found');
    await roundRepo.deleteRound(roundId);
};
