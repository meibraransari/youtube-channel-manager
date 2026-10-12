const express = require('express');
const router = express.Router();
const crypto = require('crypto');
const { query } = require('../config/db');
const { authenticateToken, requirePermission } = require('../middleware/auth');
const { recordAudit } = require('../middleware/audit');
const { logger } = require('../config/logger');
const { runSyncNow } = require('../services/cronSync');
const { syncChannelRealData } = require('../services/youtube.service');

/**
 * GET /api/channels
 * List all managed channels with aggregated content count
 */
router.get('/', authenticateToken, async (req, res) => {
  try {
    const channelsRes = await query(`
      SELECT 
        c.*,
        COUNT(ci.id) as real_content_count,
        COALESCE(SUM(ci.views_count), 0) as real_views_count
      FROM channels c
      LEFT JOIN content_items ci ON ci.channel_id = c.id
      GROUP BY c.id
      ORDER BY c.is_default DESC, c.created_at ASC
    `);

    return res.json({ success: true, channels: channelsRes.rows });
  } catch (err) {
    logger.error(`[CHANNELS-LIST-ERROR] ${err.message}`);
    return res.status(500).json({ success: false, error: err.message });
  }
});

/**
 * POST /api/channels
 * Create a new channel to manage
 */
router.post('/', authenticateToken, requirePermission('can_manage_content'), async (req, res) => {
  try {
    const { name, handle, channel_url, author_name, description, subscriber_count = 0 } = req.body;

    if (!name || !name.trim()) {
      return res.status(400).json({ success: false, error: 'Channel name is required' });
    }

    const cleanHandle = handle ? (handle.startsWith('@') ? handle : `@${handle}`) : `@${name.toLowerCase().replace(/[^a-z0-9]/g, '')}`;

    const insertRes = await query(
      `INSERT INTO channels (name, handle, channel_url, author_name, description, subscriber_count)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING *`,
      [
        name.trim(),
        cleanHandle,
        channel_url || `https://www.youtube.com/${cleanHandle}`,
        author_name || req.user.username,
        description || null,
        parseInt(subscriber_count, 10) || 0
      ]
    );

    const newChannel = insertRes.rows[0];
    let channelResult = newChannel;

    // Attempt automatic live YouTube sync to populate real baseline snapshot
    try {
      const syncResult = await syncChannelRealData(newChannel.id, 'channel_provision');
      if (syncResult && syncResult.channel) {
        channelResult = syncResult.channel;
      }
    } catch (syncErr) {
      logger.warn(`[CHANNELS] Initial live sync deferred: ${syncErr.message}`);
      // Record initial manual baseline only if live sync failed to reach YouTube
      await query(
        `INSERT INTO channel_snapshots (channel_id, subscriber_count, total_views, video_count, notes)
         VALUES ($1, $2, 0, 0, 'Initial manual baseline')`,
        [newChannel.id, newChannel.subscriber_count || 0]
      );
    }

    await recordAudit(req, {
      action: 'CREATE',
      entity: 'channel',
      entityId: channelResult.id,
      details: { name: channelResult.name, handle: channelResult.handle }
    });

    return res.status(201).json({ success: true, channel: channelResult });
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message });
  }
});

/**
 * GET /api/channels/:id
 * Retrieve channel details and stats
 */
router.get('/:id', authenticateToken, async (req, res) => {
  try {
    const chRes = await query('SELECT * FROM channels WHERE id = $1', [req.params.id]);
    if (chRes.rows.length === 0) {
      return res.status(404).json({ success: false, error: 'Channel not found' });
    }
    return res.json({ success: true, channel: chRes.rows[0] });
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message });
  }
});

/**
 * PUT /api/channels/:id
 * Update channel metadata
 */
router.put('/:id', authenticateToken, requirePermission('can_manage_content'), async (req, res) => {
  try {
    const { id } = req.params;
    const { name, handle, channel_url, author_name, description, subscriber_count } = req.body;

    const updateRes = await query(
      `UPDATE channels SET
        name = COALESCE($1, name),
        handle = COALESCE($2, handle),
        channel_url = COALESCE($3, channel_url),
        author_name = COALESCE($4, author_name),
        description = COALESCE($5, description),
        subscriber_count = COALESCE($6, subscriber_count),
        updated_at = CURRENT_TIMESTAMP
       WHERE id = $7
       RETURNING *`,
      [
        name ? name.trim() : null,
        handle ? handle.trim() : null,
        channel_url ? channel_url.trim() : null,
        author_name ? author_name.trim() : null,
        description !== undefined ? description : null,
        subscriber_count !== undefined ? parseInt(subscriber_count, 10) : null,
        id
      ]
    );

    if (updateRes.rows.length === 0) {
      return res.status(404).json({ success: false, error: 'Channel not found' });
    }

    const updated = updateRes.rows[0];

    await recordAudit(req, {
      action: 'UPDATE',
      entity: 'channel',
      entityId: id,
      details: { name: updated.name }
    });

    return res.json({ success: true, channel: updated });
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message });
  }
});

/**
 * POST /api/channels/:id/set-default
 * Set this channel as default
 */
router.post('/:id/set-default', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    await query('UPDATE channels SET is_default = FALSE');
    await query('UPDATE channels SET is_default = TRUE WHERE id = $1', [id]);

    return res.json({ success: true, message: 'Default channel set successfully' });
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message });
  }
});

/**
 * GET /api/channels/:id/snapshots
 * Telemetry snapshots for Channel Tracker
 */
