// Net Score Calculation

import { getStrokesForHole } from './strokeAllocation';

export interface HoleNetScore {
    holeNumber: number;
    grossScore: number;
    strokes: number;
    netScore: number;
}

/**
 * Calculate net score for a single hole.
 * Net = Gross - Strokes
 */
export const calculateNetScore = (grossScore: number, strokes: number): number => {
    return grossScore - strokes;
};

/**
 * Calculate net scores for a full round.
 * @param grossScores Array of 18 gross scores (index 0 = hole 1)
 * @param playingHandicap The player's playing handicap
 * @param strokeIndexes Array of 18 stroke indexes (index 0 = hole 1)
 */
export const calculateNetScoresForRound = (
    grossScores: number[],
    playingHandicap: number,
    strokeIndexes: number[]
): HoleNetScore[] => {
    return grossScores.map((gross, i) => {
        const strokes = getStrokesForHole(playingHandicap, strokeIndexes[i]);
        return {
            holeNumber: i + 1,
            grossScore: gross,
            strokes,
            netScore: calculateNetScore(gross, strokes)
        };
    });
};
