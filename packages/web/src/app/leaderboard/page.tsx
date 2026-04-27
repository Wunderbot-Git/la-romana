'use client';

import { useMemo, useState } from 'react';
import { useMyEvents } from '@/hooks/useEvents';
import {
    useLeaderboard,
    LeaderboardData,
    MatchDetail,
    MatchHoleDetail,
    MatchPlayer,
    RoundBreakdown,
} from '@/hooks/useLeaderboard';
import { PullToRefresh } from '@/components/PullToRefresh';
import { BattleHeader } from '@/components/BattleHeader';
import { TeamScoreHeader } from '@/components/TeamScoreHeader';
import { Avatar } from '@/components/Avatar';
import { MatchCard as RichMatchCard } from '@/components/MatchCard';

type StatusFilter = 'all' | 'live' | 'final';
type TypeFilter = 'all' | 'individual' | 'fourball';

// ============================================================================
// Shared token classes (Piratas vs Fantasmas design system)
// ============================================================================

const CARD_DARK = 'bg-gradient-to-b from-[#1c2f3e] to-[#0f172b] border-[2px] border-[#31316b] rounded-[16px] shadow-[0_4px_12px_rgba(0,0,0,0.5)]';
const CARD_GOLD = 'bg-gradient-to-b from-[#1c2f3e] to-[#0f172b] border-[2px] border-[#fbbc05]/50 rounded-[16px] shadow-[0_4px_12px_rgba(0,0,0,0.5)]';

const PILL_BASE = 'px-3 py-1.5 rounded-full text-xs font-bangers tracking-wider uppercase transition-all whitespace-nowrap';
const PILL_INACTIVE = `${PILL_BASE} bg-[#0f172b]/80 text-white/60 border-[2px] border-[#31316b] hover:text-white`;
const PILL_GOLD = `${PILL_BASE} bg-gradient-to-b from-[#fce8b2] via-[#fbbc05] to-[#e37400] text-[#1e293b] shadow-[0_3px_0_#1e293b] border-[2px] border-[#1e293b]`;
const PILL_CYAN = `${PILL_BASE} bg-gradient-to-b from-[#7DD3FC] to-[#0EA5E9] text-[#0c4a6e] shadow-[0_3px_0_#0c4a6e] border-[2px] border-[#0c4a6e]`;

// ============================================================================

export default function LeaderboardPage() {
    const { events, isLoading: eventsLoading } = useMyEvents();
    const activeEvent = useMemo(() => {
        if (!events || events.length === 0) return null;
        return events.find(e => e.status === 'live') || events[0];
    }, [events]);

    const eventId = activeEvent?.id || '';
    const { data, isLoading, refetch } = useLeaderboard(eventId);

    // Only Ryder Cup tab on the scoreboard now — daily Mejor-del-Día moved to /ranking.

    if (eventsLoading || (eventId && isLoading && !data)) {
        return <div className="p-8 text-center text-white/70 font-fredoka">Cargando…</div>;
    }
    if (!activeEvent) {
        return <div className="p-8 text-center text-white/70 font-fredoka">No hay evento activo.</div>;
    }
    if (!data) {
        return <div className="p-8 text-center text-white/70 font-fredoka">Sin datos todavía.</div>;
    }

    const redStanding = data.ryderStandings.find(s => s.team === 'red');
    const blueStanding = data.ryderStandings.find(s => s.team === 'blue');
    const redPts = redStanding?.matchPointsCumulative ?? 0;
    const bluePts = blueStanding?.matchPointsCumulative ?? 0;
    const redProj = redStanding?.matchPointsProjected ?? 0;
    const blueProj = blueStanding?.matchPointsProjected ?? 0;

    return (
        <PullToRefresh onRefresh={refetch}>
            <div className="flex flex-col min-h-full pb-24 relative z-[1]">
                <section className="flex flex-col pb-3">
                    <BattleHeader />

                    <TeamScoreHeader
                        redScore={redPts}
                        blueScore={bluePts}
                        projectedRed={redProj}
                        projectedBlue={blueProj}
                        showProjected={true}
                    />
                </section>

                <main className="px-4">
                    <RyderTab data={data} />
                </main>
            </div>
        </PullToRefresh>
    );
}

