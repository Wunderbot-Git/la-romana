# Feature Spec: Betting System ("Apuestas" Tab)

**Project:** Ryder Cup Par 00  
**Version:** 1.0  
**Status:** Ready for Implementation  
**Phase:** 8.5 (between Analytics and PWA Finalization)

---

## 1. Overview

The Apuestas tab allows every team member to place bets on the outcome of ongoing matches during the tournament. There is no external bank or payment gateway — all money placed flows exclusively between players. The system uses a **weighted parimutuel model**: the total pot is distributed proportionally among winners based on their accumulated shares (partes), which are determined by *when* and *on whom* they bet.

---

## 2. Supported Match Formats

Bets can be placed on all three match formats. The betting object differs per format but the underlying logic is identical:

| Format | Bet Target |
|---|---|
| Individual (Match Play) | Player A · All Square · Player B |
| Bestball | Flight A · All Square · Flight B |
| Scramble | Team A · All Square · Team B |

---

## 3. Betting Window Rules

The betting window closes dynamically based on the current hole and score. Both conditions must be met for a bet to be accepted.

### 3.1 Closure by Score + Hole

| Current Score | Last Hole to Bet | Behavior if exceeded |
|---|---|---|
| All Square | Hole 8 | Window closes after hole 8 completes |
| 1 UP | Hole 7 | Window closes after hole 7 completes |
| 2 UP | Hole 5 | Window closes after hole 5 completes |
| 3 UP or more | Immediately | Button locked as soon as score reaches 3 UP |

### 3.2 Restriction on Betting for the Leader

Once the match is in progress (Hole 1+), **betting on the current leader is not allowed**. Only the following options remain available during live play:

- Bet on the player/team that is currently trailing (underdog)
- Bet on All Square

> This rule does not apply before the match starts. Pre-match, all three options are always available.

---

## 4. Share Calculation (Partes)

Each bet is assigned a number of shares at the moment of placement. Shares are calculated as:

```
Partes = Timing Factor × Risk Factor
```

### 4.1 Timing Factor

| Moment | Timing Factor |
|---|---|
| Before match start | × 3 |
| Holes 1 – 3 | × 2 |
| Holes 4 – 8 | × 1 |

### 4.2 Risk Factor

| Situation at bet time | Bet placed on | Risk Factor |
|---|---|---|
| All Square | Anyone | × 1 |
| 1 UP | All Square | × 1 |
| 1 UP | Underdog (1 DOWN) | × 2 |
| 2 UP | All Square | × 1 |
| 2 UP | Underdog (2 DOWN) | × 3 |

> The Risk Factor only applies during live play (Holes 1–8). Pre-match bets always have Risk Factor × 1 regardless of any pre-game context.

---

## 5. Payout Calculation

At the end of each match, the total pot is distributed among winners in proportion to their shares:

```
Payout = (Player's Partes ÷ Total Winning Partes) × Total Pot
```

**Fundamental rule: Total payouts always equal total pot. The system never pays out more than was put in.**

### 5.1 Edge Case: No Bets on the Winning Outcome

If a match ends All Square but nobody bet on All Square, all bets are fully refunded.

---

## 6. Payment Model

No payment gateway is integrated. The system operates on an **honor system**:

- The fixed bet amount per match is set by the admin at the tournament level.
- When a player confirms a bet, they self-declare payment via a confirmation dialog.
- Settlement happens once, at the end of the tournament, in cash or via transfer (e.g. Nequi / Daviplata).

---

## 7. Data Model

### 7.1 New Column: `tournaments.bet_amount`

```sql
ALTER TABLE tournaments ADD COLUMN bet_amount DECIMAL(10,2);
```

Nullable. If null, the Apuestas tab is hidden for that tournament.

### 7.2 New Table: `bets`

