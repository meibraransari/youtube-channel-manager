const { query } = require('../config/db');

/**
 * Middleware that dynamically verifies if Swagger is enabled in system_settings
 */
async function checkSwaggerEnabled(req, res, next) {
  try {
    const settingRes = await query(
      "SELECT value FROM system_settings WHERE key = 'swagger_enabled'"
    );

    let isEnabled = true;
    if (settingRes.rows.length > 0) {
      const val = settingRes.rows[0].value;
      isEnabled = val === true || val === 'true' || val === 1 || val === '1';
    }

    if (!isEnabled) {
      return res.status(403).send(`
        <!DOCTYPE html>
        <html lang="en">
        <head>
          <meta charset="UTF-8">
          <title>Swagger API Explorer Disabled | YouTube Channel Manager</title>
          <style>
            body {
              background: #070913;
              color: #f8fafc;
              font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
              display: flex;
              align-items: center;
              justify-content: center;
              height: 100vh;
              margin: 0;
            }
            .card {
              background: rgba(17, 24, 54, 0.85);
              border: 1px solid rgba(239, 68, 68, 0.4);
              box-shadow: 0 0 30px rgba(239, 68, 68, 0.2);
              border-radius: 16px;
              padding: 40px;
              max-width: 500px;
              text-align: center;
              backdrop-filter: blur(12px);
            }
            h1 { color: #f87171; font-size: 24px; margin-bottom: 12px; }
            p { color: #94a3b8; font-size: 15px; line-height: 1.6; }
            .btn {
              display: inline-block;
              margin-top: 20px;
              padding: 10px 24px;
              background: linear-gradient(135deg, #00f5ff, #8b5cf6);
              color: #070913;
              font-weight: 700;
              text-decoration: none;
              border-radius: 8px;
            }
          </style>
        </head>
        <body>
          <div class="card">
            <div style="font-size: 48px; margin-bottom: 16px;">🔒</div>
            <h1>Swagger Documentation Disabled</h1>
            <p>Interactive API Explorer has been disabled by the system administrator in <strong>System Settings</strong>.</p>
            <p>You can re-enable it instantly without restarting the server by visiting the <strong>Settings</strong> console.</p>
            <a href="/" class="btn">Return to Control Console</a>
          </div>
        </body>
        </html>
      `);
    }

    next();
  } catch (err) {
    // If DB check fails, default to allow or report error
    next();
  }
}

module.exports = {
  checkSwaggerEnabled
};
