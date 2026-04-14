'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

function GaugeIcon({ isActive }: { isActive: boolean }) {
    return (
        <svg xmlns="http://www.w3.org/2000/svg" width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={isActive ? "2.5" : "2"} strokeLinecap="round" strokeLinejoin="round">
            <path d="m12 14 4-4" />
            <path d="M3.34 19a10 10 0 1 1 17.32 0" />
        </svg>
    );
}

function EditIcon({ isActive }: { isActive: boolean }) {
    return (
        <svg xmlns="http://www.w3.org/2000/svg" width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={isActive ? "2.5" : "2"} strokeLinecap="round" strokeLinejoin="round">
            <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
            <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
        </svg>
    );
}

function RankingIcon({ isActive }: { isActive: boolean }) {
    return (
        <svg xmlns="http://www.w3.org/2000/svg" width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={isActive ? "2" : "1.5"} strokeLinecap="round">
            <path d="M16 22V13C16 11.5858 16 10.8787 15.5607 10.4393C15.1213 10 14.4142 10 13 10H11C9.58579 10 8.87868 10 8.43934 10.4393C8 10.8787 8 11.5858 8 13V22" />
            <path d="M8 22C8 20.5858 8 19.8787 7.56066 19.4393C7.12132 19 6.41421 19 5 19C3.58579 19 2.87868 19 2.43934 19.4393C2 19.8787 2 20.5858 2 22" />
            <path d="M22 22V19C22 17.5858 22 16.8787 21.5607 16.4393C21.1213 16 20.4142 16 19 16C17.5858 16 16.8787 16 16.4393 16.4393C16 16.8787 16 17.5858 16 19V22" />
            <path d="M11.1459 3.02251C11.5259 2.34084 11.7159 2 12 2C12.2841 2 12.4741 2.34084 12.8541 3.02251L12.9524 3.19887C13.0603 3.39258 13.1143 3.48944 13.1985 3.55334C13.2827 3.61725 13.3875 3.64097 13.5972 3.68841L13.7881 3.73161C14.526 3.89857 14.895 3.98205 14.9828 4.26432C15.0706 4.54659 14.819 4.84072 14.316 5.42898L14.1858 5.58117C14.0429 5.74833 13.9714 5.83191 13.9392 5.93531C13.9071 6.03872 13.9179 6.15023 13.9395 6.37327L13.9592 6.57632C14.0352 7.36118 14.0733 7.75361 13.8435 7.92807C13.6136 8.10252 13.2682 7.94346 12.5773 7.62535L12.3986 7.54305C12.2022 7.45265 12.1041 7.40745 12 7.40745C11.8959 7.40745 11.7978 7.45265 11.6014 7.54305L11.4227 7.62535C10.7318 7.94346 10.3864 8.10252 10.1565 7.92807C9.92674 7.75361 9.96476 7.36118 10.0408 6.57632L10.0605 6.37327C10.0821 6.15023 10.0929 6.03872 10.0608 5.93531C10.0286 5.83191 9.95713 5.74833 9.81418 5.58117L9.68403 5.42898C9.18097 4.84072 8.92945 4.54659 9.01723 4.26432C9.10501 3.98205 9.47396 3.89857 10.2119 3.73161L10.4028 3.68841C10.6125 3.64097 10.7173 3.61725 10.8015 3.55334C10.8857 3.48944 10.9397 3.39258 11.0476 3.19887L11.1459 3.02251Z" />
        </svg>
    );
}

