'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { api } from '@/lib/api';

const ADMIN_PASSWORD = 'Qayedc-1';
const ADMIN_KEY = 'admin_authenticated';

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

function EditPlayerModal({ player, tees, eventId, onSaved, onClose }: {
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
        if (!firstName.trim() || !lastName.trim()) {
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
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center">
            <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
            <div className="relative bg-cream w-full sm:max-w-md sm:rounded-2xl rounded-t-2xl shadow-xl gold-border p-5 pb-8 sm:pb-5">
                <h3 className="text-base font-bangers text-forest-deep mb-4">Editar Jugador</h3>

                <div className="space-y-3">
                    <div>
                        <label className="block text-xs font-bangers text-forest-deep/60 uppercase mb-1">Nombre</label>
                        <input
                            type="text"
                            value={firstName}
                            onChange={(e) => setFirstName(e.target.value)}
                            className="w-full px-3 py-2 border-2 border-gold-border/30 rounded-lg text-sm font-fredoka text-forest-deep focus:outline-none focus:ring-2 focus:ring-gold-border/50"
                            autoFocus
                        />
                    </div>
                    <div>
                        <label className="block text-xs font-bangers text-forest-deep/60 uppercase mb-1">Apellido</label>
                        <input
                            type="text"
                            value={lastName}
                            onChange={(e) => setLastName(e.target.value)}
                            className="w-full px-3 py-2 border-2 border-gold-border/30 rounded-lg text-sm font-fredoka text-forest-deep focus:outline-none focus:ring-2 focus:ring-gold-border/50"
                        />
                    </div>
                    <div>
                        <label className="block text-xs font-bangers text-forest-deep/60 uppercase mb-1">Handicap</label>
                        <input
                            type="number"
                            step="0.1"
                            min="-10"
                            max="54"
                            value={handicap}
                            onChange={(e) => setHandicap(e.target.value)}
                            className="w-full px-3 py-2 border-2 border-gold-border/30 rounded-lg text-sm font-fredoka text-forest-deep focus:outline-none focus:ring-2 focus:ring-gold-border/50"
                        />
                    </div>
                    <div>
                        <label className="block text-xs font-bangers text-forest-deep/60 uppercase mb-1">Tee</label>
                        <select
                            value={teeId}
                            onChange={(e) => setTeeId(e.target.value)}
                            className="w-full px-3 py-2 border-2 border-gold-border/30 rounded-lg text-sm font-fredoka text-forest-deep focus:outline-none focus:ring-2 focus:ring-gold-border/50 bg-white"
                        >
                            {tees.map(t => (
                                <option key={t.id} value={t.id}>{t.name}</option>
                            ))}
                        </select>
                    </div>
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
                        className="w-full mt-3 py-2 text-xs font-bangers text-brass bg-gold-light/20 border border-gold-border/30 rounded-xl hover:bg-gold-light/30 transition-colors"
                        disabled={saving}
                    >
                        Desvincular cuenta
                    </button>
                )}

                {error && <p className="text-team-red text-xs mt-3 font-fredoka">{error}</p>}

                <div className="flex gap-3 mt-5">
                    <button
                        onClick={onClose}
                        className="flex-1 py-2.5 text-sm font-bangers text-forest-deep/60 bg-forest-deep/5 rounded-xl hover:bg-forest-deep/10 transition-colors border border-gold-border/20"
                        disabled={saving}
                    >
                        Cancelar
                    </button>
                    <button
                        onClick={handleSave}
                        className="flex-1 py-2.5 text-sm font-bangers bevel-button rounded-xl disabled:opacity-50"
                        disabled={saving}
                    >
                        {saving ? 'Guardando...' : 'Guardar'}
                    </button>
                </div>
            </div>
        </div>
    );
}

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
            // Log in as admin user to get a JWT with admin privileges
            const res = await api.post<{ token: string }>('/auth/login', {
                email: 'organizer@par00.com',
                password: 'Par00',
            });
            api.setToken(res.token);
            sessionStorage.setItem(ADMIN_KEY, 'true');
            onAuthenticated();
        } catch {
            // Fallback: accept admin password even if API login fails
            sessionStorage.setItem(ADMIN_KEY, 'true');
            onAuthenticated();
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen flex flex-col">
            <header className="bg-forest-deep text-cream px-4 py-3 flex items-center justify-between gold-border">
                <div>
                    <h1 className="text-lg font-bangers metallic-text uppercase tracking-wider">Acceso Admin</h1>
                    <p className="text-[10px] text-cream/50 uppercase tracking-widest font-fredoka">Autenticación requerida</p>
                </div>
                <button
                    onClick={() => router.back()}
                    className="text-xs bg-white/10 hover:bg-white/20 px-3 py-1.5 rounded-lg transition-colors font-fredoka text-cream"
                >
                    Volver
                </button>
            </header>
            <div className="flex-1 flex items-center justify-center p-4">
                <form onSubmit={handleSubmit} className="bg-cream/90 backdrop-blur-sm gold-border rounded-2xl p-6 w-full max-w-sm">
                    <div className="text-center mb-6">
                        <div className="w-12 h-12 bg-forest-deep/10 rounded-full flex items-center justify-center mx-auto mb-3 border-2 border-gold-border/30">
                            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-forest-deep">
                                <rect width="18" height="11" x="3" y="11" rx="2" ry="2"/>
                                <path d="M7 11V7a5 5 0 0 1 10 0v4"/>
                            </svg>
                        </div>
                        <h2 className="text-lg font-bangers text-forest-deep">Login Admin</h2>
                        <p className="text-xs text-forest-deep/50 mt-1 font-fredoka">Ingresa la contraseña para continuar</p>
                    </div>
                    <input
                        type="password"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        placeholder="Contraseña"
                        className="w-full px-4 py-3 border-2 border-gold-border/30 rounded-xl text-sm font-fredoka text-forest-deep focus:outline-none focus:ring-2 focus:ring-gold-border/50 mb-3"
                        autoFocus
                    />
                    {error && <p className="text-team-red text-xs text-center mb-3 font-fredoka">{error}</p>}
                    <button
                        type="submit"
                        className="w-full py-3 bevel-button rounded-xl text-sm font-bangers disabled:opacity-50"
                        disabled={loading}
                    >
                        {loading ? 'Entrando...' : 'Entrar'}
                    </button>
                </form>
            </div>
        </div>
    );
}

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
            } catch (err) {
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
        alert('Link copiado al portapapeles!');
    };

    const handlePlayerSaved = (updated: Player) => {
        setPlayers(prev => prev.map(p => p.id === updated.id ? { ...p, ...updated } : p));
    };

    const getTeeName = (teeId: string) => {
        const tee = tees.find(t => t.id === teeId);
        return tee ? tee.name : '—';
    };

    if (!authenticated) {
        return <AdminLoginGate onAuthenticated={() => setAuthenticated(true)} />;
    }

    if (isLoading) return <div className="p-8 text-center font-fredoka text-cream/50">Cargando jugadores...</div>;
    if (error) return <div className="p-8 text-center text-team-red font-fredoka">{error}</div>;

    const redPlayers = players.filter(p => p.team === 'red');
    const bluePlayers = players.filter(p => p.team === 'blue');

    const renderTeamSection = (team: 'red' | 'blue', teamPlayers: Player[]) => (
        <div className="mb-6">
            <h2 className={`text-sm font-bangers uppercase tracking-widest px-4 py-2 rounded-t-xl ${team === 'red' ? 'text-team-red bg-team-red/10 border border-team-red/20' : 'text-team-blue bg-team-blue/10 border border-team-blue/20'}`}>
                {team === 'red' ? 'Red' : 'Blue'} ({teamPlayers.length})
            </h2>
            <div className="bg-cream rounded-b-xl gold-border overflow-hidden">
                <table className="w-full text-left">
                    <thead className="bg-forest-deep/5 border-b border-gold-border/20">
                        <tr>
                            <th className="px-4 py-3 text-xs font-bangers text-forest-deep/60 uppercase">Nombre</th>
                            <th className="px-4 py-3 text-xs font-bangers text-forest-deep/60 uppercase text-center">HCP</th>
                            <th className="px-4 py-3 text-xs font-bangers text-forest-deep/60 uppercase text-center">Tee</th>
                            <th className="px-4 py-3 text-xs font-bangers text-forest-deep/60 uppercase text-center">Estado</th>
                            <th className="px-4 py-3 text-xs font-bangers text-forest-deep/60 uppercase text-right">Invitación</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gold-border/10">
                        {teamPlayers.map(player => (
                            <tr key={player.id} className="hover:bg-forest-deep/5 cursor-pointer transition-colors" onClick={() => setEditingPlayer(player)}>
                                <td className="px-4 py-3 text-sm font-fredoka font-bold text-forest-deep">
                                    {player.firstName} {player.lastName}
                                </td>
                                <td className="px-4 py-3 text-center text-sm font-bangers text-brass">
                                    {player.handicapIndex}
                                </td>
                                <td className="px-4 py-3 text-center text-xs text-forest-deep/50 font-fredoka">
                                    {getTeeName(player.teeId)}
                                </td>
                                <td className="px-4 py-3 text-center">
                                    {player.userId ? (
                                        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bangers bg-forest-deep/10 text-forest-deep">Vinculado</span>
                                    ) : (
                                        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bangers bg-brass/10 text-brass">Pendiente</span>
                                    )}
                                </td>
                                <td className="px-4 py-3 text-right" onClick={(e) => e.stopPropagation()}>
                                    {player.userId ? (
                                        <span className="text-forest-deep/30 text-xs font-fredoka">Vinculado</span>
                                    ) : generatedLinks[player.id] ? (
                                        <div className="flex items-center justify-end gap-2">
                                            <input
                                                type="text"
                                                readOnly
                                                value={generatedLinks[player.id]}
                                                className="text-xs p-1 border-2 border-gold-border/20 rounded w-28 bg-cream font-fredoka"
                                            />
                                            <button
                                                onClick={() => copyToClipboard(generatedLinks[player.id])}
                                                className="text-xs bg-forest-deep/10 hover:bg-forest-deep/20 px-2 py-1 rounded font-bangers text-forest-deep transition-colors"
                                            >
                                                Copiar
                                            </button>
                                        </div>
                                    ) : (
                                        <button
                                            onClick={() => generateInvite(player.id)}
                                            className="text-xs bg-forest-deep text-cream px-3 py-1.5 rounded-lg hover:bg-forest-mid transition-colors font-bangers"
                                        >
                                            Generar Link
                                        </button>
                                    )}
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );

    return (
        <div className="min-h-screen">
            <header className="bg-forest-deep text-cream px-4 py-3 flex items-center justify-between gold-border">
                <div>
                    <h1 className="text-lg font-bangers metallic-text uppercase tracking-wider">Gestión de Jugadores</h1>
                    <p className="text-[10px] text-cream/50 uppercase tracking-widest font-fredoka">Panel Admin</p>
                </div>
                <button
                    onClick={() => router.back()}
                    className="text-xs bg-white/10 hover:bg-white/20 px-3 py-1.5 rounded-lg transition-colors font-fredoka text-cream"
                >
                    Volver
                </button>
            </header>

            <div className="max-w-2xl mx-auto p-4 pt-6">
                {renderTeamSection('red', redPlayers)}
                {renderTeamSection('blue', bluePlayers)}
            </div>

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
