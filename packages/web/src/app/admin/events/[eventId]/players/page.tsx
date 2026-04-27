'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { api } from '@/lib/api';

const ADMIN_PASSWORD = 'Qayedc-1';
const ADMIN_KEY = 'admin_authenticated';

const CARD_DARK =
    'bg-gradient-to-b from-[#1c2f3e] to-[#0f172b] border-[2px] border-[#31316b] rounded-[16px] shadow-[0_4px_12px_rgba(0,0,0,0.5)]';
const INPUT_DARK =
    'w-full rounded-[10px] border-[2px] border-[#31316b] bg-[#0a1322] px-3 py-2 ' +
    'font-fredoka text-sm text-white outline-none focus:border-[#fbbc05]';
const PILL_PRIMARY =
    'rounded-full border-[2px] border-[#1e293b] bg-gradient-to-b from-[#fce8b2] via-[#fbbc05] to-[#e37400] ' +
    'px-4 py-2 font-bangers text-xs uppercase tracking-wider text-[#1e293b] shadow-[0_3px_0_#1e293b] disabled:opacity-50';
const PILL_GHOST =
    'rounded-full border-[2px] border-[#31316b] bg-[#0f172b]/70 px-4 py-2 ' +
    'font-bangers text-xs uppercase tracking-wider text-white/75 hover:text-white disabled:opacity-50';

interface Player {
    id: string;
    firstName: string;
    lastName: string;
    handicapIndex: number;
    teeId: string;
    team: 'red' | 'blue';
    flightId?: string;
    position?: number;
    userId?: string | null;
}

interface Tee {
    id?: string;
    name: string;
}

interface Course {
    id: string;
    eventId: string;
    name: string;
    tees: Tee[];
}

// ─── Edit Player Modal ──────────────────────────────────────────────────────

function EditPlayerModal({
    player,
    tees,
    eventId,
    onSaved,
    onClose,
}: {
    player: Player;
    tees: Tee[];
    eventId: string;
    onSaved: (updated: Player) => void;
    onClose: () => void;
}) {
    const [firstName, setFirstName] = useState(player.firstName);
    const [lastName, setLastName] = useState(player.lastName);
    const [handicap, setHandicap] = useState(String(player.handicapIndex));
    const [teeId, setTeeId] = useState(player.teeId);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState('');

    const handleSave = async () => {
        const hcp = parseFloat(handicap);
        if (isNaN(hcp) || hcp < -10 || hcp > 54) {
            setError('Handicap debe estar entre -10 y 54');
            return;
        }
        if (!firstName.trim()) {
            setError('El nombre no puede estar vacío');
            return;
        }
        try {
            setSaving(true);
            setError('');
            const updated = await api.put<Player>(`/events/${eventId}/players/${player.id}`, {
                firstName: firstName.trim(),
                lastName: lastName.trim(),
                handicapIndex: hcp,
                teeId,
            });
            onSaved(updated);
            onClose();
        } catch (err: any) {
            setError(err?.message || 'Error al guardar cambios');
        } finally {
            setSaving(false);
        }
    };

    return (
        <div className="fixed inset-0 z-[100] flex items-end justify-center sm:items-center">
            <div className="absolute inset-0 bg-black/65 backdrop-blur-sm" onClick={onClose} />
            <div className={`relative w-full ${CARD_DARK} sm:max-w-md rounded-t-[20px] sm:rounded-[20px] p-5 pb-[calc(env(safe-area-inset-bottom,0px)+1.25rem)]`}>
                <div className="mx-auto mb-3 h-1 w-12 rounded-full bg-white/15 sm:hidden" />
                <h3 className="mb-4 font-bangers text-base uppercase tracking-wider text-white">Editar Jugador</h3>

                <div className="space-y-3">
                    <Field label="Nombre">
                        <input
                            type="text"
                            value={firstName}
                            onChange={e => setFirstName(e.target.value)}
                            className={INPUT_DARK}
                            autoFocus
                        />
                    </Field>
                    <Field label="Apellido">
                        <input
                            type="text"
                            value={lastName}
                            onChange={e => setLastName(e.target.value)}
                            className={INPUT_DARK}
                        />
                    </Field>
                    <Field label="Handicap">
                        <input
                            type="number"
                            step="0.1"
                            min="-10"
                            max="54"
                            value={handicap}
                            onChange={e => setHandicap(e.target.value)}
                            className={INPUT_DARK}
                        />
                    </Field>
                    <Field label="Tee (default)">
                        <select
                            value={teeId}
                            onChange={e => setTeeId(e.target.value)}
                            className={INPUT_DARK}
                        >
                            {tees.map(t => (
                                <option key={t.id} value={t.id} className="bg-[#0a1322]">
                                    {t.name}
                                </option>
                            ))}
                        </select>
                    </Field>
                </div>

                {player.userId && (
                    <button
                        onClick={async () => {
                            if (!confirm('¿Desvincular cuenta de usuario de este jugador?')) return;
                            try {
                                setSaving(true);
                                const updated = await api.put<Player>(`/events/${eventId}/players/${player.id}`, { userId: null });
                                onSaved(updated);
                                onClose();
                            } catch {
                                setError('Error al desvincular jugador');
                            } finally {
                                setSaving(false);
                            }
                        }}
                        className="mt-3 w-full rounded-[12px] border border-rose-500/40 bg-rose-900/20 py-2 font-bangers text-xs uppercase tracking-wider text-rose-300 hover:bg-rose-900/30 disabled:opacity-50"
                        disabled={saving}
                    >
                        Desvincular cuenta
                    </button>
                )}

                {error && <p className="mt-3 font-fredoka text-xs text-rose-300">{error}</p>}

                <div className="mt-5 flex gap-3">
                    <button onClick={onClose} className={`flex-1 ${PILL_GHOST}`} disabled={saving}>
                        Cancelar
                    </button>
                    <button onClick={handleSave} className={`flex-1 ${PILL_PRIMARY}`} disabled={saving}>
                        {saving ? 'Guardando…' : 'Guardar'}
                    </button>
                </div>
            </div>
        </div>
    );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
    return (
        <label className="block">
            <span className="mb-1 block font-bangers text-[10px] uppercase tracking-wider text-white/65">{label}</span>
            {children}
        </label>
    );
}

