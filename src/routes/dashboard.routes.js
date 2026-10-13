const express = require('express');
const router = express.Router();
const { query } = require('../config/db');
const { authenticateToken } = require('../middleware/auth');

/**
 * GET /api/dashboard/stats
 * Telemetry and stats for Channel Dashboard, dynamically filtered by channel_id
 */
router.get('/stats', authenticateToken, async (req, res) => {
  try {
    const { channel_id } = req.query;

    // 1. Fetch Active Channel
    let activeChannel = null;
    if (channel_id && channel_id !== 'all') {
      const chRes = await query('SELECT * FROM channels WHERE id = $1', [channel_id]);
      if (chRes.rows.length > 0) activeChannel = chRes.rows[0];
    }

    if (!activeChannel) {
      // Default channel
      const defaultCh = await query('SELECT * FROM channels ORDER BY is_default DESC, created_at ASC LIMIT 1');
      if (defaultCh.rows.length > 0) activeChannel = defaultCh.rows[0];
    }

    // Determine filter condition for content items
    let whereClause = '';
    const params = [];
    if (activeChannel && channel_id !== 'all') {
      whereClause = 'WHERE channel_id = $1';
      params.push(activeChannel.id);
    } else if (!activeChannel) {
      // Zero channels registered in the system -> return clean 0 items
      whereClause = 'WHERE 1 = 0';
    } else {
      // Consolidated view across all valid registered channels
      whereClause = 'WHERE channel_id IN (SELECT id FROM channels)';
    }

    // 2. Counts by content type
    const typeCountRes = await query(`
      SELECT content_type, COUNT(*) as count 
      FROM content_items 
      ${whereClause}
      GROUP BY content_type
    `, params);

    // 3. Counts by status
    const statusCountRes = await query(`
      SELECT status, COUNT(*) as count 
      FROM content_items 
      ${whereClause}
      GROUP BY status
    `, params);

    // 4. Totals (views, likes, comments, total items)
    const aggregatesRes = await query(`
      SELECT 
        COUNT(*) as total_items,
        COALESCE(SUM(views_count), 0) as total_views,
        COALESCE(SUM(likes_count), 0) as total_likes,
        COALESCE(SUM(comments_count), 0) as total_comments,
        COUNT(*) FILTER (WHERE image_present = TRUE) as total_images,
        COUNT(*) FILTER (WHERE video_present = TRUE) as total_videos
      FROM content_items
      ${whereClause}
    `, params);

    // 5. Monthly timeline distribution
    const timelineRes = await query(`
      SELECT 
        TO_CHAR(created_at, 'YYYY-MM') as month,
        COUNT(*) as count,
        COUNT(*) FILTER (WHERE content_type = 'short') as shorts,
        COUNT(*) FILTER (WHERE content_type = 'video') as videos
      FROM content_items
      ${whereClause}
      GROUP BY TO_CHAR(created_at, 'YYYY-MM')
      ORDER BY month ASC
      LIMIT 12
    `, params);

    // 6. Recent content items
    const recentContentRes = await query(`
      SELECT id, media_uuid, title, topic, content_type, status, video_url, views_count, likes_count, created_at, uploaded_at
      FROM content_items
      ${whereClause}
      ORDER BY created_at DESC
      LIMIT 6
    `, params);

    // 7. Recent 8 audit logs ticker
    const recentAuditRes = await query(`
      SELECT id, username, action, entity, entity_id, created_at, details
      FROM audit_logs
      ORDER BY created_at DESC
      LIMIT 8
    `);

    // 8. General Settings
    const settingsRes = await query(`
      SELECT key, value FROM system_settings 
      WHERE key IN ('github_url')
    `);

    const settingsMap = {};
    settingsRes.rows.forEach(r => {
      settingsMap[r.key] = typeof r.value === 'string' ? r.value.replace(/^"|"$/g, '') : r.value;
    });

    const typeBreakdown = {
      short: 0,
      video: 0,
      podcast: 0
    };
    typeCountRes.rows.forEach(r => {
      typeBreakdown[r.content_type] = parseInt(r.count, 10);
    });

    const statusBreakdown = {
      uploaded: 0,
      pending: 0,
      draft: 0,
      scheduled: 0,
      archived: 0
    };
    statusCountRes.rows.forEach(r => {
      statusBreakdown[r.status] = parseInt(r.count, 10);
    });

    // 9. Activity distribution by calendar date with breakdown & latest titles
    const activityRes = await query(`
      SELECT 
        TO_CHAR(COALESCE(uploaded_at, created_at), 'YYYY-MM-DD') as activity_date,
        COUNT(*)::int as count,
        COUNT(*) FILTER (WHERE content_type = 'short')::int as shorts,
        COUNT(*) FILTER (WHERE content_type = 'video')::int as videos,
        COUNT(*) FILTER (WHERE content_type = 'podcast')::int as podcasts,
        (ARRAY_AGG(title ORDER BY COALESCE(uploaded_at, created_at) DESC))[1] as latest_title
      FROM content_items
      ${whereClause}
      GROUP BY activity_date
      ORDER BY activity_date ASC
    `, params);

    // 10. Most recent published content item
    const lastPublishedRes = await query(`
      SELECT 
        id, 
        title, 
        content_type, 
        status,
        COALESCE(uploaded_at, created_at) as published_at,
        views_count
      FROM content_items
      ${whereClause}
      ORDER BY COALESCE(uploaded_at, created_at) DESC
      LIMIT 1
    `, params);
    const lastPublishedItem = lastPublishedRes.rows[0] || null;

    return res.json({
      success: true,
      channel: activeChannel ? {
        id: activeChannel.id,
        name: activeChannel.name,
        handle: activeChannel.handle,
        url: activeChannel.channel_url,
        author: activeChannel.author_name,
        subscribers: parseInt(activeChannel.subscriber_count, 10),
        totalViews: parseInt(activeChannel.total_views, 10),
        videoCount: parseInt(activeChannel.video_count, 10),
        github: settingsMap.github_url || 'https://github.com/meibraransari/youtube-channel-manager'
      } : null,
      metrics: {
        totalItems: parseInt(aggregatesRes.rows[0].total_items, 10),
        totalViews: parseInt(aggregatesRes.rows[0].total_views, 10),
        totalLikes: parseInt(aggregatesRes.rows[0].total_likes, 10),
        totalComments: parseInt(aggregatesRes.rows[0].total_comments, 10),
        totalImages: parseInt(aggregatesRes.rows[0].total_images, 10),
        totalVideos: parseInt(aggregatesRes.rows[0].total_videos, 10),
        typeBreakdown,
        statusBreakdown
      },
      timeline: timelineRes.rows,
      recentContent: recentContentRes.rows,
      recentActivity: recentAuditRes.rows,
      activityDays: activityRes.rows,
      lastPublished: lastPublishedItem
    });
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message });
  }
});

module.exports = router;
