// Point Allocation and Tournament Totals

import { Team } from './matchStatus';
import { FlightMatchesOutput, MatchSummary } from './flightMatchCalculator';

export interface PointRules {
    singlesPoints: number;
    fourballPoints: number;
    scramblePoints: number;
}

export const DEFAULT_POINT_RULES: PointRules = {
    singlesPoints: 1,
    fourballPoints: 1,
    scramblePoints: 2
};

export interface TournamentPoints {
    redPoints: number;
    bluePoints: number;
    totalPoints: number;
    pointsToWin: number;
    winner: Team | null;
    isDecided: boolean;
    redNeedsToWin: number;
    blueNeedsToWin: number;
}

/**
 * Calculate points needed to win.
 * Winner needs more than half (e.g., 5.5 out of 10).
 */
export const calculateWinThreshold = (totalPoints: number): number => {
    return (totalPoints / 2) + 0.5;
};

/**
 * Calculate total available points for a tournament.
 * Each flight has: 2 singles (1pt each) + 1 fourball (1pt) + 1 scramble (2pt) = 5 points
 */
export const calculateTotalPoints = (numFlights: number, rules: PointRules = DEFAULT_POINT_RULES): number => {
    const pointsPerFlight = (rules.singlesPoints * 2) + rules.fourballPoints + rules.scramblePoints;
    return numFlights * pointsPerFlight;
};

/**
 * Aggregate tournament points from multiple flight results.
 */
export const calculateTournamentPoints = (
    flightResults: FlightMatchesOutput[],
    rules: PointRules = DEFAULT_POINT_RULES
): TournamentPoints => {
    let redPoints = 0;
    let bluePoints = 0;

    for (const flight of flightResults) {
        redPoints += flight.summary.totalRedPoints;
        bluePoints += flight.summary.totalBluePoints;
    }

    const totalPoints = calculateTotalPoints(flightResults.length, rules);
    const pointsToWin = calculateWinThreshold(totalPoints);

    let winner: Team | null = null;
    let isDecided = false;

    if (redPoints >= pointsToWin) {
        winner = 'red';
        isDecided = true;
    } else if (bluePoints >= pointsToWin) {
        winner = 'blue';
        isDecided = true;
    }

    return {
        redPoints,
        bluePoints,
        totalPoints,
        pointsToWin,
        winner,
        isDecided,
        redNeedsToWin: Math.max(0, pointsToWin - redPoints),
        blueNeedsToWin: Math.max(0, pointsToWin - bluePoints)
    };
};
