'use client';

import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { api } from '@/lib/api';

const ADMIN_KEY = 'admin_authenticated';

interface Player {
    id: string;
    firstName: string;
    lastName: string;
    flightId?: string | null;
    team?: 'red' | 'blue' | null;
}

interface Flight {
    id: string;
    flightNumber: number;
    players: Player[];
}

interface NetoPot {
    id: string;
    roundId: string;
    flightId: string;
    potAmountUsd: number;
    createdAt: string;
    winners: Array<{ id: string; potId: string; playerId: string; rank: 1 | 2 }>;
}

export default function AdminNetosPage() {
    const params = useParams();
    const eventId = params.eventId as string;
    const roundId = params.roundId as string;

    const [isAuthed, setIsAuthed] = useState(false);
    const [flights, setFlights] = useState<Flight[]>([]);
    const [pots, setPots] = useState<NetoPot[]>([]);
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
            const [fs, ps] = await Promise.all([
                api.get<Flight[]>(`/events/${eventId}/rounds/${roundId}/flights`),
                api.get<NetoPot[]>(`/events/${eventId}/rounds/${roundId}/neto-pots`),
            ]);
            setFlights(fs);
            setPots(ps);
            setError(null);
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to load');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        if (eventId && roundId) reload();
    }, [eventId, roundId]);

    const createOrUpdatePot = async (flightId: string, amount: number) => {
        try {
            await api.post(`/events/${eventId}/rounds/${roundId}/neto-pots`, {
                roundId,
                flightId,
                potAmountUsd: amount,
            });
            await reload();
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Create pot failed');
        }
    };

    const setWinners = async (potId: string, winners: { playerId: string; rank: 1 | 2 }[]) => {
        try {
            await api.put(`/events/${eventId}/rounds/${roundId}/neto-pots/${potId}/winners`, { winners });
            await reload();
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Set winners failed');
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
                    <Link href={`/admin/events/${eventId}/rounds`} className="text-sm text-blue-600">
                        ← Rounds
                    </Link>
                    <h1 className="text-xl font-bold">Neto Pots</h1>
                </div>
            </header>

            <main className="max-w-3xl mx-auto px-4 py-4 space-y-3">
                {error && <div className="bg-red-50 text-red-600 text-sm px-4 py-2 rounded">{error}</div>}

                {flights.map(f => {
                    const pot = pots.find(p => p.flightId === f.id);
                    return (
                        <div key={f.id} className="bg-white rounded-lg p-4 shadow-sm">
                            <div className="mb-2 font-semibold">Grupo {f.flightNumber}</div>

                            <PotForm
                                initialAmount={pot?.potAmountUsd ?? 0}
                                onSave={(amount) => createOrUpdatePot(f.id, amount)}
                            />

                            {pot && (
                                <WinnersForm
                                    pot={pot}
                                    players={f.players}
                                    onSave={(winners) => setWinners(pot.id, winners)}
                                />
                            )}
                        </div>
                    );
                })}

                {flights.length === 0 && (
                    <div className="bg-white rounded-lg p-6 text-center text-gray-500 shadow-sm">
                        No hay flights en este round todavía.
                    </div>
                )}
            </main>
        </div>
    );
}

function PotForm({ initialAmount, onSave }: { initialAmount: number; onSave: (amt: number) => void }) {
    const [amount, setAmount] = useState(initialAmount);
    return (
        <div className="flex items-center gap-2 mb-3">
            <label className="text-sm text-gray-600">$</label>
            <input
                type="number"
                min="0"
                value={amount}
                onChange={(e) => setAmount(Number(e.target.value))}
                className="w-24 border border-gray-300 rounded px-2 py-1 text-sm"
            />
            <button
                onClick={() => onSave(amount)}
                className="px-3 py-1 bg-blue-600 text-white rounded text-sm"
            >
                {initialAmount > 0 ? 'Actualizar' : 'Crear pot'}
            </button>
        </div>
    );
}

function WinnersForm({
    pot,
    players,
    onSave,
}: {
    pot: NetoPot;
    players: Player[];
    onSave: (winners: { playerId: string; rank: 1 | 2 }[]) => void;
}) {
    const initial1 = pot.winners.find(w => w.rank === 1)?.playerId ?? '';
    const initial2 = pot.winners.find(w => w.rank === 2)?.playerId ?? '';
    const [p1, setP1] = useState(initial1);
    const [p2, setP2] = useState(initial2);

    return (
        <div className="border-t pt-3 space-y-2">
            <div className="text-xs uppercase text-gray-500 font-medium">Ganadores</div>
            <div className="flex items-center gap-2">
                <label className="text-sm w-6">#1</label>
                <select value={p1} onChange={(e) => setP1(e.target.value)} className="flex-1 border border-gray-300 rounded px-2 py-1 text-sm">
                    <option value="">—</option>
                    {players.map(p => (
                        <option key={p.id} value={p.id}>
                            {[p.firstName, p.lastName].filter(Boolean).join(' ')}
                        </option>
                    ))}
                </select>
            </div>
            <div className="flex items-center gap-2">
                <label className="text-sm w-6">#2</label>
                <select value={p2} onChange={(e) => setP2(e.target.value)} className="flex-1 border border-gray-300 rounded px-2 py-1 text-sm">
                    <option value="">—</option>
                    {players.map(p => (
                        <option key={p.id} value={p.id}>
                            {[p.firstName, p.lastName].filter(Boolean).join(' ')}
                        </option>
                    ))}
                </select>
            </div>
            <button
                onClick={() => {
                    const winners: { playerId: string; rank: 1 | 2 }[] = [];
                    if (p1) winners.push({ playerId: p1, rank: 1 });
                    if (p2) winners.push({ playerId: p2, rank: 2 });
                    if (winners.length > 0) onSave(winners);
                }}
                className="px-3 py-1 bg-blue-600 text-white rounded text-sm"
            >
                Guardar ganadores
            </button>
        </div>
    );
}
