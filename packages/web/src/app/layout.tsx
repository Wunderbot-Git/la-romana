import type { Metadata, Viewport } from 'next';
import { Bangers, Fredoka } from 'next/font/google';
import './globals.css';
import { BottomNav } from '@/components/BottomNav';
import { SettingsLink } from '@/components/SettingsLink';
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

export const metadata: Metadata = {
    title: 'Ryder Cup Par00',
    description: 'Golf tournament scoring app',
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
        <html lang="en" className={`${bangers.variable} ${fredoka.variable}`}>
            <body className="bg-app-gradient">
                <AuthProvider>
                    <SyncProvider>
                        <main className="max-w-md mx-auto bg-transparent relative z-[1]">
                            {children}
                        </main>
                        <OfflineIndicator />
                        <SettingsLink />
                        <BottomNav />
                    </SyncProvider>
                </AuthProvider>
            </body>
        </html>
    );
}
