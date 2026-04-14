'use client';

import { useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useAuth } from '@/lib/auth';

export default function SignupPage() {
    const [email, setEmail] = useState('');
    const [name, setName] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const { signup } = useAuth();

    const validatePassword = (pwd: string): string | null => {
        if (pwd.length < 8) return 'La contraseña debe tener al menos 8 caracteres';
        if (!/[A-Z]/.test(pwd)) return 'La contraseña debe contener una mayúscula';
        if (!/[a-z]/.test(pwd)) return 'La contraseña debe contener una minúscula';
        if (!/[0-9]/.test(pwd)) return 'La contraseña debe contener un número';
        return null;
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');

        const passwordError = validatePassword(password);
        if (passwordError) {
            setError(passwordError);
            return;
        }

        setIsLoading(true);

        try {
            await signup(email, name, password);
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Error al registrarse');
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="flex flex-col min-h-screen items-center pb-8">
            {/* Header Image */}
            <div className="relative w-full h-[240px] sm:h-[300px] overflow-hidden rounded-b-[32px] thick-border border-t-0 border-l-0 border-r-0 mb-8 shadow-md">
                <Image
                    src="/images/hero_header.webp"
                    alt="Pitufos vs Cariñositos"
                    fill
                    className="object-cover object-top"
                    priority
                />
            </div>

            <div className="w-full max-w-sm px-4 flex flex-col items-center z-10">
                <h1 className="text-3xl font-bangers text-center mb-6 metallic-text">Registrarse</h1>

                {error && (
                    <div className="bg-red-900/50 border border-red-500/50 text-red-200 px-4 py-2 rounded-lg mb-4 w-full font-fredoka text-sm">
                        {error}
                    </div>
                )}

                <form onSubmit={handleSubmit} className="flex flex-col gap-4 w-full cartoon-card p-6">
                    <input
                        type="email"
                        placeholder="Correo electrónico"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        className="w-full p-3 thick-border rounded-xl bg-white font-bangers text-[#1e293b] tracking-wider focus:outline-none focus:ring-0 shadow-none"
                        required
                    />
                    <input
                        type="text"
                        placeholder="Nombre completo"
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        className="w-full p-3 thick-border rounded-xl bg-white font-bangers text-[#1e293b] tracking-wider focus:outline-none focus:ring-0 shadow-none"
                        required
                    />
                    <input
                        type="password"
                        placeholder="Contraseña"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        className="w-full p-3 thick-border rounded-xl bg-white font-bangers text-[#1e293b] tracking-wider focus:outline-none focus:ring-0 shadow-none"
                        required
                    />
                    <p className="text-xs text-forest-deep/60 font-fredoka">
                        La contraseña debe tener al menos 8 caracteres con una mayúscula, una minúscula y un número.
                    </p>
                    <button
                        type="submit"
                        disabled={isLoading}
                        className="w-full py-3 gold-button text-[#1e293b] shadow-[0_4px_0_#1e293b] active:translate-y-1 active:shadow-none font-bangers text-lg tracking-wider uppercase disabled:opacity-50"
                    >
                        {isLoading ? 'Creando cuenta...' : 'Registrarse'}
                    </button>
                </form>

                <p className="text-center mt-4 text-cream/70 font-fredoka">
                    ¿Ya tienes cuenta?{' '}
                    <Link href="/login" className="text-[#ffd700] drop-shadow-sm font-bangers tracking-wider hover:brightness-110">Iniciar sesión</Link>
                </p>
            </div>
        </div>
    );
}
