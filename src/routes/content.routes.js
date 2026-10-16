const express = require('express');
const router = express.Router();
const crypto = require('crypto');
const fs = require('fs');
const path = require('path');
const { query } = require('../config/db');
const { authenticateToken, requirePermission } = require('../middleware/auth');
const { recordAudit } = require('../middleware/audit');
const { logger } = require('../config/logger');
const { fetchYouTubeVideoDetails, extractVideoId } = require('../services/youtube.service');
const { handleMediaUpload, finalizeUploadedFile, mediaDir } = require('../middleware/upload');

/**
 * GET /api/content
 * Retrieve list of content items with filtering, search, pagination
 */
router.get('/', authenticateToken, requirePermission('can_view_content'), async (req, res) => {
  try {
    const {
      channel_id,
      type, // 'video', 'short', 'podcast', or 'all'
      status, // 'uploaded', 'pending', 'draft', 'scheduled', or 'all'
      search,
      page = 1,
      limit = 20,
      sortBy = 'created_at',
      sortDir = 'DESC'
    } = req.query;

    const conditions = [];
    const params = [];
    let paramIndex = 1;

    if (channel_id && channel_id !== 'all') {
      conditions.push(`channel_id = $${paramIndex++}`);
      params.push(channel_id);
    } else {
      const chCount = await query('SELECT COUNT(*) as count FROM channels');
      if (parseInt(chCount.rows[0].count, 10) === 0) {
        conditions.push('1 = 0');
      } else {
        conditions.push('channel_id IN (SELECT id FROM channels)');
      }
    }

    if (type && type !== 'all') {
      conditions.push(`content_type = $${paramIndex++}`);
      params.push(type);
    }

    if (status && status !== 'all') {
      conditions.push(`status = $${paramIndex++}`);
      params.push(status);
    }

    if (search && search.trim()) {
      conditions.push(`(title ILIKE $${paramIndex} OR topic ILIKE $${paramIndex} OR tags ILIKE $${paramIndex} OR description ILIKE $${paramIndex})`);
      params.push(`%${search.trim()}%`);
      paramIndex++;
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

    // Count query
    const countRes = await query(`SELECT COUNT(*) FROM content_items ${whereClause}`, params);
    const total = parseInt(countRes.rows[0].count, 10);

    // Validate sort
    const validSortCols = ['id', 'created_at', 'uploaded_at', 'title', 'views_count', 'status'];
    const safeSortBy = validSortCols.includes(sortBy) ? sortBy : 'created_at';
    const safeSortDir = sortDir.toUpperCase() === 'ASC' ? 'ASC' : 'DESC';

    const offset = (Math.max(1, parseInt(page, 10)) - 1) * parseInt(limit, 10);
    params.push(parseInt(limit, 10));
    params.push(offset);

    const listQuery = `
      SELECT * FROM content_items
      ${whereClause}
      ORDER BY ${safeSortBy} ${safeSortDir}
      LIMIT $${paramIndex++} OFFSET $${paramIndex++}
    `;

    const itemsRes = await query(listQuery, params);

    return res.json({
      success: true,
      data: itemsRes.rows,
      pagination: {
        total,
        page: parseInt(page, 10),
        limit: parseInt(limit, 10),
        totalPages: Math.ceil(total / parseInt(limit, 10))
      }
    });
  } catch (err) {
    logger.error(`[CONTENT-LIST-ERROR] ${err.message}`);
    return res.status(500).json({ success: false, error: err.message });
  }
});

/**
 * GET /api/content/:id
 * Retrieve a single content item
 */
router.get('/:id', authenticateToken, requirePermission('can_view_content'), async (req, res) => {
  try {
    const itemRes = await query('SELECT * FROM content_items WHERE id = $1', [req.params.id]);
    if (itemRes.rows.length === 0) {
      return res.status(404).json({ success: false, error: 'Content item not found' });
    }
    return res.json({ success: true, data: itemRes.rows[0] });
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message });
  }
});

/**
 * POST /api/content/fetch-meta
 * On-demand scrape of video metadata (title, full description, keywords/tags) from YouTube
 */
router.post('/fetch-meta', authenticateToken, requirePermission('can_view_content'), async (req, res) => {
  try {
    const { video_url, videoId } = req.body;
    const target = video_url || videoId;
    if (!target) {
      return res.status(400).json({ success: false, error: 'video_url or videoId is required' });
    }

    const details = await fetchYouTubeVideoDetails(target);
    return res.json({
      success: true,
      data: details
    });
  } catch (err) {
    logger.error(`[FETCH-YT-META-ERROR] ${err.message}`);
    return res.status(500).json({ success: false, error: err.message });
  }
});

