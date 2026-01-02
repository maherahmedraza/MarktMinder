-- Add role column to users table
ALTER TABLE users ADD COLUMN IF NOT EXISTS role VARCHAR(20) DEFAULT 'user';
CREATE INDEX IF NOT EXISTS idx_users_role ON users(role);

-- Migration tracking (optional, just to be safe if running raw sql)
-- UPDATE users SET role = 'admin' WHERE email = 'admin@marktminder.de';
