'use client';

import { useMemo } from 'react';
import { useAuth } from '@/lib/auth';
import { useActiveEvent } from '@/hooks/useEvents';
import { usePlayers } from '@/hooks/usePlayers';
import { AccountSection } from './AccountSection';
import { EventSection } from './EventSection';
import { AdminSection } from './AdminSection';
import { AppInfoSection } from './AppInfoSection';

export function SettingsClient() {
    const { user } = useAuth();
    const { events, activeEvent, refetch: refetchEvents } = useActiveEvent();
    const eventId = activeEvent?.id || '';
    const { players } = usePlayers(eventId);

    const myPlayer = useMemo(() => {
        if (!user || !players) return null;
        const p = players.find(p => p.userId === user.id);
        if (!p) return null;
        return {
            playerName: p.playerName || `${p.firstName} ${p.lastName}`,
            team: p.team as 'red' | 'blue',
            handicapIndex: p.handicapIndex,
        };
    }, [user, players]);

    return (
        <div className="flex flex-col min-h-screen pb-20">
<main className="flex-1 overflow-auto px-4 py-4 space-y-4">
                <AccountSection player={myPlayer} />

                <EventSection
                    events={events}
                    activeEvent={activeEvent}
                    onEventJoined={refetchEvents}
                />

                {user?.appRole === 'admin' && eventId && (
                    <AdminSection eventId={eventId} />
                )}

                <AppInfoSection />
            </main>
        </div>
    );
}