/**
 * POST /api/content/:id/sync-youtube
 * Re-sync a specific content item with YouTube live metadata
 */
router.post('/:id/sync-youtube', authenticateToken, requirePermission('can_manage_content'), async (req, res) => {
  try {
    const { id } = req.params;
    const itemRes = await query('SELECT * FROM content_items WHERE id = $1', [id]);
    if (itemRes.rows.length === 0) {
      return res.status(404).json({ success: false, error: 'Content item not found' });
    }

    const item = itemRes.rows[0];
    const target = item.video_url || item.media_uuid;
    if (!target) {
      return res.status(400).json({ success: false, error: 'No YouTube URL or ID associated with this item' });
    }

    const details = await fetchYouTubeVideoDetails(target);
    const updateRes = await query(
      `UPDATE content_items SET
        title = COALESCE(NULLIF($1, ''), title),
        description = COALESCE(NULLIF($2, ''), description),
        tags = COALESCE(NULLIF($3, ''), tags),
        views_count = CASE WHEN $4 > 0 THEN $4 ELSE views_count END,
        updated_at = CURRENT_TIMESTAMP
       WHERE id = $5
       RETURNING *`,
      [details.title, details.description, details.tags, details.views, id]
    );

    return res.json({
      success: true,
      data: updateRes.rows[0]
    });
  } catch (err) {
    logger.error(`[SYNC-YT-ITEM-ERROR] ${err.message}`);
    return res.status(500).json({ success: false, error: err.message });
  }
});

/**
 * Helper to fetch dynamic character limits for a specific content_type from system_settings
 */
async function getContentLimits(contentType) {
  const type = (contentType || 'video').toLowerCase();
  const descKey = `char_limit_desc_${type}`;
  const tagsKey = `char_limit_tags_${type}`;

  try {
    const res = await query(
      "SELECT key, value FROM system_settings WHERE key IN ($1, $2, 'max_tags_length')",
      [descKey, tagsKey]
    );

    let maxDesc = 5000;
    let maxTags = 500;

    for (const row of res.rows) {
      let val = row.value;
      if (typeof val === 'string') {
        val = val.replace(/^"|"$/g, '');
      }
      const num = parseInt(val, 10);
      if (!isNaN(num) && num > 0) {
        if (row.key === descKey) maxDesc = num;
        else if (row.key === tagsKey) maxTags = num;
        else if (row.key === 'max_tags_length' && maxTags === 500) maxTags = num;
      }
    }
    return { maxDesc, maxTags };
  } catch (err) {
    logger.warn(`[CONTENT-LIMITS] Failed to fetch dynamic limits: ${err.message}. Using defaults.`);
    return { maxDesc: 5000, maxTags: 500 };
  }
}

/**
 * POST /api/content
 * Create new content item (used by Content Creator Wizard & Media Ingestion)
 */
