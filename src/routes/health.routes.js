const express = require('express');
const router = express.Router();
const { query } = require('../config/db');
const { logger } = require('../config/logger');

/**
 * GET /health
 * High-performance health check endpoint
 */
router.get('/', async (req, res) => {
  const startTime = Date.now();
  let dbStatus = 'healthy';
  let dbLatencyMs = 0;

  try {
    const dbStart = Date.now();
    await query('SELECT 1');
    dbLatencyMs = Date.now() - dbStart;
  } catch (err) {
    dbStatus = 'unreachable';
    logger.error(`[HEALTH-CHECK-DB-ERROR] ${err.message}`);
  }

  const memoryUsage = process.memoryUsage();

  const healthData = {
    status: dbStatus === 'healthy' ? 'pass' : 'warn',
    service: 'youtube-channel-manager',
    timestamp: new Date().toISOString(),
    uptimeSeconds: Math.floor(process.uptime()),
    database: {
      status: dbStatus,
      latencyMs: dbLatencyMs,
      engine: 'PostgreSQL 18'
    },
    system: {
      nodeVersion: process.version,
      platform: process.platform,
      memoryRssMb: Math.round(memoryUsage.rss / 1024 / 1024),
      memoryHeapUsedMb: Math.round(memoryUsage.heapUsed / 1024 / 1024)
    },
    config: {
      activeLogLevel: logger.level,
      environment: process.env.NODE_ENV || 'production'
    },
    responseTimeMs: Date.now() - startTime
  };

  const httpStatus = dbStatus === 'healthy' ? 200 : 503;
  return res.status(httpStatus).json(healthData);
});

module.exports = router;
