'use client';

import { Fragment, useLayoutEffect, useRef, useState } from 'react';
import type {
    LeaderboardData,
    StablefordHoleDetail,
    StablefordRoundBreakdown,
    StablefordStanding,
} from '@/hooks/useLeaderboard';
import { Avatar } from '@/components/Avatar';

const CARD_DARK =
    'bg-gradient-to-b from-[#1c2f3e] to-[#0f172b] border-[2px] border-[#31316b] rounded-[16px] shadow-[0_4px_12px_rgba(0,0,0,0.5)]';

/**
 * Filter:
 *   - 'total'  → cumulative Stableford ranking across all rounds (default).
 *               Phantom (Fantasma) IS included so other players' MVP / Worst
 *               Player wagers on him resolve correctly.
 *   - 1|2|3    → daily ranking ("Mejor del Día") for that round, with $100/$50
 *               payouts on top-2. Phantom is EXCLUDED — Fantasma doesn't win
 *               money (Phil-Request 2026-05-02, revidiert).
 */
export type StablefordFilter = 'total' | number;

/**
 * Individual Stableford ranking — supports a "Total" view (cumulative) and
 * per-day "Día N" filter (just that round's points, with daily payout pills).
 * Click a row to expand a per-round breakdown.
 */
export function StablefordTable({ data, filter = 'total' }: { data: LeaderboardData; filter?: StablefordFilter }) {
    const isDayFilter = typeof filter === 'number';
    const dayNumber = isDayFilter ? (filter as number) : null;

    // Total view: phantom included (basis for MVP / Worst Player wagers).
    // Day view: phantom excluded (Mejor del Día is a money ranking).
    const allStandings = data.stablefordStandings;
    const isPhantom = (name: string) => {
        const n = name.trim().toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');
        return n.startsWith('fantasma') || n.startsWith('phantasma');
    };

    const standings = isDayFilter
        ? allStandings
              .filter(s => !isPhantom(s.playerName))
              .map(s => {
                  const round = s.byRound?.find(r => r.roundNumber === dayNumber);
                  const holes = round?.holes ?? [];
                  const played = holes.filter(h => h.grossScore !== null && h.netScore !== null);
                  const dayNet = played.length > 0
                      ? played.reduce((sum, h) => sum + (h.netScore ?? 0), 0)
                      : null;
                  return {
                      ...s,
                      _dayNet: dayNet,
                      _dayHolesPlayed: played.length,
                  };
              })
              .filter(s => s._dayHolesPlayed > 0)
              .sort((a, b) => {
                  if (a._dayNet === null && b._dayNet === null) return a.playerName.localeCompare(b.playerName);
                  if (a._dayNet === null) return 1;
                  if (b._dayNet === null) return -1;
                  return a._dayNet - b._dayNet || a.playerName.localeCompare(b.playerName);
              })
        : [...allStandings].sort(
              (a, b) => b.stablefordCumulative - a.stablefordCumulative || a.playerName.localeCompare(b.playerName),
          );

    const totalRounds = data.rounds.length;
    const [expandedId, setExpandedId] = useState<string | null>(null);

    const toggle = (id: string) => setExpandedId(prev => (prev === id ? null : id));

    // ── FLIP animation: when standings get reordered (new scores arrive),
    // each row slides smoothly from its old vertical position to its new one.
    // We snapshot rect.top before each render via useLayoutEffect; on the next
    // run (after React applied the new order) we compare and apply an inverse
    // transform, then transition back to identity.
    const rowRefs = useRef<Map<string, HTMLTableRowElement>>(new Map());
    const flashTimers = useRef<Map<string, number>>(new Map());
    const prevTops = useRef<Map<string, number>>(new Map());
    const prevPoints = useRef<Map<string, number>>(new Map());

    useLayoutEffect(() => {
        const newTops = new Map<string, number>();
        rowRefs.current.forEach((el, id) => {
            newTops.set(id, el.getBoundingClientRect().top);
        });

        if (prevTops.current.size > 0) {
            rowRefs.current.forEach((el, id) => {
                const oldTop = prevTops.current.get(id);
                const newTop = newTops.get(id);
                if (oldTop !== undefined && newTop !== undefined && oldTop !== newTop) {
                    const delta = oldTop - newTop;
                    // 1. Apply inverse transform without transition.
                    el.style.transition = 'none';
                    el.style.transform = `translateY(${delta}px)`;
                    el.style.willChange = 'transform';
                    // 2. Force reflow so the browser registers the inverse position.
                    el.getBoundingClientRect();
                    // 3. Next frame: transition back to identity.
                    requestAnimationFrame(() => {
                        el.style.transition = 'transform 520ms cubic-bezier(0.22, 1, 0.36, 1)';
                        el.style.transform = '';
                    });
                }

                // Flash highlight when this player's points changed.
                const standing = standings.find(s => s.playerId === id);
                if (standing) {
                    const oldPts = prevPoints.current.get(id);
                    if (oldPts !== undefined && oldPts !== standing.stablefordCumulative) {
                        el.classList.add('ranking-row-flash');
                        const existing = flashTimers.current.get(id);
                        if (existing) window.clearTimeout(existing);
                        const t = window.setTimeout(() => {
                            el.classList.remove('ranking-row-flash');
                            flashTimers.current.delete(id);
                        }, 1200);
                        flashTimers.current.set(id, t);
                    }
                }
            });
        }

        prevTops.current = newTops;
        prevPoints.current = new Map(
            standings.map(s => [
                s.playerId,
                isDayFilter ? (s as any)._dayNet ?? 0 : s.stablefordCumulative,
            ]),
        );
    });

    return (
        <div className={`${CARD_DARK} overflow-hidden`}>
            <table className="w-full text-sm">
                <thead className="bg-[#0f172b] text-[#fbbc05] text-xs font-bangers tracking-wider">
                    <tr>
                        <th className="px-2 py-2 text-left w-8">#</th>
                        <th className="px-2 py-2 text-left">Jugador</th>
                        <th className="px-2 py-2 text-center">HCP</th>
                        <th className="px-2 py-2 text-right">{isDayFilter ? 'Net' : 'Pts'}</th>
                        <th className="px-2 py-2 text-center">{isDayFilter ? 'Premio' : 'Rondas'}</th>
                    </tr>
                </thead>
                <tbody>
                    {standings.map((s, i) => {
                        const teamForAvatar: 'red' | 'blue' = s.team === 'blue' ? 'blue' : 'red';
                        const isExpanded = expandedId === s.playerId;
                        const teamColorClass =
                            s.team === 'red'
                                ? 'text-team-red'
                                : s.team === 'blue'
                                ? 'text-team-blue'
                                : 'text-white';
                        const dayPoints = isDayFilter ? (s as any)._dayNet ?? 0 : s.stablefordCumulative;
                        const payout = isDayFilter ? (i === 0 ? 100 : i === 1 ? 50 : 0) : 0;
                        return (
                            <Fragment key={s.playerId}>
                                <tr
                                    ref={el => {
                                        if (el) rowRefs.current.set(s.playerId, el);
                                        else rowRefs.current.delete(s.playerId);
                                    }}
                                    onClick={() => toggle(s.playerId)}
                                    className={`cursor-pointer border-t border-[#31316b]/50 transition-colors ${
                                        isExpanded ? 'bg-[#0f172b]/60'
                                        : payout > 0 ? 'bg-[#fbbc05]/8 hover:bg-[#fbbc05]/15'
                                        : 'hover:bg-[#0f172b]/40'
                                    }`}
                                >
                                    <td className="px-2 py-2 font-bangers text-[#fbbc05] align-middle">{i + 1}</td>
                                    <td className="px-2 py-2 align-middle">
                                        <div className="flex items-center gap-2 min-w-0">
                                            <Avatar
                                                name={s.playerName}
                                                team={teamForAvatar}
                                                size={32}
                                                className="shrink-0"
                                            />
                                            <span className={`truncate font-bangers tracking-wider ${teamColorClass}`}>
                                                {s.playerName}
                                            </span>
                                            <Chevron expanded={isExpanded} />
                                        </div>
                                    </td>
                                    <td className="px-2 py-2 text-center text-white/60 align-middle">
                                        {s.handicapIndex}
                                    </td>
                                    <td className="px-2 py-2 text-right font-bangers text-white text-lg align-middle">
                                        {dayPoints}
                                    </td>
                                    <td className="px-2 py-2 text-center align-middle">
                                        {isDayFilter ? (
                                            payout > 0 ? (
                                                <span className="inline-flex rounded-full bg-[#fbbc05]/20 px-2 py-0.5 font-bowlby text-[12px] text-[#fbbc05]">
                                                    ${payout}
                                                </span>
                                            ) : (
                                                <span className="text-white/30">—</span>
                                            )
                                        ) : (
                                            <span className="text-white/50">{s.roundsPlayed}</span>
                                        )}
                                    </td>
                                </tr>
                                {isExpanded && (
                                    <tr className="bg-[#0a1322]/85 border-t border-[#31316b]/40">
                                        <td colSpan={5} className="px-3 py-3">
                                            <PerRoundBreakdown
                                                standing={s}
                                                totalRounds={totalRounds}
                                                focusRound={dayNumber ?? undefined}
                                            />
                                        </td>
                                    </tr>
                                )}
                            </Fragment>
                        );
                    })}
                    {standings.length === 0 && (
                        <tr>
                            <td colSpan={5} className="px-3 py-6 text-center text-white/40 italic font-fredoka">
                                {isDayFilter ? 'Día sin jugar' : 'Sin puntos todavía'}
                            </td>
                        </tr>
                    )}
                </tbody>
            </table>
        </div>
    );
}

