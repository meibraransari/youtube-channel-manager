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

-- ------------------------------------------------------------------------------
-- Seed Default Curated n8n Workflows
-- ------------------------------------------------------------------------------
INSERT INTO n8n_workflows (id, name, category, description, webhook_url, payload_template, timeout_seconds, is_active)
VALUES
    (
        'wf-metadata-enricher',
        '🤖 AI Metadata & SEO Description Auto-Enricher',
        'AI & SEO',
        'Sends video titles and raw topics to an n8n AI agent to generate engaging YouTube descriptions, chapter timestamps, and SEO tags.',
        'http://localhost:5678/webhook/yt-metadata-enricher',
        '{"content_type": "short", "title": "Top PostgreSQL 18 Performance Hacks", "topic": "Database Optimization"}',
        30,
        TRUE
    ),
    (
        'wf-social-cross-poster',
        '📢 Social Multi-Platform Cross-Poster',
        'Publishing',
        'Dispatches release metadata for newly published videos across X (Twitter), LinkedIn, Discord, and Telegram communities.',
        'http://localhost:5678/webhook/social-crosspost',
        '{"title": "New Video Live!", "video_url": "https://youtube.com/shorts/sample", "platforms": ["twitter", "linkedin", "discord"]}',
        30,
        TRUE
    ),
    (
        'wf-thumbnail-generator',
        '🎨 Automated Thumbnail Asset Renderer',
        'AI & SEO',
        'Triggers n8n image generation pipeline using Midjourney/DALL-E/Flux nodes to produce 16:9 and 9:16 high-resolution thumbnail graphics.',
        'http://localhost:5678/webhook/generate-thumbnails',
        '{"aspect_ratio": "16:9", "prompt": "Futuristic neon cloud server room with vibrant teal illumination", "resolution": "1920x1080"}',
        45,
        TRUE
    ),
    (
        'wf-weekly-analytics-digest',
        '📊 Weekly Telemetry & Audience Growth Pipeline',
        'Telemetry',
        'Aggregates rolling 7-day velocity metrics and subscriber milestones and exports them directly into Notion / Google Sheets.',
        'http://localhost:5678/webhook/weekly-telemetry-digest',
        '{"range_days": 7, "channel": "all", "notify_slack": true}',
        30,
        TRUE
    )
ON CONFLICT (id) DO NOTHING;

