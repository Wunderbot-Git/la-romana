import { getPool } from '../config/database';
import { createBet, getBetsForFlight, getBetsForEvent, getUserBetsForEvent, Bet } from '../repositories/betRepository';
import { getFlightScoreboardData } from './scoreService';
import { getGeneralBetSettlement, getGeneralBetDetailsForUser } from './generalBettingService';
import { getUserGeneralBets } from '../repositories/generalBetRepository';

interface PlaceBetInput {
    eventId: string;
    flightId: string;
    segmentType: 'singles1' | 'singles2' | 'fourball' | 'scramble';
    bettorId: string;
    pickedOutcome: 'A' | 'B' | 'AS';
    comment?: string;
    customAmount?: number; // For additional bets — if omitted, uses event bet_amount
}

export const placeBet = async (input: PlaceBetInput): Promise<Bet> => {
    const pool = getPool();
    const client = await pool.connect();

    try {
        await client.query('BEGIN');

        // 1. Get Tournament/Event Bet Amount
        const eventRes = await client.query('SELECT bet_amount FROM events WHERE id = $1', [input.eventId]);
        if (eventRes.rows.length === 0) throw new Error('Event not found');
        const betAmount = eventRes.rows[0].bet_amount ? parseFloat(eventRes.rows[0].bet_amount) : 5000;

        if (betAmount === null || betAmount <= 0) {
            throw new Error('Betting is not enabled for this event.');
        }

        // 2. Get Match State first (needed to check if bet is replaceable)
        const board = await getFlightScoreboardData(input.flightId);

        let currentHole = 0;
        let currentLeader: 'A' | 'B' | 'AS' = 'AS';
        let currentUp = 0;

        if (input.segmentType === 'scramble') {
            const scrambleScores = board.redPlayers[0].scores.slice(9, 18);
            currentHole = scrambleScores.filter(s => s !== null).length;
        } else {
            const scores = board.redPlayers[0].scores.slice(0, 9);
            currentHole = scores.filter(s => s !== null).length;
        }

        if (input.segmentType === 'fourball') {
            if (board.fourballLeader === 'red') currentLeader = 'A';
            else if (board.fourballLeader === 'blue') currentLeader = 'B';
            else currentLeader = 'AS';
            currentUp = board.fourballLead || 0;
        } else if (input.segmentType === 'scramble') {
            if (board.scrambleLeader === 'red') currentLeader = 'A';
            else if (board.scrambleLeader === 'blue') currentLeader = 'B';
            else currentLeader = 'AS';
            currentUp = board.scrambleLead || 0;
        } else if (input.segmentType === 'singles1') {
            const statusStr = board.redPlayers[0].singlesStatus || 'AS';
            if (statusStr.includes('UP')) currentLeader = 'A';
            else if (statusStr.includes('DN')) currentLeader = 'B';
            const match = statusStr.match(/(\d+)/);
            if (match) currentUp = parseInt(match[1]);
        } else if (input.segmentType === 'singles2') {
            const statusStr = board.redPlayers[1].singlesStatus || 'AS';
            if (statusStr.includes('UP')) currentLeader = 'A';
            else if (statusStr.includes('DN')) currentLeader = 'B';
            const match = statusStr.match(/(\d+)/);
            if (match) currentUp = parseInt(match[1]);
        }

        // 4. Betting Window Logic
        if (currentHole > 8) {
            throw new Error('Betting window closed: Match almost finished.');
        }

        if (currentLeader !== 'AS') {
            if (currentUp >= 3) {
                throw new Error('Betting window closed: Lead is 3 UP or more.');
            } else if (currentUp === 2 && currentHole > 5) {
                throw new Error('Betting window closed: 2 UP after Hole 5.');
            } else if (currentUp === 1 && currentHole > 7) {
                throw new Error('Betting window closed: 1 UP after Hole 7.');
            }
        }

        // 5. Leader Restriction Rule
        if (currentHole > 0) {
            if (input.pickedOutcome === currentLeader) {
                throw new Error('You cannot bet on the leader while the match is in progress.');
            }
        }

        // 6. Check for existing mandatory bet
        const existingBetRes = await client.query(
            'SELECT id FROM bets WHERE flight_id = $1 AND segment_type = $2 AND bettor_id = $3 AND is_additional = false FOR UPDATE',
            [input.flightId, input.segmentType, input.bettorId]
        );
        const hasMandatoryBet = existingBetRes.rows.length > 0;
        // Pre-match: always replace (never additional), regardless of customAmount
        const isAdditional = hasMandatoryBet && currentHole > 0;

        if (hasMandatoryBet && !isAdditional) {
            // No scores yet — delete old mandatory bet so it can be replaced
            await client.query('DELETE FROM bets WHERE id = $1', [existingBetRes.rows[0].id]);
        }

        // Limit: only 1 additional bet per match per player
        if (isAdditional) {
            const additionalRes = await client.query(
                'SELECT id FROM bets WHERE flight_id = $1 AND segment_type = $2 AND bettor_id = $3 AND is_additional = true',
                [input.flightId, input.segmentType, input.bettorId]
            );
            if (additionalRes.rows.length > 0) {
                throw new Error('Ya tienes una apuesta adicional en este partido.');
            }
        }

        // Additional bets are fixed at the event bet_amount (no custom amount)
        const finalAmount = betAmount;

        // 7. Calculate Factors (×2 scale for integer storage: 2/1.5/1 → 4/3/2)
        let timingFactor = 2;
        if (currentHole === 0) timingFactor = 4;
        else if (currentHole <= 3) timingFactor = 3;
        else timingFactor = 2;

        // Risk factors (×2 scale: 1/2/3 → 2/4/6)
        let riskFactor = 2;
        if (currentHole > 0 && currentLeader !== 'AS') {
            if (input.pickedOutcome !== 'AS' && input.pickedOutcome !== currentLeader) {
                if (currentUp === 1) riskFactor = 4;
                else if (currentUp === 2) riskFactor = 6;
            }
        }

        const partes = timingFactor * riskFactor;

        // 7. Insert Bet manually to use the transaction client
        const res = await client.query(
            `INSERT INTO bets (
                event_id, flight_id, segment_type, bettor_id, picked_outcome,
                timing_factor, risk_factor, partes, amount,
                score_at_bet, hole_at_bet, comment, is_additional
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13) RETURNING *`,
            [
                input.eventId, input.flightId, input.segmentType, input.bettorId, input.pickedOutcome,
                timingFactor, riskFactor, partes, finalAmount,
                currentLeader === 'AS' ? 0 : currentUp,
                currentHole === 0 ? null : currentHole,
                input.comment || null,
                isAdditional
            ]
        );

        await client.query('COMMIT');

        return {
            id: res.rows[0].id,
            eventId: res.rows[0].event_id,
            flightId: res.rows[0].flight_id,
            segmentType: res.rows[0].segment_type,
            bettorId: res.rows[0].bettor_id,
            pickedOutcome: res.rows[0].picked_outcome,
            timingFactor: res.rows[0].timing_factor,
            riskFactor: res.rows[0].risk_factor,
            partes: res.rows[0].partes,
            amount: parseFloat(res.rows[0].amount),
            scoreAtBet: res.rows[0].score_at_bet,
            holeAtBet: res.rows[0].hole_at_bet,
            comment: res.rows[0].comment,
            createdAt: res.rows[0].created_at
        } as Bet;

    } catch (e) {
        await client.query('ROLLBACK');
        throw e;
    } finally {
        client.release();
    }
};

