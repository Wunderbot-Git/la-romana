'use client';

/**
 * Admin: Compose flights for a single round.
 *
 *   /admin/events/[eventId]/rounds/[roundId]/flights
 *
 * Backed by the per-round `player_flights` junction (migration 025), so the
 * organizer can create different pairings for each round without losing
 * earlier rounds' composition.
 *
 * Each flight has 4 slots: Red P1, Red P2, Blue P1, Blue P2.
 * Per slot a dropdown picks from the unassigned roster (+ currently-here player).
 * Each filled slot shows a Playing Handicap snapshot for THIS round
 * (course-aware: factors in the player's tee slope/rating + round allowances).
 */

import { useState, useEffect, useMemo, useCallback } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { api } from '@/lib/api';
import { Avatar } from '@/components/Avatar';

const ADMIN_KEY = 'admin_authenticated';
type Team = 'red' | 'blue';

interface Round {
    id: string;
    eventId: string;
    roundNumber: number;
    courseId: string;
    hcpSinglesPct: number;
    hcpFourballPct: number;
}

interface Flight {
    id: string;
    flightNumber: number;
    state: 'open' | 'completed' | 'reopened';
}

interface Assignment {
    id: string;
    playerId: string;
    roundId: string;
    flightId: string;
    team: Team;
    position: 1 | 2;
}

interface CourseDetail {
    id: string;
    name: string;
    tees: Array<{
        id: string;
        name: string;
        slopeRating: number | null;
        courseRating: number | null;
        par: number;
    }>;
}

interface PlayingHandicap {
    playerId: string;
    playerName: string;
    handicapIndex: number;
    teeId: string | null;
    teeName: string | null;
    coursePar: number | null;
    slopeRating: number | null;
    courseRating: number | null;
    courseHandicap: number | null;
    playingHcpSingles: number | null;
    playingHcpFourball: number | null;
}

const SLOT_KEYS: Array<{ team: Team; position: 1 | 2; label: string }> = [
    { team: 'red',  position: 1, label: 'Red 1 (Piratas)'   },
    { team: 'red',  position: 2, label: 'Red 2 (Piratas)'   },
    { team: 'blue', position: 1, label: 'Blue 1 (Fantasmas)'},
    { team: 'blue', position: 2, label: 'Blue 2 (Fantasmas)'},
];

const slotKey = (flightId: string, team: Team, position: 1 | 2) =>
    `${flightId}|${team}|${position}`;

