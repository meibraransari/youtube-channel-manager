-- ==============================================================================
-- YouTube Channel Manager - PostgreSQL 18 Production Schema
-- Designed for High Performance, RBAC Security, Audit Logging & Settings Management
-- Zero pre-seeded content: Clean initial setup with Single Admin User
-- ==============================================================================

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ------------------------------------------------------------------------------
-- 1. Users Table (RBAC with granular permissions)
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    username VARCHAR(50) UNIQUE NOT NULL,
    email VARCHAR(100) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    role VARCHAR(20) NOT NULL DEFAULT 'editor', -- 'admin', 'manager', 'editor', 'viewer'
    permissions JSONB NOT NULL DEFAULT '["can_view_content"]',
    avatar_url VARCHAR(500),
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- ------------------------------------------------------------------------------
-- 2. User Login Logs (Authentication & Security Tracker)
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS user_login_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id) ON DELETE SET NULL,
    username VARCHAR(50) NOT NULL,
    ip_address VARCHAR(50),
    user_agent TEXT,
    status VARCHAR(20) NOT NULL, -- 'success', 'failed'
    failure_reason TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- ------------------------------------------------------------------------------
-- 3. System Settings Table (Dynamic configuration without server restart)
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS system_settings (
    key VARCHAR(100) PRIMARY KEY,
    value JSONB NOT NULL,
    category VARCHAR(50) NOT NULL DEFAULT 'general',
    description TEXT,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_by UUID REFERENCES users(id) ON DELETE SET NULL
);