export const getMatchBets = async (flightId: string, segmentType: string): Promise<any> => {
    const bets = await getBetsForFlight(flightId);
    const segmentBets = bets.filter(b => b.segmentType === segmentType);

    const potSize = segmentBets.reduce((sum, b) => sum + b.amount, 0);

    // Group partes by outcome
    const totalPartesA = segmentBets.filter(b => b.pickedOutcome === 'A').reduce((sum, b) => sum + b.partes, 0);
    const totalPartesB = segmentBets.filter(b => b.pickedOutcome === 'B').reduce((sum, b) => sum + b.partes, 0);
    const totalPartesAS = segmentBets.filter(b => b.pickedOutcome === 'AS').reduce((sum, b) => sum + b.partes, 0);

    const enrichBet = (bet: Bet) => {
        let potentialPayout = 0;
        if (bet.pickedOutcome === 'A' && totalPartesA > 0) {
            potentialPayout = (bet.partes / totalPartesA) * potSize;
        } else if (bet.pickedOutcome === 'B' && totalPartesB > 0) {
            potentialPayout = (bet.partes / totalPartesB) * potSize;
        } else if (bet.pickedOutcome === 'AS' && totalPartesAS > 0) {
            potentialPayout = (bet.partes / totalPartesAS) * potSize;
        }

        return {
            ...bet,
            potentialPayout
        };
    };

    return {
        bets: segmentBets.map(enrichBet),
        pot: potSize,
        partes: {
            A: totalPartesA,
            B: totalPartesB,
            AS: totalPartesAS
        }
    };
};

