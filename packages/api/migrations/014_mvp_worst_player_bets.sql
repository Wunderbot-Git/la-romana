-- Migration 014: Add 'mvp' and 'worst_player' bet types

-- Widen picked_outcome to fit player UUIDs (36 chars)
ALTER TABLE general_bets ALTER COLUMN picked_outcome TYPE VARCHAR(50);

-- Drop and re-create the CHECK constraint to include new bet types
ALTER TABLE general_bets DROP CONSTRAINT IF EXISTS general_bets_bet_type_check;
ALTER TABLE general_bets ADD CONSTRAINT general_bets_bet_type_check
  CHECK (bet_type IN ('tournament_winner', 'flight_winner', 'flight_sweep', 'biggest_blowout', 'any_halve', 'early_close', 'mvp', 'worst_player'));
