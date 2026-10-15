const express = require('express');
const router = express.Router();
const { query } = require('../config/db');
const { authenticateToken, requirePermission } = require('../middleware/auth');
const { recordAudit } = require('../middleware/audit');
const { logger } = require('../config/logger');

/**
 * GET /api/notes/topics
 * Retrieve distinct topic aggregates with counts
 */
router.get('/topics', authenticateToken, requirePermission('can_view_content'), async (req, res) => {
  try {
    const { channel_id } = req.query;
    let sql = `
      SELECT topic, COUNT(*)::int as count 
      FROM notes 
      WHERE is_archived = FALSE
    `;
    const params = [];
    if (channel_id && channel_id !== 'all') {
      params.push(channel_id);
      sql += ` AND (channel_id = $${params.length} OR channel_id IS NULL)`;
    }
    sql += ` GROUP BY topic ORDER BY count DESC, topic ASC`;

    const result = await query(sql, params);
    return res.json({
      success: true,
      count: result.rows.length,
      topics: result.rows
    });
  } catch (err) {
    logger.error(`[NOTES-TOPICS-ERROR] ${err.message}`);
    return res.status(500).json({ success: false, error: err.message });
  }
});

/**
 * GET /api/notes
 * List all notes with dynamic multi-facet filtering, full-text search, and pagination
 */
router.get('/', authenticateToken, requirePermission('can_view_content'), async (req, res) => {
  try {
    const { 
      topic, 
      category, 
      search, 
      channel_id, 
      is_pinned, 
      is_archived,
      sort_by = 'updated_at', 
      order = 'DESC',
      limit = 100,
      offset = 0 
    } = req.query;

    let sql = `
      SELECT 
        n.*,
        c.name AS channel_name,
        c.handle AS channel_handle,
        u.username AS author_username
      FROM notes n
      LEFT JOIN channels c ON n.channel_id = c.id
      LEFT JOIN users u ON n.created_by = u.id
      WHERE 1=1
    `;
    const params = [];

    // Filter by Archive status (default non-archived)
    if (is_archived === 'true') {
      sql += ` AND n.is_archived = TRUE`;
    } else if (is_archived !== 'all') {
      sql += ` AND n.is_archived = FALSE`;
    }

    // Filter by Topic
    if (topic && topic !== 'all') {
      params.push(topic);
      sql += ` AND n.topic = $${params.length}`;
    }

    // Filter by Category
    if (category && category !== 'all') {
      params.push(category);
      sql += ` AND n.category = $${params.length}`;
    }

    // Filter by Channel
    if (channel_id && channel_id !== 'all') {
      params.push(channel_id);
      sql += ` AND (n.channel_id = $${params.length} OR n.channel_id IS NULL)`;
    }

    // Filter by Pinned
    if (is_pinned === 'true') {
      sql += ` AND n.is_pinned = TRUE`;
    }

    // Full-Text Search across Title, Topic, Content & Tags
    if (search && search.trim()) {
      params.push(`%${search.trim().toLowerCase()}%`);
      sql += ` AND (
        LOWER(n.title) LIKE $${params.length} OR 
        LOWER(n.topic) LIKE $${params.length} OR 
        LOWER(n.content) LIKE $${params.length} OR 
        LOWER(COALESCE(n.tags, '')) LIKE $${params.length}
      )`;
    }

    // Safe Sort Configuration
    const allowedSortFields = {
      'updated_at': 'n.updated_at',
      'created_at': 'n.created_at',
      'title': 'n.title',
      'topic': 'n.topic'
    };
    const sortField = allowedSortFields[sort_by] || 'n.updated_at';
    const sortOrder = order.toUpperCase() === 'ASC' ? 'ASC' : 'DESC';

    // Pinned notes always surface first, followed by requested sort
    sql += ` ORDER BY n.is_pinned DESC, ${sortField} ${sortOrder}`;

    const limitNum = Math.min(Math.max(parseInt(limit, 10) || 100, 1), 500);
    const offsetNum = Math.max(parseInt(offset, 10) || 0, 0);

    params.push(limitNum, offsetNum);
    sql += ` LIMIT $${params.length - 1} OFFSET $${params.length}`;

    const result = await query(sql, params);

    // Aggregate Summary Counts
    const summaryRes = await query(`
      SELECT 
        COUNT(*)::int AS total_notes,
        COUNT(CASE WHEN is_pinned = TRUE AND is_archived = FALSE THEN 1 END)::int AS pinned_notes,
        COUNT(CASE WHEN is_archived = TRUE THEN 1 END)::int AS archived_notes,
        COUNT(DISTINCT topic)::int AS total_topics
      FROM notes
    `);

    // Fetch distinct topics
    const topicsRes = await query(`
      SELECT topic, COUNT(*)::int as count 
      FROM notes 
      WHERE is_archived = FALSE 
      GROUP BY topic 
      ORDER BY count DESC, topic ASC
    `);

    return res.json({
      success: true,
      count: result.rows.length,
      notes: result.rows,
      topics: topicsRes.rows,
      summary: summaryRes.rows[0] || { total_notes: 0, pinned_notes: 0, archived_notes: 0, total_topics: 0 }
    });
  } catch (err) {
    logger.error(`[NOTES-LIST-ERROR] ${err.message}`);
    return res.status(500).json({ success: false, error: err.message });
  }
});

