const express = require('express');
const router = express.Router();
const crypto = require('crypto');
const { query } = require('../config/db');
const { authenticateToken, requirePermission } = require('../middleware/auth');
const { recordAudit } = require('../middleware/audit');
const { logger } = require('../config/logger');

/**
 * Helper to fetch global n8n settings
 */
async function getN8nSystemSettings() {
  try {
    const res = await query(
      `SELECT key, value FROM system_settings WHERE key IN (
        'n8n_base_url', 'n8n_api_key', 'n8n_default_webhook_token',
        'n8n_default_timeout_seconds', 'n8n_integration_enabled'
      )`
    );
    const settings = {
      baseUrl: 'http://localhost:5678',
      apiKey: '',
      webhookToken: '',
      timeoutSeconds: 30,
      enabled: true
    };
    res.rows.forEach(r => {
      let val = r.value;
      if (typeof val === 'string') val = val.replace(/^"|"$/g, '');
      if (r.key === 'n8n_base_url') settings.baseUrl = val;
      if (r.key === 'n8n_api_key') settings.apiKey = val;
      if (r.key === 'n8n_default_webhook_token') settings.webhookToken = val;
      if (r.key === 'n8n_default_timeout_seconds') settings.timeoutSeconds = parseInt(val, 10) || 30;
      if (r.key === 'n8n_integration_enabled') settings.enabled = val === true || val === 'true';
    });
    return settings;
  } catch (err) {
    logger.warn(`[N8N-CONFIG] Error fetching n8n settings: ${err.message}`);
    return {
      baseUrl: 'http://localhost:5678',
      apiKey: '',
      webhookToken: '',
      timeoutSeconds: 30,
      enabled: true
    };
  }
}

/**
 * GET /api/n8n/workflows
 * List all n8n workflows with aggregated execution statistics
 */
router.get('/workflows', authenticateToken, requirePermission('can_view_content'), async (req, res) => {
  try {
    const { category, status, search } = req.query;

    let sql = `
      SELECT 
        w.*,
        COALESCE(COUNT(e.id), 0)::int AS total_executions,
        COALESCE(COUNT(CASE WHEN e.status = 'success' THEN 1 END), 0)::int AS success_executions,
        COALESCE(COUNT(CASE WHEN e.status = 'failed' THEN 1 END), 0)::int AS failed_executions,
        COALESCE(ROUND(AVG(e.duration_ms)), 0)::int AS avg_duration_ms
      FROM n8n_workflows w
      LEFT JOIN n8n_executions e ON w.id = e.workflow_id
      WHERE 1=1
    `;
    const params = [];

    if (category && category !== 'all') {
      params.push(category);
      sql += ` AND w.category = $${params.length}`;
    }

    if (status === 'active') {
      sql += ` AND w.is_active = TRUE`;
    } else if (status === 'inactive') {
      sql += ` AND w.is_active = FALSE`;
    }

    if (search && search.trim()) {
      params.push(`%${search.trim().toLowerCase()}%`);
      sql += ` AND (LOWER(w.name) LIKE $${params.length} OR LOWER(w.description) LIKE $${params.length} OR LOWER(w.category) LIKE $${params.length} OR LOWER(w.webhook_url) LIKE $${params.length})`;
    }

    sql += ` GROUP BY w.id ORDER BY w.is_active DESC, w.created_at DESC`;

    const workflowsRes = await query(sql, params);

    // Aggregate overview stats
    const statsRes = await query(`
      SELECT 
        COUNT(DISTINCT w.id)::int AS total_workflows,
        COUNT(DISTINCT CASE WHEN w.is_active THEN w.id END)::int AS active_workflows,
        COUNT(e.id)::int AS total_executions,
        COUNT(CASE WHEN e.status = 'success' THEN 1 END)::int AS total_success,
        COUNT(CASE WHEN e.status = 'failed' THEN 1 END)::int AS total_failed,
        COALESCE(ROUND(AVG(e.duration_ms)), 0)::int AS global_avg_duration
      FROM n8n_workflows w
      LEFT JOIN n8n_executions e ON w.id = e.workflow_id
    `);

    // Unique categories
    const catRes = await query(`SELECT DISTINCT category FROM n8n_workflows ORDER BY category ASC`);
    const categories = catRes.rows.map(r => r.category);

    return res.json({
      success: true,
      count: workflowsRes.rows.length,
      workflows: workflowsRes.rows,
      summary: statsRes.rows[0] || {},
      categories
    });
  } catch (err) {
    logger.error(`[N8N-LIST-WORKFLOWS-ERROR] ${err.message}`);
    return res.status(500).json({ success: false, error: err.message });
  }
});

