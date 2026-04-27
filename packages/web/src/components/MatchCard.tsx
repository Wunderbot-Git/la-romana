'use client';

/**
 * MatchCard — leaderboard view of a single singles or fourball match.
 *
 * Three-panel layout:
 *   ┌──────────────┬─────────────┬──────────────┐
 *   │ PIRATAS side │ STATUS      │ FANTASMAS    │
 *   │ (red/gold)   │ badge       │ (blue/ice)   │
 *   │              │             │              │
 *   │ avatar(s)    │ "3 UP"      │ avatar(s)    │
 *   │ NAME (ph)    │ "HOYO 12"   │ NAME (ph)    │
 *   └──────────────┴─────────────┴──────────────┘
 *
 * Center badge gradient signals current leader:
 *   - Gold gradient    → Piratas leading
 *   - Ice-blue gradient → Fantasmas leading
 *   - Silver gradient   → A/S (halved at final or tied mid-match)
 *   - Dark navy         → Not started
 *
 * Sub-status text:
 *   - "FINAL"     → match decided
 *   - "DORMIE"    → leader's lead == holes remaining
 *   - "HOYO N"    → in progress, current hole
 *   - "Sin Iniciar" / blank → not started
 *
 * Adapted from the Bogotá MatchCard. La Romana plays 18 holes (Bogotá was 9).
 */

import { useState } from 'react';
import { Avatar } from './Avatar';
import type { MatchDetail, MatchPlayer } from '@/hooks/useLeaderboard';

const TOTAL_HOLES = 18;

interface MatchCardProps {
    match: MatchDetail;
    /** When provided, the card is clickable to expand a scorecard below it. */
    onToggle?: () => void;
    /** Already-expanded scorecard JSX from the parent. */
    expandedContent?: React.ReactNode;
}