// ─── Admin Login Gate ───────────────────────────────────────────────────────

function AdminLoginGate({ onAuthenticated }: { onAuthenticated: () => void }) {
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);
    const router = useRouter();

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');

        if (password !== ADMIN_PASSWORD) {
            setError('Contraseña incorrecta');
            return;
        }

        try {
            setLoading(true);
            // Log in as the LR organizer to get a JWT with admin privileges.
            const res = await api.post<{ token: string }>('/auth/login', {
                email: 'organizer@laromana.golf',
                password: 'Par00',
            });
            api.setToken(res.token);
            sessionStorage.setItem(ADMIN_KEY, 'true');
            onAuthenticated();
        } catch {
            // Fallback: accept admin password even if API login fails.
            sessionStorage.setItem(ADMIN_KEY, 'true');
            onAuthenticated();
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="relative z-[1] flex min-h-full flex-col pb-24">
            <header className="flex items-baseline justify-between px-4 pt-6 pb-4">
                <div>
                    <div className="font-bangers text-[11px] uppercase tracking-[0.22em] text-[#fbbc05]/85">Acceso Admin</div>
                    <div
                        className="font-bangers text-[36px] leading-[0.95] tracking-wide text-white"
                        style={{
                            WebkitTextStroke: '1.5px #07101b',
                            textShadow: '0 3px 0 rgba(7,16,27,0.85), 0 0 18px rgba(240,200,80,0.18)',
                        }}
                    >
                        Login
                    </div>
                </div>
                <button onClick={() => router.back()} className={PILL_GHOST}>
                    Volver
                </button>
            </header>

            <main className="flex flex-1 items-start justify-center px-4 pt-6">
                <form onSubmit={handleSubmit} className={`${CARD_DARK} w-full max-w-sm p-6`}>
                    <div className="mb-5 text-center">
                        <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full border-2 border-[#fbbc05]/40 bg-[#fbbc05]/10">
                            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#fbbc05" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                <rect width="18" height="11" x="3" y="11" rx="2" ry="2" />
                                <path d="M7 11V7a5 5 0 0 1 10 0v4" />
                            </svg>
                        </div>
                        <h2 className="font-bangers text-lg uppercase tracking-wider text-white">Login Admin</h2>
                        <p className="mt-1 font-fredoka text-xs text-white/55">Ingresa la contraseña para continuar</p>
                    </div>
                    <input
                        type="password"
                        value={password}
                        onChange={e => setPassword(e.target.value)}
                        placeholder="Contraseña"
                        className={`${INPUT_DARK} mb-3`}
                        autoFocus
                    />
                    {error && <p className="mb-3 text-center font-fredoka text-xs text-rose-300">{error}</p>}
                    <button type="submit" className={`w-full ${PILL_PRIMARY}`} disabled={loading}>
                        {loading ? 'Entrando…' : 'Entrar'}
                    </button>
                </form>
            </main>
        </div>
    );
}