/**
 * GET /api/n8n/workflows/:id
 * Retrieve a single n8n workflow and its recent execution history
 */
router.get('/workflows/:id', authenticateToken, requirePermission('can_view_content'), async (req, res) => {
  try {
    const { id } = req.params;
    const wfRes = await query(`SELECT * FROM n8n_workflows WHERE id = $1`, [id]);
    if (wfRes.rows.length === 0) {
      return res.status(404).json({ success: false, error: `Workflow "${id}" not found.` });
    }

    const execRes = await query(
      `SELECT * FROM n8n_executions WHERE workflow_id = $1 ORDER BY created_at DESC LIMIT 15`,
      [id]
    );

    return res.json({
      success: true,
      workflow: wfRes.rows[0],
      recentExecutions: execRes.rows
    });
  } catch (err) {
    logger.error(`[N8N-GET-WORKFLOW-ERROR] ${err.message}`);
    return res.status(500).json({ success: false, error: err.message });
  }
});

/**
 * POST /api/n8n/workflows
 * Create a new n8n automation workflow
 */
router.post('/workflows', authenticateToken, requirePermission('can_manage_content'), async (req, res) => {
  try {
    const {
      id: customId,
      name,
      description,
      category,
      webhook_url,
      test_webhook_url,
      http_method = 'POST',
      auth_header_name,
      auth_header_value,
      payload_template = {},
      timeout_seconds = 30,
      is_active = true
    } = req.body;

    if (!name || !name.trim()) {
      return res.status(400).json({ success: false, error: 'Workflow name is required.' });
    }

    if (!webhook_url || !webhook_url.trim()) {
      return res.status(400).json({ success: false, error: 'Webhook URL is required.' });
    }

    // Check duplicate name
    const dupCheck = await query('SELECT id FROM n8n_workflows WHERE LOWER(name) = LOWER($1)', [name.trim()]);
    if (dupCheck.rows.length > 0) {
      return res.status(409).json({ success: false, error: `A workflow with the name "${name.trim()}" already exists.` });
    }

    // Generate clean ID if not provided
    let workflowId = customId && customId.trim() ? customId.trim() : null;
    if (!workflowId) {
      const slug = name.trim().toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 30);
      const rand = crypto.randomBytes(3).toString('hex');
      workflowId = `wf-${slug || 'n8n'}-${rand}`;
    }

    // Ensure payload_template is valid JSON/object
    let parsedPayload = payload_template;
    if (typeof parsedPayload === 'string') {
      try {
        parsedPayload = JSON.parse(parsedPayload);
      } catch (_) {
        parsedPayload = {};
      }
    }

    const insertRes = await query(
      `INSERT INTO n8n_workflows (
        id, name, description, category, webhook_url, test_webhook_url,
        http_method, auth_header_name, auth_header_value, payload_template,
        timeout_seconds, is_active, created_by, updated_by
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)
      RETURNING *`,
      [
        workflowId,
        name.trim(),
        description ? description.trim() : null,
        category ? category.trim() : 'Automation',
        webhook_url.trim(),
        test_webhook_url ? test_webhook_url.trim() : null,
        (http_method || 'POST').toUpperCase(),
        auth_header_name ? auth_header_name.trim() : null,
        auth_header_value ? auth_header_value.trim() : null,
        JSON.stringify(parsedPayload),
        parseInt(timeout_seconds, 10) || 30,
        Boolean(is_active),
        req.user ? req.user.id : null,
        req.user ? req.user.id : null
      ]
    );

    const created = insertRes.rows[0];

    await recordAudit(req, {
      action: 'N8N_WORKFLOW_CREATE',
      entity: 'n8n_workflow',
      entityId: created.id,
      details: { name: created.name, category: created.category, webhook_url: created.webhook_url }
    });

    return res.status(201).json({
      success: true,
      message: `n8n Workflow "${created.name}" created successfully!`,
      workflow: created
    });
  } catch (err) {
    logger.error(`[N8N-CREATE-WORKFLOW-ERROR] ${err.message}`);
    return res.status(500).json({ success: false, error: err.message });
  }
});

/**
 * PUT /api/n8n/workflows/:id
 * Update an existing n8n automation workflow
 */
