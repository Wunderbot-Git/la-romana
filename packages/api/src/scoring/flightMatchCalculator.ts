// Flight Match Calculator - Orchestrates all matches for a flight

import { calculateSinglesMatch, SinglesMatchInput, SinglesMatchOutput } from './singlesMatch';
import { calculateFourballMatch, FourballMatchInput, FourballMatchOutput } from './fourballMatch';
import { calculateScrambleMatch, ScrambleMatchInput, ScrambleMatchOutput } from './scrambleMatch';
import { Team } from './matchStatus';

export interface FlightPlayerScores {
    handicapIndex: number;
    frontNineGross: (number | null)[]; // 9 holes
    backNineGross: (number | null)[];  // 9 holes (for scramble)
    strokeIndexes: number[];  // 18 hole SI from player's tee
}

export interface FlightMatchesInput {
    redPlayer1: FlightPlayerScores;
    redPlayer2: FlightPlayerScores;
    bluePlayer1: FlightPlayerScores;
    bluePlayer2: FlightPlayerScores;
    scrambleStrokeIndexes?: number[]; // Optional override for scramble SI
}

export interface MatchSummary {
    matchType: 'singles1' | 'singles2' | 'fourball' | 'scramble';
    winner: Team | null;
    finalStatus: string;
    redPoints: number;
    bluePoints: number;
    holesPlayed: number;
    isComplete: boolean;
}

export interface FlightMatchesOutput {
    singles1: SinglesMatchOutput | null;
    singles2: SinglesMatchOutput | null;
    fourball: FourballMatchOutput | null;
    scramble: ScrambleMatchOutput | null;
    summary: {
        totalRedPoints: number;
        totalBluePoints: number;
        matches: MatchSummary[];
    };
}

/**
 * Get front 9 stroke indexes from 18-hole array
 */
const getFront9SI = (si18: number[]): number[] => si18.slice(0, 9);

/**
 * Get back 9 stroke indexes from 18-hole array
 */
const getBack9SI = (si18: number[]): number[] => si18.slice(9, 18);

/**
 * Check if scores array has enough data
 */
const hasValidScores = (scores: (number | null)[], minHoles: number = 1): boolean => {
    return scores && scores.length >= minHoles && scores.some(s => s !== null && s > 0);
};

/**
 * Calculate all matches for a flight.
 * - Singles 1: Red P1 vs Blue P1 (Front 9)
 * - Singles 2: Red P2 vs Blue P2 (Front 9)
 * - Fourball: Red Team vs Blue Team (Front 9)
 * - Scramble: Red Team vs Blue Team (Back 9)
 */