// ============================================================================
// Ryder tab
// ============================================================================
function RyderTab({ data }: { data: LeaderboardData }) {
    const [selectedRoundId, setSelectedRoundId] = useState<string>(
        data.rounds[0]?.roundId ?? ''
    );
    const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
    const [typeFilter, setTypeFilter] = useState<TypeFilter>('all');

    const round = data.rounds.find(r => r.roundId === selectedRoundId) ?? data.rounds[0];
    if (!round) {
        return <div className="text-center text-white/60 py-8 font-fredoka">No hay rounds configurados.</div>;
    }

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
            <RoundSelector
                rounds={data.rounds}
                selectedRoundId={selectedRoundId}
                onSelect={setSelectedRoundId}
            />

            {/* Round score summary */}
            <div className={`${CARD_GOLD} px-4 py-3 flex items-center justify-between`}>
                <div>
                    <div className="text-[10px] text-[#fbbc05]/80 uppercase font-bangers tracking-widest">Round {round.roundNumber}</div>
                    <div className="font-bangers tracking-wider text-white text-lg">{round.courseName}</div>
                </div>
                <div className="text-right">
                    <div className="font-bangers text-2xl tracking-wider">
                        <span className="text-team-red">{formatPts(round.teamPoints.red)}</span>
                        <span className="text-white/40 mx-1">-</span>
                        <span className="text-team-blue">{formatPts(round.teamPoints.blue)}</span>
                    </div>
                    <div className="text-[10px] text-white/50 font-fredoka">
                        proj {formatPts(round.teamPointsProjected.red)} · {formatPts(round.teamPointsProjected.blue)}
                    </div>
                </div>
            </div>

            {/* Match filters */}
            <div className="flex flex-wrap gap-2 items-center">
                <FilterPill active={statusFilter === 'all'} variant="gold" onClick={() => setStatusFilter('all')}>Todo</FilterPill>
                <FilterPill active={statusFilter === 'live'} variant="cyan" onClick={() => setStatusFilter('live')}>Vivo</FilterPill>
                <FilterPill active={statusFilter === 'final'} variant="gold" onClick={() => setStatusFilter('final')}>Final</FilterPill>
                <span className="w-px h-6 bg-white/20 mx-1"></span>
                <FilterSelect
                    value={typeFilter}
                    onChange={setTypeFilter}
                    options={[
                        { value: 'all', label: 'Todos' },
                        { value: 'individual', label: 'Individual' },
                        { value: 'fourball', label: 'Mejor Bola' },
                    ]}
                    ariaLabel="Filtrar tipo de partido"
                />
            </div>

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
                <div className="text-center text-white/50 py-8 font-fredoka italic">Sin matches que mostrar.</div>
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
            {rounds.map(r => {
                const isActive = selectedRoundId === r.roundId;
                return (
                    <button
                        key={r.roundId}
                        onClick={() => onSelect(r.roundId)}
                        className={`flex-shrink-0 px-5 py-2 rounded-full text-sm font-bangers tracking-wider whitespace-nowrap transition-all ${
                            isActive
                                ? 'bg-gradient-to-b from-[#fce8b2] via-[#fbbc05] to-[#e37400] text-[#1e293b] shadow-[0_3px_0_#1e293b] border-[2px] border-[#1e293b]'
                                : 'bg-[#0f172b]/80 text-white/60 border-[2px] border-[#31316b] hover:text-white'
                        }`}
                    >
                        Round {r.roundNumber}
                    </button>
                );
            })}
        </div>
    );
}

function FilterPill({
    active,
    onClick,
    variant = 'gold',
    children,
}: {
    active: boolean;
    onClick: () => void;
    variant?: 'gold' | 'cyan';
    children: React.ReactNode;
}) {
    const activeClass = variant === 'cyan' ? PILL_CYAN : PILL_GOLD;
    return (
        <button onClick={onClick} className={active ? activeClass : PILL_INACTIVE}>
            {children}
        </button>
    );
}

