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
          ('n8n_integration_enabled', 'true', 'n8n', 'Master toggle enabling or disabling external n8n automation webhook triggers'),
          ('initial_setup_done', 'false', 'general', 'Indicates whether initial studio onboarding setup has been completed (demo data loaded or production mode chosen)')
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
