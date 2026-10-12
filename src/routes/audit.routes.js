const express = require('express');
const router = express.Router();
const { query } = require('../config/db');
const { authenticateToken, requirePermission } = require('../middleware/auth');

/**
 * GET /api/audit
 * Get paginated audit trail logs with filtering
 */
router.get('/', authenticateToken, requirePermission('can_view_audit_logs'), async (req, res) => {
  try {
    const {
      action,
      entity,
      user,
      startDate,
      endDate,
      page = 1,
      limit = 25
    } = req.query;

    const conditions = [];
    const params = [];
    let paramIndex = 1;

    if (action && action !== 'all') {
      conditions.push(`action = $${paramIndex++}`);
      params.push(action.toUpperCase());
    }

    if (entity && entity !== 'all') {
      conditions.push(`entity = $${paramIndex++}`);
      params.push(entity.toLowerCase());
    }

    if (user && user.trim()) {
      conditions.push(`username ILIKE $${paramIndex++}`);
      params.push(`%${user.trim()}%`);
    }

    if (startDate) {
      conditions.push(`created_at >= $${paramIndex++}`);
      params.push(new Date(startDate));
    }

    if (endDate) {
      conditions.push(`created_at <= $${paramIndex++}`);
      params.push(new Date(endDate));
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

    const countRes = await query(`SELECT COUNT(*) FROM audit_logs ${whereClause}`, params);
    const total = parseInt(countRes.rows[0].count, 10);

    const offset = (Math.max(1, parseInt(page, 10)) - 1) * parseInt(limit, 10);
    params.push(parseInt(limit, 10));
    params.push(offset);

    const listQuery = `
      SELECT * FROM audit_logs
      ${whereClause}
      ORDER BY created_at DESC
      LIMIT $${paramIndex++} OFFSET $${paramIndex++}
    `;

    const logsRes = await query(listQuery, params);

    return res.json({
      success: true,
      data: logsRes.rows,
      pagination: {
        total,
        page: parseInt(page, 10),
        limit: parseInt(limit, 10),
        totalPages: Math.ceil(total / parseInt(limit, 10))
      }
    });
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message });
  }
});

/**
 * GET /api/audit/export
 * Export audit logs as JSON
 */
router.get('/export', authenticateToken, requirePermission('can_export_data'), async (req, res) => {
  try {
    const logsRes = await query('SELECT * FROM audit_logs ORDER BY created_at DESC LIMIT 1000');
    res.setHeader('Content-Disposition', 'attachment; filename=audit_trail_export.json');
    res.setHeader('Content-Type', 'application/json');
    return res.send(JSON.stringify(logsRes.rows, null, 2));
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message });
  }
});

module.exports = router;
