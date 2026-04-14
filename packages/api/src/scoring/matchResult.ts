// Match Result Calculations

import { MatchState, Team } from './matchStatus';

export interface MatchResult {
    winner: Team | null; // null = tie (halved match)
    redPoints: number;
    bluePoints: number;
    finalStatus: string;
}

/**
 * Calculate final match result including points allocation.
 * @param state The final match state
 * @param matchPoints Points available for this match (1 for singles, 2 for fourball, etc.)
 */
export const calculateMatchResult = (state: MatchState, matchPoints: number = 1): MatchResult => {
    // Only assign a winner if the match is actually over
    const isFinished = state.isDecided || state.holesRemaining === 0;

    if (state.leader === null || state.lead === 0) {
        // Halved match - only split points if the match is actually finished
        return {
            winner: null,
            redPoints: isFinished ? matchPoints / 2 : 0,
            bluePoints: isFinished ? matchPoints / 2 : 0,
            finalStatus: 'A/S'
        };
    }

    const winner = isFinished ? state.leader : null;

    return {
        winner,
        redPoints: winner === 'red' ? matchPoints : (winner === null && isFinished ? matchPoints / 2 : 0),
        bluePoints: winner === 'blue' ? matchPoints : (winner === null && isFinished ? matchPoints / 2 : 0),
        finalStatus: formatFinalResult(state)
    };
};

/**
 * Format the final result for display.
 * Examples: "3&2", "1 UP", "A/S"
 */
export const formatFinalResult = (state: MatchState): string => {
    if (state.lead === 0) return 'A/S';

    if (state.holesRemaining === 0) {
        return `${state.lead} UP`;
    }

    // Match decided early
    if (state.lead > state.holesRemaining) {
        return `${state.lead}&${state.holesRemaining}`;
    }

    return `${state.lead} UP`;
};
