import { ReactNode } from 'react';

interface CardProps {
    children: ReactNode;
    className?: string;
    onClick?: () => void;
}

export function Card({ children, className = '', onClick }: CardProps) {
    return (
        <div
            onClick={onClick}
            className={`cartoon-card p-4 ${onClick ? 'cursor-pointer hover:shadow-none translate-y-0 active:translate-y-2 transition-all' : ''
                } ${className}`}
        >
            {children}
        </div>
    );
}
