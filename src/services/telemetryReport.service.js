const nodemailer = require('nodemailer');
const { query } = require('../config/db');
const { logger } = require('../config/logger');
const { getSmtpConfig, createTransporter } = require('./smtp.service');

let cronTimer = null;
let lastExecutedMinuteKey = null;

/**
 * Standard cron matching utility (supports wildcard, step intervals, ranges, comma lists, exact values)
 */
function matchesCronField(fieldValue, cronField) {
  if (!cronField || cronField === '*') return true;
  if (cronField.includes(',')) {
    return cronField.split(',').some(part => matchesCronField(fieldValue, part.trim()));
  }
  if (cronField.includes('/')) {
    const [range, step] = cronField.split('/');
    const stepNum = parseInt(step, 10);
    if (isNaN(stepNum) || stepNum <= 0) return true;
    if (range === '*') {
      return (fieldValue % stepNum) === 0;
    }
    const startNum = parseInt(range, 10) || 0;
    return fieldValue >= startNum && ((fieldValue - startNum) % stepNum) === 0;
  }
  if (cronField.includes('-')) {
    const [start, end] = cronField.split('-').map(Number);
    return fieldValue >= start && fieldValue <= end;
  }
  return parseInt(cronField, 10) === fieldValue;
}

/**
 * Check if the given date matches a 5-part cron expression (minute hour day month day-of-week)
 */
function isCronDue(cronExpression, date = new Date()) {
  if (!cronExpression || typeof cronExpression !== 'string') return false;
  const parts = cronExpression.trim().split(/\s+/);
  if (parts.length !== 5) return false;

  const [cronMin, cronHour, cronDom, cronMonth, cronDow] = parts;
  const currentMin = date.getMinutes();
  const currentHour = date.getHours();
  const currentDom = date.getDate();
  const currentMonth = date.getMonth() + 1; // 1-12
  const currentDow = date.getDay(); // 0-6 (Sun-Sat)

  return (
    matchesCronField(currentMin, cronMin) &&
    matchesCronField(currentHour, cronHour) &&
    matchesCronField(currentDom, cronDom) &&
    matchesCronField(currentMonth, cronMonth) &&
    matchesCronField(currentDow, cronDow)
  );
}

/**
 * Fetch all Telemetry Report configuration directives from PostgreSQL system_settings
 */
async function getTelemetryReportConfig() {
  const keys = [
    'telemetry_report_enabled',
    'telemetry_report_cron',
    'telemetry_report_schedule_preset',
    'telemetry_report_recipients',
    'telemetry_report_metrics',
    'telemetry_report_template_theme',
    'telemetry_report_custom_notes',
    'telemetry_report_custom_template',
    'telemetry_report_last_sent_at',
    'telemetry_report_last_status'
  ];

  const res = await query(
    `SELECT key, value FROM system_settings WHERE key = ANY($1::text[])`,
    [keys]
  );

  const rawMap = {};
  res.rows.forEach(r => {
    let v = r.value;
    if (typeof v === 'string') {
      try { v = JSON.parse(v); } catch (e) { v = v.replace(/^"|"$/g, ''); }
    }
    rawMap[r.key] = v;
  });

  // Default values
  const enabled = rawMap.telemetry_report_enabled === undefined ? true : (rawMap.telemetry_report_enabled === true || rawMap.telemetry_report_enabled === 'true');
  const cron = rawMap.telemetry_report_cron || '0 8 * * *';
  const schedulePreset = rawMap.telemetry_report_schedule_preset || 'daily-08';
  const recipients = rawMap.telemetry_report_recipients || 'admin@ytstudio.local';
  
  let metrics = rawMap.telemetry_report_metrics;
  if (!metrics || !Array.isArray(metrics)) {
    metrics = ['subscribers', 'views', 'content_breakdown', 'server_health', 'top_videos', 'recent_audit', 'snapshots_status'];
  }

  const templateTheme = rawMap.telemetry_report_template_theme || 'executive_dark';
  const customNotes = rawMap.telemetry_report_custom_notes || 'Automated Studio & DevOps Telemetry Daily Executive Digest';
  const customTemplate = rawMap.telemetry_report_custom_template || '';
  const lastSentAt = rawMap.telemetry_report_last_sent_at || null;
  const lastStatus = rawMap.telemetry_report_last_status || 'idle';

  return {
    enabled,
    cron,
    schedulePreset,
    recipients,
    metrics,
    templateTheme,
    customNotes,
    customTemplate,
    lastSentAt,
    lastStatus
  };
}

