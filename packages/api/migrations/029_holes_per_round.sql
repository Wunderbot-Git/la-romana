-- Migration 029 — holes_per_round on rounds
--
-- Allow rounds to be 9 or 18 holes. Default 18 keeps all existing La Romana
-- rounds untouched. The 9-hole option is for side-events (e.g. night golf
-- on a par-3 9-hole course) that live in their own Event.

ALTER TABLE rounds
    ADD COLUMN holes_per_round INTEGER NOT NULL DEFAULT 18
    CHECK (holes_per_round IN (9, 18));
