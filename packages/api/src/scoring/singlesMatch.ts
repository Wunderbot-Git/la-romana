// Singles Match Engine - Full game calculation

import { calculatePlayingHandicap } from './handicap';
import { getStrokesForHole } from './strokeAllocation';
import { calculateNetScore } from './netScore';
import { compareHoleScores, calculateMatchState, HoleResult, MatchState, Team } from './matchStatus';
import { calculateMatchResult, MatchResult } from './matchResult';

export interface SinglesPlayerInput {
    handicapIndex: number;
    grossScores: (number | null)[]; // Array of gross scores (index 0 = hole 1)
}

export interface SinglesMatchInput {
    redPlayer: SinglesPlayerInput;
    bluePlayer: SinglesPlayerInput;
    strokeIndexes: number[]; // Array of stroke indexes (index 0 = hole 1)
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

    // Calculate playing handicaps (80% allowance)
    const redPH = calculatePlayingHandicap(input.redPlayer.handicapIndex);
    const bluePH = calculatePlayingHandicap(input.bluePlayer.handicapIndex);

    const holes: SinglesHoleDetail[] = [];
    const holeResults: HoleResult[] = [];

    for (let i = 0; i < Math.min(input.redPlayer.grossScores.length, totalHoles); i++) {
        const holeNumber = i + 1;
        const strokeIndex = input.strokeIndexes[i];

        const redGross = input.redPlayer.grossScores[i];
        const blueGross = input.bluePlayer.grossScores[i];

        // If either player has no score (null or 0), stop calculation
        if (!redGross || !blueGross) break;

        // Full Handicap Match Play: Calculate net scores independently
        const redStrokes = getStrokesForHole(redPH, strokeIndex);
        const blueStrokes = getStrokesForHole(bluePH, strokeIndex);

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
