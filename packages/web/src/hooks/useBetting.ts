'use client';

import { useCallback, useEffect, useState } from 'react';
import { api } from '@/lib/api';

// ─── Types ────────────────────────────────────────────────────────────────

export interface Bet {
    id: string;
    eventId: string;
    roundId: string;
    flightId: string;
    segmentType: 'singles1' | 'singles2' | 'fourball';
    bettorId: string;
    pickedOutcome: 'A' | 'B' | 'AS';
    amount: number;
    comment: string | null;
    createdAt: string;
    /** Enriched on /my-stats and /settlement endpoints. */
    status?: 'open' | 'closed';
    realizedPayout?: number;
    potentialPayout?: number;
    winningOutcome?: 'A' | 'B' | 'AS' | null;
}

export interface MatchBetsData {
    bets: Bet[];
    pot: number;
    counts: { A: number; B: number; AS: number };
    /** True once any hole has been scored for this (round, flight) — bets are locked. */
    locked: boolean;
}

export interface PersonalStats {
    wagered: number;
    realizedNet: number;
    potential: number;
    closedWagered: number;
    closedRecovered: number;
    bets: Bet[];
    generalBetsCount: number;
}

export interface SettlementBalance {
    id: string;
    name: string;
    balance: number;
}

export interface SettlementTransfer {
    from: string;
    to: string;
    amount: number;
}

export interface SettlementData {
    isPartial: boolean;
    balances: SettlementBalance[];
    transfers: SettlementTransfer[];
    /** Per-player enriched bets for the Predicciones standings drilldown. */
    playerBets?: Record<string, Bet[]>;
}

export type GeneralBetType = 'tournament_winner' | 'exact_score' | 'mvp' | 'worst_player';

export interface GeneralBetPool {
    betType: GeneralBetType;
    flightId: string | null;
    flightName: string | null;
    segmentType: string | null;
    pot: number;
    betsCount: number;
    outcomePartes: Record<string, number>;
    isResolved: boolean;
    winningOutcome: string | null;
    /** Each entry formatted "playerId:Display Name" — used by MVP/Worst dropdowns. */
    redPlayerNames: string[];
    bluePlayerNames: string[];
}

export interface GeneralBet {
    id: string;
    eventId: string;
    bettorId: string;
    betType: GeneralBetType;
    flightId: string | null;
    segmentType: string | null;
    pickedOutcome: string;
    amount: number;
    comment: string | null;
    createdAt: string;
}

// ─── Match-bet hooks ──────────────────────────────────────────────────────

export function useMatchBets(eventId: string, roundId: string, flightId: string, segmentType: string) {
    const [data, setData] = useState<MatchBetsData | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const fetch = useCallback(async () => {
        if (!eventId || !roundId || !flightId || !segmentType) return;
        try {
            setIsLoading(true);
            const res = await api.get<MatchBetsData>(
                `/events/${eventId}/rounds/${roundId}/flights/${flightId}/segments/${segmentType}/bets`,
            );
            setData(res);
            setError(null);
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Error al cargar apuestas del partido');
        } finally {
            setIsLoading(false);
        }
    }, [eventId, roundId, flightId, segmentType]);

    useEffect(() => { fetch(); }, [fetch]);
    return { data, isLoading, error, refetch: fetch };
}

export function usePlaceBet() {
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const placeBet = async (input: {
        eventId: string;
        roundId: string;
        flightId: string;
        segmentType: 'singles1' | 'singles2' | 'fourball';
        pickedOutcome: 'A' | 'B' | 'AS';
        comment?: string;
    }): Promise<boolean> => {
        try {
            setIsSubmitting(true);
            setError(null);
            await api.post(
                `/events/${input.eventId}/rounds/${input.roundId}/flights/${input.flightId}/segments/${input.segmentType}/bets`,
                { pickedOutcome: input.pickedOutcome, comment: input.comment },
            );
            return true;
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Error al registrar la apuesta');
            return false;
        } finally {
            setIsSubmitting(false);
        }
    };

    return { placeBet, isSubmitting, error };
}

// ─── Personal stats / settlement ──────────────────────────────────────────

export function usePersonalStats(eventId: string) {
    const [data, setData] = useState<PersonalStats | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const fetch = useCallback(async () => {
        if (!eventId) return;
        try {
            setIsLoading(true);
            const res = await api.get<PersonalStats>(`/events/${eventId}/bets/my-stats`);
            setData(res);
            setError(null);
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Error al cargar estadísticas');
        } finally {
            setIsLoading(false);
        }
    }, [eventId]);

    useEffect(() => { fetch(); }, [fetch]);
    return { data, isLoading, error, refetch: fetch };
}

export function useTournamentSettlement(eventId: string) {
    const [data, setData] = useState<SettlementData | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const fetch = useCallback(async () => {
        if (!eventId) return;
        try {
            setIsLoading(true);
            const res = await api.get<SettlementData>(`/events/${eventId}/settlement`);
            setData(res);
            setError(null);
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Error al cargar liquidación');
        } finally {
            setIsLoading(false);
        }
    }, [eventId]);

    useEffect(() => { fetch(); }, [fetch]);
    return { data, isLoading, error, refetch: fetch };
}

// ─── General bets ─────────────────────────────────────────────────────────

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
            setError(err instanceof Error ? err.message : 'Error al cargar apuestas generales');
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
            setError(err instanceof Error ? err.message : 'Error al cargar mis apuestas generales');
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

    const placeGeneralBet = async (input: {
        eventId: string;
        betType: GeneralBetType;
        pickedOutcome: string;
        comment?: string;
    }): Promise<boolean> => {
        try {
            setIsSubmitting(true);
            setError(null);
            await api.post(`/events/${input.eventId}/general-bets`, {
                betType: input.betType,
                pickedOutcome: input.pickedOutcome,
                comment: input.comment,
            });
            return true;
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Error al registrar la apuesta general');
            return false;
        } finally {
            setIsSubmitting(false);
        }
    };

    return { placeGeneralBet, isSubmitting, error };
}
