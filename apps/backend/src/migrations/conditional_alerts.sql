-- Conditional Alert Engine Tables
-- Run: docker exec -i marktminder-postgres psql -U postgres -d marktminder < backend/src/migrations/conditional_alerts.sql

-- Conditional alerts with multi-condition support
CREATE TABLE IF NOT EXISTS conditional_alerts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    conditions JSONB NOT NULL DEFAULT '[]',
    logic VARCHAR(10) NOT NULL DEFAULT 'AND' CHECK (logic IN ('AND', 'OR')),
    is_active BOOLEAN DEFAULT true,
    notify_via TEXT[] DEFAULT ARRAY['email'],
    cooldown_hours INTEGER DEFAULT 24,
    last_triggered_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_conditional_alerts_user ON conditional_alerts(user_id);
CREATE INDEX IF NOT EXISTS idx_conditional_alerts_product ON conditional_alerts(product_id);
CREATE INDEX IF NOT EXISTS idx_conditional_alerts_active ON conditional_alerts(is_active) WHERE is_active = true;

-- Auto-update timestamp trigger
CREATE OR REPLACE FUNCTION update_conditional_alerts_timestamp()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS update_conditional_alerts_timestamp ON conditional_alerts;
CREATE TRIGGER update_conditional_alerts_timestamp
    BEFORE UPDATE ON conditional_alerts
    FOR EACH ROW
    EXECUTE FUNCTION update_conditional_alerts_timestamp();

-- Alert trigger history for analytics
CREATE TABLE IF NOT EXISTS conditional_alert_history (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    alert_id UUID NOT NULL REFERENCES conditional_alerts(id) ON DELETE CASCADE,
    triggered_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    conditions_snapshot JSONB NOT NULL,
    product_context JSONB NOT NULL,
    notification_sent BOOLEAN DEFAULT false
);

CREATE INDEX IF NOT EXISTS idx_alert_history_alert ON conditional_alert_history(alert_id);
CREATE INDEX IF NOT EXISTS idx_alert_history_time ON conditional_alert_history(triggered_at);
