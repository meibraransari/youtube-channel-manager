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
    image_file VARCHAR(500),
    video_file VARCHAR(500),
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
-- 11. Tag Presets Table (Dedicated Categorized SEO & Creator Tag Presets)
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS tag_presets (
    id VARCHAR(100) PRIMARY KEY,
    name VARCHAR(150) NOT NULL UNIQUE,
    category VARCHAR(100) NOT NULL DEFAULT 'Custom',
    tags TEXT NOT NULL,
    is_system BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    created_by UUID REFERENCES users(id) ON DELETE SET NULL,
    updated_by UUID REFERENCES users(id) ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS idx_tag_presets_category ON tag_presets(category);
CREATE INDEX IF NOT EXISTS idx_tag_presets_name ON tag_presets(name);
CREATE INDEX IF NOT EXISTS idx_tag_presets_created_at ON tag_presets(created_at DESC);

-- ------------------------------------------------------------------------------
-- 12. n8n Workflows Table (Configured n8n Automation Pipelines)
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS n8n_workflows (
    id VARCHAR(100) PRIMARY KEY,
    name VARCHAR(150) NOT NULL UNIQUE,
    description TEXT,
    category VARCHAR(100) NOT NULL DEFAULT 'Automation', -- 'AI & SEO', 'Publishing', 'Social Media', 'Telemetry', 'Alerts', 'General'
    webhook_url TEXT NOT NULL,
    test_webhook_url TEXT,
    http_method VARCHAR(10) NOT NULL DEFAULT 'POST', -- 'POST', 'GET', 'PUT'
    auth_header_name VARCHAR(100),
    auth_header_value TEXT,
    payload_template JSONB NOT NULL DEFAULT '{}',
    timeout_seconds INT NOT NULL DEFAULT 30,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    last_executed_at TIMESTAMPTZ,
    last_execution_status VARCHAR(20) DEFAULT 'idle', -- 'idle', 'success', 'failed', 'running'
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    created_by UUID REFERENCES users(id) ON DELETE SET NULL,
    updated_by UUID REFERENCES users(id) ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS idx_n8n_workflows_category ON n8n_workflows(category);
CREATE INDEX IF NOT EXISTS idx_n8n_workflows_name ON n8n_workflows(name);
CREATE INDEX IF NOT EXISTS idx_n8n_workflows_is_active ON n8n_workflows(is_active);
CREATE INDEX IF NOT EXISTS idx_n8n_workflows_created_at ON n8n_workflows(created_at DESC);

-- ------------------------------------------------------------------------------
-- 13. n8n Executions Table (Workflow Run History & Telemetry Tracker)
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS n8n_executions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    workflow_id VARCHAR(100) NOT NULL REFERENCES n8n_workflows(id) ON DELETE CASCADE,
    workflow_name VARCHAR(150) NOT NULL,
    execution_id VARCHAR(100),
    trigger_source VARCHAR(50) NOT NULL DEFAULT 'manual', -- 'manual', 'webhook', 'cron', 'wizard'
    status VARCHAR(20) NOT NULL DEFAULT 'running', -- 'running', 'success', 'failed'
    http_method VARCHAR(10) NOT NULL DEFAULT 'POST',
    request_url TEXT NOT NULL,
    request_payload JSONB,
    response_payload JSONB,
    status_code INT,
    error_message TEXT,
    duration_ms INT DEFAULT 0,
    triggered_by VARCHAR(100) DEFAULT 'admin',
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    completed_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_n8n_executions_workflow_id ON n8n_executions(workflow_id);
CREATE INDEX IF NOT EXISTS idx_n8n_executions_status ON n8n_executions(status);
CREATE INDEX IF NOT EXISTS idx_n8n_executions_created_at ON n8n_executions(created_at DESC);

-- ------------------------------------------------------------------------------
-- 14. Topic Notes & Instructions Table (Knowledge Base, SOPs & Markdown Vault)
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS notes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title VARCHAR(255) NOT NULL,
    topic VARCHAR(150) NOT NULL DEFAULT 'General',
    category VARCHAR(50) NOT NULL DEFAULT 'instruction', -- 'instruction', 'note', 'script', 'checklist', 'guideline', 'snippet'
    content TEXT NOT NULL DEFAULT '',
    tags TEXT,
    color VARCHAR(30) DEFAULT '#06b6d4',
    is_pinned BOOLEAN NOT NULL DEFAULT FALSE,
    is_archived BOOLEAN NOT NULL DEFAULT FALSE,
    channel_id UUID REFERENCES channels(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    created_by UUID REFERENCES users(id) ON DELETE SET NULL,
    updated_by UUID REFERENCES users(id) ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS idx_notes_topic ON notes(topic);
CREATE INDEX IF NOT EXISTS idx_notes_category ON notes(category);
CREATE INDEX IF NOT EXISTS idx_notes_is_pinned ON notes(is_pinned);
CREATE INDEX IF NOT EXISTS idx_notes_created_at ON notes(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_notes_updated_at ON notes(updated_at DESC);
CREATE INDEX IF NOT EXISTS idx_notes_channel_id ON notes(channel_id);

-- ------------------------------------------------------------------------------
-- Triggers and Validation Functions
-- ------------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION check_tags_length_func()
RETURNS TRIGGER AS $$
DECLARE
    limit_val INT := 500;
    setting_key TEXT;
    setting_val TEXT;
BEGIN
    IF NEW.tags IS NOT NULL AND NEW.tags <> '' THEN
        setting_key := 'char_limit_tags_' || LOWER(COALESCE(NEW.content_type, 'video'));
        SELECT (value #>> '{}') INTO setting_val FROM system_settings WHERE key = setting_key;
        IF setting_val IS NOT NULL AND setting_val ~ '^\d+$' THEN
            limit_val := setting_val::INT;
        ELSE
            SELECT (value #>> '{}') INTO setting_val FROM system_settings WHERE key = 'max_tags_length';
            IF setting_val IS NOT NULL AND setting_val ~ '^\d+$' THEN
                limit_val := setting_val::INT;
            END IF;
        END IF;

        IF LENGTH(NEW.tags) > limit_val THEN
            RAISE EXCEPTION 'Tags exceed % characters limit for %', limit_val, COALESCE(NEW.content_type, 'video');
        END IF;
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
        '$2a$10$FnkdSfWY8YkOgHDdVvP6Puz9Bt9yEIjy9dy1SowIjKkk6aq6OjEEi',
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
    ('char_limit_desc_short', '5000', 'content', 'Maximum character limit for YouTube Shorts / Reels description'),
    ('char_limit_tags_short', '500', 'content', 'Maximum character limit for YouTube Shorts / Reels tags'),
    ('char_limit_desc_video', '5000', 'content', 'Maximum character limit for Long-Form Video description'),
    ('char_limit_tags_video', '500', 'content', 'Maximum character limit for Long-Form Video tags'),
    ('char_limit_desc_podcast', '5000', 'content', 'Maximum character limit for Podcast description'),
    ('char_limit_tags_podcast', '500', 'content', 'Maximum character limit for Podcast tags'),
    ('cron_sync_enabled', 'true', 'automation', 'Background automated YouTube metrics collection cron job'),
    ('cron_sync_interval_hours', '"6"', 'automation', 'Cadence in hours between metric refresh intervals'),
    ('telemetry_report_enabled', 'true', 'telemetry', 'Enable automated daily telemetry email reporting via cron'),
    ('telemetry_report_cron', '"0 8 * * *"', 'telemetry', 'Cron schedule expression for daily telemetry report execution (default: 08:00 AM)'),
    ('telemetry_report_schedule_preset', '"daily-08"', 'telemetry', 'Schedule preset cadence for telemetry email report'),
    ('telemetry_report_recipients', '"admin@ytstudio.local"', 'telemetry', 'Comma-separated email addresses of telemetry digest receivers'),
    ('telemetry_report_metrics', '["subscribers", "views", "content_breakdown", "server_health", "top_videos", "recent_audit", "snapshots_status"]', 'telemetry', 'Selected metrics included in telemetry email digest'),
    ('telemetry_report_template_theme', '"executive_dark"', 'telemetry', 'Design format theme for telemetry email report (executive_dark, modern_light, ops_blueprint, custom)'),
    ('telemetry_report_custom_notes', '"Daily Automated Creator & Infrastructure Intelligence Digest"', 'telemetry', 'Executive brief directives displayed at the top of the telemetry report'),
    ('telemetry_report_custom_template', '""', 'telemetry', 'Custom HTML template override supporting dynamic placeholders'),
    ('telemetry_report_last_sent_at', 'null', 'telemetry', 'Timestamp of last successfully dispatched telemetry email report'),
    ('telemetry_report_last_status', '"idle"', 'telemetry', 'Status of last telemetry email dispatch attempt (idle, success, error)'),
    ('allowed_media_extensions', '".mp4, .png"', 'media', 'Allowed file extensions for video and image media uploads (e.g. .mp4, .png, .jpg, .mov)'),
    ('max_media_upload_size_mb', '100', 'media', 'Maximum allowed media file upload size in Megabytes (MB)'),
    ('n8n_base_url', '"http://localhost:5678"', 'n8n', 'Base endpoint URL of your n8n workflow automation server instance'),
    ('n8n_api_key', '""', 'n8n', 'API key for authenticating with n8n REST endpoints'),
    ('n8n_default_webhook_token', '""', 'n8n', 'Default shared bearer authentication token dispatched to n8n webhook headers'),
    ('n8n_default_timeout_seconds', '30', 'n8n', 'Default timeout threshold in seconds for n8n webhook execution calls'),
    ('n8n_integration_enabled', 'true', 'n8n', 'Master toggle enabling or disabling external n8n automation webhook triggers'),
    ('initial_setup_done', 'false', 'general', 'Indicates whether initial studio onboarding setup has been completed (demo data loaded or production mode chosen)')
ON CONFLICT (key) DO NOTHING;

-- Ensure tag_presets is completely decoupled from system_settings
DELETE FROM system_settings WHERE key = 'tag_presets';

-- Reset serial sequence for content_items to clean starting state
SELECT setval('content_items_id_seq', 1, false);

