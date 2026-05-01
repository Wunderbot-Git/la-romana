-- Migration 032 — Remove the Night Golf 9H side event entirely.
--
-- Reverts migrations 030 and 031. Deletes the LRNIGHT event; FK cascades
-- clean up its rounds, course/tees/holes, players, flights, hole_scores
-- and event_members. LR2026 and any other event are untouched.
--
-- Idempotent: if LRNIGHT was never created (or was already removed), this
-- is a no-op.

DELETE FROM events WHERE event_code = 'LRNIGHT';
