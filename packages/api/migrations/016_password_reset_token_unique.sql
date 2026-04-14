-- Migration 016: Add unique constraint on password_reset_tokens.token
-- Prevents token collisions at DB level (index already exists, just add uniqueness)

ALTER TABLE password_reset_tokens
  ADD CONSTRAINT uq_password_reset_tokens_token UNIQUE (token);