router.post('/', authenticateToken, requirePermission('can_manage_content'), handleMediaUpload, async (req, res) => {
  try {
    const {
      channel_id,
      topic,
      title,
      description,
      content_type = 'short',
      image_prompt,
      tags = '',
      image_url,
      video_url,
      status = 'pending',
      image_present = false,
      video_present = false,
      scheduled_at
    } = req.body;

    if (!title || !title.trim()) {
      return res.status(400).json({ success: false, error: 'Title is required' });
    }

    // Determine channel_id
    let targetChannelId = channel_id;
    if (!targetChannelId) {
      const defaultCh = await query('SELECT id FROM channels ORDER BY is_default DESC, created_at ASC LIMIT 1');
      if (defaultCh.rows.length > 0) targetChannelId = defaultCh.rows[0].id;
    }

    // Dynamically validate tags and description lengths from system_settings
    const { maxDesc, maxTags } = await getContentLimits(content_type);

    if (tags && tags.length > maxTags) {
      return res.status(400).json({ 
        success: false, 
        error: `Tags length (${tags.length}) exceeds allowed limit of ${maxTags} characters for ${(content_type || 'content').toUpperCase()}` 
      });
    }

    if (description && description.length > maxDesc) {
      return res.status(400).json({ 
        success: false, 
        error: `Description length (${description.length}) exceeds allowed limit of ${maxDesc} characters for ${(content_type || 'content').toUpperCase()}` 
      });
    }

    const mediaUuid = req.body.media_uuid || crypto.randomUUID();
    const uploadedAt = status === 'uploaded' ? new Date() : null;

    let finalImageUrl = image_url || null;
    let finalVideoUrl = video_url || null;
    let finalImageFile = null;
    let finalVideoFile = null;
    let hasImage = image_present === true || image_present === 'true';
    let hasVideo = video_present === true || video_present === 'true';

    // Process uploaded image file if present (image_file or image)
    const uploadedImg = req.files && (
      (req.files.image_file && req.files.image_file[0]) ||
      (req.files.image && req.files.image[0])
    );
    if (uploadedImg) {
      const imgRes = finalizeUploadedFile(uploadedImg, mediaUuid);
      if (imgRes) {
        hasImage = true;
        finalImageFile = imgRes.urlPath;
        if (!finalImageUrl) finalImageUrl = imgRes.urlPath;
      }
    }

    // Process uploaded video file if present (video_file or video)
    const uploadedVid = req.files && (
      (req.files.video_file && req.files.video_file[0]) ||
      (req.files.video && req.files.video[0])
    );
    if (uploadedVid) {
      const vidRes = finalizeUploadedFile(uploadedVid, mediaUuid);
      if (vidRes) {
        hasVideo = true;
        finalVideoFile = vidRes.urlPath;
        if (!finalVideoUrl) finalVideoUrl = vidRes.urlPath;
      }
    }

    const insertRes = await query(
      `INSERT INTO content_items (
        media_uuid, channel_id, content_type, topic, title, description, image_prompt,
        tags, image_url, video_url, status, image_present, video_present,
        image_file, video_file,
        scheduled_at, uploaded_at, created_by
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18)
      RETURNING *`,
      [
        mediaUuid,
        targetChannelId || null,
        content_type,
        topic || null,
        title.trim(),
        description || null,
        image_prompt || null,
        tags || null,
        finalImageUrl,
        finalVideoUrl,
        status,
        Boolean(hasImage),
        Boolean(hasVideo),
        finalImageFile,
        finalVideoFile,
        scheduled_at ? new Date(scheduled_at) : null,
        uploadedAt,
        req.user.id
      ]
    );

    const newItem = insertRes.rows[0];

    // Audit log
    await recordAudit(req, {
      action: 'CREATE',
      entity: content_type,
      entityId: newItem.id,
      details: { 
        title: newItem.title, 
        media_uuid: newItem.media_uuid, 
        status: newItem.status,
        image_present: newItem.image_present,
        video_present: newItem.video_present,
        image_file: newItem.image_file,
        video_file: newItem.video_file
      }
    });

    logger.info(`[CONTENT] Created new ${content_type}: "${newItem.title}" (ID: ${newItem.id}, Image: ${newItem.image_present}, Video: ${newItem.video_present})`);
    return res.status(201).json({ success: true, data: newItem });
  } catch (err) {
    logger.error(`[CONTENT-CREATE-ERROR] ${err.message}`);
    return res.status(500).json({ success: false, error: err.message });
  }
});

/**
 * PUT /api/content/:id
 * Full edit of a content item with media override support
 */
