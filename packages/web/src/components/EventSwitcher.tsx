'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { useActiveEvent } from '@/hooks/useEvents';

/**
 * Compact dropdown to switch between the events the logged-in user belongs to.
 * Hidden when the user only has one event. The selection persists in localStorage
 * via `useActiveEvent`, so all pages reading the active event stay in sync.
 */
export function EventSwitcher({ className = '' }: { className?: string }) {
    const { activeEvent, events, setActiveEvent } = useActiveEvent();
    const [open, setOpen] = useState(false);
    const wrapperRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (!open) return;
        const onClick = (e: MouseEvent) => {
            if (wrapperRef.current && !wrapperRef.current.contains(e.target as Node)) {
                setOpen(false);
            }
        };
        document.addEventListener('mousedown', onClick);
        return () => document.removeEventListener('mousedown', onClick);
    }, [open]);

    if (!events || events.length <= 1 || !activeEvent) return null;

    const statusBadge = (status: string): string => {
        switch (status) {
            case 'live': return 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40';
            case 'completed': return 'bg-white/8 text-white/55 border-white/15';
            case 'closed': return 'bg-rose-900/30 text-rose-300/85 border-rose-700/40';
            default: return 'bg-[#fbbc05]/15 text-[#fbbc05]/85 border-[#fbbc05]/30';
        }
    };

    return (
        <div ref={wrapperRef} className={`relative inline-block ${className}`}>
            <button
                type="button"
                onClick={() => setOpen(o => !o)}
                className="flex items-center gap-1.5 rounded-full border border-[#31316b] bg-[#0f172b]/80 px-3 py-1 font-bangers text-[11px] uppercase tracking-wider text-white/85 transition-colors hover:border-[#fbbc05]/55 hover:text-white"
            >
                <span className="max-w-[160px] truncate">{activeEvent.name}</span>
                <svg
                    width="10"
                    height="10"
                    viewBox="0 0 10 10"
                    className={`transition-transform ${open ? 'rotate-180' : ''}`}
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                >
                    <path d="M2 4l3 3 3-3" />
                </svg>
            </button>

            {open && (
                <div className="absolute right-0 top-full z-50 mt-1 min-w-[220px] overflow-hidden rounded-[12px] border-[2px] border-[#31316b] bg-[#0f172b] shadow-[0_8px_24px_rgba(0,0,0,0.55)]">
                    {events.map(ev => {
                        const active = ev.id === activeEvent.id;
                        return (
                            <button
                                key={ev.id}
                                type="button"
                                onClick={() => { setActiveEvent(ev.id); setOpen(false); }}
                                className={`flex w-full items-center justify-between gap-2 border-b border-[#31316b]/40 px-3 py-2 text-left transition-colors last:border-b-0 ${
                                    active ? 'bg-[#fbbc05]/10' : 'hover:bg-white/5'
                                }`}
                            >
                                <span className={`font-bangers text-xs uppercase tracking-wider ${active ? 'text-[#fbbc05]' : 'text-white/85'}`}>
                                    {ev.name}
                                </span>
                                <span className={`shrink-0 rounded-full border px-1.5 py-0.5 font-bangers text-[8px] uppercase tracking-wider ${statusBadge(ev.status)}`}>
                                    {ev.status}
                                </span>
                            </button>
                        );
                    })}

                    {/* Admin shortcuts. The /admin/* pages enforce their own
                        password-gated access, so we render the link for every
                        signed-in user — non-organizers just bounce off the
                        admin auth screen. */}
                    <div className="border-t-[2px] border-[#31316b]/60 bg-[#0a1322]/80">
                            <Link
                                href={`/admin/events/${activeEvent.id}/rounds`}
                                onClick={() => setOpen(false)}
                                className="flex items-center justify-between gap-2 px-3 py-2 text-left transition-colors hover:bg-white/5"
                            >
                                <span className="font-bangers text-[10px] uppercase tracking-wider text-white/55">Admin</span>
                                <span className="font-bangers text-[11px] uppercase tracking-wider text-[#fbbc05]">
                                    Rounds & Flights →
                                </span>
                            </Link>
                            <Link
                                href={`/admin/events/${activeEvent.id}/players`}
                                onClick={() => setOpen(false)}
                                className="flex items-center justify-between gap-2 border-t border-[#31316b]/40 px-3 py-2 text-left transition-colors hover:bg-white/5"
                            >
                                <span className="font-bangers text-[10px] uppercase tracking-wider text-white/55">Admin</span>
                                <span className="font-bangers text-[11px] uppercase tracking-wider text-[#fbbc05]">
                                    Players →
                                </span>
                            </Link>
                        </div>
                </div>
            )}
        </div>
    );
}
