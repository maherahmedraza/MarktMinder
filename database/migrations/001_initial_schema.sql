-- MarktMinder Database Schema
-- Migration: 001_initial_schema.sql

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- =====================================================
-- USERS TABLE
-- =====================================================
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255),
    name VARCHAR(255),
    avatar_url TEXT,
    email_verified BOOLEAN DEFAULT FALSE,
    email_verification_token VARCHAR(255),
    password_reset_token VARCHAR(255),
    password_reset_expires TIMESTAMPTZ,
    
    -- OAuth fields
    google_id VARCHAR(255) UNIQUE,
    apple_id VARCHAR(255) UNIQUE,
    
    -- Preferences
    notification_email BOOLEAN DEFAULT TRUE,
    notification_push BOOLEAN DEFAULT TRUE,
    default_currency VARCHAR(3) DEFAULT 'EUR',
    timezone VARCHAR(50) DEFAULT 'Europe/Berlin',
    
    -- Timestamps
    last_login_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_google_id ON users(google_id) WHERE google_id IS NOT NULL;

-- =====================================================
-- PRODUCTS TABLE
-- =====================================================
CREATE TABLE products (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    
    -- Marketplace identification
    marketplace VARCHAR(50) NOT NULL CHECK (marketplace IN ('amazon', 'etsy', 'otto')),
    marketplace_id VARCHAR(255) NOT NULL,  -- ASIN for Amazon, listing ID for Etsy, etc.
    marketplace_region VARCHAR(10),         -- 'de', 'us', 'uk', etc.
    url TEXT NOT NULL,
    
    -- Product details
    title TEXT,
    description TEXT,
    image_url TEXT,
    brand VARCHAR(255),
    category VARCHAR(255),
    
    -- Current pricing
    current_price DECIMAL(12,2),
    currency VARCHAR(3) DEFAULT 'EUR',
    availability VARCHAR(50),  -- 'in_stock', 'out_of_stock', 'limited'
    
    -- Price statistics (updated periodically)
    lowest_price DECIMAL(12,2),
    highest_price DECIMAL(12,2),
    average_price DECIMAL(12,2),
    lowest_price_date TIMESTAMPTZ,
    highest_price_date TIMESTAMPTZ,
    
    -- Scraping metadata
    last_scraped_at TIMESTAMPTZ,
    scrape_frequency_hours INTEGER DEFAULT 24,
    scrape_priority INTEGER DEFAULT 5,  -- 1-10, higher = more frequent
    scrape_error_count INTEGER DEFAULT 0,
    last_scrape_error TEXT,
    
    -- Timestamps
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    
    -- Unique constraint on marketplace + ID + region
    UNIQUE(marketplace, marketplace_id, marketplace_region)
);

CREATE INDEX idx_products_marketplace ON products(marketplace);
CREATE INDEX idx_products_marketplace_id ON products(marketplace_id);
CREATE INDEX idx_products_last_scraped ON products(last_scraped_at);
CREATE INDEX idx_products_scrape_priority ON products(scrape_priority DESC, last_scraped_at ASC);

-- =====================================================
-- PRICE HISTORY TABLE (TimescaleDB Hypertable)
-- =====================================================
CREATE TABLE price_history (
    time TIMESTAMPTZ NOT NULL,
    product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
    
    -- Price data
    price DECIMAL(12,2) NOT NULL,
    currency VARCHAR(3) DEFAULT 'EUR',
    
    -- Additional metadata
    availability VARCHAR(50),
    seller_type VARCHAR(50),  -- 'marketplace', 'third_party_new', 'third_party_used'
    seller_name VARCHAR(255),
    shipping_cost DECIMAL(10,2),
    
    -- Composite primary key
    PRIMARY KEY (time, product_id)
);

-- Convert to TimescaleDB hypertable (run only if TimescaleDB is installed)
-- SELECT create_hypertable('price_history', 'time', if_not_exists => TRUE);

CREATE INDEX idx_price_history_product ON price_history(product_id, time DESC);

-- =====================================================
-- USER PRODUCTS (Tracked products per user)
-- =====================================================
CREATE TABLE user_products (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
    
    -- User-specific data
    custom_name VARCHAR(255),
    notes TEXT,
    folder_id UUID,  -- References watchlist_folders
    
    -- Tracking preferences
    is_favorite BOOLEAN DEFAULT FALSE,
    notify_on_any_change BOOLEAN DEFAULT FALSE,
    
    -- Timestamps
    added_at TIMESTAMPTZ DEFAULT NOW(),
    
    UNIQUE(user_id, product_id)
);

