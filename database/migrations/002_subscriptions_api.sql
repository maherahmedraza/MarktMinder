-- MarktMinder Database Migration: Subscriptions & API Keys
-- Version: 002
-- Description: Adds subscription management and public API infrastructure

-- =============================================
-- SUBSCRIPTIONS TABLE
-- =============================================

CREATE TABLE IF NOT EXISTS subscriptions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    tier VARCHAR(20) NOT NULL DEFAULT 'free' CHECK (tier IN ('free', 'pro', 'power', 'business')),
    status VARCHAR(20) NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'canceled', 'past_due', 'trialing', 'incomplete')),
    stripe_customer_id VARCHAR(255),
    stripe_subscription_id VARCHAR(255),
    current_period_start TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    current_period_end TIMESTAMPTZ NOT NULL DEFAULT NOW() + INTERVAL '100 years',
    cancel_at_period_end BOOLEAN NOT NULL DEFAULT false,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE(user_id)
);

-- Index for Stripe lookups
CREATE INDEX IF NOT EXISTS idx_subscriptions_stripe_customer ON subscriptions(stripe_customer_id);
CREATE INDEX IF NOT EXISTS idx_subscriptions_stripe_subscription ON subscriptions(stripe_subscription_id);
CREATE INDEX IF NOT EXISTS idx_subscriptions_user ON subscriptions(user_id);

-- =============================================
-- API KEYS TABLE (Enhanced)
-- =============================================

-- Add new columns if api_keys table exists (from initial schema)
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'api_keys' AND column_name = 'permissions') THEN
        ALTER TABLE api_keys ADD COLUMN permissions JSONB DEFAULT '["read"]'::jsonb;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'api_keys' AND column_name = 'rate_limit') THEN
        ALTER TABLE api_keys ADD COLUMN rate_limit INTEGER NOT NULL DEFAULT 100;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'api_keys' AND column_name = 'key_prefix') THEN
        ALTER TABLE api_keys ADD COLUMN key_prefix VARCHAR(20);
    END IF;
END
$$;

-- =============================================
-- API USAGE LOGS TABLE
-- =============================================

CREATE TABLE IF NOT EXISTS api_usage_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    api_key_id UUID NOT NULL REFERENCES api_keys(id) ON DELETE CASCADE,
    endpoint VARCHAR(255) NOT NULL,
    response_time_ms INTEGER,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Partition by time for efficient querying (optional for high-volume)
CREATE INDEX IF NOT EXISTS idx_api_usage_key_date ON api_usage_logs(api_key_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_api_usage_date ON api_usage_logs(created_at DESC);

-- =============================================
-- BILLING HISTORY TABLE
-- =============================================

CREATE TABLE IF NOT EXISTS billing_history (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    stripe_invoice_id VARCHAR(255),
    amount_cents INTEGER NOT NULL,
    currency VARCHAR(3) NOT NULL DEFAULT 'EUR',
    status VARCHAR(20) NOT NULL CHECK (status IN ('paid', 'pending', 'failed', 'refunded')),
    description TEXT,
    invoice_url TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_billing_user ON billing_history(user_id, created_at DESC);

-- =============================================
-- PRODUCT CATEGORIES (for AI predictions)
-- =============================================

-- Add category column to products if not exists
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'products' AND column_name = 'category') THEN
        ALTER TABLE products ADD COLUMN category VARCHAR(100);
    END IF;
END
$$;

CREATE INDEX IF NOT EXISTS idx_products_category ON products(category);

-- =============================================
-- TRIGGER: Auto-create free subscription
-- =============================================

CREATE OR REPLACE FUNCTION auto_create_subscription()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO subscriptions (user_id, tier, status)
    VALUES (NEW.id, 'free', 'active')
    ON CONFLICT (user_id) DO NOTHING;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_auto_create_subscription ON users;
CREATE TRIGGER trigger_auto_create_subscription
    AFTER INSERT ON users
    FOR EACH ROW
    EXECUTE FUNCTION auto_create_subscription();

-- =============================================
-- COMMENTS
-- =============================================

COMMENT ON TABLE subscriptions IS 'User subscription status and Stripe integration';
COMMENT ON TABLE api_usage_logs IS 'Tracks API usage for rate limiting and analytics';
COMMENT ON TABLE billing_history IS 'Invoice history for billing transparency';
