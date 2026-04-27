'use client';

import Link from 'next/link';

/**
 * Shared tab nav between the two apuestas screens:
 *   - "Principal" → /apuestas         (deterministisches 3-Pot-Dashboard)
 *   - "Extra"     → /apuestas/extra   (optionales $2 Match-Prediction-Wetten)
 *
 * Active state is driven by the page that renders this component (server-known
 * via the route file), so we don't need usePathname here.
 */
export function ApuestasTabs({ active }: { active: 'principal' | 'extra' }) {
    return (
        <div className="px-4 pb-3">
            <div className="flex gap-1 rounded-[14px] border-[2px] border-[#31316b] bg-[#0f172b]/80 p-1.5 shadow-[0_4px_12px_rgba(0,0,0,0.4)]">
                <Tab href="/apuestas" label="Principal" active={active === 'principal'} />
                <Tab href="/apuestas/extra" label="Extra" active={active === 'extra'} />
            </div>
        </div>
    );
}

function Tab({ href, label, active }: { href: string; label: string; active: boolean }) {
    return (
        <Link
            href={href}
            className={`flex-1 rounded-[10px] py-2 text-center font-bangers text-sm uppercase tracking-wider transition-all ${
                active
                    ? 'bg-gradient-to-b from-[#fce8b2] via-[#fbbc05] to-[#e37400] text-[#1e293b] shadow-[0_3px_0_#1e293b] border-[2px] border-[#1e293b]'
                    : 'text-white/65 hover:text-white'
            }`}
        >
            {label}
        </Link>
    );
}
