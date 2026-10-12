const { query } = require('../config/db');
const { logger } = require('../config/logger');
const { syncChannelRealData } = require('./youtube.service');

let cronTimer = null;
let isSyncRunning = false;

/**
 * Execute real telemetry synchronization run for a specific channel or all channels
 */
async function runSyncNow(targetChannelId = null, triggeredBy = 'cron_scheduler') {
  if (isSyncRunning) {
    logger.warn('[CRON-SYNC] Sync already in progress, skipping duplicate invocation.');
    return { success: false, message: 'Sync operation is currently in progress.' };
  }

  isSyncRunning = true;
  logger.info(`[CRON-SYNC] Starting real YouTube telemetry synchronization (Triggered by: ${triggeredBy})...`);

  try {
    // Record status in system_settings
    await query(
      `INSERT INTO system_settings (key, value, updated_at) 
       VALUES ('last_cron_sync_status', '"running"', CURRENT_TIMESTAMP)
       ON CONFLICT (key) DO UPDATE SET value = '"running"', updated_at = CURRENT_TIMESTAMP`
    );

    // Fetch channels to sync
    let channelsQuery = 'SELECT id, name, handle, channel_url, subscriber_count, total_views, video_count FROM channels';
    const params = [];
    if (targetChannelId) {
      channelsQuery += ' WHERE id = $1';
      params.push(targetChannelId);
    }
    const channelsRes = await query(channelsQuery, params);

    let totalChannelsSynced = 0;
    let totalAssetsIngested = 0;
    let totalAssetsUpdated = 0;

    for (const ch of channelsRes.rows) {
      try {
        const syncResult = await syncChannelRealData(ch.id, triggeredBy);
        if (syncResult && syncResult.success) {
          totalChannelsSynced++;
          totalAssetsIngested += (syncResult.insertedCount || 0);
          totalAssetsUpdated += (syncResult.updatedCount || 0);
        }
      } catch (chErr) {
        logger.error(`[CRON-SYNC] Failed syncing real data for channel "${ch.name}" (${ch.handle}): ${chErr.message}`);
        // Do NOT inject fake numbers. Just record error for this channel.
      }
    }

    // Update settings status
    const nowIso = new Date().toISOString();
    await query(
      `INSERT INTO system_settings (key, value, updated_at) 
       VALUES ('last_cron_sync_status', '"success"', CURRENT_TIMESTAMP)
       ON CONFLICT (key) DO UPDATE SET value = '"success"', updated_at = CURRENT_TIMESTAMP`
    );
    await query(
      `INSERT INTO system_settings (key, value, updated_at) 
       VALUES ('last_cron_sync_at', $1, CURRENT_TIMESTAMP)
       ON CONFLICT (key) DO UPDATE SET value = $1, updated_at = CURRENT_TIMESTAMP`,
      [JSON.stringify(nowIso)]
    );

    // Audit log
    await query(
      `INSERT INTO audit_logs (username, action, entity, entity_id, details)
       VALUES ('system_cron', 'CRON_SYNC', 'channel_tracker', $1, $2)`,
      [
        targetChannelId || 'all_channels',
        JSON.stringify({ totalChannelsSynced, totalAssetsIngested, totalAssetsUpdated, triggeredBy })
      ]
    );

    logger.info(`[CRON-SYNC] Completed real sync: ${totalChannelsSynced} channels, ${totalAssetsIngested} new assets ingested, ${totalAssetsUpdated} updated.`);
    return {
      success: true,
      message: `Real YouTube sync completed: ${totalChannelsSynced} channel(s) synchronized, ${totalAssetsIngested} new video/shorts ingested, ${totalAssetsUpdated} updated.`,
      timestamp: nowIso,
      syncedChannels: totalChannelsSynced,
      newAssets: totalAssetsIngested
    };
  } catch (err) {
    logger.error(`[CRON-SYNC-ERROR] ${err.message}`);
    await query(
      `INSERT INTO system_settings (key, value, updated_at) 
       VALUES ('last_cron_sync_status', '"error"', CURRENT_TIMESTAMP)
       ON CONFLICT (key) DO UPDATE SET value = '"error"', updated_at = CURRENT_TIMESTAMP`
    );
    return { success: false, error: err.message };
  } finally {
    isSyncRunning = false;
  }
}

/**
 * Initialize background cron scheduler based on system_settings
 */
async function initCronScheduler() {
  try {
    const settingsRes = await query(
      `SELECT key, value FROM system_settings 
       WHERE key IN ('cron_sync_enabled', 'cron_sync_interval_hours')`
    );

    let isEnabled = true;
    let intervalHours = 6;

    settingsRes.rows.forEach(r => {
      let val = r.value;
      if (typeof val === 'string') {
        try { val = JSON.parse(val); } catch(e) { val = val.replace(/^"|"$/g, ''); }
      }
      if (r.key === 'cron_sync_enabled') isEnabled = (val === true || val === 'true');
      if (r.key === 'cron_sync_interval_hours') intervalHours = parseFloat(val) || 6;
    });

    if (cronTimer) {
      clearInterval(cronTimer);
      cronTimer = null;
    }

    if (!isEnabled) {
      logger.info('[CRON-SCHEDULER] Background metric sync is disabled in system_settings.');
      return;
    }

    const intervalMs = Math.max(intervalHours, 0.5) * 60 * 60 * 1000;
    logger.info(`[CRON-SCHEDULER] Scheduled recurring telemetry sync every ${intervalHours} hours (${Math.round(intervalMs / 1000)}s).`);

    cronTimer = setInterval(async () => {
      logger.info('[CRON-SCHEDULER] Cron interval elapsed. Triggering automated real channel sync...');
      await runSyncNow(null, 'cron_interval_trigger');
    }, intervalMs);

  } catch (err) {
    logger.error(`[CRON-SCHEDULER-INIT-ERROR] ${err.message}`);
  }
}

/**
 * Re-evaluate cron settings (invoked when settings are modified via frontend)
 */
async function reloadCronScheduler() {
  await initCronScheduler();
}

module.exports = {
  runSyncNow,
  initCronScheduler,
  reloadCronScheduler
};
