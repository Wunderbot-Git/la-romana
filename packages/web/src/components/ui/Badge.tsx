import { ReactNode } from 'react';

type BadgeVariant = 'draft' | 'live' | 'completed' | 'closed' | 'default';

interface BadgeProps {
    variant?: BadgeVariant;
    children: ReactNode;
    className?: string;
}

const variantStyles: Record<BadgeVariant, string> = {
    draft: 'bg-forest-deep/10 text-forest-deep/60',
    live: 'bg-gold-border text-forest-deep animate-pulse',
    completed: 'bg-forest-deep text-cream',
    closed: 'bg-forest-mid/50 text-cream/70',
    default: 'bg-forest-deep/10 text-forest-deep/60',
};

export function Badge({ variant = 'default', children, className = '' }: BadgeProps) {
    return (
        <span
            className={`inline-block px-2 py-1 text-xs font-bangers rounded-full ${variantStyles[variant]} ${className}`}
        >
            {children}
        </span>
    );
}
