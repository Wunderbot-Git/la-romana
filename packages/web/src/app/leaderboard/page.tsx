'use client';

import { useMemo, useState } from 'react';
import { useMyEvents } from '@/hooks/useEvents';
import {
    useLeaderboard,
    LeaderboardData,
    MatchDetail,
    MatchHoleDetail,
    RoundBreakdown,
} from '@/hooks/useLeaderboard';
import { PullToRefresh } from '@/components/PullToRefresh';

type Tab = 'ryder' | 'stableford' | 'neto';
type StatusFilter = 'all' | 'live' | 'final';
type TypeFilter = 'all' | 'individual' | 'fourball';

export default function LeaderboardPage() {
    const { events, isLoading: eventsLoading } = useMyEvents();
    const activeEvent = useMemo(() => {
        if (!events || events.length === 0) return null;
        return events.find(e => e.status === 'live') || events[0];
    }, [events]);

    const eventId = activeEvent?.id || '';
    const { data, isLoading, refetch } = useLeaderboard(eventId);

    const [tab, setTab] = useState<Tab>('ryder');

    if (eventsLoading || (eventId && isLoading && !data)) {
        return <div className="p-8 text-center text-gray-500">Cargando…</div>;
    }
    if (!activeEvent) {
        return <div className="p-8 text-center text-gray-500">No hay evento activo.</div>;
    }
    if (!data) {
        return <div className="p-8 text-center text-gray-500">Sin datos todavía.</div>;
    }

    const redStanding = data.ryderStandings.find(s => s.team === 'red');
    const blueStanding = data.ryderStandings.find(s => s.team === 'blue');
    const redPts = redStanding?.matchPointsCumulative ?? 0;
    const bluePts = blueStanding?.matchPointsCumulative ?? 0;
    const redProj = redStanding?.matchPointsProjected ?? 0;
    const blueProj = blueStanding?.matchPointsProjected ?? 0;

    return (
        <PullToRefresh onRefresh={refetch}>
            <div className="min-h-screen bg-gray-50 pb-24">
                {/* Hero score */}
                <header className="bg-white border-b">
                    <div className="max-w-3xl mx-auto px-4 py-6">
                        <h1 className="text-xl font-bold text-center mb-4">{data.eventName}</h1>
                        <div className="flex items-center justify-around">
                            <div className="text-center">
                                <div className="text-sm font-medium text-team-red">Red</div>
                                <div className="text-5xl font-bold text-team-red">{formatPts(redPts)}</div>
                                <div className="text-xs text-gray-500 mt-1">
                                    Proj. <span className="font-semibold text-team-red">{formatPts(redProj)}</span>
                                </div>
                            </div>
                            <div className="text-2xl text-gray-400">vs</div>
                            <div className="text-center">
                                <div className="text-sm font-medium text-team-blue">Blue</div>
                                <div className="text-5xl font-bold text-team-blue">{formatPts(bluePts)}</div>
                                <div className="text-xs text-gray-500 mt-1">
                                    Proj. <span className="font-semibold text-team-blue">{formatPts(blueProj)}</span>
                                </div>
                            </div>
                        </div>
                        <div className="text-[11px] text-gray-400 text-center mt-3">
                            Actual = matches decididos · Proyectado = decididos + líder en juego + 0.5/0.5 sin empezar
                        </div>
                    </div>
                </header>

                {/* Tabs */}
                <div className="max-w-3xl mx-auto px-4 sticky top-0 bg-gray-50 border-b z-10">
                    <div className="flex gap-1 py-2">
                        <TabButton active={tab === 'ryder'} onClick={() => setTab('ryder')}>Ryder Cup</TabButton>
                        <TabButton active={tab === 'stableford'} onClick={() => setTab('stableford')}>Stableford</TabButton>
                        <TabButton active={tab === 'neto'} onClick={() => setTab('neto')}>Neto</TabButton>
                    </div>
                </div>

                <main className="max-w-3xl mx-auto px-4 py-4">
                    {tab === 'ryder' && <RyderTab data={data} />}
                    {tab === 'stableford' && <StablefordTab data={data} />}
                    {tab === 'neto' && <NetoTab data={data} />}
                </main>
            </div>
        </PullToRefresh>
    );
}