// ─── Page ───────────────────────────────────────────────────────────────────

export default function AdminPlayersPage() {
    const params = useParams();
    const eventId = params.eventId as string;
    const router = useRouter();

    const [authenticated, setAuthenticated] = useState(false);
    const [players, setPlayers] = useState<Player[]>([]);
    const [tees, setTees] = useState<Tee[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState('');
    const [generatedLinks, setGeneratedLinks] = useState<Record<string, string>>({});
    const [editingPlayer, setEditingPlayer] = useState<Player | null>(null);

    useEffect(() => {
        if (typeof window !== 'undefined' && sessionStorage.getItem(ADMIN_KEY) === 'true') {
            setAuthenticated(true);
        }
    }, []);

    useEffect(() => {
        if (!authenticated) {
            setIsLoading(false);
            return;
        }
        const fetchData = async () => {
            try {
                setIsLoading(true);
                const [playersData, courseData] = await Promise.all([
                    api.get<Player[]>(`/events/${eventId}/players`),
                    api.get<Course>(`/events/${eventId}/course`).catch(() => null),
                ]);
                setPlayers(playersData);
                if (courseData) setTees(courseData.tees);
            } catch {
                setError('Error al cargar jugadores');
            } finally {
                setIsLoading(false);
            }
        };
        fetchData();
    }, [eventId, authenticated]);

    const generateInvite = async (playerId: string) => {
        try {
            const res = await api.post<{ inviteId: string }>(`/admin/events/${eventId}/players/${playerId}/invite`, {});
            const inviteUrl = `${window.location.origin}/invite/${res.inviteId}`;
            setGeneratedLinks(prev => ({ ...prev, [playerId]: inviteUrl }));
        } catch (err: any) {
            alert(err.message || 'Error al generar invitación');
        }
    };

    const copyToClipboard = (text: string) => {
        navigator.clipboard.writeText(text);
        alert('Link copiado al portapapeles');
    };

    const handlePlayerSaved = (updated: Player) =>
        setPlayers(prev => prev.map(p => (p.id === updated.id ? { ...p, ...updated } : p)));

    const getTeeName = (teeId: string) => tees.find(t => t.id === teeId)?.name ?? '—';

    if (!authenticated) return <AdminLoginGate onAuthenticated={() => setAuthenticated(true)} />;
    if (isLoading)
        return <div className="p-8 text-center font-fredoka text-white/60">Cargando jugadores…</div>;
    if (error)
        return <div className="p-8 text-center font-fredoka text-rose-300">{error}</div>;

    const redPlayers = players.filter(p => p.team === 'red').sort((a, b) => a.firstName.localeCompare(b.firstName));
    const bluePlayers = players.filter(p => p.team === 'blue').sort((a, b) => a.firstName.localeCompare(b.firstName));

    const renderTeamSection = (team: 'red' | 'blue', teamPlayers: Player[]) => {
        const teamLabel = team === 'red' ? 'Piratas' : 'Fantasmas';
        const headerClass =
            team === 'red'
                ? 'border-team-red/40 bg-team-red/15 text-team-red'
                : 'border-team-blue/40 bg-team-blue/15 text-team-blue';
        return (
            <section className="mb-5">
                <div className={`rounded-t-[14px] border-[2px] ${headerClass} px-4 py-2 font-bangers text-sm uppercase tracking-wider`}>
                    {teamLabel} <span className="text-white/55">({teamPlayers.length})</span>
                </div>
                <div className={`${CARD_DARK} rounded-t-none border-t-0 overflow-hidden`}>
                    {teamPlayers.length === 0 ? (
                        <div className="px-4 py-6 text-center font-fredoka text-sm italic text-white/40">
                            Ningún jugador asignado.
                        </div>
                    ) : (
                        <div className="divide-y divide-[#31316b]/40">
                            {teamPlayers.map(player => {
                                const link = generatedLinks[player.id];
                                return (
                                    <div
                                        key={player.id}
                                        onClick={() => setEditingPlayer(player)}
                                        className="flex cursor-pointer items-center gap-3 px-4 py-3 hover:bg-[#0f172b]/60"
                                    >
                                        <div className="flex-1 min-w-0">
                                            <div className="font-bangers text-base tracking-wider text-white truncate">
                                                {player.firstName} {player.lastName}
                                            </div>
                                            <div className="mt-0.5 flex items-baseline gap-2 font-fredoka text-[11px] text-white/55">
                                                <span>HCP <span className="text-[#fbbc05]">{player.handicapIndex}</span></span>
                                                <span>·</span>
                                                <span>Tee <span className="text-white/85">{getTeeName(player.teeId)}</span></span>
                                            </div>
                                        </div>
                                        <div onClick={e => e.stopPropagation()} className="flex flex-col items-end gap-1">
                                            {player.userId ? (
                                                <span className="rounded-full bg-emerald-500/15 px-2 py-0.5 font-bangers text-[9px] uppercase tracking-wider text-emerald-300">
                                                    Vinculado
                                                </span>
                                            ) : link ? (
                                                <button
                                                    onClick={() => copyToClipboard(link)}
                                                    className="rounded-full border border-[#fbbc05]/40 bg-[#fbbc05]/10 px-2.5 py-1 font-bangers text-[10px] uppercase tracking-wider text-[#fbbc05]"
                                                    title={link}
                                                >
                                                    Copiar Link
                                                </button>
                                            ) : (
                                                <>
                                                    <span className="rounded-full bg-[#fbbc05]/15 px-2 py-0.5 font-bangers text-[9px] uppercase tracking-wider text-[#fbbc05]/85">
                                                        Pendiente
                                                    </span>
                                                    <button
                                                        onClick={() => generateInvite(player.id)}
                                                        className="rounded-full border border-[#fbbc05]/40 bg-[#fbbc05]/5 px-2.5 py-0.5 font-bangers text-[10px] uppercase tracking-wider text-[#fbbc05]/90 hover:bg-[#fbbc05]/10"
                                                    >
                                                        Generar Link
                                                    </button>
                                                </>
                                            )}
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </div>
            </section>
        );
    };

    return (
        <div className="relative z-[1] flex min-h-full flex-col pb-24">
            <header className="flex items-baseline justify-between px-4 pt-6 pb-4">
                <div className="min-w-0">
                    <div className="font-bangers text-[11px] uppercase tracking-[0.22em] text-[#fbbc05]/85">
                        Panel Admin
                    </div>
                    <div
                        className="font-bangers text-[36px] leading-[0.95] tracking-wide text-white"
                        style={{
                            WebkitTextStroke: '1.5px #07101b',
                            textShadow: '0 3px 0 rgba(7,16,27,0.85), 0 0 18px rgba(240,200,80,0.18)',
                        }}
                    >
                        Jugadores
                    </div>
                </div>
                <button onClick={() => router.back()} className={PILL_GHOST}>
                    Volver
                </button>
            </header>

            <main className="px-4">
                {renderTeamSection('red', redPlayers)}
                {renderTeamSection('blue', bluePlayers)}
                <div className="mt-2 font-fredoka text-[10px] italic text-white/40">
                    Tip: el tee mostrado aquí es el <span className="text-white/65">default</span>. Para asignar un tee diferente solo en una ronda específica, abre la página de <span className="text-[#fbbc05]/85">Compose flights</span> de esa ronda.
                </div>
            </main>

            {editingPlayer && (
                <EditPlayerModal
                    player={editingPlayer}
                    tees={tees}
                    eventId={eventId}
                    onSaved={handlePlayerSaved}
                    onClose={() => setEditingPlayer(null)}
                />
            )}
        </div>
    );
}
