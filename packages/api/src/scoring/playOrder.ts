// playOrder.ts — Detect a flight's play order from sparse score data.
//
// Why this exists
// ───────────────
// The match-play scoring engine iterates over the gross-scores array. By default
// the array is index-by-hole-number (index 0 = hoyo 1, …, index 17 = hoyo 18),
// so a naive `for (let i=0; i<18; i++)` walks 1→2→3→…→18.
//
// La Romana flights can tee off on a non-1 hoyo ("shotgun start"). A group
// starting on hoyo 10 plays 10→11→…→18→1→2→…→9. After they've played 14 holes,
// the array has scores at indices [0..4] (hoyos 1-5) AND [9..17] (hoyos 10-18),
// with [5..8] still null (hoyos 6-9 not yet played). Iterating numerically
// would say "after processing hoyos 1-5 + 10-18 the cumulative match state is
// X" — which is the same FINAL state as play order would give, but at intermediate
// steps the per-hole `matchState` snapshots are wrong (they reflect numeric order,
// not the order the players actually experienced).
//
// More importantly: the engine's "stop when match is decided" early-exit fires
// at the wrong cumulative point if iterated numerically. For a shotgun start
// the correct early-exit is when the lead exceeds remaining holes IN PLAY ORDER.
//
// This helper detects the play-order from the sparse scores so the engine can
// iterate in the right order and report state per actual hole-of-play.
//
// Detection heuristic
// ───────────────────
// Walk hoyos 1..N. The starting hoyo is the unique hoyo whose predecessor
// (with wraparound: prev(1) = N) is unplayed AND which itself has been played
// by someone. For a normal hoyo-1 start, hoyo 18 is unplayed and hoyo 1 is
// played → start = 1. For a shotgun-10 start, hoyo 9 is unplayed and hoyo 10
// is played → start = 10.
//
// Falls back to [1..N] if no holes have been played at all (fresh round).

/**
 * Returns the play-order (1-based hoyo numbers) for a flight given each player's
 * gross-scores array. A hoyo is "played" if ANY of the supplied players has a
 * non-null entry for it.
 *
 * @param playerScores  one entry per player; each is a 0-indexed gross-score array
 * @param totalHoles    9 or 18, defaults to 18
 * @returns play-order array of length `totalHoles`, e.g. [10,11,…,18,1,…,9]
 *          for a shotgun-10 start, or [1,2,…,18] for a regular start.
 */
export function detectPlayOrder(
    playerScores: ReadonlyArray<ReadonlyArray<number | null>>,
    totalHoles: number = 18,
): number[] {
    const anyPlayed = (h: number): boolean => {
        const idx = h - 1;
        for (const scores of playerScores) {
            const v = scores[idx];
            if (v !== null && v !== undefined) return true;
        }
        return false;
    };

    let start = 1;
    for (let h = 1; h <= totalHoles; h++) {
        const prev = h === 1 ? totalHoles : h - 1;
        if (anyPlayed(h) && !anyPlayed(prev)) { start = h; break; }
    }
    return Array.from({ length: totalHoles }, (_, i) => ((start - 1 + i) % totalHoles) + 1);
}
