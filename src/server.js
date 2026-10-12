require('dotenv').config();
const express = require('express');
const path = require('path');
const cors = require('cors');
const helmet = require('helmet');
const compression = require('compression');
const swaggerUi = require('swagger-ui-express');

const { initDatabase, query } = require('./config/db');
const { logger, setLogLevel } = require('./config/logger');
const { checkSwaggerEnabled } = require('./middleware/swaggerToggle');
const swaggerDocument = require('./swagger/swaggerDoc');

// Route modules
const healthRoutes = require('./routes/health.routes');
const authRoutes = require('./routes/auth.routes');
const contentRoutes = require('./routes/content.routes');
const usersRoutes = require('./routes/users.routes');
const settingsRoutes = require('./routes/settings.routes');
const auditRoutes = require('./routes/audit.routes');
const migrationRoutes = require('./routes/migration.routes');
const dashboardRoutes = require('./routes/dashboard.routes');
const channelsRoutes = require('./routes/channels.routes');
const { initCronScheduler } = require('./services/cronSync');

const app = express();
const PORT = process.env.PORT || 3000;
const HOST = process.env.HOST || '0.0.0.0';

// Compression & Body Parsers
app.use(compression());
app.use(express.json({ limit: '15mb' }));
app.use(express.urlencoded({ extended: true, limit: '15mb' }));
app.use(cors());

// Cyber Security Headers with permissive CSP for modern UI & CDNs
app.use(
  helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        scriptSrc: ["'self'", "'unsafe-inline'", "'unsafe-eval'", "https://cdn.jsdelivr.net", "https://unpkg.com"],
        styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com", "https://cdn.jsdelivr.net"],
        fontSrc: ["'self'", "https://fonts.gstatic.com", "https://cdn.jsdelivr.net", "data:"],
        imgSrc: ["'self'", "data:", "https:", "http:"],
        connectSrc: ["'self'", "https:", "http:"]
      }
    },
    crossOriginEmbedderPolicy: false
  })
);

// Request Logger Middleware
app.use((req, res, next) => {
  const start = Date.now();
  res.on('finish', () => {
    const duration = Date.now() - start;
    logger.http(`${req.method} ${req.originalUrl} ${res.statusCode} - ${duration}ms`);
  });
  next();
});

// Swagger Interactive Documentation with Dynamic Toggle Middleware
app.use(
  '/api/docs',
  checkSwaggerEnabled,
  swaggerUi.serve,
  swaggerUi.setup(swaggerDocument, {
    customCss: `
      .swagger-ui .topbar { background-color: #0d1127; border-bottom: 2px solid #00f5ff; }
      .swagger-ui { background-color: #070913; color: #f8fafc; }
      .swagger-ui .info .title { color: #00f5ff; }
      .swagger-ui .opblock { border-radius: 8px; }
    `,
    customSiteTitle: 'YouTube Channel Manager | API Documentation'
  })
);

// Expose OpenAPI JSON spec
app.get('/api/docs.json', checkSwaggerEnabled, (req, res) => {
  res.json(swaggerDocument);
});

// API Routes
app.use('/health', healthRoutes);
app.use('/api/auth', authRoutes);
app.use('/api/content', contentRoutes);
app.use('/api/users', usersRoutes);
app.use('/api/settings', settingsRoutes);
app.use('/api/audit', auditRoutes);
app.use('/api/migration', migrationRoutes);
app.use('/api/dashboard', dashboardRoutes);
app.use('/api/channels', channelsRoutes);

// Static frontend assets with zero-cache headers to prevent stale browser caching
const publicDir = path.join(__dirname, '../public');
app.use(express.static(publicDir, {
  etag: false,
  maxAge: 0,
  setHeaders: (res) => {
    res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
    res.setHeader('Pragma', 'no-cache');
    res.setHeader('Expires', '0');
    res.setHeader('Surrogate-Control', 'no-store');
  }
}));

// Fallback to index.html for SPA routing
app.get('*', (req, res) => {
  if (req.path.startsWith('/api/') || req.path.startsWith('/health')) {
    return res.status(404).json({ success: false, error: 'API endpoint not found' });
  }
  res.sendFile(path.join(publicDir, 'index.html'));
});

// Global Error Handler
app.use((err, req, res, next) => {
  logger.error(`[SERVER-ERROR] ${err.stack || err.message}`);
  res.status(500).json({
    success: false,
    error: 'Internal Server Error',
    message: process.env.NODE_ENV === 'development' ? err.message : undefined
  });
});

/**
 * Bootstrap Server & Database
 */
async function startServer() {
  try {
    logger.info('====================================================');
    logger.info('🚀 Launching YouTube Channel Manager Platform...');
    logger.info('====================================================');

    // Connect to database and ensure schema
    await initDatabase();

    // Fetch initial active console log level from system_settings
    try {
      const settingRes = await query("SELECT value FROM system_settings WHERE key = 'console_log_level'");
      if (settingRes.rows.length > 0) {
        let levelVal = settingRes.rows[0].value;
        if (typeof levelVal === 'string') levelVal = levelVal.replace(/^"|"$/g, '');
        setLogLevel(levelVal);
      }
    } catch (e) {
      logger.warn('[BOOT] Could not load console_log_level from DB, using default info.');
    }

    // Start Express listener
    app.listen(PORT, HOST, () => {
      logger.info(`✨ YouTube Channel Manager is running live at http://${HOST}:${PORT}`);
      logger.info(`📡 Health Check: http://${HOST}:${PORT}/health`);
      logger.info(`📖 API Documentation: http://${HOST}:${PORT}/api/docs`);
      logger.info(`👤 Default Admin: ${process.env.INITIAL_ADMIN_USERNAME || 'admin'}`);

      // Start automated metric sync cron scheduler
      initCronScheduler();
    });
  } catch (err) {
    logger.error(`❌ Critical Boot Failure: ${err.message}`);
    process.exit(1);
  }
}

startServer();

module.exports = app;