router.put('/workflows/:id', authenticateToken, requirePermission('can_manage_content'), async (req, res) => {
  try {
    const { id } = req.params;
    const {
      name,
      description,
      category,
      webhook_url,
      test_webhook_url,
      http_method,
      auth_header_name,
      auth_header_value,
      payload_template,
      timeout_seconds,
      is_active
    } = req.body;

    const checkRes = await query('SELECT * FROM n8n_workflows WHERE id = $1', [id]);
    if (checkRes.rows.length === 0) {
      return res.status(404).json({ success: false, error: `Workflow "${id}" not found.` });
    }
    const prev = checkRes.rows[0];

    if (name && name.trim()) {
      const dupCheck = await query('SELECT id FROM n8n_workflows WHERE LOWER(name) = LOWER($1) AND id != $2', [name.trim(), id]);
      if (dupCheck.rows.length > 0) {
        return res.status(409).json({ success: false, error: `Another workflow with the name "${name.trim()}" already exists.` });
      }
    }

    let parsedPayload = payload_template !== undefined ? payload_template : prev.payload_template;
    if (typeof parsedPayload === 'string') {
      try { parsedPayload = JSON.parse(parsedPayload); } catch (_) {}
    }

    const updatedRes = await query(
      `UPDATE n8n_workflows SET
        name = COALESCE($1, name),
        description = $2,
        category = COALESCE($3, category),
        webhook_url = COALESCE($4, webhook_url),
        test_webhook_url = $5,
        http_method = COALESCE($6, http_method),
        auth_header_name = $7,
        auth_header_value = $8,
        payload_template = COALESCE($9, payload_template),
        timeout_seconds = COALESCE($10, timeout_seconds),
        is_active = COALESCE($11, is_active),
        updated_at = CURRENT_TIMESTAMP,
        updated_by = $12
      WHERE id = $13
      RETURNING *`,
      [
        name ? name.trim() : null,
        description !== undefined ? (description ? description.trim() : null) : prev.description,
        category ? category.trim() : null,
        webhook_url ? webhook_url.trim() : null,
        test_webhook_url !== undefined ? (test_webhook_url ? test_webhook_url.trim() : null) : prev.test_webhook_url,
        http_method ? http_method.toUpperCase() : null,
        auth_header_name !== undefined ? (auth_header_name ? auth_header_name.trim() : null) : prev.auth_header_name,
        auth_header_value !== undefined ? (auth_header_value ? auth_header_value.trim() : null) : prev.auth_header_value,
        parsedPayload !== undefined ? JSON.stringify(parsedPayload) : null,
        timeout_seconds !== undefined ? (parseInt(timeout_seconds, 10) || 30) : null,
        is_active !== undefined ? Boolean(is_active) : null,
        req.user ? req.user.id : null,
        id
      ]
    );

    const updated = updatedRes.rows[0];

    await recordAudit(req, {
      action: 'N8N_WORKFLOW_UPDATE',
      entity: 'n8n_workflow',
      entityId: updated.id,
      details: { name: updated.name, category: updated.category }
    });

    return res.json({
      success: true,
      message: `Workflow "${updated.name}" updated successfully!`,
      workflow: updated
    });
  } catch (err) {
    logger.error(`[N8N-UPDATE-WORKFLOW-ERROR] ${err.message}`);
    return res.status(500).json({ success: false, error: err.message });
  }
});

/**
 * DELETE /api/n8n/workflows/:id
 * Delete a workflow and all associated execution records
 */
router.delete('/workflows/:id', authenticateToken, requirePermission('can_manage_content'), async (req, res) => {
  try {
    const { id } = req.params;
    const checkRes = await query('SELECT name FROM n8n_workflows WHERE id = $1', [id]);
    if (checkRes.rows.length === 0) {
      return res.status(404).json({ success: false, error: `Workflow "${id}" not found.` });
    }
    const name = checkRes.rows[0].name;

    await query('DELETE FROM n8n_workflows WHERE id = $1', [id]);

    await recordAudit(req, {
      action: 'N8N_WORKFLOW_DELETE',
      entity: 'n8n_workflow',
      entityId: id,
      details: { name }
    });

    return res.json({
      success: true,
      message: `n8n Workflow "${name}" and all historical executions deleted successfully.`
    });
  } catch (err) {
    logger.error(`[N8N-DELETE-WORKFLOW-ERROR] ${err.message}`);
    return res.status(500).json({ success: false, error: err.message });
  }
});

