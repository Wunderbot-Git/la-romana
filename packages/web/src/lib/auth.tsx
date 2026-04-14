'use client';

import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { useRouter } from 'next/navigation';
import { api } from './api';

interface User {
    id: string;
    email: string;
    name: string;
    appRole: 'admin' | 'user';
}

interface AuthContextType {
    user: User | null;
    isLoading: boolean;
    isAuthenticated: boolean;
    login: (email: string, password: string) => Promise<void>;
    signup: (email: string, name: string, password: string) => Promise<void>;
    logout: () => void;
    refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
    const [user, setUser] = useState<User | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const router = useRouter();

    // Restore session on mount
    useEffect(() => {
        const initAuth = async () => {
            const token = api.getToken();
            if (token) {
                try {
                    const user = await api.get<User>('/auth/me');
                    setUser(user);
                } catch (error) {
                    console.error('Failed to restore session:', error);
                    api.clearToken();
                    setUser(null);
                }
            }
            setIsLoading(false);
        };
        initAuth();
    }, []);

    const login = async (email: string, password: string) => {
        const response = await api.post<{ token: string; user: User }>('/auth/login', {
            email,
            password,
        });
        api.setToken(response.token);
        setUser(response.user || { id: '', email, name: '', appRole: 'user' });
        router.push('/score');
    };

    const signup = async (email: string, name: string, password: string) => {
        await api.post('/auth/signup', { email, name, password });
        // Auto-login after signup
        await login(email, password);
    };

    const refreshUser = async () => {
        try {
            const user = await api.get<User>('/auth/me');
            setUser(user);
        } catch (error) {
            console.error('Failed to refresh user:', error);
        }
    };

    const logout = () => {
        api.clearToken();
        setUser(null);
        router.push('/login');
    };

    return (
        <AuthContext.Provider
            value={{
                user,
                isLoading,
                isAuthenticated: !!user,
                login,
                signup,
                logout,
                refreshUser,
            }}
        >
            {children}
        </AuthContext.Provider>
    );
}

export function useAuth() {
    const context = useContext(AuthContext);
    if (!context) {
        throw new Error('useAuth must be used within an AuthProvider');
    }
    return context;
}
