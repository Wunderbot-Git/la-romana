-- Migration 007: Add Betting System tables and columns

-- Add bet_amount to events (nullable; if null, betting is disabled for this event)
ALTER TABLE events ADD COLUMN bet_amount DECIMAL(10,2);

-- Create bets table
CREATE TABLE bets (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id        UUID NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  flight_id       UUID NOT NULL REFERENCES flights(id) ON DELETE CASCADE,
  bettor_id       UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  picked_outcome  VARCHAR(10) NOT NULL, -- 'A', 'B', or 'AS'
  timing_factor   INTEGER NOT NULL,     -- 1, 2, or 3
  risk_factor     INTEGER NOT NULL,     -- 1, 2, or 3
  partes          INTEGER NOT NULL,     -- timing_factor * risk_factor
  amount          DECIMAL(10,2) NOT NULL, -- snapshot of bet_amount at time of bet
  score_at_bet    INTEGER,              -- score (e.g. 1, 2) at moment of bet
  hole_at_bet     INTEGER,              -- hole number at moment of bet (null if pre-match)
  comment         TEXT,
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (flight_id, bettor_id)          -- one bet per player per flight
);

-- Indices for faster querying
CREATE INDEX idx_bets_event_id ON bets(event_id);
CREATE INDEX idx_bets_flight_id ON bets(flight_id);
CREATE INDEX idx_bets_bettor_id ON bets(bettor_id);
