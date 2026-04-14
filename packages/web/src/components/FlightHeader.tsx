'use client';

interface Player {
    playerId: string;
    playerName: string;
    hcp: number;
}

interface FlightHeaderProps {
    flightName?: string;
    redPlayers: Player[];
    bluePlayers: Player[];
}

export function FlightHeader({ flightName, redPlayers, bluePlayers }: FlightHeaderProps) {
    return (
        <div className="bg-forest-deep gold-border rounded-xl p-4">
            {flightName && (
                <h2 className="text-center text-sm font-bangers text-gold-light mb-3">{flightName}</h2>
            )}

            <div className="flex justify-between items-start gap-4">
                {/* Red Team */}
                <div className="flex-1">
                    <div className="text-team-red font-bangers text-xs mb-2 text-center">CARINOSITOS</div>
                    <div className="space-y-1">
                        {redPlayers.map((player) => (
                            <div key={player.playerId} className="bg-team-red/10 rounded-lg px-3 py-2 text-center border border-team-red/20">
                                <div className="font-fredoka font-bold text-team-red text-sm">{player.playerName}</div>
                                <div className="text-xs text-cream/50 font-fredoka">HCP {Math.round(player.hcp * 0.8)}</div>
                            </div>
                        ))}
                    </div>
                </div>

                {/* VS divider */}
                <div className="flex items-center justify-center self-center">
                    <span className="text-gold-light font-bangers text-sm">VS</span>
                </div>

                {/* Blue Team */}
                <div className="flex-1">
                    <div className="text-team-blue font-bangers text-xs mb-2 text-center">PITUFOS</div>
                    <div className="space-y-1">
                        {bluePlayers.map((player) => (
                            <div key={player.playerId} className="bg-team-blue/10 rounded-lg px-3 py-2 text-center border border-team-blue/20">
                                <div className="font-fredoka font-bold text-team-blue text-sm">{player.playerName}</div>
                                <div className="text-xs text-cream/50 font-fredoka">HCP {Math.round(player.hcp * 0.8)}</div>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        </div>
    );
}
