import type { Metadata, Viewport } from 'next';
import { Bangers, Fredoka, Bowlby_One } from 'next/font/google';
import './globals.css';
import { BottomNav } from '@/components/BottomNav';
import { AuthProvider } from '@/lib/auth';
import { SyncProvider } from '@/lib/syncContext';
import { OfflineIndicator } from '@/components/OfflineIndicator';

const bangers = Bangers({
    weight: '400',
    subsets: ['latin'],
    variable: '--font-bangers',
    display: 'swap',
});

const fredoka = Fredoka({
    subsets: ['latin'],
    variable: '--font-fredoka',
    display: 'swap',
});

const bowlby = Bowlby_One({
    weight: '400',
    subsets: ['latin'],
    variable: '--font-bowlby',
    display: 'swap',
});

export const metadata: Metadata = {
    title: 'La Romana 2026',
    description: 'Marcador Piratas vs Fantasmas del Caribe',
};

export const viewport: Viewport = {
    width: 'device-width',
    initialScale: 1,
    maximumScale: 1,
    userScalable: false,
};

export default function RootLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    return (
        <html lang="es" className={`${bangers.variable} ${fredoka.variable} ${bowlby.variable}`}>
            <head>
                {/* Preload critical above-the-fold imagery */}
                <link rel="preload" as="image" href="/images/piratas-vs-fantasmas.webp" type="image/webp" />
                <link rel="preload" as="image" href="/images/background.webp" type="image/webp" />
            </head>
            <body className="bg-app-gradient">
                <AuthProvider>
                    <SyncProvider>
                        <main className="relative z-[1] mx-auto min-h-screen max-w-md bg-transparent">
                            {children}
                        </main>
                        <OfflineIndicator />
                        <BottomNav />
                    </SyncProvider>
                </AuthProvider>
            </body>
        </html>
    );
}
