/**
 * Player avatar circle.
 *
 * Falls back to a colored monogram pill when no avatar file is available
 * (e.g. Fantasmas players whose images haven't been generated yet, or the
 * phantom).
 */

import { getAvatarUrl, monogram } from '@/lib/avatar';

type Team = 'red' | 'blue' | undefined;

interface AvatarProps {
    name: string | null | undefined;
    team?: Team;
    /** Pixel size of the round avatar (default 32). Use Tailwind-friendly multiples. */
    size?: number;
    className?: string;
}

export function Avatar({ name, team, size = 32, className = '' }: AvatarProps) {
    const url = getAvatarUrl(name);
    const dim = `${size}px`;
    const ringColor =
        team === 'red'  ? '#fbbc05' :   // gold ring for Piratas
        team === 'blue' ? '#5BA6DC' :   // ice ring for Fantasmas
        'rgba(255,255,255,0.4)';

    if (url) {
        return (
            // eslint-disable-next-line @next/next/no-img-element
            <img
                src={url}
                alt={name ?? ''}
                width={size}
                height={size}
                className={`shrink-0 rounded-full object-cover ${className}`}
                style={{
                    width: dim,
                    height: dim,
                    boxShadow: `0 0 0 2px ${ringColor}, 0 2px 4px rgba(0,0,0,0.4)`,
                }}
            />
        );
    }

    // Fallback: monogram pill in team color
    const bg =
        team === 'red'  ? 'linear-gradient(180deg, #c9892b 0%, #6b4320 100%)' :
        team === 'blue' ? 'linear-gradient(180deg, #5BA6DC 0%, #2E5F8E 100%)' :
        'linear-gradient(180deg, #4a4a4a 0%, #1a1a1a 100%)';
    return (
        <span
            aria-label={name ?? 'Player'}
            className={`shrink-0 inline-flex items-center justify-center rounded-full font-bangers text-white select-none ${className}`}
            style={{
                width: dim,
                height: dim,
                fontSize: `${Math.max(10, Math.round(size * 0.45))}px`,
                background: bg,
                boxShadow: `0 0 0 2px ${ringColor}, 0 2px 4px rgba(0,0,0,0.4)`,
            }}
        >
            {monogram(name)}
        </span>
    );
}