CREATE INDEX idx_user_products_user ON user_products(user_id);
CREATE INDEX idx_user_products_product ON user_products(product_id);

-- =====================================================
-- WATCHLIST FOLDERS
-- =====================================================
CREATE TABLE watchlist_folders (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    color VARCHAR(7),  -- Hex color code
    icon VARCHAR(50),
    sort_order INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    
    UNIQUE(user_id, name)
);

-- Add foreign key to user_products
ALTER TABLE user_products 
ADD CONSTRAINT fk_user_products_folder 
FOREIGN KEY (folder_id) REFERENCES watchlist_folders(id) ON DELETE SET NULL;

-- =====================================================
-- PRICE ALERTS
-- =====================================================
CREATE TABLE alerts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
    
    -- Alert configuration
    alert_type VARCHAR(50) NOT NULL CHECK (alert_type IN (
        'price_below',      -- Notify when price drops below target
        'price_above',      -- Notify when price rises above target
        'price_drop_pct',   -- Notify when price drops by X%
        'price_rise_pct',   -- Notify when price rises by X%
        'any_change',       -- Notify on any price change
        'back_in_stock',    -- Notify when back in stock
        'all_time_low'      -- Notify when reaches all-time low
    )),
    target_price DECIMAL(12,2),
    target_percentage DECIMAL(5,2),
    
    -- Alert status
    is_active BOOLEAN DEFAULT TRUE,
    is_triggered BOOLEAN DEFAULT FALSE,
    trigger_count INTEGER DEFAULT 0,
    last_triggered_at TIMESTAMPTZ,
    last_triggered_price DECIMAL(12,2),
    
    -- Notification preferences
    notify_email BOOLEAN DEFAULT TRUE,
    notify_push BOOLEAN DEFAULT TRUE,
    notify_once BOOLEAN DEFAULT FALSE,  -- If true, deactivate after first trigger
    
    -- Timestamps
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_alerts_user ON alerts(user_id);
CREATE INDEX idx_alerts_product ON alerts(product_id);
CREATE INDEX idx_alerts_active ON alerts(is_active) WHERE is_active = TRUE;

-- =====================================================
-- ALERT HISTORY (Log of triggered alerts)
-- =====================================================
CREATE TABLE alert_history (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    alert_id UUID NOT NULL REFERENCES alerts(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
    
    -- Trigger details
    triggered_at TIMESTAMPTZ DEFAULT NOW(),
    old_price DECIMAL(12,2),
    new_price DECIMAL(12,2),
    
    -- Notification status
    email_sent BOOLEAN DEFAULT FALSE,
    push_sent BOOLEAN DEFAULT FALSE,
    
    -- User action
    clicked BOOLEAN DEFAULT FALSE,
    clicked_at TIMESTAMPTZ
);

CREATE INDEX idx_alert_history_user ON alert_history(user_id, triggered_at DESC);

-- =====================================================
-- REFRESH TOKENS (For JWT refresh token rotation)
-- =====================================================
CREATE TABLE refresh_tokens (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    token_hash VARCHAR(255) NOT NULL,
    device_info TEXT,
    ip_address INET,
    expires_at TIMESTAMPTZ NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    revoked_at TIMESTAMPTZ
);

CREATE INDEX idx_refresh_tokens_user ON refresh_tokens(user_id);
CREATE INDEX idx_refresh_tokens_hash ON refresh_tokens(token_hash);

-- =====================================================
-- API KEYS (For external API access)
-- =====================================================
CREATE TABLE api_keys (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    key_hash VARCHAR(255) NOT NULL,
    key_prefix VARCHAR(10) NOT NULL,  -- First 8 chars for identification
    permissions JSONB DEFAULT '["read"]',
    rate_limit INTEGER DEFAULT 1000,  -- Requests per day
    last_used_at TIMESTAMPTZ,
    expires_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    revoked_at TIMESTAMPTZ
);

CREATE INDEX idx_api_keys_user ON api_keys(user_id);
CREATE INDEX idx_api_keys_prefix ON api_keys(key_prefix);

-- =====================================================
-- UPDATE TRIGGERS
-- =====================================================
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER users_updated_at
    BEFORE UPDATE ON users
    FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER products_updated_at
    BEFORE UPDATE ON products
    FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER alerts_updated_at
    BEFORE UPDATE ON alerts
    FOR EACH ROW EXECUTE FUNCTION update_updated_at();
