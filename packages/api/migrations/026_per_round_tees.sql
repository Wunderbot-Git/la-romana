-- Migration 026: Per-round tee assignment per player
--
-- Why:
--   `players.tee_id` is a single FK, so a player can only point to ONE tee
--   across all rounds. With La Romana's 3 different courses (each having its
--   own set of tees), the player needs a per-round tee override to feed the
--   USGA Course Handicap calc correctly on every round.
--
-- Backfill strategy: for each player + round, find a tee on that round's
--   course whose NAME matches the player's current `tee_id` name. So if Manu
--   plays from "Azul" on TOTH, he defaults to "Azul" on Ocean's 4 + Dye Fore.
--   When no name match exists, no row is inserted → leaderboard falls back to
--   legacy behaviour (`Index × Allowance`).

CREATE TABLE player_round_tees (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  player_id   UUID NOT NULL REFERENCES players(id) ON DELETE CASCADE,
  round_id    UUID NOT NULL REFERENCES rounds(id)  ON DELETE CASCADE,
  tee_id      UUID NOT NULL REFERENCES tees(id),
  created_at  TIMESTAMPTZ DEFAULT NOW(),
  -- one override per player per round
  UNIQUE (player_id, round_id)
);
CREATE INDEX idx_player_round_tees_round  ON player_round_tees(round_id);
CREATE INDEX idx_player_round_tees_player ON player_round_tees(player_id);

-- Backfill: same tee name on each round's course
INSERT INTO player_round_tees (player_id, round_id, tee_id)
SELECT
  p.id,
  r.id,
  target_tee.id
FROM players p
JOIN tees current_tee ON current_tee.id = p.tee_id
JOIN rounds r         ON r.event_id     = p.event_id
JOIN tees target_tee  ON target_tee.course_id = r.course_id
                     AND target_tee.name      = current_tee.name
WHERE p.tee_id IS NOT NULL
ON CONFLICT (player_id, round_id) DO NOTHING;
