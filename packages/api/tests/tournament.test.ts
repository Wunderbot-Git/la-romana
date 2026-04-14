import { describe, it, expect } from 'vitest';
import {
    calculateTournamentPoints,
    calculateWinThreshold,
    calculateTotalPoints,
    calculateMomentum,
    FlightMatchesOutput,
    MatchSummary
} from '../src/scoring';

describe('Tournament Scoring', () => {

    describe('Total Points', () => {
        it('should calculate 2 flights = 10 total points', () => {
            expect(calculateTotalPoints(2)).toBe(10);
        });

        it('should calculate 8 flights = 40 total points', () => {
            expect(calculateTotalPoints(8)).toBe(40);
        });
    });

    describe('Win Threshold', () => {
        it('should calculate 5.5 to win with 10 total', () => {
            expect(calculateWinThreshold(10)).toBe(5.5);
        });

        it('should calculate 20.5 to win with 40 total', () => {
            expect(calculateWinThreshold(40)).toBe(20.5);
        });
    });

    describe('Tournament Points Aggregation', () => {
        const makeFlightResult = (redPts: number, bluePts: number): FlightMatchesOutput => ({
            singles1: null,
            singles2: null,
            fourball: null,
            scramble: null,
            summary: {
                totalRedPoints: redPts,
                totalBluePoints: bluePts,
                matches: []
            }
        });

        it('should aggregate points from multiple flights', () => {
            const flights = [
                makeFlightResult(3, 2),  // Red wins 3
                makeFlightResult(2, 3)   // Blue wins 3
            ];

            const result = calculateTournamentPoints(flights);
            expect(result.redPoints).toBe(5);
            expect(result.bluePoints).toBe(5);
            expect(result.totalPoints).toBe(10);
        });

        it('should detect red winner at 5.5+', () => {
            const flights = [
                makeFlightResult(4, 1),
                makeFlightResult(2, 3)
            ];

            const result = calculateTournamentPoints(flights);
            expect(result.redPoints).toBe(6);
            expect(result.winner).toBe('red');
            expect(result.isDecided).toBe(true);
        });

        it('should detect not decided at 5.0', () => {
            const flights = [
                makeFlightResult(3, 2),
                makeFlightResult(2, 3)
            ];

            const result = calculateTournamentPoints(flights);
            expect(result.redPoints).toBe(5);
            expect(result.winner).toBeNull();
            expect(result.isDecided).toBe(false);
        });
    });
});

describe('Momentum', () => {
    const makeMatch = (winner: 'red' | 'blue' | null): MatchSummary => ({
        matchType: 'singles1',
        winner,
        finalStatus: winner ? '1 UP' : 'A/S',
        redPoints: winner === 'red' ? 1 : winner === null ? 0.5 : 0,
        bluePoints: winner === 'blue' ? 1 : winner === null ? 0.5 : 0,
        holesPlayed: 9,
        isComplete: true
    });

    it('should show strong red momentum on 3/3 wins', () => {
        const result = calculateMomentum({
            recentMatches: [makeMatch('red'), makeMatch('red'), makeMatch('red')]
        });
        expect(result.direction).toBe('red');
        expect(result.strength).toBe('strong');
    });

    it('should show neutral on mixed results', () => {
        const result = calculateMomentum({
            recentMatches: [makeMatch('red'), makeMatch('blue'), makeMatch(null)]
        });
        expect(result.direction).toBe('neutral');
    });

    it('should show moderate blue on 2/3 wins', () => {
        const result = calculateMomentum({
            recentMatches: [makeMatch('blue'), makeMatch('blue'), makeMatch('red')]
        });
        expect(result.direction).toBe('blue');
        expect(result.strength).toBe('moderate');
    });
});