/**
 * GET /api/notes/:id
 * Retrieve single note by ID
 */
router.get('/:id', authenticateToken, requirePermission('can_view_content'), async (req, res) => {
  try {
    const { id } = req.params;
    const result = await query(
      `SELECT 
        n.*,
        c.name AS channel_name,
        c.handle AS channel_handle,
        u.username AS author_username
      FROM notes n
      LEFT JOIN channels c ON n.channel_id = c.id
      LEFT JOIN users u ON n.created_by = u.id
      WHERE n.id = $1`,
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, error: 'Note not found.' });
    }

    return res.json({
      success: true,
      note: result.rows[0]
    });
  } catch (err) {
    logger.error(`[NOTES-GET-ERROR] ${err.message}`);
    return res.status(500).json({ success: false, error: err.message });
  }
});

/**
 * GET /api/notes/:id/export
 * Download raw markdown file
 */
router.get('/:id/export', authenticateToken, requirePermission('can_view_content'), async (req, res) => {
  try {
    const { id } = req.params;
    const result = await query('SELECT title, topic, content FROM notes WHERE id = $1', [id]);

    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, error: 'Note not found.' });
    }

    const note = result.rows[0];
    const sanitizedTitle = (note.title || 'note').replace(/[^a-zA-Z0-9_\-\.]/g, '_').toLowerCase();
    const filename = `${sanitizedTitle}.md`;

    res.setHeader('Content-Type', 'text/markdown; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    return res.send(note.content || '');
  } catch (err) {
    logger.error(`[NOTES-EXPORT-ERROR] ${err.message}`);
    return res.status(500).json({ success: false, error: err.message });
  }
});

/**
 * POST /api/notes
 * Create a new note / instruction document
 */
router.post('/', authenticateToken, requirePermission('can_create_content'), async (req, res) => {
  try {
    const { 
      title, 
      topic = 'General', 
      category = 'instruction', 
      content = '', 
      tags = '', 
      color = '#06b6d4', 
      is_pinned = false,
      channel_id = null 
    } = req.body;

    if (!title || !title.trim()) {
      return res.status(400).json({ success: false, error: 'Note title is required.' });
    }

    const trimmedTopic = (topic && topic.trim()) ? topic.trim() : 'General';
    const trimmedTitle = title.trim();

    const insertResult = await query(
      `INSERT INTO notes (
        title, topic, category, content, tags, color, is_pinned, channel_id, created_by, updated_by
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $9)
      RETURNING *`,
      [
        trimmedTitle,
        trimmedTopic,
        category || 'instruction',
        content || '',
        tags ? tags.trim() : '',
        color || '#06b6d4',
        Boolean(is_pinned),
        channel_id || null,
        req.user ? req.user.id : null
      ]
    );

    const newNote = insertResult.rows[0];

    // Audit Log Entry
    await recordAudit(req, {
      action: 'NOTE_CREATE',
      entity: 'notes',
      entityId: newNote.id,
      details: {
        title: newNote.title,
        topic: newNote.topic,
        category: newNote.category,
        is_pinned: newNote.is_pinned
      }
    });

    logger.info(`[NOTE-CREATED] "${newNote.title}" under topic "${newNote.topic}" by user ${req.user ? req.user.username : 'system'}`);

    return res.status(201).json({
      success: true,
      message: 'Note created successfully.',
      note: newNote
    });
  } catch (err) {
    logger.error(`[NOTE-CREATE-ERROR] ${err.message}`);
    return res.status(500).json({ success: false, error: err.message });
  }
});

/**
 * PUT /api/notes/:id
 * Update an existing note / instruction
 */
