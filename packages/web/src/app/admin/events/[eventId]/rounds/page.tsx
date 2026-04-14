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

    if (!isAuthed) {
        return (
            <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
                <div className="bg-white rounded-lg p-6 shadow max-w-sm">
                    <p className="text-gray-700 mb-4">Admin auth required.</p>
                    <Link href={`/admin/events/${eventId}/players`} className="text-blue-600 underline">
                        Go to Admin Login →
                    </Link>
                </div>
            </div>
        );
    }

    if (loading) return <div className="p-8 text-center text-gray-500">Cargando…</div>;

    return (
        <div className="min-h-screen bg-gray-50 pb-24">
            <header className="bg-white border-b">
                <div className="max-w-3xl mx-auto px-4 py-4">
                    <Link href={`/admin/events/${eventId}/players`} className="text-sm text-blue-600">
                        ← Admin
                    </Link>
                    <h1 className="text-xl font-bold">Rounds</h1>
                </div>
            </header>

            <main className="max-w-3xl mx-auto px-4 py-4 space-y-3">
                {error && <div className="bg-red-50 text-red-600 text-sm px-4 py-2 rounded">{error}</div>}

                {rounds.map(r => (
                    <div key={r.id} className="bg-white rounded-lg p-4 shadow-sm">
                        <div className="flex items-center justify-between mb-3">
                            <div>
                                <div className="font-semibold">Round {r.roundNumber}</div>
                                <div className="text-sm text-gray-500">
                                    {r.scheduledAt ? new Date(r.scheduledAt).toLocaleString() : 'No scheduled time'}
                                </div>
                            </div>
                            <select
                                value={r.state}
                                onChange={e => updateRound(r.id, { state: e.target.value as Round['state'] })}
                                className="text-sm border border-gray-300 rounded px-2 py-1"
                            >
                                <option value="open">open</option>
                                <option value="completed">completed</option>
                                <option value="reopened">reopened</option>
                            </select>
                        </div>

                        <div className="grid grid-cols-2 gap-3 text-sm">
                            <label className="block">
                                <span className="text-xs text-gray-600">HCP Singles %</span>
                                <input
                                    type="number"
                                    step="0.01"
                                    min="0.01"
                                    max="1"
                                    defaultValue={r.hcpSinglesPct}
                                    onBlur={e => {
                                        const v = Number(e.target.value);
                                        if (v && v !== r.hcpSinglesPct) updateRound(r.id, { hcpSinglesPct: v });
                                    }}
                                    className="w-full mt-1 border border-gray-300 rounded px-2 py-1"
                                />
                            </label>
                            <label className="block">
                                <span className="text-xs text-gray-600">HCP Fourball %</span>
                                <input
                                    type="number"
                                    step="0.01"
                                    min="0.01"
                                    max="1"
                                    defaultValue={r.hcpFourballPct}
                                    onBlur={e => {
                                        const v = Number(e.target.value);
                                        if (v && v !== r.hcpFourballPct) updateRound(r.id, { hcpFourballPct: v });
                                    }}
                                    className="w-full mt-1 border border-gray-300 rounded px-2 py-1"
                                />
                            </label>
                        </div>

                        <div className="mt-3 flex gap-2">
                            <Link
                                href={`/admin/events/${eventId}/rounds/${r.id}/netos`}
                                className="text-sm text-blue-600"
                            >
                                Netos →
                            </Link>
                        </div>
                    </div>
                ))}

                {rounds.length === 0 && (
                    <div className="bg-white rounded-lg p-6 text-center text-gray-500 shadow-sm">
                        No hay rounds. Crea el evento con <code>npm run seed</code> o via API.
                    </div>
                )}
            </main>
        </div>
    );
}
