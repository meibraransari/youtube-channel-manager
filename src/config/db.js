const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');

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
