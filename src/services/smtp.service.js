const nodemailer = require('nodemailer');
const { query } = require('../config/db');
const { logger } = require('../config/logger');

/**
 * Fetch all SMTP configuration directives from PostgreSQL system_settings
 */
async function getSmtpConfig() {
  const res = await query("SELECT key, value FROM system_settings WHERE key LIKE 'smtp_%'");
  const config = {};
  res.rows.forEach(r => {
    let v = r.value;
    if (typeof v === 'string') {
      v = v.replace(/^"|"$/g, '');
    }
    config[r.key] = v;
  });
  return config;
}

/**
 * Build a configured Nodemailer Transporter instance based on provided or saved options
 */
function createTransporter(options = {}) {
  const host = (options.host || options.smtp_host || '').trim();
  const port = parseInt(options.port || options.smtp_port || 587, 10);
  const encryption = (options.encryption || options.smtp_encryption || (port === 465 ? 'ssl' : 'tls')).toLowerCase();
  const isSecure = encryption === 'ssl' || port === 465;
  
  const authEnabled = options.auth_enabled !== undefined 
    ? Boolean(options.auth_enabled) 
    : (options.smtp_auth_enabled === true || options.smtp_auth_enabled === 'true' || options.smtp_auth_enabled === undefined);

  const user = (options.user || options.smtp_user || '').trim();
  const pass = options.pass !== undefined ? options.pass : (options.smtp_pass || '');
  
  const allowSelfSigned = options.allow_self_signed !== undefined
    ? Boolean(options.allow_self_signed)
    : (options.smtp_allow_self_signed === true || options.smtp_allow_self_signed === 'true');

  const timeoutSeconds = parseInt(options.timeout_seconds || options.smtp_timeout_seconds || 10, 10);
  const timeoutMs = Math.max(timeoutSeconds, 3) * 1000;

  const transportOpts = {
    host,
    port,
    secure: isSecure,
    connectionTimeout: timeoutMs,
    greetingTimeout: timeoutMs,
    socketTimeout: timeoutMs,
    tls: {
      rejectUnauthorized: !allowSelfSigned,
      minVersion: 'TLSv1.2'
    }
  };

  // Enforce STARTTLS for port 587 / TLS mode
  if (encryption === 'tls' && !isSecure) {
    transportOpts.requireTLS = true;
  } else if (encryption === 'none') {
    transportOpts.ignoreTLS = true;
  }

  // Include credentials only if authentication is toggled ON and credentials exist
  if (authEnabled && (user || pass)) {
    transportOpts.auth = {
      user,
      pass: typeof pass === 'string' ? pass.replace(/^"|"$/g, '') : pass
    };
  }

  return nodemailer.createTransport(transportOpts);
}

/**
 * Test SMTP connection and dispatch an optional live test email
 */