export interface Transfer {
    from: string;
    to: string;
    amount: number;
}

export const getTournamentSettlements = async (eventId: string) => {
    const pool = getPool();
    const bets = await getBetsForEvent(eventId);

    // Group bets by flight and segment
    const betsByMatch: Record<string, Bet[]> = {};
    bets.forEach(b => {
        const key = `${b.flightId}_${b.segmentType}`;
        if (!betsByMatch[key]) betsByMatch[key] = [];
        betsByMatch[key].push(b);
    });

    const flightIds = Array.from(new Set(bets.map(b => b.flightId)));

    // Fetch flight names with player names for enriching bets
    const flightNames: Record<string, string> = {};
    if (flightIds.length > 0) {
        const fnRes = await pool.query(
            `SELECT f.id, f.flight_number, p.first_name, p.team, p.position
             FROM flights f
             LEFT JOIN players p ON p.flight_id = f.id
             WHERE f.id = ANY($1)
             ORDER BY f.flight_number, p.team, p.position`,
            [flightIds]
        );
        const flightPlayers: Record<string, { number: number; red: string[]; blue: string[] }> = {};
        fnRes.rows.forEach((r: any) => {
            if (!flightPlayers[r.id]) flightPlayers[r.id] = { number: r.flight_number, red: [], blue: [] };
            if (r.first_name) {
                if (r.team === 'red') flightPlayers[r.id].red.push(r.first_name);
                else if (r.team === 'blue') flightPlayers[r.id].blue.push(r.first_name);
            }
        });
        for (const [id, fp] of Object.entries(flightPlayers)) {
            const red = fp.red.join('/');
            const blue = fp.blue.join('/');
            flightNames[id] = red && blue ? `${red} vs ${blue}` : `Grupo ${fp.number}`;
        }
    }

    let isPartial = false;
    const playerBalances: Record<string, number> = {};
    const playerOpenWagered: Record<string, number> = {};
    const playerClosedWagered: Record<string, number> = {};
    const playerClosedRecovered: Record<string, number> = {};
    const playerOpenPotential: Record<string, number> = {};
    const playerBets: Record<string, any[]> = {};

    for (const flightId of flightIds) {
        const board = await getFlightScoreboardData(flightId);

        // Helper to evaluate segment result
        const evalSegment = (segType: string, leader: string | null, isFinished: boolean) => {
            const key = `${flightId}_${segType}`;
            const matchBets = betsByMatch[key] || [];
            if (matchBets.length === 0) return;

            if (!isFinished) isPartial = true;

            const potSize = matchBets.reduce((sum, b) => sum + b.amount, 0);

            // Calculate total partes per outcome
            const partesA = matchBets.filter(b => b.pickedOutcome === 'A').reduce((sum, b) => sum + b.partes, 0);
            const partesB = matchBets.filter(b => b.pickedOutcome === 'B').reduce((sum, b) => sum + b.partes, 0);
            const partesAS = matchBets.filter(b => b.pickedOutcome === 'AS').reduce((sum, b) => sum + b.partes, 0);

            // Determine winner
            let winningOutcome: 'A' | 'B' | 'AS' = 'AS';
            if (isFinished) {
                if (leader === 'red') winningOutcome = 'A';
                else if (leader === 'blue') winningOutcome = 'B';
                else winningOutcome = 'AS';
            }

            matchBets.forEach(bet => {
                if (!playerBalances[bet.bettorId]) playerBalances[bet.bettorId] = 0;
                if (!playerOpenWagered[bet.bettorId]) playerOpenWagered[bet.bettorId] = 0;
                if (!playerClosedWagered[bet.bettorId]) playerClosedWagered[bet.bettorId] = 0;
                if (!playerClosedRecovered[bet.bettorId]) playerClosedRecovered[bet.bettorId] = 0;
                if (!playerOpenPotential[bet.bettorId]) playerOpenPotential[bet.bettorId] = 0;
                if (!playerBets[bet.bettorId]) playerBets[bet.bettorId] = [];

                let enrichedBet = { ...bet, flightName: flightNames[bet.flightId] || '', status: isFinished ? 'closed' : 'open', potentialPayout: 0, realizedPayout: 0 };

                if (isFinished) {
                    playerClosedWagered[bet.bettorId] += bet.amount;
                    playerBalances[bet.bettorId] -= bet.amount; // wager paid

                    let payout = 0;
                    if (winningOutcome === 'AS' && partesAS === 0) {
                        // Refund logic
                        payout = bet.amount;
                    } else if (bet.pickedOutcome === winningOutcome) {
                        const totalWinningPartes = winningOutcome === 'A' ? partesA : (winningOutcome === 'B' ? partesB : partesAS);
                        if (totalWinningPartes > 0) {
                            payout = (bet.partes / totalWinningPartes) * potSize;
                        }
                    }
                    if (payout > 0) {
                        playerBalances[bet.bettorId] += payout;
                        playerClosedRecovered[bet.bettorId] += payout;
                    }
                    enrichedBet.realizedPayout = payout;
                    enrichedBet.potentialPayout = payout; // For consistency in UI
                } else {
                    playerOpenWagered[bet.bettorId] += bet.amount;

                    // Calc potential payout per bet (for display breakdown)
                    const totalPartes = bet.pickedOutcome === 'A' ? partesA : (bet.pickedOutcome === 'B' ? partesB : partesAS);
                    if (totalPartes > 0) {
                        enrichedBet.potentialPayout = (bet.partes / totalPartes) * potSize;
                    }
                }

                playerBets[bet.bettorId].push(enrichedBet);
            });

            // Best-case potential per match: for each bettor, find which outcome
            // maximizes their net payout from THIS match, add only that amount
            if (!isFinished) {
                const bettorIds = Array.from(new Set(matchBets.map(b => b.bettorId)));
                for (const bettorId of bettorIds) {
                    const myBets = matchBets.filter(b => b.bettorId === bettorId);
                    const myWagered = myBets.reduce((s, b) => s + b.amount, 0);

                    let bestNet = -myWagered; // worst case: lose everything
                    for (const outcome of ['A', 'B', 'AS'] as const) {
                        const totalWinPartes = outcome === 'A' ? partesA : outcome === 'B' ? partesB : partesAS;
                        let payout = 0;
                        if (totalWinPartes > 0) {
                            for (const bet of myBets) {
                                if (bet.pickedOutcome === outcome) {
                                    payout += (bet.partes / totalWinPartes) * potSize;
                                }
                            }
                        }
                        const net = payout - myWagered;
                        if (net > bestNet) bestNet = net;
                    }
                    // Add best-case net profit (excluding wager recovery)
                    playerOpenPotential[bettorId] += Math.max(0, bestNet);
                }
            }
        };

        // Evaluate Fourball using explicit winner/complete from scoreboard
        evalSegment('fourball', board.fourballWinner, board.fourballComplete);

        // Evaluate Singles1
        const s1Status = board.redPlayers[0].singlesStatus || '';
        const s1Leader = board.redPlayers[0].singlesResult === 'win' ? 'red' : (board.bluePlayers[0].singlesResult === 'win' ? 'blue' : null);
        const s1Finished = s1Status.includes('Won') || s1Status.includes('Lost') ||
            board.redPlayers[0].scores.slice(0, 9).filter((s: number | null) => s !== null).length >= 9;
        evalSegment('singles1', s1Leader, s1Finished);

        // Evaluate Singles2
        const s2Status = board.redPlayers[1].singlesStatus || '';
        const s2Leader = board.redPlayers[1].singlesResult === 'win' ? 'red' : (board.bluePlayers[1].singlesResult === 'win' ? 'blue' : null);
        const s2Finished = s2Status.includes('Won') || s2Status.includes('Lost') ||
            board.redPlayers[1].scores.slice(0, 9).filter((s: number | null) => s !== null).length >= 9;
        evalSegment('singles2', s2Leader, s2Finished);

        // Evaluate Scramble using explicit winner/complete from scoreboard
        evalSegment('scramble', board.scrambleWinner, board.scrambleComplete);
    }

    // Merge general bet settlements
    const generalSettlement = await getGeneralBetSettlement(eventId);
    if (generalSettlement.isPartial) isPartial = true;

    for (const [id, bal] of Object.entries(generalSettlement.balances)) {
        playerBalances[id] = (playerBalances[id] || 0) + bal;
    }
    for (const [id, val] of Object.entries(generalSettlement.openWagered)) {
        playerOpenWagered[id] = (playerOpenWagered[id] || 0) + val;
    }
    for (const [id, val] of Object.entries(generalSettlement.closedWagered)) {
        playerClosedWagered[id] = (playerClosedWagered[id] || 0) + val;
    }
    for (const [id, val] of Object.entries(generalSettlement.closedRecovered)) {
        playerClosedRecovered[id] = (playerClosedRecovered[id] || 0) + val;
    }
    for (const [id, val] of Object.entries(generalSettlement.openPotential)) {
        playerOpenPotential[id] = (playerOpenPotential[id] || 0) + val;
    }

    // Min-Transfer algorithm

    // We need bettor names
    const bettors = Object.keys(playerBalances);
    const usersRes = await pool.query('SELECT id, name FROM users WHERE id = ANY($1)', [bettors.length > 0 ? bettors : [null]]);
    const nameMap: Record<string, string> = {};
    usersRes.rows.forEach(r => nameMap[r.id] = r.name || 'Unknown');

    const debtors = bettors.filter(id => playerBalances[id] < -0.01).map(id => ({ id, name: nameMap[id], balance: playerBalances[id] })).sort((a, b) => a.balance - b.balance);
    const creditors = bettors.filter(id => playerBalances[id] > 0.01).map(id => ({ id, name: nameMap[id], balance: playerBalances[id] })).sort((a, b) => b.balance - a.balance);

    const transfers: Transfer[] = [];
    let dIdx = 0;
    let cIdx = 0;

    while (dIdx < debtors.length && cIdx < creditors.length) {
        const debt = -debtors[dIdx].balance;
        const credit = creditors[cIdx].balance;
        const amount = Math.min(debt, credit);

        transfers.push({
            from: debtors[dIdx].id,
            to: creditors[cIdx].id,
            amount
        });

        debtors[dIdx].balance += amount;
        creditors[cIdx].balance -= amount;

        if (Math.abs(debtors[dIdx].balance) < 0.01) dIdx++;
        if (Math.abs(creditors[cIdx].balance) < 0.01) cIdx++;
    }

    return {
        isPartial,
        balances: bettors.map(id => ({
            id,
            name: nameMap[id],
            balance: playerBalances[id]
        })).sort((a, b) => b.balance - a.balance),
        transfers,
        personalStats: {
            playerOpenWagered,
            playerClosedWagered,
            playerClosedRecovered,
            playerOpenPotential,
            playerBets
        }
    };
};

