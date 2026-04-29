-- 027_fix_toth_pars.sql
--
-- Tournament-day data fix: Teeth of the Dog par values seeded by `seed-la-romana.ts`
-- did not match the official Casa de Campo scorecard. This breaks Stableford net-to-par
-- scoring (Mejor del Día, /ranking) and any par-relative display.
--
-- Card values confirmed by Phil from the physical scorecard 2026-04-29:
--   Front 9: 4 4 5 4 3 4 3 4 5  (sum 36)
--   Back  9: 4 5 4 3 5 4 3 4 4  (sum 36)
--   Total:  72
--
-- Wrong values seeded:
--   Hoyo  3: 4→5    Hoyo 11: 4→5
--   Hoyo  4: 3→4    Hoyo 13: 5→3
--   Hoyo  5: 4→3    Hoyo 14: 4→5
--   Hoyo  6: 5→4    Hoyo 15: 3→4
--   Hoyo  7: 4→3    Hoyo 16: 4→3
--   Hoyo  9: 4→5
--
-- Match Play (singles + fourball) is unaffected by par — those compare net scores
-- directly. Stableford and the par-relative display ARE affected, so this migration
-- corrects all 6 TOTH tees (Negro / Oro / Azul / Blanco / Verde / Rojo (W)) at once.

UPDATE holes h
SET par = v.par
FROM (VALUES
    (1, 4), (2, 4), (3, 5), (4, 4), (5, 3), (6, 4), (7, 3), (8, 4), (9, 5),
    (10, 4), (11, 5), (12, 4), (13, 3), (14, 5), (15, 4), (16, 3), (17, 4), (18, 4)
) AS v(hole, par)
WHERE h.hole_number = v.hole
  AND h.tee_id IN (
    SELECT t.id
    FROM tees t
    JOIN courses c ON c.id = t.course_id
    JOIN events e ON e.id = c.event_id
    WHERE c.name = 'Teeth of the Dog'
      AND e.event_code = 'LR2026'
  );
