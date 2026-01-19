-- OAuth Providers Migration
-- Adds support for Google, GitHub, and other OAuth providers

-- Add OAuth columns to users table
ALTER TABLE users ADD COLUMN IF NOT EXISTS google_id VARCHAR(255) UNIQUE;
ALTER TABLE users ADD COLUMN IF NOT EXISTS github_id VARCHAR(255) UNIQUE;
ALTER TABLE users ADD COLUMN IF NOT EXISTS avatar_url TEXT;
ALTER TABLE users ADD COLUMN IF NOT EXISTS auth_provider VARCHAR(50) DEFAULT 'local';

-- Allow null password_hash for OAuth users
ALTER TABLE users ALTER COLUMN password_hash DROP NOT NULL;

-- Create index for OAuth lookups
CREATE INDEX IF NOT EXISTS idx_users_google_id ON users(google_id) WHERE google_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_users_github_id ON users(github_id) WHERE github_id IS NOT NULL;

-- Add comment
COMMENT ON COLUMN users.auth_provider IS 'Authentication provider: local, google, github';
