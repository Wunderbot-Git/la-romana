// Fourball Match Engine — La Romana 2026 ruleset
//
// HANDICAP RULE: Full Course Handicap fourball (modern WHS standard).
//   Each of the 4 players receives strokes per their OWN Playing Handicap on the
//   holes whose Stroke Index ≤ their PH. Each player computes their own net
//   score; the team takes the LOWER (best ball). Lower team-best-net wins the hole.
//
// NOT used: the older "differential from lowest of 4 PHs" rule.

import { calculatePlayingHandicap } from './handicap';
import { getStrokesForHole } from './strokeAllocation';
import { calculateNetScore } from './netScore';
import { compareHoleScores, calculateMatchState, HoleResult, MatchState, Team } from './matchStatus';
import { calculateMatchResult, MatchResult } from './matchResult';

export interface FourballPlayerInput {
    handicapIndex: number;
    grossScores: (number | null)[]; // null = picked up / no score
    strokeIndexes: number[]; // Player's own SI (for mixed tees)
    /** Optional pre-computed Playing Handicap. See SinglesPlayerInput. */
    playingHandicap?: number;
}

export interface FourballTeamInput {
    player1: FourballPlayerInput;
    player2: FourballPlayerInput;
}

export interface FourballMatchInput {
    redTeam: FourballTeamInput;
    blueTeam: FourballTeamInput;
    totalHoles?: number;
    matchPoints?: number;
}

export interface FourballHoleDetail {
    holeNumber: number;
    red: {
        p1Gross: number | null;
        p1Strokes: number;
        p1Net: number | null;
        p2Gross: number | null;
        p2Strokes: number;
        p2Net: number | null;
        bestNet: number | null;
    };
    blue: {
        p1Gross: number | null;
        p1Strokes: number;
        p1Net: number | null;
        p2Gross: number | null;
        p2Strokes: number;
        p2Net: number | null;
        bestNet: number | null;
    };
    winner: Team | null;
    matchState: MatchState;
}

export interface FourballMatchOutput {
    holes: FourballHoleDetail[];
    finalState: MatchState;
    result: MatchResult;
    redTeamHandicaps: { p1: number; p2: number };
    blueTeamHandicaps: { p1: number; p2: number };
}

/**
 * Get the best (lowest) net score from team, null if both picked up.
 */
const getBestNet = (net1: number | null, net2: number | null): number | null => {
    if (net1 === null && net2 === null) return null;
    if (net1 === null) return net2;
    if (net2 === null) return net1;
    return Math.min(net1, net2);
};

/**
 * Calculate a complete fourball match.
 * In fourball, each player plays their own ball, team takes best net on each hole.
 * Each player receives strokes independently based on their own playing handicap.
 */
export const calculateFourballMatch = (input: FourballMatchInput): FourballMatchOutput => {
    const totalHoles = input.totalHoles ?? 18;
    const matchPoints = input.matchPoints ?? 1;

    // Use caller-supplied Playing Handicap when available (course-aware path),
    // else fall back to the legacy `index × 80%` formula.
    const redP1PH  = input.redTeam.player1.playingHandicap  ?? calculatePlayingHandicap(input.redTeam.player1.handicapIndex);
    const redP2PH  = input.redTeam.player2.playingHandicap  ?? calculatePlayingHandicap(input.redTeam.player2.handicapIndex);
    const blueP1PH = input.blueTeam.player1.playingHandicap ?? calculatePlayingHandicap(input.blueTeam.player1.handicapIndex);
    const blueP2PH = input.blueTeam.player2.playingHandicap ?? calculatePlayingHandicap(input.blueTeam.player2.handicapIndex);

    // Full Handicap: No differential calc (lowestPH removed)

    const holes: FourballHoleDetail[] = [];
    const holeResults: HoleResult[] = [];

    const numHoles = Math.min(
        input.redTeam.player1.grossScores.length,
        input.redTeam.player2.grossScores.length,
        input.blueTeam.player1.grossScores.length,
        input.blueTeam.player2.grossScores.length,
        totalHoles
    );

    for (let i = 0; i < numHoles; i++) {
        const holeNumber = i + 1;

        // Red Team
        const redP1Gross = input.redTeam.player1.grossScores[i];
        const redP2Gross = input.redTeam.player2.grossScores[i];
        const redP1SI = input.redTeam.player1.strokeIndexes[i];
        const redP2SI = input.redTeam.player2.strokeIndexes[i];
        const redP1Strokes = getStrokesForHole(redP1PH, redP1SI);
        const redP2Strokes = getStrokesForHole(redP2PH, redP2SI);
        const redP1Net = redP1Gross !== null ? calculateNetScore(redP1Gross as number, redP1Strokes) : null;
        const redP2Net = redP2Gross !== null ? calculateNetScore(redP2Gross as number, redP2Strokes) : null;
        const redBestNet = getBestNet(redP1Net, redP2Net);

        // Blue Team
        const blueP1Gross = input.blueTeam.player1.grossScores[i];
        const blueP2Gross = input.blueTeam.player2.grossScores[i];
        const blueP1SI = input.blueTeam.player1.strokeIndexes[i];
        const blueP2SI = input.blueTeam.player2.strokeIndexes[i];
        const blueP1Strokes = getStrokesForHole(blueP1PH, blueP1SI);
        const blueP2Strokes = getStrokesForHole(blueP2PH, blueP2SI);
        const blueP1Net = blueP1Gross !== null ? calculateNetScore(blueP1Gross as number, blueP1Strokes) : null;
        const blueP2Net = blueP2Gross !== null ? calculateNetScore(blueP2Gross as number, blueP2Strokes) : null;
        const blueBestNet = getBestNet(blueP1Net, blueP2Net);

        // Determine hole winner
        let winner: Team | null = null;
        if (redBestNet !== null && blueBestNet !== null) {
            winner = compareHoleScores(redBestNet, blueBestNet);
        } else if (redBestNet !== null) {
            winner = 'red'; // Blue team picked up
        } else if (blueBestNet !== null) {
            winner = 'blue'; // Red team picked up
        } else {
            // Both picked up (or unplayed)
            // If ALL 4 players are null, the hole hasn't been played yet — skip
            // (not break) so shotgun-start orders (tee off on hole 10) score
            // correctly once enough holes finish.
            const allUnplayed =
                redP1Gross === null && redP2Gross === null &&
                blueP1Gross === null && blueP2Gross === null;

            if (allUnplayed) continue;

            // Otherwise, it's a halved hole (everyone picked up)
            winner = null;
        }

        holeResults.push({ holeNumber, redNet: redBestNet ?? 99, blueNet: blueBestNet ?? 99, winner });

        const matchState = calculateMatchState(holeResults, totalHoles);

        holes.push({
            holeNumber,
            red: {
                p1Gross: redP1Gross,
                p1Strokes: redP1Strokes,
                p1Net: redP1Net,
                p2Gross: redP2Gross,
                p2Strokes: redP2Strokes,
                p2Net: redP2Net,
                bestNet: redBestNet
            },
            blue: {
                p1Gross: blueP1Gross,
                p1Strokes: blueP1Strokes,
                p1Net: blueP1Net,
                p2Gross: blueP2Gross,
                p2Strokes: blueP2Strokes,
                p2Net: blueP2Net,
                bestNet: blueBestNet
            },
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
        redTeamHandicaps: { p1: redP1PH, p2: redP2PH },
        blueTeamHandicaps: { p1: blueP1PH, p2: blueP2PH }
    };
};
