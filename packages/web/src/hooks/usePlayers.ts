'use client';

import { useState, useEffect } from 'react';
import { api } from '@/lib/api';

export interface Player {
    id: string;
    eventId: string;
    firstName: string;
    lastName: string;
    handicapIndex: number;
    teeId: string;
    flightId?: string;
    team?: 'red' | 'blue';
    position?: number;
    userId?: string;
    playerName: string; // Combined name for convenience if provided by API or mapper
}

export function usePlayers(eventId: string) {
    const [players, setPlayers] = useState<Player[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        const fetchPlayers = async () => {
            if (!eventId) {
                setIsLoading(false);
                return;
            }

            try {
                setIsLoading(true);
                const data = await api.get<Player[]>(`/events/${eventId}/players`);
                setPlayers(data);
                setError(null);
            } catch (err) {
                setError(err instanceof Error ? err.message : 'Failed to fetch players');
            } finally {
                setIsLoading(false);
            }
        };

        fetchPlayers();
    }, [eventId]);

    return { players, isLoading, error };
}
