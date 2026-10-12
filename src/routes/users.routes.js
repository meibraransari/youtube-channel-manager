const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const { query } = require('../config/db');
const { authenticateToken, requirePermission, requireRole } = require('../middleware/auth');
const { recordAudit } = require('../middleware/audit');
const { logger } = require('../config/logger');

/**
 * GET /api/users
 * List all users
 */
router.get('/', authenticateToken, requirePermission('can_manage_users'), async (req, res) => {
  try {
    const usersRes = await query(
      `SELECT id, username, email, role, permissions, avatar_url, is_active, created_at, updated_at
       FROM users
       ORDER BY created_at ASC`
    );
    return res.json({ success: true, users: usersRes.rows });
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message });
  }
});

/**
 * POST /api/users
 * Create a new user account with RBAC permissions
 */
router.post('/', authenticateToken, requirePermission('can_manage_users'), async (req, res) => {
  try {
    const { username, email, password, role = 'editor', permissions = [], is_active = true } = req.body;

    if (!username || !email || !password) {
      return res.status(400).json({ success: false, error: 'Username, email, and password are required' });
    }

    if (password.length < 6) {
      return res.status(400).json({ success: false, error: 'Password must be at least 6 characters' });
    }

    // Check unique username and email
    const existsCheck = await query(
      'SELECT id FROM users WHERE username = $1 OR email = $2',
      [username.trim(), email.trim().toLowerCase()]
    );
    if (existsCheck.rows.length > 0) {
      return res.status(409).json({ success: false, error: 'Username or Email is already registered' });
    }

    const passwordHash = await bcrypt.hash(password, 10);

    // Default permissions based on role if none provided
    let finalPermissions = permissions;
    if (!finalPermissions || finalPermissions.length === 0) {
      if (role === 'admin') {
        finalPermissions = [
          'can_view_content', 'can_manage_content', 'can_manage_users',
          'can_manage_settings', 'can_view_audit_logs', 'can_export_data', 'can_migrate_data'
        ];
      } else if (role === 'manager') {
        finalPermissions = ['can_view_content', 'can_manage_content', 'can_view_audit_logs', 'can_export_data'];
      } else if (role === 'editor') {
        finalPermissions = ['can_view_content', 'can_manage_content'];
      } else {
        finalPermissions = ['can_view_content'];
      }
    }

    const insertRes = await query(
      `INSERT INTO users (username, email, password_hash, role, permissions, is_active)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING id, username, email, role, permissions, is_active, created_at`,
      [
        username.trim(),
        email.trim().toLowerCase(),
        passwordHash,
        role,
        JSON.stringify(finalPermissions),
        Boolean(is_active)
      ]
    );

    const newUser = insertRes.rows[0];

    await recordAudit(req, {
      action: 'CREATE',
      entity: 'user',
      entityId: newUser.id,
      details: { username: newUser.username, role: newUser.role, permissions: newUser.permissions }
    });

    logger.info(`[USER] Created new user: ${newUser.username} (${newUser.role})`);
    return res.status(201).json({ success: true, user: newUser });
  } catch (err) {
    logger.error(`[USER-CREATE-ERROR] ${err.message}`);
    return res.status(500).json({ success: false, error: err.message });
  }
});

/**
 * PUT /api/users/:id
 * Update user profile, role, permissions, password or active status
 */
