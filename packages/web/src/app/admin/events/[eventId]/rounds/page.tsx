'use client';

import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { api } from '@/lib/api';

const ADMIN_KEY = 'admin_authenticated';

interface Round {
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

interface Course {
    id: string;
    eventId: string;
    name: string;
}

export default function AdminRoundsPage() {
    const params = useParams();
    const eventId = params.eventId as string;

    const [isAuthed, setIsAuthed] = useState(false);
    const [rounds, setRounds] = useState<Round[]>([]);
    const [courses, setCourses] = useState<Course[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        if (typeof window !== 'undefined') {
            setIsAuthed(sessionStorage.getItem(ADMIN_KEY) === 'true');
        }
    }, []);

    const reload = async () => {
        setLoading(true);
        try {
            const rs = await api.get<Round[]>(`/events/${eventId}/rounds`);
            setRounds(rs);
            // Courses: use round.courseId to show names
            const uniqueCourseIds = Array.from(new Set(rs.map(r => r.courseId)));
            const cs: Course[] = [];
            for (const cid of uniqueCourseIds) {
                try {
                    const c = await api.get<Course>(`/events/${eventId}/course`);
                    if (c && !cs.find(x => x.id === c.id)) cs.push(c);
                } catch {
                    // Legacy single-course endpoint; ignore
                }
            }
            setCourses(cs);
            setError(null);
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to load rounds');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        if (eventId) reload();
    }, [eventId]);

    const updateRound = async (roundId: string, updates: Partial<Round>) => {
        try {
            await api.patch(`/events/${eventId}/rounds/${roundId}`, updates);
            await reload();
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Update failed');
        }
    };

    const CARD_DARK =
        'bg-gradient-to-b from-[#1c2f3e] to-[#0f172b] border-[2px] border-[#31316b] rounded-[16px] shadow-[0_4px_12px_rgba(0,0,0,0.5)]';

    const inputCls =
        'w-full mt-1 rounded-[10px] border-[2px] border-[#31316b] bg-[#0a1322] px-3 py-2 pr-8 ' +
        'font-bowlby text-base text-white outline-none focus:border-[#fbbc05]';
    const selectCls =
        'rounded-full border-[2px] border-[#31316b] bg-[#0a1322] px-3 py-1.5 ' +
        'font-bangers text-xs uppercase tracking-wider text-white/85 outline-none focus:border-[#fbbc05]';

    if (!isAuthed) {
        return (
            <div className="relative z-[1] flex min-h-full flex-col p-4 pb-24">
                <div className={`${CARD_DARK} mx-auto mt-8 max-w-sm p-6 text-center`}>
                    <p className="mb-3 font-fredoka text-white/75">Admin auth required.</p>
                    <Link
                        href={`/admin/events/${eventId}/players`}
                        className="font-bangers text-sm uppercase tracking-wider text-[#fbbc05]"
                    >
                        Ir al Login Admin →
                    </Link>
                </div>
            </div>
        );
    }

    if (loading) {
        return <div className="p-8 text-center font-fredoka text-white/60">Cargando…</div>;
    }

