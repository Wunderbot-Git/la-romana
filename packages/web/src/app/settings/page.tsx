'use client';

import { useAuth } from '@/lib/auth';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import { SettingsClient } from '@/components/settings/SettingsClient';

export default function SettingsPage() {
    const { isAuthenticated, isLoading } = useAuth();
    const router = useRouter();

    useEffect(() => {
        if (!isLoading && !isAuthenticated) {
            router.push('/login');
        }
    }, [isLoading, isAuthenticated, router]);

    if (isLoading) {
        return (
            <div className="flex flex-col min-h-screen pb-20">
                <div className="flex items-center justify-center p-12">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gold-border"></div>
                </div>
            </div>
        );
    }

    if (!isAuthenticated) return null;

    return <SettingsClient />;
}
