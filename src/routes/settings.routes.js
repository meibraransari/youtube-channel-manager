const express = require('express');
const router = express.Router();
const { query } = require('../config/db');
const { authenticateToken, requirePermission, requireRole } = require('../middleware/auth');
const { recordAudit } = require('../middleware/audit');
const { logger, setLogLevel } = require('../config/logger');
const { testSmtpConnection, getSmtpConfig } = require('../services/smtp.service');
const { reloadCronScheduler } = require('../services/cronSync');
const { 
  sendTelemetryReport, 
  collectTelemetryData, 
  buildTelemetryReportHtml, 
  reloadTelemetryReportScheduler,
  getTelemetryReportConfig 
} = require('../services/telemetryReport.service');

/**
 * GET /api/settings
 * List all settings
 */
router.get('/', authenticateToken, async (req, res) => {
  try {
    const settingsRes = await query('SELECT key, value, category, description, updated_at FROM system_settings ORDER BY category, key');
    
    // Format into map and array
    const settingsMap = {};
    settingsRes.rows.forEach(row => {
      let val = row.value;
      settingsMap[row.key] = val;
    });

    return res.json({
      success: true,
      settings: settingsMap,
      details: settingsRes.rows,
      activeLogLevel: logger.level
    });
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message });
  }
});

/**
 * PUT /api/settings/:key
 * Update a single setting
 */
router.put('/:key', authenticateToken, requirePermission('can_manage_settings'), async (req, res) => {
  try {
    const { key } = req.params;
    const { value, description } = req.body;

    if (value === undefined) {
      return res.status(400).json({ success: false, error: 'Setting value is required' });
    }

    // Special handler for dynamic console log level
    if (key === 'console_log_level') {
      const cleanLevel = typeof value === 'string' ? value.toLowerCase() : String(value).toLowerCase();
      setLogLevel(cleanLevel);
    }

    const updateRes = await query(
      `INSERT INTO system_settings (key, value, description, updated_at, updated_by)
       VALUES ($1, $2, $3, CURRENT_TIMESTAMP, $4)
       ON CONFLICT (key) DO UPDATE SET
        value = EXCLUDED.value,
        description = COALESCE(EXCLUDED.description, system_settings.description),
        updated_at = CURRENT_TIMESTAMP,
        updated_by = EXCLUDED.updated_by
       RETURNING *`,
      [
        key,
        JSON.stringify(value),
        description || null,
        req.user.id
      ]
    );

    // Reload schedulers dynamically if relevant keys changed
    if (key.startsWith('telemetry_report_')) {
      reloadTelemetryReportScheduler().catch(e => logger.warn(`[SCHEDULER-RELOAD] ${e.message}`));
    }
    if (key.startsWith('cron_sync_')) {
      reloadCronScheduler().catch(e => logger.warn(`[CRON-RELOAD] ${e.message}`));
    }

    await recordAudit(req, {
      action: 'SETTINGS_CHANGE',
      entity: 'setting',
      entityId: key,
      details: { key, newValue: value }
    });

    return res.json({
      success: true,
      setting: updateRes.rows[0],
      activeLogLevel: logger.level
    });
  } catch (err) {
    logger.error(`[SETTINGS-UPDATE-ERROR] ${err.message}`);
    return res.status(500).json({ success: false, error: err.message });
  }
});

/**
 * PUT /api/settings
 * Bulk update settings
 */
router.put('/', authenticateToken, requirePermission('can_manage_settings'), async (req, res) => {
  try {
    const { settings } = req.body; // { key: value, ... }

    if (!settings || typeof settings !== 'object') {
      return res.status(400).json({ success: false, error: 'Settings object is required' });
    }

    const updatedKeys = [];

    for (const [key, value] of Object.entries(settings)) {
      if (key === 'console_log_level') {
        setLogLevel(String(value).toLowerCase());
      }

      await query(
        `INSERT INTO system_settings (key, value, updated_at, updated_by)
         VALUES ($1, $2, CURRENT_TIMESTAMP, $3)
         ON CONFLICT (key) DO UPDATE SET
          value = EXCLUDED.value,
          updated_at = CURRENT_TIMESTAMP,
          updated_by = EXCLUDED.updated_by`,
        [key, JSON.stringify(value), req.user.id]
      );
      updatedKeys.push(key);
    }

    // Reload schedulers dynamically if relevant keys changed
    if (updatedKeys.some(k => k.startsWith('telemetry_report_'))) {
      reloadTelemetryReportScheduler().catch(e => logger.warn(`[SCHEDULER-RELOAD] ${e.message}`));
    }
    if (updatedKeys.some(k => k.startsWith('cron_sync_'))) {
      reloadCronScheduler().catch(e => logger.warn(`[CRON-RELOAD] ${e.message}`));
    }

    await recordAudit(req, {
      action: 'SETTINGS_CHANGE',
      entity: 'setting',
      entityId: 'bulk',
      details: { updatedKeys }
    });

    return res.json({
      success: true,
      message: `Updated ${updatedKeys.length} settings successfully`,
      activeLogLevel: logger.level
    });
  } catch (err) {
    logger.error(`[SETTINGS-BULK-UPDATE-ERROR] ${err.message}`);
    return res.status(500).json({ success: false, error: err.message });
  }
});

