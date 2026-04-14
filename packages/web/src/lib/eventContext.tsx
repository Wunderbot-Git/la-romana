'use client';

import { createContext, useContext, ReactNode } from 'react';
import { useEvent } from '@/hooks/useEvents';

interface Event {
    id: string;
    name: string;
    status: 'draft' | 'live' | 'completed' | 'closed';
    eventCode: string;
    createdAt: string;
    role?: 'organizer' | 'player';
}

interface EventContextType {
    event: Event | null;
    isLoading: boolean;
    error: string | null;
}

const EventContext = createContext<EventContextType | null>(null);

export function EventProvider({
    eventId,
    children,
}: {
    eventId: string;
    children: ReactNode;
}) {
    const { event, isLoading, error } = useEvent(eventId);

    return (
        <EventContext.Provider value={{ event, isLoading, error }}>
            {children}
        </EventContext.Provider>
    );
}

export function useEventContext() {
    const context = useContext(EventContext);
    if (!context) {
        throw new Error('useEventContext must be used within an EventProvider');
    }
    return context;
}
