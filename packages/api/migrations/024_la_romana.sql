-- Migration 024: La Romana refactor
-- Shifts from single-round, single-course, 9+9 segment semantics to multi-round tournament.
-- 3 rounds, each with its own course and handicap allowances.
-- Drops scramble tables (format excludes scramble) and the front/back segment state machine.
-- Adds neto pots and LD/CTP side pots.
--
-- Safe on a fresh DB (no data to preserve). Not intended to run against populated DBs.

-- =============================================
-- 1. Drop scramble-related tables
-- =============================================
DROP TABLE IF EXISTS scramble_team_scores CASCADE;
DROP TABLE IF EXISTS mixed_scramble_stroke_index CASCADE;

-- =============================================
-- 2. Allow multiple courses per event (one per round)
-- =============================================
ALTER TABLE courses DROP CONSTRAINT IF EXISTS courses_event_id_key;

-- =============================================
-- 3. Rounds — first-class entity
-- =============================================
CREATE TABLE rounds (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id UUID NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  round_number INTEGER NOT NULL CHECK (round_number > 0),
  course_id UUID NOT NULL REFERENCES courses(id),
  scheduled_at TIMESTAMPTZ,
  hcp_singles_pct DECIMAL(3,2) NOT NULL DEFAULT 0.80 CHECK (hcp_singles_pct > 0 AND hcp_singles_pct <= 1.0),
  hcp_fourball_pct DECIMAL(3,2) NOT NULL DEFAULT 0.80 CHECK (hcp_fourball_pct > 0 AND hcp_fourball_pct <= 1.0),
  state VARCHAR(20) NOT NULL DEFAULT 'open' CHECK (state IN ('open', 'completed', 'reopened')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (event_id, round_number)
);
CREATE INDEX idx_rounds_event ON rounds(event_id);

-- Composite unique so other tables can FK to (id, event_id)
ALTER TABLE rounds ADD CONSTRAINT uq_rounds_id_event UNIQUE (id, event_id);

-- =============================================
-- 4. Flights scope to rounds; drop 9+9 segment state
-- =============================================
ALTER TABLE flights ADD COLUMN round_id UUID REFERENCES rounds(id) ON DELETE CASCADE;
ALTER TABLE flights ALTER COLUMN round_id SET NOT NULL;

ALTER TABLE flights DROP COLUMN front_state;
ALTER TABLE flights DROP COLUMN back_state;
ALTER TABLE flights ADD COLUMN state VARCHAR(20) NOT NULL DEFAULT 'open'
  CHECK (state IN ('open', 'completed', 'reopened'));

-- Flight numbers are unique per round, not per event
ALTER TABLE flights DROP CONSTRAINT IF EXISTS flights_event_id_flight_number_key;
ALTER TABLE flights ADD CONSTRAINT uq_flights_round_number UNIQUE (round_id, flight_number);

CREATE INDEX idx_flights_round ON flights(round_id);

-- =============================================
-- 5. hole_scores scope to rounds
-- =============================================
ALTER TABLE hole_scores ADD COLUMN round_id UUID REFERENCES rounds(id) ON DELETE CASCADE;
ALTER TABLE hole_scores ALTER COLUMN round_id SET NOT NULL;

-- Same player can score the same hole once per round, not once per event
ALTER TABLE hole_scores DROP CONSTRAINT IF EXISTS hole_scores_event_id_player_id_hole_number_key;
ALTER TABLE hole_scores ADD CONSTRAINT uq_hole_scores_round_player_hole
  UNIQUE (round_id, player_id, hole_number);

CREATE INDEX idx_hole_scores_round ON hole_scores(round_id);

-- =============================================
-- 6. Bets scope to rounds; drop 'scramble' from segment_type
-- =============================================
ALTER TABLE bets ADD COLUMN round_id UUID REFERENCES rounds(id) ON DELETE CASCADE;
ALTER TABLE bets ALTER COLUMN round_id SET NOT NULL;

ALTER TABLE bets DROP CONSTRAINT IF EXISTS bets_segment_type_check;
ALTER TABLE bets ADD CONSTRAINT bets_segment_type_check
  CHECK (segment_type IN ('singles1', 'singles2', 'fourball'));

CREATE INDEX idx_bets_round ON bets(round_id);

-- =============================================
-- 7. Neto pots (daily side pot, 2 best-ball per flight)
-- =============================================
CREATE TABLE neto_pots (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  round_id UUID NOT NULL REFERENCES rounds(id) ON DELETE CASCADE,
  flight_id UUID NOT NULL REFERENCES flights(id) ON DELETE CASCADE,
  pot_amount_usd INTEGER NOT NULL CHECK (pot_amount_usd >= 0),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (round_id, flight_id)
);
CREATE INDEX idx_neto_pots_round ON neto_pots(round_id);

CREATE TABLE neto_pot_winners (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  pot_id UUID NOT NULL REFERENCES neto_pots(id) ON DELETE CASCADE,
  player_id UUID NOT NULL REFERENCES players(id),
  rank SMALLINT NOT NULL CHECK (rank IN (1, 2)),
  UNIQUE (pot_id, rank),
  UNIQUE (pot_id, player_id)
);
CREATE INDEX idx_neto_pot_winners_pot ON neto_pot_winners(pot_id);

-- =============================================
-- 8. Side pots (Longest Drive, Closest to Pin per round)
-- =============================================
CREATE TABLE side_pots (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  round_id UUID NOT NULL REFERENCES rounds(id) ON DELETE CASCADE,
  type VARCHAR(30) NOT NULL CHECK (type IN ('longest_drive', 'closest_to_pin')),
  hole_number INTEGER NOT NULL CHECK (hole_number BETWEEN 1 AND 18),
  winning_player_id UUID REFERENCES players(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (round_id, type, hole_number)
);
CREATE INDEX idx_side_pots_round ON side_pots(round_id);
