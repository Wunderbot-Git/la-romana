-- Migration 018: Add 'exact_score' bet type

-- Drop and re-create the CHECK constraint to include new bet type
ALTER TABLE general_bets DROP CONSTRAINT IF EXISTS general_bets_bet_type_check;
ALTER TABLE general_bets ADD CONSTRAINT general_bets_bet_type_check
  CHECK (bet_type IN ('tournament_winner', 'flight_winner', 'flight_sweep', 'biggest_blowout', 'any_halve', 'early_close', 'mvp', 'worst_player', 'exact_score'));