-- ------------------------------------------------------------------------------
-- Seed Default Curated Studio Topic Notes & Instructions
-- ------------------------------------------------------------------------------
INSERT INTO notes (id, title, topic, category, content, tags, color, is_pinned)
VALUES
    (
        'a1000000-0000-0000-0000-000000000001',
        '🚀 YouTube Shorts Viral Algorithm & Retention Playbook',
        'YouTube Strategy',
        'guideline',
        '# 🚀 YouTube Shorts Viral Algorithm & Retention Playbook

> **Executive Rule of Thumb:** In vertical short-form video (9:16), the first **1.8 seconds** determine 80% of your reach. If the viewer does not commit immediately, the recommendation engine ceases distribution.

---

## ⏱️ The 3-Phase Retention Framework

```
Phase 1: Visual Shock / Paradox (0:00 - 0:02)
   └── Break expectation, fast zoom, or high-contrast caption.
Phase 2: High-Velocity Knowledge Delivery (0:02 - 0:45)
   └── Rapid problem/solution steps. Zero filler phrases like "welcome back".
Phase 3: The Seamless Infinite Loop (End -> Beginning)
   └── Connect final sentence seamlessly back into the opening hook.
```

---

## 🎯 Target Benchmarks for Viral Distribution

| Metric | Minimum Baseline | Viral Velocity Tier | Action Directive |
| :--- | :--- | :--- | :--- |
| **Viewed vs Swiped Away** | `> 72%` | `> 85%` | Test tighter opening hooks and motion graphics |
| **Average Percentage Viewed (APV)** | `> 100%` | `> 135%` | Script seamless loopback endings |
| **Audience Engagement Ratio** | `> 6.5%` | `> 12%` | Pin engaging curiosity questions in top comment |

---

## 📋 Pre-Publishing Checklist

- [x] Video formatted strictly as vertical 9:16 (`1080x1920` minimum resolution).
- [x] Safe zones respected (no critical text covered by like/comment UI overlays).
- [x] High-contrast dynamic captions enabled with active word highlighting.
- [x] 3 to 5 hyper-targeted niche tags applied (e.g. `#DevOps #Docker #PostgreSQL`).
- [x] Pinned comment ready with a community discussion trigger.',
        'algorithm, viral, shorts, retention, youtube',
        '#a855f7',
        TRUE
    ),
    (
        'a1000000-0000-0000-0000-000000000002',
        '🐳 Production Docker Compose & PostgreSQL 18 Deployment SOP',
        'DevOps & Cloud',
        'instruction',
        '# 🐳 Production Docker Compose & PostgreSQL 18 Deployment SOP

Standard Operating Procedure for deploying and maintaining containerized PostgreSQL 18 and Node.js microservices in hardened production environments.

---

## 🛡️ Pre-Flight Environment Sanity Checks

1. **Verify Volume Mount Permissions**: Ensure `./media` and `./database` host directories are properly owned by non-root daemon users.
2. **Environment Variable Parity**: Audit `.env` against `.env.example` before triggering container initialization:
   ```bash
   # Validate environment configuration
   docker compose config --quiet
   ```

---

## 🚀 Zero-Downtime Deployment Lifecycle

Execute sequential rolling updates to maintain 99.98% uptime:

```bash
# 1. Pull base runtime layers & build production artifact
docker compose build --pull yt-manager

# 2. Verify PostgreSQL container health status
docker inspect --format="{{.State.Health.Status}}" postgres18

# 3. Apply schema migrations idempotently
docker exec -i postgres18 psql -U postgres -d youtube_channel_manager_db -f /docker-entrypoint-initdb.d/init.sql

# 4. Recreate application container with zero-cache assets
docker compose up -d --no-deps yt-manager
```

---

## 🩺 Post-Deployment Observability Checklist

- [ ] Check `/health` endpoint reports `status: "pass"` and PostgreSQL latency `< 5ms`.
- [ ] Verify Winston logging is capturing at `INFO` or `DEBUG` level.
- [ ] Inspect memory consumption: `docker stats --no-stream`.
- [ ] Confirm persistent `./media` directory volume mount is writable.',
        'docker, postgres, deployment, sop, devops',
        '#06b6d4',
        TRUE
    ),
    (
        'a1000000-0000-0000-0000-000000000003',
        '🎨 High-CTR Thumbnail Design Directives & Midjourney Prompt Templates',
        'Thumbnails & Graphics',
        'instruction',
        '# 🎨 High-CTR Thumbnail Directives & Prompt Templates

> **Core Philosophy:** A YouTube thumbnail is not an illustration of your video; it is a **billboard advertising an irresistible question**.

---

## 👁️ Visual Hierarchy Rule of Thirds

1. **Primary Focal Point (Left 60%)**: High-emotion human expression, glowing 3D asset, or dramatic contrast element.
2. **Complementary Text (Right 40%)**: Maximum 3 to 4 punchy words. Never repeat the exact video title.
3. **Lighting & Contrast**: Deep background (`#070913`) with electric cyan (`#06b6d4`) and neon amber (`#f59e0b`) rim lighting.

---

## 🤖 Curated Midjourney / Flux Prompt Templates

### Prompt Preset 1: Cyber DevOps Architecture
```
Futuristic server blade glowing with electric cyan neon light, sleek obsidian glass textures, volumetric mist, depth of field, hyper-detailed 3D octane render, cinematic lighting --ar 16:9 --style raw --v 6.0
```

### Prompt Preset 2: Data Stream Velocity
```
Vibrant holographic data streams accelerating through a dark digital tunnel, purple and emerald laser pulses, clean executive tech aesthetic, ultra-sharp focus --ar 16:9 --stylize 250
```

---

## 🛠️ Export Guidelines
- Format: `.png` or high-quality `.webp`
- Native Dimensions: `1920x1080` (16:9) or `1080x1920` (9:16)
- File Size Constraint: Under `2 MB` for rapid browser pre-fetching.',
        'thumbnails, midjourney, design, ctr, graphics',
        '#10b981',
        FALSE
    ),
    (
        'a1000000-0000-0000-0000-000000000004',
        '🐘 PostgreSQL 18 Indexing, Vacuuming & Performance Directives',
        'Database & Architecture',
        'note',
        '# 🐘 PostgreSQL 18 Indexing & Performance Directives

Technical notes and query optimization guidelines for high-cardinality YouTube telemetry snapshot tables.

---

## ⚡ Index Strategy for Telemetry Timeseries

For high-throughput snapshot tables (`channel_snapshots` and `n8n_executions`):

```sql
-- Composite index for rapid channel telemetry trajectory queries
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_snapshots_channel_recorded 
ON channel_snapshots (channel_id, recorded_at DESC);

-- Partial index for active workflow executions only
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_active_executions 
ON n8n_executions (workflow_id, created_at DESC) 
WHERE status = ''running'';
```

---

## 🧹 Autovacuum Hardening for Docker Volumes

Add to PostgreSQL configuration when snapshot volume exceeds 500k rows:

```ini
autovacuum_vacuum_scale_factor = 0.05
autovacuum_analyze_scale_factor = 0.02
autovacuum_vacuum_cost_limit = 2000
```

---

## 📊 Quick Performance Diagnostic Queries

```sql
-- Check connection pool saturation
SELECT count(*), state FROM pg_stat_activity GROUP BY state;

-- Identify slowest query statements
SELECT query, calls, total_exec_time, mean_exec_time 
FROM pg_stat_statements 
ORDER BY total_exec_time DESC LIMIT 5;
```',
        'postgresql, indexing, optimization, database, sql',
        '#3b82f6',
        FALSE
    ),
    (
        'a1000000-0000-0000-0000-000000000005',
        '✅ Studio Video Release Pre-Flight Verification Checklist',
        'Content Production',
        'checklist',
        '# ✅ Studio Video Release Pre-Flight Verification Checklist

Comprehensive quality assurance gate before scheduling or deploying any video, short, or podcast episode.

---

## 🔍 Stage 1: Audio & Visual Fidelity
- [ ] Audio normalized to `-14 LUFS` standard YouTube integrated loudness.
- [ ] No clipping or digital distortion in vocal track peaks.
- [ ] Color grading verified in Rec.709 color space across both OLED and LCD displays.
- [ ] End-screen cards positioned with zero interference with active content.

---

## 🏷️ Stage 2: Metadata & SEO Optimization
- [ ] Title tested with emotional hook and keyword placed in first 40 characters.
- [ ] Description includes summary, chapter timestamps, and official repository link.
- [ ] 500-character tag limit fully populated using curated Studio Tag Presets.
- [ ] Associated playlist assigned.

---

## 🌐 Stage 3: Community & Multi-Platform Distribution
- [ ] First comment drafted with discussion question and pinned.
- [ ] Teaser clip exported for social cross-posting via n8n automation pipeline.
- [ ] Community tab poll or behind-the-scenes teaser scheduled.
- [ ] Metrics snapshot captured baseline at `T+0`.',
        'checklist, release, quality, production, youtube',
        '#f59e0b',
        FALSE
    )
ON CONFLICT (id) DO NOTHING;

-- Reset serial sequence for content_items to clean starting state
SELECT setval('content_items_id_seq', 1, false);