function BettingIcon({ }: { isActive: boolean }) {
    return (
        <svg xmlns="http://www.w3.org/2000/svg" width="26" height="26" viewBox="0 0 100 100" fill="currentColor" stroke="currentColor" strokeWidth="3" strokeLinejoin="round">
            <path d="M40.11,58.94a9.15,9.15,0,0,1,7.39-9V48a2.5,2.5,0,0,1,5,0v2a9.85,9.85,0,0,1,6.63,5.73,2.5,2.5,0,0,1-4.61,1.93,4.88,4.88,0,0,0-4.51-3c-2.36,0-4.89,1.34-4.89,4.28,0,.77,0,3.09,5.45,4.34h.08c8,1.87,9.25,6.56,9.25,9.19a9.15,9.15,0,0,1-7.39,9v2a2.5,2.5,0,1,1-5,0v-2a9.85,9.85,0,0,1-6.63-5.73,2.5,2.5,0,1,1,4.61-1.93,4.89,4.89,0,0,0,4.52,3c2.36,0,4.89-1.34,4.89-4.28,0-.77,0-3.09-5.45-4.34h-.08C41.31,66.27,40.11,61.58,40.11,58.94Zm18-34.31A2.5,2.5,0,0,0,61.56,24l8.61-12.26a2.51,2.51,0,0,0-.46-3.37C58.65-.81,41.33-.8,30.28,8.4a2.5,2.5,0,0,0-.45,3.36L38.44,24a2.5,2.5,0,0,0,4.09-2.87L35.31,10.86a26.7,26.7,0,0,1,29.38,0L57.47,21.15a2.5,2.5,0,0,0,.61,3.48ZM16.33,73.32A56.84,56.84,0,0,1,36.54,30a2.5,2.5,0,0,1,1.61-.59H61.84a2.5,2.5,0,0,1,1.61.59A56.84,56.84,0,0,1,83.67,73.32v7.11l.77.37a9.31,9.31,0,0,1-4,17.71H19.55a9.31,9.31,0,0,1-4-17.71l.77-.37Zm-1,16.83a4.28,4.28,0,0,0,4.2,3.36h60.9a4.31,4.31,0,0,0,1.86-8.19l-2.19-1A2.5,2.5,0,0,1,78.69,82V73.32A51.85,51.85,0,0,0,60.92,34.41H39.08A51.84,51.84,0,0,0,21.33,73.33v8.68a2.5,2.5,0,0,1-1.42,2.25l-2.19,1a4.29,4.29,0,0,0-2.37,4.89Z" />
        </svg>
    );
}

const navItems = [
    { href: '/leaderboard', label: 'Marcador', Icon: GaugeIcon },
    { href: '/score', label: 'Scores', Icon: EditIcon },
    { href: '/apuestas', label: 'Apuestas', Icon: BettingIcon },
    { href: '/ranking', label: 'Ranking', Icon: RankingIcon },
];

export function BottomNav() {
    const pathname = usePathname();

    return (
        <nav
            className="fixed bottom-4 left-3 right-3 max-w-md mx-auto z-50 overflow-hidden"
            style={{
                background: 'rgba(255,255,255,0.78)',
                backdropFilter: 'blur(12px)',
                WebkitBackdropFilter: 'blur(12px)',
                borderRadius: 16,
                border: '1px solid rgba(255,255,255,0.6)',
                borderTop: '1px solid rgba(255,255,255,0.9)',
                boxShadow: '0 4px 20px rgba(0,0,0,0.15)',
            }}
        >
            {/* No gloss needed — the frosted glass itself is bright */}

            <div className="flex justify-around items-center h-16 relative z-10">
                {navItems.map((item) => {
                    const isActive = pathname?.startsWith(item.href);
                    return (
                        <Link
                            key={item.href}
                            href={item.href}
                            className="flex flex-col items-center justify-center flex-1 h-full transition-all duration-200 rounded-2xl"
                            style={{
                                color: isActive ? '#c8a200' : '#1a1a3e',
                                background: isActive
                                    ? 'rgba(240,200,80,0.15)'
                                    : 'transparent',
                                transform: isActive ? 'translateY(-1px)' : 'none',
                                opacity: isActive ? 1 : 0.65,
                            }}
                        >
                            <item.Icon isActive={isActive || false} />
                            <span
                                className="text-[10px] mt-0.5 font-bangers tracking-wider"
                                style={{ color: isActive ? '#c8a200' : '#1a1a3e' }}
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