-- ------------------------------------------------------------------------------
-- 4. Channels Table (Multi-Channel Management)
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS channels (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(100) NOT NULL,
    handle VARCHAR(100),
    channel_id VARCHAR(100),
    channel_url VARCHAR(500),
    author_name VARCHAR(100),
    description TEXT,
    subscriber_count BIGINT NOT NULL DEFAULT 0,
    video_count INT NOT NULL DEFAULT 0,
    total_views BIGINT NOT NULL DEFAULT 0,
    avatar_url VARCHAR(500),
    is_default BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- ------------------------------------------------------------------------------
-- 5. Content Items Table (Videos, Shorts/Reels, Podcasts)
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS content_items (
    id SERIAL PRIMARY KEY,
    channel_id UUID REFERENCES channels(id) ON DELETE CASCADE,
    media_uuid VARCHAR(100) UNIQUE NOT NULL,
    content_type VARCHAR(20) NOT NULL DEFAULT 'short', -- 'short', 'video', 'podcast'
    topic VARCHAR(1500),
    title VARCHAR(255) NOT NULL,
    description TEXT,
    image_prompt TEXT,
    tags TEXT,
    image_url VARCHAR(1000),
    video_url VARCHAR(1000),
    status VARCHAR(20) NOT NULL DEFAULT 'pending', -- 'pending', 'uploaded', 'draft', 'scheduled', 'archived'
    image_present BOOLEAN NOT NULL DEFAULT FALSE,
    video_present BOOLEAN NOT NULL DEFAULT FALSE,
    views_count BIGINT NOT NULL DEFAULT 0,
    likes_count BIGINT NOT NULL DEFAULT 0,
    comments_count BIGINT NOT NULL DEFAULT 0,
    scheduled_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    uploaded_at TIMESTAMPTZ,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    created_by UUID REFERENCES users(id) ON DELETE SET NULL
);

-- ------------------------------------------------------------------------------
-- 6. Channel Snapshots Table (Growth Tracker & Historical Telemetry)
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS channel_snapshots (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    channel_id UUID NOT NULL REFERENCES channels(id) ON DELETE CASCADE,
    subscriber_count BIGINT NOT NULL DEFAULT 0,
    total_views BIGINT NOT NULL DEFAULT 0,
    video_count INT NOT NULL DEFAULT 0,
    delta_views BIGINT NOT NULL DEFAULT 0,
    delta_subscribers BIGINT NOT NULL DEFAULT 0,
    notes TEXT,
    recorded_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- ------------------------------------------------------------------------------
-- 7. Audit Logs Table (Full Audit Trail for all CRUD actions)
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS audit_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id) ON DELETE SET NULL,
    username VARCHAR(50) NOT NULL,
    action VARCHAR(50) NOT NULL, -- 'CREATE', 'UPDATE', 'DELETE', 'DUPLICATE', 'STATUS_CHANGE', 'SETTINGS_CHANGE', 'MIGRATION', 'LOGIN', 'LOGOUT', 'FLUSH_ALL'
    entity VARCHAR(50) NOT NULL, -- 'video', 'short', 'podcast', 'user', 'setting', 'migration', 'channel', 'system'
    entity_id VARCHAR(100),
    details JSONB,
    ip_address VARCHAR(50),
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- ------------------------------------------------------------------------------
-- 8. Migration History Table
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS migration_history (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    source_type VARCHAR(50) NOT NULL DEFAULT 'mysql',
    records_migrated INT NOT NULL DEFAULT 0,
    status VARCHAR(20) NOT NULL, -- 'success', 'failed', 'partial'
    error_message TEXT,
    migrated_by UUID REFERENCES users(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- ------------------------------------------------------------------------------
-- 9. Server Configs / Health Status Table
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS server_configs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    metric_name VARCHAR(50) NOT NULL,
    metric_value JSONB NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- ------------------------------------------------------------------------------
-- 10. Channel Subscriptions Table (Track Channels Subscribed By Managed Channels)
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS channel_subscriptions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    channel_id UUID NOT NULL REFERENCES channels(id) ON DELETE CASCADE,
    subscribed_channel_id VARCHAR(100) NOT NULL,
    subscribed_channel_title VARCHAR(255) NOT NULL,
    subscribed_channel_handle VARCHAR(150),
    subscribed_channel_url VARCHAR(500),
    subscribed_channel_avatar VARCHAR(1000),
    description TEXT,
    subscriber_count BIGINT DEFAULT 0,
    video_count INT DEFAULT 0,
    category VARCHAR(100) DEFAULT 'DevOps & Cloud',
    subscribed_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT uq_channel_subscribed UNIQUE (channel_id, subscribed_channel_id)
);

-- ------------------------------------------------------------------------------
-- Triggers and Validation Functions
-- ------------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION check_tags_length_func()
RETURNS TRIGGER AS $$
BEGIN
    IF LENGTH(NEW.tags) > 500 THEN
        RAISE EXCEPTION 'Tags exceed 500 characters limit';
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS check_tags_length_insert ON content_items;
CREATE TRIGGER check_tags_length_insert
BEFORE INSERT ON content_items
FOR EACH ROW EXECUTE FUNCTION check_tags_length_func();

DROP TRIGGER IF EXISTS check_tags_length_update ON content_items;
CREATE TRIGGER check_tags_length_update
BEFORE UPDATE ON content_items
FOR EACH ROW EXECUTE FUNCTION check_tags_length_func();

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_content_type ON content_items(content_type);
CREATE INDEX IF NOT EXISTS idx_content_status ON content_items(status);
CREATE INDEX IF NOT EXISTS idx_content_channel_id ON content_items(channel_id);
CREATE INDEX IF NOT EXISTS idx_content_created_at ON content_items(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_audit_created_at ON audit_logs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_user_login_created_at ON user_login_logs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_snapshots_channel_date ON channel_snapshots(channel_id, recorded_at DESC);
CREATE INDEX IF NOT EXISTS idx_subs_channel_id ON channel_subscriptions(channel_id);
CREATE INDEX IF NOT EXISTS idx_subs_subscribed_id ON channel_subscriptions(subscribed_channel_id);
CREATE INDEX IF NOT EXISTS idx_subs_created_at ON channel_subscriptions(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_subs_title ON channel_subscriptions(subscribed_channel_title);

-- ------------------------------------------------------------------------------
-- Seed Initial SINGLE Admin User (admin / Admin@2026)
-- ------------------------------------------------------------------------------
INSERT INTO users (id, username, email, password_hash, role, permissions, is_active)
VALUES 
    (
        'a0000000-0000-0000-0000-000000000001',
        'admin',
        'admin@ytstudio.local',
        '$2a$10$LgdonhtRjZz6W8e8hiYTSe9KgPqU1DhUqM9ugJq/ZDqSihU9w2lpC',
        'admin',
        '["can_view_content","can_manage_content","can_manage_users","can_manage_settings","can_view_audit_logs","can_export_data","can_migrate_data"]',
        TRUE
    )
ON CONFLICT (username) DO NOTHING;

-- ------------------------------------------------------------------------------
-- Seed System Settings
-- ------------------------------------------------------------------------------
INSERT INTO system_settings (key, value, category, description)
VALUES
    ('console_log_level', '"info"', 'logging', 'Active Console & Server Log Level (debug, info, warn, error)'),
    ('swagger_enabled', 'true', 'documentation', 'Toggle Swagger OpenAPI Interactive Documentation (/api/docs)'),
    ('theme_default', '"dark"', 'appearance', 'Default UI Theme (dark, light)'),
    ('channel_name', '""', 'youtube', 'YouTube Channel Display Name'),
    ('channel_handle', '""', 'youtube', 'Official YouTube Channel Handle'),
    ('channel_url', '""', 'youtube', 'Official YouTube Channel URL'),
    ('author_name', '""', 'youtube', 'Content Creator & Lead'),
    ('github_url', '"https://github.com/meibraransari/youtube-channel-manager"', 'general', 'GitHub Project Repository URL'),
    ('auto_audit', 'true', 'security', 'Enable comprehensive audit trail for all user interactions'),
    ('max_tags_length', '500', 'content', 'Maximum allowed character length for tags field'),
    ('cron_sync_enabled', 'true', 'automation', 'Background automated YouTube metrics collection cron job'),
    ('cron_sync_interval_hours', '"6"', 'automation', 'Cadence in hours between metric refresh intervals')
ON CONFLICT (key) DO NOTHING;

-- Reset serial sequence for content_items to clean starting state
SELECT setval('content_items_id_seq', 1, false);