router.put('/:id', authenticateToken, requirePermission('can_edit_content'), async (req, res) => {
  try {
    const { id } = req.params;
    const { 
      title, 
      topic, 
      category, 
      content, 
      tags, 
      color, 
      is_pinned,
      is_archived,
      channel_id 
    } = req.body;

    const existingCheck = await query('SELECT * FROM notes WHERE id = $1', [id]);
    if (existingCheck.rows.length === 0) {
      return res.status(404).json({ success: false, error: 'Note not found.' });
    }

    const existing = existingCheck.rows[0];

    const updatedTitle = title !== undefined ? title.trim() : existing.title;
    if (!updatedTitle) {
      return res.status(400).json({ success: false, error: 'Note title cannot be empty.' });
    }

    const updatedTopic = topic !== undefined ? topic.trim() : existing.topic;
    const updatedCategory = category !== undefined ? category : existing.category;
    const updatedContent = content !== undefined ? content : existing.content;
    const updatedTags = tags !== undefined ? tags.trim() : existing.tags;
    const updatedColor = color !== undefined ? color : existing.color;
    const updatedPinned = is_pinned !== undefined ? Boolean(is_pinned) : existing.is_pinned;
    const updatedArchived = is_archived !== undefined ? Boolean(is_archived) : existing.is_archived;
    const updatedChannel = channel_id !== undefined ? (channel_id || null) : existing.channel_id;

    const updateResult = await query(
      `UPDATE notes SET
        title = $1,
        topic = $2,
        category = $3,
        content = $4,
        tags = $5,
        color = $6,
        is_pinned = $7,
        is_archived = $8,
        channel_id = $9,
        updated_at = CURRENT_TIMESTAMP,
        updated_by = $10
      WHERE id = $11
      RETURNING *`,
      [
        updatedTitle,
        updatedTopic,
        updatedCategory,
        updatedContent,
        updatedTags,
        updatedColor,
        updatedPinned,
        updatedArchived,
        updatedChannel,
        req.user ? req.user.id : null,
        id
      ]
    );

    const updatedNote = updateResult.rows[0];

    // Audit Log Entry
    await recordAudit(req, {
      action: 'NOTE_UPDATE',
      entity: 'notes',
      entityId: id,
      details: {
        title: updatedNote.title,
        topic: updatedNote.topic,
        category: updatedNote.category,
        is_pinned: updatedNote.is_pinned,
        is_archived: updatedNote.is_archived
      }
    });

    logger.info(`[NOTE-UPDATED] "${updatedNote.title}" by user ${req.user ? req.user.username : 'system'}`);

    return res.json({
      success: true,
      message: 'Note updated successfully.',
      note: updatedNote
    });
  } catch (err) {
    logger.error(`[NOTE-UPDATE-ERROR] ${err.message}`);
    return res.status(500).json({ success: false, error: err.message });
  }
});

/**
 * PATCH /api/notes/:id/pin
 * Toggle or set pinned status
 */
router.patch('/:id/pin', authenticateToken, requirePermission('can_edit_content'), async (req, res) => {
  try {
    const { id } = req.params;
    const { is_pinned } = req.body;

    let updateQuery;
    let params;

    if (is_pinned !== undefined) {
      updateQuery = `UPDATE notes SET is_pinned = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2 RETURNING id, title, is_pinned`;
      params = [Boolean(is_pinned), id];
    } else {
      updateQuery = `UPDATE notes SET is_pinned = NOT is_pinned, updated_at = CURRENT_TIMESTAMP WHERE id = $1 RETURNING id, title, is_pinned`;
      params = [id];
    }

    const result = await query(updateQuery, params);
    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, error: 'Note not found.' });
    }

    const note = result.rows[0];

    await recordAudit(req, {
      action: 'NOTE_PIN_TOGGLE',
      entity: 'notes',
      entityId: id,
      details: { is_pinned: note.is_pinned, title: note.title }
    });

    return res.json({
      success: true,
      message: `Note ${note.is_pinned ? 'pinned to top' : 'unpinned'}.`,
      is_pinned: note.is_pinned
    });
  } catch (err) {
    logger.error(`[NOTE-PIN-ERROR] ${err.message}`);
    return res.status(500).json({ success: false, error: err.message });
  }
});

/**
 * DELETE /api/notes/:id
 * Delete note permanently
 */
router.delete('/:id', authenticateToken, requirePermission('can_delete_content'), async (req, res) => {
  try {
    const { id } = req.params;
    const noteCheck = await query('SELECT title, topic FROM notes WHERE id = $1', [id]);

    if (noteCheck.rows.length === 0) {
      return res.status(404).json({ success: false, error: 'Note not found.' });
    }

    const noteTitle = noteCheck.rows[0].title;
    await query('DELETE FROM notes WHERE id = $1', [id]);

    await recordAudit(req, {
      action: 'NOTE_DELETE',
      entity: 'notes',
      entityId: id,
      details: { title: noteTitle }
    });

    logger.info(`[NOTE-DELETED] "${noteTitle}" (ID: ${id}) by user ${req.user ? req.user.username : 'system'}`);

    return res.json({
      success: true,
      message: `Note "${noteTitle}" deleted successfully.`
    });
  } catch (err) {
    logger.error(`[NOTE-DELETE-ERROR] ${err.message}`);
    return res.status(500).json({ success: false, error: err.message });
  }
});

module.exports = router;
