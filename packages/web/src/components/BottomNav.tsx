'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useActiveEvent } from '@/hooks/useEvents';

const ALL_NAV_ITEMS = [
    { href: '/leaderboard', label: 'Marcador', iconSrc: '/images/nav-marcador.webp' },
    { href: '/score', label: 'Scores', iconSrc: '/images/nav-scores.webp' },
    { href: '/apuestas', label: 'Apuestas', iconSrc: '/images/nav-apuestas.webp' },
    { href: '/ranking', label: 'Ranking', iconSrc: '/images/nav-ranking.webp' },
];

export function BottomNav() {
    const pathname = usePathname();
    const { activeEvent } = useActiveEvent();
    // Hide the "Apuestas" tab on events without betting (`betAmount === null`),
    // e.g. the Night Golf 9H side event. Default to showing it while events
    // are loading so the nav doesn't flicker.
    const apuestasEnabled = activeEvent ? activeEvent.betAmount != null : true;
    const navItems = apuestasEnabled
        ? ALL_NAV_ITEMS
        : ALL_NAV_ITEMS.filter(it => it.href !== '/apuestas');

    return (
        <nav
            className="fixed left-3 right-3 z-50 mx-auto max-w-md overflow-hidden"
            style={{
                bottom: 'calc(env(safe-area-inset-bottom) + 12px)',
                background:
                    'linear-gradient(180deg, rgba(18,29,39,0.98) 0%, rgba(7,13,21,0.98) 100%)',
                borderRadius: 18,
                boxShadow:
                    '0 16px 30px rgba(0,0,0,0.62), inset 0 1px 0 rgba(255,255,255,0.13), inset 0 -18px 28px rgba(0,0,0,0.26)',
            }}
        >
            <div className="pointer-events-none absolute inset-0 z-0 rounded-[18px] border border-[#b98546]/70" />
            <div className="pointer-events-none absolute inset-x-5 top-px h-px bg-white/14" />
            <div className="pointer-events-none absolute inset-x-2 bottom-0 h-8 bg-[radial-gradient(ellipse_at_center,rgba(91,166,220,0.16),transparent_72%)]" />
            <div
                className="relative z-10 grid h-[72px] items-stretch"
                style={{ gridTemplateColumns: `repeat(${navItems.length}, minmax(0, 1fr))` }}
            >
                {navItems.map((item, index) => {
                    const isActive = pathname?.startsWith(item.href);
                    const previousIsActive = index > 0 && pathname?.startsWith(navItems[index - 1].href);
                    return (
                        <Link
                            key={item.href}
                            href={item.href}
                            className={`relative flex h-full min-w-0 flex-col items-center justify-center transition-all duration-200 ${
                                isActive ? 'z-20 rounded-[18px]' : 'z-10 rounded-[16px]'
                            }`}
                            style={{
                                color: isActive ? '#ffe39a' : 'rgba(215,196,166,0.72)',
                                background: isActive
                                    ? 'radial-gradient(circle at 50% 18%, rgba(255,214,117,0.18), transparent 45%), linear-gradient(180deg, rgba(76,46,17,0.98) 0%, rgba(20,17,17,0.98) 100%)'
                                    : 'transparent',
                                boxShadow: isActive
                                    ? 'inset 0 0 0 1px rgba(255,219,132,0.78), inset 0 1px 0 rgba(255,255,255,0.18), 0 0 20px rgba(240,200,80,0.23), 0 3px 0 rgba(0,0,0,0.42)'
                                    : 'none',
                                opacity: isActive ? 1 : 0.72,
                            }}
                        >
                            {index > 0 && !isActive && !previousIsActive && (
                                <span className="pointer-events-none absolute left-0 top-5 h-12 w-px bg-gradient-to-b from-transparent via-white/14 to-transparent" />
                            )}
                            {isActive && <span className="pointer-events-none absolute inset-0 rounded-[18px] bg-[radial-gradient(circle_at_50%_8%,rgba(240,200,80,0.24),transparent_50%)]" />}
                            <img
                                src={item.iconSrc}
                                alt=""
                                aria-hidden="true"
                                className={`relative z-10 object-contain drop-shadow-[0_2px_2px_rgba(0,0,0,0.75)] transition-all duration-200 ${
                                    isActive ? 'h-11 w-11' : 'h-10 w-10 saturate-[0.6] brightness-[0.86]'
                                }`}
                            />
                            <span
                                className={`relative z-10 max-w-full truncate px-0.5 font-bangers uppercase leading-none ${
                                    isActive ? 'mt-[5px] text-[12px]' : 'mt-[4px] text-[11px]'
                                }`}
                                style={{
                                    color: isActive ? '#ffe39a' : 'rgba(215,196,166,0.72)',
                                    textShadow: isActive ? '0 2px 0 #1a0f05' : '0 1px 0 rgba(0,0,0,0.8)',
                                }}
                            >
                                {item.label}
                            </span>
                        </Link>
                    );
                })}
            </div>
        </nav>
    );
}