/**
 * POST /api/n8n/workflows/:id/execute
 * Trigger an n8n workflow execution via webhook with real-time tracking
 */
router.post('/workflows/:id/execute', authenticateToken, requirePermission('can_manage_content'), async (req, res) => {
  const { id } = req.params;
  const { payload = {}, is_test = false, trigger_source = 'manual' } = req.body;
  const startTime = Date.now();

  try {
    // 1. Fetch workflow
    const wfRes = await query('SELECT * FROM n8n_workflows WHERE id = $1', [id]);
    if (wfRes.rows.length === 0) {
      return res.status(404).json({ success: false, error: `Workflow "${id}" not found.` });
    }
    const workflow = wfRes.rows[0];

    // 2. Fetch global settings
    const n8nSettings = await getN8nSystemSettings();
    if (!n8nSettings.enabled) {
      return res.status(403).json({
        success: false,
        error: 'n8n automation integration is currently paused in System Settings. Please enable it to fire webhooks.'
      });
    }

    if (!workflow.is_active) {
      return res.status(400).json({
        success: false,
        error: `Workflow "${workflow.name}" is currently marked as inactive. Activate it before executing.`
      });
    }

    // 3. Resolve target URL
    let targetUrl = workflow.webhook_url;
    if (is_test && workflow.test_webhook_url && workflow.test_webhook_url.trim()) {
      targetUrl = workflow.test_webhook_url.trim();
    }

    // If relative or localhost path without host, prepend base URL
    if (targetUrl.startsWith('/')) {
      targetUrl = `${n8nSettings.baseUrl.replace(/\/+$/, '')}${targetUrl}`;
    }

    // 4. Merge default template with incoming custom payload
    let mergedPayload = {};
    if (workflow.payload_template && typeof workflow.payload_template === 'object') {
      mergedPayload = { ...workflow.payload_template };
    }
    if (payload && typeof payload === 'object') {
      mergedPayload = { ...mergedPayload, ...payload };
    }

    // Append standard studio context headers
    mergedPayload._studio_context = {
      triggered_by: req.user ? req.user.username : 'admin',
      triggered_at: new Date().toISOString(),
      workflow_id: workflow.id,
      workflow_name: workflow.name,
      platform: 'YouTube Channel Manager v2.0'
    };

    // 5. Create initial execution record with 'running' status
    const executionId = `exec-${Date.now()}-${crypto.randomBytes(3).toString('hex')}`;
    const initialExecRes = await query(
      `INSERT INTO n8n_executions (
        workflow_id, workflow_name, execution_id, trigger_source, status,
        http_method, request_url, request_payload, triggered_by
      ) VALUES ($1, $2, $3, $4, 'running', $5, $6, $7, $8)
      RETURNING *`,
      [
        workflow.id,
        workflow.name,
        executionId,
        trigger_source,
        workflow.http_method,
        targetUrl,
        JSON.stringify(mergedPayload),
        req.user ? req.user.username : 'admin'
      ]
    );
    const executionRecord = initialExecRes.rows[0];

    // 6. Build request headers
    const requestHeaders = {
      'Content-Type': 'application/json',
      'Accept': 'application/json',
      'User-Agent': 'YouTubeChannelManager/2.0 (n8n-client)'
    };

    if (workflow.auth_header_name && workflow.auth_header_value) {
      requestHeaders[workflow.auth_header_name] = workflow.auth_header_value;
    } else if (n8nSettings.webhookToken) {
      requestHeaders['Authorization'] = `Bearer ${n8nSettings.webhookToken}`;
    }

    const timeoutMs = (workflow.timeout_seconds || n8nSettings.timeoutSeconds || 30) * 1000;
    const controller = new AbortController();
    const timeoutHandle = setTimeout(() => controller.abort(), timeoutMs);

    let httpStatus = null;
    let responsePayload = null;
    let errorMessage = null;
    let isSuccess = false;

    try {
      const fetchOptions = {
        method: workflow.http_method || 'POST',
        headers: requestHeaders,
        signal: controller.signal
      };

      if (['POST', 'PUT', 'PATCH'].includes((workflow.http_method || 'POST').toUpperCase())) {
        fetchOptions.body = JSON.stringify(mergedPayload);
      }

      logger.info(`[N8N-TRIGGER] Dispatching webhook to: ${targetUrl} (method: ${workflow.http_method})`);
      const response = await fetch(targetUrl, fetchOptions);
      clearTimeout(timeoutHandle);

      httpStatus = response.status;
      const responseText = await response.text();

      try {
        responsePayload = JSON.parse(responseText);
      } catch (_) {
        responsePayload = { raw_response: responseText };
      }

      // Check success (200-299)
      if (response.ok) {
        isSuccess = true;
      } else {
        isSuccess = false;
        errorMessage = `Webhook returned HTTP status ${response.status} (${response.statusText}): ${responseText.slice(0, 300)}`;
      }
    } catch (requestErr) {
      clearTimeout(timeoutHandle);
      isSuccess = false;
      if (requestErr.name === 'AbortError') {
        errorMessage = `Webhook execution timed out after ${workflow.timeout_seconds || 30} seconds.`;
        httpStatus = 504;
      } else {
        errorMessage = `Webhook network failure: ${requestErr.message}`;
        httpStatus = 502;
      }
      responsePayload = { error: errorMessage };
    }

    const durationMs = Date.now() - startTime;
    const finalStatus = isSuccess ? 'success' : 'failed';

    // 7. Update execution record in PostgreSQL
    const updatedExecRes = await query(
      `UPDATE n8n_executions SET
        status = $1,
        status_code = $2,
        response_payload = $3,
        error_message = $4,
        duration_ms = $5,
        completed_at = CURRENT_TIMESTAMP
      WHERE id = $6
      RETURNING *`,
      [
        finalStatus,
        httpStatus,
        JSON.stringify(responsePayload),
        errorMessage,
        durationMs,
        executionRecord.id
      ]
    );

    // 8. Update workflow last execution status
    await query(
      `UPDATE n8n_workflows SET
        last_executed_at = CURRENT_TIMESTAMP,
        last_execution_status = $1
      WHERE id = $2`,
      [finalStatus, workflow.id]
    );

    // 9. Record audit log
    await recordAudit(req, {
      action: 'N8N_EXECUTE',
      entity: 'n8n_workflow',
      entityId: workflow.id,
      details: {
        execution_id: executionId,
        workflow_name: workflow.name,
        status: finalStatus,
        http_status: httpStatus,
        duration_ms: durationMs,
        is_test
      }
    });

    const finalExec = updatedExecRes.rows[0];

    return res.status(isSuccess ? 200 : (httpStatus >= 400 && httpStatus < 600 ? httpStatus : 500)).json({
      success: isSuccess,
      message: isSuccess 
        ? `n8n Workflow "${workflow.name}" triggered successfully (${httpStatus} in ${durationMs}ms)!`
        : `n8n Workflow failed: ${errorMessage}`,
      execution: finalExec,
      durationMs,
      statusCode: httpStatus,
      response: responsePayload
    });
  } catch (err) {
    logger.error(`[N8N-EXECUTE-ERROR] ${err.message}`);
    return res.status(500).json({ success: false, error: err.message, durationMs: Date.now() - startTime });
  }
});

