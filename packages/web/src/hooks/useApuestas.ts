'use client';

import { useCallback, useEffect, useState } from 'react';
import { api } from '@/lib/api';

export interface PotADayStanding {
    playerId: string;
    playerName: string;
    team: 'red' | 'blue' | null;
    /** Net stroke total (sum of gross − strokes per hole). Lower is better. */
    netScore: number | null;
    /** Number of holes scored so far (0..18). */
    holesPlayed: number;
    /** Stableford day points — kept for reference, not used for ranking. */
    stablefordPoints: number;
    rank: number | null;
    payout: number;
}

export interface PotADay {
    roundId: string;
    roundNumber: number;
    courseName: string;
    poolSize: number;
    state: 'upcoming' | 'in_progress' | 'completed';
    standings: PotADayStanding[];
}

export interface PotBRyder {
    poolSize: number;
    redScore: number;
    blueScore: number;
    redProjected: number;
    blueProjected: number;
    winner: 'red' | 'blue' | 'tie' | null;
    teamCounts: { red: number; blue: number };
    perPlayerIfRedWins: number;
    perPlayerIfBlueWins: number;
}

export interface PotCRanking {
    rank: number;
    playerId: string;
    playerName: string;
    team: 'red' | 'blue' | null;
    stablefordCumulative: number;
    dailyWinningsTotal: number;
    score: number;
    projectedPayout: number;
}

export interface PotCTotalViaje {
    poolSize: number;
    payouts: { first: number; second: number; third: number };
    rankings: PotCRanking[];
}

export interface ApuestasOverview {
    perPlayer: { dailyTotal: number; tripTotal: number };
    grandPool: number;
    pots: {
        a: PotADay[];
        b: PotBRyder;
        c: PotCTotalViaje;
    };
}

export function useApuestas(eventId: string) {
    const [data, setData] = useState<ApuestasOverview | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const fetchData = useCallback(async () => {
        if (!eventId) return;
        try {
            setIsLoading(true);
            const res = await api.get<ApuestasOverview>(`/events/${eventId}/apuestas`);
            setData(res);
            setError(null);
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Error al cargar apuestas');
        } finally {
            setIsLoading(false);
        }
    }, [eventId]);

    useEffect(() => { fetchData(); }, [fetchData]);
    return { data, isLoading, error, refetch: fetchData };
}
