// Stableford Scoring
//
// Classic points-based scoring used for the La Romana individual leaderboard.
// Each hole yields points based on net score relative to par.

import { calculatePlayingHandicap, SINGLES_FOURBALL_ALLOWANCE } from './handicap';
import { getStrokesForHole } from './strokeAllocation';

export interface HoleStablefordPoints {
    holeNumber: number;
    grossScore: number | null;
    par: number;
    strokes: number;
    netScore: number | null;
    netToPar: number | null;
    points: number;
}

/**
 * Stableford points from a net score and hole par.
 *   Albatross or better (net ≤ par-3): 5 (+1 per stroke under for condor/etc)
 *   Eagle (net = par-2): 4
 *   Birdie (net = par-1): 3
 *   Par (net = par): 2
 *   Bogey (net = par+1): 1
 *   Double bogey or worse: 0
 * Null gross (pickup / no return) yields 0 points.
 */
export const stablefordPointsFromNet = (
    netScore: number | null,
    par: number
): number => {
    if (netScore === null) return 0;
    const netToPar = netScore - par;
    if (netToPar >= 2) return 0;
    if (netToPar === 1) return 1;
    if (netToPar === 0) return 2;
    if (netToPar === -1) return 3;
    if (netToPar === -2) return 4;
    if (netToPar === -3) return 5;
    // netToPar <= -4 (condor or better): 6+ points, extremely rare
    return 2 - netToPar;
};

export interface StablefordRoundInput {
    /** Gross scores for holes 1..18 (index 0 = hole 1). `null` = no return / pickup. */
    grossScores: (number | null)[];
    /** Par per hole (18 entries). */
    pars: number[];
    /** Stroke index per hole (18 entries). */
    strokeIndexes: number[];
    /** Player's handicap index (course handicap before allowance). */
    handicapIndex: number;
    /** Handicap allowance (0.80 for La Romana singles/fourball). */
    allowance?: number;
}

export interface StablefordRoundResult {
    playingHandicap: number;
    holes: HoleStablefordPoints[];
    totalPoints: number;
}

/**
 * Compute Stableford points for a full 18-hole round.
 */
export const calculateStablefordRound = (
    input: StablefordRoundInput
): StablefordRoundResult => {
    const {
        grossScores,
        pars,
        strokeIndexes,
        handicapIndex,
        allowance = SINGLES_FOURBALL_ALLOWANCE,
    } = input;

    if (grossScores.length !== 18 || pars.length !== 18 || strokeIndexes.length !== 18) {
        throw new Error(
            'calculateStablefordRound: grossScores, pars, and strokeIndexes must each have 18 entries'
        );
    }

    const playingHandicap = calculatePlayingHandicap(handicapIndex, allowance);

    const holes: HoleStablefordPoints[] = grossScores.map((gross, i) => {
        const par = pars[i];
        const si = strokeIndexes[i];
        const strokes = getStrokesForHole(playingHandicap, si);
        const netScore = gross === null ? null : gross - strokes;
        const netToPar = netScore === null ? null : netScore - par;
        const points = stablefordPointsFromNet(netScore, par);
        return {
            holeNumber: i + 1,
            grossScore: gross,
            par,
            strokes,
            netScore,
            netToPar,
            points,
        };
    });

    const totalPoints = holes.reduce((sum, h) => sum + h.points, 0);

    return { playingHandicap, holes, totalPoints };
};