/**
 * GET /api/n8n/executions
 * List historical workflow execution records with pagination & filters
 */
router.get('/executions', authenticateToken, requirePermission('can_view_content'), async (req, res) => {
  try {
    const { workflow_id, status, search, page = 1, limit = 25 } = req.query;
    const pageNum = Math.max(1, parseInt(page, 10) || 1);
    const limitNum = Math.min(100, Math.max(1, parseInt(limit, 10) || 25));
    const offset = (pageNum - 1) * limitNum;

    let sql = `SELECT * FROM n8n_executions WHERE 1=1`;
    const params = [];

    if (workflow_id && workflow_id !== 'all') {
      params.push(workflow_id);
      sql += ` AND workflow_id = $${params.length}`;
    }

    if (status && status !== 'all') {
      params.push(status);
      sql += ` AND status = $${params.length}`;
    }

    if (search && search.trim()) {
      params.push(`%${search.trim().toLowerCase()}%`);
      sql += ` AND (LOWER(workflow_name) LIKE $${params.length} OR LOWER(execution_id) LIKE $${params.length} OR LOWER(request_url) LIKE $${params.length} OR LOWER(COALESCE(error_message, '')) LIKE $${params.length})`;
    }

    // Count query
    const countSql = sql.replace('SELECT *', 'SELECT COUNT(*)::int as total');
    const countRes = await query(countSql, params);
    const totalRecords = countRes.rows[0] ? countRes.rows[0].total : 0;

    sql += ` ORDER BY created_at DESC LIMIT $${params.length + 1} OFFSET $${params.length + 2}`;
    params.push(limitNum, offset);

    const execRes = await query(sql, params);

    return res.json({
      success: true,
      count: execRes.rows.length,
      executions: execRes.rows,
      pagination: {
        page: pageNum,
        limit: limitNum,
        total: totalRecords,
        totalPages: Math.ceil(totalRecords / limitNum) || 1
      }
    });
  } catch (err) {
    logger.error(`[N8N-LIST-EXECUTIONS-ERROR] ${err.message}`);
    return res.status(500).json({ success: false, error: err.message });
  }
});

