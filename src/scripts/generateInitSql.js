const fs = require('fs');
const path = require('path');
const { parseMySqlDump } = require('../utils/mysqlToPostgresParser.js');

const rawSqlPath = path.join(__dirname, '../../sql11-10-2026_data.sql');
const initSqlPath = path.join(__dirname, '../../database/init.sql');

const sqlContent = fs.readFileSync(rawSqlPath, 'utf8');
const items = parseMySqlDump(sqlContent);

const adminHash = '$2a$10$LgdonhtRjZz6W8e8hiYTSe9KgPqU1DhUqM9ugJq/ZDqSihU9w2lpC'; // Backuppulse@2026

let initSql = `-- ==============================================================================
-- YouTube Channel Manager - PostgreSQL 18 Production Schema
-- Designed for High Performance, RBAC Security, Audit Logging & Settings Management
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
    role VARCHAR(20) NOT NULL DEFAULT 'viewer', -- 'admin', 'manager', 'editor', 'viewer'
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
-- 4. Content Items Table (Videos, Shorts/Reels, Podcasts)
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS content_items (
    id SERIAL PRIMARY KEY,
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
-- 5. Audit Logs Table (Full Audit Trail for all CRUD actions)
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS audit_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id) ON DELETE SET NULL,
    username VARCHAR(50) NOT NULL,
    action VARCHAR(50) NOT NULL, -- 'CREATE', 'UPDATE', 'DELETE', 'DUPLICATE', 'STATUS_CHANGE', 'SETTINGS_CHANGE', 'MIGRATION', 'LOGIN', 'LOGOUT'
    entity VARCHAR(50) NOT NULL, -- 'video', 'short', 'podcast', 'user', 'setting', 'migration'
    entity_id VARCHAR(100),
    details JSONB,
    ip_address VARCHAR(50),
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- ------------------------------------------------------------------------------
-- 6. Migration History Table
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
-- 7. Server Configs / Health Status Table
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS server_configs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    metric_name VARCHAR(50) NOT NULL,
    metric_value JSONB NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
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
CREATE INDEX IF NOT EXISTS idx_content_created_at ON content_items(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_audit_created_at ON audit_logs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_user_login_created_at ON user_login_logs(created_at DESC);

-- ------------------------------------------------------------------------------
-- Seed Initial Admin User & Team Members
-- ------------------------------------------------------------------------------
INSERT INTO users (id, username, email, password_hash, role, permissions, is_active)
VALUES 
    (
        'a0000000-0000-0000-0000-000000000001',
        'admin',
        'admin@devopsinaction.com',
        '${adminHash}',
        'admin',
        '["can_view_content","can_manage_content","can_manage_users","can_manage_settings","can_view_audit_logs","can_export_data","can_migrate_data"]',
        TRUE
    ),
    (
        'a0000000-0000-0000-0000-000000000002',
        'ibrar',
        'ibrar@devopsinaction.com',
        '${adminHash}',
        'manager',
        '["can_view_content","can_manage_content","can_view_audit_logs","can_export_data"]',
        TRUE
    ),
    (
        'a0000000-0000-0000-0000-000000000003',
        'editor',
        'editor@devopsinaction.com',
        '${adminHash}',
        'editor',
        '["can_view_content","can_manage_content"]',
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
    ('theme_default', '"cyber_dark"', 'appearance', 'Default Futuristic UI Theme (cyber_dark, cyber_light, synthwave, emerald)'),
    ('channel_name', '"DevOps in Action"', 'youtube', 'YouTube Channel Display Name'),
    ('channel_handle', '"@DevOpsinAction"', 'youtube', 'Official YouTube Channel Handle'),
    ('channel_url', '"https://www.youtube.com/@DevOpsinAction"', 'youtube', 'Official YouTube Channel URL'),
    ('author_name', '"Ibrar Ansari"', 'youtube', 'Content Creator & DevOps Lead'),
    ('github_url', '"https://github.com/meibraransari/youtube-channel-manager"', 'general', 'GitHub Project Repository URL'),
    ('auto_audit', 'true', 'security', 'Enable comprehensive audit trail for all user interactions'),
    ('max_tags_length', '500', 'content', 'Maximum allowed character length for tags field')
ON CONFLICT (key) DO NOTHING;

-- ------------------------------------------------------------------------------
-- Seed Converted Content Items from MySQL Reference (sql11-10-2026_data.sql)
-- ------------------------------------------------------------------------------
`;

// Helper to escape SQL single quotes
function sqlQuote(val) {
  if (val === null || val === undefined) return 'NULL';
  return `'${String(val).replace(/'/g, "''")}'`;
}

initSql += `INSERT INTO content_items (
    id, media_uuid, content_type, topic, title, description, image_prompt, tags, image_url, video_url, status, image_present, video_present, views_count, likes_count, comments_count, created_at, uploaded_at
) VALUES\n`;

const itemRows = items.map((it) => {
  return `(${it.legacy_id}, ${sqlQuote(it.media_uuid)}, ${sqlQuote(it.content_type)}, ${sqlQuote(it.topic)}, ${sqlQuote(it.title)}, ${sqlQuote(it.description)}, ${sqlQuote(it.image_prompt)}, ${sqlQuote(it.tags)}, ${sqlQuote(it.image_url)}, ${sqlQuote(it.video_url)}, ${sqlQuote(it.status)}, ${it.image_present ? 'TRUE' : 'FALSE'}, ${it.video_present ? 'TRUE' : 'FALSE'}, ${it.views_count}, ${it.likes_count}, ${it.comments_count}, ${sqlQuote(it.created_at.toISOString())}, ${it.uploaded_at ? sqlQuote(it.uploaded_at.toISOString()) : 'NULL'})`;
});

initSql += itemRows.join(',\n') + '\n';
initSql += `ON CONFLICT (media_uuid) DO NOTHING;\n\n`;

// Reset sequence for SERIAL id
initSql += `-- Reset serial sequence for content_items\n`;
initSql += `SELECT setval('content_items_id_seq', (SELECT MAX(id) FROM content_items));\n\n`;

// Record initial seed in migration_history
initSql += `-- Record Initial Migration\n`;
initSql += `INSERT INTO migration_history (source_type, records_migrated, status, error_message)\n`;
initSql += `VALUES ('mysql_file_reference', ${items.length}, 'success', NULL);\n`;

// Ensure directory exists
const dir = path.dirname(initSqlPath);
if (!fs.existsSync(dir)) {
  fs.mkdirSync(dir, { recursive: true });
}

fs.writeFileSync(initSqlPath, initSql, 'utf8');
console.log(`Generated database/init.sql successfully with ${items.length} records!`);
