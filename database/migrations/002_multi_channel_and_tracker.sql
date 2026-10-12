-- ==============================================================================
-- Migration: 002_multi_channel_and_tracker.sql
-- Adds Channels Table, Channel Snapshots (Tracker), and Channel Linking
-- ==============================================================================

-- 1. Channels Table (Multi-Channel Management)
CREATE TABLE IF NOT EXISTS channels (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(100) NOT NULL,
    handle VARCHAR(100),
    channel_id VARCHAR(100), -- YouTube external channel ID (e.g. UC...)
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

-- 2. Add channel_id to content_items if not exists
DO $$ 
BEGIN 
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'content_items' AND column_name = 'channel_id'
    ) THEN 
        ALTER TABLE content_items ADD COLUMN channel_id UUID REFERENCES channels(id) ON DELETE SET NULL;
        CREATE INDEX idx_content_channel_id ON content_items(channel_id);
    END IF; 
END $$;

-- 3. Channel Snapshots Table (Channel Growth Tracker & Historical Telemetry)
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

CREATE INDEX IF NOT EXISTS idx_snapshots_channel_date ON channel_snapshots(channel_id, recorded_at DESC);

-- 4. Seed Default Channel if none exists
INSERT INTO channels (id, name, handle, channel_url, author_name, subscriber_count, video_count, total_views, is_default)
VALUES (
    'c0000000-0000-0000-0000-000000000001',
    'Main Studio Channel',
    '@MainStudio',
    'https://www.youtube.com/@MainStudio',
    'Studio Lead',
    12450,
    90,
    582900,
    TRUE
)
ON CONFLICT (id) DO NOTHING;

-- Link existing content items to the default channel if channel_id is NULL
UPDATE content_items SET channel_id = 'c0000000-0000-0000-0000-000000000001' WHERE channel_id IS NULL;

-- 5. Add Initial Tracking Snapshots for the Default Channel
INSERT INTO channel_snapshots (channel_id, subscriber_count, total_views, video_count, delta_views, delta_subscribers, recorded_at)
VALUES 
    ('c0000000-0000-0000-0000-000000000001', 11200, 510000, 80, 0, 0, NOW() - INTERVAL '30 days'),
    ('c0000000-0000-0000-0000-000000000001', 11650, 532000, 84, 22000, 450, NOW() - INTERVAL '20 days'),
    ('c0000000-0000-0000-0000-000000000001', 12100, 560000, 88, 28000, 450, NOW() - INTERVAL '10 days'),
    ('c0000000-0000-0000-0000-000000000001', 12450, 582900, 90, 22900, 350, NOW())
ON CONFLICT DO NOTHING;

-- 6. Add Automated Cron Job Settings to system_settings
INSERT INTO system_settings (key, value, category, description)
VALUES 
    ('cron_sync_enabled', 'true', 'automation', 'Automatically fetch views, likes, and subscribers on a scheduled cron interval'),
    ('cron_sync_interval_hours', '6', 'automation', 'Cron sync schedule interval in hours (1, 6, 12, 24)'),
    ('last_cron_sync_at', 'null', 'automation', 'Timestamp of last automated or manual synchronization run'),
    ('last_cron_sync_status', '"idle"', 'automation', 'Status of the last sync run (idle, running, success, error)'),
    ('youtube_api_key', '""', 'api', 'YouTube Data API v3 Key for automated channel metadata & metric fetching')
ON CONFLICT (key) DO NOTHING;
