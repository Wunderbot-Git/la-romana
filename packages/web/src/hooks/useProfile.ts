'use client';

import { useState } from 'react';
import { api } from '@/lib/api';

export function useUpdateName() {
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const updateName = async (name: string): Promise<boolean> => {
        try {
            setIsLoading(true);
            setError(null);
            await api.put('/auth/profile', { name });
            return true;
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to update name');
            return false;
        } finally {
            setIsLoading(false);
        }
    };

    return { updateName, isLoading, error };
}

export function useChangePassword() {
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [success, setSuccess] = useState(false);

    const changePassword = async (currentPassword: string, newPassword: string): Promise<boolean> => {
        try {
            setIsLoading(true);
            setError(null);
            setSuccess(false);
            await api.put('/auth/change-password', { currentPassword, newPassword });
            setSuccess(true);
            return true;
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to change password');
            return false;
        } finally {
            setIsLoading(false);
        }
    };

    return { changePassword, isLoading, error, success };
}
