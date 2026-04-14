import { describe, it, expect } from 'vitest';
import {
    compareHoleScores,
    calculateMatchState,
    isMatchDecided,
    formatMatchStatus,
    calculateMatchResult,
    HoleResult
} from '../src/scoring';

describe('Match-Play Scoring', () => {

    describe('compareHoleScores', () => {
        it('should return red if red has lower net', () => {
            expect(compareHoleScores(3, 4)).toBe('red');
        });

        it('should return blue if blue has lower net', () => {
            expect(compareHoleScores(5, 4)).toBe('blue');
        });

        it('should return null if halved', () => {
            expect(compareHoleScores(4, 4)).toBeNull();
        });
    });

    describe('Match State', () => {
        it('should return A/S with lead 0 for all halves', () => {
            const holes: HoleResult[] = [
                { holeNumber: 1, redNet: 4, blueNet: 4, winner: null },
                { holeNumber: 2, redNet: 3, blueNet: 3, winner: null },
                { holeNumber: 3, redNet: 5, blueNet: 5, winner: null }
            ];
            const state = calculateMatchState(holes, 18);
            expect(state.leader).toBeNull();
            expect(state.lead).toBe(0);
            expect(formatMatchStatus(state)).toBe('A/S');
        });

        it('should show Red 3 UP if red wins first 3', () => {
            const holes: HoleResult[] = [
                { holeNumber: 1, redNet: 3, blueNet: 4, winner: 'red' },
                { holeNumber: 2, redNet: 3, blueNet: 4, winner: 'red' },
                { holeNumber: 3, redNet: 3, blueNet: 4, winner: 'red' }
            ];
            const state = calculateMatchState(holes, 18);
            expect(state.leader).toBe('red');
            expect(state.lead).toBe(3);
            expect(formatMatchStatus(state)).toBe('3 UP');
        });

        it('should show Blue 3 UP if blue wins 5, red wins 2', () => {
            const holes: HoleResult[] = [
                { holeNumber: 1, redNet: 4, blueNet: 3, winner: 'blue' },
                { holeNumber: 2, redNet: 4, blueNet: 3, winner: 'blue' },
                { holeNumber: 3, redNet: 3, blueNet: 4, winner: 'red' },
                { holeNumber: 4, redNet: 4, blueNet: 3, winner: 'blue' },
                { holeNumber: 5, redNet: 4, blueNet: 3, winner: 'blue' },
                { holeNumber: 6, redNet: 3, blueNet: 4, winner: 'red' },
                { holeNumber: 7, redNet: 4, blueNet: 3, winner: 'blue' }
            ];
            const state = calculateMatchState(holes, 18);
            expect(state.leader).toBe('blue');
            expect(state.lead).toBe(3);
        });
    });

    describe('Early Clinch', () => {
        it('should be decided with 4 up, 3 to play', () => {
            // 15 holes played, 4-0 lead
            const holes: HoleResult[] = Array.from({ length: 15 }, (_, i) => ({
                holeNumber: i + 1,
                redNet: i < 4 ? 3 : 4,
                blueNet: i < 4 ? 4 : 4,
                winner: i < 4 ? 'red' as const : null
            }));
            const state = calculateMatchState(holes, 18);
            expect(state.lead).toBe(4);
            expect(state.holesRemaining).toBe(3);
            expect(isMatchDecided(state)).toBe(true);
        });

        it('should be dormie with 3 up, 3 to play', () => {
            const holes: HoleResult[] = Array.from({ length: 15 }, (_, i) => ({
                holeNumber: i + 1,
                redNet: i < 3 ? 3 : 4,
                blueNet: i < 3 ? 4 : 4,
                winner: i < 3 ? 'red' as const : null
            }));
            const state = calculateMatchState(holes, 18);
            expect(state.lead).toBe(3);
            expect(state.holesRemaining).toBe(3);
            expect(state.isDormie).toBe(true);
            expect(isMatchDecided(state)).toBe(false);
        });

        it('should be decided 3&2', () => {
            // 16 holes, 3-0 lead
            const holes: HoleResult[] = Array.from({ length: 16 }, (_, i) => ({
                holeNumber: i + 1,
                redNet: i < 3 ? 3 : 4,
                blueNet: i < 3 ? 4 : 4,
                winner: i < 3 ? 'red' as const : null
            }));
            const state = calculateMatchState(holes, 18);
            expect(state.lead).toBe(3);
            expect(state.holesRemaining).toBe(2);
            expect(isMatchDecided(state)).toBe(true);
            expect(formatMatchStatus(state)).toBe('3&2');
        });
    });

    describe('Point Allocation', () => {
        it('should give red all points on win (1-point match)', () => {
            const state = { leader: 'red' as const, lead: 2, holesPlayed: 18, holesRemaining: 0, isDecided: false, isDormie: false };
            const result = calculateMatchResult(state, 1);
            expect(result.winner).toBe('red');
            expect(result.redPoints).toBe(1);
            expect(result.bluePoints).toBe(0);
        });

        it('should split points on tie', () => {
            const state = { leader: null, lead: 0, holesPlayed: 18, holesRemaining: 0, isDecided: false, isDormie: false };
            const result = calculateMatchResult(state, 1);
            expect(result.winner).toBeNull();
            expect(result.redPoints).toBe(0.5);
            expect(result.bluePoints).toBe(0.5);
        });

        it('should give blue all points on 2-point match win', () => {
            const state = { leader: 'blue' as const, lead: 3, holesPlayed: 16, holesRemaining: 2, isDecided: true, isDormie: false };
            const result = calculateMatchResult(state, 2);
            expect(result.winner).toBe('blue');
            expect(result.redPoints).toBe(0);
            expect(result.bluePoints).toBe(2);
        });

        it('should split 2 points on tie', () => {
            const state = { leader: null, lead: 0, holesPlayed: 18, holesRemaining: 0, isDecided: false, isDormie: false };
            const result = calculateMatchResult(state, 2);
            expect(result.redPoints).toBe(1);
            expect(result.bluePoints).toBe(1);
        });
    });

    describe('Status Formatting', () => {
        it('should format 3&2 for early clinch', () => {
            const state = { leader: 'red' as const, lead: 3, holesPlayed: 16, holesRemaining: 2, isDecided: true, isDormie: false };
            expect(formatMatchStatus(state)).toBe('3&2');
        });

        it('should format 1 UP for 1-hole lead at end', () => {
            const state = { leader: 'red' as const, lead: 1, holesPlayed: 18, holesRemaining: 0, isDecided: false, isDormie: false };
            expect(formatMatchStatus(state)).toBe('1 UP');
        });

        it('should format A/S for tie', () => {
            const state = { leader: null, lead: 0, holesPlayed: 18, holesRemaining: 0, isDecided: false, isDormie: false };
            expect(formatMatchStatus(state)).toBe('A/S');
        });
    });
});
