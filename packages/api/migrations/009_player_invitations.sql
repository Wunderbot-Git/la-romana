-- Create player invitations table for linking accounts to imported players

CREATE TABLE IF NOT EXISTS player_invites (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    event_id UUID NOT NULL REFERENCES events(id) ON DELETE CASCADE,
    player_id UUID NOT NULL REFERENCES players(id) ON DELETE CASCADE,
    claimed_by_user_id UUID REFERENCES users(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    expires_at TIMESTAMPTZ NOT NULL,
    -- A player can only have one active invite at a time
    UNIQUE(player_id)
);

-- Index for quick token lookup
CREATE INDEX IF NOT EXISTS idx_player_invites_id ON player_invites(id);
-- Index for quick player lookup
CREATE INDEX IF NOT EXISTS idx_player_invites_player_id ON player_invites(player_id);

