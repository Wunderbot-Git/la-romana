-- Migration 012: General bets (tournament-level, flight-level, prop bets)

CREATE TABLE general_bets (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id        UUID NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  bettor_id       UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  bet_type        VARCHAR(30) NOT NULL CHECK (bet_type IN ('tournament_winner', 'flight_winner', 'flight_sweep', 'biggest_blowout', 'any_halve')),
  flight_id       UUID REFERENCES flights(id) ON DELETE CASCADE,  -- nullable, only for flight-scoped bets
  segment_type    VARCHAR(20),           -- nullable, only for segment-scoped props
  picked_outcome  VARCHAR(30) NOT NULL,  -- 'red', 'blue', 'tie', 'yes', 'no'
  timing_factor   INTEGER NOT NULL DEFAULT 1,
  partes          INTEGER NOT NULL DEFAULT 1,
  amount          DECIMAL(10,2) NOT NULL,
  comment         TEXT,
  created_at      TIMESTAMPTZ DEFAULT NOW()
);

-- One bet per user per bet type per scope (using COALESCE for nullable columns)
CREATE UNIQUE INDEX idx_general_bets_unique ON general_bets (
  event_id, bet_type, bettor_id,
  COALESCE(flight_id, '00000000-0000-0000-0000-000000000000'),
  COALESCE(segment_type, '__none__')
);

CREATE INDEX idx_general_bets_event_id ON general_bets(event_id);
CREATE INDEX idx_general_bets_bettor_id ON general_bets(bettor_id);
CREATE INDEX idx_general_bets_bet_type ON general_bets(event_id, bet_type);