function TabButton({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
    return (
        <button
            onClick={onClick}
            className={`flex-1 py-2 px-4 rounded-md text-sm font-medium ${
                active ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-600 hover:bg-gray-100'
            }`}
        >
            {children}
        </button>
    );
}

// ============================================================================
// Ryder tab — round selector + filter + grouped match cards + expandable
// ============================================================================
function RyderTab({ data }: { data: LeaderboardData }) {
    const [selectedRoundId, setSelectedRoundId] = useState<string>(
        data.rounds[0]?.roundId ?? ''
    );
    const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
    const [typeFilter, setTypeFilter] = useState<TypeFilter>('all');

    const round = data.rounds.find(r => r.roundId === selectedRoundId) ?? data.rounds[0];
    if (!round) {
        return <div className="text-center text-gray-500 py-8">No hay rounds configurados.</div>;
    }

    // Flatten all matches across flights of this round
    const allMatches: MatchDetail[] = round.flightSummaries.flatMap(f => f.matches);

    const visibleMatches = allMatches.filter(m => {
        if (statusFilter === 'live' && (m.holesPlayed === 0 || m.isComplete)) return false;
        if (statusFilter === 'final' && !m.isComplete) return false;
        if (typeFilter === 'individual' && m.matchType === 'fourball') return false;
        if (typeFilter === 'fourball' && m.matchType !== 'fourball') return false;
        return true;
    });

    const individualMatches = visibleMatches.filter(m => m.matchType !== 'fourball');
    const fourballMatches = visibleMatches.filter(m => m.matchType === 'fourball');

    return (
        <div className="space-y-3">
            {/* Round selector */}
            <RoundSelector
                rounds={data.rounds}
                selectedRoundId={selectedRoundId}
                onSelect={setSelectedRoundId}
            />

            {/* Round score summary */}
            <div className="bg-white rounded-lg px-4 py-3 shadow-sm flex items-center justify-between">
                <div>
                    <div className="text-xs text-gray-500 uppercase">Round {round.roundNumber}</div>
                    <div className="font-semibold">{round.courseName}</div>
                </div>
                <div className="text-right">
                    <div>
                        <span className="text-team-red font-bold">{formatPts(round.teamPoints.red)}</span>
                        <span className="text-gray-400 mx-1">·</span>
                        <span className="text-team-blue font-bold">{formatPts(round.teamPoints.blue)}</span>
                    </div>
                    <div className="text-[11px] text-gray-500">
                        proj {formatPts(round.teamPointsProjected.red)} · {formatPts(round.teamPointsProjected.blue)}
                    </div>
                </div>
            </div>

            {/* Filter pills */}
            <div className="flex flex-wrap gap-2">
                <FilterPill active={statusFilter === 'all'} onClick={() => setStatusFilter('all')}>Todo</FilterPill>
                <FilterPill active={statusFilter === 'live'} onClick={() => setStatusFilter('live')}>Vivo</FilterPill>
                <FilterPill active={statusFilter === 'final'} onClick={() => setStatusFilter('final')}>Final</FilterPill>
                <span className="w-px bg-gray-300 my-1"></span>
                <FilterPill active={typeFilter === 'all'} onClick={() => setTypeFilter('all')}>Todos</FilterPill>
                <FilterPill active={typeFilter === 'individual'} onClick={() => setTypeFilter('individual')}>Individual</FilterPill>
                <FilterPill active={typeFilter === 'fourball'} onClick={() => setTypeFilter('fourball')}>Mejor Bola</FilterPill>
            </div>

            {/* Individual matches */}
            {individualMatches.length > 0 && (
                <section>
                    <SectionHeader label="Individual" count={individualMatches.length} />
                    <div className="space-y-2">
                        {individualMatches.map(m => (
                            <MatchCard key={`${m.flightId}-${m.matchType}`} match={m} />
                        ))}
                    </div>
                </section>
            )}

            {/* Fourball matches */}
            {fourballMatches.length > 0 && (
                <section>
                    <SectionHeader label="Mejor Bola" count={fourballMatches.length} />
                    <div className="space-y-2">
                        {fourballMatches.map(m => (
                            <MatchCard key={`${m.flightId}-${m.matchType}`} match={m} />
                        ))}
                    </div>
                </section>
            )}

            {visibleMatches.length === 0 && (
                <div className="text-center text-gray-500 py-8">Sin matches que mostrar.</div>
            )}
        </div>
    );
}

function RoundSelector({
    rounds,
    selectedRoundId,
    onSelect,
}: {
    rounds: RoundBreakdown[];
    selectedRoundId: string;
    onSelect: (id: string) => void;
}) {
    return (
        <div className="flex gap-2 overflow-x-auto -mx-4 px-4 pb-1">
            {rounds.map(r => (
                <button
                    key={r.roundId}
                    onClick={() => onSelect(r.roundId)}
                    className={`flex-shrink-0 px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap ${
                        selectedRoundId === r.roundId
                            ? 'bg-gray-900 text-white'
                            : 'bg-white text-gray-700 border border-gray-300'
                    }`}
                >
                    Round {r.roundNumber}
                </button>
            ))}
        </div>
    );
}

function FilterPill({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
    return (
        <button
            onClick={onClick}
            className={`px-3 py-1 rounded-full text-xs font-medium ${
                active ? 'bg-team-red text-white' : 'bg-white text-gray-700 border border-gray-300'
            }`}
        >
            {children}
        </button>
    );
}

function SectionHeader({ label, count }: { label: string; count: number }) {
    return (
        <div className="mt-4 mb-2 px-2 flex items-center gap-2">
            <h3 className="text-sm font-bold uppercase text-gray-700">{label}</h3>
            <span className="text-xs text-gray-400">({count})</span>
        </div>
    );
}

function MatchCard({ match }: { match: MatchDetail }) {
    const [expanded, setExpanded] = useState(false);
    const statusStyle = statusPillStyle(match);

    return (
        <div className="bg-white rounded-lg shadow-sm overflow-hidden">
            <button
                onClick={() => setExpanded(!expanded)}
                className="w-full px-3 py-3 grid grid-cols-[1fr_auto_1fr] gap-3 items-center text-left"
            >
                {/* Left (red) side */}
                <div className="min-w-0">
                    {match.redPlayers.map(p => (
                        <div key={p.id} className="text-sm truncate">
                            <span className="text-team-red font-medium">{p.name}</span>
                            <span className="text-gray-400 ml-1">({p.hcp})</span>
                        </div>
                    ))}
                </div>

                {/* Center status pill */}
                <div className={`px-3 py-1.5 rounded-lg text-xs font-bold whitespace-nowrap ${statusStyle.bg} ${statusStyle.text}`}>
                    {statusStyle.label}
                </div>

                {/* Right (blue) side */}
                <div className="min-w-0 text-right">
                    {match.bluePlayers.map(p => (
                        <div key={p.id} className="text-sm truncate">
                            <span className="text-team-blue font-medium">{p.name}</span>
                            <span className="text-gray-400 ml-1">({p.hcp})</span>
                        </div>
                    ))}
                </div>
            </button>

            {expanded && <Scorecard match={match} />}
        </div>
    );
}

function statusPillStyle(match: MatchDetail): { label: string; bg: string; text: string } {
    const labelBase = match.finalStatus;
    if (match.finalStatus === 'Not Started') {
        return { label: 'No iniciado', bg: 'bg-gray-100', text: 'text-gray-500' };
    }
    const suffix = match.isComplete ? ' FINAL' : '';
    if (match.winner === 'red') {
        return { label: labelBase + suffix, bg: 'bg-team-red/15', text: 'text-team-red' };
    }
    if (match.winner === 'blue') {
        return { label: labelBase + suffix, bg: 'bg-team-blue/15', text: 'text-team-blue' };
    }
    if (match.isComplete && match.finalStatus === 'A/S') {
        return { label: 'A/S FINAL', bg: 'bg-gray-200', text: 'text-gray-700' };
    }
    // In progress — color by current leader (inferred from points or neutral)
    if (match.redPoints > match.bluePoints) {
        return { label: labelBase, bg: 'bg-team-red/10', text: 'text-team-red' };
    }
    if (match.bluePoints > match.redPoints) {
        return { label: labelBase, bg: 'bg-team-blue/10', text: 'text-team-blue' };
    }
    return { label: labelBase, bg: 'bg-gray-100', text: 'text-gray-700' };
}

function Scorecard({ match }: { match: MatchDetail }) {
    // Scorecard shows holes 1..9 on first row, 10..18 on second
    const front = match.holes.slice(0, 9);
    const back = match.holes.slice(9, 18);
    return (
        <div className="border-t border-gray-200">
            <ScorecardNine holes={front} match={match} />
            <ScorecardNine holes={back} match={match} />
        </div>
    );
}

function ScorecardNine({ holes, match }: { holes: MatchHoleDetail[]; match: MatchDetail }) {
    return (
        <div className="overflow-x-auto">
            <table className="w-full text-xs">
                <thead>
                    <tr className="bg-gray-900 text-white">
                        <th className="px-2 py-1 text-left">Hoyo</th>
                        {holes.map(h => (
                            <th key={h.holeNumber} className="px-1 py-1 text-center w-8">{h.holeNumber}</th>
                        ))}
                    </tr>
                </thead>
                <tbody>
                    <tr className="bg-gray-50">
                        <td className="px-2 py-1 text-gray-500">Par</td>
                        {holes.map(h => (
                            <td key={h.holeNumber} className="px-1 py-1 text-center text-gray-600">{h.par}</td>
                        ))}
                    </tr>
                    <tr>
                        <td className="px-2 py-1 text-gray-400 text-[10px]">HCP</td>
                        {holes.map(h => (
                            <td key={h.holeNumber} className="px-1 py-1 text-center text-gray-400 text-[10px]">{h.strokeIndex}</td>
                        ))}
                    </tr>
                    {match.redPlayers.map((p, pi) => (
                        <tr key={p.id}>
                            <td className="px-2 py-1 text-team-red truncate max-w-[90px]">{p.name}</td>
                            {holes.map(h => {
                                const s = h.redScores[pi];
                                const isWin = h.winner === 'red';
                                return (
                                    <td
                                        key={h.holeNumber}
                                        className={`px-1 py-1 text-center ${isWin ? 'bg-team-red/15 font-semibold' : ''}`}
                                    >
                                        {s ?? '—'}
                                    </td>
                                );
                            })}
                        </tr>
                    ))}
                    {match.bluePlayers.map((p, pi) => (
                        <tr key={p.id}>
                            <td className="px-2 py-1 text-team-blue truncate max-w-[90px]">{p.name}</td>
                            {holes.map(h => {
                                const s = h.blueScores[pi];
                                const isWin = h.winner === 'blue';
                                return (
                                    <td
                                        key={h.holeNumber}
                                        className={`px-1 py-1 text-center ${isWin ? 'bg-team-blue/15 font-semibold' : ''}`}
                                    >
                                        {s ?? '—'}
                                    </td>
                                );
                            })}
                        </tr>
                    ))}
                    <tr className="bg-gray-900 text-white">
                        <td className="px-2 py-1 text-[10px]">Partido</td>
                        {holes.map(h => (
                            <td key={h.holeNumber} className="px-1 py-1 text-center text-[10px]">
                                {h.matchStateLabel || '—'}
                            </td>
                        ))}
                    </tr>
                </tbody>
            </table>
        </div>
    );
}

// ============================================================================
// Stableford + Neto tabs (unchanged)
// ============================================================================
function StablefordTab({ data }: { data: LeaderboardData }) {
    const standings = [...data.stablefordStandings].sort(
        (a, b) => b.stablefordCumulative - a.stablefordCumulative
    );
    return (
        <div className="bg-white rounded-lg shadow-sm overflow-hidden">
            <table className="w-full text-sm">
                <thead className="bg-gray-100 text-gray-600 text-xs">
                    <tr>
                        <th className="px-3 py-2 text-left w-10">#</th>
                        <th className="px-3 py-2 text-left">Jugador</th>
                        <th className="px-3 py-2 text-center">HCP</th>
                        <th className="px-3 py-2 text-right">Pts</th>
                        <th className="px-3 py-2 text-center">Rondas</th>
                    </tr>
                </thead>
                <tbody>
                    {standings.map((s, i) => (
                        <tr key={s.playerId} className="border-t">
                            <td className="px-3 py-2 font-medium">{i + 1}</td>
                            <td className="px-3 py-2">
                                <span className={s.team === 'red' ? 'text-team-red' : s.team === 'blue' ? 'text-team-blue' : ''}>
                                    {s.playerName}
                                </span>
                            </td>
                            <td className="px-3 py-2 text-center text-gray-600">{s.handicapIndex}</td>
                            <td className="px-3 py-2 text-right font-bold">{s.stablefordCumulative}</td>
                            <td className="px-3 py-2 text-center text-gray-500">{s.roundsPlayed}</td>
                        </tr>
                    ))}
                    {standings.length === 0 && (
                        <tr>
                            <td colSpan={5} className="px-3 py-6 text-center text-gray-400 italic">
                                Sin puntos todavía
                            </td>
                        </tr>
                    )}
                </tbody>
            </table>
        </div>
    );
}

function NetoTab({ data }: { data: LeaderboardData }) {
    const byName = new Map(data.stablefordStandings.map(s => [s.playerId, s.playerName]));
    return (
        <div className="space-y-4">
            {data.rounds.map(round => {
                const pots = data.netoPotsByRound[round.roundId] ?? [];
                return (
                    <div key={round.roundId} className="bg-white rounded-lg p-4 shadow-sm">
                        <div className="mb-2">
                            <div className="text-xs uppercase text-gray-500 font-medium">Round {round.roundNumber}</div>
                            <div className="font-semibold">{round.courseName}</div>
                        </div>
                        {pots.length === 0 ? (
                            <div className="text-sm text-gray-400 italic">Sin pots declarados</div>
                        ) : (
                            <div className="space-y-2">
                                {pots.map(p => (
                                    <div key={p.id} className="border-t pt-2">
                                        <div className="flex items-center justify-between text-sm">
                                            <div className="font-medium">Pot ${p.potAmountUsd}</div>
                                            <div className="text-xs text-gray-500">
                                                {p.winners.length === 0
                                                    ? 'Sin ganador'
                                                    : p.winners
                                                        .sort((a, b) => a.rank - b.rank)
                                                        .map(w => `#${w.rank} ${byName.get(w.playerId) ?? '?'}`)
                                                        .join(' · ')}
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                );
            })}
        </div>
    );
}

const formatPts = (n: number): string => {
    return Number.isInteger(n) ? String(n) : n.toFixed(1);
};