export const getPersonalStats = async (eventId: string, bettorId: string): Promise<any> => {
    const pool = getPool();
    // Rely on the full tournament settlement to extract personal stats, ensuring logic reuse and perfect sync
    const [settlement, generalBetDetails] = await Promise.all([
        getTournamentSettlements(eventId),
        getGeneralBetDetailsForUser(eventId, bettorId)
    ]);

    const openWagered = settlement.personalStats.playerOpenWagered[bettorId] || 0;
    const closedWagered = settlement.personalStats.playerClosedWagered[bettorId] || 0;
    const closedRecovered = settlement.personalStats.playerClosedRecovered[bettorId] || 0;
    const potential = settlement.personalStats.playerOpenPotential[bettorId] || 0;
    const userBets = settlement.personalStats.playerBets[bettorId] || [];

    const wagered = openWagered + closedWagered;
    const realizedNet = closedRecovered - closedWagered;

    // Resolve general bet outcomes to display labels
    const TEAM_LABELS: Record<string, string> = { red: 'Cariñositos', blue: 'Pitufos' };
    const playerUuids = generalBetDetails
        .filter(b => b.betType === 'mvp' || b.betType === 'worst_player')
        .map(b => b.pickedOutcome);
    let playerNames: Record<string, string> = {};
    if (playerUuids.length > 0) {
        const nameRes = await pool.query(
            `SELECT id, first_name FROM players WHERE id = ANY($1)`,
            [playerUuids]
        );
        nameRes.rows.forEach((r: any) => { playerNames[r.id] = r.first_name; });
    }

    const enrichedGeneralBets = generalBetDetails.map(b => {
        let displayOutcome = b.pickedOutcome;
        if (b.betType === 'tournament_winner') {
            displayOutcome = TEAM_LABELS[b.pickedOutcome] || b.pickedOutcome;
        } else if (b.betType === 'mvp' || b.betType === 'worst_player') {
            displayOutcome = playerNames[b.pickedOutcome] || b.pickedOutcome;
        }
        return { ...b, displayOutcome };
    });

    return {
        wagered,
        realizedNet,
        potential,
        closedWagered,
        closedRecovered,
        bets: userBets,
        generalBets: enrichedGeneralBets,
        generalBetsCount: generalBetDetails.length
    };
};

