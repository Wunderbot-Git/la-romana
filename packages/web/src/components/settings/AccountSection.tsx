'use client';

import { useState } from 'react';
import { useAuth } from '@/lib/auth';
import { useUpdateName, useChangePassword } from '@/hooks/useProfile';

interface PlayerInfo {
    playerName: string;
    team: 'red' | 'blue';
    handicapIndex: number;
}

export function AccountSection({ player }: { player: PlayerInfo | null }) {
    const { user, logout, refreshUser } = useAuth();
    const { updateName, isLoading: nameLoading, error: nameError } = useUpdateName();
    const { changePassword, isLoading: pwLoading, error: pwError, success: pwSuccess } = useChangePassword();

    const [isEditingName, setIsEditingName] = useState(false);
    const [newName, setNewName] = useState(user?.name || '');
    const [showPasswordChange, setShowPasswordChange] = useState(false);
    const [currentPassword, setCurrentPassword] = useState('');
    const [newPassword, setNewPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');

    const handleSaveName = async () => {
        const success = await updateName(newName);
        if (success) {
            await refreshUser();
            setIsEditingName(false);
        }
    };

    const handleChangePassword = async () => {
        if (newPassword !== confirmPassword) return;
        const success = await changePassword(currentPassword, newPassword);
        if (success) {
            setCurrentPassword('');
            setNewPassword('');
            setConfirmPassword('');
            setShowPasswordChange(false);
        }
    };

    if (!user) return null;

    const initials = user.name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);

    return (
        <div className="bg-white thick-border rounded-[20px] overflow-hidden">
            <div className="p-4">
                <h2 className="text-xs font-bangers text-[#1e293b] uppercase tracking-widest mb-3">Cuenta</h2>

                {/* User info */}
                <div className="flex items-center gap-3 mb-4">
                    <div className={`w-12 h-12 rounded-full flex items-center justify-center font-bangers text-white text-sm ${player?.team === 'red' ? 'bg-team-red' : player?.team === 'blue' ? 'bg-team-blue' : 'bg-forest-mid'
                        }`}>
                        {initials}
                    </div>
                    <div className="flex-1 min-w-0">
                        {isEditingName ? (
                            <div className="flex items-center gap-2">
                                <input
                                    type="text"
                                    value={newName}
                                    onChange={(e) => setNewName(e.target.value)}
                                    className="flex-1 px-3 py-1.5 thick-border rounded-xl text-sm font-fredoka text-[#1e293b] focus:outline-none focus:ring-0 shadow-none"
                                    autoFocus
                                />
                                <button onClick={handleSaveName} disabled={nameLoading} className="text-xs font-bangers text-team-blue px-2 py-1">
                                    {nameLoading ? '...' : 'Guardar'}
                                </button>
                                <button onClick={() => { setIsEditingName(false); setNewName(user.name); }} className="text-xs text-forest-deep/40 font-fredoka px-1">
                                    Cancelar
                                </button>
                            </div>
                        ) : (
                            <div className="flex items-center gap-2">
                                <span className="font-fredoka font-bold text-forest-deep text-sm">{user.name}</span>
                                <button onClick={() => setIsEditingName(true)} className="text-gold-border hover:text-brass">
                                    <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                        <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                                        <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
                                    </svg>
                                </button>
                            </div>
                        )}
                        <p className="text-xs text-forest-deep/40 font-fredoka truncate">{user.email}</p>
                    </div>
                </div>

                {nameError && <p className="text-xs text-red-500 mb-3 font-fredoka">{nameError}</p>}

                {/* Player info */}
                {player && (
                    <div className="bg-forest-deep/5 rounded-xl p-3 mb-4 border border-gold-border/20">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-[10px] font-bangers text-gold-border uppercase tracking-widest mb-1">Perfil de Jugador</p>
                                <p className="text-sm font-fredoka font-bold text-forest-deep">{player.playerName}</p>
                            </div>
                            <div className="flex items-center gap-2">
                                <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bangers uppercase ${player.team === 'red' ? 'bg-team-red/15 text-team-red' : 'bg-team-blue/15 text-team-blue'
                                    }`}>
                                    {player.team === 'red' ? 'Cariñositos' : 'Pitufos'}
                                </span>
                                <span className="text-xs text-forest-deep/50 font-fredoka font-semibold">HCP {player.handicapIndex}</span>
                            </div>
                        </div>
                    </div>
                )}

                {/* Change password */}
                <button
                    onClick={() => setShowPasswordChange(!showPasswordChange)}
                    className="w-full text-left text-sm font-fredoka font-semibold text-forest-deep/70 py-2 flex items-center justify-between"
                >
                    Cambiar Contraseña
                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={`text-gold-border transition-transform ${showPasswordChange ? 'rotate-180' : ''}`}>
                        <path d="m6 9 6 6 6-6" />
                    </svg>
                </button>

                {showPasswordChange && (
                    <div className="space-y-2 pb-2">
                        <input type="password" placeholder="Contraseña actual" value={currentPassword} onChange={(e) => setCurrentPassword(e.target.value)}
                            className="w-full px-3 py-2 border-2 border-gold-border/30 rounded-lg text-sm font-fredoka text-forest-deep focus:outline-none focus:ring-2 focus:ring-gold-border/50" />
                        <input type="password" placeholder="Nueva contraseña" value={newPassword} onChange={(e) => setNewPassword(e.target.value)}
                            className="w-full px-3 py-2 border-2 border-gold-border/30 rounded-lg text-sm font-fredoka text-forest-deep focus:outline-none focus:ring-2 focus:ring-gold-border/50" />
                        <input type="password" placeholder="Confirmar nueva contraseña" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)}
                            className="w-full px-3 py-2 border-2 border-gold-border/30 rounded-lg text-sm font-fredoka text-forest-deep focus:outline-none focus:ring-2 focus:ring-gold-border/50" />
                        {newPassword && confirmPassword && newPassword !== confirmPassword && (
                            <p className="text-xs text-red-500 font-fredoka">Las contraseñas no coinciden</p>
                        )}
                        {pwError && <p className="text-xs text-red-500 font-fredoka">{pwError}</p>}
                        {pwSuccess && <p className="text-xs text-green-500 font-fredoka">Contraseña cambiada exitosamente</p>}
                        <button
                            onClick={handleChangePassword}
                            disabled={pwLoading || !currentPassword || !newPassword || newPassword !== confirmPassword}
                            className="w-full py-2.5 gold-button text-[#1e293b] shadow-[0_4px_0_#1e293b] active:translate-y-1 active:shadow-none font-bangers text-sm disabled:opacity-50"
                        >
                            {pwLoading ? 'Cambiando...' : 'Actualizar Contraseña'}
                        </button>
                    </div>
                )}
            </div>

            {/* Logout */}
            <div className="border-t border-gold-border/20 p-4">
                <button
                    onClick={logout}
                    className="w-full py-2.5 text-team-red bg-team-red/10 border border-team-red/30 rounded-xl text-sm font-bangers"
                >
                    Cerrar Sesión
                </button>
            </div>
        </div>
    );
}