```sql
CREATE TABLE bets (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tournament_id   UUID NOT NULL REFERENCES tournaments(id),
  match_id        UUID NOT NULL REFERENCES matches(id),
  bettor_id       UUID NOT NULL REFERENCES users(id),
  picked_outcome  VARCHAR(10) NOT NULL, -- 'A', 'B', or 'AS'
  timing_factor   INTEGER NOT NULL,     -- 1, 2, or 3
  risk_factor     INTEGER NOT NULL,     -- 1, 2, or 3
  partes          INTEGER NOT NULL,     -- timing_factor × risk_factor
  amount          DECIMAL(10,2) NOT NULL, -- snapshot of bet_amount at time of bet
  score_at_bet    INTEGER,              -- score (e.g. 1, 2) at moment of bet
  hole_at_bet     INTEGER,              -- hole number at moment of bet (null if pre-match)
  comment         TEXT,
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (match_id, bettor_id)          -- one bet per player per match
);
```

> `picked_outcome` stores `'A'` (Player/Flight/Team A), `'B'` (Player/Flight/Team B), or `'AS'` (All Square).

---

## 8. API Endpoints

### 8.1 Get Bets for a Match
```
GET /api/tournaments/:tournamentId/matches/:matchId/bets
```
Returns all bets for the match including bettor names, picks, partes, comments, and estimated payout per bettor.

### 8.2 Place a Bet
```
POST /api/tournaments/:tournamentId/matches/:matchId/bets
```
**Body:**
```json
{
  "picked_outcome": "B",
  "comment": "La remontada viene"
}
```
**Server-side logic:**
1. Validate betting window is still open (check current hole and score from live match data).
2. Validate picked_outcome is not the current leader (if match is live).
3. Calculate timing_factor and risk_factor from current match state.
4. Enforce one-bet-per-player-per-match constraint.
5. Persist and return the created bet with calculated partes.

### 8.3 Get Personal Stats for Current User
```
GET /api/tournaments/:tournamentId/bets/my-stats
```
Returns for the authenticated user:
- `wagered`: total amount placed across all matches
- `realized_net`: net gain/loss from closed matches only
- `potential`: estimated payout from open bets based on current partes distribution
- `closed_wagered`: amount placed in closed matches only (for progress bar)
- `closed_recovered`: total amount won from closed matches

### 8.4 Get Settlement for Tournament
```
GET /api/tournaments/:tournamentId/settlement
```
Returns:
- Net balance per player (across all closed matches)
- Minimized transfer list (who pays whom and how much)
- Pending bets count per player (open matches)

---

## 9. Settlement Algorithm

The settlement calculation minimizes the number of transfers required to zero out all balances.

```
1. Calculate net balance per player from all closed matches:
   balance[player] = total_won - total_paid

2. Split into creditors (balance > 0) and debtors (balance < 0)

3. Greedy matching:
   While creditors and debtors remain:
     transfer = min(creditor.balance, debtor.balance)
     record: debtor → creditor: transfer
     reduce both balances by transfer amount
     remove any party whose balance reaches 0
```

This produces the minimum number of peer-to-peer transfers needed to settle all debts.

---

## 10. UI Structure

### 10.1 Tab: Apuestas (Overview)

The overview consists of two parts rendered in sequence: the personal dashboard banner and the match card list.

#### "Mi cuenta" Dashboard Banner

Always visible at the top of the Apuestas tab, even before any bets have been placed. Shows the current user's personal financial summary at a glance:

| Field | Description |
|---|---|
| **Apostado** | Total amount wagered across all matches (open + closed) |
| **Resultado** | Net gain/loss from closed matches only (green if positive, red if negative) |
| **Potencial** | Estimated payout from currently open bets, based on current pot distribution (amber) |

A progress bar beneath the three figures shows the ratio of amount recovered vs. amount invested across closed matches. If no bets have been placed yet, all values show "—" and a prompt reads *"Aún no has apostado en ninguna partida"*.

