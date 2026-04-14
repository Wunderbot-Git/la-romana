// Momentum Calculator - Track recent match trends

import { Team } from './matchStatus';
import { MatchSummary } from './flightMatchCalculator';

export interface MomentumInput {
    recentMatches: MatchSummary[]; // Last N completed matches
}

export interface MomentumIndicator {
    direction: 'red' | 'blue' | 'neutral';
    strength: 'strong' | 'moderate' | 'weak';
    redWins: number;
    blueWins: number;
    ties: number;
    description: string;
}

/**
 * Calculate momentum based on recent match results.
 * Looks at last 3-5 completed matches to determine trend.
 */
export const calculateMomentum = (input: MomentumInput): MomentumIndicator => {
    const { recentMatches } = input;

    if (recentMatches.length === 0) {
        return {
            direction: 'neutral',
            strength: 'weak',
            redWins: 0,
            blueWins: 0,
            ties: 0,
            description: 'No recent matches'
        };
    }

    let redWins = 0;
    let blueWins = 0;
    let ties = 0;

    for (const match of recentMatches) {
        if (match.winner === 'red') redWins++;
        else if (match.winner === 'blue') blueWins++;
        else ties++;
    }

    const total = recentMatches.length;
    let direction: 'red' | 'blue' | 'neutral';
    let strength: 'strong' | 'moderate' | 'weak';
    let description: string;

    if (redWins === blueWins) {
        direction = 'neutral';
        strength = 'weak';
        description = 'Evenly matched';
    } else if (redWins > blueWins) {
        direction = 'red';
        const ratio = redWins / total;
        if (ratio >= 0.8) {
            strength = 'strong';
            description = `Red dominates (${redWins}/${total})`;
        } else if (ratio >= 0.6) {
            strength = 'moderate';
            description = `Red leads (${redWins}/${total})`;
        } else {
            strength = 'weak';
            description = `Slight red edge (${redWins}/${total})`;
        }
    } else {
        direction = 'blue';
        const ratio = blueWins / total;
        if (ratio >= 0.8) {
            strength = 'strong';
            description = `Blue dominates (${blueWins}/${total})`;
        } else if (ratio >= 0.6) {
            strength = 'moderate';
            description = `Blue leads (${blueWins}/${total})`;
        } else {
            strength = 'weak';
            description = `Slight blue edge (${blueWins}/${total})`;
        }
    }

    return {
        direction,
        strength,
        redWins,
        blueWins,
        ties,
        description
    };
};