/**
 * POST /api/settings/test-smtp
 * Test SMTP server connectivity and optionally dispatch a live test email
 */
router.post('/test-smtp', authenticateToken, requirePermission('can_manage_settings'), async (req, res) => {
  try {
    const { 
      smtp_host, 
      smtp_port, 
      smtp_encryption, 
      smtp_auth_enabled, 
      smtp_user, 
      smtp_pass, 
      smtp_from_email, 
      smtp_from_name,
      smtp_allow_self_signed,
      smtp_timeout_seconds,
      test_recipient_email 
    } = req.body;

    const recipient = (test_recipient_email || req.user.email || '').trim();
    if (!recipient) {
      return res.status(400).json({ 
        success: false, 
        error: 'Recipient email address is required to dispatch a test email.' 
      });
    }

    const testResult = await testSmtpConnection({
      smtp_host,
      smtp_port,
      smtp_encryption,
      smtp_auth_enabled,
      smtp_user,
      smtp_pass,
      smtp_from_email,
      smtp_from_name,
      smtp_allow_self_signed,
      smtp_timeout_seconds
    }, recipient, req.user.username);

    await recordAudit(req, {
      action: 'SMTP_TEST',
      entity: 'settings',
      entityId: 'smtp',
      details: {
        host: testResult.host,
        port: testResult.port,
        recipient,
        latencyMs: testResult.totalLatencyMs
      }
    });

    return res.json({
      success: true,
      message: `SMTP connection verified and test email delivered to ${recipient}!`,
      details: testResult
    });
  } catch (err) {
    logger.error(`[SMTP-TEST-FAILED] ${err.message}`);
    return res.status(400).json({
      success: false,
      error: err.message,
      code: err.code || 'SMTP_ERROR',
      command: err.command || null
    });
  }
});

/**
 * POST /api/settings/telemetry-report/preview
 * Generate live rendered HTML preview of the telemetry report email without sending
 */
router.post('/telemetry-report/preview', authenticateToken, requirePermission('can_manage_settings'), async (req, res) => {
  try {
    const { 
      metrics, 
      templateTheme, 
      customNotes, 
      customTemplate, 
      recipients, 
      cron 
    } = req.body;

    const savedConfig = await getTelemetryReportConfig();
    const config = {
      ...savedConfig,
      ...(metrics ? { metrics } : {}),
      ...(templateTheme ? { templateTheme } : {}),
      ...(customNotes !== undefined ? { customNotes } : {}),
      ...(customTemplate !== undefined ? { customTemplate } : {}),
      ...(recipients ? { recipients } : {}),
      ...(cron ? { cron } : {})
    };

    const smtpConfig = await getSmtpConfig();
    const fromName = (smtpConfig.smtp_from_name || 'YouTube Channel Manager').trim();
    const fromEmail = (smtpConfig.smtp_from_email || smtpConfig.smtp_user || `noreply@${smtpConfig.smtp_host || 'localhost'}`).trim();
    const fromFormatted = `"${fromName}" <${fromEmail}>`;

    const telemetry = await collectTelemetryData();
    const html = buildTelemetryReportHtml(telemetry, config, { fromFormatted, fromEmail });

    return res.json({
      success: true,
      html,
      telemetrySummary: {
        totalChannels: telemetry.totalChannels,
        totalSubscribers: telemetry.totalSubscribers,
        totalViews: telemetry.totalViews,
        catalogItems: telemetry.totalCatalogItems,
        dbLatencyMs: telemetry.serverHealth.dbLatencyMs
      }
    });
  } catch (err) {
    logger.error(`[TELEMETRY-PREVIEW-ERROR] ${err.message}`);
    return res.status(500).json({ success: false, error: err.message });
  }
});

