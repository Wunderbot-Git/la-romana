-- 033_fix_oceans_four_card.sql
--
-- Tournament-day data fix: Ocean's 4 par + stroke-index values seeded by
-- `seed-la-romana.ts` did not match the official scorecard. Confirmed values
-- from Phil 2026-05-01 (Round 2 day):
--
--   Par   Front 9: 4 4 3 4 5 4 3 5 4  (sum 36)
--   Par   Back  9: 4 4 5 3 4 4 3 4 5  (sum 36)
--   HCP   Front 9: 15 1 13 9 11 17 5 7 3
--   HCP   Back  9: 12 6 10 2 18 14 4 8 16
--
-- Diffs vs original seed:
--   Hoyo  5: par 4→5
--   Hoyo  9: par 5→4
--   Hoyo  6: SI  7→17
--   Hoyo  7: SI 17→5
--   Hoyo  8: SI  5→7
--
-- Match-play (singles + fourball) ignores par; Stableford / Mejor del Día and
-- the per-hole stroke-allocation in the score grid both depend on these.
-- Migration scopes by course name + event_code so all Ocean's 4 tees are
-- corrected in one shot. Idempotent — re-running just re-applies the same
-- values.

UPDATE holes h
SET par = v.par,
    stroke_index = v.si
FROM (VALUES
    ( 1, 4, 15), ( 2, 4,  1), ( 3, 3, 13), ( 4, 4,  9),
    ( 5, 5, 11), ( 6, 4, 17), ( 7, 3,  5), ( 8, 5,  7),
    ( 9, 4,  3), (10, 4, 12), (11, 4,  6), (12, 5, 10),
    (13, 3,  2), (14, 4, 18), (15, 4, 14), (16, 3,  4),
    (17, 4,  8), (18, 5, 16)
) AS v(hole, par, si)
WHERE h.hole_number = v.hole
  AND h.tee_id IN (
    SELECT t.id
    FROM tees t
    JOIN courses c ON c.id = t.course_id
    JOIN events e ON e.id = c.event_id
    WHERE c.name = 'Ocean''s 4'
      AND e.event_code = 'LR2026'
  );
