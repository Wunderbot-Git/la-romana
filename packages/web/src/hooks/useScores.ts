'use client';

import { useState, useEffect } from 'react';
import { api } from '@/lib/api';

interface FlightScore {
    flightId: string;
    flightName: string;
    segmentType: 'singles' | 'fourball' | 'scramble';
    matchStatus: string;
    fourballStatus?: string;
    scrambleStatus?: string;
    currentHole: number;
    redPlayers: {
        playerId: string;
        playerName: string;
        hcp: number;
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
        scores: (number | null)[];
        siValues?: number[];
        singlesStatus: string | null;
        singlesResult: 'win' | 'loss' | 'halved' | null;
        singlesHoles?: (string | null)[];
    }[];
    parValues: number[];
    siValues: number[];
    scrambleSiValues?: number[];
    matchProgression: (string | null)[];
    holeWinners: (string | null)[];
    matchLeaders: ('red' | 'blue' | null)[]; // Add this line
}

export function useFlightScores(eventId: string, flightId?: string) {
    const [data, setData] = useState<FlightScore | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const fetchScores = async () => {
        if (!flightId) {
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
    };

    useEffect(() => {
        fetchScores();
    }, [eventId, flightId]);

    return { data, isLoading, error, refetch: fetchScores };
}

interface SubmitScoreParams {
    eventId: string;
    flightId: string;
    playerId: string;
    hole: number;
    score: number;
}

interface BatchScore {
    playerId?: string;
    team?: 'red' | 'blue';
    hole: number;
    score: number | null;
}

interface SubmitBatchParams {
    eventId: string;
    flightId: string;
    scores: BatchScore[];
}

const getMutationId = () => {
    if (typeof crypto.randomUUID === 'function') {
        return crypto.randomUUID();
    }
    // Fallback RFC 4122 compliant UUID v4 generator for non-secure contexts
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
        const r = (Math.random() * 16) | 0;
        const v = c === 'x' ? r : (r & 0x3) | 0x8;
        return v.toString(16);
    });
};

export function useSubmitScores() {
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const submitScore = async (params: SubmitScoreParams): Promise<boolean> => {
        return submitBatchScores({
            eventId: params.eventId,
            flightId: params.flightId,
            scores: [{ playerId: params.playerId, hole: params.hole, score: params.score }]
        });
    };

    const submitBatchScores = async (params: SubmitBatchParams): Promise<boolean> => {
        try {
            setIsSubmitting(true);
            setError(null);

            const isScramble = params.scores.some((s: any) => s.team);

            let payload;
            let endpoint;

            if (isScramble) {
                payload = {
                    scores: params.scores.map((s: any) => ({
                        team: s.team,
                        holeNumber: s.hole,
                        grossScore: s.score,
                        mutationId: getMutationId()
                    }))
                };
                endpoint = `/events/${params.eventId}/flights/${params.flightId}/scramble-scores`;
            } else {
                payload = {
                    scores: params.scores.map(s => ({
                        playerId: s.playerId,
                        holeNumber: s.hole,
                        grossScore: s.score,
                        mutationId: getMutationId()
                    }))
                };
                endpoint = `/events/${params.eventId}/flights/${params.flightId}/scores`;
            }

            await api.put(endpoint, payload);
            return true;
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to submit scores');
            return false;
        } finally {
            setIsSubmitting(false);
        }
    };

    return { submitScore, submitBatchScores, isSubmitting, error };
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

export type { FlightScore };
