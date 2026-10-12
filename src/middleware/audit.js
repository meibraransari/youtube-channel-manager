const { query } = require('../config/db');
const { logger } = require('../config/logger');

/**
 * Record an action into the audit_logs table
 * @param {Object} req Express request object
 * @param {Object} params { action, entity, entityId, details }
 */
async function recordAudit(req, { action, entity, entityId, details }) {
  try {
    const userId = req && req.user ? req.user.id : null;
    const username = req && req.user ? req.user.username : 'system_anonymous';
    const ipAddress = req ? (req.headers['x-forwarded-for'] || req.socket.remoteAddress || '127.0.0.1') : '127.0.0.1';

    await query(
      `INSERT INTO audit_logs (user_id, username, action, entity, entity_id, details, ip_address)
       VALUES ($1, $2, $3, $4, $5, $6, $7)`,
      [
        userId,
        username,
        action,
        entity,
        entityId ? String(entityId) : null,
        details ? JSON.stringify(details) : null,
        String(ipAddress).substring(0, 50)
      ]
    );

    logger.debug(`[AUDIT] ${action} on ${entity} (${entityId || 'none'}) by ${username}`);
  } catch (err) {
    logger.error(`[AUDIT-ERROR] Failed to write audit log: ${err.message}`);
  }
}

module.exports = {
  recordAudit
};