export default function AdminFlightsComposePage() {
    const params = useParams();
    const eventId = params.eventId as string;
    const roundId = params.roundId as string;

    const [isAuthed, setIsAuthed] = useState(false);
    const [rounds, setRounds] = useState<Round[]>([]);
    const [flights, setFlights] = useState<Flight[]>([]);
    const [assignments, setAssignments] = useState<Assignment[]>([]);
    const [phs, setPhs] = useState<PlayingHandicap[]>([]);
    const [course, setCourse] = useState<CourseDetail | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [busy, setBusy] = useState(false);

    useEffect(() => {
        if (typeof window !== 'undefined') {
            setIsAuthed(sessionStorage.getItem(ADMIN_KEY) === 'true');
        }
    }, []);

    const reload = useCallback(async () => {
        setLoading(true);
        try {
            const [rs, fs, as, hs] = await Promise.all([
                api.get<Round[]>(`/events/${eventId}/rounds`),
                api.get<Flight[]>(`/events/${eventId}/rounds/${roundId}/flights`),
                api.get<Assignment[]>(`/events/${eventId}/rounds/${roundId}/assignments`),
                api.get<PlayingHandicap[]>(`/events/${eventId}/rounds/${roundId}/playing-handicaps`),
            ]);
            setRounds(rs);
            setFlights(fs.sort((a, b) => a.flightNumber - b.flightNumber));
            setAssignments(as);
            setPhs(hs);
            // Load course (tees + slope/rating) for the round's course
            const round = rs.find(r => r.id === roundId);
            if (round) {
                try {
                    const c = await api.get<CourseDetail>(
                        `/events/${eventId}/courses/${round.courseId}`
                    );
                    setCourse(c);
                } catch {
                    setCourse(null);
                }
            }
            setError(null);
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to load');
        } finally {
            setLoading(false);
        }
    }, [eventId, roundId]);

    useEffect(() => {
        if (eventId && roundId) reload();
    }, [eventId, roundId, reload]);

    const phsById = useMemo(() => new Map(phs.map(p => [p.playerId, p])), [phs]);
    const assignmentBySlot = useMemo(() => {
        const map = new Map<string, Assignment>();
        for (const a of assignments) map.set(slotKey(a.flightId, a.team, a.position), a);
        return map;
    }, [assignments]);
    const assignedPlayerIdsThisRound = useMemo(
        () => new Set(assignments.map(a => a.playerId)),
        [assignments]
    );

    const round = rounds.find(r => r.id === roundId);
    const otherRounds = rounds.filter(r => r.id !== roundId);

    const createFourFlights = async () => {
        setBusy(true);
        try {
            await api.post(`/events/${eventId}/flights`, { count: 4, roundId });
            await reload();
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Create flights failed');
        } finally {
            setBusy(false);
        }
    };

    const saveTeeRating = async (
        teeId: string,
        slopeRating: number | null,
        courseRating: number | null,
    ) => {
        if (!course) return;
        setBusy(true);
        try {
            await api.patch(
                `/events/${eventId}/courses/${course.id}/tees/${teeId}`,
                { slopeRating, courseRating }
            );
            await reload();
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Save failed');
        } finally {
            setBusy(false);
        }
    };

    const setPlayerTee = async (playerId: string, teeId: string | null) => {
        setBusy(true);
        try {
            await api.put(
                `/events/${eventId}/rounds/${roundId}/players/${playerId}/tee`,
                { teeId }
            );
            await reload();
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Set tee failed');
        } finally {
            setBusy(false);
        }
    };

    const updateAllowance = async (field: 'hcpSinglesPct' | 'hcpFourballPct', pct: number) => {
        if (pct < 1 || pct > 100) return;
        setBusy(true);
        try {
            await api.patch(`/events/${eventId}/rounds/${roundId}`, { [field]: pct / 100 });
            await reload();
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Update allowance failed');
        } finally {
            setBusy(false);
        }
    };

    const onSlotChange = async (flight: Flight, team: Team, position: 1 | 2, newPlayerId: string) => {
        setBusy(true);
        setError(null);
        try {
            if (newPlayerId === '') {
                // Unassign whoever is in this slot
                const existing = assignmentBySlot.get(slotKey(flight.id, team, position));
                if (existing) {
                    await api.post(
                        `/events/${eventId}/rounds/${roundId}/flights/${flight.id}/unassign`,
                        { playerId: existing.playerId }
                    );
                }
            } else {
                await api.post(
                    `/events/${eventId}/rounds/${roundId}/flights/${flight.id}/assign`,
                    { playerId: newPlayerId, team, position }
                );
            }
            await reload();
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Update failed');
        } finally {
            setBusy(false);
        }
    };

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

    if (loading)
        return <div className="p-8 text-center font-fredoka text-white/60">Cargando…</div>;
    if (!round)
        return <div className="p-8 text-center font-fredoka text-rose-300">Round no encontrado.</div>;

    const totalSlots = flights.length * 4;
    const filledSlots = assignments.length;

    return (
        <div className="relative z-[1] flex min-h-full flex-col pb-24">
            <header className="px-4 pt-6 pb-4">
                <Link
                    href={`/admin/events/${eventId}/rounds`}
                    className="font-bangers text-[11px] uppercase tracking-wider text-[#fbbc05]/80 hover:text-[#fbbc05]"
                >
                    ← Rondas
                </Link>
                <div className="mt-1 font-bangers text-[11px] uppercase tracking-[0.22em] text-[#fbbc05]/85">
                    Round {round.roundNumber} · Composición
                </div>
                <div
                    className="font-bangers text-[36px] leading-[0.95] tracking-wide text-white"
                    style={{
                        WebkitTextStroke: '1.5px #07101b',
                        textShadow: '0 3px 0 rgba(7,16,27,0.85), 0 0 18px rgba(240,200,80,0.18)',
                    }}
                >
                    Compose Flights
                </div>
                <div className="mt-1 font-fredoka text-[11px] uppercase tracking-wider text-white/55">
                    Slots: <span className="text-[#fbbc05]">{filledSlots}/{totalSlots || '—'}</span>
                </div>

                {/* Allowance + round-switcher */}
                <div className={`${CARD_DARK} mt-4 px-3 py-3`}>
                    <div className="flex flex-wrap items-end gap-3">
                        <div className="font-bangers text-[10px] uppercase tracking-wider text-white/65">
                            Allowance
                        </div>
                        <AllowanceInput
                            label="Singles"
                            keySuffix={String(round.hcpSinglesPct)}
                            initial={Math.round(round.hcpSinglesPct * 100)}
                            disabled={busy}
                            onCommit={pct => updateAllowance('hcpSinglesPct', pct)}
                        />
                        <AllowanceInput
                            label="Fourball"
                            keySuffix={String(round.hcpFourballPct)}
                            initial={Math.round(round.hcpFourballPct * 100)}
                            disabled={busy}
                            onCommit={pct => updateAllowance('hcpFourballPct', pct)}
                        />
                    </div>
                    <div className="mt-1.5 font-fredoka text-[10px] text-white/40">
                        Cambia → todos los PH abajo se recalculan.
                    </div>
                    {otherRounds.length > 0 && (
                        <div className="mt-3 flex items-center gap-2">
                            <span className="font-bangers text-[10px] uppercase tracking-wider text-white/55">
                                Cambiar de ronda:
                            </span>
                            {otherRounds.map(r => (
                                <Link
                                    key={r.id}
                                    href={`/admin/events/${eventId}/rounds/${r.id}/flights`}
                                    className="rounded-full border-[2px] border-[#31316b] bg-[#0f172b]/70 px-3 py-1 font-bangers text-[10px] uppercase tracking-wider text-white/75 hover:text-white"
                                >
                                    R{r.roundNumber}
                                </Link>
                            ))}
                        </div>
                    )}
                </div>
            </header>

            <main className="space-y-3 px-4">
                {error && (
                    <div className="rounded-[10px] border border-rose-500/40 bg-rose-900/30 px-3 py-2 font-fredoka text-xs text-rose-300">
                        {error}
                    </div>
                )}

                {course && <TeeRatingsPanel course={course} onSave={saveTeeRating} busy={busy} />}

                {flights.length === 0 ? (
                    <div className={`${CARD_DARK} p-6 text-center`}>
                        <p className="mb-4 font-fredoka text-white/70">
                            No hay flights en esta ronda todavía.
                        </p>
                        <button
                            onClick={createFourFlights}
                            disabled={busy}
                            className={PILL_PRIMARY}
                        >
                            Crear 4 flights
                        </button>
                    </div>
                ) : (
                    flights.map(flight => (
                        <FlightCard
                            key={flight.id}
                            flight={flight}
                            assignmentBySlot={assignmentBySlot}
                            assignedPlayerIdsThisRound={assignedPlayerIdsThisRound}
                            phs={phs}
                            phsById={phsById}
                            onChange={onSlotChange}
                            onSetPlayerTee={setPlayerTee}
                            course={course}
                            busy={busy}
                        />
                    ))
                )}
            </main>
        </div>
    );
}

