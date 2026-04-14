import { ButtonHTMLAttributes, ReactNode } from 'react';

type ButtonVariant = 'primary' | 'secondary' | 'outline' | 'ghost';

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
    variant?: ButtonVariant;
    children: ReactNode;
    isLoading?: boolean;
}

const variantStyles: Record<ButtonVariant, string> = {
    primary: 'gold-button font-bangers text-xl',
    secondary: 'bg-forest-mid text-cream hover:bg-forest-mid/80 thick-border font-bangers',
    outline: 'border-4 border-header-navy text-header-navy hover:bg-header-navy/10 font-bangers',
    ghost: 'text-forest-deep/60 hover:bg-forest-deep/10 font-bangers',
};

export function Button({
    variant = 'primary',
    children,
    isLoading,
    disabled,
    className = '',
    ...props
}: ButtonProps) {
    return (
        <button
            disabled={disabled || isLoading}
            className={`px-4 py-3 rounded-lg font-bangers transition-colors disabled:opacity-50 ${variantStyles[variant]} ${className}`}
            {...props}
        >
            {isLoading ? 'Loading...' : children}
        </button>
    );
}