async function testSmtpConnection(customConfig = {}, toEmail = null, initiatedBy = 'Operator') {
  const savedConfig = await getSmtpConfig();
  const config = { ...savedConfig, ...customConfig };

  if (!config.smtp_host || !String(config.smtp_host).trim()) {
    throw new Error('SMTP Host / Server is required to establish connection.');
  }

  const startTime = Date.now();
  const transporter = createTransporter(config);

  logger.info(`[SMTP-TEST] Initiating connection verify to ${config.smtp_host}:${config.smtp_port} (auth: ${Boolean(config.smtp_user)})`);

  // 1. Verify connection & authentication handshake
  await transporter.verify();
  const handshakeTime = Date.now() - startTime;
  logger.info(`[SMTP-TEST] Handshake succeeded in ${handshakeTime}ms`);

  let sendResult = null;

  // 2. Dispatch live test email if recipient provided
  if (toEmail && String(toEmail).trim()) {
    const fromName = (config.smtp_from_name || 'YouTube Channel Manager').trim();
    const fromEmail = (config.smtp_from_email || config.smtp_user || `noreply@${config.smtp_host}`).trim();
    const fromFormatted = `"${fromName}" <${fromEmail}>`;

    const info = await transporter.sendMail({
      from: fromFormatted,
      to: toEmail.trim(),
      subject: `🚀 [YouTube Studio] SMTP Relay Test Verified (${new Date().toLocaleTimeString()})`,
      text: `SMTP Connection & Delivery Test Successful!\n\nHost: ${config.smtp_host}:${config.smtp_port}\nEncryption: ${(config.smtp_encryption || 'TLS').toUpperCase()}\nTimestamp: ${new Date().toISOString()}\nTested by: ${initiatedBy}`,
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <title>SMTP Relay Verification</title>
        </head>
        <body style="margin: 0; padding: 24px; background-color: #070913; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; color: #f8fafc;">
          <div style="max-width: 600px; margin: 0 auto; background: #0d1127; border: 1px solid #00f5ff; border-radius: 12px; overflow: hidden; box-shadow: 0 10px 30px rgba(0, 245, 255, 0.15);">
            <!-- Header -->
            <div style="background: linear-gradient(135deg, rgba(0, 245, 255, 0.15), rgba(16, 185, 129, 0.15)); padding: 24px; border-bottom: 1px solid rgba(0, 245, 255, 0.2);">
              <div style="display: flex; align-items: center; gap: 14px;">
                <div style="background: #00f5ff; color: #070913; font-weight: 900; font-size: 22px; width: 44px; height: 44px; line-height: 44px; text-align: center; border-radius: 10px; display: inline-block;">YT</div>
                <div>
                  <h1 style="margin: 0; font-size: 18px; color: #00f5ff; letter-spacing: 0.5px; font-weight: 800;">YOUTUBE CHANNEL MANAGER</h1>
                  <p style="margin: 4px 0 0 0; font-size: 12px; color: #94a3b8;">Multi-Channel Studio & Operations • PostgreSQL 18</p>
                </div>
              </div>
            </div>

            <!-- Body -->
            <div style="padding: 28px;">
              <div style="background: rgba(16, 185, 129, 0.1); border: 1px solid #10b981; border-radius: 8px; padding: 16px; margin-bottom: 24px;">
                <div style="color: #10b981; font-weight: 800; font-size: 15px; margin-bottom: 4px;">✅ SMTP RELAY CONNECTION VERIFIED</div>
                <div style="font-size: 13px; color: #cbd5e1; line-height: 1.5;">
                  Your Mail Transfer Agent (MTA) is authenticated and operational. Real-time alerts, sync reports, and milestone notifications can now be dispatched securely.
                </div>
              </div>

              <h3 style="font-size: 12px; font-weight: 800; color: #00f5ff; text-transform: uppercase; letter-spacing: 0.5px; margin: 0 0 12px 0;">
                DIAGNOSTIC TELEMETRY COORDINATES
              </h3>

              <table style="width: 100%; border-collapse: collapse; font-size: 13px; margin-bottom: 24px;">
                <tr style="border-bottom: 1px solid rgba(255, 255, 255, 0.06);">
                  <td style="padding: 10px 0; color: #94a3b8; width: 140px;">SMTP Server</td>
                  <td style="padding: 10px 0; color: #f8fafc; font-family: monospace; font-weight: 700;">${config.smtp_host}:${config.smtp_port}</td>
                </tr>
                <tr style="border-bottom: 1px solid rgba(255, 255, 255, 0.06);">
                  <td style="padding: 10px 0; color: #94a3b8;">Security Mode</td>
                  <td style="padding: 10px 0; color: #00f5ff; font-weight: 700;">${(config.smtp_encryption || 'TLS').toUpperCase()}</td>
                </tr>
                <tr style="border-bottom: 1px solid rgba(255, 255, 255, 0.06);">
                  <td style="padding: 10px 0; color: #94a3b8;">Authenticated User</td>
                  <td style="padding: 10px 0; color: #f8fafc; font-family: monospace;">${config.smtp_user || '(Anonymous / Local Relay)'}</td>
                </tr>
                <tr style="border-bottom: 1px solid rgba(255, 255, 255, 0.06);">
                  <td style="padding: 10px 0; color: #94a3b8;">Sender Identity</td>
                  <td style="padding: 10px 0; color: #f8fafc;">${fromFormatted}</td>
                </tr>
                <tr style="border-bottom: 1px solid rgba(255, 255, 255, 0.06);">
                  <td style="padding: 10px 0; color: #94a3b8;">Handshake Latency</td>
                  <td style="padding: 10px 0; color: #10b981; font-family: monospace; font-weight: 700;">${handshakeTime} ms</td>
                </tr>
                <tr style="border-bottom: 1px solid rgba(255, 255, 255, 0.06);">
                  <td style="padding: 10px 0; color: #94a3b8;">Initiated By</td>
                  <td style="padding: 10px 0; color: #f8fafc;">${initiatedBy}</td>
                </tr>
                <tr>
                  <td style="padding: 10px 0; color: #94a3b8;">Timestamp</td>
                  <td style="padding: 10px 0; color: #f8fafc;">${new Date().toUTCString()}</td>
                </tr>
              </table>

              <div style="text-align: center; padding-top: 18px; border-top: 1px solid rgba(255, 255, 255, 0.08); font-size: 11px; color: #64748b;">
                Generated by YouTube Channel Manager Console • Node.js ${process.version}
              </div>
            </div>
          </div>
        </body>
        </html>
      `
    });

    sendResult = {
      messageId: info.messageId,
      accepted: info.accepted,
      response: info.response
    };
    logger.info(`[SMTP-TEST] Test email successfully delivered to ${toEmail}: ${info.messageId}`);
  }

  const totalTime = Date.now() - startTime;
  return {
    success: true,
    handshakeLatencyMs: handshakeTime,
    totalLatencyMs: totalTime,
    host: config.smtp_host,
    port: config.smtp_port,
    encryption: config.smtp_encryption || 'tls',
    emailSent: Boolean(toEmail),
    recipient: toEmail,
    sendResult
  };
}

module.exports = {
  getSmtpConfig,
  createTransporter,
  testSmtpConnection
};
