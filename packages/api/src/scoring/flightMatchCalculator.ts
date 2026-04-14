// Flight Match Calculator — orchestrates the matches within a single flight for one round.
//
// La Romana format: each round has 2 singles matches + 1 fourball match, all played over 18 holes.
// No scramble. Total match points per flight per round = 3 (1 for each singles + 1 for fourball).

import { calculateSinglesMatch, SinglesMatchInput, SinglesMatchOutput } from './singlesMatch';
import { calculateFourballMatch, FourballMatchInput, FourballMatchOutput } from './fourballMatch';
import { Team } from './matchStatus';

export interface FlightPlayerScores {
    handicapIndex: number;
    grossScores: (number | null)[]; // 18 holes, index 0 = hole 1
    strokeIndexes: number[];        // 18 stroke indexes from player's tee
}

export interface FlightMatchesInput {
    redPlayer1: FlightPlayerScores;
    redPlayer2: FlightPlayerScores;
    bluePlayer1: FlightPlayerScores;
    bluePlayer2: FlightPlayerScores;
    /** Handicap allowance (0.80 default per La Romana format). */
    handicapAllowance?: number;
}

export interface MatchSummary {
    matchType: 'singles1' | 'singles2' | 'fourball';
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
    summary: {
        totalRedPoints: number;
        totalBluePoints: number;
        matches: MatchSummary[];
    };
}

const hasAnyScore = (scores: (number | null)[]): boolean =>
    Array.isArray(scores) && scores.some(s => s !== null && s !== undefined && s > 0);

const notStartedStub = (matchType: MatchSummary['matchType']): MatchSummary => ({
    matchType,
    winner: null,
    finalStatus: 'Not Started',
    redPoints: 0,
    bluePoints: 0,
    holesPlayed: 0,
    isComplete: false,
});

/**
 * Calculate all matches for a flight (singles 1, singles 2, fourball) over 18 holes.
 */
export const calculateFlightMatches = (input: FlightMatchesInput): FlightMatchesOutput => {
    const matches: MatchSummary[] = [];
    let totalRedPoints = 0;
    let totalBluePoints = 0;

    // Singles 1: Red P1 vs Blue P1
    let singles1: SinglesMatchOutput | null = null;
    if (hasAnyScore(input.redPlayer1.grossScores) && hasAnyScore(input.bluePlayer1.grossScores)) {
        const singlesInput: SinglesMatchInput = {
            redPlayer: {
                handicapIndex: input.redPlayer1.handicapIndex,
                grossScores: input.redPlayer1.grossScores,
            },
            bluePlayer: {
                handicapIndex: input.bluePlayer1.handicapIndex,
                grossScores: input.bluePlayer1.grossScores,
            },
            strokeIndexes: input.redPlayer1.strokeIndexes,
            totalHoles: 18,
            matchPoints: 1,
        };
        singles1 = calculateSinglesMatch(singlesInput);
        matches.push({
            matchType: 'singles1',
            winner: singles1.result.winner,
            finalStatus: singles1.result.finalStatus,
            redPoints: singles1.result.redPoints,
            bluePoints: singles1.result.bluePoints,
            holesPlayed: singles1.holes.length,
            isComplete: singles1.finalState.holesRemaining === 0 || singles1.finalState.isDecided,
        });
        totalRedPoints += singles1.result.redPoints;
        totalBluePoints += singles1.result.bluePoints;
    } else {
        matches.push(notStartedStub('singles1'));
    }

    // Singles 2: Red P2 vs Blue P2
    let singles2: SinglesMatchOutput | null = null;
    if (hasAnyScore(input.redPlayer2.grossScores) && hasAnyScore(input.bluePlayer2.grossScores)) {
        const singlesInput: SinglesMatchInput = {
            redPlayer: {
                handicapIndex: input.redPlayer2.handicapIndex,
                grossScores: input.redPlayer2.grossScores,
            },
            bluePlayer: {
                handicapIndex: input.bluePlayer2.handicapIndex,
                grossScores: input.bluePlayer2.grossScores,
            },
            strokeIndexes: input.redPlayer2.strokeIndexes,
            totalHoles: 18,
            matchPoints: 1,
        };
        singles2 = calculateSinglesMatch(singlesInput);
        matches.push({
            matchType: 'singles2',
            winner: singles2.result.winner,
            finalStatus: singles2.result.finalStatus,
            redPoints: singles2.result.redPoints,
            bluePoints: singles2.result.bluePoints,
            holesPlayed: singles2.holes.length,
            isComplete: singles2.finalState.holesRemaining === 0 || singles2.finalState.isDecided,
        });
        totalRedPoints += singles2.result.redPoints;
        totalBluePoints += singles2.result.bluePoints;
    } else {
        matches.push(notStartedStub('singles2'));
    }

    // Fourball: Red Team vs Blue Team
    let fourball: FourballMatchOutput | null = null;
    if (
        hasAnyScore(input.redPlayer1.grossScores) &&
        hasAnyScore(input.bluePlayer1.grossScores)
    ) {
        const fourballInput: FourballMatchInput = {
            redTeam: {
                player1: {
                    handicapIndex: input.redPlayer1.handicapIndex,
                    grossScores: input.redPlayer1.grossScores,
                    strokeIndexes: input.redPlayer1.strokeIndexes,
                },
                player2: {
                    handicapIndex: input.redPlayer2.handicapIndex,
                    grossScores: input.redPlayer2.grossScores,
                    strokeIndexes: input.redPlayer2.strokeIndexes,
                },
            },
            blueTeam: {
                player1: {
                    handicapIndex: input.bluePlayer1.handicapIndex,
                    grossScores: input.bluePlayer1.grossScores,
                    strokeIndexes: input.bluePlayer1.strokeIndexes,
                },
                player2: {
                    handicapIndex: input.bluePlayer2.handicapIndex,
                    grossScores: input.bluePlayer2.grossScores,
                    strokeIndexes: input.bluePlayer2.strokeIndexes,
                },
            },
            totalHoles: 18,
            matchPoints: 1,
        };
        fourball = calculateFourballMatch(fourballInput);
        matches.push({
            matchType: 'fourball',
            winner: fourball.result.winner,
            finalStatus: fourball.result.finalStatus,
            redPoints: fourball.result.redPoints,
            bluePoints: fourball.result.bluePoints,
            holesPlayed: fourball.holes.length,
            isComplete: fourball.finalState.holesRemaining === 0 || fourball.finalState.isDecided,
        });
        totalRedPoints += fourball.result.redPoints;
        totalBluePoints += fourball.result.bluePoints;
    } else {
        matches.push(notStartedStub('fourball'));
    }

    return {
        singles1,
        singles2,
        fourball,
        summary: {
            totalRedPoints,
            totalBluePoints,
            matches,
        },
    };
};
