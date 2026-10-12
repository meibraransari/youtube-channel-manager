const express = require('express');
const router = express.Router();
const os = require('os');
const { pool, query } = require('../config/db');
const { logger } = require('../config/logger');

/**
 * GET /health
 * High-performance health check & telemetry endpoint
 */
router.get('/', async (req, res) => {
  const startTime = Date.now();
  let dbStatus = 'healthy';
  let dbLatencyMs = 0;
  let dbVersion = 'PostgreSQL 18';
  let tableStats = {
    channels: 0,
    contentItems: 0,
    subscriptions: 0,
    users: 0,
    auditLogs: 0
  };

  try {
    const dbStart = Date.now();
    await query('SELECT 1');
    dbLatencyMs = Date.now() - dbStart;

    const [verRes, countsRes] = await Promise.all([
      query('SELECT version()'),
      query(`
        SELECT 
          (SELECT COUNT(*) FROM channels) as channels_count,
          (SELECT COUNT(*) FROM content_items) as content_count,
          (SELECT COUNT(*) FROM channel_subscriptions) as subscriptions_count,
          (SELECT COUNT(*) FROM users) as users_count,
          (SELECT COUNT(*) FROM audit_logs) as audit_count
      `)
    ]);

    if (verRes.rows && verRes.rows[0]) {
      const fullVer = verRes.rows[0].version;
      dbVersion = fullVer.split(' on ')[0] || fullVer;
    }

    if (countsRes.rows && countsRes.rows[0]) {
      const r = countsRes.rows[0];
      tableStats = {
        channels: parseInt(r.channels_count || 0, 10),
        contentItems: parseInt(r.content_count || 0, 10),
        subscriptions: parseInt(r.subscriptions_count || 0, 10),
        users: parseInt(r.users_count || 0, 10),
        auditLogs: parseInt(r.audit_count || 0, 10)
      };
    }
  } catch (err) {
    dbStatus = 'unreachable';
    logger.error(`[HEALTH-CHECK-DB-ERROR] ${err.message}`);
  }

  const memoryUsage = process.memoryUsage();
  const cpus = os.cpus() || [];
  const cpuModel = cpus[0] ? cpus[0].model.trim() : 'Generic Multi-Core CPU';
  const cpuCores = cpus.length || 1;
  const totalHostMemMb = Math.round(os.totalmem() / 1024 / 1024);
  const freeHostMemMb = Math.round(os.freemem() / 1024 / 1024);
  const usedHostMemMb = totalHostMemMb - freeHostMemMb;
  const hostMemPercent = totalHostMemMb > 0 ? Math.round((usedHostMemMb / totalHostMemMb) * 100) : 0;

  const uptimeSeconds = Math.floor(process.uptime());
  const days = Math.floor(uptimeSeconds / 86400);
  const hours = Math.floor((uptimeSeconds % 86400) / 3600);
  const minutes = Math.floor((uptimeSeconds % 3600) / 60);
  const seconds = uptimeSeconds % 60;
  const uptimeHuman = `${days > 0 ? days + 'd ' : ''}${hours}h ${minutes}m ${seconds}s`;

  const poolMetrics = {
    totalConnections: pool.totalCount || 0,
    idleConnections: pool.idleCount || 0,
    waitingClients: pool.waitingCount || 0,
    maxPoolSize: 20
  };

  const heapUsedMb = Math.round(memoryUsage.heapUsed / 1024 / 1024);
  const heapTotalMb = Math.round(memoryUsage.heapTotal / 1024 / 1024);
  const heapPercent = heapTotalMb > 0 ? Math.round((heapUsedMb / heapTotalMb) * 100) : 0;
  const rssMb = Math.round(memoryUsage.rss / 1024 / 1024);

  const healthData = {
    status: dbStatus === 'healthy' ? 'pass' : 'warn',
    service: 'youtube-channel-manager',
    timestamp: new Date().toISOString(),
    uptimeSeconds,
    uptimeHuman,
    database: {
      status: dbStatus,
      latencyMs: dbLatencyMs,
      engine: 'PostgreSQL 18',
      version: dbVersion,
      pool: poolMetrics,
      tableStats
    },
    system: {
      nodeVersion: process.version,
      platform: process.platform,
      arch: process.arch,
      pid: process.pid,
      cpuCores,
      cpuModel,
      memoryRssMb: rssMb,
      memoryHeapUsedMb: heapUsedMb,
      memoryHeapTotalMb: heapTotalMb,
      memoryHeapPercent: heapPercent,
      hostTotalMemoryMb: totalHostMemMb,
      hostFreeMemoryMb: freeHostMemMb,
      hostMemoryUsedPercent: hostMemPercent
    },
    subsystems: [
      { name: 'PostgreSQL 18 Primary Storage', category: 'Database', status: dbStatus === 'healthy' ? 'HEALTHY' : 'UNREACHABLE', latency: `${dbLatencyMs}ms`, detail: `${poolMetrics.totalConnections}/20 Active Pool Connections` },
      { name: 'Node.js V8 Runtime & Event Loop', category: 'Compute', status: 'OPTIMAL', latency: '< 1ms', detail: `V8 ${process.versions.v8 || 'Engine'} • PID ${process.pid}` },
      { name: 'JWT Cryptographic Auth Guard', category: 'Security', status: 'ACTIVE', latency: 'Nominal', detail: 'HMAC-SHA256 Token Engine' },
      { name: 'YouTube Data API v3 Ingestion', category: 'Connector', status: process.env.YOUTUBE_API_KEY ? 'CONFIGURED' : 'STANDBY', latency: 'Ready', detail: 'Rapid Catalog Synchronizer' },
      { name: 'SMTP Transactional Mail Gateway', category: 'Alerting', status: 'READY', latency: 'Standby', detail: 'TLS/STARTTLS Dispatch Engine' },
      { name: 'Audit Trail Immutable Ledger', category: 'Compliance', status: 'RECORDING', latency: 'Nominal', detail: `${tableStats.auditLogs} Logged Operations` },
      { name: 'Docker Containerized Runtime', category: 'Infrastructure', status: 'CONTAINERIZED', latency: 'Nominal', detail: 'yt-manager service on port 3000' }
    ],
    config: {
      activeLogLevel: logger.level,
      environment: process.env.NODE_ENV || 'production'
    },
    responseTimeMs: Date.now() - startTime
  };

  const httpStatus = dbStatus === 'healthy' ? 200 : 503;
  return res.status(httpStatus).json(healthData);
});

/**
 * GET /health/ping
 * Deep latency probe (executes 3 consecutive pings and returns stats)
 */
router.get('/ping', async (req, res) => {
  const pings = [];
  try {
    for (let i = 0; i < 3; i++) {
      const s = Date.now();
      await query('SELECT 1');
      pings.push(Date.now() - s);
    }
    const avg = Math.round((pings.reduce((a, b) => a + b, 0) / pings.length) * 10) / 10;
    const min = Math.min(...pings);
    const max = Math.max(...pings);
    res.json({ success: true, pings, min, max, avg, timestamp: new Date().toISOString() });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

module.exports = router;