function FilterSelect<T extends string>({
    value,
    onChange,
    options,
    ariaLabel,
}: {
    value: T;
    onChange: (value: T) => void;
    options: { value: T; label: string }[];
    ariaLabel: string;
}) {
    return (
        <div className="relative min-w-[150px]">
            <select
                value={value}
                aria-label={ariaLabel}
                onChange={(event) => onChange(event.target.value as T)}
                className="h-[34px] w-full appearance-none rounded-full border-[2px] border-[#1e293b] bg-gradient-to-b from-[#fce8b2] via-[#fbbc05] to-[#e37400] py-1.5 pl-4 pr-9 font-bangers text-xs uppercase text-[#1e293b] shadow-[0_3px_0_#1e293b] outline-none transition-all focus:ring-2 focus:ring-[#fce8b2]/70"
            >
                {options.map(option => (
                    <option key={option.value} value={option.value}>
                        {option.label}
                    </option>
                ))}
            </select>
            <svg
                viewBox="0 0 20 20"
                fill="none"
                aria-hidden="true"
                className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#1e293b]"
            >
                <path d="M5 7.5 10 12.5 15 7.5" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
        </div>
    );
}

function SectionHeader({ label, count }: { label: string; count: number }) {
    return (
        <div className="mt-4 mb-2 px-2 flex items-center gap-2">
            <h3 className="text-sm font-bangers uppercase text-[#fbbc05] tracking-widest">{label}</h3>
            <span className="text-xs text-white/40">({count})</span>
        </div>
    );
}

function MatchCard({ match }: { match: MatchDetail }) {
    const [expanded, setExpanded] = useState(false);
    return (
        <RichMatchCard
            match={match}
            onToggle={() => setExpanded(!expanded)}
            expandedContent={expanded ? <Scorecard match={match} /> : undefined}
        />
    );
}

function statusPillStyle(match: MatchDetail): { label: string; bg: string; text: string; border: string } {
    const labelBase = match.finalStatus;
    if (match.finalStatus === 'Not Started') {
        return { label: 'No iniciado', bg: 'bg-white/5', text: 'text-white/50', border: 'border border-white/10' };
    }
    const suffix = match.isComplete ? ' FINAL' : '';
    if (match.winner === 'red') {
        return { label: labelBase + suffix, bg: 'bg-team-red/20', text: 'text-team-red', border: 'border border-team-red/40' };
    }
    if (match.winner === 'blue') {
        return { label: labelBase + suffix, bg: 'bg-team-blue/20', text: 'text-team-blue', border: 'border border-team-blue/40' };
    }
    if (match.isComplete && match.finalStatus === 'A/S') {
        return { label: 'A/S FINAL', bg: 'bg-white/10', text: 'text-white/80', border: 'border border-white/20' };
    }
    if (match.redPoints > match.bluePoints) {
        return { label: labelBase, bg: 'bg-team-red/10', text: 'text-team-red', border: 'border border-team-red/30' };
    }
    if (match.bluePoints > match.redPoints) {
        return { label: labelBase, bg: 'bg-team-blue/10', text: 'text-team-blue', border: 'border border-team-blue/30' };
    }
    return { label: labelBase, bg: 'bg-white/5', text: 'text-white/70', border: 'border border-white/10' };
}

function Scorecard({ match }: { match: MatchDetail }) {
    const front = match.holes.slice(0, 9);
    const back = match.holes.slice(9, 18);
    // Symmetric spacer above each nine so both HOYO headers render with identical vertical height.
    const spacer = <div className="h-3 bg-[#0a1322]" />;
    return (
        <div>
            {spacer}
            <ScorecardNine holes={front} match={match} />
            {spacer}
            <ScorecardNine holes={back} match={match} />
        </div>
    );
}

/**
 * How many strokes a player gets on a given hole, based on Full Course HCP rule:
 *   - 1 stroke if SI ≤ PH
 *   - 2 strokes if SI ≤ PH − 18 (rare, only for very high handicaps)
 * SI is taken from the player's own per-tee SI list when available, else the hole default.
 */
function strokesForPlayer(p: MatchPlayer, h: MatchHoleDetail, matchType: string): number {
    const ph = matchType === 'fourball' ? p.playingHcpFourball : p.playingHcpSingles;
    if (typeof ph !== 'number' || ph <= 0) return 0;
    const si = p.strokeIndexes?.[h.holeNumber - 1] ?? h.strokeIndex;
    if (!si || si <= 0 || ph < si) return 0;
    return 1 + Math.floor((ph - si) / 18);
}

/**
 * Thin colored bar(s) at the top of a score cell — one per stroke awarded.
 * Matches the Bogotá scorecard look.
 */
function StrokeBar({ count, color }: { count: number; color: string }) {
    if (count <= 0) return null;
    const bars = Math.min(count, 2);
    return (
        <span className="pointer-events-none absolute inset-x-1.5 top-[2px] flex flex-col gap-[2px]">
            {Array.from({ length: bars }).map((_, i) => (
                <span
                    key={i}
                    className="block h-[2px] w-full rounded-full"
                    style={{ background: color, boxShadow: `0 0 3px ${color}66` }}
                />
            ))}
        </span>
    );
}

