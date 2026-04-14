'use client';

import { useState, useMemo, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import dynamic from 'next/dynamic';
import { useAuth } from '@/lib/auth';
import { useMyEvents } from '@/hooks/useEvents';
import { useLeaderboard, Match } from '@/hooks/useLeaderboard';
import { TeamScoreHeader } from '@/components/TeamScoreHeader';
import { ProjectedStickyHeader } from '@/components/ProjectedStickyHeader';
import { ScoreBreakdown } from '@/components/ScoreBreakdown';
import { CompletedBreakdown } from '@/components/CompletedBreakdown';
import { MatchCard } from '@/components/MatchCard';
import { EventVisualHeader } from '@/components/EventVisualHeader';
import { PullToRefresh } from '@/components/PullToRefresh';
import { BattleHeader } from '@/components/BattleHeader';
import { CelebrationOverlay } from '@/components/CelebrationOverlay';

const DetailedScorecard = dynamic(() => import('@/components/DetailedScorecard').then(m => ({ default: m.DetailedScorecard })), { ssr: false });

export default function LeaderboardPage() {
    const { events, isLoading: eventsLoading } = useMyEvents();
    const router = useRouter();
    const { user } = useAuth();

    const activeEvent = useMemo(() => {
        if (!events || events.length === 0) return null;
        return events.find(e => e.status === 'live') || events[0];
    }, [events]);

    const eventId = activeEvent?.id || '';
    const { data: leaderboardData, isLoading: scoresLoading, error, refetch } = useLeaderboard(eventId);

    const [showCurrentDetails, setShowCurrentDetails] = useState(false);
    const [showProjectedDetails, setShowProjectedDetails] = useState(false);
    const [expandedMatch, setExpandedMatch] = useState<string | null>(null);
    const [searchQuery, setSearchQuery] = useState('');
    const [filterType, setFilterType] = useState<'all' | 'singles' | 'fourball' | 'scramble'>('all');
    const [statusFilter, setStatusFilter] = useState<'all' | 'live' | 'finished'>('all');
    const [isSearchFocused, setIsSearchFocused] = useState(false);
    const [tournamentWinner, setTournamentWinner] = useState<'red' | 'blue' | null>(null);

    // Trigger tournament victory video when all matches completed
    useEffect(() => {
        if (!leaderboardData || !eventId) return;
        const { matches, totalScore } = leaderboardData;
        if (matches.length === 0) return;
        const allCompleted = matches.every(m => m.status === 'completed');
        if (!allCompleted) return;
        if (totalScore.red === totalScore.blue) return; // tied
        const storageKey = `tournament_celebration_${eventId}`;
        if (typeof window !== 'undefined' && localStorage.getItem(storageKey)) return;
        const winner = totalScore.red > totalScore.blue ? 'red' as const : 'blue' as const;
        setTournamentWinner(winner);
        if (typeof window !== 'undefined') localStorage.setItem(storageKey, 'shown');
    }, [leaderboardData, eventId]);

    const isLoading = eventsLoading || (eventId && scoresLoading);

    const fallbackData = {
        totalScore: { red: 0, blue: 0 },
        projectedScore: { red: 0, blue: 0 },
        segmentScores: {
            singles: { red: 0, blue: 0 },
            fourball: { red: 0, blue: 0 },
            scramble: { red: 0, blue: 0 },
        },
        momentum: 'neutral' as const,
        matches: [] as Match[],
        updatedAt: new Date().toISOString(),
    };

    const leaderboard = leaderboardData || fallbackData;

    const filteredMatches = useMemo(() => leaderboard.matches.filter(match => {
        const matchesType = filterType === 'all' ||
            (filterType === 'singles' && match.segmentType.startsWith('singles')) ||
            match.segmentType === filterType;
        const matchesStatus = statusFilter === 'all' ||
            (statusFilter === 'live' && match.status !== 'completed' && match.status !== 'not_started') ||
            (statusFilter === 'finished' && match.status === 'completed');

        const searchLower = searchQuery.toLowerCase();
        const matchesName = !searchQuery ||
            match.redPlayers.some(p => p.playerName.toLowerCase().includes(searchLower)) ||
            match.bluePlayers.some(p => p.playerName.toLowerCase().includes(searchLower));
        return matchesType && matchesStatus && matchesName;
    }), [leaderboard.matches, filterType, statusFilter, searchQuery]);

    const allPlayerNames = useMemo(() => Array.from(new Set(
        leaderboard.matches.flatMap(m => [...m.redPlayers, ...m.bluePlayers].map(p => p.playerName.replace(/-$/, '').trim()))
    )).sort(), [leaderboard.matches]);

    const suggestedNames = useMemo(() => searchQuery
        ? allPlayerNames.filter(n => n.toLowerCase().includes(searchQuery.toLowerCase()))
        : allPlayerNames, [allPlayerNames, searchQuery]);

    if (isLoading) {
        return (
            <div className="flex flex-col items-center justify-center p-12 min-h-screen">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gold-light mb-4"></div>
                <p className="text-cream/70 text-sm font-fredoka">Cargando marcador...</p>
            </div>
        );
    }

    if (!activeEvent) {
        return (
            <div className="p-8 text-center min-h-screen pt-20">
                <p className="text-cream/70 mb-4 font-fredoka">No se encontró un evento activo.</p>
            </div>
        );
    }

    if (error) {
        return (
            <div className="p-4 text-center text-red-300 min-h-screen font-fredoka">
                {error}
            </div>
        );
    }

    return (
        <>
        <PullToRefresh onRefresh={async () => { await refetch(); }}>
            <div className="flex flex-col min-h-full pb-20">
                <div className="h-4"></div>
                {user?.appRole === 'admin' && (
                    <div className="absolute top-4 right-4 z-50">
                        <Link href={`/admin/events/${eventId}/players`} className="gold-button text-xs px-3 py-1.5 shadow-[0_4px_0_#1e293b] active:translate-y-1 active:shadow-none hover:brightness-110 transition">
                            Gestionar Jugadores
                        </Link>
                    </div>
                )}

                {/* Content Spacer for Logo Overlap */}
                <div className="h-4"></div>

                <BattleHeader />

                {/* Static Score Header */}
                <TeamScoreHeader
                    redScore={leaderboard.totalScore.red}
                    blueScore={leaderboard.totalScore.blue}
                    projectedRed={leaderboard.projectedScore.red}
                    projectedBlue={leaderboard.projectedScore.blue}
                    isCurrentExpanded={showCurrentDetails}
                    onToggleCurrent={() => {
                        setShowCurrentDetails(!showCurrentDetails);
                        if (showProjectedDetails) setShowProjectedDetails(false);
                    }}
                    currentDetailContent={
                        <CompletedBreakdown segmentScores={leaderboard.segmentScores} />
                    }
                    isProjectedExpanded={showProjectedDetails}
                    onToggleProjected={() => {
                        setShowProjectedDetails(!showProjectedDetails);
                        if (showCurrentDetails) setShowCurrentDetails(false);
                    }}
                    projectedDetailContent={
                        <ScoreBreakdown
                            segmentScores={leaderboard.segmentScores}
                            matches={leaderboard.matches}
                            onMatchClick={(match) => {
                                setSearchQuery(match.redPlayers[0].playerName.replace(/-$/, '').trim());
                                setFilterType(match.segmentType as any);
                                setShowProjectedDetails(false);
                            }}
                        />
                    }
                    showProjected={true}
                    detachedBottom={false}
                />

                {/* Sticky Container - Solid Navy Menu Bar */}
                <div className="sticky top-0 z-50 pt-0 pb-2 bg-transparent transition-all duration-300 -mt-6">
                    {leaderboard.matches.length > 0 && (
                        <div className="bg-[#1a1a3e] rounded-[16px] px-3 py-2 mx-4 shadow-[0_4px_12px_rgba(0,0,0,0.5)] border-[2px] border-[#31316b]">
                            {/* Search Input */}
                            <div className="relative z-40 mb-2">
                                <div className="relative">
                                    <input
                                        type="text"
                                        placeholder="Buscar jugador..."
                                        value={searchQuery}
                                        onChange={(e) => setSearchQuery(e.target.value)}
                                        onFocus={() => setIsSearchFocused(true)}
                                        onBlur={() => setTimeout(() => setIsSearchFocused(false), 200)}
                                        className="w-full bg-[#2a2a5e] rounded-full pl-9 pr-8 py-1.5 text-sm font-bangers tracking-wider text-white focus:outline-none focus:ring-1 focus:ring-blue-400 transition-all placeholder:text-white/50 h-[36px]"
                                    />
                                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-white/50">
                                        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                                            <circle cx="11" cy="11" r="8"></circle>
                                            <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
                                        </svg>
                                    </span>
                                    {searchQuery && (
                                        <button
                                            onClick={() => setSearchQuery('')}
                                            className="absolute right-3 top-1/2 -translate-y-1/2 text-white/50 hover:text-white transition-colors"
                                        >
                                            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                                                <line x1="18" y1="6" x2="6" y2="18"></line>
                                                <line x1="6" y1="6" x2="18" y2="18"></line>
                                            </svg>
                                        </button>
                                    )}
                                </div>

                                {/* Dropdown List */}
                                {isSearchFocused && suggestedNames.length > 0 && (
                                    <div className="absolute top-full left-0 right-0 mt-2 bg-[#2a2a5e] border border-[#4a4a8e] rounded-xl max-h-60 overflow-y-auto z-50 shadow-[0_8px_16px_rgba(0,0,0,0.5)]">
                                        {suggestedNames.map((name, i) => (
                                            <div
                                                key={i}
                                                onClick={() => { setSearchQuery(name); setIsSearchFocused(false); }}
                                                className="px-4 py-2 text-sm font-bangers tracking-wider text-white hover:bg-white/10 cursor-pointer border-b border-white/5 last:border-0"
                                            >
                                                {name}
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>

                            {/* Filter Row - 3D cartoon chips */}
                            <div className="flex items-center justify-between gap-1.5 overflow-x-auto hide-scrollbar">
                                {/* TODO */}
                                <button
                                    onClick={() => setStatusFilter('all')}
                                    className="flex-1 shrink-0 px-2 py-1.5 rounded-full text-xs sm:text-sm font-bangers uppercase tracking-wider transition-all duration-150 text-white text-center"
                                    style={statusFilter === 'all' ? {
                                        background: 'linear-gradient(180deg, #e8302b 0%, #b01e1a 100%)',
                                        boxShadow: 'inset 0 2px 0 rgba(255,255,255,0.25), inset 0 -1px 0 rgba(0,0,0,0.3), 0 0 10px rgba(240,58,53,0.55)',
                                        border: '1px solid #8a1610',
                                    } : {
                                        background: 'linear-gradient(180deg, rgba(255,255,255,0.07) 0%, rgba(0,0,0,0.15) 100%)',
                                        boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.12), 0 2px 0 rgba(0,0,0,0.4)',
                                        border: '1px solid rgba(255,255,255,0.22)',
                                        color: 'rgba(255,255,255,0.75)',
                                    }}
                                >
                                    TODO
                                </button>

                                {/* VIVO */}
                                <button
                                    onClick={() => setStatusFilter('live')}
                                    className="flex-1 shrink-0 px-2 py-1.5 rounded-full text-xs sm:text-sm font-bangers uppercase tracking-wider transition-all duration-150 text-white text-center"
                                    style={statusFilter === 'live' ? {
                                        background: 'linear-gradient(180deg, #ffbf00 0%, #cc7a00 100%)',
                                        boxShadow: 'inset 0 2px 0 rgba(255,255,255,0.25), inset 0 -1px 0 rgba(0,0,0,0.3), 0 0 10px rgba(255,165,0,0.55)',
                                        border: '1px solid #9a5a00',
                                    } : {
                                        background: 'linear-gradient(180deg, rgba(255,255,255,0.07) 0%, rgba(0,0,0,0.15) 100%)',
                                        boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.12), 0 2px 0 rgba(0,0,0,0.4)',
                                        border: '1px solid rgba(255,255,255,0.22)',
                                        color: 'rgba(255,255,255,0.75)',
                                    }}
                                >
                                    VIVO
                                </button>

                                {/* FINAL */}
                                <button
                                    onClick={() => setStatusFilter('finished')}
                                    className="flex-1 shrink-0 px-2 py-1.5 rounded-full text-xs sm:text-sm font-bangers uppercase tracking-wider transition-all duration-150 text-white text-center"
                                    style={statusFilter === 'finished' ? {
                                        background: 'linear-gradient(180deg, #96ec48 0%, #4a9018 100%)',
                                        boxShadow: 'inset 0 2px 0 rgba(255,255,255,0.25), inset 0 -1px 0 rgba(0,0,0,0.3), 0 0 10px rgba(126,220,59,0.55)',
                                        border: '1px solid #326010',
                                    } : {
                                        background: 'linear-gradient(180deg, rgba(255,255,255,0.07) 0%, rgba(0,0,0,0.15) 100%)',
                                        boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.12), 0 2px 0 rgba(0,0,0,0.4)',
                                        border: '1px solid rgba(255,255,255,0.22)',
                                        color: 'rgba(255,255,255,0.75)',
                                    }}
                                >
                                    FINAL
                                </button>

                                {/* Match Type Dropdown — same 3D bevel style */}
                                <div className="relative shrink-0 w-[90px] sm:w-[110px]">
                                    <select
                                        value={filterType}
                                        onChange={(e) => setFilterType(e.target.value as any)}
                                        className="w-full appearance-none rounded-full pl-2 sm:pl-3 pr-6 py-1.5 text-xs sm:text-sm font-bangers uppercase tracking-wider text-white focus:outline-none focus:ring-0 transition-all cursor-pointer"
                                        style={{
                                            background: 'linear-gradient(180deg, #2e2e68 0%, #14143a 100%)',
                                            boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.12), 0 2px 0 rgba(0,0,0,0.5)',
                                            border: '1px solid rgba(255,255,255,0.20)',
                                        }}
                                    >
                                        <option value="all">TODOS</option>
                                        <option value="singles">INDIV.</option>
                                        <option value="fourball">M. BOLA</option>
                                        <option value="scramble">SCRAMBLE</option>
                                    </select>
                                    <div className="absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none z-20">
                                        <svg className="w-3 h-3 text-white/70" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                                        </svg>
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}
                </div>

                {/* Match List */}
                <div className="px-4 pb-4">
                    {leaderboard.matches.length === 0 ? (
                        <div className="text-center text-cream/60 py-8 font-fredoka">
                            <p>Aún no hay partidos.</p>
                            <p className="text-sm mt-2">Los partidos aparecerán aquí una vez se creen los grupos.</p>
                        </div>
                    ) : (
                        <div>
                            {filteredMatches.length === 0 ? (
                                <div className="text-center py-12 text-white/80 text-sm thick-border bg-[#0a4030] rounded-xl font-bangers tracking-wide">
                                    No se encontraron partidos con esos filtros.
                                </div>
                            ) : (
                                <div className="space-y-2 pb-32 mt-3">
                                    {['singles', 'fourball', 'scramble'].map((type) => {
                                        const typeLabels: Record<string, string> = { singles: 'Individual', fourball: 'Mejor Bola', scramble: 'Scramble' };
                                        const typeMatches = filteredMatches
                                            .filter(m => type === 'singles' ? m.segmentType.startsWith('singles') : m.segmentType.toLowerCase() === type)
                                            .sort((a, b) => {
                                                const aNotStarted = a.status === 'not_started';
                                                const bNotStarted = b.status === 'not_started';
                                                if (aNotStarted && !bNotStarted) return 1;
                                                if (!aNotStarted && bNotStarted) return -1;
                                                return 0;
                                            });

                                        if (typeMatches.length === 0) return null;

                                        return (
                                            <div key={type}>
                                                <div className="flex items-center mb-2 px-1">
                                                    <div
                                                        className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full"
                                                        style={{
                                                            background: 'rgba(255,255,255,0.55)',
                                                            backdropFilter: 'blur(8px)',
                                                            WebkitBackdropFilter: 'blur(8px)',
                                                            border: '1px solid rgba(255,255,255,0.8)',
                                                            boxShadow: '0 1px 4px rgba(0,0,0,0.1)',
                                                        }}
                                                    >
                                                        <span className="w-1 h-4 rounded-full bg-[#F0C850] inline-block" />
                                                        <span className="font-bangers text-[16px] text-[#1a1a3e] uppercase tracking-widest leading-none">
                                                            {typeLabels[type]}
                                                        </span>
                                                        <span className="font-bangers text-[13px] text-[#1a1a3e]/60 leading-none">({typeMatches.length})</span>
                                                    </div>
                                                </div>
                                                <div className="space-y-3">
                                                    {typeMatches.map((match) => (
                                                        <div key={match.id}>
                                                            <MatchCard
                                                                match={match}
                                                                onClick={() => setExpandedMatch(expandedMatch === match.id ? null : match.id)}
                                                            />
                                                            {expandedMatch === match.id && (
                                                                <div
                                                                    className="rounded-2xl p-4 mt-2 overflow-x-auto"
                                                                    style={{
                                                                        background: 'rgba(255,255,255,0.85)',
                                                                        backdropFilter: 'blur(12px)',
                                                                        WebkitBackdropFilter: 'blur(12px)',
                                                                        borderRadius: 16,
                                                                        boxShadow: '0 2px 12px rgba(0,0,0,0.08)',
                                                                        border: '1px solid rgba(255,255,255,0.9)',
                                                                    }}
                                                                >
                                                                    <DetailedScorecard
                                                                        match={match}
                                                                        onClose={() => setExpandedMatch(null)}
                                                                    />
                                                                </div>
                                                            )}
                                                        </div>
                                                    ))}
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            )}
                        </div>
                    )}
                </div>

                {/* Last Updated */}
                <div className="px-4 pb-4 text-center text-xs text-cream/40 mb-16 font-fredoka">
                    Última actualización: {new Date(leaderboard.updatedAt).toLocaleTimeString('es-CO')}
                </div>
            </div>
        </PullToRefresh>
        {tournamentWinner && (
            <CelebrationOverlay
                team={tournamentWinner}
                variant="tournament"
                onClose={() => setTournamentWinner(null)}
            />
        )}
        </>
    );
}
