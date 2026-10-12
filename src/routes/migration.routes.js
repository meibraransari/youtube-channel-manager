const express = require('express');
const router = express.Router();
const fs = require('fs');
const path = require('path');
const multer = require('multer');
const { query } = require('../config/db');
const { authenticateToken, requirePermission } = require('../middleware/auth');
const { recordAudit } = require('../middleware/audit');
const { parseMySqlDump } = require('../utils/mysqlToPostgresParser');
const { logger } = require('../config/logger');

// Setup memory storage for uploaded SQL files
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 25 * 1024 * 1024 } // 25MB max
});

/**
 * GET /api/migration/status
 * Get migration overview and history
 */
router.get('/status', authenticateToken, async (req, res) => {
  try {
    const historyRes = await query('SELECT * FROM migration_history ORDER BY created_at DESC LIMIT 10');
    const totalItemsRes = await query('SELECT COUNT(*) FROM content_items');
    const referenceFilePath = path.join(__dirname, '../../sql11-10-2026_data.sql');
    const referenceExists = fs.existsSync(referenceFilePath);

    return res.json({
      success: true,
      currentTotalContentItems: parseInt(totalItemsRes.rows[0].count, 10),
      referenceFileAvailable: referenceExists,
      history: historyRes.rows
    });
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message });
  }
});

/**
 * POST /api/migration/run-reference
 * Execute migration from the bundled reference sql11-10-2026_data.sql file
 */
router.post('/run-reference', authenticateToken, requirePermission('can_migrate_data'), async (req, res) => {
  try {
    const referenceFilePath = path.join(__dirname, '../../sql11-10-2026_data.sql');
    if (!fs.existsSync(referenceFilePath)) {
      return res.status(404).json({ success: false, error: 'Reference sql file sql11-10-2026_data.sql not found on server' });
    }

    const sqlContent = fs.readFileSync(referenceFilePath, 'utf8');
    const items = parseMySqlDump(sqlContent);

    let inserted = 0;
    let updated = 0;

    for (const item of items) {
      const result = await query(
        `INSERT INTO content_items (
          media_uuid, content_type, topic, title, description, image_prompt,
          tags, image_url, video_url, status, image_present, video_present,
          created_at, uploaded_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)
        ON CONFLICT (media_uuid) DO UPDATE SET
          topic = EXCLUDED.topic,
          title = EXCLUDED.title,
          description = EXCLUDED.description,
          image_prompt = EXCLUDED.image_prompt,
          tags = EXCLUDED.tags,
          image_url = EXCLUDED.image_url,
          video_url = EXCLUDED.video_url,
          status = EXCLUDED.status,
          image_present = EXCLUDED.image_present,
          video_present = EXCLUDED.video_present,
          updated_at = CURRENT_TIMESTAMP
        RETURNING (xmax = 0) AS is_insert`,
        [
          item.media_uuid,
          item.content_type,
          item.topic,
          item.title,
          item.description,
          item.image_prompt,
          item.tags,
          item.image_url,
          item.video_url,
          item.status,
          item.image_present,
          item.video_present,
          item.created_at,
          item.uploaded_at
        ]
      );

      if (result.rows[0].is_insert) {
        inserted++;
      } else {
        updated++;
      }
    }

    // Reset sequence
    await query(`SELECT setval('content_items_id_seq', (SELECT COALESCE(MAX(id), 1) FROM content_items))`);

    // Record migration history
    await query(
      `INSERT INTO migration_history (source_type, records_migrated, status, migrated_by)
       VALUES ('reference_sql11-10-2026_data.sql', $1, 'success', $2)`,
      [items.length, req.user.id]
    );

    // Audit log
    await recordAudit(req, {
      action: 'MIGRATION',
      entity: 'migration',
      entityId: 'reference_file',
      details: { totalParsed: items.length, inserted, updated }
    });

    logger.info(`[MIGRATION] Migrated ${items.length} items from reference file (New: ${inserted}, Updated: ${updated})`);

    return res.json({
      success: true,
      message: `Migration completed: ${items.length} records processed (${inserted} created, ${updated} updated).`,
      stats: { totalParsed: items.length, inserted, updated }
    });
  } catch (err) {
    logger.error(`[MIGRATION-ERROR] ${err.message}`);
    await query(
      `INSERT INTO migration_history (source_type, records_migrated, status, error_message, migrated_by)
       VALUES ('reference_sql11-10-2026_data.sql', 0, 'failed', $1, $2)`,
      [err.message, req.user.id]
    );
    return res.status(500).json({ success: false, error: err.message });
  }
});

/**
 * POST /api/migration/upload
 * Migrate custom MySQL dump file uploaded from UI
 */
router.post('/upload', authenticateToken, requirePermission('can_migrate_data'), upload.single('sqlFile'), async (req, res) => {
  try {
    let sqlContent = '';
    let fileName = 'pasted_input.sql';

    if (req.file) {
      sqlContent = req.file.buffer.toString('utf8');
      fileName = req.file.originalname;
    } else if (req.body.sqlText) {
      sqlContent = req.body.sqlText;
      fileName = 'direct_sql_text';
    } else {
      return res.status(400).json({ success: false, error: 'No SQL file uploaded or SQL text provided' });
    }

    const items = parseMySqlDump(sqlContent);
    if (items.length === 0) {
      return res.status(400).json({ success: false, error: 'No compatible items found to migrate' });
    }

    let inserted = 0;
    let updated = 0;

    for (const item of items) {
      const result = await query(
        `INSERT INTO content_items (
          media_uuid, content_type, topic, title, description, image_prompt,
          tags, image_url, video_url, status, image_present, video_present,
          created_at, uploaded_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)
        ON CONFLICT (media_uuid) DO UPDATE SET
          topic = EXCLUDED.topic,
          title = EXCLUDED.title,
          description = EXCLUDED.description,
          image_prompt = EXCLUDED.image_prompt,
          tags = EXCLUDED.tags,
          image_url = EXCLUDED.image_url,
          video_url = EXCLUDED.video_url,
          status = EXCLUDED.status,
          image_present = EXCLUDED.image_present,
          video_present = EXCLUDED.video_present,
          updated_at = CURRENT_TIMESTAMP
        RETURNING (xmax = 0) AS is_insert`,
        [
          item.media_uuid,
          item.content_type,
          item.topic,
          item.title,
          item.description,
          item.image_prompt,
          item.tags,
          item.image_url,
          item.video_url,
          item.status,
          item.image_present,
          item.video_present,
          item.created_at,
          item.uploaded_at
        ]
      );

      if (result.rows[0].is_insert) {
        inserted++;
      } else {
        updated++;
      }
    }

    await query(`SELECT setval('content_items_id_seq', (SELECT COALESCE(MAX(id), 1) FROM content_items))`);

    await query(
      `INSERT INTO migration_history (source_type, records_migrated, status, migrated_by)
       VALUES ($1, $2, 'success', $3)`,
      [fileName, items.length, req.user.id]
    );

    await recordAudit(req, {
      action: 'MIGRATION',
      entity: 'migration',
      entityId: fileName,
      details: { totalParsed: items.length, inserted, updated }
    });

    return res.json({
      success: true,
      message: `Migration from ${fileName} succeeded: ${items.length} records processed (${inserted} created, ${updated} updated).`,
      stats: { totalParsed: items.length, inserted, updated }
    });
  } catch (err) {
    logger.error(`[MIGRATION-UPLOAD-ERROR] ${err.message}`);
    return res.status(500).json({ success: false, error: err.message });
  }
});

module.exports = router;