export const calculateFlightMatches = (input: FlightMatchesInput): FlightMatchesOutput => {
    const matches: MatchSummary[] = [];
    let totalRedPoints = 0;
    let totalBluePoints = 0;

    // Singles 1: Red P1 vs Blue P1
    let singles1: SinglesMatchOutput | null = null;
    if (hasValidScores(input.redPlayer1.frontNineGross) && hasValidScores(input.bluePlayer1.frontNineGross)) {
        const singlesInput: SinglesMatchInput = {
            redPlayer: {
                handicapIndex: input.redPlayer1.handicapIndex,
                grossScores: input.redPlayer1.frontNineGross
            },
            bluePlayer: {
                handicapIndex: input.bluePlayer1.handicapIndex,
                grossScores: input.bluePlayer1.frontNineGross
            },
            strokeIndexes: getFront9SI(input.redPlayer1.strokeIndexes),
            totalHoles: 9,
            matchPoints: 1
        };
        singles1 = calculateSinglesMatch(singlesInput);
        matches.push({
            matchType: 'singles1',
            winner: singles1.result.winner,
            finalStatus: singles1.result.finalStatus,
            redPoints: singles1.result.redPoints,
            bluePoints: singles1.result.bluePoints,
            holesPlayed: singles1.holes.length,
            isComplete: singles1.finalState.holesRemaining === 0 || singles1.finalState.isDecided
        });
        totalRedPoints += singles1.result.redPoints;
        totalBluePoints += singles1.result.bluePoints;
    } else {
        // Return Not Started stub
        matches.push({
            matchType: 'singles1',
            winner: null,
            finalStatus: 'Not Started',
            redPoints: 0,
            bluePoints: 0,
            holesPlayed: 0,
            isComplete: false
        });
    }

    // Singles 2: Red P2 vs Blue P2
    let singles2: SinglesMatchOutput | null = null;
    if (hasValidScores(input.redPlayer2.frontNineGross) && hasValidScores(input.bluePlayer2.frontNineGross)) {
        const singlesInput: SinglesMatchInput = {
            redPlayer: {
                handicapIndex: input.redPlayer2.handicapIndex,
                grossScores: input.redPlayer2.frontNineGross
            },
            bluePlayer: {
                handicapIndex: input.bluePlayer2.handicapIndex,
                grossScores: input.bluePlayer2.frontNineGross
            },
            strokeIndexes: getFront9SI(input.redPlayer2.strokeIndexes),
            totalHoles: 9,
            matchPoints: 1
        };
        singles2 = calculateSinglesMatch(singlesInput);
        matches.push({
            matchType: 'singles2',
            winner: singles2.result.winner,
            finalStatus: singles2.result.finalStatus,
            redPoints: singles2.result.redPoints,
            bluePoints: singles2.result.bluePoints,
            holesPlayed: singles2.holes.length,
            isComplete: singles2.finalState.holesRemaining === 0 || singles2.finalState.isDecided
        });
        totalRedPoints += singles2.result.redPoints;
        totalBluePoints += singles2.result.bluePoints;
    } else {
        // Return Not Started stub
        matches.push({
            matchType: 'singles2',
            winner: null,
            finalStatus: 'Not Started',
            redPoints: 0,
            bluePoints: 0,
            holesPlayed: 0,
            isComplete: false
        });
    }

    // Fourball: Team vs Team (Front 9)
    let fourball: FourballMatchOutput | null = null;
    if (hasValidScores(input.redPlayer1.frontNineGross) && hasValidScores(input.bluePlayer1.frontNineGross)) {
        const fourballInput: FourballMatchInput = {
            redTeam: {
                player1: {
                    handicapIndex: input.redPlayer1.handicapIndex,
                    grossScores: input.redPlayer1.frontNineGross,
                    strokeIndexes: getFront9SI(input.redPlayer1.strokeIndexes)
                },
                player2: {
                    handicapIndex: input.redPlayer2.handicapIndex,
                    grossScores: input.redPlayer2.frontNineGross,
                    strokeIndexes: getFront9SI(input.redPlayer2.strokeIndexes)
                }
            },
            blueTeam: {
                player1: {
                    handicapIndex: input.bluePlayer1.handicapIndex,
                    grossScores: input.bluePlayer1.frontNineGross,
                    strokeIndexes: getFront9SI(input.bluePlayer1.strokeIndexes)
                },
                player2: {
                    handicapIndex: input.bluePlayer2.handicapIndex,
                    grossScores: input.bluePlayer2.frontNineGross,
                    strokeIndexes: getFront9SI(input.bluePlayer2.strokeIndexes)
                }
            },
            totalHoles: 9,
            matchPoints: 1
        };
        fourball = calculateFourballMatch(fourballInput);
        matches.push({
            matchType: 'fourball',
            winner: fourball.result.winner,
            finalStatus: fourball.result.finalStatus,
            redPoints: fourball.result.redPoints,
            bluePoints: fourball.result.bluePoints,
            holesPlayed: fourball.holes.length,
            isComplete: fourball.finalState.holesRemaining === 0 || fourball.finalState.isDecided
        });
        totalRedPoints += fourball.result.redPoints;
        totalBluePoints += fourball.result.bluePoints;
    } else {
        // Return Not Started stub
        matches.push({
            matchType: 'fourball',
            winner: null,
            finalStatus: 'Not Started',
            redPoints: 0,
            bluePoints: 0,
            holesPlayed: 0,
            isComplete: false
        });
    }

    // Scramble: Team vs Team (Back 9)
    let scramble: ScrambleMatchOutput | null = null;
    if (hasValidScores(input.redPlayer1.backNineGross) && hasValidScores(input.bluePlayer1.backNineGross)) {
        const scrambleSI = input.scrambleStrokeIndexes
            ? getBack9SI(input.scrambleStrokeIndexes)
            : getBack9SI(input.redPlayer1.strokeIndexes);
        const scrambleInput: ScrambleMatchInput = {
            redTeam: {
                player1HandicapIndex: input.redPlayer1.handicapIndex,
                player2HandicapIndex: input.redPlayer2.handicapIndex,
                teamGrossScores: input.redPlayer1.backNineGross, // Scramble uses single team score
                strokeIndexes: scrambleSI
            },
            blueTeam: {
                player1HandicapIndex: input.bluePlayer1.handicapIndex,
                player2HandicapIndex: input.bluePlayer2.handicapIndex,
                teamGrossScores: input.bluePlayer1.backNineGross,
                strokeIndexes: scrambleSI
            },
            totalHoles: 9,
            matchPoints: 2
        };
        scramble = calculateScrambleMatch(scrambleInput);
        matches.push({
            matchType: 'scramble',
            winner: scramble.result.winner,
            finalStatus: scramble.result.finalStatus,
            redPoints: scramble.result.redPoints,
            bluePoints: scramble.result.bluePoints,
            holesPlayed: scramble.holes.length,
            isComplete: scramble.finalState.holesRemaining === 0 || scramble.finalState.isDecided
        });
        totalRedPoints += scramble.result.redPoints;
        totalBluePoints += scramble.result.bluePoints;
    } else {
        // Return Not Started stub
        matches.push({
            matchType: 'scramble',
            winner: null,
            finalStatus: 'Not Started',
            redPoints: 0,
            bluePoints: 0,
            holesPlayed: 0,
            isComplete: false
        });
    }

    return {
        singles1,
        singles2,
        fourball,
        scramble,
        summary: {
            totalRedPoints,
            totalBluePoints,
            matches
        }
    };
};
