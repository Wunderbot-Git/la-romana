'use client';

import { useState, useEffect, useCallback } from 'react';
import { api } from '@/lib/api';

export interface Round {
    id: string;
    eventId: string;
    roundNumber: number;
    courseId: string;
    scheduledAt: string | null;
    hcpSinglesPct: number;
    hcpFourballPct: number;
    state: 'open' | 'completed' | 'reopened';
    createdAt: string;
}

export function useRounds(eventId: string) {
    const [rounds, setRounds] = useState<Round[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const fetchRounds = useCallback(async () => {
        if (!eventId) return;
        try {
            setIsLoading(true);
            const data = await api.get<Round[]>(`/events/${eventId}/rounds`);
            setRounds(Array.isArray(data) ? data : []);
            setError(null);
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to fetch rounds');
        } finally {
            setIsLoading(false);
        }
    }, [eventId]);

    useEffect(() => {
        fetchRounds();
    }, [fetchRounds]);

    return { rounds, isLoading, error, refetch: fetchRounds };
}

export interface FlightWithPlayers {
    id: string;
    eventId: string;
    roundId: string;
    flightNumber: number;
    state: 'open' | 'completed' | 'reopened';
    createdAt: string;
    players: Array<{
        id: string;
        firstName: string;
        lastName: string;
        handicapIndex: number;
        team: 'red' | 'blue' | null;
        position: number | null;
        flightId: string | null;
    }>;
}

export function useRoundFlights(eventId: string, roundId: string | null) {
    const [flights, setFlights] = useState<FlightWithPlayers[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const fetchFlights = useCallback(async () => {
        if (!eventId || !roundId) return;
        try {
            setIsLoading(true);
            const data = await api.get<FlightWithPlayers[]>(`/events/${eventId}/rounds/${roundId}/flights`);
            setFlights(Array.isArray(data) ? data : []);
            setError(null);
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to fetch flights');
        } finally {
            setIsLoading(false);
        }
    }, [eventId, roundId]);

    useEffect(() => {
        fetchFlights();
    }, [fetchFlights]);

    return { flights, isLoading, error, refetch: fetchFlights };
}
