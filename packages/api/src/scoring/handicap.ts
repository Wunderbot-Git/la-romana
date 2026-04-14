// Handicap Calculation Constants and Functions

export const SINGLES_FOURBALL_ALLOWANCE = 0.80;
export const DEFAULT_SCRAMBLE_ALLOWANCE = 0.30;

/**
 * Rounds a number using "Round Half Up" (banker's rounding).
 * 4.5 -> 5, 4.4 -> 4, 4.6 -> 5
 */
export const roundHalfUp = (value: number): number => {
    return Math.round(value);
};

/**
 * Calculate the Playing Handicap for Singles/Fourball formats.
 * PH = Handicap Index × Allowance (default 80%)
 */
export const calculatePlayingHandicap = (
    handicapIndex: number,
    allowance: number = SINGLES_FOURBALL_ALLOWANCE
): number => {
    return roundHalfUp(handicapIndex * allowance);
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
