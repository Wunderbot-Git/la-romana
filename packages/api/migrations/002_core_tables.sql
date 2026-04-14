-- event_members: Links users to events with roles
CREATE TABLE event_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id UUID NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id),
  role VARCHAR(20) NOT NULL CHECK (role IN ('organizer', 'player')),
  flight_id UUID, -- Will reference flights table, added as FK later
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(event_id, user_id)
);

-- flights: Groups of 4 players
CREATE TABLE flights (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id UUID NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  flight_number INTEGER NOT NULL,
  front_state VARCHAR(20) DEFAULT 'open' CHECK (front_state IN ('open', 'completed', 'reopened')),
  back_state VARCHAR(20) DEFAULT 'open' CHECK (back_state IN ('open', 'completed', 'reopened')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(event_id, flight_number)
);

-- players: Event-scoped player records
CREATE TABLE players (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id UUID NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  user_id UUID REFERENCES users(id), -- Optional link to user account
  display_name VARCHAR(255) NOT NULL,
  handicap_index DECIMAL(4,1) NOT NULL,
  tee_id UUID, -- Will reference tees table
  team VARCHAR(10) NOT NULL CHECK (team IN ('red', 'blue')),
  flight_id UUID REFERENCES flights(id),
  position INTEGER NOT NULL CHECK (position IN (1, 2)), -- Position within team in flight
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_players_event ON players(event_id);
CREATE INDEX idx_players_flight ON players(flight_id);

-- courses: Event-scoped course data
CREATE TABLE courses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id UUID NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  source VARCHAR(20) NOT NULL CHECK (source IN ('api', 'manual')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(event_id) -- One course per event
);

-- tees: Tee sets for a course
CREATE TABLE tees (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  course_id UUID NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
  name VARCHAR(100) NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- holes: Hole data per tee
CREATE TABLE holes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tee_id UUID NOT NULL REFERENCES tees(id) ON DELETE CASCADE,
  hole_number INTEGER NOT NULL CHECK (hole_number BETWEEN 1 AND 18),
  par INTEGER,
  stroke_index INTEGER NOT NULL CHECK (stroke_index BETWEEN 1 AND 18),
  UNIQUE(tee_id, hole_number)
);

-- Add foreign key constraints that were deferred
ALTER TABLE event_members ADD CONSTRAINT fk_event_members_flight 
  FOREIGN KEY (flight_id) REFERENCES flights(id);

ALTER TABLE players ADD CONSTRAINT fk_players_tee 
  FOREIGN KEY (tee_id) REFERENCES tees(id);
