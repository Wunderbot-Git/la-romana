'use client';

import { useState, useEffect } from 'react';
import { api } from '@/lib/api';

interface MatchHistory {
    matchId: string;
    matchType: 'singles' | 'fourball' | 'scramble';
    status: 'not_started' | 'in_progress' | 'completed';
    matchStatus: string;
    winner: 'red' | 'blue' | 'halved' | null;
    points: { red: number; blue: number };
    redPlayers: { playerId: string; playerName: string; hcp: number }[];
    bluePlayers: { playerId: string; playerName: string; hcp: number }[];
    holes: {
        holeNumber: number;
        par: number;
        hcp: number;
        redScores: (number | null)[];
        blueScores: (number | null)[];
        redNet: number | null;
        blueNet: number | null;
        holeWinner: 'red' | 'blue' | 'halved' | null;
        matchStatusAfter: string;
    }[];
    earlyFinish?: number; // Hole where match was decided (e.g., 15 for "4&3")
}

interface FlightHistoryData {
    flightId: string;
    flightName: string;
    redPlayers: { playerId: string; playerName: string; hcp: number }[];
    bluePlayers: { playerId: string; playerName: string; hcp: number }[];
    matches: MatchHistory[];
    totalPoints: { red: number; blue: number };
}

export function useFlightHistory(eventId: string, flightId?: string) {
    const [data, setData] = useState<FlightHistoryData | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const fetchHistory = async () => {
        if (!flightId) {
            setIsLoading(false);
            return;
        }

        try {
            setIsLoading(true);
            const response = await api.get<FlightHistoryData>(`/events/${eventId}/flights/${flightId}/history`);
            setData(response);
            setError(null);
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to fetch flight history');
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        fetchHistory();
    }, [eventId, flightId]);

    return { data, isLoading, error, refetch: fetchHistory };
}

export type { FlightHistoryData, MatchHistory };