    return (
        <div className="relative z-[1] flex min-h-full flex-col pb-24">
            <header className="px-4 pt-6 pb-4">
                <Link
                    href={`/admin/events/${eventId}/players`}
                    className="font-bangers text-[11px] uppercase tracking-wider text-[#fbbc05]/80 hover:text-[#fbbc05]"
                >
                    ← Admin
                </Link>
                <div className="mt-1 font-bangers text-[11px] uppercase tracking-[0.22em] text-[#fbbc05]/85">
                    Composición
                </div>
                <div
                    className="font-bangers text-[40px] leading-[0.95] tracking-wide text-white"
                    style={{
                        WebkitTextStroke: '1.5px #07101b',
                        textShadow: '0 3px 0 rgba(7,16,27,0.85), 0 0 18px rgba(240,200,80,0.18)',
                    }}
                >
                    Rondas
                </div>
            </header>

            <main className="space-y-3 px-4">
                {error && (
                    <div className="rounded-[10px] border border-rose-500/40 bg-rose-900/30 px-3 py-2 font-fredoka text-xs text-rose-300">
                        {error}
                    </div>
                )}

                {rounds.map(r => (
                    <div key={r.id} className={`${CARD_DARK} p-4`}>
                        <div className="mb-3 flex items-start justify-between gap-3">
                            <div className="min-w-0">
                                <div className="font-bangers text-[10px] uppercase tracking-widest text-[#fbbc05]/85">
                                    Round {r.roundNumber}
                                </div>
                                <div className="mt-0.5 font-fredoka text-[11px] text-white/55">
                                    {r.scheduledAt ? new Date(r.scheduledAt).toLocaleString() : 'No scheduled time'}
                                </div>
                            </div>
                            <select
                                value={r.state}
                                onChange={e => updateRound(r.id, { state: e.target.value as Round['state'] })}
                                className={selectCls}
                            >
                                <option value="open">Abierto</option>
                                <option value="completed">Finalizado</option>
                                <option value="reopened">Reabierto</option>
                            </select>
                        </div>

                        <div className="grid grid-cols-2 gap-3">
                            <label className="block">
                                <span className="font-bangers text-[10px] uppercase tracking-wider text-white/65">
                                    HCP Singles (%)
                                </span>
                                <div className="relative">
                                    <input
                                        key={`s-${r.id}-${r.hcpSinglesPct}`}
                                        type="number"
                                        step="1"
                                        min="1"
                                        max="100"
                                        defaultValue={Math.round(r.hcpSinglesPct * 100)}
                                        onBlur={e => {
                                            const pct = Number(e.target.value);
                                            const v = pct / 100;
                                            if (pct >= 1 && pct <= 100 && v !== r.hcpSinglesPct) updateRound(r.id, { hcpSinglesPct: v });
                                        }}
                                        className={inputCls}
                                    />
                                    <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 font-bangers text-xs text-white/45">
                                        %
                                    </span>
                                </div>
                            </label>
                            <label className="block">
                                <span className="font-bangers text-[10px] uppercase tracking-wider text-white/65">
                                    HCP Fourball (%)
                                </span>
                                <div className="relative">
                                    <input
                                        key={`f-${r.id}-${r.hcpFourballPct}`}
                                        type="number"
                                        step="1"
                                        min="1"
                                        max="100"
                                        defaultValue={Math.round(r.hcpFourballPct * 100)}
                                        onBlur={e => {
                                            const pct = Number(e.target.value);
                                            const v = pct / 100;
                                            if (pct >= 1 && pct <= 100 && v !== r.hcpFourballPct) updateRound(r.id, { hcpFourballPct: v });
                                        }}
                                        className={inputCls}
                                    />
                                    <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 font-bangers text-xs text-white/45">
                                        %
                                    </span>
                                </div>
                            </label>
                        </div>
                        <div className="mt-2 font-fredoka text-[10px] text-white/40">
                            Valores comunes: 80% (default match play), 90% (competitivo), 100% (full)
                        </div>

                        <div className="mt-4">
                            <Link
                                href={`/admin/events/${eventId}/rounds/${r.id}/flights`}
                                className="block rounded-full border-[2px] border-[#1e293b] bg-gradient-to-b from-[#fce8b2] via-[#fbbc05] to-[#e37400] py-2 text-center font-bangers text-xs uppercase tracking-wider text-[#1e293b] shadow-[0_3px_0_#1e293b]"
                            >
                                Compose flights →
                            </Link>
                        </div>
                    </div>
                ))}

                {rounds.length === 0 && (
                    <div className={`${CARD_DARK} p-6 text-center font-fredoka text-white/55`}>
                        No hay rounds. Crea el evento con seed o via API.
                    </div>
                )}
            </main>
        </div>
    );
}