export function MatchCard({ match, onToggle, expandedContent }: MatchCardProps) {
    const isRedWin = match.winner === 'red';
    const isBlueWin = match.winner === 'blue';
    const isAS = match.finalStatus === 'A/S' || match.finalStatus === 'AS';
    const isFinal = match.isComplete;
    const isNotStarted = match.finalStatus === 'Not Started' || match.holesPlayed === 0;

    // Determine current leader (for gradient choice)
    const redIsLeading = isRedWin || (!isBlueWin && match.redPoints > match.bluePoints);
    const blueIsLeading = isBlueWin || (!isRedWin && match.bluePoints > match.redPoints);

    // ── CENTER BADGE TEXT ────────────────────────────────────────────────────
    let statusTop: React.ReactNode;
    let statusBottom = '';

    if (isNotStarted) {
        statusTop = (
            <div className="flex flex-col items-center leading-none">
                <span className="text-sm font-bangers italic tracking-tighter">Sin</span>
                <span className="text-sm font-bangers italic tracking-tighter">Iniciar</span>
            </div>
        );
    } else if (isAS) {
        statusTop = 'A/S';
    } else {
        statusTop = match.finalStatus.replace('UP', ' UP');
    }

    const holesRemaining = TOTAL_HOLES - match.holesPlayed;
    const leadMatch = match.finalStatus.match(/^(\d+)\s*UP/);
    const lead = leadMatch ? parseInt(leadMatch[1], 10) : 0;
    if (isFinal) {
        statusBottom = 'FINAL';
    } else if (match.holesPlayed > 0) {
        statusBottom = lead > 0 && lead === holesRemaining ? 'DORMIE' : `HOYO ${match.holesPlayed}`;
    }

    // ── CENTER BADGE GRADIENT ────────────────────────────────────────────────
    let centerGradient = 'bg-[#1c2f3e]';                                              // not started fallback
    if (!isNotStarted) {
        if (isAS) centerGradient = 'bg-gradient-to-b from-[#9aa3ad] to-[#5b6470]';    // silver — halved
        else if (redIsLeading) centerGradient = 'bg-gradient-to-b from-[#FFE082] via-[#F0C850] to-[#B97813]'; // gold — Piratas
        else if (blueIsLeading) centerGradient = 'bg-gradient-to-b from-[#A8D0F0] via-[#5BA6DC] to-[#2E5F8E]'; // ice — Fantasmas
        else centerGradient = 'bg-gradient-to-b from-[#9aa3ad] to-[#5b6470]';         // tied with no points yet
    }

    // ── PANEL ACCENT BORDERS ─────────────────────────────────────────────────
    const GOLD = '#F0C850';
    const ICE = '#5BA6DC';
    const MUTED = '#3a4a5a';
    const leftBorderColor = isFinal && isBlueWin ? MUTED : GOLD;   // red/Piratas (left)
    const rightBorderColor = isFinal && isRedWin ? MUTED : ICE;    // blue/Fantasmas (right)

    const panelBg = (loser: boolean) => (isNotStarted ? 'transparent' : loser ? 'rgba(255,255,255,0.02)' : 'rgba(255,255,255,0.03)');

    const isFourball = match.matchType === 'fourball';

    // Glow tint based on who's leading / won. Subtle ambient outer glow on the card.
    const glowColor = isNotStarted
        ? null
        : redIsLeading
        ? '240,200,80'   // gold (Piratas)
        : blueIsLeading
        ? '91,166,220'   // ice (Fantasmas)
        : null;          // tied / silver — no team glow
    const glowIntensity = isFinal ? 0.45 : isNotStarted ? 0 : 0.28; // stronger for decided matches
    const cardBoxShadow = glowColor
        ? `0 4px 12px rgba(0,0,0,0.5), 0 0 26px rgba(${glowColor},${glowIntensity}), 0 0 60px rgba(${glowColor},${glowIntensity * 0.55})`
        : '0 4px 12px rgba(0,0,0,0.5)';

    return (
        <div
            className="rounded-[16px] overflow-hidden transition-shadow duration-500"
            style={{
                background: 'linear-gradient(180deg, rgba(28,47,62,0.96) 0%, rgba(15,23,43,0.96) 100%)',
                border: '2px solid #31316b',
                boxShadow: cardBoxShadow,
            }}
        >
            <button
                type="button"
                onClick={onToggle}
                disabled={!onToggle}
                className="w-full text-left grid grid-cols-[1fr_auto_1fr] items-stretch min-h-[156px]"
            >
                {/* ── LEFT PANEL — PIRATAS (red, gold ring) ──────────────────── */}
                <div
                    className="flex flex-col items-center justify-center py-2 px-1.5 relative overflow-hidden"
                    style={{
                        background: panelBg(isFinal && isBlueWin),
                        borderLeft: `3px solid ${leftBorderColor}`,
                    }}
                >
                    {redIsLeading && !isNotStarted && (
                        <div
                            className="pointer-events-none absolute inset-0"
                            style={{
                                background:
                                    'radial-gradient(circle at 50% 38%, rgba(240,200,80,0.22), transparent 65%)',
                                filter: 'blur(2px)',
                            }}
                            aria-hidden
                        />
                    )}
                    <div className="relative z-10 flex flex-col items-center">
                        <PlayerAvatars players={match.redPlayers} team="red" stacked={isFourball} dim={isNotStarted} />
                        <PlayerNames players={match.redPlayers} team="red" dim={isNotStarted} matchType={match.matchType} />
                    </div>
                </div>

                {/* ── CENTER — STATUS BADGE ──────────────────────────────────── */}
                <div className="relative flex items-center justify-center px-2 py-2 min-w-[100px] sm:min-w-[140px]">
                    {/* Soft team-color glow behind the badge */}
                    {!isNotStarted && glowColor && (
                        <div
                            className="pointer-events-none absolute inset-0 z-0"
                            style={{
                                background: `radial-gradient(circle at center, rgba(${glowColor},${isFinal ? 0.42 : 0.26}), transparent 62%)`,
                                filter: 'blur(8px)',
                            }}
                            aria-hidden
                        />
                    )}
                    <div
                        className={`relative w-full py-2.5 rounded-2xl border-[3px] flex flex-col items-center justify-center overflow-hidden ${centerGradient} ${
                            isNotStarted ? 'border-[#3a3a5e] shadow-none' : 'border-[#1e293b] shadow-[0_5px_0_#1e293b]'
                        }`}
                        style={
                            !isNotStarted && glowColor
                                ? {
                                    boxShadow: `0 5px 0 #1e293b, 0 0 18px rgba(${glowColor},${isFinal ? 0.55 : 0.32})`,
                                }
                                : undefined
                        }
                    >
                        {!isNotStarted && (
                            <div className="absolute inset-x-0 top-0 h-[45%] bg-gradient-to-b from-white/30 to-white/5 rounded-t-xl pointer-events-none z-0" />
                        )}
                        {isNotStarted ? (
                            <div className="text-[#7777aa] font-bangers text-[13px] tracking-wider uppercase text-center leading-tight py-1">
                                Sin<br />Iniciar
                            </div>
                        ) : (
                            <>
                                <div className="relative z-20 flex justify-center w-full" style={{ filter: 'drop-shadow(2px 3px 0 rgba(0,0,0,0.55))' }}>
                                    <span
                                        className="text-[30px] sm:text-[38px] font-bangers tracking-wide leading-[0.9] absolute inset-x-0 text-center text-[#1e293b]"
                                        style={{ WebkitTextStroke: '5px #1e293b' }}
                                    >
                                        {typeof statusTop === 'string' ? statusTop : statusTop}
                                    </span>
                                    <span className="text-[30px] sm:text-[38px] font-bangers tracking-wide leading-[0.9] relative text-white text-center">
                                        {statusTop}
                                    </span>
                                </div>
                                {statusBottom && (
                                    <div className="relative z-20 mt-0.5 mb-0.5 flex justify-center w-full uppercase" style={{ filter: 'drop-shadow(1px 2px 0 rgba(0,0,0,0.6))' }}>
                                        <span className="text-[12px] sm:text-[14px] font-bangers tracking-widest leading-none absolute inset-x-0 text-center text-[#1e293b]" style={{ WebkitTextStroke: '3px #1e293b' }}>
                                            {statusBottom}
                                        </span>
                                        <span className="text-[12px] sm:text-[14px] font-bangers tracking-widest leading-none relative text-white text-center">
                                            {statusBottom}
                                        </span>
                                    </div>
                                )}
                            </>
                        )}
                    </div>
                </div>

                {/* ── RIGHT PANEL — FANTASMAS (blue, ice ring) ───────────────── */}
                <div
                    className="flex flex-col items-center justify-center py-2 px-1.5 relative overflow-hidden"
                    style={{
                        background: panelBg(isFinal && isRedWin),
                        borderRight: `3px solid ${rightBorderColor}`,
                    }}
                >
                    {blueIsLeading && !isNotStarted && (
                        <div
                            className="pointer-events-none absolute inset-0"
                            style={{
                                background:
                                    'radial-gradient(circle at 50% 38%, rgba(91,166,220,0.24), transparent 65%)',
                                filter: 'blur(2px)',
                            }}
                            aria-hidden
                        />
                    )}
                    <div className="relative z-10 flex flex-col items-center">
                        <PlayerAvatars players={match.bluePlayers} team="blue" stacked={isFourball} dim={isNotStarted} />
                        <PlayerNames players={match.bluePlayers} team="blue" dim={isNotStarted} matchType={match.matchType} />
                    </div>
                </div>
            </button>

            {expandedContent}
        </div>
    );
}

