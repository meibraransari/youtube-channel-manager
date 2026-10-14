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
    ('max_media_upload_size_mb', '100', 'media', 'Maximum allowed media file upload size in Megabytes (MB)')
ON CONFLICT (key) DO NOTHING;

-- Ensure tag_presets is completely decoupled from system_settings
DELETE FROM system_settings WHERE key = 'tag_presets';

-- ------------------------------------------------------------------------------
-- Seed Default Curated Tag Presets (Individual Rows per Category)
-- ------------------------------------------------------------------------------
INSERT INTO tag_presets (id, name, category, tags, is_system)
VALUES
    ('preset-postgres', 'PostgreSQL & Database', 'Database', 'postgresql, database, pg18, sql, rdbms, performance, indexing, backend, data modeling', TRUE),
    ('preset-kubernetes', 'Kubernetes & Cloud', 'Cloud & DevOps', 'kubernetes, k8s, containers, devops, cloud, microservices, helm, cluster, cloud native', TRUE),
    ('preset-docker', 'Docker & Microservices', 'DevOps', 'docker, docker compose, microservices, containers, devops, linux, deployment', TRUE),
    ('preset-automation', 'AI & Automation', 'AI & ML', 'ai, machine learning, automation, llm, artificial intelligence, deep learning, workflow', TRUE),
    ('preset-nodejs', 'Node.js & Backend Architecture', 'Development', 'nodejs, javascript, backend, express, rest api, web development, fullstack, software', TRUE),
    ('preset-devops', 'DevOps & CI/CD Pipelines', 'DevOps', 'devops, cicd, github actions, automation, continuous integration, deployment, sre', TRUE),
    ('preset-shorts', 'YouTube Shorts Growth', 'YouTube', 'shorts, youtube shorts, content creator, viral, trending, algorithm, tech tips, coding', TRUE),
    ('preset-system-design', 'System Design & Scalability', 'Architecture', 'system design, software architecture, scalability, high availability, cloud native, distributed systems', TRUE),
    ('preset-security', 'Cybersecurity & RBAC', 'Security', 'security, authentication, jwt, rbac, cybersecurity, infosec, access control, devsecops', TRUE),
    ('preset-frontend', 'Modern Web & UI/UX Design', 'Frontend', 'frontend, ui, ux, responsive design, css, javascript, web design, modern web', TRUE)
ON CONFLICT (id) DO NOTHING;

-- Reset serial sequence for content_items to clean starting state
SELECT setval('content_items_id_seq', 1, false);

