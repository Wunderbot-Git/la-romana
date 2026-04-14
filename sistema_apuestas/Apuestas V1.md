# Apuestas v1 (Parimutuel Betting System) - Technical Summary

## 1. Architecture Overview
The Betting System ("Apuestas") replaces the previous "My Card" functionality with a robust parimutuel (pool-based) betting market directly integrated into the live Ryder Cup scoring flow. It allows participants to wager on individual, bestball, and scramble match segments. The system dynamically tracks potential payouts based on bet placement timing and market risk, and calculates a final tournament settlement using an optimized peer-to-peer minimum-transfer algorithm ("Honor System").

---

## 2. Database & Data Model
* **`bets` Table:**
  * Created via migrations `010` and `011`.
  * **Columns:** `id` (UUID), `event_id`, `flight_id`, `segment_type` (singles, fourball, scramble), `bettor_id`, `picked_outcome` (`A`, `B`, or `AS` for tie), `timing_factor`, `risk_factor`, `partes` (calculated shares), `amount` (COP), and `comment`.
  * **Constraints:** A unique constraint on `(flight_id, segment_type, bettor_id)` guarantees players can only bet once per match segment.
* **`events` Table Updates:**
  * Added `bet_amount` column. This acts as a global feature toggle; if set to > 0, betting is enabled, and it dictates the standard flat wager amount across the event (e.g., 10,000 COP).

---

## 3. Core Betting Logic (Backend)
Located primarily in `packages/api/src/services/bettingService.ts`.

* **Parimutuel Model:** Instead of traditional fixed odds, all wagers on a single match are aggregated into a consolidated pot. At match conclusion, payouts are distributed proportionally among the winners based on the amount of "Partes" (shares) their bet accumulated.
* **Partes Calculation Formula:**
  > **Partes = Base (10) × Timing Factor × Risk Factor**

  * **Timing Factor:** Degrades linearly as the match progresses to reward early bettors. A bet placed on Hole 1 earns a `1.0` multiplier, whereas a bet placed on Hole 8 earns `0.4`.
  * **Risk Factor:** Adjusts payouts based on the live scoreboard. Wagering on the current underdog grants a `1.5` multiplier bonus.

* **Betting Window Rules:**
  * Bets can only be placed up to Hole 8. Once hole 9 begins, the betting market closes.
  * The match must be active (started but not yet finished).
  * **Anti-Cheat:** Users are strictly blocked from placing a bet on the team currently leading the match.

---

## 4. API Endpoints
All housed under `packages/api/src/routes/bets.ts`:

* **`POST /events/:eventId/flights/:flightId/segments/:segmentType/bets`**
  Handles bet placement. Validates window and leader rules, calculates dynamic Partes, and records the wager.
* **`GET /events/:eventId/flights/:flightId/segments/:segmentType/bets`**
  Public polling endpoint for a match's betting market. Returns total pot size and a list of placed bets to display market sentiment.
* **`GET /events/:eventId/bets/my-stats`**
  Fetches a specific user's complete statistical snapshot: total open wagers, realized closed profit/loss, potential upside, and a fully decorated array of every individual bet (used to populate the UI without N+1 queries).
* **`GET /events/:eventId/settlement`**
  The global settlement endpoint. Re-evaluates every match in the tournament, computes the global leaderboard of net balances, and executes the minimum-transfer algorithm.

---

## 5. Settlement & Transfer Algorithm
Because the application does not handle actual payment processing, it utilizes an "Honor System" accounting ledger.

1. **Balance Calculation:** Everyone's net balance is aggregated across all their bets. (Winnings - Wagers).
2. **Debtors vs Creditors:** The system divides players into "Debtors" (negative balance) and "Creditors" (positive balance).
3. **Minimum Transfers:** Uses a greedy two-pointer algorithm to match the largest Debtor to the largest Creditor. This drastically reduces the total number of peer-to-peer bank transfers required. (e.g., instead of A paying B and B paying C, A pays C directly).

---

## 6. Frontend UI Components
Built into `packages/web/src/app/apuestas`.

* **Tab Navigation Architecture:** The main Apuestas page wraps three sub-views: `Partidas` (Overview), `Clasificación` (Leaderboard), and `Liquidación` (Settlements).
* **`DashboardBanner`:** A sticky top banner displaying the user's financial standing: "Apostado" (Open risk), "Resultado Neto" (Realized Profit/Loss), and "Potencial" (Maximum possible return).
* **`MatchBettingCard`:** The visual list item for active matches. Displays dynamic badging (Fase 1, Fase 2, Apuestas Cerradas), the live score state, player names, and an embedded summary of the user's current bet / potential payout for that match.
* **`BettingDetailSheet`:** A slide-up modal overlay used to execute a bet. It prevents prohibited selections, explains the "Compromiso de Honor" rule, captures an optional comment, and displays the current market volume.
* **Liquidación View:** Renders intuitive transaction cards using the settlement data, explaining exactly who owes whom (e.g., "Fercho debe pagar a Adriana: $25,000").

---

## 7. Event & Score Integration
The entire Apuestas v1 ecosystem is natively subscribed to the existing `ScoreService` and database schema. 
* As event admins or participants log scores on the traditional scoreboard, the backend match parsers instantly determine hole progression and match leaders.
* Betting phases, multipliers, and final payouts react immediately based on these derived states without any secondary data structures.