function Chevron({ expanded }: { expanded: boolean }) {
    return (
        <svg
            width="14"
            height="14"
            viewBox="0 0 14 14"
            className={`shrink-0 transition-transform duration-200 text-white/45 ${expanded ? 'rotate-180' : ''}`}
            fill="none"
            aria-hidden
        >
            <path d="M3 5 L7 9 L11 5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
    );
}

/**
 * Per-round breakdown shown inside an expanded player row.
 * Each round card is clickable — opens an in-place per-hole detail panel below
 * the cards so the user can see how those Stableford points were earned.
 */
function PerRoundBreakdown({
    standing,
    totalRounds,
    focusRound,
}: {
    standing: StablefordStanding;
    totalRounds: number;
    focusRound?: number;
}) {
    const byRound = standing.byRound ?? [];
    // When a day filter is active in the parent table, auto-expand that day's hole detail.
    const [expandedRound, setExpandedRound] = useState<number | null>(focusRound ?? null);

    // Always render `totalRounds` cards so missing rounds appear as "—".
    const rows = Array.from({ length: totalRounds }, (_, i) => {
        const num = i + 1;
        return byRound.find(r => r.roundNumber === num) ?? null;
    });

    const expanded = expandedRound !== null
        ? byRound.find(r => r.roundNumber === expandedRound) ?? null
        : null;

    return (
        <div className="space-y-2">
            <div className="grid grid-cols-3 gap-2">
                {rows.map((r, idx) => {
                    const num = idx + 1;
                    const empty = r === null;
                    const hasDetail = !empty && (r!.holes?.length ?? 0) > 0;
                    const isActive = expandedRound === num;
                    const onClick = hasDetail
                        ? () => setExpandedRound(prev => (prev === num ? null : num))
                        : undefined;
                    return (
                        <button
                            key={num}
                            type="button"
                            onClick={onClick}
                            disabled={!hasDetail}
                            className={`text-left rounded-[10px] border px-2.5 py-2 transition-colors ${
                                isActive
                                    ? 'border-[#fbbc05] bg-[#fbbc05]/12 shadow-[0_0_16px_rgba(251,188,5,0.18)]'
                                    : hasDetail
                                    ? 'border-[#31316b]/60 bg-[#0f172b]/80 hover:bg-[#0f172b] cursor-pointer'
                                    : 'border-[#31316b]/40 bg-[#0f172b]/40 opacity-60 cursor-default'
                            }`}
                        >
                            <div className="flex items-baseline justify-between gap-1">
                                <span className={`font-bangers text-[10px] uppercase tracking-widest ${
                                    isActive ? 'text-[#fbbc05]' : 'text-[#fbbc05]/85'
                                }`}>
                                    R{num}
                                </span>
                                <span className="font-bowlby text-[20px] leading-none text-white">
                                    {empty ? '—' : r!.stablefordPoints}
                                </span>
                            </div>
                            <div className="mt-1 truncate font-fredoka text-[10px] text-white/55">
                                {empty ? 'Sin jugar' : r!.courseName}
                            </div>
                            {!empty && r!.ryderIndividualPoints > 0 && (
                                <div className="mt-0.5 font-bangers text-[9px] uppercase tracking-wider text-[#fbbc05]/80">
                                    Ryder · {r!.ryderIndividualPoints}
                                </div>
                            )}
                        </button>
                    );
                })}
            </div>

            {expanded && expanded.holes && (
                <RoundHoleDetail round={expanded} />
            )}
        </div>
    );
}

