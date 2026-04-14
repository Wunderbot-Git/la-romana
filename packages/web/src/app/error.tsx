'use client';

import { useEffect } from 'react';

export default function GlobalError({
    error,
    reset,
}: {
    error: Error & { digest?: string };
    reset: () => void;
}) {
    useEffect(() => {
        console.error('Next.js caught error:', error);
        fetch('/api/log-error?msg=' + encodeURIComponent(error.message));
    }, [error]);

    return (
        <div className="flex flex-col items-center justify-center min-h-screen p-8 bg-forest-deep text-cream">
            <h2 className="text-xl font-bangers mb-4 metallic-text">Error Detectado</h2>
            <div className="bg-cream p-4 font-mono text-sm gold-border rounded-xl w-full overflow-auto">
                <p className="font-bold text-team-red">{error.name}: {error.message}</p>
                <pre className="mt-2 text-xs text-forest-deep/60">{error.stack}</pre>
            </div>
            <button
                className="mt-4 px-6 py-3 bevel-button font-bangers rounded-xl"
                onClick={() => reset()}
            >
                Intentar de nuevo
            </button>
        </div>
    );
}
