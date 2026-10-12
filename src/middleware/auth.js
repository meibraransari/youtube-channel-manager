const jwt = require('jsonwebtoken');
const { query } = require('../config/db');

const JWT_SECRET = process.env.JWT_SECRET || 'b69813b7a1314525b72b44496f823649115e3ae13fcf2ba24ec9a93a63006953';

/**
 * Middleware to verify JWT token from Authorization header or cookie
 */
async function authenticateToken(req, res, next) {
  try {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.startsWith('Bearer ') 
      ? authHeader.slice(7) 
      : (req.query.token || req.headers['x-access-token']);

    if (!token) {
      return res.status(401).json({ 
        success: false, 
        error: 'Authentication required. No access token provided.' 
      });
    }

    const decoded = jwt.verify(token, JWT_SECRET);

    // Verify user exists and is active in database
    const userRes = await query(
      'SELECT id, username, email, role, permissions, is_active FROM users WHERE id = $1',
      [decoded.userId]
    );

    if (userRes.rows.length === 0) {
      return res.status(401).json({ success: false, error: 'User account not found.' });
    }

    const user = userRes.rows[0];
    if (!user.is_active) {
      return res.status(403).json({ success: false, error: 'User account is deactivated.' });
    }

    req.user = user;
    next();
  } catch (err) {
    return res.status(401).json({ 
      success: false, 
      error: 'Invalid or expired token', 
      details: err.message 
    });
  }
}

/**
 * Check if current user has any of the allowed roles
 */
function requireRole(...roles) {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ success: false, error: 'Unauthenticated' });
    }
    if (req.user.role === 'admin' || roles.includes(req.user.role)) {
      return next();
    }
    return res.status(403).json({ 
      success: false, 
      error: `Access denied. Requires one of roles: [${roles.join(', ')}]` 
    });
  };
}

/**
 * Check if current user has a specific granular permission
 */
function requirePermission(permissionName) {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ success: false, error: 'Unauthenticated' });
    }
    // Admin always has all permissions
    if (req.user.role === 'admin') {
      return next();
    }

    const perms = Array.isArray(req.user.permissions) ? req.user.permissions : [];
    if (perms.includes(permissionName)) {
      return next();
    }

    return res.status(403).json({ 
      success: false, 
      error: `Access denied. Required permission: '${permissionName}'` 
    });
  };
}

module.exports = {
  authenticateToken,
  requireRole,
  requirePermission
};
