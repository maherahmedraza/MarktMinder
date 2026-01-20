-- B2B Tier: White-Label API Analytics
-- Migration: 007_api_analytics.sql

-- API Usage Logs table
CREATE TABLE IF NOT EXISTS api_usage_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    api_key_id UUID NOT NULL REFERENCES api_keys(id) ON DELETE CASCADE,
    endpoint VARCHAR(255) NOT NULL,
    method VARCHAR(10) NOT NULL,
    status_code INTEGER,
    response_time_ms INTEGER,
    ip_address VARCHAR(45),
    user_agent TEXT,
    created_at TIMESTAMP DEFAULT NOW()
);

-- Index for efficient analytics querying
CREATE INDEX IF NOT EXISTS idx_api_logs_key_date ON api_usage_logs(api_key_id, created_at);
CREATE INDEX IF NOT EXISTS idx_api_logs_created_at ON api_usage_logs(created_at);

-- Add rate_limit_window_start to api_keys for simpler rate limiting (optional optimization)
ALTER TABLE api_keys ADD COLUMN IF NOT EXISTS current_window_usage INTEGER DEFAULT 0;
ALTER TABLE api_keys ADD COLUMN IF NOT EXISTS current_window_start TIMESTAMP DEFAULT NOW();
