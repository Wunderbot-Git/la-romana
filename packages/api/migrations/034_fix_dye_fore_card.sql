-- 034_fix_dye_fore_card.sql
--
-- Tournament-day data fix: Dye Fore (Marina + Chavon) stroke indexes seeded
-- by `seed-la-romana.ts` did not match the official scorecard. Confirmed
-- values from Phil 2026-05-02 (Round 3 day):
--
--   Par   F9: 5 4 3 4 4 3 4 5 4   (sum 36) — unchanged from seed
--   Par   B9: 5 4 3 4 4 3 4 4 5   (sum 36) — unchanged from seed
--   HCP   F9: 5 9 15 1 13 17 11 3 7
--   HCP   B9: 4 2 16 12 10 14 6 18 8
--
-- SI changes (all hoyos except 1, 4, 10, 11, 17 had wrong SIs):
--   Hoyo  2: 7→9    Hoyo  3: 17→15
--   Hoyo  5: 9→13   Hoyo  6: 15→17
--   Hoyo  7: 13→11  Hoyo  8: 11→3
--   Hoyo  9: 3→7    Hoyo 12: 14→16
--   Hoyo 13: 8→12   Hoyo 14: 12→10
--   Hoyo 15: 16→14  Hoyo 16: 10→6
--   Hoyo 18: 6→8
--
-- Match-play (singles + fourball) uses these for handicap-stroke allocation;
-- a wrong SI shifts strokes to the wrong holes and changes who wins each hole
-- net. Stableford / Mejor del Día are also affected. Migration scopes by
-- course name + event_code so all Dye Fore tees are corrected in one shot.
-- Idempotent — re-running just re-applies the same values.

UPDATE holes h
SET stroke_index = v.si
FROM (VALUES
    ( 1,  5), ( 2,  9), ( 3, 15), ( 4,  1), ( 5, 13),
    ( 6, 17), ( 7, 11), ( 8,  3), ( 9,  7),
    (10,  4), (11,  2), (12, 16), (13, 12), (14, 10),
    (15, 14), (16,  6), (17, 18), (18,  8)
) AS v(hole, si)
WHERE h.hole_number = v.hole
  AND h.tee_id IN (
    SELECT t.id
    FROM tees t
    JOIN courses c ON c.id = t.course_id
    JOIN events e ON e.id = c.event_id
    WHERE c.name LIKE 'Dye Fore%'
      AND e.event_code = 'LR2026'
  );
