-- Add name and app_role to users table

ALTER TABLE users 
ADD COLUMN IF NOT EXISTS name VARCHAR(255);

ALTER TABLE users 
ADD COLUMN IF NOT EXISTS app_role VARCHAR(20) DEFAULT 'user' CHECK (app_role IN ('admin', 'user'));

-- Make name required for future rows (we will set a default for existing rows if any)
UPDATE users SET name = 'Existing User' WHERE name IS NULL;
ALTER TABLE users ALTER COLUMN name SET NOT NULL;
