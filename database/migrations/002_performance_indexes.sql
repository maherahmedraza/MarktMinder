-- MarktMinder Database Schema Optimization
-- Migration: 002_performance_indexes.sql
-- Date: 2026-01-19
-- Description: Add performance indexes for common query patterns

-- =====================================================
-- ALERTS TABLE INDEXES
-- =====================================================

-- Index for fetching active alerts for a user (very common query)
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_alerts_user_active 
ON alerts(user_id, is_active) 
WHERE is_active = TRUE;

-- Index for checking triggered alerts
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_alerts_triggered
ON alerts(is_triggered, last_triggered_at DESC)
WHERE is_triggered = TRUE;

-- Composite index for alert lookups by product and type
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_alerts_product_type
ON alerts(product_id, alert_type);

-- Index for duplicate alert detection
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_alerts_duplicate_check
ON alerts(user_id, product_id, alert_type, target_price);

-- =====================================================
-- PRODUCTS TABLE INDEXES
-- =====================================================

-- Index for products needing scraping (ordered by priority)
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_products_needs_scrape
ON products(scrape_priority DESC, last_scraped_at ASC NULLS FIRST)
WHERE scrape_error_count < 5;

-- Index for price drop detection
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_products_price_tracking
ON products(current_price, lowest_price);

-- Full-text search index for product titles
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_products_title_search
ON products USING gin(to_tsvector('german', COALESCE(title, '')));

-- =====================================================
-- USER PRODUCTS TABLE INDEXES
-- =====================================================

-- Index for user's favorites
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_user_products_favorites
ON user_products(user_id, is_favorite)
WHERE is_favorite = TRUE;

-- Index for folder grouping
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_user_products_folder
ON user_products(folder_id)
WHERE folder_id IS NOT NULL;

-- =====================================================
-- PRICE HISTORY TABLE INDEXES
-- =====================================================

-- Index for recent price history (last 30 days)
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_price_history_recent
ON price_history(product_id, time DESC)
WHERE time > NOW() - INTERVAL '30 days';

-- Index for price analytics (min/max/avg queries)
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_price_history_analytics
ON price_history(product_id, price, time);

-- =====================================================
-- SUBSCRIPTIONS TABLE INDEXES (if exists)
-- =====================================================

-- Index for active subscriptions lookup
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_subscriptions_user_active
ON subscriptions(user_id, status)
WHERE status = 'active';

-- Index for subscription renewal dates
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_subscriptions_renewal
ON subscriptions(current_period_end)
WHERE status = 'active';

-- =====================================================
-- REFRESH TOKENS TABLE INDEXES
-- =====================================================

-- Index for token cleanup (expired tokens)
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_refresh_tokens_expires
ON refresh_tokens(expires_at)
WHERE revoked = FALSE;

-- Index for user's tokens
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_refresh_tokens_user
ON refresh_tokens(user_id, expires_at DESC)
WHERE revoked = FALSE;

-- =====================================================
-- NOTIFICATION QUEUE TABLE INDEXES (if exists)
-- =====================================================

-- Index for pending notifications
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_notifications_pending
ON notification_queue(status, created_at)
WHERE status = 'pending';

-- =====================================================
-- ANALYZE TABLES
-- =====================================================

-- Update statistics for query planner
ANALYZE users;
ANALYZE products;
ANALYZE alerts;
ANALYZE user_products;
ANALYZE price_history;

-- =====================================================
-- COMMENTS
-- =====================================================

COMMENT ON INDEX idx_alerts_user_active IS 'Optimizes fetching active alerts for dashboard';
COMMENT ON INDEX idx_alerts_duplicate_check IS 'Prevents duplicate alerts with same configuration';
COMMENT ON INDEX idx_products_needs_scrape IS 'Optimizes scraper job queue queries';
COMMENT ON INDEX idx_products_title_search IS 'Full-text search for product discovery';
COMMENT ON INDEX idx_price_history_recent IS 'Optimizes price chart queries for last 30 days';
