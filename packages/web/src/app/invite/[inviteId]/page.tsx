'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { api } from '@/lib/api';
import { useAuth } from '@/lib/auth';
import Link from 'next/link';

interface InviteDetails {
    inviteId: string;
    eventId: string;
    eventName?: string;
    playerId: string;
    playerName: string;
}

export default function InviteClaimPage() {
    const params = useParams();
    const inviteId = params.inviteId as string;
    const { user, isLoading: authLoading } = useAuth();
    const router = useRouter();

    const [inviteDetails, setInviteDetails] = useState<InviteDetails | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState('');
    const [isClaiming, setIsClaiming] = useState(false);

    useEffect(() => {
        const fetchInvite = async () => {
            try {
                const data = await api.get<InviteDetails>(`/invites/${inviteId}`);
                setInviteDetails(data);
            } catch (err: any) {
                setError(err.message || 'Invalid or expired invite link.');
            } finally {
                setIsLoading(false);
            }
        };

        fetchInvite();
    }, [inviteId]);

    const handleClaim = async () => {
        if (!user) {
            router.push('/login?redirect=/invite/' + inviteId);
            return;
        }

        setIsClaiming(true);
        try {
            await api.post(`/invites/${inviteId}/claim`, {});
            alert('Success! You have claimed this player profile.');
            router.push(`/events/${inviteDetails?.eventId}`);
        } catch (err: any) {
            setError(err.message || 'Failed to claim role.');
        } finally {
            setIsClaiming(false);
        }
    };

    if (isLoading || authLoading) return <div className="p-8 text-center text-cream/50 font-fredoka">Verificando invitación...</div>;

    if (error) {
        return (
            <div className="flex flex-col items-center justify-center min-h-[60vh] p-4">
                <div className="bg-cream gold-border rounded-2xl p-8 max-w-md w-full text-center">
                    <svg className="w-12 h-12 text-team-red mx-auto mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                    </svg>
                    <h2 className="text-lg font-bangers text-forest-deep mb-2">Oops!</h2>
                    <p className="text-team-red font-fredoka">{error}</p>
                    <Link href="/" className="mt-6 inline-block text-gold-border hover:underline font-fredoka">
                        Volver al inicio
                    </Link>
                </div>
            </div>
        );
    }

    if (!inviteDetails) return null;

    return (
        <div className="flex flex-col items-center justify-center min-h-[70vh] p-4">
            <div className="bg-cream/90 backdrop-blur-sm gold-border rounded-2xl p-8 max-w-md w-full text-center">
                <div className="w-16 h-16 bg-forest-deep/10 text-forest-deep rounded-full flex items-center justify-center mx-auto mb-6 border-2 border-gold-border/30">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8" viewBox="0 0 20 20" fill="currentColor">
                        <path fillRule="evenodd" d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z" clipRule="evenodd" />
                    </svg>
                </div>

                <h1 className="text-2xl font-bangers metallic-text mb-2">Estás Invitado!</h1>
                <p className="text-forest-deep/60 mb-6 flex flex-col gap-1 font-fredoka">
                    <span>Has sido invitado a jugar como:</span>
                    <strong className="text-xl text-forest-deep">{inviteDetails.playerName}</strong>
                    {inviteDetails.eventName && (
                        <span>en <span className="font-bold text-brass">{inviteDetails.eventName}</span></span>
                    )}
                </p>

                <div className="bg-gold-light/20 border border-gold-border/40 rounded-xl p-4 mb-8 text-sm text-forest-deep/60 font-fredoka">
                    Al reclamar este perfil, tu cuenta será vinculada a las estadísticas y permisos de puntuación de este jugador.
                </div>

                {!user ? (
                    <div className="space-y-4">
                        <p className="text-sm text-forest-deep/50 font-fredoka font-medium">Inicia sesión o regístrate para reclamar tu perfil.</p>
                        <div className="flex gap-3">
                            <Link href={`/login?redirect=/invite/${inviteId}`} className="flex-1 bevel-button text-center py-3 rounded-xl font-bangers">
                                Iniciar Sesión
                            </Link>
                            <Link href={`/signup?redirect=/invite/${inviteId}`} className="flex-1 bg-cream border-2 border-gold-border/30 text-forest-deep py-3 rounded-xl font-bangers hover:bg-gold-light/20 transition">
                                Registrarse
                            </Link>
                        </div>
                    </div>
                ) : (
                    <div>
                        <p className="text-sm text-forest-deep/50 mb-4 font-fredoka">
                            Conectado como <strong className="text-forest-deep">{user.email}</strong>.
                        </p>
                        <button
                            onClick={handleClaim}
                            disabled={isClaiming}
                            className="w-full bevel-button py-3.5 rounded-xl font-bangers text-lg disabled:opacity-50"
                        >
                            {isClaiming ? 'Reclamando...' : 'Reclamar Perfil'}
                        </button>
                    </div>
                )}
            </div>
        </div>
    );
}
