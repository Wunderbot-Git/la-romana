-- Rename player Pilarica → Luca, update HCP to 11, switch tee to Hombres
UPDATE players
  SET first_name = 'Luca',
      handicap_index = 11,
      tee_id = (SELECT t.id FROM tees t JOIN courses c ON c.id = t.course_id
                JOIN events e ON e.id = c.event_id
                WHERE e.event_code = 'PC2026' AND t.name = 'Hombres')
  WHERE first_name = 'Pilarica';

UPDATE users
  SET name = 'Luca', email = 'luca@par00.com'
  WHERE email = 'pilarica@par00.com';