router.put('/:id', authenticateToken, requirePermission('can_manage_content'), handleMediaUpload, async (req, res) => {
  try {
    const { id } = req.params;
    const {
      topic,
      title,
      description,
      content_type,
      image_prompt,
      tags,
      image_url,
      video_url,
      status,
      image_present,
      video_present,
      scheduled_at,
      uploaded_at
    } = req.body;

    if (!title || !title.trim()) {
      return res.status(400).json({ success: false, error: 'Title is required' });
    }

    // Check item exists
    const checkRes = await query('SELECT * FROM content_items WHERE id = $1', [id]);
    if (checkRes.rows.length === 0) {
      return res.status(404).json({ success: false, error: 'Content item not found' });
    }

    const prevItem = checkRes.rows[0];
    const targetType = content_type || prevItem.content_type || 'short';
    const { maxDesc, maxTags } = await getContentLimits(targetType);

    if (tags && tags.length > maxTags) {
      return res.status(400).json({ 
        success: false, 
        error: `Tags length (${tags.length}) exceeds allowed limit of ${maxTags} characters for ${targetType.toUpperCase()}` 
      });
    }

    if (description && description.length > maxDesc) {
      return res.status(400).json({ 
        success: false, 
        error: `Description length (${description.length}) exceeds allowed limit of ${maxDesc} characters for ${targetType.toUpperCase()}` 
      });
    }

    const mediaUuid = prevItem.media_uuid;

    let finalUploadedAt = uploaded_at ? new Date(uploaded_at) : prevItem.uploaded_at;
    if (status === 'uploaded' && !finalUploadedAt) {
      finalUploadedAt = new Date();
    }

    let finalImageUrl = image_url !== undefined ? image_url : prevItem.image_url;
    let finalVideoUrl = video_url !== undefined ? video_url : prevItem.video_url;
    let finalImageFile = prevItem.image_file;
    let finalVideoFile = prevItem.video_file;
    let hasImage = image_present !== undefined ? (image_present === true || image_present === 'true') : prevItem.image_present;
    let hasVideo = video_present !== undefined ? (video_present === true || video_present === 'true') : prevItem.video_present;

    // Process override image upload (image_file or image)
    const overrideImg = req.files && (
      (req.files.image_file && req.files.image_file[0]) ||
      (req.files.image && req.files.image[0])
    );
    if (overrideImg) {
      const imgRes = finalizeUploadedFile(overrideImg, mediaUuid);
      if (imgRes) {
        hasImage = true;
        finalImageFile = imgRes.urlPath;
        if (!finalImageUrl || finalImageUrl.startsWith('/media/')) {
          finalImageUrl = imgRes.urlPath;
        }
      }
    }

    // Process override video upload (video_file or video)
    const overrideVid = req.files && (
      (req.files.video_file && req.files.video_file[0]) ||
      (req.files.video && req.files.video[0])
    );
    if (overrideVid) {
      const vidRes = finalizeUploadedFile(overrideVid, mediaUuid);
      if (vidRes) {
        hasVideo = true;
        finalVideoFile = vidRes.urlPath;
        if (!finalVideoUrl || finalVideoUrl.startsWith('/media/')) {
          finalVideoUrl = vidRes.urlPath;
        }
      }
    }

    const updateRes = await query(
      `UPDATE content_items SET
        topic = $1,
        title = $2,
        description = $3,
        content_type = $4,
        image_prompt = $5,
        tags = $6,
        image_url = $7,
        video_url = $8,
        status = $9,
        image_present = $10,
        video_present = $11,
        image_file = $12,
        video_file = $13,
        scheduled_at = $14,
        uploaded_at = $15,
        updated_at = CURRENT_TIMESTAMP
      WHERE id = $16
      RETURNING *`,
      [
        topic || null,
        title.trim(),
        description || null,
        content_type || prevItem.content_type,
        image_prompt || null,
        tags || null,
        finalImageUrl,
        finalVideoUrl,
        status || prevItem.status,
        Boolean(hasImage),
        Boolean(hasVideo),
        finalImageFile,
        finalVideoFile,
        scheduled_at ? new Date(scheduled_at) : prevItem.scheduled_at,
        finalUploadedAt,
        id
      ]
    );

    const updatedItem = updateRes.rows[0];

    // Audit log
    await recordAudit(req, {
      action: 'UPDATE',
      entity: updatedItem.content_type,
      entityId: id,
      details: { 
        title: updatedItem.title, 
        image_present: updatedItem.image_present,
        video_present: updatedItem.video_present,
        image_file: updatedItem.image_file,
        video_file: updatedItem.video_file,
        changes: req.body 
      }
    });

    return res.json({ success: true, data: updatedItem });
  } catch (err) {
    logger.error(`[CONTENT-UPDATE-ERROR] ${err.message}`);
    return res.status(500).json({ success: false, error: err.message });
  }
});

/**
 * PATCH /api/content/:id/rename
 * Quick rename title and topic
 */
router.patch('/:id/rename', authenticateToken, requirePermission('can_manage_content'), async (req, res) => {
  try {
    const { id } = req.params;
    const { title, topic } = req.body;

    if (!title || !title.trim()) {
      return res.status(400).json({ success: false, error: 'New title is required' });
    }

    const updateRes = await query(
      `UPDATE content_items SET
        title = $1,
        topic = COALESCE($2, topic),
        updated_at = CURRENT_TIMESTAMP
       WHERE id = $3
       RETURNING *`,
      [title.trim(), topic ? topic.trim() : null, id]
    );

    if (updateRes.rows.length === 0) {
      return res.status(404).json({ success: false, error: 'Content item not found' });
    }

    const renamed = updateRes.rows[0];

    await recordAudit(req, {
      action: 'RENAME',
      entity: renamed.content_type,
      entityId: id,
      details: { newTitle: renamed.title }
    });

    return res.json({ success: true, data: renamed });
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message });
  }
});

/**
 * PATCH /api/content/:id/status
 * Quick status change (pending, uploaded, draft, scheduled, archived)
 */
