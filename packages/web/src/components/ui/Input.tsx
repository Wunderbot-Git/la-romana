import { InputHTMLAttributes } from 'react';

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
    label?: string;
    error?: string;
}

export function Input({ label, error, className = '', ...props }: InputProps) {
    return (
        <div className="flex flex-col gap-1">
            {label && (
                <label className="text-sm font-bangers text-forest-deep">{label}</label>
            )}
            <input
                className={`w-full p-3 border-2 rounded-lg font-fredoka focus:outline-none focus:ring-2 focus:ring-gold-border ${error ? 'border-team-red' : 'border-gold-border/30'
                    } ${className}`}
                {...props}
            />
            {error && <span className="text-sm text-team-red font-fredoka">{error}</span>}
        </div>
    );
}
