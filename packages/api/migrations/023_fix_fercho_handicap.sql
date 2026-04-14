-- Fix Fercho's handicap from 21 to 14 (matches seed-roster.ts)
UPDATE players SET handicap_index = 14, updated_at = NOW()
WHERE first_name = 'Fercho' AND handicap_index != 14;