router.patch('/:id/status', authenticateToken, requirePermission('can_manage_content'), async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    const validStatuses = ['pending', 'uploaded', 'draft', 'scheduled', 'archived'];
    if (!validStatuses.includes(status)) {
      return res.status(400).json({ success: false, error: `Invalid status. Must be one of: [${validStatuses.join(', ')}]` });
    }

    let uploadedAtClause = '';
    if (status === 'uploaded') {
      uploadedAtClause = ', uploaded_at = COALESCE(uploaded_at, CURRENT_TIMESTAMP)';
    }

    const updateRes = await query(
      `UPDATE content_items SET
        status = $1,
        updated_at = CURRENT_TIMESTAMP
        ${uploadedAtClause}
       WHERE id = $2
       RETURNING *`,
      [status, id]
    );

    if (updateRes.rows.length === 0) {
      return res.status(404).json({ success: false, error: 'Content item not found' });
    }

    const updated = updateRes.rows[0];

    await recordAudit(req, {
      action: 'STATUS_CHANGE',
      entity: updated.content_type,
      entityId: id,
      details: { newStatus: status }
    });

    return res.json({ success: true, data: updated });
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message });
  }
});

/**
 * POST /api/content/:id/duplicate
 * Duplicate an existing content item with fresh UUID and copy suffix
 */
router.post('/:id/duplicate', authenticateToken, requirePermission('can_manage_content'), async (req, res) => {
  try {
    const { id } = req.params;
    const srcRes = await query('SELECT * FROM content_items WHERE id = $1', [id]);

    if (srcRes.rows.length === 0) {
      return res.status(404).json({ success: false, error: 'Content item not found' });
    }

    const src = srcRes.rows[0];
    const newMediaUuid = crypto.randomUUID();
    const newTitle = `${src.title} (Duplicate)`;

    const insertRes = await query(
      `INSERT INTO content_items (
        media_uuid, channel_id, content_type, topic, title, description, image_prompt,
        tags, image_url, video_url, status, image_present, video_present,
        created_by
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, 'draft', $11, $12, $13)
      RETURNING *`,
      [
        newMediaUuid,
        src.channel_id || null,
        src.content_type,
        src.topic,
        newTitle,
        src.description,
        src.image_prompt,
        src.tags,
        src.image_url,
        src.video_url,
        src.image_present,
        src.video_present,
        req.user.id
      ]
    );

    const duplicatedItem = insertRes.rows[0];

    await recordAudit(req, {
      action: 'DUPLICATE',
      entity: duplicatedItem.content_type,
      entityId: duplicatedItem.id,
      details: { originalId: id, originalTitle: src.title, newTitle }
    });

    logger.info(`[CONTENT] Duplicated item ID: ${id} -> New ID: ${duplicatedItem.id}`);
    return res.status(201).json({ success: true, data: duplicatedItem });
  } catch (err) {
    logger.error(`[CONTENT-DUPLICATE-ERROR] ${err.message}`);
    return res.status(500).json({ success: false, error: err.message });
  }
});

/**
 * DELETE /api/content/:id
 * Delete content item
 */
router.delete('/:id', authenticateToken, requirePermission('can_manage_content'), async (req, res) => {
  try {
    const { id } = req.params;

    const findRes = await query('SELECT id, title, content_type, media_uuid FROM content_items WHERE id = $1', [id]);
    if (findRes.rows.length === 0) {
      return res.status(404).json({ success: false, error: 'Content item not found' });
    }

    const item = findRes.rows[0];

    // Delete any disk media files associated with this media_uuid
    if (item.media_uuid && fs.existsSync(mediaDir)) {
      try {
        const files = fs.readdirSync(mediaDir);
        files.forEach(f => {
          if (f.startsWith(item.media_uuid)) {
            try { fs.unlinkSync(path.join(mediaDir, f)); } catch (_) {}
          }
        });
      } catch (fErr) {
        logger.warn(`[CONTENT-DELETE] Could not clean up media files for ${item.media_uuid}: ${fErr.message}`);
      }
    }

    await query('DELETE FROM content_items WHERE id = $1', [id]);

    await recordAudit(req, {
      action: 'DELETE',
      entity: item.content_type,
      entityId: id,
      details: { title: item.title }
    });

    logger.info(`[CONTENT] Deleted item ID: ${id} ("${item.title}")`);
    return res.json({ success: true, message: `Item "${item.title}" successfully deleted.` });
  } catch (err) {
    logger.error(`[CONTENT-DELETE-ERROR] ${err.message}`);
    return res.status(500).json({ success: false, error: err.message });
  }
});

module.exports = router;
