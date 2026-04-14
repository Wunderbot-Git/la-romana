'use client';

import { useMemo, useState } from 'react';
import { useMyEvents } from '@/hooks/useEvents';
import { useLeaderboard } from '@/hooks/useLeaderboard';
import { PullToRefresh } from '@/components/PullToRefresh';

interface PlayerRanking {
    playerId: string;
    playerName: string;
    team: 'red' | 'blue';
    points: number;
    netScore: number | null; // null = no individual scores yet
    holesPlayed: number;
    matchesPlayed: number;
    matchesTotal: number;
}

function normalizeName(name: string) {
    return name
        .split(' ')[0]
        .toLowerCase()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .replace(/[^a-z0-9]/g, '');
}

function getStrokesForHole(playingHandicap: number, strokeIndex: number): number {
    if (playingHandicap >= strokeIndex + 18) return 2;
    if (playingHandicap >= strokeIndex) return 1;
    return 0;
}

function computeRankings(matches: any[], mode: 'final' | 'projected'): PlayerRanking[] {
    const playerMap: Record<string, PlayerRanking> = {};

    for (const match of matches) {
        const matchPoints = match.segmentType === 'scramble' ? 2 : 1;
        const isCompleted = match.status === 'completed';
        const isInProgress = match.status === 'in_progress';
        const isSingles = match.segmentType === 'singles1' || match.segmentType === 'singles2';

        let redPts = 0;
        let bluePts = 0;

        if (isCompleted) {
            if (match.matchWinner === 'red') redPts = matchPoints;
            else if (match.matchWinner === 'blue') bluePts = matchPoints;
            else { redPts = matchPoints / 2; bluePts = matchPoints / 2; }
        } else if (mode === 'projected' && isInProgress) {
            if (match.currentLeader === 'red') redPts = matchPoints;
            else if (match.currentLeader === 'blue') bluePts = matchPoints;
            else { redPts = matchPoints / 2; bluePts = matchPoints / 2; }
        }

        const processPlayer = (p: any, pts: number, team: 'red' | 'blue') => {
            if (!playerMap[p.playerId]) {
                playerMap[p.playerId] = { playerId: p.playerId, playerName: p.playerName, team, points: 0, netScore: null, holesPlayed: 0, matchesPlayed: 0, matchesTotal: 0 };
            }
            playerMap[p.playerId].points += pts;
            playerMap[p.playerId].matchesTotal++;
            if (isCompleted) playerMap[p.playerId].matchesPlayed++;

            // Calculate individual net score from singles matches only (front 9, holes 0-8)
            if (isSingles && p.scores) {
                const ph = Math.round(p.hcp * 0.8);
                for (let i = 0; i < 9; i++) {
                    const gross = p.scores[i];
                    if (gross !== null && gross > 0) {
                        const si = match.hcpValues?.[i] ?? (i + 1);
                        const strokes = getStrokesForHole(ph, si);
                        const net = gross - strokes;
                        if (playerMap[p.playerId].netScore === null) playerMap[p.playerId].netScore = 0;
                        playerMap[p.playerId].netScore! += net;
                        playerMap[p.playerId].holesPlayed++;
                    }
                }
            }
        };

        for (const p of match.redPlayers) processPlayer(p, redPts, 'red');
        for (const p of match.bluePlayers) processPlayer(p, bluePts, 'blue');
    }

    return Object.values(playerMap).sort((a, b) => {
        if (b.points !== a.points) return b.points - a.points;
        // Tiebreaker: lower net score is better
        if (a.netScore === null && b.netScore === null) return 0;
        if (a.netScore === null) return 1;
        if (b.netScore === null) return -1;
        return a.netScore - b.netScore;
    });
}

