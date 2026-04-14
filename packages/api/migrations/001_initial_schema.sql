-- Users table (basic structure)
CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email VARCHAR(255) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Events table
CREATE TABLE IF NOT EXISTS events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(255) NOT NULL,
  event_code VARCHAR(20) UNIQUE NOT NULL,
  state VARCHAR(20) NOT NULL DEFAULT 'draft' CHECK (state IN ('draft', 'live', 'completed', 'closed')),
  created_by_user_id UUID NOT NULL REFERENCES users(id),
  scramble_percent DECIMAL(5,2) DEFAULT 0.20,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  closed_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_events_event_code ON events(event_code);
CREATE INDEX IF NOT EXISTS idx_events_state ON events(state);
