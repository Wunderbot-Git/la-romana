-- Migration 030 — Seed the Night Golf 9H side event automatically on deploy.
--
-- Creates a separate Event (code 'LRNIGHT') with its own course, round and
-- roster copied from LR2026, so it shows up in the EventSwitcher dropdown and
-- players can switch into it to enter scores. LR2026 itself is untouched.
--
-- Idempotent: if 'LRNIGHT' already exists this migration is a no-op. If LR2026
-- doesn't exist (fresh DB / wrong env) it skips silently.
--
-- All values match seed-night-golf.ts and the par-3 layout Phil shared:
--   - 9 holes par 3, SIs 1,3,5,7,9,11,13,15,17 mapped sequentially to holes 1-9
--   - 4 tees: Blue (54.6/87), White (53.8/86), Red men (51.5/83), Red women (57.0/89)
--   - Round 1 with holes_per_round = 9, scheduled 2026-04-30 19:00 DR local

DO $$
DECLARE
    v_source_event_id UUID;
    v_organizer_id    UUID;
    v_event_id        UUID;
    v_course_id       UUID;
    v_round_id        UUID;
    v_blue_tee_id     UUID;
    v_white_tee_id    UUID;
    v_red_tee_id      UUID;
    v_redw_tee_id     UUID;
BEGIN
    -- ── Source event lookup ────────────────────────────────────────────────
    SELECT id, created_by_user_id INTO v_source_event_id, v_organizer_id
    FROM events WHERE event_code = 'LR2026' LIMIT 1;

    IF v_source_event_id IS NULL THEN
        RAISE NOTICE 'LR2026 event not found — skipping night-golf seed (likely a non-production DB).';
        RETURN;
    END IF;

    -- ── Idempotency guard ─────────────────────────────────────────────────
    IF EXISTS (SELECT 1 FROM events WHERE event_code = 'LRNIGHT') THEN
        RAISE NOTICE 'LRNIGHT event already exists — skipping seed.';
        RETURN;
    END IF;

    -- ── Event ────────────────────────────────────────────────────────────
    INSERT INTO events (name, status, event_code, created_by_user_id, created_at, updated_at)
    VALUES ('Night Golf 9H', 'live', 'LRNIGHT', v_organizer_id, NOW(), NOW())
    RETURNING id INTO v_event_id;

    INSERT INTO event_members (event_id, user_id, role)
    VALUES (v_event_id, v_organizer_id, 'organizer')
    ON CONFLICT (event_id, user_id) DO UPDATE SET role = 'organizer';

    -- ── Course + 4 tees ──────────────────────────────────────────────────
    INSERT INTO courses (event_id, name, source, created_at)
    VALUES (v_event_id, 'La Romana Par-3 (Night)', 'manual', NOW())
    RETURNING id INTO v_course_id;

    INSERT INTO tees (course_id, name, slope_rating, course_rating, created_at)
    VALUES (v_course_id, 'Blue', 87, 54.6, NOW())
    RETURNING id INTO v_blue_tee_id;

    INSERT INTO tees (course_id, name, slope_rating, course_rating, created_at)
    VALUES (v_course_id, 'White', 86, 53.8, NOW())
    RETURNING id INTO v_white_tee_id;

    INSERT INTO tees (course_id, name, slope_rating, course_rating, created_at)
    VALUES (v_course_id, 'Red', 83, 51.5, NOW())
    RETURNING id INTO v_red_tee_id;

    INSERT INTO tees (course_id, name, slope_rating, course_rating, created_at)
    VALUES (v_course_id, 'Red (W)', 89, 57.0, NOW())
    RETURNING id INTO v_redw_tee_id;

    -- ── Holes — 9 holes par 3, SI 1,3,5,…,17 across holes 1-9 ─────────────
    -- Each tee gets the same hole numbers / pars / stroke indices.
    INSERT INTO holes (tee_id, hole_number, par, stroke_index)
    SELECT t.tee_id, h.hole_num, 3, h.si
    FROM (VALUES
        (v_blue_tee_id),
        (v_white_tee_id),
        (v_red_tee_id),
        (v_redw_tee_id)
    ) AS t(tee_id),
    (VALUES
        (1, 1), (2, 3), (3, 5), (4, 7), (5, 9),
        (6, 11), (7, 13), (8, 15), (9, 17)
    ) AS h(hole_num, si);

    -- ── Round ────────────────────────────────────────────────────────────
    INSERT INTO rounds
        (event_id, round_number, course_id, scheduled_at,
         hcp_singles_pct, hcp_fourball_pct, holes_per_round, state, created_at)
    VALUES
        (v_event_id, 1, v_course_id, '2026-04-30T23:00:00Z',
         0.80, 0.80, 9, 'open', NOW())
    RETURNING id INTO v_round_id;

    -- ── Roster — copy every player row from LR2026 ───────────────────────
    -- Same user accounts → same login works for both events. Default everyone
    -- to the Blue tee; admin can change per player in the UI.
    INSERT INTO players
        (event_id, user_id, first_name, last_name, handicap_index, team, tee_id, created_at)
    SELECT v_event_id, p.user_id, p.first_name, p.last_name,
           p.handicap_index, p.team, v_blue_tee_id, NOW()
    FROM players p
    WHERE p.event_id = v_source_event_id;

    -- ── Event memberships ────────────────────────────────────────────────
    INSERT INTO event_members (event_id, user_id, role)
    SELECT v_event_id, p.user_id, 'player'
    FROM players p
    WHERE p.event_id = v_source_event_id AND p.user_id IS NOT NULL
    ON CONFLICT (event_id, user_id) DO NOTHING;

    RAISE NOTICE 'Night Golf 9H seeded: event_id=%, round_id=%', v_event_id, v_round_id;
END $$;
