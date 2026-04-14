'use client';

import { useState, useEffect } from 'react';
import { api } from '@/lib/api';

interface Event {
    id: string;
    name: string;
    status: 'draft' | 'live' | 'completed' | 'closed';
    eventCode: string;
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
