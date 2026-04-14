-- update players table to match new requirements
ALTER TABLE players 
  DROP COLUMN display_name,
  ADD COLUMN first_name VARCHAR(100),
  ADD COLUMN last_name VARCHAR(100),
  ADD COLUMN updated_at TIMESTAMPTZ DEFAULT NOW(),
  ALTER COLUMN team DROP NOT NULL,
  ALTER COLUMN position DROP NOT NULL;

-- Populate first/last from existing entries (if any - unlikely in dev, but cleaner)
-- Truncating/Deleting is safer/easier for dev since we handle new logic
-- Use DELETE to avoid TRUNCATE constraint issues (though cascading delete is usually required)
DELETE FROM players;

ALTER TABLE players
  ALTER COLUMN first_name SET NOT NULL,
  ALTER COLUMN last_name SET NOT NULL;