// ── Theme tokens ────────────────────────────────────────────────────────────

const CARD_DARK =
    'bg-gradient-to-b from-[#1c2f3e] to-[#0f172b] border-[2px] border-[#31316b] rounded-[16px] shadow-[0_4px_12px_rgba(0,0,0,0.5)]';
const INPUT_DARK =
    'rounded-[10px] border-[2px] border-[#31316b] bg-[#0a1322] px-2.5 py-1.5 ' +
    'font-fredoka text-sm text-white outline-none focus:border-[#fbbc05] disabled:opacity-50';
const PILL_PRIMARY =
    'rounded-full border-[2px] border-[#1e293b] bg-gradient-to-b from-[#fce8b2] via-[#fbbc05] to-[#e37400] ' +
    'px-4 py-2 font-bangers text-xs uppercase tracking-wider text-[#1e293b] shadow-[0_3px_0_#1e293b] disabled:opacity-50';

function AllowanceInput({
    label,
    keySuffix,
    initial,
    disabled,
    onCommit,
}: {
    label: string;
    keySuffix: string;
    initial: number;
    disabled: boolean;
    onCommit: (pct: number) => void;
}) {
    return (
        <label className="flex items-center gap-1.5">
            <span className="font-bangers text-[10px] uppercase tracking-wider text-white/55">{label}</span>
            <span className="relative inline-block">
                <input
                    key={`${label}-${keySuffix}`}
                    type="number"
                    step="1"
                    min="1"
                    max="100"
                    defaultValue={initial}
                    onBlur={e => onCommit(Number(e.target.value))}
                    disabled={disabled}
                    className={`${INPUT_DARK} w-16 pr-6 text-center font-bowlby`}
                />
                <span className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 font-bangers text-[10px] text-white/45">
                    %
                </span>
            </span>
        </label>
    );
}

