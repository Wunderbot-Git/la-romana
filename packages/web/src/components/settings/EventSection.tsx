'use client';

import { useState } from 'react';
import { useJoinEvent } from '@/hooks/useEvents';

interface EventInfo {
    id: string;
    name: string;
    status: 'draft' | 'live' | 'completed' | 'closed';
    eventCode: string;
}

const STATUS_COLORS: Record<string, string> = {
    draft: 'bg-forest-mid/20 text-forest-deep/60',
    live: 'bg-green-100 text-green-700',
    completed: 'bg-team-blue/15 text-team-blue',
    closed: 'bg-forest-deep/10 text-forest-deep/50',
};

export function EventSection({ events, activeEvent, onEventJoined }: {
    events: EventInfo[];
    activeEvent: EventInfo | null;
    onEventJoined: () => void;
}) {
    const { joinEvent, isLoading: joinLoading, error: joinError } = useJoinEvent();
    const [joinCode, setJoinCode] = useState('');
    const [joinSuccess, setJoinSuccess] = useState(false);

    const handleJoin = async () => {
        if (!joinCode.trim()) return;
        const result = await joinEvent(joinCode.trim());
        if (result) {
            setJoinCode('');
            setJoinSuccess(true);
            onEventJoined();
            setTimeout(() => setJoinSuccess(false), 3000);
        }
    };

    return (
        <div className="bg-white thick-border rounded-[20px] p-4">
            <h2 className="text-xs font-bangers text-[#1e293b] uppercase tracking-widest mb-3">Eventos</h2>

            {activeEvent && (
                <div className="bg-forest-deep/5 rounded-xl p-3 mb-4 border border-gold-border/20">
                    <div className="flex items-center justify-between mb-1">
                        <p className="text-sm font-fredoka font-bold text-forest-deep">{activeEvent.name}</p>
                        <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bangers uppercase ${STATUS_COLORS[activeEvent.status] || STATUS_COLORS.draft}`}>
                            {activeEvent.status}
                        </span>
                    </div>
                    <p className="text-xs text-forest-deep/40 font-fredoka">
                        Código: <span className="font-mono font-bold text-forest-deep/70">{activeEvent.eventCode}</span>
                    </p>
                </div>
            )}

            {events.length > 1 && (
                <div className="mb-4">
                    <p className="text-[10px] font-bangers text-[#1e293b] uppercase tracking-widest mb-2">Tus Eventos</p>
                    <div className="space-y-2">
                        {events.filter(e => e.id !== activeEvent?.id).map(event => (
                            <div key={event.id} className="flex items-center justify-between py-2 px-3 bg-forest-deep/5 rounded-lg border border-gold-border/10">
                                <span className="text-sm font-fredoka font-medium text-forest-deep">{event.name}</span>
                                <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bangers uppercase ${STATUS_COLORS[event.status] || STATUS_COLORS.draft}`}>
                                    {event.status}
                                </span>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            <div>
                <p className="text-[10px] font-bangers text-[#1e293b] uppercase tracking-widest mb-2">Unirse a Evento</p>
                <div className="flex gap-2">
                    <input
                        type="text"
                        placeholder="Código del evento"
                        value={joinCode}
                        onChange={(e) => setJoinCode(e.target.value)}
                        className="flex-1 px-3 py-2 thick-border rounded-xl text-sm font-mono text-[#1e293b] focus:outline-none focus:ring-0 shadow-none"
                        onKeyDown={(e) => e.key === 'Enter' && handleJoin()}
                    />
                    <button
                        onClick={handleJoin}
                        disabled={joinLoading || !joinCode.trim()}
                        className="px-4 py-2 gold-button text-[#1e293b] shadow-[0_4px_0_#1e293b] active:translate-y-1 active:shadow-none font-bangers text-sm disabled:opacity-50"
                    >
                        {joinLoading ? '...' : 'Unirse'}
                    </button>
                </div>
                {joinError && <p className="text-xs text-red-500 mt-1 font-fredoka">{joinError}</p>}
                {joinSuccess && <p className="text-xs text-green-500 mt-1 font-fredoka">¡Te uniste exitosamente!</p>}
            </div>
        </div>
    );
}
