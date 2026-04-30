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

    // Bet outcome — only meaningful once the match is decided.
    //   pick 'A' (red) wins iff winner === 'red'
    //   pick 'B' (blue) wins iff winner === 'blue'
    //   pick 'AS' (empate) wins iff isComplete && winner === null (halved at finish)
    const matchSettled = !!userBet && match.isComplete;
    const betWon = matchSettled
        ? (userBet!.pickedOutcome === 'A' && match.winner === 'red')
          || (userBet!.pickedOutcome === 'B' && match.winner === 'blue')
          || (userBet!.pickedOutcome === 'AS' && match.winner === null)
        : false;
    const realizedPayout = userBet?.realizedPayout ?? null;

    // Coloured side stripe at the left edge — green on win, rose on loss, neutral otherwise.
    const stripeClass = matchSettled
        ? betWon ? 'border-l-[3px] border-l-emerald-400/80' : 'border-l-[3px] border-l-rose-400/70'
        : userBet ? 'border-l-[3px] border-l-[#fbbc05]/55' : '';

    return (
        <button
            type="button"
            onClick={onClick}
            disabled={locked && !userBet}
            className={`flex w-full items-center justify-between rounded-[12px] border border-[#31316b]/60 bg-[#0f172b]/70 px-3 py-2.5 text-left transition-colors hover:bg-[#0f172b] disabled:opacity-60 ${stripeClass}`}
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
                {userBet && (
                    <div className={`mt-0.5 font-fredoka text-[10px] ${pickedClass}`}>
                        Mi pick: <span className="font-bangers tracking-wider uppercase">{pickedLabel}</span>
                    </div>
                )}
            </div>
            <div className="ml-3 flex flex-col items-end gap-1">
                {!userBet ? (
                    locked ? (
                        <span className="rounded-full bg-white/8 px-2.5 py-1 font-bangers text-[10px] uppercase tracking-wider text-white/45">
                            Cerrado
                        </span>
                    ) : (
                        <span className="rounded-full border border-[#fbbc05]/50 bg-[#fbbc05]/10 px-2.5 py-1 font-bangers text-[10px] uppercase tracking-wider text-[#fbbc05]">
                            Apostar · {formatCurrency(2)}
                        </span>
                    )
                ) : matchSettled ? (
                    (() => {
                        // Net = realizedPayout (full pot share, includes stake) − stake.
                        // Refund case (nobody picked the winning side): realizedPayout = stake, net = 0.
                        const net = (realizedPayout ?? 0) - userBet!.amount;
                        const netLabel = net > 0 ? `+${formatCurrency(net)}`
                            : net < 0 ? `−${formatCurrency(Math.abs(net))}`
                            : `±${formatCurrency(0)}`;
                        return (
                            <>
                                <span className={`rounded-full px-2.5 py-1 font-bangers text-[10px] uppercase tracking-wider ${
                                    betWon
                                        ? 'border border-emerald-400/60 bg-emerald-500/15 text-emerald-300'
                                        : 'border border-rose-400/50 bg-rose-500/12 text-rose-300/95'
                                }`}>
                                    {betWon ? '✓ Ganada' : '✗ Perdida'}
                                </span>
                                <span className={`font-bowlby text-[12px] leading-none ${
                                    net > 0 ? 'text-emerald-300'
                                    : net < 0 ? 'text-rose-300/80'
                                    : 'text-white/55'
                                }`}>
                                    {netLabel}
                                </span>
                            </>
                        );
                    })()
                ) : (
                    <span className="rounded-full border border-[#fbbc05]/40 bg-[#fbbc05]/8 px-2.5 py-1 font-bangers text-[10px] uppercase tracking-wider text-[#fbbc05]/85">
                        En curso
                    </span>
                )}
            </div>
        </button>
    );
}