function TeeRatingsPanel({
    course,
    onSave,
    busy,
}: {
    course: CourseDetail;
    onSave: (teeId: string, slope: number | null, rating: number | null) => void;
    busy: boolean;
}) {
    const [open, setOpen] = useState(false);
    return (
        <div className={`${CARD_DARK} overflow-hidden`}>
            <button
                onClick={() => setOpen(o => !o)}
                className="flex w-full items-center justify-between px-4 py-3 text-left hover:bg-[#0f172b]/40"
            >
                <div className="min-w-0">
                    <div className="font-bangers text-sm uppercase tracking-wider text-white">
                        {course.name} <span className="text-[#fbbc05]/85">— tees</span>
                    </div>
                    <div className="font-fredoka text-[10px] text-white/55">
                        Slope + Rating por tee — alimenta la fórmula USGA Course HCP
                    </div>
                </div>
                <span className={`font-bangers text-base text-[#fbbc05] transition-transform ${open ? 'rotate-90' : ''}`}>▸</span>
            </button>
            {open && (
                <div className="space-y-2 border-t border-[#31316b]/60 px-4 pb-4 pt-2">
                    {course.tees.map(tee => (
                        <TeeRatingRow key={tee.id} tee={tee} onSave={onSave} busy={busy} />
                    ))}
                    {course.tees.length === 0 && (
                        <div className="py-2 font-fredoka text-sm italic text-white/40">No tees set up.</div>
                    )}
                </div>
            )}
        </div>
    );
}

function TeeRatingRow({
    tee,
    onSave,
    busy,
}: {
    tee: CourseDetail['tees'][number];
    onSave: (teeId: string, slope: number | null, rating: number | null) => void;
    busy: boolean;
}) {
    const [slope, setSlope] = useState<string>(tee.slopeRating != null ? String(tee.slopeRating) : '');
    const [rating, setRating] = useState<string>(tee.courseRating != null ? String(tee.courseRating) : '');
    const dirty =
        (slope === '' ? null : Number(slope)) !== tee.slopeRating ||
        (rating === '' ? null : Number(rating)) !== tee.courseRating;
    return (
        <div className="grid grid-cols-[80px_1fr_1fr_44px_auto] items-end gap-2 pt-2">
            <div>
                <div className="font-bangers text-[9px] uppercase tracking-wider text-white/55">Tee</div>
                <div className="font-bangers text-sm tracking-wider text-white">{tee.name}</div>
            </div>
            <label className="block">
                <span className="font-bangers text-[9px] uppercase tracking-wider text-white/55">Slope</span>
                <input
                    type="number"
                    step="0.1" min="55" max="155"
                    value={slope}
                    onChange={e => setSlope(e.target.value)}
                    className={`${INPUT_DARK} mt-0.5 w-full`}
                />
            </label>
            <label className="block">
                <span className="font-bangers text-[9px] uppercase tracking-wider text-white/55">Rating</span>
                <input
                    type="number"
                    step="0.1" min="50" max="80"
                    value={rating}
                    onChange={e => setRating(e.target.value)}
                    className={`${INPUT_DARK} mt-0.5 w-full`}
                />
            </label>
            <div>
                <div className="font-bangers text-[9px] uppercase tracking-wider text-white/55">Par</div>
                <div className="font-bowlby text-sm text-white">{tee.par || '—'}</div>
            </div>
            <button
                disabled={!dirty || busy}
                onClick={() => onSave(
                    tee.id,
                    slope === '' ? null : Number(slope),
                    rating === '' ? null : Number(rating),
                )}
                className="rounded-full border border-[#fbbc05]/40 bg-[#fbbc05]/15 px-3 py-1.5 font-bangers text-[10px] uppercase tracking-wider text-[#fbbc05] disabled:opacity-30"
            >
                Save
            </button>
        </div>
    );
}

