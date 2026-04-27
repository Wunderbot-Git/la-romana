// Handicap Calculation Constants and Functions

export const SINGLES_FOURBALL_ALLOWANCE = 0.80;
export const DEFAULT_SCRAMBLE_ALLOWANCE = 0.30;
/** USGA hard cap on Playing Handicap (per WHS rules). */
export const MAX_PLAYING_HANDICAP = 36;

/**
 * Rounds a number using "Round Half Up" (banker's rounding).
 * 4.5 -> 5, 4.4 -> 4, 4.6 -> 5
 */
export const roundHalfUp = (value: number): number => {
    return Math.round(value);
};

/**
 * USGA Course Handicap formula:
 *   CH = HCP Index × (Slope / 113) + (Course Rating − Par)
 *
 * Inputs come from the player's chosen tee:
 *   - slope:  the tee's slope rating (typically 55–155, 113 = scratch)
 *   - rating: the tee's course rating (e.g., 71.2)
 *   - par:    sum of par across the 18 holes for that tee
 *
 * Rounded half-up. Returned as an integer.
 */
export const calculateCourseHandicap = (
    handicapIndex: number,
    slope: number,
    rating: number,
    par: number,
): number => {
    return roundHalfUp(handicapIndex * (slope / 113) + (rating - par));
};

/**
 * Calculate the Playing Handicap for Singles/Fourball formats.
 *
 * Two call shapes supported (back-compat):
 *
 *  1) Legacy: `calculatePlayingHandicap(index, allowance?)`
 *     → PH = round(index × allowance). No course adjustment.
 *
 *  2) Course-aware: pass an object with the full USGA inputs:
 *     `calculatePlayingHandicap({ courseHandicap, allowance })`
 *     → PH = round(courseHandicap × allowance), capped at MAX_PLAYING_HANDICAP.
 *
 * The legacy form is kept so any existing call sites still compile and behave the
 * same way. New code paths (singles/fourball matches) use the object form.
 */
export function calculatePlayingHandicap(
    handicapIndex: number,
    allowance?: number
): number;
export function calculatePlayingHandicap(input: {
    courseHandicap: number;
    allowance: number;
}): number;
export function calculatePlayingHandicap(
    a: number | { courseHandicap: number; allowance: number },
    b?: number,
): number {
    if (typeof a === 'object') {
        // Clamp non-negative: a "negative PH" (scratch player on a tee with rating < par,
        // or a phantom with HCP 0) would imply giving strokes back to the opponent — not
        // supported in our match-play model. Floor at 0.
        return Math.min(
            Math.max(0, roundHalfUp(a.courseHandicap * a.allowance)),
            MAX_PLAYING_HANDICAP
        );
    }
    const allowance = b ?? SINGLES_FOURBALL_ALLOWANCE;
    return Math.max(0, roundHalfUp(a * allowance));
}

/**
 * Convenience: full pipeline from HCP Index → Course HCP → Playing HCP.
 * Falls back to the legacy `index × allowance` if slope or rating is null.
 *
 * Returned object exposes intermediate values so callers (e.g. admin UI) can
 * display "Index 7.2 → Course 9 → Playing 7" reasoning to the organizer.
 */
export const computePlayingHandicapFromIndex = (input: {
    handicapIndex: number;
    slope: number | null;
    rating: number | null;
    par: number | null;
    allowance: number;
}): { courseHandicap: number | null; playingHandicap: number } => {
    const { handicapIndex, slope, rating, par, allowance } = input;
    if (slope == null || rating == null || par == null) {
        // Fallback: pre-Course-HCP behaviour (Index × Allowance), clamped to non-negative
        return {
            courseHandicap: null,
            playingHandicap: Math.max(0, roundHalfUp(handicapIndex * allowance)),
        };
    }
    const courseHandicap = calculateCourseHandicap(handicapIndex, slope, rating, par);
    return {
        courseHandicap,
        playingHandicap: calculatePlayingHandicap({ courseHandicap, allowance }),
    };
};

/**
 * Calculate the Team Playing Handicap for Scramble format.
 * Team PH = (HCP_A + HCP_B) × Allowance (default 30%)
 */
export const calculateScrambleTeamHandicap = (
    handicapA: number,
    handicapB: number,
    allowance: number = DEFAULT_SCRAMBLE_ALLOWANCE
): number => {
    return roundHalfUp((handicapA + handicapB) * allowance);
};
