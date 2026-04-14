-- hole_overrides: Event-specific stroke index overrides
CREATE TABLE hole_overrides (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id UUID NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  tee_id UUID NOT NULL REFERENCES tees(id) ON DELETE CASCADE,
  hole_number INTEGER NOT NULL CHECK (hole_number BETWEEN 1 AND 18),
  stroke_index_override INTEGER NOT NULL CHECK (stroke_index_override BETWEEN 1 AND 18),
  UNIQUE(event_id, tee_id, hole_number)
);

-- mixed_scramble_stroke_index: Global scramble SI for mixed tees
CREATE TABLE mixed_scramble_stroke_index (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id UUID NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  hole_number INTEGER NOT NULL CHECK (hole_number BETWEEN 1 AND 18),
  stroke_index INTEGER NOT NULL CHECK (stroke_index BETWEEN 1 AND 18),
  UNIQUE(event_id, hole_number)
);

-- hole_scores: Per-player gross scores (front 9 canonical source)
CREATE TABLE hole_scores (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id UUID NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  flight_id UUID NOT NULL REFERENCES flights(id),
  player_id UUID NOT NULL REFERENCES players(id),
  hole_number INTEGER NOT NULL CHECK (hole_number BETWEEN 1 AND 18),
  gross_score INTEGER NOT NULL CHECK (gross_score > 0),
  entered_by_user_id UUID NOT NULL REFERENCES users(id),
  source VARCHAR(20) NOT NULL DEFAULT 'online' CHECK (source IN ('online', 'offline')),
  client_timestamp TIMESTAMPTZ NOT NULL,
  server_timestamp TIMESTAMPTZ DEFAULT NOW(),
  version INTEGER NOT NULL DEFAULT 1,
  mutation_id UUID NOT NULL,
  UNIQUE(event_id, player_id, hole_number),
  UNIQUE(mutation_id)
);

CREATE INDEX idx_hole_scores_flight ON hole_scores(flight_id);
CREATE INDEX idx_hole_scores_player ON hole_scores(player_id);

-- scramble_team_scores: Team scores for back 9 scramble
CREATE TABLE scramble_team_scores (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id UUID NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  flight_id UUID NOT NULL REFERENCES flights(id),
  team VARCHAR(10) NOT NULL CHECK (team IN ('red', 'blue')),
  hole_number INTEGER NOT NULL CHECK (hole_number BETWEEN 10 AND 18),
  gross_score INTEGER NOT NULL CHECK (gross_score > 0),
  entered_by_user_id UUID NOT NULL REFERENCES users(id),
  source VARCHAR(20) NOT NULL DEFAULT 'online' CHECK (source IN ('online', 'offline')),
  client_timestamp TIMESTAMPTZ NOT NULL,
  server_timestamp TIMESTAMPTZ DEFAULT NOW(),
  version INTEGER NOT NULL DEFAULT 1,
  mutation_id UUID NOT NULL,
  UNIQUE(event_id, flight_id, team, hole_number),
  UNIQUE(mutation_id)
);

CREATE INDEX idx_scramble_scores_flight ON scramble_team_scores(flight_id);

-- audit_log: Organizer-visible audit trail
CREATE TABLE audit_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id UUID NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  entity_type VARCHAR(50) NOT NULL,
  entity_id UUID NOT NULL,
  action VARCHAR(50) NOT NULL,
  previous_value JSONB,
  new_value JSONB,
  by_user_id UUID NOT NULL REFERENCES users(id),
  source VARCHAR(20) NOT NULL DEFAULT 'online',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_audit_log_event ON audit_log(event_id);
CREATE INDEX idx_audit_log_entity ON audit_log(entity_type, entity_id);

-- spectator_tokens: Read-only access tokens
CREATE TABLE spectator_tokens (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id UUID NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  token VARCHAR(64) UNIQUE NOT NULL,
  created_by_user_id UUID NOT NULL REFERENCES users(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  expires_at TIMESTAMPTZ
);

CREATE INDEX idx_spectator_tokens_token ON spectator_tokens(token);