router.get('/:id/snapshots', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const { limit = 30 } = req.query;

    const snapshotsRes = await query(
      `SELECT * FROM channel_snapshots 
       WHERE channel_id = $1 
       ORDER BY recorded_at DESC 
       LIMIT $2`,
      [id, parseInt(limit, 10)]
    );

    // Also get top videos for this channel
    const topVideosRes = await query(
      `SELECT id, title, content_type, status, views_count, likes_count, comments_count, created_at, video_url
       FROM content_items 
       WHERE channel_id = $1 
       ORDER BY views_count DESC 
       LIMIT 8`,
      [id]
    );

    // Also get real daily upload activity distribution for heatmap
    const activityRes = await query(
      `SELECT 
         TO_CHAR(COALESCE(uploaded_at, created_at), 'YYYY-MM-DD') as activity_date,
         COUNT(*)::int as count
       FROM content_items
       WHERE channel_id = $1
       GROUP BY activity_date
       ORDER BY activity_date ASC`,
      [id]
    );

    return res.json({
      success: true,
      snapshots: snapshotsRes.rows.reverse(), // chronological order for charts
      topVideos: topVideosRes.rows,
      activityDays: activityRes.rows
    });
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message });
  }
});

/**
 * POST /api/channels/:id/sync
 * Manually trigger synchronization of metrics, views, likes, and subscriber counts
 */
router.post('/:id/sync', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const result = await runSyncNow(id, `operator_${req.user.username}`);
    return res.json(result);
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message });
  }
});

/**
 * DELETE /api/channels/:id
 * Delete a channel and remove its snapshots
 */
router.delete('/:id', authenticateToken, requirePermission('can_manage_content'), async (req, res) => {
  try {
    const { id } = req.params;

    // 1. Fetch channel to delete
    const chRes = await query('SELECT * FROM channels WHERE id = $1', [id]);
    if (chRes.rows.length === 0) {
      return res.status(404).json({ success: false, error: 'Channel not found' });
    }
    const targetChannel = chRes.rows[0];

    // 2. Delete all associated content assets belonging to this channel
    const delItems = await query('DELETE FROM content_items WHERE channel_id = $1', [id]);

    // 3. Delete all channel snapshots
    await query('DELETE FROM channel_snapshots WHERE channel_id = $1', [id]);

    // 4. If target is default, assign default to another channel if one exists
    if (targetChannel.is_default) {
      await query('UPDATE channels SET is_default = TRUE WHERE id = (SELECT id FROM channels WHERE id != $1 LIMIT 1)', [id]);
    }

    // 5. Delete channel record
    await query('DELETE FROM channels WHERE id = $1', [id]);

    // 6. If no channels remain, ensure orphan items are cleaned up
    const countRes = await query('SELECT COUNT(*) as count FROM channels');
    if (parseInt(countRes.rows[0].count, 10) === 0) {
      await query('DELETE FROM content_items WHERE channel_id IS NULL');
      await query("SELECT setval('content_items_id_seq', 1, false)");
    }

    await recordAudit(req, {
      action: 'DELETE',
      entity: 'channel',
      entityId: id,
      details: { 
        name: targetChannel.name, 
        handle: targetChannel.handle,
        assetsDeleted: delItems.rowCount 
      }
    });

    logger.info(`[CHANNELS] Deleted channel "${targetChannel.name}" (ID: ${id}) and ${delItems.rowCount} media assets by ${req.user.username}`);

    return res.json({
      success: true,
      message: `Channel "${targetChannel.name}" and all ${delItems.rowCount} associated media assets deleted successfully.`
    });
  } catch (err) {
    logger.error(`[CHANNEL-DELETE-ERROR] ${err.message}`);
    return res.status(500).json({ success: false, error: err.message });
  }
});

/**
 * POST /api/channels/import-youtube
 * Rapid Channel Onboarding Engine: Ingests an existing channel and imports real video metadata from YouTube
 */
router.post('/import-youtube', authenticateToken, requirePermission('can_manage_content'), async (req, res) => {
  try {
    const { channelUrlOrHandle } = req.body;

    if (!channelUrlOrHandle || !channelUrlOrHandle.trim()) {
      return res.status(400).json({ success: false, error: 'YouTube Channel URL or Handle is required' });
    }

    const input = channelUrlOrHandle.trim();
    logger.info(`[CHANNEL-IMPORT] Starting real YouTube ingestion for "${input}" by ${req.user.username}`);

    const syncResult = await syncChannelRealData(input, `user_import_${req.user.username}`);

    await recordAudit(req, {
      action: 'MIGRATION',
      entity: 'channel_import',
      entityId: syncResult.channel.id,
      details: { 
        channelName: syncResult.channel.name, 
        handle: syncResult.channel.handle,
        subscribers: syncResult.channel.subscriber_count,
        videosIngested: syncResult.insertedCount 
      }
    });

    logger.info(`[CHANNEL-IMPORT] Ingested real channel "${syncResult.channel.name}" (${syncResult.channel.handle}): ${syncResult.channel.subscriber_count} subs, ${syncResult.insertedCount} assets.`);

    return res.status(201).json({
      success: true,
      message: `Real YouTube channel "${syncResult.channel.name}" onboarded successfully! ${syncResult.insertedCount} live video & shorts assets ingested into catalog (${syncResult.channel.subscriber_count} subscribers).`,
      channel: syncResult.channel,
      itemsCount: syncResult.insertedCount
    });
  } catch (err) {
    logger.error(`[CHANNEL-IMPORT-ERROR] ${err.message}`);
    return res.status(500).json({ success: false, error: err.message });
  }
});

module.exports = router;
