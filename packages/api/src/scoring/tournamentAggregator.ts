// Tournament Aggregator
//
// Rolls per-round scoring results up to tournament-level cumulative standings.
// Used for:
//   - Individual Stableford leaderboard (all rounds summed)
//   - Ryder Cup team match points (all rounds summed)

export interface PlayerRoundPoints {
    playerId: string;
    roundNumber: number;
    stablefordPoints: number;
    /** Match points a player personally earned in singles + fourball for this round. */
    ryderIndividualPoints: number;
}

export interface PlayerTournamentTotals {
    playerId: string;
    stablefordCumulative: number;
    ryderIndividualCumulative: number;
    roundsPlayed: number;
}

export const aggregatePlayerTotals = (
    rounds: PlayerRoundPoints[]
): PlayerTournamentTotals[] => {
    const totals = new Map<string, PlayerTournamentTotals>();
    for (const r of rounds) {
        const prev = totals.get(r.playerId) ?? {
            playerId: r.playerId,
            stablefordCumulative: 0,
            ryderIndividualCumulative: 0,
            roundsPlayed: 0,
        };
        prev.stablefordCumulative += r.stablefordPoints;
        prev.ryderIndividualCumulative += r.ryderIndividualPoints;
        prev.roundsPlayed += 1;
        totals.set(r.playerId, prev);
    }
    return [...totals.values()].sort(
        (a, b) => b.stablefordCumulative - a.stablefordCumulative
    );
};

export interface TeamRoundPoints {
    team: 'red' | 'blue';
    roundNumber: number;
    /** Ryder match points the team earned in this round (singles + fourball). */
    matchPoints: number;
}

export interface TeamTournamentTotals {
    team: 'red' | 'blue';
    matchPointsCumulative: number;
    roundsPlayed: number;
}

export const aggregateTeamTotals = (
    rounds: TeamRoundPoints[]
): TeamTournamentTotals[] => {
    const totals = new Map<'red' | 'blue', TeamTournamentTotals>();
    for (const r of rounds) {
        const prev = totals.get(r.team) ?? {
            team: r.team,
            matchPointsCumulative: 0,
            roundsPlayed: 0,
        };
        prev.matchPointsCumulative += r.matchPoints;
        prev.roundsPlayed += 1;
        totals.set(r.team, prev);
    }
    return [...totals.values()].sort(
        (a, b) => b.matchPointsCumulative - a.matchPointsCumulative
    );
};
