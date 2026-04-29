'use client';

import { useState, useEffect, useCallback } from 'react';
import { api } from '@/lib/api';

export interface FlightScore {
    flightId: string;
    roundId: string;
    flightName: string;
    matchStatus: string;
    fourballStatus: string;
    fourballWinner: 'red' | 'blue' | null;
    fourballComplete: boolean;
    fourballLeader: 'red' | 'blue' | null;
    fourballLead: number;
    currentHole: number;
    redPlayers: {
        playerId: string;
        playerName: string;
        hcp: number;
        playingHcpSingles?: number;
        playingHcpFourball?: number;
        scores: (number | null)[];
        siValues?: number[];
        singlesStatus: string | null;
        singlesResult: 'win' | 'loss' | 'halved' | null;
        singlesHoles?: (string | null)[];
    }[];
    bluePlayers: {
        playerId: string;
        playerName: string;
        hcp: number;
        playingHcpSingles?: number;
        playingHcpFourball?: number;
        scores: (number | null)[];
        siValues?: number[];
        singlesStatus: string | null;
        singlesResult: 'win' | 'loss' | 'halved' | null;
        singlesHoles?: (string | null)[];
    }[];
    parValues: number[];
    matchProgression: (string | null)[];
    holeWinners: ('red' | 'blue' | null)[];
    matchLeaders: ('red' | 'blue' | null)[];
}

export function useFlightScores(eventId: string, flightId?: string | null) {
    const [data, setData] = useState<FlightScore | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const fetchScores = useCallback(async () => {
        if (!flightId || !eventId) {
            setIsLoading(false);
            return;
        }
        try {
            setIsLoading(true);
            const response = await api.get<FlightScore>(`/events/${eventId}/flights/${flightId}/scores`);
            setData(response);
            setError(null);
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to fetch scores');
        } finally {
            setIsLoading(false);
        }
    }, [eventId, flightId]);

    useEffect(() => {
        fetchScores();
    }, [fetchScores]);

    return { data, isLoading, error, refetch: fetchScores };
}

interface BatchScore {
    playerId: string;
    hole: number;
    score: number | null;
}

interface SubmitBatchParams {
    eventId: string;
    roundId: string;
    flightId: string;
    scores: BatchScore[];
    source?: 'online' | 'offline';
}

const getMutationId = () => {
    if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
        return crypto.randomUUID();
    }
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
        const r = (Math.random() * 16) | 0;
        const v = c === 'x' ? r : (r & 0x3) | 0x8;
        return v.toString(16);
    });
};

export function useSubmitScores() {
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const submitBatchScores = async (params: SubmitBatchParams): Promise<boolean> => {
        try {
            setIsSubmitting(true);
            setError(null);

            const payload = {
                roundId: params.roundId,
                source: params.source ?? 'online',
                scores: params.scores.map(s => ({
                    playerId: s.playerId,
                    holeNumber: s.hole,
                    grossScore: s.score,
                    mutationId: getMutationId(),
                })),
            };
            await api.put(`/events/${params.eventId}/flights/${params.flightId}/scores`, payload);
            return true;
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to submit scores');
            return false;
        } finally {
            setIsSubmitting(false);
        }
    };

    return { submitBatchScores, isSubmitting, error };
}

export function useDeleteScores() {
    const [isDeleting, setIsDeleting] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const deleteFlightScores = async (eventId: string, flightId: string): Promise<boolean> => {
        try {
            setIsDeleting(true);
            setError(null);
            await api.delete(`/events/${eventId}/flights/${flightId}/scores`);
            return true;
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to delete scores');
            return false;
        } finally {
            setIsDeleting(false);
        }
    };

    const deleteHoleScores = async (eventId: string, flightId: string, holeNumber: number): Promise<boolean> => {
        try {
            setIsDeleting(true);
            setError(null);
            await api.delete(`/events/${eventId}/flights/${flightId}/scores/${holeNumber}`);
            return true;
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to delete hole scores');
            return false;
        } finally {
            setIsDeleting(false);
        }
    };

    return { deleteFlightScores, deleteHoleScores, isDeleting, error };
}