/** Hole-by-hole Stableford breakdown for a single round. Renders front 9 + back 9 as scrollable tables. */
function RoundHoleDetail({ round }: { round: StablefordRoundBreakdown }) {
    const holes = round.holes ?? [];
    const front = holes.slice(0, 9);
    const back = holes.slice(9, 18);
    const outPts = front.reduce((s, h) => s + h.points, 0);
    const inPts = back.reduce((s, h) => s + h.points, 0);

    return (
        <div className="rounded-[12px] border border-[#fbbc05]/35 bg-[#0a1322]/85 p-2.5">
            {/* Header */}
            <div className="mb-2 flex items-center justify-between gap-2 px-1">
                <div className="min-w-0">
                    <div className="font-bangers text-[10px] uppercase tracking-widest text-[#fbbc05]">
                        R{round.roundNumber} · {round.courseName}
                    </div>
                    <div className="font-fredoka text-[10px] text-white/55">
                        {round.playingHandicap !== undefined && <>Playing HCP {round.playingHandicap} · </>}
                        Total {round.stablefordPoints} pts
                    </div>
                </div>
            </div>

            <NineDetailTable label="OUT" holes={front} totalPts={outPts} />
            <div className="h-1.5" />
            <NineDetailTable label="IN" holes={back} totalPts={inPts} />
        </div>
    );
}

