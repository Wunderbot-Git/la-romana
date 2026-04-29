// Singles Match Engine — La Romana 2026 ruleset
//
// HANDICAP RULE: Full Course Handicap match play (modern WHS standard).
//   Each player receives strokes per their OWN Playing Handicap on the holes
//   whose Stroke Index ≤ their PH. Strokes are independent — both players can
//   receive a stroke on the same hole if both their PHs cover its SI.
//
//   Net scores are computed independently per player; the lower net wins the hole.
//
// NOT used: the older "100% of differential" rule (only the higher-HCP player
//   gets strokes equal to the difference). If your tournament wants that rule,
//   change `getStrokesForHole(redPH, ...)` / `getStrokesForHole(bluePH, ...)`
//   below to use a single differential PH (max(red,blue) - min(red,blue))
//   applied only to the higher-HCP side.

import { calculatePlayingHandicap } from './handicap';
import { getStrokesForHole } from './strokeAllocation';
import { calculateNetScore } from './netScore';
import { compareHoleScores, calculateMatchState, HoleResult, MatchState, Team } from './matchStatus';
import { calculateMatchResult, MatchResult } from './matchResult';

export interface SinglesPlayerInput {
    handicapIndex: number;
    grossScores: (number | null)[]; // Array of gross scores (index 0 = hole 1)
    /**
     * Stroke index per hole (18 entries) FROM THIS PLAYER'S TEE. When provided,
     * each player's strokes are allocated against their own SI list — important
     * for matches where red and blue play from different tees with different SI
     * orderings. Falls back to the match-level `strokeIndexes` if omitted.
     */
    strokeIndexes?: number[];
    /**
     * Optional pre-computed Playing Handicap. If provided, it is used directly
     * and `handicapIndex` is ignored for stroke allocation. Pass this when the
     * caller has access to course slope/rating + round allowance and computed
     * PH via `computePlayingHandicapFromIndex(...)`.
     *
     * If omitted, the engine falls back to the legacy `index × 80%` formula.
     */
    playingHandicap?: number;
}

export interface SinglesMatchInput {
    redPlayer: SinglesPlayerInput;
    bluePlayer: SinglesPlayerInput;
    /**
     * Fallback stroke index list when neither player provides per-tee SIs.
     * Kept for backward compatibility; callers with mixed tees should set
     * `strokeIndexes` on each `SinglesPlayerInput` instead.
     */
    strokeIndexes: number[];
    totalHoles?: number; // Default 18, can be 9 for front/back
    matchPoints?: number; // Points available for this match (default 1)
}

export interface SinglesHoleDetail {
    holeNumber: number;
    strokeIndex: number;
    redGross: number;
    redStrokes: number;
    redNet: number;
    blueGross: number;
    blueStrokes: number;
    blueNet: number;
    winner: Team | null;
    matchState: MatchState;
}

export interface SinglesMatchOutput {
    holes: SinglesHoleDetail[];
    finalState: MatchState;
    result: MatchResult;
    redPlayingHandicap: number;
    bluePlayingHandicap: number;
}

/**
 * Calculate a complete singles match.
 * Uses full independent playing handicaps (each player gets strokes based on own PH).
 */
export const calculateSinglesMatch = (input: SinglesMatchInput): SinglesMatchOutput => {
    const totalHoles = input.totalHoles ?? 18;
    const matchPoints = input.matchPoints ?? 1;

    // Use caller-supplied Playing Handicap when available (course-aware path),
    // else fall back to the legacy `index × 80%` formula.
    const redPH = input.redPlayer.playingHandicap ?? calculatePlayingHandicap(input.redPlayer.handicapIndex);
    const bluePH = input.bluePlayer.playingHandicap ?? calculatePlayingHandicap(input.bluePlayer.handicapIndex);

    const holes: SinglesHoleDetail[] = [];
    const holeResults: HoleResult[] = [];

    // Per-player SI list (falls back to the match-level fallback list).
    const redSI = input.redPlayer.strokeIndexes ?? input.strokeIndexes;
    const blueSI = input.bluePlayer.strokeIndexes ?? input.strokeIndexes;

    for (let i = 0; i < Math.min(input.redPlayer.grossScores.length, totalHoles); i++) {
        const holeNumber = i + 1;
        const redStrokeIndex = redSI[i];
        const blueStrokeIndex = blueSI[i];
        // For display: use red's SI as the canonical hole-row label.
        // (Both players' strokes are still computed against their own SI list below.)
        const strokeIndex = redStrokeIndex;

        const redGross = input.redPlayer.grossScores[i];
        const blueGross = input.bluePlayer.grossScores[i];

        // Hole not yet played (null/0 = no score row in DB).
        // Skip — does NOT terminate the match calc, so shotgun-start orders
        // (e.g. tee off on hole 10) are scored correctly once enough holes finish.
        if (!redGross || !blueGross) continue;

        // Full Handicap Match Play: each player's strokes resolved against their OWN SI
        const redStrokes = getStrokesForHole(redPH, redStrokeIndex);
        const blueStrokes = getStrokesForHole(bluePH, blueStrokeIndex);

        const redNet = calculateNetScore(redGross as number, redStrokes);
        const blueNet = calculateNetScore(blueGross as number, blueStrokes);

        const winner = compareHoleScores(redNet, blueNet);

        holeResults.push({ holeNumber, redNet, blueNet, winner });

        const matchState = calculateMatchState(holeResults, totalHoles);

        holes.push({
            holeNumber,
            strokeIndex,
            redGross: redGross as number,
            redStrokes,
            redNet,
            blueGross: blueGross as number,
            blueStrokes,
            blueNet,
            winner,
            matchState
        });

        // Stop if match is decided
        if (matchState.isDecided) break;
    }

    const finalState = calculateMatchState(holeResults, totalHoles);
    const result = calculateMatchResult(finalState, matchPoints);

    return {
        holes,
        finalState,
        result,
        redPlayingHandicap: redPH,
        bluePlayingHandicap: bluePH
    };
};
