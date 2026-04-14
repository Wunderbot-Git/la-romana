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
    isAdditional?: boolean;
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

export interface GeneralBet {
    id: string;
    eventId: string;
    bettorId: string;
    betType: string;
    pickedOutcome: string;
    amount: number;
    createdAt: string;
}

export interface PersonalStats {
    wagered: number;
    realizedNet: number;
    potential: number;
    closedWagered: number;
    closedRecovered: number;
    bets?: Bet[];
    generalBets?: GeneralBet[];
    generalBetsCount?: number;
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

export function useUserStats(eventId: string, userId: string | null) {
    const [data, setData] = useState<PersonalStats | null>(null);
    const [isLoading, setIsLoading] = useState(false);

    useEffect(() => {
        if (!eventId || !userId) { setData(null); return; }
        setIsLoading(true);
        api.get<PersonalStats>(`/events/${eventId}/bets/user/${userId}`)
            .then(setData)
            .catch(() => setData(null))
            .finally(() => setIsLoading(false));
    }, [eventId, userId]);

    return { data, isLoading };
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

// ──────────────────────────────────────────────────
// General Bets
// ──────────────────────────────────────────────────

export interface GeneralBetPool {
    betType: string;
    flightId: string | null;
    flightName: string | null;
    segmentType: string | null;
    pot: number;
    betsCount: number;
    outcomePartes: Record<string, number>;
    isResolved: boolean;
    winningOutcome: string | null;
    redPlayerNames: string[];
    bluePlayerNames: string[];
}

export interface GeneralBet {
    id: string;
    eventId: string;
    bettorId: string;
    betType: string;
    flightId: string | null;
    segmentType: string | null;
    pickedOutcome: string;
    timingFactor: number;
    partes: number;
    amount: number;
    comment: string | null;
    createdAt: string;
}

export function useGeneralBetPools(eventId: string) {
    const [data, setData] = useState<GeneralBetPool[] | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const fetch = useCallback(async () => {
        if (!eventId) return;
        try {
            setIsLoading(true);
            const res = await api.get<GeneralBetPool[]>(`/events/${eventId}/general-bets`);
            setData(res);
            setError(null);
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Error fetching general bet pools');
        } finally {
            setIsLoading(false);
        }
    }, [eventId]);

    useEffect(() => { fetch(); }, [fetch]);
    return { data, isLoading, error, refetch: fetch };
}

export function useMyGeneralBets(eventId: string) {
    const [data, setData] = useState<GeneralBet[] | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const fetch = useCallback(async () => {
        if (!eventId) return;
        try {
            setIsLoading(true);
            const res = await api.get<GeneralBet[]>(`/events/${eventId}/general-bets/my-bets`);
            setData(res);
            setError(null);
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Error fetching general bets');
        } finally {
            setIsLoading(false);
        }
    }, [eventId]);

    useEffect(() => { fetch(); }, [fetch]);
    return { data, isLoading, error, refetch: fetch };
}

export function usePlaceGeneralBet() {
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const placeGeneralBet = async ({ eventId, betType, pickedOutcome, flightId, segmentType, comment }: {
        eventId: string; betType: string; pickedOutcome: string;
        flightId?: string; segmentType?: string; comment?: string;
    }): Promise<boolean> => {
        try {
            setIsSubmitting(true);
            setError(null);
            await api.post(`/events/${eventId}/general-bets`, {
                betType, pickedOutcome, flightId, segmentType, comment
            });
            return true;
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Error placing general bet');
            return false;
        } finally {
            setIsSubmitting(false);
        }
    };

    return { placeGeneralBet, isSubmitting, error };
}

export function usePlaceBet() {
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const placeBet = async ({ eventId, flightId, segmentType, pickedOutcome, comment, amount }: { eventId: string, flightId: string, segmentType: string, pickedOutcome: 'A' | 'B' | 'AS', comment?: string, amount?: number }): Promise<boolean> => {
        try {
            setIsSubmitting(true);
            setError(null);
            await api.post(`/events/${eventId}/flights/${flightId}/segments/${segmentType}/bets`, {
                pickedOutcome,
                comment,
                ...(amount ? { amount } : {})
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
