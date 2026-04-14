// Stroke Allocation based on Playing Handicap and Stroke Index

/**
 * Determine how many strokes a player receives on a specific hole.
 * Rules:
 * - PH 0-17: 1 stroke on holes with SI <= PH
 * - PH 18: 1 stroke on all holes
 * - PH 19-36: 1 stroke on all holes + 1 extra on holes with SI <= (PH - 18)
 * - PH > 36: 2 strokes on all holes + 1 extra on holes with SI <= (PH - 36)
 */
export const getStrokesForHole = (playingHandicap: number, strokeIndex: number): number => {
    if (playingHandicap <= 0) return 0;

    if (playingHandicap <= 18) {
        return strokeIndex <= playingHandicap ? 1 : 0;
    }

    if (playingHandicap <= 36) {
        const extraStrokes = playingHandicap - 18;
        return strokeIndex <= extraStrokes ? 2 : 1;
    }

    // PH > 36
    const extraStrokes = playingHandicap - 36;
    return strokeIndex <= extraStrokes ? 3 : 2;
};

/**
 * Calculate stroke allocation for a full round (18 holes).
 * Returns an array of strokes indexed by hole number (1-18).
 */
export const calculateStrokeAllocation = (
    playingHandicap: number,
    strokeIndexes: number[] // Array of 18 stroke indexes (index 0 = hole 1)
): number[] => {
    return strokeIndexes.map(si => getStrokesForHole(playingHandicap, si));
};
