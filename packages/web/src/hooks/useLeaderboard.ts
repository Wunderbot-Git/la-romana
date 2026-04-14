'use client';

import { useState, useEffect } from 'react';
import { api } from '@/lib/api';

export interface MatchSummary {
    matchType: 'singles1' | 'singles2' | 'fourball';
    winner: 'red' | 'blue' | null;
    finalStatus: string;
    redPoints: number;
    bluePoints: number;
    holesPlayed: number;
    isComplete: boolean;
}

export interface FlightRoundSummary {
    flightId: string;
    flightNumber: number;
    state: 'open' | 'completed' | 'reopened';
    matches: MatchSummary[];
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

export interface StablefordStanding {
    playerId: string;
    playerName: string;
    handicapIndex: number;
    team: 'red' | 'blue' | null;
    stablefordCumulative: number;
    ryderIndividualCumulative: number;
    roundsPlayed: number;
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
