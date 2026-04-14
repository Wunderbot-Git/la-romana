'use client';

import { Match } from '@/hooks/useLeaderboard';

interface MatchCardProps {
    match: Match;
    onClick?: () => void;
}

export function MatchCard({ match, onClick }: MatchCardProps) {
    const isRedWin = match.matchWinner === 'red';
    const isBlueWin = match.matchWinner === 'blue';
    const isAS = (match.matchStatus === 'A/S' || match.matchStatus === 'AS');
    const isFinal = match.status === 'completed';
    const isNotStarted = match.status === 'not_started';

    const displayStatus = match.matchStatus.replace('DN', 'UP');

    // ── CENTER BADGE ─────────────────────────────────────────────────────────
    let statusTop: React.ReactNode = '';
    let statusBottom = '';

    // Who is "winning" (leading) right now?
    const redIsWinning = isRedWin || match.currentLeader === 'red';

    let centerGradient = 'bg-gradient-to-b from-[#5BA3E0] to-[#3A7CC0]'; // blue (Pitufos)
    if (isNotStarted) centerGradient = 'bg-[#2a2a5e]';
    else if (isAS) centerGradient = 'bg-gradient-to-b from-[#8f9ca6] to-[#596673]';
    else if (redIsWinning) centerGradient = 'bg-gradient-to-b from-[#E75480] to-[#C44470]'; // pink (Cariñositos)

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
        statusTop = displayStatus;
    }

    const totalHoles = 9;
    const holesPlayed = match.currentHole;
    const holesRemaining = totalHoles - holesPlayed;
    let lead = 0;
    if (match.matchStatus.includes('UP') || match.matchStatus.includes('DN')) {
        lead = parseInt(match.matchStatus.split(' ')[0]);
    }

    if (isFinal) {
        statusBottom = 'FINAL';
    } else if (match.currentHole > 0) {
        statusBottom = (lead > 0 && lead === holesRemaining) ? 'DORMIE' : `HOYO ${match.currentHole}`;
    } else if (!isNotStarted) {
        statusBottom = '-';
    }

    // ── PANEL BACKGROUND / BORDERS ───────────────────────────────────────────
    // Blue team = Pitufos (left panel), Red team = Cariñositos (right panel)
    const GOLD  = '#F0C850';
    const PINK  = '#e0548a';
    const MUTED = '#4a4a6a';

    // Winner/loser panel display
    let leftDim  = false;
    let rightDim = false;

    // Left (blue/Pitufos) border: blue team color, muted when losing
    const leftBorderColor  = isFinal && isRedWin ? MUTED : '#4A90D9';
    // Right (red/Cariñositos) border: pink always, muted when losing
    const rightBorderColor = isFinal && isBlueWin ? MUTED : PINK;

    // Panel backgrounds — medium navy, lighter than filter bar
    const activePanelBg  = '#2a3a5e';
    const winnerBg       = '#1e2a4a';
    const notStartedBg   = '#1a2240';

    const leftBg  = isNotStarted ? notStartedBg : (isFinal && isBlueWin ? winnerBg : activePanelBg);
    const rightBg = isNotStarted ? notStartedBg : (isFinal && isRedWin  ? winnerBg : activePanelBg);


    const normalizeName = (name: string) => {
        return name
            .split(' ')[0]
            .toLowerCase()
            .normalize("NFD")
            .replace(/[\u0300-\u036f]/g, "")
            .replace(/[^a-z0-9]/g, '');
    };

    return (
        <div
            onClick={onClick}
            className={`w-full rounded-2xl overflow-hidden transition-transform mb-2 ${onClick ? 'cursor-pointer active:scale-[0.98]' : ''}`}
            style={{
                background: isNotStarted ? 'rgba(255,255,255,0.35)' : 'rgba(255,255,255,0.70)',
                backdropFilter: 'blur(10px)',
                WebkitBackdropFilter: 'blur(10px)',
                border: '1px solid rgba(255,255,255,0.85)',
                boxShadow: '0 2px 8px rgba(0,0,0,0.12)',
                borderRadius: 16,
            }}
        >
            <div className="grid grid-cols-[1fr_auto_1fr] items-stretch min-h-[120px]">

                {/* ── LEFT PANEL (BLUE / PITUFOS) ─────────────────────────── */}
                <div
                    className="flex flex-col items-center justify-center py-0.5 px-0.5 relative"
                    style={{
                        background: isNotStarted ? 'transparent' : 'rgba(74,144,217,0.08)',
                        borderLeft: `3px solid ${leftBorderColor}`,
                        opacity: leftDim ? 0.55 : 1,
                        transition: 'opacity 0.2s',
                    }}
                >
                    {/* Avatar(s) */}
                    {match.bluePlayers.length > 1 ? (
                        <div className="relative flex-shrink-0" style={{ width: 'min(90px, 26vw)', height: 'min(78px, 22vw)' }}>
                            {match.bluePlayers.map((p, i) => {
                                const avatarName = normalizeName(p.playerName);
                                return (
                                    <div
                                        key={i}
                                        className="absolute rounded-full"
                                        style={{
                                            width: 'min(48px, 14vw)',
                                            height: 'min(48px, 14vw)',
                                            top: i === 0 ? 0 : 'min(28px, 8vw)',
                                            left: i === 0 ? 0 : 'min(40px, 12vw)',
                                            zIndex: i === 0 ? 2 : 1,
                                            borderRadius: '50%',
                                        }}
                                    >
                                        <img
                                            src={isFinal && isBlueWin ? `/images/${avatarName}-winner.webp` : isFinal && !isAS ? `/images/${avatarName}-loser.webp` : `/images/${avatarName}.webp`}
                                            alt={p.playerName}
                                            loading="lazy"
                                            onError={(e) => {
                                                const img = e.target as HTMLImageElement;
                                                if (img.src.includes('-winner.webp') || img.src.includes('-loser.webp')) {
                                                    img.src = `/images/${avatarName}.webp`;
                                                } else {
                                                    img.src = '/images/Gemini_Generated_Image_jonki9jonki9jonk__1_-removebg-preview.webp';
                                                }
                                            }}
                                            className={`w-full h-full object-cover drop-shadow-md ${isNotStarted ? 'grayscale opacity-40' : ''}`}
                                            style={{ borderRadius: '50%' }}
                                        />
                                    </div>
                                );
                            })}
                        </div>
                    ) : (
                        <div className="flex-shrink-0 relative overflow-hidden rounded-full" style={{ width: 'clamp(70px, 22vw, 110px)', height: 'clamp(70px, 22vw, 110px)', aspectRatio: '1' }}>
                            {(() => {
                                const avatarName = normalizeName(match.bluePlayers[0]?.playerName || '');
                                return (
                                    <img
                                        src={isFinal && isBlueWin ? `/images/${avatarName}-winner.webp` : isFinal && !isAS ? `/images/${avatarName}-loser.webp` : `/images/${avatarName}.webp`}
                                        alt={match.bluePlayers[0]?.playerName}
                                        loading="lazy"
                                        onError={(e) => {
                                            const img = e.target as HTMLImageElement;
                                            if (img.src.includes('-winner.webp') || img.src.includes('-loser.webp')) {
                                                img.src = `/images/${avatarName}.webp`;
                                            } else {
                                                img.src = '/images/Gemini_Generated_Image_jonki9jonki9jonk__1_-removebg-preview.webp';
                                            }
                                        }}
                                        className={`w-full h-full object-cover drop-shadow-md ${isNotStarted ? 'grayscale opacity-40' : ''}`}
                                        style={{ borderRadius: '50%' }}
                                    />
                                );
                            })()}
                        </div>
                    )}

                    {/* Player names */}
                    <div className="flex flex-col items-center w-full">
                        {match.segmentType === 'scramble' ? (
                            <div className="flex items-center justify-center gap-1 w-full">
                                <div className="flex flex-col items-center">
                                    {match.bluePlayers.map((p, i) => (
                                        <div
                                            key={i}
                                            className="font-bangers text-[14px] sm:text-[16px] leading-tight text-center tracking-wider uppercase"
                                            style={{ color: isNotStarted ? '#aaa' : '#4A90D9', fontWeight: 700 }}
                                        >
                                            {p.playerName.split(' ')[0]}
                                        </div>
                                    ))}
                                </div>
                                <span className="font-bangers text-[11px]" style={{ color: isNotStarted ? '#bbb' : '#666' }}>({Math.round(match.bluePlayers.reduce((sum, p) => sum + p.hcp, 0) * 0.3)})</span>
                            </div>
                        ) : (
                            match.bluePlayers.map((p, i) => (
                                <div
                                    key={i}
                                    className="font-bangers text-[14px] sm:text-[16px] leading-tight text-center tracking-wider line-clamp-1 break-all w-full uppercase"
                                    style={{ color: isNotStarted ? '#aaa' : '#4A90D9', fontWeight: 700 }}
                                >
                                    {p.playerName.split(' ')[0]}
                                    <span className="text-[11px] ml-0.5" style={{ color: isNotStarted ? '#bbb' : '#666' }}>({Math.round(p.hcp * 0.8)})</span>
                                </div>
                            ))
                        )}
                    </div>
                </div>

                {/* ── CENTER STATUS BADGE ──────────────────────────────────── */}
                <div className="relative flex items-center justify-center px-1.5 py-1.5 min-w-[80px] sm:min-w-[120px]">
                    <div
                        className={`relative w-full py-2.5 rounded-2xl border-[3px] flex flex-col items-center justify-center overflow-hidden ${centerGradient} ${isNotStarted ? 'border-[#3a3a5e] shadow-none' : 'border-[#1e293b] shadow-[0_5px_0_#1e293b]'}`}
                    >
                        {/* Top gloss */}
                        {!isNotStarted && (
                            <div className="absolute top-0 left-0 right-0 h-[45%] bg-gradient-to-b from-white/25 to-white/5 rounded-t-xl pointer-events-none z-0" />
                        )}

                        {/* SIN INICIAR */}
                        {isNotStarted ? (
                            <div className="text-[#7777aa] font-bangers text-[13px] tracking-wider uppercase text-center leading-tight py-1">
                                Sin<br />Iniciar
                            </div>
                        ) : (
                            <>
                                {/* Main score text */}
                                <div className="relative z-20 flex justify-center w-full" style={{ filter: 'drop-shadow(2px 3px 0 rgba(0,0,0,0.5))' }}>
                                    <span className="text-[32px] sm:text-[38px] font-bangers tracking-wide leading-[0.9] absolute left-0 right-0 text-center text-[#1e293b]" style={{ WebkitTextStroke: '5px #1e293b' }}>
                                        {typeof statusTop === 'string' ? statusTop.replace('UP', ' UP') : statusTop}
                                    </span>
                                    <span className="text-[32px] sm:text-[38px] font-bangers tracking-wide leading-[0.9] relative text-white text-center">
                                        {typeof statusTop === 'string' ? statusTop.replace('UP', ' UP') : statusTop}
                                    </span>
                                </div>

                                {statusBottom && (
                                    <div className="relative z-20 mt-0.5 mb-0.5 flex justify-center w-full uppercase" style={{ filter: 'drop-shadow(1px 2px 0 rgba(0,0,0,0.6))' }}>
                                        <span className="text-[13px] sm:text-[15px] font-bangers tracking-widest leading-none absolute left-0 right-0 text-center text-[#1e293b]" style={{ WebkitTextStroke: '3px #1e293b' }}>
                                            {statusBottom}
                                        </span>
                                        <span className="text-[13px] sm:text-[15px] font-bangers tracking-widest leading-none relative text-white text-center">
                                            {statusBottom}
                                        </span>
                                    </div>
                                )}
                            </>
                        )}
                    </div>
                </div>

                {/* ── RIGHT PANEL (RED / CARIÑOSITOS) ─────────────────────── */}
                <div
                    className="flex flex-col items-center justify-center py-0.5 px-0.5 relative"
                    style={{
                        background: isNotStarted ? 'transparent' : 'rgba(231,84,128,0.08)',
                        borderRight: `3px solid ${rightBorderColor}`,
                        opacity: rightDim ? 0.55 : 1,
                        transition: 'opacity 0.2s',
                    }}
                >
                    {/* Avatar(s) */}
                    {match.redPlayers.length > 1 ? (
                        <div className="relative flex-shrink-0" style={{ width: 'min(90px, 26vw)', height: 'min(78px, 22vw)' }}>
                            {match.redPlayers.map((p, i) => {
                                const avatarName = normalizeName(p.playerName);
                                return (
                                    <div
                                        key={i}
                                        className="absolute rounded-full"
                                        style={{
                                            width: 'min(48px, 14vw)',
                                            height: 'min(48px, 14vw)',
                                            top: i === 0 ? 0 : 'min(28px, 8vw)',
                                            left: i === 0 ? 0 : 'min(40px, 12vw)',
                                            zIndex: i === 0 ? 2 : 1,
                                            borderRadius: '50%',
                                        }}
                                    >
                                        <img
                                            src={isFinal && isRedWin ? `/images/${avatarName}-winner.webp` : isFinal && !isAS ? `/images/${avatarName}-loser.webp` : `/images/${avatarName}.webp`}
                                            alt={p.playerName}
                                            loading="lazy"
                                            onError={(e) => {
                                                const img = e.target as HTMLImageElement;
                                                if (img.src.includes('-winner.webp') || img.src.includes('-loser.webp')) {
                                                    img.src = `/images/${avatarName}.webp`;
                                                } else {
                                                    img.src = '/images/Gemini_Generated_Image_exn7bfexn7bfexn7-removebg-preview.webp';
                                                }
                                            }}
                                            className={`w-full h-full object-cover drop-shadow-md ${isNotStarted ? 'grayscale opacity-40' : ''}`}
                                            style={{ borderRadius: '50%' }}
                                        />
                                    </div>
                                );
                            })}
                        </div>
                    ) : (
                        <div className="flex-shrink-0 relative overflow-hidden rounded-full" style={{ width: 'clamp(70px, 22vw, 110px)', height: 'clamp(70px, 22vw, 110px)', aspectRatio: '1' }}>
                            {(() => {
                                const avatarName = normalizeName(match.redPlayers[0]?.playerName || '');
                                return (
                                    <img
                                        src={isFinal && isRedWin ? `/images/${avatarName}-winner.webp` : isFinal && !isAS ? `/images/${avatarName}-loser.webp` : `/images/${avatarName}.webp`}
                                        alt={match.redPlayers[0]?.playerName}
                                        loading="lazy"
                                        onError={(e) => {
                                            const img = e.target as HTMLImageElement;
                                            if (img.src.includes('-winner.webp') || img.src.includes('-loser.webp')) {
                                                img.src = `/images/${avatarName}.webp`;
                                            } else {
                                                img.src = '/images/Gemini_Generated_Image_exn7bfexn7bfexn7-removebg-preview.webp';
                                            }
                                        }}
                                        className={`w-full h-full object-cover drop-shadow-md ${isNotStarted ? 'grayscale opacity-40' : ''}`}
                                        style={{ borderRadius: '50%' }}
                                    />
                                );
                            })()}
                        </div>
                    )}

                    {/* Player names */}
                    <div className="flex flex-col items-center w-full">
                        {match.segmentType === 'scramble' ? (
                            <div className="flex items-center justify-center gap-1 w-full">
                                <div className="flex flex-col items-center">
                                    {match.redPlayers.map((p, i) => (
                                        <div
                                            key={i}
                                            className="font-bangers text-[14px] sm:text-[16px] leading-tight text-center tracking-wider uppercase"
                                            style={{ color: isNotStarted ? '#aaa' : '#E75480', fontWeight: 700 }}
                                        >
                                            {p.playerName.split(' ')[0]}
                                        </div>
                                    ))}
                                </div>
                                <span className="font-bangers text-[11px]" style={{ color: isNotStarted ? '#bbb' : '#666' }}>({Math.round(match.redPlayers.reduce((sum, p) => sum + p.hcp, 0) * 0.3)})</span>
                            </div>
                        ) : (
                            match.redPlayers.map((p, i) => (
                                <div
                                    key={i}
                                    className="font-bangers text-[14px] sm:text-[16px] leading-tight text-center tracking-wider line-clamp-1 break-all w-full uppercase"
                                    style={{ color: isNotStarted ? '#aaa' : '#E75480', fontWeight: 700 }}
                                >
                                    {p.playerName.split(' ')[0]}
                                    <span className="text-[11px] ml-0.5" style={{ color: isNotStarted ? '#bbb' : '#666' }}>({Math.round(p.hcp * 0.8)})</span>
                                </div>
                            ))
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}
