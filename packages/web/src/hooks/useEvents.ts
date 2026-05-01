'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { api } from '@/lib/api';

export interface Event {
    id: string;
    name: string;
    status: 'draft' | 'live' | 'completed' | 'closed';
    eventCode: string;
    /** Per-bet amount in USD. `null` disables apuestas/predicciones for this event. */
    betAmount: number | null;
    createdAt: string;
    role?: 'organizer' | 'player';
}

export function useMyEvents() {
    const [events, setEvents] = useState<Event[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const fetchEvents = async () => {
        try {
            setIsLoading(true);
            const data = await api.get<{ events: Event[] }>('/events');
            setEvents(data.events || []);
            setError(null);
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to fetch events');
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        fetchEvents();
    }, []);

    return { events, isLoading, error, refetch: fetchEvents };
}

export function useEvent(eventId: string) {
    const [event, setEvent] = useState<Event | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        const fetchEvent = async () => {
            try {
                setIsLoading(true);
                const data = await api.get<{ event: Event }>(`/events/${eventId}`);
                setEvent(data.event);
                setError(null);
            } catch (err) {
                setError(err instanceof Error ? err.message : 'Failed to fetch event');
            } finally {
                setIsLoading(false);
            }
        };

        if (eventId) {
            fetchEvent();
        }
    }, [eventId]);

    return { event, isLoading, error };
}

/**
 * `useActiveEvent` — single source of truth for the user's currently selected event.
 *
 * Resolution order:
 *   1. localStorage (`la-romana.activeEventId`) if it points to an event the user still has access to
 *   2. The OLDEST live event the user belongs to (so the long-running tournament
 *      stays the default even after a side-event with a newer `created_at` is added)
 *   3. The oldest event in the list
 *
 * The setter persists the chosen ID to localStorage so the choice survives reloads
 * across all pages (apuestas, ranking, score, leaderboard, …).
 */
const ACTIVE_EVENT_KEY = 'la-romana.activeEventId';

const compareByCreatedAtAsc = (a: Event, b: Event): number =>
    (a.createdAt || '').localeCompare(b.createdAt || '');

export function useActiveEvent() {
    const { events, isLoading, error, refetch } = useMyEvents();
    const [storedId, setStoredId] = useState<string | null>(null);

    // Hydrate from localStorage once on the client.
    useEffect(() => {
        if (typeof window === 'undefined') return;
        try { setStoredId(window.localStorage.getItem(ACTIVE_EVENT_KEY)); } catch { /* ignore */ }
    }, []);

    const activeEvent = useMemo<Event | null>(() => {
        if (!events || events.length === 0) return null;
        const stored = storedId ? events.find(e => e.id === storedId) : null;
        if (stored) return stored;
        // Sort ascending by createdAt and pick the oldest live event. Falls back
        // to the oldest event of any status if no live events exist.
        const sorted = [...events].sort(compareByCreatedAtAsc);
        return sorted.find(e => e.status === 'live') || sorted[0] || null;
    }, [events, storedId]);

    const setActiveEvent = useCallback((eventId: string) => {
        setStoredId(eventId);
        if (typeof window !== 'undefined') {
            try { window.localStorage.setItem(ACTIVE_EVENT_KEY, eventId); } catch { /* ignore */ }
        }
    }, []);

    return { activeEvent, events, setActiveEvent, isLoading, error, refetch };
}

export function useJoinEvent() {
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const joinEvent = async (eventCode: string): Promise<Event | null> => {
        try {
            setIsLoading(true);
            setError(null);
            const data = await api.post<{ event: Event }>('/events/join', { eventCode });
            return data.event;
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to join event');
            return null;
        } finally {
            setIsLoading(false);
        }
    };

    return { joinEvent, isLoading, error };
}