/**
 * GET /api/n8n/executions/:id
 * Retrieve details for a single execution record
 */
router.get('/executions/:id', authenticateToken, requirePermission('can_view_content'), async (req, res) => {
  try {
    const { id } = req.params;
    const execRes = await query(`SELECT * FROM n8n_executions WHERE id = $1`, [id]);
    if (execRes.rows.length === 0) {
      return res.status(404).json({ success: false, error: `Execution record "${id}" not found.` });
    }
    return res.json({
      success: true,
      execution: execRes.rows[0]
    });
  } catch (err) {
    logger.error(`[N8N-GET-EXECUTION-ERROR] ${err.message}`);
    return res.status(500).json({ success: false, error: err.message });
  }
});

/**
 * DELETE /api/n8n/executions
 * Clear all historical execution logs (or by workflow_id)
 */
router.delete('/executions', authenticateToken, requirePermission('can_manage_content'), async (req, res) => {
  try {
    const { workflow_id } = req.query;
    let deleteSql = 'DELETE FROM n8n_executions';
    const params = [];

    if (workflow_id && workflow_id !== 'all') {
      params.push(workflow_id);
      deleteSql += ' WHERE workflow_id = $1';
    }

    const delRes = await query(deleteSql, params);

    await recordAudit(req, {
      action: 'N8N_EXECUTIONS_CLEAR',
      entity: 'n8n_execution',
      details: { workflow_id: workflow_id || 'all', cleared_count: delRes.rowCount }
    });

    return res.json({
      success: true,
      message: `Cleared ${delRes.rowCount} execution records from history.`
    });
  } catch (err) {
    logger.error(`[N8N-CLEAR-EXECUTIONS-ERROR] ${err.message}`);
    return res.status(500).json({ success: false, error: err.message });
  }
});

/**
 * POST /api/n8n/test-connection
 * Test reachability and ping an n8n instance or webhook URL
 */
router.post('/test-connection', authenticateToken, requirePermission('can_manage_settings'), async (req, res) => {
  const { target_url, baseUrl, url, apiKey } = req.body || {};
  const startTime = Date.now();

  try {
    const settings = await getN8nSystemSettings();
    const rawTarget = target_url || baseUrl || url;
    const testUrl = (rawTarget && typeof rawTarget === 'string' && rawTarget.trim()) ? rawTarget.trim() : settings.baseUrl;

    if (!testUrl) {
      return res.status(400).json({ success: false, error: 'Target URL is required to test reachability.' });
    }

    const controller = new AbortController();
    const timeoutHandle = setTimeout(() => controller.abort(), 8000);

    const headers = { 'User-Agent': 'YouTubeChannelManager/2.0 (connectivity-test)' };
    const effectiveApiKey = apiKey !== undefined ? apiKey : settings.apiKey;
    if (effectiveApiKey) {
      headers['X-N8N-API-KEY'] = effectiveApiKey;
    }

    logger.info(`[N8N-PING] Probing n8n instance at: ${testUrl}`);
    const response = await fetch(testUrl, {
      method: 'GET',
      headers,
      signal: controller.signal
    });
    clearTimeout(timeoutHandle);

    const latencyMs = Date.now() - startTime;
    return res.json({
      success: true,
      reachable: true,
      statusCode: response.status,
      latencyMs,
      message: `n8n endpoint reached successfully (HTTP ${response.status}) in ${latencyMs}ms.`
    });
  } catch (err) {
    const latencyMs = Date.now() - startTime;
    let errorDetail = err.message;
    if (err.name === 'AbortError') errorDetail = 'Connection probe timed out after 8 seconds.';

    return res.json({
      success: false,
      reachable: false,
      latencyMs,
      error: errorDetail,
      message: `Could not reach n8n endpoint: ${errorDetail}`
    });
  }
});

module.exports = router;
