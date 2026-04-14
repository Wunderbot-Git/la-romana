'use client';

import { useState, useEffect } from 'react';
import { api } from '@/lib/api';

interface PlayerScore {
    playerId: string;
    playerName: string;
    hcp: number;
    scores: (number | null)[];
}

interface Match {
    id: string;
    flightId: string;
    flightName: string;
    segmentType: 'singles1' | 'singles2' | 'fourball' | 'scramble';
    status: 'not_started' | 'in_progress' | 'completed';
    currentHole: number;
    matchStatus: string; // e.g., "2 UP", "A/S", "1 DN"
    fourballStatus?: string;
    scrambleStatus?: string;
    matchWinner: 'red' | 'blue' | null;
    currentLeader: 'red' | 'blue' | null;
    redPlayers: PlayerScore[];
    bluePlayers: PlayerScore[];
    parValues: number[];
    hcpValues: number[];
    scrambleSiValues?: number[];
    matchProgression: string[]; // Status at each hole
    holeWinners: ('red' | 'blue' | null)[];
    matchLeaders: ('red' | 'blue' | null)[];
    redTeamStrokes?: number[]; // For scramble
    blueTeamStrokes?: number[];
}

interface LeaderboardData {
    eventId: string;
    eventName: string;
    updatedAt: string;
    totalScore: {
        red: number;
        blue: number;
    };
    projectedScore: {
        red: number;
        blue: number;
    };
    segmentScores: {
        singles: { red: number; blue: number };
        fourball: { red: number; blue: number };
        scramble: { red: number; blue: number };
    };
    momentum: 'red' | 'blue' | 'neutral';
    matches: Match[];
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

export type { LeaderboardData, Match, PlayerScore };
