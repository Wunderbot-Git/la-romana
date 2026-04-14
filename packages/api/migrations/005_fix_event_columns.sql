-- Rename 'state' to 'status' to allow specific enum usage if needed, or just keep it. 
-- Prompt 8 Shared Types define 'status: EventState' and 'format: MatchType'.
-- Existing table has 'state' (varchar) and 'event_code' (varchar).
-- We need to add 'start_date', 'end_date', 'format', and rename/map 'state' to 'status'.

ALTER TABLE events 
  ADD COLUMN start_date DATE,
  ADD COLUMN end_date DATE,
  ADD COLUMN format VARCHAR(50); -- 'singles', 'singles1', etc.

-- Rename state to status to match new shared types, or just map it. 
-- Shared types says 'status: EventState'.
-- Let's rename for consistency with Prompt 8.
ALTER TABLE events RENAME COLUMN state TO status;

-- Status check constraints might need updating if EventState has different values.
-- Existing: 'draft', 'live', 'completed', 'closed'
-- Assuming EventState matches these or is compatible.