/**
 * Gather live operational telemetry data from PostgreSQL & Node.js runtime
 */
async function collectTelemetryData() {
  const startTime = Date.now();

  // 1. Channels statistics
  const channelsRes = await query(`
    SELECT id, name, handle, channel_url, subscriber_count, total_views, video_count 
    FROM channels 
    ORDER BY subscriber_count DESC
  `);
  const channels = channelsRes.rows || [];
  const totalChannels = channels.length;
  const totalSubscribers = channels.reduce((acc, c) => acc + parseInt(c.subscriber_count || 0, 10), 0);
  const totalViews = channels.reduce((acc, c) => acc + parseInt(c.total_views || 0, 10), 0);
  const totalVideosReported = channels.reduce((acc, c) => acc + parseInt(c.video_count || 0, 10), 0);

  // 2. Content items breakdown
  const contentBreakdownRes = await query(`
    SELECT 
      content_type, 
      COUNT(*)::int as count,
      COALESCE(SUM(views_count), 0)::bigint as views,
      COALESCE(SUM(likes_count), 0)::bigint as likes,
      COALESCE(SUM(comments_count), 0)::bigint as comments
    FROM content_items
    GROUP BY content_type
  `);

  const breakdownMap = {
    video: { count: 0, views: 0, likes: 0, comments: 0 },
    shorts: { count: 0, views: 0, likes: 0, comments: 0 },
    podcast: { count: 0, views: 0, likes: 0, comments: 0 }
  };
  let totalCatalogItems = 0;
  contentBreakdownRes.rows.forEach(r => {
    const type = (r.content_type || 'video').toLowerCase();
    if (breakdownMap[type]) {
      breakdownMap[type] = {
        count: parseInt(r.count, 10) || 0,
        views: parseInt(r.views, 10) || 0,
        likes: parseInt(r.likes, 10) || 0,
        comments: parseInt(r.comments, 10) || 0
      };
    }
    totalCatalogItems += parseInt(r.count, 10) || 0;
  });

  // 3. Top performing content items (limit 5)
  const topContentRes = await query(`
    SELECT title, content_type, views_count, likes_count, comments_count, created_at, tags
    FROM content_items
    ORDER BY views_count DESC
    LIMIT 5
  `);
  const topItems = topContentRes.rows || [];

  // 4. Server health & PostgreSQL metrics
  const dbPingStart = Date.now();
  const dbVerRes = await query('SELECT version()');
  const dbLatencyMs = Date.now() - dbPingStart;
  const dbVersionFull = dbVerRes.rows[0]?.version || 'PostgreSQL 18';
  const memUsage = process.memoryUsage();

  const serverHealth = {
    status: 'ONLINE (HEALTHY)',
    nodeVersion: process.version,
    platform: process.platform,
    uptimeSeconds: Math.round(process.uptime()),
    uptimeFormatted: formatUptime(process.uptime()),
    memoryRssMb: Math.round(memUsage.rss / (1024 * 1024)),
    memoryHeapMb: Math.round(memUsage.heapUsed / (1024 * 1024)),
    dbLatencyMs,
    dbEngine: dbVersionFull.split(' on ')[0] || 'PostgreSQL 18.x'
  };

  // 5. Recent audit logs in last 24 hours
  const audit24hRes = await query(`
    SELECT COUNT(*)::int as count 
    FROM audit_logs 
    WHERE created_at >= NOW() - INTERVAL '24 hours'
  `);
  const audit24hCount = audit24hRes.rows[0]?.count || 0;

  const recentAuditRes = await query(`
    SELECT username, action, entity, entity_id, created_at
    FROM audit_logs
    ORDER BY created_at DESC
    LIMIT 5
  `);
  const recentAudits = recentAuditRes.rows || [];

  // 6. Channel snapshots count & last sync status
  const snapshotsCountRes = await query(`SELECT COUNT(*)::int as count FROM channel_snapshots`);
  const totalSnapshots = snapshotsCountRes.rows[0]?.count || 0;

  const syncSettingsRes = await query(`
    SELECT key, value FROM system_settings 
    WHERE key IN ('last_cron_sync_status', 'last_cron_sync_at', 'cron_sync_interval_hours')
  `);
  const syncSettings = {};
  syncSettingsRes.rows.forEach(r => {
    let val = r.value;
    if (typeof val === 'string') val = val.replace(/^"|"$/g, '');
    syncSettings[r.key] = val;
  });

  const queryTimeMs = Date.now() - startTime;

  return {
    collectedAt: new Date().toISOString(),
    queryTimeMs,
    channels,
    primaryChannel: channels[0] || null,
    totalChannels,
    totalSubscribers,
    totalViews,
    totalVideosReported,
    breakdownMap,
    totalCatalogItems,
    topItems,
    serverHealth,
    audit24hCount,
    recentAudits,
    totalSnapshots,
    syncSettings
  };
}

