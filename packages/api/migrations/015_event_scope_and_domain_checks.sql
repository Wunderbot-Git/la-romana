-- Migration 015: Event-scope composite constraints + domain checks
-- Ensures cross-entity integrity at the DB level (flight/player/score/bet must belong to same event)
-- Adds domain CHECK constraints for business rules

-- =============================================
-- Part 1: Composite uniqueness for composite FKs
-- =============================================

-- flights: (id, event_id) must be unique so other tables can reference both columns
ALTER TABLE flights ADD CONSTRAINT uq_flights_id_event UNIQUE (id, event_id);

-- players: (id, event_id) must be unique so scores can reference both columns
ALTER TABLE players ADD CONSTRAINT uq_players_id_event UNIQUE (id, event_id);

-- =============================================
-- Part 2: Composite foreign keys for event-scope integrity
-- =============================================

-- Players: flight must belong to same event as player
ALTER TABLE players
  ADD CONSTRAINT fk_players_flight_event
  FOREIGN KEY (flight_id, event_id)
  REFERENCES flights (id, event_id);

-- Hole scores: flight must belong to same event
ALTER TABLE hole_scores
  ADD CONSTRAINT fk_hole_scores_flight_event
  FOREIGN KEY (flight_id, event_id)
  REFERENCES flights (id, event_id);

-- Hole scores: player must belong to same event
ALTER TABLE hole_scores
  ADD CONSTRAINT fk_hole_scores_player_event
  FOREIGN KEY (player_id, event_id)
  REFERENCES players (id, event_id);

-- Scramble scores: flight must belong to same event
ALTER TABLE scramble_team_scores
  ADD CONSTRAINT fk_scramble_scores_flight_event
  FOREIGN KEY (flight_id, event_id)
  REFERENCES flights (id, event_id);

-- Bets: flight must belong to same event
ALTER TABLE bets
  ADD CONSTRAINT fk_bets_flight_event
  FOREIGN KEY (flight_id, event_id)
  REFERENCES flights (id, event_id);

-- General bets: flight must belong to same event (nullable flight_id; FK only enforced when NOT NULL)
ALTER TABLE general_bets
  ADD CONSTRAINT fk_general_bets_flight_event
  FOREIGN KEY (flight_id, event_id)
  REFERENCES flights (id, event_id);

-- =============================================
-- Part 3: Domain CHECK constraints
-- =============================================

-- Events: bet_amount must be positive when set
ALTER TABLE events
  ADD CONSTRAINT chk_events_bet_amount_positive
  CHECK (bet_amount IS NULL OR bet_amount > 0);

-- Bets: picked_outcome must be a valid value
ALTER TABLE bets
  ADD CONSTRAINT chk_bets_picked_outcome
  CHECK (picked_outcome IN ('A', 'B', 'AS'));

-- Bets: timing_factor must be 1-3
ALTER TABLE bets
  ADD CONSTRAINT chk_bets_timing_factor
  CHECK (timing_factor BETWEEN 1 AND 3);

-- Bets: risk_factor must be 1-3
ALTER TABLE bets
  ADD CONSTRAINT chk_bets_risk_factor
  CHECK (risk_factor BETWEEN 1 AND 3);
