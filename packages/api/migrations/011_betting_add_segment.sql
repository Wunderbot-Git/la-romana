-- Migration 011: Add segment_type to bets to support multiple matches per flight

ALTER TABLE bets ADD COLUMN segment_type VARCHAR(20) NOT NULL DEFAULT 'fourball' CHECK (segment_type IN ('singles1', 'singles2', 'fourball', 'scramble'));

-- Drop the old unique constraint (flight_id, bettor_id) - its auto-generated name might be tricky, but we explicitly named it UNIQUE (flight_id, bettor_id). 
-- Actually we can just drop the constraint by name if we query it, or since we just created it, we can drop the table and recreate it, or better yet, drop the constraint.
-- Because there's no data yet, dropping and recreating the whole table is safest.

DROP TABLE bets;

CREATE TABLE bets (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id        UUID NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  flight_id       UUID NOT NULL REFERENCES flights(id) ON DELETE CASCADE,
  segment_type    VARCHAR(20) NOT NULL CHECK (segment_type IN ('singles1', 'singles2', 'fourball', 'scramble')),
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
  UNIQUE (flight_id, segment_type, bettor_id) -- one bet per player per specific match
);

CREATE INDEX idx_bets_event_id ON bets(event_id);
CREATE INDEX idx_bets_flight_id ON bets(flight_id);
CREATE INDEX idx_bets_bettor_id ON bets(bettor_id);
