const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { query } = require('../config/db');
const { recordAudit } = require('../middleware/audit');
const { authenticateToken } = require('../middleware/auth');
const { logger } = require('../config/logger');

const JWT_SECRET = process.env.JWT_SECRET || 'b69813b7a1314525b72b44496f823649115e3ae13fcf2ba24ec9a93a63006953';
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '7d';

/**
 * POST /api/auth/login
 * User login with login logs tracker and audit logging
 */
router.post('/login', async (req, res) => {
  const { username, password } = req.body;
  const ipAddress = (req.headers['x-forwarded-for'] || req.socket.remoteAddress || '127.0.0.1').substring(0, 50);
  const userAgent = req.headers['user-agent'] || 'Unknown Client';

  if (!username || !password) {
    return res.status(400).json({ success: false, error: 'Username and password are required' });
  }

  try {
    const userRes = await query(
      'SELECT id, username, email, password_hash, role, permissions, is_active FROM users WHERE username = $1 OR email = $1',
      [username.trim()]
    );

    if (userRes.rows.length === 0) {
      // Record failed login log
      await query(
        `INSERT INTO user_login_logs (username, ip_address, user_agent, status, failure_reason)
         VALUES ($1, $2, $3, 'failed', 'User not found')`,
        [username, ipAddress, userAgent]
      );
      return res.status(401).json({ success: false, error: 'Invalid credentials provided' });
    }

    const user = userRes.rows[0];

    if (!user.is_active) {
      await query(
        `INSERT INTO user_login_logs (user_id, username, ip_address, user_agent, status, failure_reason)
         VALUES ($1, $2, $3, $4, 'failed', 'Account is deactivated')`,
        [user.id, user.username, ipAddress, userAgent]
      );
      return res.status(403).json({ success: false, error: 'Account is deactivated. Contact administrator.' });
    }

    const isMatch = await bcrypt.compare(password, user.password_hash);
    if (!isMatch) {
      await query(
        `INSERT INTO user_login_logs (user_id, username, ip_address, user_agent, status, failure_reason)
         VALUES ($1, $2, $3, $4, 'failed', 'Invalid password')`,
        [user.id, user.username, ipAddress, userAgent]
      );
      return res.status(401).json({ success: false, error: 'Invalid credentials provided' });
    }

    // Success login log
    await query(
      `INSERT INTO user_login_logs (user_id, username, ip_address, user_agent, status)
       VALUES ($1, $2, $3, $4, 'success')`,
      [user.id, user.username, ipAddress, userAgent]
    );

    // Generate JWT
    const token = jwt.sign(
      {
        userId: user.id,
        username: user.username,
        role: user.role
      },
      JWT_SECRET,
      { expiresIn: JWT_EXPIRES_IN }
    );

    // Audit trail
    await recordAudit(
      { user, headers: req.headers, socket: req.socket },
      { action: 'LOGIN', entity: 'auth', entityId: user.id, details: { role: user.role } }
    );

    logger.info(`[AUTH] Successful login for user: ${user.username} (${user.role})`);

    return res.json({
      success: true,
      token,
      user: {
        id: user.id,
        username: user.username,
        email: user.email,
        role: user.role,
        permissions: user.permissions
      }
    });
  } catch (err) {
    logger.error(`[AUTH-LOGIN-ERROR] ${err.message}`);
    return res.status(500).json({ success: false, error: 'Internal server error during authentication' });
  }
});

/**
 * GET /api/auth/me
 * Get active authenticated user details
 */
router.get('/me', authenticateToken, async (req, res) => {
  return res.json({
    success: true,
    user: {
      id: req.user.id,
      username: req.user.username,
      email: req.user.email,
      role: req.user.role,
      permissions: req.user.permissions
    }
  });
});

/**
 * POST /api/auth/logout
 * Safe termination of session and audit recording
 */
router.post('/logout', async (req, res) => {
  try {
    const authHeader = req.headers['authorization'];
    if (authHeader) {
      const token = authHeader.split(' ')[1];
      if (token) {
        try {
          const decoded = jwt.verify(token, JWT_SECRET);
          await recordAudit(
            { user: decoded, headers: req.headers, socket: req.socket },
            {
              action: 'LOGOUT',
              entity: 'auth',
              entityId: decoded.userId || decoded.id,
              details: { username: decoded.username }
            }
          );
          logger.info(`[AUTH] User signed out: ${decoded.username}`);
        } catch {}
      }
    }
  } catch (err) {
    logger.warn(`[AUTH-LOGOUT-WARN] ${err.message}`);
  }
  return res.json({ success: true, message: 'Logged out successfully' });
});

/**
 * GET /api/auth/login-history
 * Recent login tracking
 */
router.get('/login-history', authenticateToken, async (req, res) => {
  try {
    let logsQuery;
    let params;

    if (req.user.role === 'admin' || req.user.role === 'manager') {
      logsQuery = 'SELECT * FROM user_login_logs ORDER BY created_at DESC LIMIT 50';
      params = [];
    } else {
      logsQuery = 'SELECT * FROM user_login_logs WHERE user_id = $1 ORDER BY created_at DESC LIMIT 30';
      params = [req.user.id];
    }

    const logsRes = await query(logsQuery, params);
    return res.json({ success: true, logs: logsRes.rows });
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message });
  }
});

module.exports = router;
