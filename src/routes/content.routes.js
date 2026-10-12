const express = require('express');
const router = express.Router();
const crypto = require('crypto');
const { query } = require('../config/db');
const { authenticateToken, requirePermission } = require('../middleware/auth');
const { recordAudit } = require('../middleware/audit');
const { logger } = require('../config/logger');

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
 * POST /api/content
 * Create new content item (used by Content Creator Wizard)
 */
router.post('/', authenticateToken, requirePermission('can_manage_content'), async (req, res) => {
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

    // Validate tags length (500 max)
    if (tags && tags.length > 500) {
      return res.status(400).json({ success: false, error: 'Tags length cannot exceed 500 characters' });
    }

    const mediaUuid = crypto.randomUUID();
    const uploadedAt = status === 'uploaded' ? new Date() : null;

    const insertRes = await query(
      `INSERT INTO content_items (
        media_uuid, channel_id, content_type, topic, title, description, image_prompt,
        tags, image_url, video_url, status, image_present, video_present,
        scheduled_at, uploaded_at, created_by
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16)
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
        image_url || null,
        video_url || null,
        status,
        Boolean(image_present),
        Boolean(video_present),
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
      details: { title: newItem.title, media_uuid: newItem.media_uuid, status: newItem.status }
    });

    logger.info(`[CONTENT] Created new ${content_type}: "${newItem.title}" (ID: ${newItem.id})`);
    return res.status(201).json({ success: true, data: newItem });
  } catch (err) {
    logger.error(`[CONTENT-CREATE-ERROR] ${err.message}`);
    return res.status(500).json({ success: false, error: err.message });
  }
});

/**
 * PUT /api/content/:id
 * Full edit of a content item
 */
router.put('/:id', authenticateToken, requirePermission('can_manage_content'), async (req, res) => {
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

    if (tags && tags.length > 500) {
      return res.status(400).json({ success: false, error: 'Tags length cannot exceed 500 characters' });
    }

    // Check item exists
    const checkRes = await query('SELECT * FROM content_items WHERE id = $1', [id]);
    if (checkRes.rows.length === 0) {
      return res.status(404).json({ success: false, error: 'Content item not found' });
    }

    const prevItem = checkRes.rows[0];

    let finalUploadedAt = uploaded_at ? new Date(uploaded_at) : prevItem.uploaded_at;
    if (status === 'uploaded' && !finalUploadedAt) {
      finalUploadedAt = new Date();
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
        scheduled_at = $12,
        uploaded_at = $13,
        updated_at = CURRENT_TIMESTAMP
      WHERE id = $14
      RETURNING *`,
      [
        topic || null,
        title.trim(),
        description || null,
        content_type || prevItem.content_type,
        image_prompt || null,
        tags || null,
        image_url || null,
        video_url || null,
        status || prevItem.status,
        image_present !== undefined ? Boolean(image_present) : prevItem.image_present,
        video_present !== undefined ? Boolean(video_present) : prevItem.video_present,
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
      details: { title: updatedItem.title, changes: req.body }
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

    const findRes = await query('SELECT id, title, content_type FROM content_items WHERE id = $1', [id]);
    if (findRes.rows.length === 0) {
      return res.status(404).json({ success: false, error: 'Content item not found' });
    }

    const item = findRes.rows[0];

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
