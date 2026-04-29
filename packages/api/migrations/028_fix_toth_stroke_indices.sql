-- 028_fix_toth_stroke_indices.sql
--
-- Tournament-day data fix part 2: stroke indices for Teeth of the Dog were
-- wrong on the front 9 for all men's tees, and wrong on both nines for the
-- women's Rojo (W) tee (the seed copied Azul's SIs by default).
--
-- Card values confirmed by Phil from the physical scorecard 2026-04-29:
--
--   AZUL / men's HANDICAP row:  7  13  11  3  15  1  17  5  9
--                               8  10   4 16  14 12  18  2  6
--   ROJAS (W) HANDICAP row:     9  13   7  5  15  1  17  3 11
--                              14   8   6 18  12 10  16  2  4
--
-- Wrong SIs on AZUL (front 9 only — back 9 already correct):
--   Hoyo 3:  3 → 11
--   Hoyo 4: 11 → 3
--   Hoyo 5:  1 → 15
--   Hoyo 6:  5 → 1
--   Hoyo 8:  9 → 5
--   Hoyo 9: 15 → 9
--   (Hoyo 7 = 17 was already correct)
--
-- All 5 men's tees (Negro / Oro / Azul / Blanco / Verde) share one SI ordering;
-- women's Rojo (W) gets its own.
--
-- Match Play stroke allocation per hole IS affected by SI, so this rewrites
-- the running A/S / 1UP / 2UP for any in-flight match retroactively when the
-- leaderboard cache invalidates.

-- 1. All 5 men's tees → AZUL SI
UPDATE holes h
SET stroke_index = v.si
FROM (VALUES
    (1, 7), (2, 13), (3, 11), (4, 3), (5, 15), (6, 1), (7, 17), (8, 5), (9, 9),
    (10, 8), (11, 10), (12, 4), (13, 16), (14, 14), (15, 12), (16, 18), (17, 2), (18, 6)
) AS v(hole, si)
WHERE h.hole_number = v.hole
  AND h.tee_id IN (
    SELECT t.id
    FROM tees t
    JOIN courses c ON c.id = t.course_id
    JOIN events e ON e.id = c.event_id
    WHERE c.name = 'Teeth of the Dog'
      AND e.event_code = 'LR2026'
      AND t.name IN ('Negro', 'Oro', 'Azul', 'Blanco', 'Verde')
  );

-- 2. Women's Rojo (W) → ROJAS SI
UPDATE holes h
SET stroke_index = v.si
FROM (VALUES
    (1, 9), (2, 13), (3, 7), (4, 5), (5, 15), (6, 1), (7, 17), (8, 3), (9, 11),
    (10, 14), (11, 8), (12, 6), (13, 18), (14, 12), (15, 10), (16, 16), (17, 2), (18, 4)
) AS v(hole, si)
WHERE h.hole_number = v.hole
  AND h.tee_id IN (
    SELECT t.id
    FROM tees t
    JOIN courses c ON c.id = t.course_id
    JOIN events e ON e.id = c.event_id
    WHERE c.name = 'Teeth of the Dog'
      AND e.event_code = 'LR2026'
      AND t.name = 'Rojo (W)'
  );
