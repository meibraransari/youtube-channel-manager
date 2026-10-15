const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');
const bcrypt = require('bcryptjs');

// Determine connection parameters
const connectionString = process.env.DATABASE_URL || 
  `postgresql://${process.env.POSTGRES_USER || 'postgres'}:${process.env.POSTGRES_PASSWORD || 'postgres_secure_pass_123'}@${process.env.POSTGRES_HOST || 'postgres18'}:${process.env.POSTGRES_PORT || 5432}/${process.env.POSTGRES_DB || 'youtube_channel_manager_db'}`;

const pool = new Pool({
  connectionString,
  max: 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 5000,
});

pool.on('error', (err) => {
  console.error('[DB-POOL-ERROR] Unexpected error on idle PostgreSQL client:', err.message);
});

/**
 * Execute query with parameters
 */
async function query(text, params) {
  const start = Date.now();
  try {
    const res = await pool.query(text, params);
    return res;
  } catch (err) {
    err.duration = Date.now() - start;
    err.queryText = text;
    throw err;
  }
}

/**
 * Ensure database tables and initial schema exist.
 * Automatically runs init.sql if tables are missing.
 */
async function initDatabase() {
  let retries = 15;
  while (retries > 0) {
    try {
      // Test connection
      await pool.query('SELECT 1');
      console.log('[DB] Successfully connected to PostgreSQL 18 instance.');

      // Check if content_items table exists
      const tableCheck = await pool.query(`
        SELECT EXISTS (
          SELECT FROM information_schema.tables 
          WHERE table_schema = 'public' 
          AND table_name = 'content_items'
        );
      `);

      if (!tableCheck.rows[0].exists) {
        console.log('[DB] Database schema not found. Executing database/init.sql...');
        const initSqlPath = path.join(__dirname, '../../database/init.sql');
        if (fs.existsSync(initSqlPath)) {
          const initSql = fs.readFileSync(initSqlPath, 'utf8');
          await pool.query(initSql);
          console.log('[DB] database/init.sql executed successfully.');
        } else {
          console.warn('[DB] database/init.sql not found at:', initSqlPath);
        }
      } else {
        console.log('[DB] PostgreSQL schema already initialized.');
      }

      // Auto-migrate channel_subscriptions table if not present
      await pool.query(`
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
        CREATE INDEX IF NOT EXISTS idx_subs_channel_id ON channel_subscriptions(channel_id);
        CREATE INDEX IF NOT EXISTS idx_subs_subscribed_id ON channel_subscriptions(subscribed_channel_id);
        CREATE INDEX IF NOT EXISTS idx_subs_created_at ON channel_subscriptions(created_at DESC);
        CREATE INDEX IF NOT EXISTS idx_subs_title ON channel_subscriptions(subscribed_channel_title);
      `);

      // Auto-migrate tag_presets table (Dedicated Categorized SEO & Creator Tag Presets)
      await pool.query(`
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
      `);

      // Decouple & delete legacy tag_presets row from system_settings
      await pool.query("DELETE FROM system_settings WHERE key = 'tag_presets'");

      // Auto-seed tag_presets if table has 0 rows
      const tagCountCheck = await pool.query('SELECT COUNT(*)::int as count FROM tag_presets');
      if (tagCountCheck.rows[0].count === 0) {
        await pool.query(`
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
        `);
        console.log('[DB] Seeded 10 curated default tag presets into tag_presets table.');
      }

      // Auto-seed default Telemetry Report settings into system_settings if not present
      await pool.query(`
        INSERT INTO system_settings (key, value, category, description)
        VALUES
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
          ('n8n_integration_enabled', 'true', 'n8n', 'Master toggle enabling or disabling external n8n automation webhook triggers')
        ON CONFLICT (key) DO NOTHING;
      `);

      // Auto-migrate image_file and video_file columns on content_items
      await pool.query(`
        ALTER TABLE content_items ADD COLUMN IF NOT EXISTS image_file VARCHAR(500);
        ALTER TABLE content_items ADD COLUMN IF NOT EXISTS video_file VARCHAR(500);
      `);

      // Auto-migrate n8n_workflows table
      await pool.query(`
        CREATE TABLE IF NOT EXISTS n8n_workflows (
            id VARCHAR(100) PRIMARY KEY,
            name VARCHAR(150) NOT NULL UNIQUE,
            description TEXT,
            category VARCHAR(100) NOT NULL DEFAULT 'Automation',
            webhook_url TEXT NOT NULL,
            test_webhook_url TEXT,
            http_method VARCHAR(10) NOT NULL DEFAULT 'POST',
            auth_header_name VARCHAR(100),
            auth_header_value TEXT,
            payload_template JSONB NOT NULL DEFAULT '{}',
            timeout_seconds INT NOT NULL DEFAULT 30,
            is_active BOOLEAN NOT NULL DEFAULT TRUE,
            last_executed_at TIMESTAMPTZ,
            last_execution_status VARCHAR(20) DEFAULT 'idle',
            created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
            created_by UUID REFERENCES users(id) ON DELETE SET NULL,
            updated_by UUID REFERENCES users(id) ON DELETE SET NULL
        );
        CREATE INDEX IF NOT EXISTS idx_n8n_workflows_category ON n8n_workflows(category);
        CREATE INDEX IF NOT EXISTS idx_n8n_workflows_name ON n8n_workflows(name);
        CREATE INDEX IF NOT EXISTS idx_n8n_workflows_is_active ON n8n_workflows(is_active);
        CREATE INDEX IF NOT EXISTS idx_n8n_workflows_created_at ON n8n_workflows(created_at DESC);

        CREATE TABLE IF NOT EXISTS n8n_executions (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            workflow_id VARCHAR(100) NOT NULL REFERENCES n8n_workflows(id) ON DELETE CASCADE,
            workflow_name VARCHAR(150) NOT NULL,
            execution_id VARCHAR(100),
            trigger_source VARCHAR(50) NOT NULL DEFAULT 'manual',
            status VARCHAR(20) NOT NULL DEFAULT 'running',
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
      `);

      // Seed curated default n8n workflows if table has 0 rows
      const wfCountCheck = await pool.query('SELECT COUNT(*)::int as count FROM n8n_workflows');
      if (wfCountCheck.rows[0].count === 0) {
        await pool.query(`
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
        `);
        console.log('[DB] Seeded 4 curated default n8n workflows into n8n_workflows table.');
      }

      // Runtime Migration: Ensure notes table and indexes exist
      await pool.query(`
        CREATE TABLE IF NOT EXISTS notes (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            title VARCHAR(255) NOT NULL,
            topic VARCHAR(150) NOT NULL DEFAULT 'General',
            category VARCHAR(50) NOT NULL DEFAULT 'instruction',
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
      `);

      // Seed curated default studio notes if table has 0 rows
      const notesCountCheck = await pool.query('SELECT COUNT(*)::int as count FROM notes');
      if (notesCountCheck.rows[0].count === 0) {
        await pool.query(`
          INSERT INTO notes (id, title, topic, category, content, tags, color, is_pinned)
          VALUES
            (
                'a1000000-0000-0000-0000-000000000001',
                '🚀 YouTube Shorts Viral Algorithm & Retention Playbook',
                'YouTube Strategy',
                'guideline',
                '# 🚀 YouTube Shorts Viral Algorithm & Retention Playbook\n\n> **Executive Rule of Thumb:** In vertical short-form video (9:16), the first **1.8 seconds** determine 80% of your reach. If the viewer does not commit immediately, the recommendation engine ceases distribution.\n\n---\n\n## ⏱️ The 3-Phase Retention Framework\n\n\`\`\`\nPhase 1: Visual Shock / Paradox (0:00 - 0:02)\n   └── Break expectation, fast zoom, or high-contrast caption.\nPhase 2: High-Velocity Knowledge Delivery (0:02 - 0:45)\n   └── Rapid problem/solution steps. Zero filler phrases like "welcome back".\nPhase 3: The Seamless Infinite Loop (End -> Beginning)\n   └── Connect final sentence seamlessly back into the opening hook.\n\`\`\`\n\n---\n\n## 🎯 Target Benchmarks for Viral Distribution\n\n| Metric | Minimum Baseline | Viral Velocity Tier | Action Directive |\n| :--- | :--- | :--- | :--- |\n| **Viewed vs Swiped Away** | \`> 72%\` | \`> 85%\` | Test tighter opening hooks and motion graphics |\n| **Average Percentage Viewed (APV)** | \`> 100%\` | \`> 135%\` | Script seamless loopback endings |\n| **Audience Engagement Ratio** | \`> 6.5%\` | \`> 12%\` | Pin engaging curiosity questions in top comment |\n\n---\n\n## 📋 Pre-Publishing Checklist\n\n- [x] Video formatted strictly as vertical 9:16 (\`1080x1920\` minimum resolution).\n- [x] Safe zones respected (no critical text covered by like/comment UI overlays).\n- [x] High-contrast dynamic captions enabled with active word highlighting.\n- [x] 3 to 5 hyper-targeted niche tags applied (e.g. \`#DevOps #Docker #PostgreSQL\`).\n- [x] Pinned comment ready with a community discussion trigger.',
                'algorithm, viral, shorts, retention, youtube',
                '#a855f7',
                TRUE
            ),
            (
                'a1000000-0000-0000-0000-000000000002',
                '🐳 Production Docker Compose & PostgreSQL 18 Deployment SOP',
                'DevOps & Cloud',
                'instruction',
                '# 🐳 Production Docker Compose & PostgreSQL 18 Deployment SOP\n\nStandard Operating Procedure for deploying and maintaining containerized PostgreSQL 18 and Node.js microservices in hardened production environments.\n\n---\n\n## 🛡️ Pre-Flight Environment Sanity Checks\n\n1. **Verify Volume Mount Permissions**: Ensure \`./media\` and \`./database\` host directories are properly owned by non-root daemon users.\n2. **Environment Variable Parity**: Audit \`.env\` against \`.env.example\` before triggering container initialization:\n   \`\`\`bash\n   # Validate environment configuration\n   docker compose config --quiet\n   \`\`\`\n\n---\n\n## 🚀 Zero-Downtime Deployment Lifecycle\n\nExecute sequential rolling updates to maintain 99.98% uptime:\n\n\`\`\`bash\n# 1. Pull base runtime layers & build production artifact\ndocker compose build --pull yt-manager\n\n# 2. Verify PostgreSQL container health status\ndocker inspect --format="{{.State.Health.Status}}" postgres18\n\n# 3. Apply schema migrations idempotently\ndocker exec -i postgres18 psql -U postgres -d youtube_channel_manager_db -f /docker-entrypoint-initdb.d/init.sql\n\n# 4. Recreate application container with zero-cache assets\ndocker compose up -d --no-deps yt-manager\n\`\`\`\n\n---\n\n## 🩺 Post-Deployment Observability Checklist\n\n- [ ] Check \`/health\` endpoint reports \`status: "pass"\` and PostgreSQL latency \`< 5ms\`.\n- [ ] Verify Winston logging is capturing at \`INFO\` or \`DEBUG\` level.\n- [ ] Inspect memory consumption: \`docker stats --no-stream\`.\n- [ ] Confirm persistent \`./media\` directory volume mount is writable.',
                'docker, postgres, deployment, sop, devops',
                '#06b6d4',
                TRUE
            ),
            (
                'a1000000-0000-0000-0000-000000000003',
                '🎨 High-CTR Thumbnail Design Directives & Midjourney Prompt Templates',
                'Thumbnails & Graphics',
                'instruction',
                '# 🎨 High-CTR Thumbnail Directives & Prompt Templates\n\n> **Core Philosophy:** A YouTube thumbnail is not an illustration of your video; it is a **billboard advertising an irresistible question**.\n\n---\n\n## 👁️ Visual Hierarchy Rule of Thirds\n\n1. **Primary Focal Point (Left 60%)**: High-emotion human expression, glowing 3D asset, or dramatic contrast element.\n2. **Complementary Text (Right 40%)**: Maximum 3 to 4 punchy words. Never repeat the exact video title.\n3. **Lighting & Contrast**: Deep background (\`#070913\`) with electric cyan (\`#06b6d4\`) and neon amber (\`#f59e0b\`) rim lighting.\n\n---\n\n## 🤖 Curated Midjourney / Flux Prompt Templates\n\n### Prompt Preset 1: Cyber DevOps Architecture\n\`\`\`\nFuturistic server blade glowing with electric cyan neon light, sleek obsidian glass textures, volumetric mist, depth of field, hyper-detailed 3D octane render, cinematic lighting --ar 16:9 --style raw --v 6.0\n\`\`\`\n\n### Prompt Preset 2: Data Stream Velocity\n\`\`\`\nVibrant holographic data streams accelerating through a dark digital tunnel, purple and emerald laser pulses, clean executive tech aesthetic, ultra-sharp focus --ar 16:9 --stylize 250\n\`\`\`\n\n---\n\n## 🛠️ Export Guidelines\n- Format: \`.png\` or high-quality \`.webp\`\n- Native Dimensions: \`1920x1080\` (16:9) or \`1080x1920\` (9:16)\n- File Size Constraint: Under \`2 MB\` for rapid browser pre-fetching.',
                'thumbnails, midjourney, design, ctr, graphics',
                '#10b981',
                FALSE
            ),
            (
                'a1000000-0000-0000-0000-000000000004',
                '🐘 PostgreSQL 18 Indexing, Vacuuming & Performance Directives',
                'Database & Architecture',
                'note',
                '# 🐘 PostgreSQL 18 Indexing & Performance Directives\n\nTechnical notes and query optimization guidelines for high-cardinality YouTube telemetry snapshot tables.\n\n---\n\n## ⚡ Index Strategy for Telemetry Timeseries\n\nFor high-throughput snapshot tables (\`channel_snapshots\` and \`n8n_executions\`):\n\n\`\`\`sql\n-- Composite index for rapid channel telemetry trajectory queries\nCREATE INDEX CONCURRENTLY IF NOT EXISTS idx_snapshots_channel_recorded \nON channel_snapshots (channel_id, recorded_at DESC);\n\n-- Partial index for active workflow executions only\nCREATE INDEX CONCURRENTLY IF NOT EXISTS idx_active_executions \nON n8n_executions (workflow_id, created_at DESC) \nWHERE status = ''running'';\n\`\`\`\n\n---\n\n## 🧹 Autovacuum Hardening for Docker Volumes\n\nAdd to PostgreSQL configuration when snapshot volume exceeds 500k rows:\n\n\`\`\`ini\nautovacuum_vacuum_scale_factor = 0.05\nautovacuum_analyze_scale_factor = 0.02\nautovacuum_vacuum_cost_limit = 2000\n\`\`\`\n\n---\n\n## 📊 Quick Performance Diagnostic Queries\n\n\`\`\`sql\n-- Check connection pool saturation\nSELECT count(*), state FROM pg_stat_activity GROUP BY state;\n\n-- Identify slowest query statements\nSELECT query, calls, total_exec_time, mean_exec_time \nFROM pg_stat_statements \nORDER BY total_exec_time DESC LIMIT 5;\n\`\`\`',
                'postgresql, indexing, optimization, database, sql',
                '#3b82f6',
                FALSE
            ),
            (
                'a1000000-0000-0000-0000-000000000005',
                '✅ Studio Video Release Pre-Flight Verification Checklist',
                'Content Production',
                'checklist',
                '# ✅ Studio Video Release Pre-Flight Verification Checklist\n\nComprehensive quality assurance gate before scheduling or deploying any video, short, or podcast episode.\n\n---\n\n## 🔍 Stage 1: Audio & Visual Fidelity\n- [ ] Audio normalized to \`-14 LUFS\` standard YouTube integrated loudness.\n- [ ] No clipping or digital distortion in vocal track peaks.\n- [ ] Color grading verified in Rec.709 color space across both OLED and LCD displays.\n- [ ] End-screen cards positioned with zero interference with active content.\n\n---\n\n## 🏷️ Stage 2: Metadata & SEO Optimization\n- [ ] Title tested with emotional hook and keyword placed in first 40 characters.\n- [ ] Description includes summary, chapter timestamps, and official repository link.\n- [ ] 500-character tag limit fully populated using curated Studio Tag Presets.\n- [ ] Associated playlist assigned.\n\n---\n\n## 🌐 Stage 3: Community & Multi-Platform Distribution\n- [ ] First comment drafted with discussion question and pinned.\n- [ ] Teaser clip exported for social cross-posting via n8n automation pipeline.\n- [ ] Community tab poll or behind-the-scenes teaser scheduled.\n- [ ] Metrics snapshot captured baseline at \`T+0\`.',
                'checklist, release, quality, production, youtube',
                '#f59e0b',
                FALSE
            )
          ON CONFLICT (id) DO NOTHING;
        `);
        console.log('[DB] Seeded 5 curated default topic notes & instructions into notes table.');
      }

      // Ensure initial Administrator user exists with correct password hash
      const adminUsername = process.env.INITIAL_ADMIN_USERNAME || 'admin';
      const adminPassword = process.env.INITIAL_ADMIN_PASSWORD || 'Admin@2026';
      const adminEmail = process.env.INITIAL_ADMIN_EMAIL || 'admin@ytstudio.local';

      try {
        const adminCheck = await pool.query('SELECT id, password_hash FROM users WHERE username = $1', [adminUsername]);
        if (adminCheck.rows.length === 0) {
          const hash = bcrypt.hashSync(adminPassword, 10);
          await pool.query(`
            INSERT INTO users (username, email, password_hash, role, permissions, is_active)
            VALUES ($1, $2, $3, 'admin', '["can_view_content","can_manage_content","can_manage_users","can_manage_settings","can_view_audit_logs","can_export_data","can_migrate_data"]', TRUE)
          `, [adminUsername, adminEmail, hash]);
          console.log(`[DB] Successfully created initial administrator account: ${adminUsername}`);
        } else {
          const currentHash = adminCheck.rows[0].password_hash;
          // If current password hash does not match configured adminPassword, heal it
          if (!bcrypt.compareSync(adminPassword, currentHash) && (currentHash.includes('LgdonhtRjZz6W8e8hiYTSe9KgPqU1DhUqM9ugJq') || adminCheck.rows[0].id === 'a0000000-0000-0000-0000-000000000001')) {
            const hash = bcrypt.hashSync(adminPassword, 10);
            await pool.query('UPDATE users SET password_hash = $1, is_active = TRUE WHERE username = $2', [hash, adminUsername]);
            console.log(`[DB] Synchronized password hash for default administrator: ${adminUsername}`);
          }
        }
      } catch (userErr) {
        console.warn('[DB] Non-critical warning verifying administrator account:', userErr.message);
      }

      return true;
    } catch (err) {
      retries--;
      console.warn(`[DB] Waiting for PostgreSQL to be ready (${retries} attempts left)... Error:`, err.message);
      if (retries === 0) {
        throw new Error(`Failed to connect to PostgreSQL after multiple attempts: ${err.message}`);
      }
      await new Promise(resolve => setTimeout(resolve, 3000));
    }
  }
}

module.exports = {
  pool,
  query,
  initDatabase
};