function FlightCard({
    flight,
    assignmentBySlot,
    assignedPlayerIdsThisRound,
    phs,
    phsById,
    onChange,
    onSetPlayerTee,
    course,
    busy,
}: {
    flight: Flight;
    assignmentBySlot: Map<string, Assignment>;
    assignedPlayerIdsThisRound: Set<string>;
    phs: PlayingHandicap[];
    phsById: Map<string, PlayingHandicap>;
    onChange: (flight: Flight, team: Team, position: 1 | 2, newPlayerId: string) => void;
    onSetPlayerTee: (playerId: string, teeId: string | null) => void;
    course: CourseDetail | null;
    busy: boolean;
}) {
    return (
        <div className={`${CARD_DARK} p-4`}>
            <div className="mb-3 flex items-center justify-between">
                <h2 className="font-bangers text-base uppercase tracking-wider text-[#fbbc05]">
                    Grupo {flight.flightNumber}
                </h2>
                <span className="rounded-full bg-white/8 px-2 py-0.5 font-bangers text-[10px] uppercase tracking-wider text-white/65">
                    {flight.state === 'open' ? 'Abierto' : flight.state === 'completed' ? 'Finalizado' : 'Reabierto'}
                </span>
            </div>

            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                {SLOT_KEYS.map(slot => {
                    const a = assignmentBySlot.get(slotKey(flight.id, slot.team, slot.position));
                    const currentId = a?.playerId ?? '';
                    const options = phs
                        .filter(p => !assignedPlayerIdsThisRound.has(p.playerId) || p.playerId === currentId)
                        .sort((a, b) => a.playerName.localeCompare(b.playerName));
                    const ph = currentId ? phsById.get(currentId) ?? null : null;
                    const slotBg =
                        slot.team === 'red'
                            ? 'border-team-red/50 bg-team-red/10'
                            : 'border-team-blue/50 bg-team-blue/10';
                    const slotLabelColor =
                        slot.team === 'red' ? 'text-team-red' : 'text-team-blue';
                    return (
                        <div
                            key={slotKey(flight.id, slot.team, slot.position)}
                            className={`rounded-[12px] border-[2px] p-2.5 ${slotBg}`}
                        >
                            <label className="block">
                                <span className={`font-bangers text-[10px] uppercase tracking-wider ${slotLabelColor}`}>
                                    {slot.team === 'red' ? `Piratas P${slot.position}` : `Fantasmas P${slot.position}`}
                                </span>
                                <div className="mt-1.5 flex items-center gap-2">
                                    {ph && <Avatar name={ph.playerName} team={slot.team} size={36} />}
                                    <select
                                        value={currentId}
                                        onChange={e => onChange(flight, slot.team, slot.position, e.target.value)}
                                        disabled={busy}
                                        className={`${INPUT_DARK} min-w-0 flex-1`}
                                    >
                                        <option value="" className="bg-[#0a1322]">— vacío —</option>
                                        {options.map(p => (
                                            <option key={p.playerId} value={p.playerId} className="bg-[#0a1322]">
                                                {p.playerName} (idx {p.handicapIndex})
                                            </option>
                                        ))}
                                    </select>
                                </div>
                            </label>

                            {ph && (
                                <div className="mt-2.5 space-y-1.5 leading-tight">
                                    <label className="block">
                                        <span className="font-bangers text-[9px] uppercase tracking-wider text-white/55">
                                            Tee para esta ronda
                                        </span>
                                        <select
                                            value={ph.teeId ?? ''}
                                            onChange={e => onSetPlayerTee(ph.playerId, e.target.value || null)}
                                            disabled={busy || !course}
                                            className={`${INPUT_DARK} mt-0.5 w-full text-[11px]`}
                                        >
                                            <option value="" className="bg-[#0a1322]">— usar default —</option>
                                            {(course?.tees ?? []).map(t => (
                                                <option key={t.id} value={t.id} className="bg-[#0a1322]">
                                                    {t.name}
                                                    {t.slopeRating != null && t.courseRating != null
                                                        ? ` (slope ${t.slopeRating}/rating ${t.courseRating})`
                                                        : ' (sin rating)'}
                                                </option>
                                            ))}
                                        </select>
                                    </label>
                                    <div className="font-fredoka text-[10px] text-white/55">
                                        {ph.slopeRating != null && ph.courseRating != null ? (
                                            <>Slope {ph.slopeRating} · Rating {ph.courseRating} · Par {ph.coursePar}</>
                                        ) : (
                                            <span className="italic">no slope/rating (fallback PH)</span>
                                        )}
                                    </div>
                                    <div className="flex items-baseline gap-2 text-[11px]">
                                        <span className="font-fredoka text-white/55">Course HCP</span>
                                        <span className="font-bowlby text-white">{ph.courseHandicap ?? '—'}</span>
                                        <span className="text-white/30">·</span>
                                        <span className="font-fredoka text-white/55">PH</span>
                                        <span className="font-bowlby text-[#fbbc05]">{ph.playingHcpSingles}</span>
                                        <span className="text-white/30">/</span>
                                        <span className="font-bowlby text-[#fbbc05]">{ph.playingHcpFourball}</span>
                                        <span className="font-fredoka text-[9px] text-white/40">S/F</span>
                                    </div>
                                </div>
                            )}
                        </div>
                    );
                })}
            </div>
        </div>
    );
}
