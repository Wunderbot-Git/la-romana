-- Migration 019: Allow multiple bets per match per player
-- Drop unique constraint to enable additional bets on same match
-- The first bet is mandatory (COP 5000), additional bets have custom amounts

ALTER TABLE bets DROP CONSTRAINT IF EXISTS bets_flight_id_segment_type_bettor_id_key;

-- Add is_additional flag to distinguish mandatory vs extra bets
ALTER TABLE bets ADD COLUMN IF NOT EXISTS is_additional BOOLEAN NOT NULL DEFAULT false;