> **Calculation rules:**
> - `Apostado` counts $bet_amount × number of bets placed (all statuses)
> - `Resultado` = total won from closed matches − total paid into closed matches
> - `Potencial` = estimated payout if current open picks win, based on live partes distribution

#### Match Cards

Each card shows:

- Phase indicator (🟢 Fase 1 / 🟡 Fase 2 / 🔴 Cerrado)
- Match format label
- Player/Flight/Team names and current score badge (if live)
- Avatar stack of bettors with pot total (hidden if no bets yet)
- *"Sé el primero en apostar →"* prompt if no bets exist
- **Personal bet row** (if the current user has bet):
  - Pick label + partes count
  - Open match: estimated payout in amber (≈ $X)
  - Won: net profit in green (+$X)
  - Lost: net loss in red (−$X)

### 10.2 Match Detail View

Opened by tapping a match card. Contains:

- **Bet buttons** (pre-match: all 3 options / live: leader blocked with 🚫)
- For each non-blocked option: partes count and estimated payout if that pick wins
- **Confirmation dialog** on tap: shows pick, partes, estimated payout, optional comment field, and self-declaration of payment ($10.000 COP paid to pot)
- **Who bets on what**: three columns (A / AS / B) with bettor avatars and share counts
- **Comments**: list of bettor comments
- **Pot summary**: total amount and bettor count

### 10.3 Tab: Clasificación (Leaderboard)

- Ranks players by net balance from **closed matches only**
- Shows per player: correct bets, total amount wagered in closed matches, net saldo (green/red)
- Open bets shown in amber as *"X apuestas pendientes"*
- Players with no closed-match bets show "—" instead of a saldo

### 10.4 Tab: Liquidación (Settlement)

- Warning banner if any matches are still open (*"liquidación parcial"*)
- One transfer card per required payment: debtor avatar → amount → creditor avatar
- Summary table beneath: each player's total *cobra* (collect) or *paga* (pay) amount
- *"¡Todo cuadrado!"* empty state if all balances are zero
- Uses minimum-transfer algorithm (see Section 9)

---

## 11. Business Rules Summary

| Rule | Value |
|---|---|
| Bet options | A · All Square · B |
| Bet amount | Fixed per tournament, set by admin |
| Max bets per player per match | 1 |
| Bet modification | Not allowed after confirmation |
| Leader betting during live play | Blocked |
| Closure: All Square | After Hole 8 |
| Closure: 1 UP | After Hole 7 |
| Closure: 2 UP | After Hole 5 |
| Closure: 3 UP+ | Immediately |
| Timing Factor (pre-match) | × 3 |
| Timing Factor (Holes 1–3) | × 2 |
| Timing Factor (Holes 4–8) | × 1 |
| Risk Factor (underdog, 1 DOWN) | × 2 |
| Risk Factor (underdog, 2 DOWN) | × 3 |
| Risk Factor (all other cases) | × 1 |
| Payout model | Parimutuel weighted by partes |
| Payment flow | Honor system, settled at tournament end |
| All Square with no AS bets | Full refund to all bettors |

---

## 12. Out of Scope

The following are explicitly excluded from this feature:

- Real-money payment integration (Stripe, Nequi API, etc.)
- Automatic odds generation or external odds feeds
- Bet modification or cancellation after confirmation
- Betting on partial hole outcomes (e.g. longest drive)
- Push notifications for bet results

---

## 13. Implementation Order

Suggested sequencing within Phase 8.5:

1. **DB migration** — add `bet_amount` to tournaments, create `bets` table
2. **API layer** — GET bets, POST bet (with validation logic), GET settlement
3. **Apuestas tab** — match overview cards with phase indicators
4. **Match detail view** — bet buttons, blocking logic, confirmation dialog
5. **Leaderboard** — closed-match-only scoring, pending indicator
6. **Settlement tab** — transfer minimization algorithm and UI
7. **Admin settings** — bet amount field in tournament management
