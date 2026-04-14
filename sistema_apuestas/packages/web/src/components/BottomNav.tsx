'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

const tabs = [
    {
        href: '/events',
        label: 'Scoreboard',
        icon: (isActive: boolean) => (
            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={isActive ? "2.5" : "2"} strokeLinecap="round" strokeLinejoin="round">
                <path d="M12 10v4" />
                <path d="m14.5 11.5-3 3" />
                <path d="M12 22c5.523 0 10-4.477 10-10S17.523 2 12 2 2 6.477 2 12s4.477 10 10 10z" />
                <path d="M12 2v2" />
                <path d="M2 12h2" />
                <path d="M20 12h2" />
                <path d="M19.07 4.93 17.66 6.34" />
                <path d="M4.93 4.93 6.34 6.34" />
            </svg>
            // Actually, let's use a simpler Speedometer style
            // <svg ...><path d="M12 14a2 2 0 1 0 0 4 2 2 0 0 0 0-4z" /><path d="M13.4 15.4 19 9" /><path d="M22 4s-.4-2-2-2-2 .4-2 2 .4 2 2 2 2-.4 2-2z" /><path d="M2 13a10 10 0 0 1 18.3-4.5" /></svg>
            // Let's use a standard Gauge icon path:
        )
    },
    { href: '/score', label: 'Score', icon: (isActive: boolean) => null }, // Placeholder
    { href: '/matches', label: 'Matches', icon: (isActive: boolean) => null },
    { href: '/apuestas', label: 'Apuestas', icon: (isActive: boolean) => null },
];

function GaugeIcon({ isActive }: { isActive: boolean }) {
    return (
        <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={isActive ? "2.5" : "2"} strokeLinecap="round" strokeLinejoin="round">
            <path d="m12 14 4-4" />
            <path d="M3.34 19a10 10 0 1 1 17.32 0" />
        </svg>
    );
}

function EditIcon({ isActive }: { isActive: boolean }) {
    return (
        <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={isActive ? "2.5" : "2"} strokeLinecap="round" strokeLinejoin="round">
            <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
            <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
        </svg>
    );
}

function UsersIcon({ isActive }: { isActive: boolean }) {
    return (
        <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={isActive ? "2.5" : "2"} strokeLinecap="round" strokeLinejoin="round">
            <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
            <circle cx="9" cy="7" r="4" />
            <path d="M22 21v-2a4 4 0 0 0-3-3.87" />
            <path d="M16 3.13a4 4 0 0 1 0 7.75" />
        </svg>
    );
}

function CoinIcon({ isActive }: { isActive: boolean }) {
    return (
        <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={isActive ? "2.5" : "2"} strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="8" />
            <line x1="12" y1="8" x2="12" y2="16" />
            <line x1="9" y1="10" x2="15" y2="10" />
            <line x1="9" y1="14" x2="15" y2="14" />
        </svg>
    );
}

const navItems = [
    { href: '/events', label: 'Scoreboard', Icon: GaugeIcon },
    { href: '/score', label: 'Score', Icon: EditIcon },
    { href: '/matches', label: 'Matches', Icon: UsersIcon },
    { href: '/apuestas', label: 'Apuestas', Icon: CoinIcon },
];

export function BottomNav() {
    const pathname = usePathname();

    return (
        <nav className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 max-w-md mx-auto z-50">
            <div className="flex justify-around items-center h-16">
                {navItems.map((item) => {
                    const isActive = pathname?.startsWith(item.href);
                    return (
                        <Link
                            key={item.href}
                            href={item.href}
                            className={`flex flex-col items-center justify-center flex-1 h-full transition-colors duration-200 ${isActive ? 'text-team-blue' : 'text-gray-400 hover:text-gray-600'}`}
                        >
                            <item.Icon isActive={isActive || false} />
                            <span className={`text-[10px] mt-1 font-medium ${isActive ? 'font-bold' : ''}`}>{item.label}</span>
                        </Link>
                    );
                })}
            </div>
        </nav>
    );
}