/**
 * Rounded outline box around the score number when this player/team won the hole.
 * Uses the team color for border + text. Replaces the old solid background tint.
 */
function WinBox({ children, color }: { children: React.ReactNode; color: string }) {
    return (
        <span
            className="inline-flex h-[22px] w-[22px] items-center justify-center rounded-[6px] font-semibold"
            style={{
                border: `1.5px solid ${color}`,
                color,
                boxShadow: `inset 0 0 0 1px ${color}22`,
            }}
        >
            {children}
        </span>
    );
}

function ScorecardNine({ holes, match }: { holes: MatchHoleDetail[]; match: MatchDetail }) {
    const RED = '#F0C850';   // gold — Piratas
    const BLUE = '#5BA6DC';  // ice — Fantasmas
    return (
        <div className="overflow-x-auto">
            <table className="w-full text-xs">
                <thead>
                    <tr className="bg-[#0f172b] text-[#fbbc05] font-bangers h-8">
                        <th className="px-2 py-1.5 text-left align-middle">Hoyo</th>
                        {holes.map(h => (
                            <th key={h.holeNumber} className="px-1 py-1.5 text-center w-8 align-middle">{h.holeNumber}</th>
                        ))}
                    </tr>
                </thead>
                <tbody>
                    <tr className="bg-[#1c2f3e]/50">
                        <td className="px-2 py-1 text-white/50">Par</td>
                        {holes.map(h => (
                            <td key={h.holeNumber} className="px-1 py-1 text-center text-white/70">{h.par}</td>
                        ))}
                    </tr>
                    <tr>
                        <td className="px-2 py-1 text-white/40 text-[10px]">HCP</td>
                        {holes.map(h => (
                            <td key={h.holeNumber} className="px-1 py-1 text-center text-white/40 text-[10px]">{h.strokeIndex}</td>
                        ))}
                    </tr>
                    {match.redPlayers.map((p, pi) => (
                        <tr key={p.id}>
                            <td className="px-2 py-1 text-team-red truncate max-w-[90px] font-bangers">{p.name}</td>
                            {holes.map(h => {
                                const s = h.redScores[pi];
                                const isWin = h.winner === 'red' && s != null;
                                const strokes = strokesForPlayer(p, h, match.matchType);
                                return (
                                    <td
                                        key={h.holeNumber}
                                        className="relative px-1 pt-[7px] pb-1 text-center text-white/80"
                                    >
                                        <StrokeBar count={strokes} color={RED} />
                                        {isWin ? <WinBox color={RED}>{s}</WinBox> : (s ?? '—')}
                                    </td>
                                );
                            })}
                        </tr>
                    ))}
                    {match.bluePlayers.map((p, pi) => (
                        <tr key={p.id}>
                            <td className="px-2 py-1 text-team-blue truncate max-w-[90px] font-bangers">{p.name}</td>
                            {holes.map(h => {
                                const s = h.blueScores[pi];
                                const isWin = h.winner === 'blue' && s != null;
                                const strokes = strokesForPlayer(p, h, match.matchType);
                                return (
                                    <td
                                        key={h.holeNumber}
                                        className="relative px-1 pt-[7px] pb-1 text-center text-white/80"
                                    >
                                        <StrokeBar count={strokes} color={BLUE} />
                                        {isWin ? <WinBox color={BLUE}>{s}</WinBox> : (s ?? '—')}
                                    </td>
                                );
                            })}
                        </tr>
                    ))}
                    <tr className="bg-[#162844] text-white/80 font-bangers italic border-t-2 border-[#fbbc05]/40">
                        <td className="px-2 py-1.5 text-[9px] tracking-wider uppercase text-[#fbbc05]/70 not-italic">Partido</td>
                        {holes.map(h => (
                            <td key={h.holeNumber} className="px-1 py-1.5 text-center text-[10px] text-[#a8c4e8]">
                                {h.matchStateLabel || '—'}
                            </td>
                        ))}
                    </tr>
                </tbody>
            </table>
        </div>
    );
}

const formatPts = (n: number): string => {
    return Number.isInteger(n) ? String(n) : n.toFixed(1);
};
