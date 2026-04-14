-- Fix hole_overrides to use hole_id and matches code
DROP TABLE IF EXISTS hole_overrides;

CREATE TABLE hole_overrides (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id UUID NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  hole_id UUID NOT NULL REFERENCES holes(id) ON DELETE CASCADE,
  new_stroke_index INTEGER NOT NULL CHECK (new_stroke_index BETWEEN 1 AND 18),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(event_id, hole_id)
);

CREATE INDEX idx_hole_overrides_event ON hole_overrides(event_id);
