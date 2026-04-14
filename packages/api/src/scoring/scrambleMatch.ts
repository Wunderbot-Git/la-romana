// Scramble Match Engine - Team Scramble Format

import { calculateScrambleTeamHandicap } from './handicap';
import { getStrokesForHole } from './strokeAllocation';
import { calculateNetScore } from './netScore';
import { compareHoleScores, calculateMatchState, HoleResult, MatchState, Team } from './matchStatus';
import { calculateMatchResult, MatchResult } from './matchResult';

export interface ScrambleTeamInput {
    player1HandicapIndex: number;
    player2HandicapIndex: number;
    teamGrossScores: (number | null)[]; // Combined team score per hole
    strokeIndexes: number[]; // SI to use (could be tee SI or mixed scramble SI)
}

export interface ScrambleMatchInput {
    redTeam: ScrambleTeamInput;
    blueTeam: ScrambleTeamInput;
    totalHoles?: number;
    matchPoints?: number; // Default 2 for scramble
    scrambleAllowance?: number; // Default 0.20
}

export interface ScrambleHoleDetail {
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

export interface ScrambleMatchOutput {
    holes: ScrambleHoleDetail[];
    finalState: MatchState;
    result: MatchResult;
    redTeamHandicap: number;
    blueTeamHandicap: number;
}

/**
 * Calculate a complete scramble match.
 * In scramble, teams share a single ball and take the best shot each time.
 * Team handicap = (HCP_A + HCP_B) × allowance (default 20%)
 * Each team receives strokes independently based on their own team handicap.
 */
export const calculateScrambleMatch = (input: ScrambleMatchInput): ScrambleMatchOutput => {
    const totalHoles = input.totalHoles ?? 9; // Scramble typically back 9
    const matchPoints = input.matchPoints ?? 2; // Scramble worth 2 points
    const allowance = input.scrambleAllowance ?? 0.30;

    // Calculate team handicaps
    const redTH = calculateScrambleTeamHandicap(
        input.redTeam.player1HandicapIndex,
        input.redTeam.player2HandicapIndex,
        allowance
    );
    const blueTH = calculateScrambleTeamHandicap(
        input.blueTeam.player1HandicapIndex,
        input.blueTeam.player2HandicapIndex,
        allowance
    );

    // Full independent handicaps: each team receives strokes based on own TH

    const holes: ScrambleHoleDetail[] = [];
    const holeResults: HoleResult[] = [];

    const numHoles = Math.min(
        input.redTeam.teamGrossScores.length,
        input.blueTeam.teamGrossScores.length,
        totalHoles
    );

    for (let i = 0; i < numHoles; i++) {
        const holeNumber = i + 1;
        const redSI = input.redTeam.strokeIndexes[i];
        const blueSI = input.blueTeam.strokeIndexes[i];

        const redGross = input.redTeam.teamGrossScores[i];
        const blueGross = input.blueTeam.teamGrossScores[i];

        // Stop processing if scores are missing (0 or null)
        if (!redGross || !blueGross) break;

        const redStrokes = getStrokesForHole(redTH, redSI);
        const blueStrokes = getStrokesForHole(blueTH, blueSI);

        const redNet = calculateNetScore(redGross as number, redStrokes);
        const blueNet = calculateNetScore(blueGross as number, blueStrokes);

        const winner = compareHoleScores(redNet, blueNet);

        holeResults.push({ holeNumber, redNet, blueNet, winner });

        const matchState = calculateMatchState(holeResults, totalHoles);

        holes.push({
            holeNumber,
            strokeIndex: redSI, // For display
            redGross: redGross as number,
            redStrokes,
            redNet,
            blueGross: blueGross as number,
            blueStrokes,
            blueNet,
            winner,
            matchState
        });

        if (matchState.isDecided) break;
    }

    const finalState = calculateMatchState(holeResults, totalHoles);
    const result = calculateMatchResult(finalState, matchPoints);

    return {
        holes,
        finalState,
        result,
        redTeamHandicap: redTH,
        blueTeamHandicap: blueTH
    };
};
