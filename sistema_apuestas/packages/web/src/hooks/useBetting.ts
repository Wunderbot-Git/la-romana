'use client';

import { useState, useEffect, useCallback } from 'react';
import { api } from '@/lib/api';

export interface Bet {
    id: string;
    eventId: string;
    flightId: string;
    segmentType: string;
    bettorId: string;
    pickedOutcome: 'A' | 'B' | 'AS';
    comment?: string | null;
    timingFactor: number;
    riskFactor: number;
    partes: number;
    amount: number;
    potentialPayout?: number;
    createdAt: string;
}

export interface MatchBetsData {
    bets: Bet[];
    pot: number;
    partes: {
        A: number;
        B: number;
        AS: number;
    };
}

export interface PersonalStats {
    wagered: number;
    realizedNet: number;
    potential: number;
    closedWagered: number;
    closedRecovered: number;
    bets?: Bet[];
}

export interface SettlementData {
    isPartial: boolean;
    balances: { id: string; name: string; balance: number }[];
    transfers: { from: string; to: string; amount: number }[];
    personalStats: any;
}

export function useMatchBets(eventId: string, flightId: string, segmentType: string) {
    const [data, setData] = useState<MatchBetsData | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const fetchBets = useCallback(async () => {
        if (!eventId || !flightId || !segmentType) return;
        try {
            setIsLoading(true);
            const res = await api.get<MatchBetsData>(`/events/${eventId}/flights/${flightId}/segments/${segmentType}/bets`);
            setData(res);
            setError(null);
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Error fetching match bets');
        } finally {
            setIsLoading(false);
        }
    }, [eventId, flightId, segmentType]);

    useEffect(() => {
        fetchBets();
    }, [fetchBets]);

    return { data, isLoading, error, refetch: fetchBets };
}

export function usePersonalStats(eventId: string) {
    const [data, setData] = useState<PersonalStats | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const fetchStats = useCallback(async () => {
        if (!eventId) return;
        try {
            setIsLoading(true);
            const res = await api.get<PersonalStats>(`/events/${eventId}/bets/my-stats`);
            setData(res);
            setError(null);
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Error fetching stats');
        } finally {
            setIsLoading(false);
        }
    }, [eventId]);

    useEffect(() => {
        fetchStats();
    }, [fetchStats]);

    return { data, isLoading, error, refetch: fetchStats };
}

export function useTournamentSettlement(eventId: string) {
    const [data, setData] = useState<SettlementData | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const fetchSettlement = useCallback(async () => {
        if (!eventId) return;
        try {
            setIsLoading(true);
            const res = await api.get<SettlementData>(`/events/${eventId}/settlement`);
            setData(res);
            setError(null);
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Error fetching settlement');
        } finally {
            setIsLoading(false);
        }
    }, [eventId]);

    useEffect(() => {
        fetchSettlement();
    }, [fetchSettlement]);

    return { data, isLoading, error, refetch: fetchSettlement };
}

export function usePlaceBet() {
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const placeBet = async ({ eventId, flightId, segmentType, pickedOutcome, comment }: { eventId: string, flightId: string, segmentType: string, pickedOutcome: 'A' | 'B' | 'AS', comment?: string }): Promise<boolean> => {
        try {
            setIsSubmitting(true);
            setError(null);
            await api.post(`/events/${eventId}/flights/${flightId}/segments/${segmentType}/bets`, {
                pickedOutcome,
                comment
            });
            return true;
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Error placing bet');
            return false;
        } finally {
            setIsSubmitting(false);
        }
    };

    return { placeBet, isSubmitting, error };
}
