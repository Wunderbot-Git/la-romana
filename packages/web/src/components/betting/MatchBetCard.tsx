'use client';

import type { MatchDetail } from '@/hooks/useLeaderboard';
import type { Bet } from '@/hooks/useBetting';
import { formatCurrency } from '@/lib/currency';

/**
 * One bet-row per (round, flight, segment). Click handler opens the detail
 * sheet to place / inspect the bet.
 */
export function MatchBetCard({
    match,
    userBet,
    onClick,
    locked,
}: {
    match: MatchDetail;
    userBet?: Bet;
    onClick: () => void;
    locked: boolean;
}) {
    const segmentLabel = match.matchType === 'singles1' ? 'Singles 1'
        : match.matchType === 'singles2' ? 'Singles 2'
        : 'Mejor Bola';
    const redName = match.redPlayers[0]?.name?.split(' ')[0] ?? '—';
    const blueName = match.bluePlayers[0]?.name?.split(' ')[0] ?? '—';
    const redLabel = match.matchType === 'fourball'
        ? match.redPlayers.map(p => p.name.split(' ')[0]).join(' / ')
        : redName;
    const blueLabel = match.matchType === 'fourball'
        ? match.bluePlayers.map(p => p.name.split(' ')[0]).join(' / ')
        : blueName;

    const pickedLabel = userBet
        ? userBet.pickedOutcome === 'A' ? redLabel
        : userBet.pickedOutcome === 'B' ? blueLabel
        : 'Empate'
        : null;
    const pickedClass = userBet
        ? userBet.pickedOutcome === 'A' ? 'text-team-red'
        : userBet.pickedOutcome === 'B' ? 'text-team-blue'
        : 'text-white/70'
        : 'text-white/40';

    return (
        <button
            type="button"
            onClick={onClick}
            disabled={locked && !userBet}
            className="flex w-full items-center justify-between rounded-[12px] border border-[#31316b]/60 bg-[#0f172b]/70 px-3 py-2.5 text-left transition-colors hover:bg-[#0f172b] disabled:opacity-60"
        >
            <div className="min-w-0 flex-1">
                <div className="font-bangers text-[10px] uppercase tracking-wider text-[#fbbc05]/75">
                    {segmentLabel}
                </div>
                <div className="mt-0.5 truncate font-bangers text-sm tracking-wider text-white">
                    <span className="text-team-red">{redLabel}</span>
                    <span className="mx-1.5 text-white/40">vs</span>
                    <span className="text-team-blue">{blueLabel}</span>
                </div>
                {match.finalStatus && match.finalStatus !== 'Not Started' && (
                    <div className="mt-0.5 font-fredoka text-[10px] text-white/45">{match.finalStatus}</div>
                )}
            </div>
            <div className="ml-3 flex flex-col items-end gap-1">
                {userBet ? (
                    <span className={`rounded-full bg-white/8 px-2.5 py-1 font-bangers text-[10px] uppercase tracking-wider ${pickedClass}`}>
                        Mi pick: {pickedLabel}
                    </span>
                ) : locked ? (
                    <span className="rounded-full bg-white/8 px-2.5 py-1 font-bangers text-[10px] uppercase tracking-wider text-white/45">
                        Cerrado
                    </span>
                ) : (
                    <span className="rounded-full border border-[#fbbc05]/50 bg-[#fbbc05]/10 px-2.5 py-1 font-bangers text-[10px] uppercase tracking-wider text-[#fbbc05]">
                        Apostar · {formatCurrency(2)}
                    </span>
                )}
            </div>
        </button>
    );
}