/**
 * POST /api/settings/telemetry-report/test
 * Immediately dispatch a live telemetry report email to configured or provided recipients
 */
router.post('/telemetry-report/test', authenticateToken, requirePermission('can_manage_settings'), async (req, res) => {
  try {
    const { 
      recipients, 
      metrics, 
      templateTheme, 
      customNotes, 
      customTemplate, 
      cron 
    } = req.body;

    const customConfig = {};
    if (metrics) customConfig.metrics = metrics;
    if (templateTheme) customConfig.templateTheme = templateTheme;
    if (customNotes !== undefined) customConfig.customNotes = customNotes;
    if (customTemplate !== undefined) customConfig.customTemplate = customTemplate;
    if (cron) customConfig.cron = cron;

    const targetRecipients = recipients || undefined;

    const result = await sendTelemetryReport({
      recipients: targetRecipients,
      customConfig,
      triggeredBy: req.user.username
    });

    await recordAudit(req, {
      action: 'TELEMETRY_REPORT_TEST',
      entity: 'settings',
      entityId: 'telemetry_report',
      details: {
        recipients: result.recipients,
        messageId: result.messageId,
        metrics: customConfig.metrics || 'default'
      }
    });

    return res.json({
      success: true,
      message: result.message,
      details: result
    });
  } catch (err) {
    logger.error(`[TELEMETRY-TEST-ERROR] ${err.message}`);
    return res.status(400).json({
      success: false,
      error: err.message
    });
  }
});

/**
 * POST /api/settings/flush-all
 * DANGER ZONE: Purges all content assets, channel metrics, snapshots, audit history,
 * login records, and non-admin users. Restores a clean, zero-data operational baseline.
 */
router.post('/flush-all', authenticateToken, requireRole('admin'), async (req, res) => {
  try {
    const { answer, expected, confirmed } = req.body;

    if (!confirmed) {
      return res.status(400).json({ 
        success: false, 
        error: 'Mandatory confirmation checkbox was not checked.' 
      });
    }

    if (answer === undefined || expected === undefined || parseInt(answer, 10) !== parseInt(expected, 10)) {
      return res.status(400).json({ 
        success: false, 
        error: 'Verification math answer is incorrect. System flush aborted.' 
      });
    }

    logger.warn(`[DANGER-ZONE] FLUSH ALL DATA initiated by root admin: ${req.user.username} (${req.user.id})`);

    // 1. Delete all channel snapshots
    await query('DELETE FROM channel_snapshots');

    // 2. Delete all content items
    await query('DELETE FROM content_items');

    // 3. Reset content items serial ID sequence to clean 1
    await query("SELECT setval('content_items_id_seq', 1, false)");

    // 4. Completely purge all channels (0 channels baseline)
    await query('DELETE FROM channels');

    // 5. Delete migration history
    await query('DELETE FROM migration_history');

    // 6. Delete user login logs
    await query('DELETE FROM user_login_logs');

    // 7. Delete all server configs
    await query('DELETE FROM server_configs');

    // 8. Delete all users except root admin
    await query("DELETE FROM users WHERE username != 'admin'");

    // 9. Reset channel branding in system_settings
    await query(`
      UPDATE system_settings SET value = '""'::jsonb 
      WHERE key IN ('channel_name', 'channel_handle', 'channel_url', 'author_name', 'youtube_api_key')
    `);

    // 10. Clear previous audit logs and insert single clean audit event
    await query('DELETE FROM audit_logs');
    await query(`
      INSERT INTO audit_logs (user_id, username, action, entity, entity_id, details)
      VALUES ($1, $2, 'FLUSH_ALL', 'system', 'system', '{"message": "Complete system data flush executed: all channels, content assets, snapshots, and logs purged"}')
    `, [req.user.id, req.user.username]);

    logger.info(`[DANGER-ZONE] FLUSH ALL DATA completed successfully by ${req.user.username}`);

    return res.json({
      success: true,
      message: 'All content assets, channels, historical snapshots, telemetry logs, and extra accounts have been permanently purged.'
    });
  } catch (err) {
    logger.error(`[FLUSH-ALL-ERROR] ${err.message}`);
    return res.status(500).json({ success: false, error: err.message });
  }
});

module.exports = router;
