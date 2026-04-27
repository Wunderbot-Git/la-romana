-- Migration 025: Per-round flight composition + USGA Course HCP support
--
-- Why:
--   1) `players.flight_id` is a single FK, so a player can only ever be in ONE flight.
--      For a 3-round Ryder Cup with daily reshuffles, this loses Round 1's composition
--      when Round 2 is set up. Introduce a junction table `player_flights` keyed by round.
--   2) `tees` lacks `slope_rating`/`course_rating`, so USGA Course Handicap
--      (Index × Slope/113 + (Rating − Par)) cannot be computed.
--
-- Backward compat: legacy `players.flight_id|team|position` columns are kept (nullable)
-- and backfilled into the junction; reads will switch to the junction. They can be
-- dropped in a future migration once all paths are stable.

-- =============================================
-- 1. Junction: player ↔ flight per round
-- =============================================
CREATE TABLE player_flights (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  player_id   UUID NOT NULL REFERENCES players(id) ON DELETE CASCADE,
  round_id    UUID NOT NULL REFERENCES rounds(id)  ON DELETE CASCADE,
  flight_id   UUID NOT NULL REFERENCES flights(id) ON DELETE CASCADE,
  team        VARCHAR(10) NOT NULL CHECK (team IN ('red', 'blue')),
  position    INTEGER NOT NULL CHECK (position IN (1, 2)),
  created_at  TIMESTAMPTZ DEFAULT NOW(),
  -- One assignment per player per round
  UNIQUE (round_id, player_id),
  -- Each (flight, team, position) slot fills exactly once
  UNIQUE (flight_id, team, position)
);

CREATE INDEX idx_player_flights_round  ON player_flights(round_id);
CREATE INDEX idx_player_flights_flight ON player_flights(flight_id);
CREATE INDEX idx_player_flights_player ON player_flights(player_id);

-- =============================================
-- 2. Slope + Rating per tee (USGA Course HCP inputs)
-- =============================================
ALTER TABLE tees
  ADD COLUMN slope_rating  DECIMAL(4,1),
  ADD COLUMN course_rating DECIMAL(4,1);

-- =============================================
-- 3. Backfill: copy existing single-flight assignments into the junction
-- =============================================
INSERT INTO player_flights (player_id, round_id, flight_id, team, position)
SELECT p.id, f.round_id, p.flight_id, p.team, p.position
FROM players p
JOIN flights f ON f.id = p.flight_id
WHERE p.flight_id IS NOT NULL
  AND p.team     IS NOT NULL
  AND p.position IS NOT NULL
ON CONFLICT DO NOTHING;