const ACTIVE_GENERAL_BET_TYPES = ['tournament_winner', 'exact_score', 'mvp', 'worst_player'];

export const getMandatoryBetStatus = async (eventId: string, bettorId: string) => {
    const pool = getPool();

    // Get placed mandatory match bets (is_additional = false)
    const matchBetsResult = await pool.query(
        `SELECT DISTINCT flight_id, segment_type FROM bets
         WHERE event_id = $1 AND bettor_id = $2 AND is_additional = false`,
        [eventId, bettorId]
    );
    const placedMatchBets = new Set(
        matchBetsResult.rows.map((r: any) => `${r.flight_id}:${r.segment_type}`)
    );

    // Get placed general bets
    const generalBetsResult = await pool.query(
        `SELECT bet_type FROM general_bets
         WHERE event_id = $1 AND bettor_id = $2 AND bet_type = ANY($3)`,
        [eventId, bettorId, ACTIVE_GENERAL_BET_TYPES]
    );
    const placedGeneralTypes = new Set(generalBetsResult.rows.map((r: any) => r.bet_type));

    // Get all flights with their segments and player info
    const flightsResult = await pool.query(
        `SELECT f.id as flight_id, f.flight_number,
                u1.display_name as red1_name, u2.display_name as red2_name,
                u3.display_name as blue1_name, u4.display_name as blue2_name
         FROM flights f
         JOIN users u1 ON f.red_player1_id = u1.id
         LEFT JOIN users u2 ON f.red_player2_id = u2.id
         JOIN users u3 ON f.blue_player1_id = u3.id
         LEFT JOIN users u4 ON f.blue_player2_id = u4.id
         WHERE f.event_id = $1
         ORDER BY f.flight_number`,
        [eventId]
    );

    // Each flight has 4 segments: singles1, singles2, fourball, scramble
    const allSegments = ['singles1', 'singles2', 'fourball', 'scramble'];
    const missingMatches: any[] = [];

    for (const flight of flightsResult.rows) {
        for (const seg of allSegments) {
            const key = `${flight.flight_id}:${seg}`;
            if (!placedMatchBets.has(key)) {
                let players = '';
                if (seg === 'singles1') players = `${flight.red1_name} vs ${flight.blue1_name}`;
                else if (seg === 'singles2') players = `${flight.red2_name} vs ${flight.blue2_name}`;
                else if (seg === 'fourball') players = `${flight.red1_name}/${flight.red2_name} vs ${flight.blue1_name}/${flight.blue2_name}`;
                else players = `${flight.red1_name}/${flight.red2_name} vs ${flight.blue1_name}/${flight.blue2_name}`;

                missingMatches.push({
                    flightId: flight.flight_id,
                    flightNumber: flight.flight_number,
                    segmentType: seg,
                    players
                });
            }
        }
    }

    const missingGeneral = ACTIVE_GENERAL_BET_TYPES.filter(t => !placedGeneralTypes.has(t));
    const totalRequired = ACTIVE_GENERAL_BET_TYPES.length + (flightsResult.rows.length * allSegments.length);
    const placed = totalRequired - missingGeneral.length - missingMatches.length;

    return {
        total: totalRequired,
        placed,
        missing: {
            general: missingGeneral,
            matches: missingMatches
        }
    };
};