// ── helpers ─────────────────────────────────────────────────────────────────

function PlayerAvatars({
    players,
    team,
    stacked,
    dim,
}: {
    players: MatchPlayer[];
    team: 'red' | 'blue';
    stacked: boolean;
    dim: boolean;
}) {
    if (players.length === 0) return <div className="h-[88px]" />;

    if (stacked && players.length > 1) {
        // Bogotá pattern: smaller avatars, diagonally tucked — player 2 partly
        // hidden behind player 1, both faces still readable.
        const SIZE = 50;
        const X_OFFSET = 45;  // right shift for 2nd (= 5px overlap, ~10%)
        const Y_OFFSET = 18;  // down shift for 2nd
        const containerW = SIZE + X_OFFSET;
        const containerH = SIZE + Y_OFFSET;
        return (
            <div
                className={`relative shrink-0 ${dim ? 'grayscale opacity-50' : ''}`}
                style={{ width: containerW, height: containerH }}
            >
                {players.map((p, i) => (
                    <div
                        key={p.id}
                        className="absolute"
                        style={{
                            width: SIZE,
                            height: SIZE,
                            top: i === 0 ? 0 : Y_OFFSET,
                            left: i === 0 ? 0 : X_OFFSET,
                            zIndex: i === 0 ? 2 : 1,
                        }}
                    >
                        <Avatar name={p.name} team={team} size={SIZE} className="w-full h-full" />
                    </div>
                ))}
            </div>
        );
    }

    // Single big avatar (singles)
    return (
        <div className={`shrink-0 ${dim ? 'grayscale opacity-50' : ''}`}>
            <Avatar name={players[0].name} team={team} size={96} />
        </div>
    );
}

function PlayerNames({
    players,
    team,
    dim,
    matchType,
}: {
    players: MatchPlayer[];
    team: 'red' | 'blue';
    dim: boolean;
    matchType: 'singles1' | 'singles2' | 'fourball';
}) {
    const color = dim ? '#aaa' : team === 'red' ? '#F0C850' : '#5BA6DC';
    const subColor = dim ? '#888' : '#888';
    const phFor = (p: MatchPlayer): number | null => {
        const v = matchType === 'fourball' ? p.playingHcpFourball : p.playingHcpSingles;
        return typeof v === 'number' ? v : null;
    };
    return (
        <div className="flex flex-col items-center w-full mt-1.5">
            {players.map(p => {
                const ph = phFor(p);
                const display = ph !== null ? ph : p.hcp;  // fallback to index if PH missing
                return (
                    <div
                        key={p.id}
                        className="font-bangers text-[13px] sm:text-[15px] leading-tight text-center tracking-wider truncate w-full uppercase"
                        style={{ color }}
                    >
                        {p.name.split(' ')[0]}
                        <span className="text-[10px] ml-0.5" style={{ color: subColor }}>
                            ({display})
                        </span>
                    </div>
                );
            })}
        </div>
    );
}
