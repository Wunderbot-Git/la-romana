'use client';

import { useState, useEffect } from 'react';
import { api } from '@/lib/api';

export interface MatchPlayer {
    id: string;
    name: string;
    hcp: number;
    /** Playing Handicap for singles match (course-aware, allowance-applied). */
    playingHcpSingles?: number;
    /** Playing Handicap for fourball match. */
    playingHcpFourball?: number;
    /** This player's per-hole Stroke Index list (1=hardest), 18 entries, based on their tee. */
    strokeIndexes?: number[];
}

export interface MatchHoleDetail {
    holeNumber: number;
    par: number;
    strokeIndex: number;
    redScores: (number | null)[];
    blueScores: (number | null)[];
    winner: 'red' | 'blue' | null;
    matchStateLabel: string | null;
}

export interface MatchDetail {
    matchType: 'singles1' | 'singles2' | 'fourball';
    winner: 'red' | 'blue' | null;
    finalStatus: string;
    redPoints: number;
    bluePoints: number;
    holesPlayed: number;
    isComplete: boolean;
    flightId: string;
    flightNumber: number;
    redPlayers: MatchPlayer[];
    bluePlayers: MatchPlayer[];
    pars: number[];
    strokeIndexes: number[];
    holes: MatchHoleDetail[];
}

// Back-compat alias for call sites still using the old name
export type MatchSummary = MatchDetail;

export interface FlightRoundSummary {
    flightId: string;
    flightNumber: number;
    state: 'open' | 'completed' | 'reopened';
    matches: MatchDetail[];
    redPoints: number;
    bluePoints: number;
    redPointsProjected: number;
    bluePointsProjected: number;
}

export interface RoundBreakdown {
    roundId: string;
    roundNumber: number;
    courseName: string;
    state: 'open' | 'completed' | 'reopened';
    teamPoints: { red: number; blue: number };
    teamPointsProjected: { red: number; blue: number };
    flightSummaries: FlightRoundSummary[];
}

export interface RyderTeamStanding {
    team: 'red' | 'blue';
    matchPointsCumulative: number;
    matchPointsProjected: number;
    roundsPlayed: number;
}

export interface StablefordHoleDetail {
    holeNumber: number;
    par: number;
    grossScore: number | null;
    strokes: number;
    netScore: number | null;
    points: number;
}

export interface StablefordRoundBreakdown {
    roundNumber: number;
    courseName: string;
    stablefordPoints: number;
    ryderIndividualPoints: number;
    /** Per-hole detail when this round was played (else undefined). */
    holes?: StablefordHoleDetail[];
    /** Course-aware Playing Handicap used for Stableford this round. */
    playingHandicap?: number;
}

export interface StablefordStanding {
    playerId: string;
    playerName: string;
    handicapIndex: number;
    team: 'red' | 'blue' | null;
    stablefordCumulative: number;
    ryderIndividualCumulative: number;
    roundsPlayed: number;
    /** Per-round breakdown sorted by roundNumber. */
    byRound?: StablefordRoundBreakdown[];
}

export interface NetoPotWinnerSummary {
    id: string;
    potId: string;
    playerId: string;
    rank: 1 | 2;
}

export interface NetoPotSummary {
    id: string;
    roundId: string;
    flightId: string;
    potAmountUsd: number;
    createdAt: string;
    winners: NetoPotWinnerSummary[];
}

export interface LeaderboardData {
    eventId: string;
    eventName: string;
    updatedAt: string;
    ryderStandings: RyderTeamStanding[];
    stablefordStandings: StablefordStanding[];
    rounds: RoundBreakdown[];
    netoPotsByRound: Record<string, NetoPotSummary[]>;
}

export function useLeaderboard(eventId: string) {
    const [data, setData] = useState<LeaderboardData | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const fetchLeaderboard = async () => {
        try {
            setIsLoading(true);
            const response = await api.get<LeaderboardData>(`/events/${eventId}/leaderboard`);
            setData(response);
            setError(null);
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to fetch leaderboard');
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        if (eventId) {
            fetchLeaderboard();
        }
    }, [eventId]);

    return { data, isLoading, error, refetch: fetchLeaderboard };
}

// Back-compat alias (old name used elsewhere)
export type Match = MatchSummary;
