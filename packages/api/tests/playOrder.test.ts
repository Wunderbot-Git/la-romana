import { describe, it, expect } from 'vitest';
import { detectPlayOrder } from '../src/scoring/playOrder';
import { calculateSinglesMatch } from '../src/scoring/singlesMatch';
import { calculateFourballMatch } from '../src/scoring/fourballMatch';

const SI_18 = Array.from({ length: 18 }, (_, i) => i + 1);

describe('detectPlayOrder', () => {
    it('returns 1..18 when nothing has been played', () => {
        const empty: (number | null)[] = Array(18).fill(null);
        expect(detectPlayOrder([empty, empty])).toEqual([
            1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18,
        ]);
    });

    it('returns 1..18 for a regular hoyo-1 start', () => {
        // hoyos 1-3 played, 4-18 still empty
        const scores: (number | null)[] = [4, 5, 4, ...Array(15).fill(null)];
        expect(detectPlayOrder([scores, scores])).toEqual([
            1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18,
        ]);
    });

    it('returns 10..18,1..9 for a shotgun-10 start (mid round)', () => {
        // played hoyos 10..15 only
        const scores: (number | null)[] = [
            null, null, null, null, null, null, null, null, null, // 1-9
            4, 5, 4, 3, 4, 4, // 10-15
            null, null, null, // 16-18
        ];
        expect(detectPlayOrder([scores, scores])).toEqual([
            10, 11, 12, 13, 14, 15, 16, 17, 18, 1, 2, 3, 4, 5, 6, 7, 8, 9,
        ]);
    });

    it('returns 10..18,1..9 for a shotgun-10 start that has wrapped past hoyo 1', () => {
        // played hoyos 10..18 + 1..3
        const scores: (number | null)[] = [
            4, 5, 4, // 1-3
            null, null, null, null, null, null, // 4-9
            4, 5, 4, 3, 4, 4, 5, 3, 4, // 10-18
        ];
        expect(detectPlayOrder([scores, scores])).toEqual([
            10, 11, 12, 13, 14, 15, 16, 17, 18, 1, 2, 3, 4, 5, 6, 7, 8, 9,
        ]);
    });

    it('detects start across multiple players (any one with score = played)', () => {
        const red: (number | null)[] = Array(18).fill(null);
        red[9] = 4;
        const blue: (number | null)[] = Array(18).fill(null);
        // blue hasn't entered yet but red has on hoyo 10
        expect(detectPlayOrder([red, blue])[0]).toBe(10);
    });

    it('respects 9-hole rounds', () => {
        const scores: (number | null)[] = Array(9).fill(null);
        scores[4] = 3; // hoyo 5 played
        expect(detectPlayOrder([scores, scores], 9)).toEqual([5, 6, 7, 8, 9, 1, 2, 3, 4]);
    });
});

describe('singles match — shotgun-10 start', () => {
    it('reports correct dormie/decided state at the right play-order step', () => {
        // Red wins every hole. Group teed off on 10, played all 9 of 10..18 +
        // 5 holes of front (1..5). Total 14 played. After 14 holes red is
        // 14 UP with 4 to play → DECIDED, formatted as "14&4".
        const red: (number | null)[] = [
            4, 4, 4, 4, 4,                          // hoyos 1-5 (red wins)
            null, null, null, null,                  // hoyos 6-9 (not yet)
            4, 4, 4, 4, 4, 4, 4, 4, 4,               // hoyos 10-18 (red wins)
        ];
        const blue: (number | null)[] = [
            5, 5, 5, 5, 5,
            null, null, null, null,
            5, 5, 5, 5, 5, 5, 5, 5, 5,
        ];
        const out = calculateSinglesMatch({
            redPlayer:  { handicapIndex: 0, grossScores: red,  strokeIndexes: SI_18 },
            bluePlayer: { handicapIndex: 0, grossScores: blue, strokeIndexes: SI_18 },
            strokeIndexes: SI_18,
        });

        // Final state correct
        expect(out.finalState.leader).toBe('red');
        expect(out.result.winner).toBe('red');
        // The early-exit fires once lead > remaining in PLAY order. Red wins
        // every hole; remaining starts at 18 and ticks down by 1 each step.
        // Decision happens once lead (= holes played so far) > (totalHoles - holes played).
        // First step where lead > remaining: step 10 (lead 10, remaining 8) → "10&8".
        expect(out.result.finalStatus).toBe('10&8');

        // The first hole entry in play order should be hoyo 10, not hoyo 1.
        expect(out.holes[0].holeNumber).toBe(10);
    });

    it('matches the standard hoyo-1 ordering when no shotgun is detected', () => {
        const red: (number | null)[] = [4, 4, 4, 4, 4, ...Array(13).fill(null)];
        const blue: (number | null)[] = [5, 5, 5, 5, 5, ...Array(13).fill(null)];
        const out = calculateSinglesMatch({
            redPlayer:  { handicapIndex: 0, grossScores: red,  strokeIndexes: SI_18 },
            bluePlayer: { handicapIndex: 0, grossScores: blue, strokeIndexes: SI_18 },
            strokeIndexes: SI_18,
        });
        expect(out.holes[0].holeNumber).toBe(1);
        expect(out.holes[out.holes.length - 1].holeNumber).toBe(5);
        expect(out.finalState.holesPlayed).toBe(5);
    });
});

describe('fourball match — shotgun-10 start', () => {
    it('walks holes in play order (first hole entry is 10, not 1)', () => {
        const fill = (vals: (number | null)[]) => vals;
        const red1 = fill([
            null, null, null, null, null,   // 1-5 not played yet
            null, null, null, null,         // 6-9
            4, 4, 4, 4, 4, 4, 4, 4, 4,      // 10-18
        ]);
        const red2 = fill([
            null, null, null, null, null,
            null, null, null, null,
            5, 5, 5, 5, 5, 5, 5, 5, 5,
        ]);
        const blue1 = fill([
            null, null, null, null, null,
            null, null, null, null,
            5, 5, 5, 5, 5, 5, 5, 5, 5,
        ]);
        const blue2 = fill([
            null, null, null, null, null,
            null, null, null, null,
            5, 5, 5, 5, 5, 5, 5, 5, 5,
        ]);
        const out = calculateFourballMatch({
            redTeam: {
                player1: { handicapIndex: 0, grossScores: red1, strokeIndexes: SI_18 },
                player2: { handicapIndex: 0, grossScores: red2, strokeIndexes: SI_18 },
            },
            blueTeam: {
                player1: { handicapIndex: 0, grossScores: blue1, strokeIndexes: SI_18 },
                player2: { handicapIndex: 0, grossScores: blue2, strokeIndexes: SI_18 },
            },
        });
        expect(out.holes[0].holeNumber).toBe(10);
        expect(out.finalState.leader).toBe('red');
    });
});