function NineDetailTable({
    label,
    holes,
    totalPts,
}: {
    label: string;
    holes: StablefordHoleDetail[];
    totalPts: number;
}) {
    if (holes.length === 0) return null;
    return (
        <table className="w-full table-fixed text-xs">
            <colgroup>
                <col style={{ width: '38px' }} />
                {holes.map(h => <col key={h.holeNumber} />)}
                <col style={{ width: '34px' }} />
            </colgroup>
            <thead>
                <tr className="bg-[#0f172b]/85 text-[#fbbc05]/85 font-bangers">
                    <th className="px-1 py-1 text-left text-[10px] uppercase tracking-wider">Hoyo</th>
                    {holes.map(h => (
                        <th key={h.holeNumber} className="px-0 py-1 text-center text-[11px]">
                            {h.holeNumber}
                        </th>
                    ))}
                    <th className="px-0 py-1 text-center text-[10px] uppercase">{label}</th>
                </tr>
            </thead>
            <tbody>
                <tr className="text-white/55">
                    <td className="px-1 py-0.5 text-left text-[10px]">Par</td>
                    {holes.map(h => (
                        <td key={h.holeNumber} className="px-0 py-0.5 text-center">{h.par}</td>
                    ))}
                    <td className="px-0 py-0.5 text-center text-white/30">·</td>
                </tr>
                <tr>
                    <td className="px-1 py-0.5 text-left text-[10px] text-white/55">Gross</td>
                    {holes.map(h => (
                        <td key={h.holeNumber} className="px-0 py-0.5 text-center font-bangers text-[12px] text-white">
                            {h.grossScore ?? '—'}
                        </td>
                    ))}
                    <td className="px-0 py-0.5 text-center text-white/30">·</td>
                </tr>
                <tr className="text-white/70">
                    <td className="px-1 py-0.5 text-left text-[10px] text-white/55">Net</td>
                    {holes.map(h => {
                        const stroked = h.strokes > 0;
                        return (
                            <td key={h.holeNumber} className="px-0 py-0.5 text-center">
                                <span className="relative inline-block">
                                    {h.netScore ?? '—'}
                                    {stroked && (
                                        <span className="absolute -top-0.5 -right-1 text-[8px] leading-none text-[#fbbc05]">
                                            {h.strokes > 1 ? `•${h.strokes}` : '•'}
                                        </span>
                                    )}
                                </span>
                            </td>
                        );
                    })}
                    <td className="px-0 py-0.5 text-center text-white/30">·</td>
                </tr>
                <tr>
                    <td className="px-1 py-1 text-left text-[10px] uppercase tracking-wider font-bangers text-[#fbbc05]/85">
                        Pts
                    </td>
                    {holes.map(h => (
                        <td key={h.holeNumber} className="px-0 py-1 text-center">
                            <span className={`inline-flex h-[18px] w-[18px] items-center justify-center rounded-full font-bangers text-[10px] ${
                                h.points >= 3
                                    ? 'bg-[#fbbc05]/25 text-[#fbbc05]'
                                    : h.points === 2
                                    ? 'bg-white/10 text-white/85'
                                    : h.points === 1
                                    ? 'bg-white/5 text-white/55'
                                    : 'bg-rose-500/20 text-rose-300'
                            }`}>
                                {h.points}
                            </span>
                        </td>
                    ))}
                    <td className="px-0 py-1 text-center font-bowlby text-[13px] text-[#fbbc05]">
                        {totalPts}
                    </td>
                </tr>
            </tbody>
        </table>
    );
}
