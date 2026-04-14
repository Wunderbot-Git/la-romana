// Match-Play Status Calculations

export type Team = 'red' | 'blue';

export interface MatchState {
    leader: Team | null; // null = All Square
    lead: number;        // How many holes up
    holesPlayed: number;
    holesRemaining: number;
    isDecided: boolean;  // Match clinched early
    isDormie: boolean;   // Lead = holes remaining
}

export interface HoleResult {
    holeNumber: number;
    redNet: number;
    blueNet: number;
    winner: Team | null; // null = halved
}

/**
 * Compare net scores for a single hole.
 * Returns the winning team or null if halved.
 */
export const compareHoleScores = (redNet: number, blueNet: number): Team | null => {
    if (redNet < blueNet) return 'red';
    if (blueNet < redNet) return 'blue';
    return null; // Halved
};

/**
 * Calculate the current match state given hole results.
 */
export const calculateMatchState = (holeResults: HoleResult[], totalHoles: number = 18): MatchState => {
    let redWins = 0;
    let blueWins = 0;

    for (const hole of holeResults) {
        if (hole.winner === 'red') redWins++;
        else if (hole.winner === 'blue') blueWins++;
    }

    const holesPlayed = holeResults.length;
    const holesRemaining = totalHoles - holesPlayed;
    const lead = Math.abs(redWins - blueWins);
    const leader: Team | null = redWins > blueWins ? 'red' : blueWins > redWins ? 'blue' : null;

    // Match is decided when lead > holes remaining
    const isDecided = lead > holesRemaining;
    // Dormie: lead equals holes remaining (cannot be caught, but not yet won)
    const isDormie = lead === holesRemaining && lead > 0;

    return {
        leader,
        lead,
        holesPlayed,
        holesRemaining,
        isDecided,
        isDormie
    };
};

/**
 * Check if a match can still change outcome.
 */
export const isMatchDecided = (state: MatchState): boolean => {
    return state.isDecided;
};

/**
 * Format match status for display.
 * Examples: "3 UP", "A/S", "3&2", "1 UP"
 */
export const formatMatchStatus = (state: MatchState): string => {
    if (state.lead === 0) {
        return 'A/S';
    }

    if (state.isDecided && state.holesRemaining > 0) {
        // Format as "X&Y" (e.g., 3&2)
        return `${state.lead}&${state.holesRemaining}`;
    }

    // Active match: standard is to show "X UP" relative to the leader.
    // The UI context (colors etc) indicates WHO is leading.
    return `${state.lead} UP`;
};