export default function RankingPage() {
    const { events, isLoading: eventsLoading } = useMyEvents();
    const [mode, setMode] = useState<'projected' | 'final'>('projected');

    const activeEvent = useMemo(() => {
        if (!events || events.length === 0) return null;
        return events.find(e => e.status === 'live') || events[0];
    }, [events]);

    const eventId = activeEvent?.id || '';
    const { data: leaderboard, isLoading: scoresLoading, refetch } = useLeaderboard(eventId);

    const rankings = useMemo(() => {
        if (!leaderboard) return [];
        return computeRankings(leaderboard.matches, mode);
    }, [leaderboard, mode]);

    const isLoading = eventsLoading || scoresLoading;

    return (
        <PullToRefresh onRefresh={refetch}>
            <div className="min-h-screen pb-28 pt-4 px-4">
                <h1 className="text-2xl font-bangers text-cream text-center mb-3 tracking-wider" style={{ textShadow: '0 2px 4px rgba(0,0,0,0.3)' }}>
                    Ranking Individual
                </h1>

                {/* Filter tabs */}
                <div className="flex gap-2 justify-center mb-4">
                    {([['projected', 'Proyectado'], ['final', 'Final']] as const).map(([key, label]) => (
                        <button
                            key={key}
                            onClick={() => setMode(key)}
                            className={`px-4 py-1.5 rounded-full text-xs font-bangers tracking-wider transition-colors ${
                                mode === key
                                    ? 'gold-button text-[#1e293b] translate-y-0.5'
                                    : 'bg-white/60 text-gray-500 hover:bg-white/80'
                            }`}
                            style={mode === key ? {} : { backdropFilter: 'blur(8px)' }}
                        >
                            {label}
                        </button>
                    ))}
                </div>

                {isLoading ? (
                    <p className="text-center text-cream/50 font-fredoka">Cargando ranking...</p>
                ) : rankings.length === 0 ? (
                    <p className="text-center text-cream/50 font-fredoka">No hay datos de partidos.</p>
                ) : (
                    <div
                        className="rounded-2xl overflow-hidden"
                        style={{
                            background: 'rgba(255,255,255,0.85)',
                            backdropFilter: 'blur(10px)',
                            border: '1px solid rgba(255,255,255,0.9)',
                            boxShadow: '0 2px 12px rgba(0,0,0,0.12)',
                        }}
                    >
                        {rankings.map((player, idx) => {
                            const avatarName = normalizeName(player.playerName);
                            const teamColor = player.team === 'red' ? '#E75480' : '#4A90D9';
                            const isFirst = idx === 0;
                            const isLast = idx === rankings.length - 1;

                            return (
                                <div
                                    key={player.playerId}
                                    className={`flex items-center gap-3 px-4 py-3 ${!isLast ? 'border-b border-gray-200/60' : ''} ${isFirst ? 'bg-gold-border/5' : ''}`}
                                >
                                    <span
                                        className="text-lg font-bangers w-6 text-center"
                                        style={{ color: idx < 3 ? '#c8a200' : '#999' }}
                                    >
                                        {idx + 1}
                                    </span>

                                    <div className="w-10 h-10 rounded-full overflow-hidden flex-shrink-0 border-2" style={{ borderColor: teamColor }}>
                                        <img
                                            src={`/images/${avatarName}.webp`}
                                            alt={player.playerName}
                                            className="w-full h-full object-cover"
                                            onError={(e) => {
                                                (e.target as HTMLImageElement).src = player.team === 'red'
                                                    ? '/images/Gemini_Generated_Image_exn7bfexn7bfexn7-removebg-preview.webp'
                                                    : '/images/Gemini_Generated_Image_jonki9jonki9jonk__1_-removebg-preview.webp';
                                            }}
                                        />
                                    </div>

                                    <div className="flex-1 min-w-0">
                                        <div
                                            className="font-bangers text-base tracking-wider truncate"
                                            style={{ color: teamColor }}
                                        >
                                            {player.playerName.split(' ')[0]}
                                        </div>
                                        <div className="text-[10px] font-fredoka text-gray-400">
                                            {player.matchesPlayed}/{player.matchesTotal} partidos
                                            {player.netScore !== null && (
                                                <span className="ml-1">· net {player.netScore > 0 ? '+' : ''}{player.netScore}</span>
                                            )}
                                        </div>
                                    </div>

                                    <div className="text-right">
                                        <div className="font-bangers text-xl text-forest-deep">
                                            {player.points % 1 === 0 ? player.points : player.points.toFixed(1)}
                                        </div>
                                        <div className="text-[10px] font-fredoka text-gray-400">pts</div>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                )}

                {mode === 'projected' && (
                    <p className="text-center text-cream/40 text-xs font-fredoka mt-3">
                        * Incluye puntos proyectados de partidos en curso
                    </p>
                )}
            </div>
        </PullToRefresh>
    );
}