/**
 * Format uptime seconds into human-readable duration
 */
function formatUptime(seconds) {
  const d = Math.floor(seconds / (3600 * 24));
  const h = Math.floor((seconds % (3600 * 24)) / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const parts = [];
  if (d > 0) parts.push(`${d}d`);
  if (h > 0) parts.push(`${h}h`);
  parts.push(`${m}m`);
  return parts.join(' ');
}

/**
 * Render complete responsive HTML email report based on selected theme & metrics
 */
function buildTelemetryReportHtml(telemetry, config, senderInfo = {}) {
  const { metrics, templateTheme, customNotes, customTemplate } = config;
  const isDark = templateTheme === 'executive_dark' || templateTheme === 'ops_blueprint';
  const isOps = templateTheme === 'ops_blueprint';

  // If custom template is provided and selected, replace placeholders
  if (templateTheme === 'custom' && customTemplate && customTemplate.trim()) {
    return applyCustomTemplate(customTemplate, telemetry, config, senderInfo);
  }

  // Visual Theme Styling Palette
  const theme = {
    bg: isDark ? (isOps ? '#0a192f' : '#070913') : '#f8fafc',
    cardBg: isDark ? (isOps ? '#112240' : '#0d1127') : '#ffffff',
    cardBorder: isDark ? (isOps ? '#233554' : 'rgba(0, 245, 255, 0.25)') : '#e2e8f0',
    textMain: isDark ? '#f8fafc' : '#0f172a',
    textMuted: isDark ? '#94a3b8' : '#64748b',
    textDim: isDark ? '#64748b' : '#94a3b8',
    accentCyan: isOps ? '#64ffda' : '#00f5ff',
    accentEmerald: '#10b981',
    accentPurple: '#a855f7',
    accentAmber: '#f59e0b',
    headerGradient: isDark 
      ? 'linear-gradient(135deg, rgba(0, 245, 255, 0.2) 0%, rgba(16, 185, 129, 0.15) 100%)'
      : 'linear-gradient(135deg, #e0f2fe 0%, #ecfdf5 100%)',
    tableBorder: isDark ? 'rgba(255, 255, 255, 0.08)' : '#e2e8f0',
    tableRowAlt: isDark ? 'rgba(255, 255, 255, 0.02)' : '#f8fafc',
    fontFamily: isOps ? "Consolas, Menlo, Monaco, monospace" : "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif"
  };

  const hasMetric = (m) => metrics.includes(m);
  const now = new Date();
  const dateStr = now.toLocaleDateString('en-US', { weekday: 'short', year: 'numeric', month: 'short', day: 'numeric' });
  const timeStr = now.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', timeZoneName: 'short' });

  // Generate Metric Cards HTML
  let metricCardsHtml = '';

  if (hasMetric('subscribers')) {
    metricCardsHtml += `
      <div style="background: ${theme.cardBg}; border: 1px solid ${theme.cardBorder}; border-radius: 10px; padding: 18px; text-align: left;">
        <div style="font-size: 11px; font-weight: 700; color: ${theme.accentCyan}; text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 6px;">
          👥 SUBSCRIBER REACH
        </div>
        <div style="font-size: 26px; font-weight: 800; color: ${theme.textMain}; line-height: 1.1; margin-bottom: 4px;">
          ${Number(telemetry.totalSubscribers).toLocaleString()}
        </div>
        <div style="font-size: 11px; color: ${theme.textMuted};">
          Across ${telemetry.totalChannels} managed channel${telemetry.totalChannels === 1 ? '' : 's'}
        </div>
      </div>
    `;
  }

  if (hasMetric('views')) {
    metricCardsHtml += `
      <div style="background: ${theme.cardBg}; border: 1px solid ${theme.cardBorder}; border-radius: 10px; padding: 18px; text-align: left;">
        <div style="font-size: 11px; font-weight: 700; color: ${theme.accentEmerald}; text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 6px;">
          👁️ AGGREGATED VIEWS
        </div>
        <div style="font-size: 26px; font-weight: 800; color: ${theme.textMain}; line-height: 1.1; margin-bottom: 4px;">
          ${Number(telemetry.totalViews).toLocaleString()}
        </div>
        <div style="font-size: 11px; color: ${theme.textMuted};">
          Cumulative global audience impressions
        </div>
      </div>
    `;
  }

  if (hasMetric('content_breakdown')) {
    metricCardsHtml += `
      <div style="background: ${theme.cardBg}; border: 1px solid ${theme.cardBorder}; border-radius: 10px; padding: 18px; text-align: left;">
        <div style="font-size: 11px; font-weight: 700; color: ${theme.accentPurple}; text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 6px;">
          🎬 CATALOG ASSETS
        </div>
        <div style="font-size: 26px; font-weight: 800; color: ${theme.textMain}; line-height: 1.1; margin-bottom: 4px;">
          ${Number(telemetry.totalCatalogItems).toLocaleString()}
        </div>
        <div style="font-size: 11px; color: ${theme.textMuted};">
          ${telemetry.breakdownMap.video.count} Videos • ${telemetry.breakdownMap.shorts.count} Shorts • ${telemetry.breakdownMap.podcast.count} Podcasts
        </div>
      </div>
    `;
  }

  if (hasMetric('server_health')) {
    metricCardsHtml += `
      <div style="background: ${theme.cardBg}; border: 1px solid ${theme.cardBorder}; border-radius: 10px; padding: 18px; text-align: left;">
        <div style="font-size: 11px; font-weight: 700; color: #38bdf8; text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 6px;">
          ⚡ POSTGRES 18 LATENCY
        </div>
        <div style="font-size: 26px; font-weight: 800; color: ${theme.accentEmerald}; line-height: 1.1; margin-bottom: 4px;">
          ${telemetry.serverHealth.dbLatencyMs} ms
        </div>
        <div style="font-size: 11px; color: ${theme.textMuted};">
          Uptime: ${telemetry.serverHealth.uptimeFormatted} • RAM: ${telemetry.serverHealth.memoryRssMb}MB
        </div>
      </div>
    `;
  }

  // Top Videos Section
  let topVideosHtml = '';
  if (hasMetric('top_videos') && telemetry.topItems.length > 0) {
    topVideosHtml = `
      <div style="margin-top: 24px; background: ${theme.cardBg}; border: 1px solid ${theme.cardBorder}; border-radius: 10px; padding: 20px;">
        <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 14px;">
          <h3 style="margin: 0; font-size: 13px; font-weight: 800; color: ${theme.accentCyan}; text-transform: uppercase; letter-spacing: 0.5px;">
            🏆 TOP PERFORMING CONTENT ASSETS
          </h3>
          <span style="font-size: 11px; color: ${theme.textDim};">Ranked by Lifetime Views</span>
        </div>
        <table style="width: 100%; border-collapse: collapse; font-size: 12px;">
          <thead>
            <tr style="border-bottom: 1px solid ${theme.tableBorder}; text-align: left; color: ${theme.textMuted};">
              <th style="padding: 8px 6px;">Title</th>
              <th style="padding: 8px 6px; width: 80px;">Type</th>
              <th style="padding: 8px 6px; width: 90px; text-align: right;">Views</th>
              <th style="padding: 8px 6px; width: 70px; text-align: right;">Likes</th>
            </tr>
          </thead>
          <tbody>
            ${telemetry.topItems.map((item, idx) => `
              <tr style="border-bottom: 1px solid ${theme.tableBorder}; background: ${idx % 2 === 0 ? 'transparent' : theme.tableRowAlt};">
                <td style="padding: 9px 6px; color: ${theme.textMain}; font-weight: 600;">
                  ${escapeHtml(item.title || 'Untitled Asset')}
                </td>
                <td style="padding: 9px 6px;">
                  <span style="background: rgba(0, 245, 255, 0.1); color: ${theme.accentCyan}; padding: 2px 6px; border-radius: 4px; font-size: 10px; text-transform: uppercase; font-weight: 700;">
                    ${item.content_type || 'video'}
                  </span>
                </td>
                <td style="padding: 9px 6px; text-align: right; color: ${theme.accentEmerald}; font-weight: 700;">
                  ${Number(item.views_count || 0).toLocaleString()}
                </td>
                <td style="padding: 9px 6px; text-align: right; color: ${theme.textMuted};">
                  ${Number(item.likes_count || 0).toLocaleString()}
                </td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      </div>
    `;
  }

  // Security & Audit Log Section
  let auditLogsHtml = '';
  if (hasMetric('recent_audit')) {
    auditLogsHtml = `
      <div style="margin-top: 24px; background: ${theme.cardBg}; border: 1px solid ${theme.cardBorder}; border-radius: 10px; padding: 20px;">
        <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 14px;">
          <h3 style="margin: 0; font-size: 13px; font-weight: 800; color: ${theme.accentAmber}; text-transform: uppercase; letter-spacing: 0.5px;">
            🔒 SECURITY AUDIT TRAIL (LAST 24H: ${telemetry.audit24hCount} EVENTS)
          </h3>
          <span style="font-size: 11px; color: ${theme.textDim};">Recent User & System Activity</span>
        </div>
        ${telemetry.recentAudits.length > 0 ? `
          <table style="width: 100%; border-collapse: collapse; font-size: 12px;">
            <thead>
              <tr style="border-bottom: 1px solid ${theme.tableBorder}; text-align: left; color: ${theme.textMuted};">
                <th style="padding: 8px 6px; width: 90px;">Timestamp</th>
                <th style="padding: 8px 6px; width: 90px;">Operator</th>
                <th style="padding: 8px 6px; width: 110px;">Action</th>
                <th style="padding: 8px 6px;">Entity / Target</th>
              </tr>
            </thead>
            <tbody>
              ${telemetry.recentAudits.map((a, idx) => `
                <tr style="border-bottom: 1px solid ${theme.tableBorder}; background: ${idx % 2 === 0 ? 'transparent' : theme.tableRowAlt};">
                  <td style="padding: 8px 6px; color: ${theme.textDim}; font-size: 11px;">
                    ${new Date(a.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </td>
                  <td style="padding: 8px 6px; color: ${theme.textMain}; font-weight: 600;">
                    ${escapeHtml(a.username || 'system')}
                  </td>
                  <td style="padding: 8px 6px;">
                    <span style="background: rgba(245, 158, 11, 0.12); color: ${theme.accentAmber}; padding: 2px 6px; border-radius: 4px; font-size: 10px; font-weight: 700;">
                      ${escapeHtml(a.action)}
                    </span>
                  </td>
                  <td style="padding: 8px 6px; color: ${theme.textMuted}; font-size: 11px;">
                    ${escapeHtml(a.entity)} (${escapeHtml(a.entity_id || '-')})
                  </td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        ` : `
          <div style="font-size: 12px; color: ${theme.textMuted}; padding: 10px 0;">No security audit events recorded in this window.</div>
        `}
      </div>
    `;
  }

  // Snapshots & Automation Telemetry Section
  let snapshotsHtml = '';
  if (hasMetric('snapshots_status')) {
    snapshotsHtml = `
      <div style="margin-top: 24px; background: ${theme.cardBg}; border: 1px solid ${theme.cardBorder}; border-radius: 10px; padding: 20px;">
        <h3 style="margin: 0 0 12px 0; font-size: 13px; font-weight: 800; color: ${theme.accentCyan}; text-transform: uppercase; letter-spacing: 0.5px;">
          ⏱️ BACKGROUND CRON & SYNCHRONIZATION STATUS
        </h3>
        <div style="display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 12px; font-size: 12px;">
          <div style="background: ${isDark ? 'rgba(0,0,0,0.25)' : '#f8fafc'}; padding: 12px; border-radius: 6px; border: 1px solid ${theme.tableBorder};">
            <div style="color: ${theme.textDim}; font-size: 10px; text-transform: uppercase; font-weight: 700;">Sync Engine Status</div>
            <div style="color: ${theme.accentEmerald}; font-weight: 800; font-size: 14px; margin-top: 3px;">
              ${(telemetry.syncSettings.last_cron_sync_status || 'READY').toUpperCase()}
            </div>
          </div>
          <div style="background: ${isDark ? 'rgba(0,0,0,0.25)' : '#f8fafc'}; padding: 12px; border-radius: 6px; border: 1px solid ${theme.tableBorder};">
            <div style="color: ${theme.textDim}; font-size: 10px; text-transform: uppercase; font-weight: 700;">Total Historical Snapshots</div>
            <div style="color: ${theme.textMain}; font-weight: 800; font-size: 14px; margin-top: 3px;">
              ${Number(telemetry.totalSnapshots).toLocaleString()} snapshots
            </div>
          </div>
          <div style="background: ${isDark ? 'rgba(0,0,0,0.25)' : '#f8fafc'}; padding: 12px; border-radius: 6px; border: 1px solid ${theme.tableBorder};">
            <div style="color: ${theme.textDim}; font-size: 10px; text-transform: uppercase; font-weight: 700;">Sync Cadence</div>
            <div style="color: ${theme.accentCyan}; font-weight: 800; font-size: 14px; margin-top: 3px;">
              Every ${telemetry.syncSettings.cron_sync_interval_hours || 6} Hours
            </div>
          </div>
        </div>
      </div>
    `;
  }

  // Full HTML Document
  return `
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Daily Telemetry Report - YouTube Channel Manager</title>
    </head>
    <body style="margin: 0; padding: 24px 12px; background-color: ${theme.bg}; font-family: ${theme.fontFamily}; color: ${theme.textMain}; -webkit-font-smoothing: antialiased;">
      <div style="max-width: 680px; margin: 0 auto; background: ${theme.cardBg}; border: 1px solid ${theme.cardBorder}; border-radius: 14px; overflow: hidden; box-shadow: 0 14px 40px rgba(0,0,0,${isDark ? '0.4' : '0.08'});">
        
        <!-- Top Branded Header -->
        <div style="background: ${theme.headerGradient}; padding: 24px 28px; border-bottom: 1px solid ${theme.cardBorder};">
          <table style="width: 100%; border-collapse: collapse;">
            <tr>
              <td style="vertical-align: middle;">
                <div style="display: inline-block; vertical-align: middle; background: #ff0033; color: #ffffff; font-weight: 900; font-size: 20px; width: 44px; height: 44px; line-height: 44px; text-align: center; border-radius: 10px; margin-right: 12px;">▶</div>
                <div style="display: inline-block; vertical-align: middle;">
                  <h1 style="margin: 0; font-size: 18px; font-weight: 900; letter-spacing: 0.5px; color: ${theme.accentCyan};">
                    YOUTUBE CHANNEL MANAGER
                  </h1>
                  <div style="font-size: 11px; color: ${theme.textMuted}; font-weight: 600; margin-top: 2px;">
                    Daily Intelligence Brief & Telemetry Alert Digest
                  </div>
                </div>
              </td>
              <td style="vertical-align: middle; text-align: right;">
                <div style="background: rgba(16, 185, 129, 0.15); border: 1px solid ${theme.accentEmerald}; color: ${theme.accentEmerald}; font-size: 11px; font-weight: 800; padding: 4px 10px; border-radius: 20px; display: inline-block;">
                  ● LIVE TELEMETRY
                </div>
                <div style="font-size: 11px; color: ${theme.textDim}; margin-top: 4px;">
                  ${dateStr} • ${timeStr}
                </div>
              </td>
            </tr>
          </table>
        </div>

        <!-- Executive Overview & Custom Notes Banner -->
        <div style="padding: 24px 28px 0 28px;">
          ${customNotes ? `
            <div style="background: ${isDark ? 'rgba(0, 245, 255, 0.05)' : '#f0f9ff'}; border-left: 4px solid ${theme.accentCyan}; padding: 12px 16px; border-radius: 4px; margin-bottom: 22px; font-size: 13px; color: ${theme.textMain}; line-height: 1.5;">
              <strong style="color: ${theme.accentCyan}; text-transform: uppercase; font-size: 11px; letter-spacing: 0.5px; display: block; margin-bottom: 4px;">
                EXECUTIVE OPERATIONAL DIRECTIVE
              </strong>
              ${escapeHtml(customNotes)}
            </div>
          ` : ''}

          <!-- Metric Cards 2x2 Grid -->
          <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 14px;">
            ${metricCardsHtml}
          </div>

          <!-- Top Content Table -->
          ${topVideosHtml}

          <!-- Security Audit Logs -->
          ${auditLogsHtml}

          <!-- Snapshot Telemetry -->
          ${snapshotsHtml}

          <!-- Server Health Deep-Dive Coordinates -->
          <div style="margin-top: 24px; padding: 16px; background: ${isDark ? 'rgba(0,0,0,0.2)' : '#f8fafc'}; border: 1px solid ${theme.tableBorder}; border-radius: 8px; font-size: 11px; color: ${theme.textDim};">
            <table style="width: 100%; border-collapse: collapse;">
              <tr>
                <td style="padding: 4px 0;">PostgreSQL Version: <strong style="color: ${theme.textMain};">${telemetry.serverHealth.dbEngine}</strong></td>
                <td style="padding: 4px 0; text-align: right;">Runtime Node.js: <strong style="color: ${theme.textMain};">${telemetry.serverHealth.nodeVersion}</strong></td>
              </tr>
              <tr>
                <td style="padding: 4px 0;">Memory RSS: <strong style="color: ${theme.textMain};">${telemetry.serverHealth.memoryRssMb} MB</strong></td>
                <td style="padding: 4px 0; text-align: right;">Query Execution: <strong style="color: ${theme.accentEmerald};">${telemetry.queryTimeMs} ms</strong></td>
              </tr>
            </table>
          </div>
        </div>

        <!-- Footer -->
        <div style="margin-top: 28px; padding: 20px 28px; background: ${isDark ? 'rgba(0,0,0,0.35)' : '#f1f5f9'}; border-top: 1px solid ${theme.tableBorder}; text-align: center; font-size: 11px; color: ${theme.textDim}; line-height: 1.6;">
          <div>
            Dispatched via SMTP Relay (<code>${senderInfo.fromFormatted || 'System MTA'}</code>) • Automated Cron Schedule: <code>${config.cron}</code>
          </div>
          <div style="margin-top: 4px;">
            Recipient List: <strong style="color: ${theme.textMuted};">${escapeHtml(config.recipients)}</strong>
          </div>
          <div style="margin-top: 8px; color: ${theme.textDim}; font-size: 10px;">
            YouTube Channel Manager Platform • PostgreSQL 18 & Docker Microservices Engine
          </div>
        </div>

      </div>
    </body>
    </html>
  `;
}

/**
 * Handle custom template substitutions
 */
function applyCustomTemplate(templateStr, telemetry, config, senderInfo) {
  let output = templateStr;
  const replacements = {
    '{{channel_name}}': telemetry.primaryChannel?.name || 'Studio Channel',
    '{{channel_handle}}': telemetry.primaryChannel?.handle || '@StudioChannel',
    '{{recipients}}': escapeHtml(config.recipients || ''),
    '{{report_date}}': new Date().toLocaleDateString(),
    '{{custom_notes}}': escapeHtml(config.customNotes || ''),
    '{{subscribers_stat}}': Number(telemetry.totalSubscribers).toLocaleString(),
    '{{views_stat}}': Number(telemetry.totalViews).toLocaleString(),
    '{{catalog_count}}': Number(telemetry.totalCatalogItems).toLocaleString(),
    '{{db_latency_ms}}': `${telemetry.serverHealth.dbLatencyMs}ms`,
    '{{server_uptime}}': telemetry.serverHealth.uptimeFormatted,
    '{{server_memory}}': `${telemetry.serverHealth.memoryRssMb}MB`,
    '{{audit_count_24h}}': String(telemetry.audit24hCount),
    '{{sender_email}}': senderInfo.fromEmail || 'noreply@studio.com'
  };

  for (const [key, val] of Object.entries(replacements)) {
    output = output.split(key).join(val);
  }
  return output;
}

/**
 * Helper to escape HTML characters
 */
function escapeHtml(str) {
  if (!str) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

/**
 * Dispatch live Telemetry Report email via configured SMTP Relay
 */
async function sendTelemetryReport({ recipients = null, customConfig = {}, triggeredBy = 'cron_scheduler' } = {}) {
  const savedConfig = await getTelemetryReportConfig();
  const config = { ...savedConfig, ...customConfig };

  const rawRecipients = recipients || config.recipients || '';
  const recipientList = rawRecipients
    .split(',')
    .map(e => e.trim())
    .filter(e => e && e.includes('@'));

  if (recipientList.length === 0) {
    throw new Error('At least one valid recipient email address is required.');
  }

  // 1. Fetch SMTP settings from PostgreSQL system_settings
  const smtpConfig = await getSmtpConfig();
  if (!smtpConfig.smtp_host) {
    throw new Error('SMTP Host is unconfigured in Settings. Please configure SMTP Server before dispatching reports.');
  }

  const transporter = createTransporter(smtpConfig);

  const fromName = (smtpConfig.smtp_from_name || 'YouTube Channel Manager').trim();
  const fromEmail = (smtpConfig.smtp_from_email || smtpConfig.smtp_user || `noreply@${smtpConfig.smtp_host}`).trim();
  const fromFormatted = `"${fromName}" <${fromEmail}>`;

  // 2. Gather live telemetry
  const telemetry = await collectTelemetryData();

  // 3. Render HTML template
  const reportHtml = buildTelemetryReportHtml(telemetry, config, { fromFormatted, fromEmail });

  const subjectDate = new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  const subject = `📊 [Studio Telemetry] Daily Operational Intelligence Report - ${subjectDate}`;

  logger.info(`[TELEMETRY-REPORT] Dispatching telemetry digest to ${recipientList.length} recipient(s): ${recipientList.join(', ')} (Triggered by: ${triggeredBy})`);

  // 4. Send email via Nodemailer
  const mailResult = await transporter.sendMail({
    from: fromFormatted,
    to: recipientList.join(', '),
    subject,
    text: `YouTube Channel Manager Telemetry Report\n\nSubscribers: ${telemetry.totalSubscribers}\nTotal Views: ${telemetry.totalViews}\nCatalog Assets: ${telemetry.totalCatalogItems}\nPostgreSQL Latency: ${telemetry.serverHealth.dbLatencyMs}ms\n\nGenerated at: ${new Date().toISOString()}`,
    html: reportHtml
  });

  const nowIso = new Date().toISOString();

  // 5. Update settings metadata in PostgreSQL
  await query(`
    INSERT INTO system_settings (key, value, updated_at) 
    VALUES ('telemetry_report_last_sent_at', $1, CURRENT_TIMESTAMP)
    ON CONFLICT (key) DO UPDATE SET value = $1, updated_at = CURRENT_TIMESTAMP
  `, [JSON.stringify(nowIso)]);

  await query(`
    INSERT INTO system_settings (key, value, updated_at) 
    VALUES ('telemetry_report_last_status', '"success"', CURRENT_TIMESTAMP)
    ON CONFLICT (key) DO UPDATE SET value = '"success"', updated_at = CURRENT_TIMESTAMP
  `);

  // 6. Record audit log
  await query(`
    INSERT INTO audit_logs (username, action, entity, entity_id, details)
    VALUES ($1, 'TELEMETRY_REPORT_DISPATCH', 'telemetry_report', 'email_digest', $2)
  `, [
    triggeredBy,
    JSON.stringify({
      recipientCount: recipientList.length,
      recipients: recipientList,
      messageId: mailResult.messageId,
      totalSubscribers: telemetry.totalSubscribers,
      totalViews: telemetry.totalViews
    })
  ]);

  logger.info(`[TELEMETRY-REPORT] Successfully dispatched report to ${recipientList.join(', ')} (${mailResult.messageId})`);

  return {
    success: true,
    message: `Telemetry report delivered to ${recipientList.length} recipient(s).`,
    messageId: mailResult.messageId,
    recipients: recipientList,
    sentAt: nowIso,
    telemetrySummary: {
      subscribers: telemetry.totalSubscribers,
      views: telemetry.totalViews,
      catalogItems: telemetry.totalCatalogItems,
      dbLatencyMs: telemetry.serverHealth.dbLatencyMs
    }
  };
}

/**
 * Initialize background cron checker for telemetry report
 */
async function initTelemetryReportScheduler() {
  if (cronTimer) {
    clearInterval(cronTimer);
    cronTimer = null;
  }

  try {
    const config = await getTelemetryReportConfig();
    if (!config.enabled) {
      logger.info('[TELEMETRY-SCHEDULER] Daily Telemetry Email Report cron is paused in system_settings.');
      return;
    }

    logger.info(`[TELEMETRY-SCHEDULER] Initialized Telemetry Email Report scheduler with cron expression: "${config.cron}"`);

    // Check every minute against the cron expression
    cronTimer = setInterval(async () => {
      try {
        const currentConf = await getTelemetryReportConfig();
        if (!currentConf.enabled) return;

        const now = new Date();
        const minuteKey = `${now.getFullYear()}-${now.getMonth()}-${now.getDate()}-${now.getHours()}:${now.getMinutes()}`;

        if (minuteKey === lastExecutedMinuteKey) {
          return; // Already executed during this minute
        }

        if (isCronDue(currentConf.cron, now)) {
          lastExecutedMinuteKey = minuteKey;
          logger.info(`[TELEMETRY-SCHEDULER] Cron expression "${currentConf.cron}" matched at ${now.toISOString()}. Dispatching daily report...`);
          await sendTelemetryReport({ triggeredBy: 'automated_cron' });
        }
      } catch (loopErr) {
        logger.error(`[TELEMETRY-SCHEDULER-ERROR] ${loopErr.message}`);
      }
    }, 60 * 1000);

  } catch (err) {
    logger.error(`[TELEMETRY-SCHEDULER-INIT-ERROR] ${err.message}`);
  }
}

/**
 * Reload scheduler on settings modification
 */
async function reloadTelemetryReportScheduler() {
  await initTelemetryReportScheduler();
}

module.exports = {
  getTelemetryReportConfig,
  collectTelemetryData,
  buildTelemetryReportHtml,
  sendTelemetryReport,
  initTelemetryReportScheduler,
  reloadTelemetryReportScheduler,
  isCronDue
};