router.put('/:id', authenticateToken, requirePermission('can_manage_users'), async (req, res) => {
  try {
    const { id } = req.params;
    const { email, role, permissions, is_active, password } = req.body;

    const findRes = await query('SELECT id, username, role FROM users WHERE id = $1', [id]);
    if (findRes.rows.length === 0) {
      return res.status(404).json({ success: false, error: 'User not found' });
    }

    const targetUser = findRes.rows[0];

    // Prevent deactivating own account or root admin
    if (req.user.id === id && is_active === false) {
      return res.status(400).json({ success: false, error: 'You cannot deactivate your own account' });
    }
    if (targetUser.username === 'admin') {
      if (is_active === false) {
        return res.status(400).json({ success: false, error: 'Root administrator account cannot be deactivated' });
      }
      if (role && role !== 'admin') {
        return res.status(400).json({ success: false, error: 'Root administrator account must maintain admin role' });
      }
    }

    const fields = [];
    const values = [];
    let idx = 1;

    if (email && email.trim()) {
      fields.push(`email = $${idx++}`);
      values.push(email.trim().toLowerCase());
    }
    if (role && role.trim()) {
      fields.push(`role = $${idx++}`);
      values.push(role.trim());
    }
    if (permissions !== undefined) {
      const permsArray = Array.isArray(permissions) ? permissions : [];
      fields.push(`permissions = $${idx++}::jsonb`);
      values.push(JSON.stringify(permsArray));
    }
    if (is_active !== undefined) {
      fields.push(`is_active = $${idx++}`);
      values.push(Boolean(is_active));
    }
    if (password && String(password).trim().length >= 6) {
      const passwordHash = await bcrypt.hash(String(password).trim(), 10);
      fields.push(`password_hash = $${idx++}`);
      values.push(passwordHash);
    }

    fields.push('updated_at = CURRENT_TIMESTAMP');
    values.push(id);

    const updateSql = `
      UPDATE users 
      SET ${fields.join(', ')} 
      WHERE id = $${idx} 
      RETURNING id, username, email, role, permissions, is_active, updated_at
    `;

    const updateRes = await query(updateSql, values);
    const updatedUser = updateRes.rows[0];

    await recordAudit(req, {
      action: 'UPDATE',
      entity: 'user',
      entityId: id,
      details: { username: updatedUser.username, changes: req.body }
    });

    logger.info(`[USER] Updated operator profile: ${updatedUser.username} (${updatedUser.role})`);
    return res.json({ success: true, user: updatedUser });
  } catch (err) {
    logger.error(`[USER-UPDATE-ERROR] ${err.message}`);
    return res.status(500).json({ success: false, error: err.message });
  }
});

/**
 * PUT /api/users/:id/password
 * Admin reset user password
 */
router.put('/:id/password', authenticateToken, requirePermission('can_manage_users'), async (req, res) => {
  try {
    const { id } = req.params;
    const { new_password } = req.body;

    if (!new_password || new_password.length < 6) {
      return res.status(400).json({ success: false, error: 'New password must be at least 6 characters' });
    }

    const userRes = await query('SELECT username FROM users WHERE id = $1', [id]);
    if (userRes.rows.length === 0) {
      return res.status(404).json({ success: false, error: 'User not found' });
    }

    const passwordHash = await bcrypt.hash(new_password, 10);
    await query('UPDATE users SET password_hash = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2', [passwordHash, id]);

    await recordAudit(req, {
      action: 'RESET_PASSWORD',
      entity: 'user',
      entityId: id,
      details: { username: userRes.rows[0].username }
    });

    return res.json({ success: true, message: `Password successfully updated for user: ${userRes.rows[0].username}` });
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message });
  }
});

/**
 * DELETE /api/users/:id
 * Delete user account
 */
router.delete('/:id', authenticateToken, requirePermission('can_manage_users'), async (req, res) => {
  try {
    const { id } = req.params;

    if (req.user.id === id) {
      return res.status(400).json({ success: false, error: 'Cannot delete your own user account' });
    }

    const findRes = await query('SELECT id, username, role FROM users WHERE id = $1', [id]);
    if (findRes.rows.length === 0) {
      return res.status(404).json({ success: false, error: 'User not found' });
    }

    const userToDelete = findRes.rows[0];
    if (userToDelete.username === 'admin') {
      return res.status(400).json({ success: false, error: 'Root admin account cannot be deleted' });
    }

    // Safeguard foreign key references prior to deletion
    await query('UPDATE user_login_logs SET user_id = NULL WHERE user_id = $1', [id]);
    await query('UPDATE audit_logs SET user_id = NULL WHERE user_id = $1', [id]);
    await query('UPDATE content_items SET created_by = NULL WHERE created_by = $1', [id]);
    await query('UPDATE migration_history SET migrated_by = NULL WHERE migrated_by = $1', [id]);

    await query('DELETE FROM users WHERE id = $1', [id]);

    await recordAudit(req, {
      action: 'DELETE',
      entity: 'user',
      entityId: id,
      details: { username: userToDelete.username }
    });

    logger.info(`[USER] Deleted operator account: ${userToDelete.username} (${id})`);
    return res.json({ success: true, message: `User "${userToDelete.username}" deleted successfully.` });
  } catch (err) {
    logger.error(`[USER-DELETE-ERROR] ${err.message}`);
    return res.status(500).json({ success: false, error: err.message });
  }
});

module.exports = router;
