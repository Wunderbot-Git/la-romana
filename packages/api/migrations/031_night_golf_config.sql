-- Migration 031 — Configure Night Golf 9H side event
--
-- 1. Disable apuestas/predicciones on LRNIGHT (`bet_amount = NULL`).
-- 2. Reassign night-event players to the Red (W) tee where the same user
--    plays a women's tee in LR2026 (matched by tee name containing '(W)',
--    'mujer', 'women' or 'damen').
--
-- Idempotent: if LRNIGHT doesn't exist this is a no-op. Re-running just
-- repeats the same updates.

DO $$
DECLARE
    v_night_event_id UUID;
    v_lr_event_id    UUID;
    v_blue_tee_id    UUID;
    v_redw_tee_id    UUID;
    v_women_count    INTEGER;
BEGIN
    SELECT id INTO v_night_event_id FROM events WHERE event_code = 'LRNIGHT' LIMIT 1;
    IF v_night_event_id IS NULL THEN
        RAISE NOTICE 'LRNIGHT event not found — skipping config.';
        RETURN;
    END IF;

    SELECT id INTO v_lr_event_id FROM events WHERE event_code = 'LR2026' LIMIT 1;

    -- 1. Disable bets on the night event
    UPDATE events SET bet_amount = NULL WHERE id = v_night_event_id;

    -- 2. Look up the night-event tees we created in migration 030
    SELECT t.id INTO v_blue_tee_id
    FROM tees t
    JOIN courses c ON c.id = t.course_id
    WHERE c.event_id = v_night_event_id AND t.name = 'Blue'
    LIMIT 1;

    SELECT t.id INTO v_redw_tee_id
    FROM tees t
    JOIN courses c ON c.id = t.course_id
    WHERE c.event_id = v_night_event_id AND t.name = 'Red (W)'
    LIMIT 1;

    -- If LR2026 doesn't exist or the night Red (W) tee is missing, leave
    -- everyone on Blue (the seed default).
    IF v_lr_event_id IS NULL OR v_redw_tee_id IS NULL THEN
        RAISE NOTICE 'Skipping women tee reassignment (LR2026=%, redw_tee=%)', v_lr_event_id, v_redw_tee_id;
        RETURN;
    END IF;

    -- 3. Reassign night-event players to Red (W) where their LR2026 tee is a
    --    women's tee. Checks both the player's main `players.tee_id` and any
    --    per-round override in `player_round_tees`.
    UPDATE players p_night
    SET tee_id = v_redw_tee_id
    WHERE p_night.event_id = v_night_event_id
      AND p_night.user_id IS NOT NULL
      AND p_night.user_id IN (
        SELECT DISTINCT p_lr.user_id
        FROM players p_lr
        WHERE p_lr.event_id = v_lr_event_id
          AND p_lr.user_id IS NOT NULL
          AND (
            EXISTS (
                SELECT 1 FROM tees t
                WHERE t.id = p_lr.tee_id
                  AND (
                    t.name ILIKE '%(W)%'
                    OR t.name ILIKE '%mujer%'
                    OR t.name ILIKE '%women%'
                    OR t.name ILIKE '%damen%'
                  )
            )
            OR EXISTS (
                SELECT 1 FROM player_round_tees prt
                JOIN tees t ON t.id = prt.tee_id
                WHERE prt.player_id = p_lr.id
                  AND (
                    t.name ILIKE '%(W)%'
                    OR t.name ILIKE '%mujer%'
                    OR t.name ILIKE '%women%'
                    OR t.name ILIKE '%damen%'
                  )
            )
          )
      );

    GET DIAGNOSTICS v_women_count = ROW_COUNT;
    RAISE NOTICE 'Night Golf 9H configured: bets disabled, % player(s) reassigned to Red (W).', v_women_count;
END $$;
