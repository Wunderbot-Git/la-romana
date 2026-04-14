-- Clean up duplicate mandatory bets created by the replacement bug
-- For each (flight_id, segment_type, bettor_id) with is_additional=false,
-- keep only the most recent bet and delete older duplicates

DELETE FROM bets
WHERE id IN (
    SELECT id FROM (
        SELECT id,
               ROW_NUMBER() OVER (
                   PARTITION BY flight_id, segment_type, bettor_id
                   ORDER BY created_at DESC
               ) AS rn
        FROM bets
        WHERE is_additional = false
    ) ranked
    WHERE rn > 1
);
