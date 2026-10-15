/**
 * System Settings & Automation Directives Component
 * Dynamic Logging, Swagger Toggle, YouTube API Cron Job Sync & Rapid Channel Onboarding
 */
const SettingsComponent = {
  async render(container) {
    container.innerHTML = `
      <div style="display: flex; align-items: center; justify-content: center; height: 320px;">
        <div style="font-family: var(--font-tech); color: var(--accent-teal); font-size: 16px;">
          LOADING SYSTEM DIRECTIVES & CONFIGURATION...
        </div>
      </div>
    `;

    try {
      const res = await API.settings.get();
      const settings = res.settings;
      const activeLogLevel = res.activeLogLevel || 'info';

      // Parse values safely
      const parseVal = (val, defaultVal) => {
        if (val === undefined || val === null) return defaultVal;
        if (typeof val === 'string') {
          return val.replace(/^"|"$/g, '');
        }
        return val;
      };

      const consoleLogLevel = parseVal(settings.console_log_level, 'info');
      const swaggerEnabled = settings.swagger_enabled === true || settings.swagger_enabled === 'true';
      const cronEnabled = settings.cron_sync_enabled === true || settings.cron_sync_enabled === 'true';
      const cronInterval = parseVal(settings.cron_sync_interval_hours, '6');
      const youtubeApiKey = parseVal(settings.youtube_api_key, '');
      const lastSyncStatus = parseVal(settings.last_cron_sync_status, 'idle');
      const channelName = parseVal(settings.channel_name, 'Studio Channel');
      const channelHandle = parseVal(settings.channel_handle, '@StudioChannel');
      const channelUrl = parseVal(settings.channel_url, 'https://www.youtube.com/@StudioChannel');
      const authorName = parseVal(settings.author_name, 'Studio Creator');
      const githubUrl = parseVal(settings.github_url, 'https://github.com/meibraransari/youtube-channel-manager');

      // SMTP Server Directives
      const smtpHost = parseVal(settings.smtp_host, '');
      const smtpPort = parseVal(settings.smtp_port, '587');
      const smtpEncryption = parseVal(settings.smtp_encryption, 'tls');
      const smtpAuthEnabled = settings.smtp_auth_enabled === undefined || settings.smtp_auth_enabled === true || settings.smtp_auth_enabled === 'true';
      const smtpUser = parseVal(settings.smtp_user, '');
      const smtpPass = parseVal(settings.smtp_pass, '');
      const smtpFromEmail = parseVal(settings.smtp_from_email, '');
      const smtpFromName = parseVal(settings.smtp_from_name, 'YouTube Channel Manager');
      const smtpAllowSelfSigned = settings.smtp_allow_self_signed === true || settings.smtp_allow_self_signed === 'true';
      const smtpTimeout = parseVal(settings.smtp_timeout_seconds, '10');
      const smtpNotificationsEnabled = settings.smtp_notifications_enabled === true || settings.smtp_notifications_enabled === 'true';
      const currentUser = API.getUser() || {};

      // Telemetry Email Report Directives
      const telemetryReportEnabled = settings.telemetry_report_enabled === undefined || settings.telemetry_report_enabled === true || settings.telemetry_report_enabled === 'true';
      const telemetryReportCron = parseVal(settings.telemetry_report_cron, '0 8 * * *');
      const telemetryReportSchedulePreset = parseVal(settings.telemetry_report_schedule_preset, 'daily-08');
      const telemetryReportRecipients = parseVal(settings.telemetry_report_recipients, currentUser.email || 'admin@ytstudio.local');
      
      let telemetryReportMetrics = settings.telemetry_report_metrics;
      if (typeof telemetryReportMetrics === 'string') {
        try { telemetryReportMetrics = JSON.parse(telemetryReportMetrics); } catch (e) { telemetryReportMetrics = null; }
      }
      if (!Array.isArray(telemetryReportMetrics)) {
        telemetryReportMetrics = ['subscribers', 'views', 'content_breakdown', 'server_health', 'top_videos', 'recent_audit', 'snapshots_status'];
      }

      const telemetryReportTemplateTheme = parseVal(settings.telemetry_report_template_theme, 'executive_dark');
      const telemetryReportCustomNotes = parseVal(settings.telemetry_report_custom_notes, 'Daily Automated Creator & Infrastructure Intelligence Digest');
      const telemetryReportCustomTemplate = parseVal(settings.telemetry_report_custom_template, '');
      const telemetryReportLastSentAt = parseVal(settings.telemetry_report_last_sent_at, null);
      const telemetryReportLastStatus = parseVal(settings.telemetry_report_last_status, 'idle');

      // Media & Asset Storage Directives
      const allowedMediaExtensions = parseVal(settings.allowed_media_extensions, '.mp4,.png');
      const maxMediaUploadSizeMb = parseVal(settings.max_media_upload_size_mb, '500');

      // n8n Workflow Automation Engine Directives
      const n8nBaseUrl = parseVal(settings.n8n_base_url, 'http://localhost:5678');
      const n8nApiKey = parseVal(settings.n8n_api_key, '');
      const n8nDefaultWebhookToken = parseVal(settings.n8n_default_webhook_token, '');
      const n8nDefaultTimeout = parseVal(settings.n8n_default_timeout_seconds, '30');
      const n8nEnabled = settings.n8n_integration_enabled === undefined || settings.n8n_integration_enabled === true || settings.n8n_integration_enabled === 'true';

      // Random 2-digit numbers for Flush Data verification challenge
      const num1 = Math.floor(Math.random() * 80) + 10;
      const num2 = Math.floor(Math.random() * 80) + 10;
      const flushAnswerExpected = num1 + num2;

      container.innerHTML = `
        <div style="max-width: 960px; margin: 0 auto;">
          <!-- Header -->
          <div class="glass-card" style="padding: 22px; margin-bottom: 22px;">
            <div style="display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 12px;">
              <div>
                <h1 style="font-size: 20px; font-weight: 800; display: flex; align-items: center; gap: 10px; color: var(--text-main);">
                  <span>⚙️</span> SYSTEM CONFIGURATION & DIRECTIVES
                </h1>
                <p style="font-size: 12px; color: var(--text-dim); margin-top: 3px;">
                  All directives are persisted dynamically in PostgreSQL <code>system_settings</code>. Zero container restarts needed!
                </p>
              </div>
              <div>
                <button class="btn-cyber btn-cyber-primary" id="saveAllSettingsBtn">
                  <span>💾</span> COMMIT ALL SETTINGS
                </button>
              </div>
            </div>
          </div>

          <!-- Section 1: Automated Cron Job Sync Settings -->
          <div class="glass-card" style="padding: 24px; margin-bottom: 22px; border-color: var(--accent-emerald);">
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 14px;">
              <div style="display: flex; align-items: center; gap: 8px;">
                <span style="font-size: 20px;">⏱️</span>
                <h3 style="font-size: 15px; font-weight: 700; color: var(--text-main);">
                  AUTOMATED TELEMETRY CRON JOB
                </h3>
              </div>
              <span class="badge ${cronEnabled ? 'badge-emerald' : 'badge-amber'}" id="cronStatusBadge">
                ${cronEnabled ? 'CRON SCHEDULER ACTIVE' : 'CRON PAUSED'}
              </span>
            </div>
            <p style="font-size: 12px; color: var(--text-muted); margin-bottom: 16px;">
              Automated background engine that fetches video views, likes, comments, and subscriber metrics, generating snapshots in PostgreSQL.
            </p>

            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 16px; margin-bottom: 16px;">
              <div>
                <label style="font-size: 11px; font-weight: 700; color: var(--text-dim); text-transform: uppercase;">Automated Execution Interval</label>
                <select id="settingCronInterval" class="cyber-input" style="margin-top: 6px;">
                  <option value="1" ${cronInterval === '1' ? 'selected' : ''}>Every 1 Hour (High Frequency)</option>
                  <option value="2" ${cronInterval === '2' ? 'selected' : ''}>Every 2 Hours</option>
                  <option value="6" ${cronInterval === '6' ? 'selected' : ''}>Every 6 Hours (Recommended)</option>
                  <option value="12" ${cronInterval === '12' ? 'selected' : ''}>Every 12 Hours</option>
                  <option value="24" ${cronInterval === '24' ? 'selected' : ''}>Every 24 Hours (Daily Cadence)</option>
                </select>
              </div>
              <div>
                <label style="font-size: 11px; font-weight: 700; color: var(--text-dim); text-transform: uppercase;">YouTube Data API v3 Key (Optional)</label>
                <input type="password" id="settingYoutubeApiKey" class="cyber-input" placeholder="AIzaSy..." value="${youtubeApiKey}" style="margin-top: 6px;" />
              </div>
            </div>

            <div style="display: flex; align-items: center; justify-content: space-between; background: rgba(0,0,0,0.18); padding: 14px 18px; border-radius: var(--radius-sm); flex-wrap: wrap; gap: 12px;">
              <label style="display: flex; align-items: center; gap: 10px; font-weight: 700; font-size: 13px; cursor: pointer;">
                <input type="checkbox" id="settingCronToggle" ${cronEnabled ? 'checked' : ''} style="width: 18px; height: 18px; accent-color: var(--accent-emerald);" />
                <span>ENABLE CRON TELEMETRY SCHEDULER</span>
              </label>

              <button class="btn-cyber btn-cyber-primary btn-sm" id="triggerCronNowBtn" style="display: flex; align-items: center; gap: 6px;">
                <span>🔄</span>
                <span>RUN TELEMETRY SYNC NOW</span>
              </button>
            </div>
          </div>

          <!-- Section 2: Rapid YouTube Channel Onboarding Engine -->
          <div class="glass-card" style="padding: 24px; margin-bottom: 22px; border-color: var(--accent-teal);">
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 14px;">
              <div style="display: flex; align-items: center; gap: 8px;">
                <span style="font-size: 20px;">🚀</span>
                <h3 style="font-size: 15px; font-weight: 700; color: var(--text-main);">
                  RAPID CHANNEL ONBOARDING & FEED ENGINE
                </h3>
              </div>
              <span class="badge badge-teal">INSTANT FEED</span>
            </div>
            <p style="font-size: 12px; color: var(--text-muted); margin-bottom: 16px;">
              Connect any existing YouTube channel by URL or handle. The engine ingests channel data, establishes snapshots, and feeds catalog metadata into PostgreSQL 18.
            </p>

            <form id="channelIngestionForm" style="display: flex; flex-direction: column; gap: 14px;">
              <div style="display: grid; grid-template-columns: 2fr 1fr; gap: 14px;">
                <div>
                  <label style="font-size: 11px; font-weight: 700; color: var(--text-dim); text-transform: uppercase;">YouTube Channel URL or @Handle *</label>
                  <input type="text" id="ingestChannelInput" class="cyber-input" placeholder="https://www.youtube.com/@channel or @channel" required style="margin-top: 6px;" />
                </div>
                <div>
                  <label style="font-size: 11px; font-weight: 700; color: var(--text-dim); text-transform: uppercase;">Display Channel Name</label>
                  <input type="text" id="ingestChannelName" class="cyber-input" placeholder="My Tech Channel" style="margin-top: 6px;" />
                </div>
              </div>

              <div style="display: flex; justify-content: flex-end;">
                <button type="submit" class="btn-cyber btn-cyber-primary" id="submitIngestBtn" style="display: flex; align-items: center; gap: 8px;">
                  <span>📥</span>
                  <span>INGEST CHANNEL & FEED DATABASE</span>
                </button>
              </div>
            </form>
          </div>

          <!-- Section 3: SMTP Mail Server & Transactional Notifications -->
          <div class="glass-card" style="padding: 24px; margin-bottom: 22px; border-color: var(--accent-teal);">
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 14px; flex-wrap: wrap; gap: 10px;">
              <div style="display: flex; align-items: center; gap: 8px;">
                <span style="font-size: 20px;">📧</span>
                <h3 style="font-size: 15px; font-weight: 700; color: var(--text-main);">
                  SMTP MAIL SERVER & NOTIFICATIONS
                </h3>
              </div>
              <span class="badge ${smtpHost ? (smtpNotificationsEnabled ? 'badge-emerald' : 'badge-amber') : 'badge-cyan'}" id="smtpStatusBadge">
                ${smtpHost ? (smtpNotificationsEnabled ? 'SMTP CONFIGURED & ACTIVE' : 'SMTP CONFIGURED (NOTIFICATIONS OFF)') : 'SMTP UNCONFIGURED'}
              </span>
            </div>
            <p style="font-size: 12px; color: var(--text-muted); margin-bottom: 16px;">
              Configure outgoing Simple Mail Transfer Protocol (SMTP) relay directives for system transactional alerts, automated cron telemetry reports, and operational notifications.
            </p>

            <!-- Quick Preset Buttons -->
            <div style="background: rgba(0,0,0,0.18); padding: 12px 16px; border-radius: var(--radius-sm); margin-bottom: 18px; border: 1px solid var(--border-color);">
              <div style="font-size: 11px; font-weight: 700; color: var(--text-dim); text-transform: uppercase; margin-bottom: 8px;">
                ⚡ Quick Presets (Click to apply recommended port & encryption)
              </div>
              <div style="display: flex; gap: 8px; flex-wrap: wrap;">
                <button type="button" class="btn-cyber btn-cyber-outline btn-sm smtp-preset-btn" data-port="587" data-enc="tls">
                  Port 587 • STARTTLS (Gmail / Outlook / SendGrid)
                </button>
                <button type="button" class="btn-cyber btn-cyber-outline btn-sm smtp-preset-btn" data-port="465" data-enc="ssl">
                  Port 465 • SSL / Direct TLS (Secure SMTPS)
                </button>
                <button type="button" class="btn-cyber btn-cyber-outline btn-sm smtp-preset-btn" data-port="25" data-enc="none">
                  Port 25 • Standard Relay (Internal Postfix / Relay)
                </button>
                <button type="button" class="btn-cyber btn-cyber-outline btn-sm smtp-preset-btn" data-port="2525" data-enc="tls">
                  Port 2525 • Alt TLS (Mailgun / AWS SES)
                </button>
              </div>
            </div>

            <!-- Server Connection Coordinates -->
            <div style="display: grid; grid-template-columns: 2fr 1fr 1fr; gap: 14px; margin-bottom: 16px;">
              <div>
                <label style="font-size: 11px; font-weight: 700; color: var(--text-dim); text-transform: uppercase;">SMTP Host / Server Domain *</label>
                <input type="text" id="settingSmtpHost" class="cyber-input" placeholder="smtp.gmail.com or mail.yourdomain.com" value="${smtpHost}" style="margin-top: 6px;" />
              </div>
              <div>
                <label style="font-size: 11px; font-weight: 700; color: var(--text-dim); text-transform: uppercase;">SMTP Port *</label>
                <input type="number" id="settingSmtpPort" class="cyber-input" placeholder="587" value="${smtpPort}" style="margin-top: 6px;" />
              </div>
              <div>
                <label style="font-size: 11px; font-weight: 700; color: var(--text-dim); text-transform: uppercase;">Encryption / Security</label>
                <select id="settingSmtpEncryption" class="cyber-input" style="margin-top: 6px;">
                  <option value="tls" ${smtpEncryption === 'tls' ? 'selected' : ''}>STARTTLS (Opportunistic TLS)</option>
                  <option value="ssl" ${smtpEncryption === 'ssl' ? 'selected' : ''}>SSL / Direct TLS (Port 465)</option>
                  <option value="none" ${smtpEncryption === 'none' ? 'selected' : ''}>None (Unencrypted Relay)</option>
                </select>
              </div>
            </div>

            <!-- Authentication Block -->
            <div style="background: rgba(0,0,0,0.14); border: 1px solid var(--border-color); border-radius: var(--radius-sm); padding: 14px 16px; margin-bottom: 16px;">
              <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 12px; flex-wrap: wrap; gap: 8px;">
                <label style="display: flex; align-items: center; gap: 8px; font-weight: 700; font-size: 12px; cursor: pointer;">
                  <input type="checkbox" id="settingSmtpAuthToggle" ${smtpAuthEnabled ? 'checked' : ''} style="width: 16px; height: 16px; accent-color: var(--accent-teal);" />
                  <span>ENABLE SMTP AUTHENTICATION (AUTH PLAIN / LOGIN)</span>
                </label>
                <span style="font-size: 11px; color: var(--text-dim);">Required by public providers (Google, Microsoft 365, SendGrid)</span>
              </div>

              <div id="smtpCredentialsContainer" style="display: grid; grid-template-columns: 1fr 1fr; gap: 14px; transition: opacity 0.2s ease;">
                <div>
                  <label style="font-size: 11px; font-weight: 700; color: var(--text-dim); text-transform: uppercase;">SMTP Username / Account</label>
                  <input type="text" id="settingSmtpUser" class="cyber-input" placeholder="e.g. notifications@studio.com or apikey" value="${smtpUser}" style="margin-top: 6px;" autocomplete="off" />
                </div>
                <div>
                  <label style="font-size: 11px; font-weight: 700; color: var(--text-dim); text-transform: uppercase;">SMTP Password / App Secret</label>
                  <div style="display: flex; gap: 6px; margin-top: 6px;">
                    <input type="password" id="settingSmtpPass" class="cyber-input" placeholder="••••••••••••" value="${smtpPass}" style="flex: 1;" autocomplete="new-password" />
                    <button type="button" class="btn-cyber btn-cyber-outline" id="toggleSmtpPassBtn" title="Reveal / Mask Password" style="padding: 0 12px;">
                      👁️
                    </button>
                  </div>
                </div>
              </div>
            </div>

            <!-- Sender Identity & Advanced Settings -->
            <div style="display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 14px; margin-bottom: 16px;">
              <div>
                <label style="font-size: 11px; font-weight: 700; color: var(--text-dim); text-transform: uppercase;">Sender (From) Email *</label>
                <input type="email" id="settingSmtpFromEmail" class="cyber-input" placeholder="noreply@studio.com" value="${smtpFromEmail}" style="margin-top: 6px;" />
              </div>
              <div>
                <label style="font-size: 11px; font-weight: 700; color: var(--text-dim); text-transform: uppercase;">Sender Display Name</label>
                <input type="text" id="settingSmtpFromName" class="cyber-input" placeholder="YouTube Channel Manager" value="${smtpFromName}" style="margin-top: 6px;" />
              </div>
              <div>
                <label style="font-size: 11px; font-weight: 700; color: var(--text-dim); text-transform: uppercase;">Timeout (Seconds)</label>
                <input type="number" id="settingSmtpTimeout" class="cyber-input" min="3" max="60" placeholder="10" value="${smtpTimeout}" style="margin-top: 6px;" />
              </div>
            </div>

            <!-- Security Options & Notification Dispatch Toggles -->
            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 14px; margin-bottom: 20px; background: rgba(0,0,0,0.18); padding: 12px 16px; border-radius: var(--radius-sm);">
              <label style="display: flex; align-items: center; gap: 10px; cursor: pointer; font-size: 12px; font-weight: 600;">
                <input type="checkbox" id="settingSmtpSelfSigned" ${smtpAllowSelfSigned ? 'checked' : ''} style="width: 16px; height: 16px; accent-color: var(--accent-teal);" />
                <div>
                  <div>Allow Self-Signed TLS Certificates</div>
                  <div style="font-size: 10px; color: var(--text-dim); font-weight: 400;">Bypasses strict SSL CA verification for internal relays</div>
                </div>
              </label>

              <label style="display: flex; align-items: center; gap: 10px; cursor: pointer; font-size: 12px; font-weight: 600;">
                <input type="checkbox" id="settingSmtpNotificationsEnabled" ${smtpNotificationsEnabled ? 'checked' : ''} style="width: 16px; height: 16px; accent-color: var(--accent-emerald);" />
                <div>
                  <div>Enable Transactional Email Alerts</div>
                  <div style="font-size: 10px; color: var(--text-dim); font-weight: 400;">Send email notices on cron telemetry syncs & channel milestones</div>
                </div>
              </label>
            </div>

            <!-- Card Actions: Test & Save -->
            <div style="display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 12px; padding-top: 14px; border-top: 1px solid var(--border-color);">
              <div>
                <button type="button" class="btn-cyber btn-cyber-outline" id="btnOpenSmtpTestModal" style="display: flex; align-items: center; gap: 8px;">
                  <span>⚡</span>
                  <span>TEST SMTP CONFIGURATION & SEND EMAIL</span>
                </button>
              </div>
              <div>
                <button type="button" class="btn-cyber btn-cyber-primary" id="btnSaveSmtpCard" style="display: flex; align-items: center; gap: 8px;">
                  <span>💾</span>
                  <span>SAVE SMTP CONFIGURATION</span>
                </button>
              </div>
            </div>
          </div>

          <!-- Section 3.5: Automated Telemetry Report & Email Digest Card -->
          <div class="glass-card" style="padding: 24px; margin-bottom: 22px; border-color: var(--accent-teal);">
            <!-- Card Header -->
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 14px; flex-wrap: wrap; gap: 10px;">
              <div style="display: flex; align-items: center; gap: 10px;">
                <span style="font-size: 22px;">📊</span>
                <div>
                  <h3 style="font-size: 15px; font-weight: 700; color: var(--text-main); margin: 0;">
                    AUTOMATED TELEMETRY REPORT & EMAIL DIGEST
                  </h3>
                  <div style="font-size: 11px; color: var(--text-dim); margin-top: 2px;">
                    Daily scheduled metrics alert delivered via configured SMTP relay.
                  </div>
                </div>
              </div>
              <div style="display: flex; align-items: center; gap: 8px;">
                <span class="badge ${telemetryReportEnabled ? 'badge-emerald' : 'badge-amber'}" id="telemetryCronBadge">
                  ${telemetryReportEnabled ? 'CRON REPORT ACTIVE' : 'CRON REPORT PAUSED'}
                </span>
                <span class="badge badge-cyan" id="telemetryThemeBadge">
                  THEME: ${telemetryReportTemplateTheme.toUpperCase().replace('_', ' ')}
                </span>
              </div>
            </div>

            <!-- Recipient & Sender Coordinates -->
            <div style="background: rgba(0,0,0,0.2); border: 1px solid var(--border-color); border-radius: var(--radius-sm); padding: 14px 16px; margin-bottom: 16px;">
              <div style="display: grid; grid-template-columns: 2fr 1fr; gap: 14px;">
                <div>
                  <label style="font-size: 11px; font-weight: 700; color: var(--text-dim); text-transform: uppercase; display: flex; align-items: center; justify-content: space-between;">
                    <span>Recipient Email Addresses (Comma-Separated) *</span>
                    <span style="font-weight: 400; text-transform: none; color: var(--text-muted); font-size: 10px;">Multiple recipients supported</span>
                  </label>
                  <input type="text" id="settingTelemetryRecipients" class="cyber-input" placeholder="admin@domain.com, ops@domain.com, creator@domain.com" value="${telemetryReportRecipients}" style="margin-top: 6px;" />
                  <div style="font-size: 10px; color: var(--text-dim); margin-top: 4px;">
                    Separate multiple recipient emails with commas. All recipients will receive the daily telemetry briefing.
                  </div>
                </div>
                <div>
                  <label style="font-size: 11px; font-weight: 700; color: var(--text-dim); text-transform: uppercase;">Sender Relay Identity</label>
                  <div style="margin-top: 6px; padding: 9px 12px; background: rgba(255,255,255,0.03); border: 1px dashed var(--border-color); border-radius: var(--radius-sm); font-size: 11px; color: var(--text-muted);">
                    <div style="color: var(--accent-teal); font-weight: 700; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;" id="telemetryFromEmailDisplay">
                      ${smtpFromEmail || smtpUser || (smtpHost ? 'noreply@' + smtpHost : 'Configure SMTP Relay First')}
                    </div>
                    <div style="font-size: 10px; color: var(--text-dim); margin-top: 2px;">
                      From Name: "${smtpFromName || 'YouTube Channel Manager'}"
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <!-- Execution Cadence / Cron Job Schedule -->
            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 14px; margin-bottom: 16px;">
              <div>
                <label style="font-size: 11px; font-weight: 700; color: var(--text-dim); text-transform: uppercase;">
                  Automated Execution Cadence (Cron Job)
                </label>
                <select id="settingTelemetryPreset" class="cyber-input" style="margin-top: 6px;">
                  <option value="daily-08" ${telemetryReportSchedulePreset === 'daily-08' ? 'selected' : ''}>Every Day at 08:00 AM (Morning Digest)</option>
                  <option value="daily-12" ${telemetryReportSchedulePreset === 'daily-12' ? 'selected' : ''}>Every Day at 12:00 PM (Midday Velocity)</option>
                  <option value="daily-20" ${telemetryReportSchedulePreset === 'daily-20' ? 'selected' : ''}>Every Day at 08:00 PM (Evening Summary)</option>
                  <option value="interval-6" ${telemetryReportSchedulePreset === 'interval-6' ? 'selected' : ''}>Every 6 Hours (Periodic Pulse)</option>
                  <option value="interval-12" ${telemetryReportSchedulePreset === 'interval-12' ? 'selected' : ''}>Every 12 Hours (Bi-Daily Pulse)</option>
                  <option value="interval-1" ${telemetryReportSchedulePreset === 'interval-1' ? 'selected' : ''}>Every 1 Hour (High-Frequency SRE)</option>
                  <option value="custom" ${telemetryReportSchedulePreset === 'custom' ? 'selected' : ''}>Custom Cron Expression</option>
                </select>
              </div>

              <div>
                <label style="font-size: 11px; font-weight: 700; color: var(--text-dim); text-transform: uppercase; display: flex; justify-content: space-between;">
                  <span>Cron Expression (5-Part Standard)</span>
                  <span style="font-weight: 400; text-transform: none; color: var(--text-dim); font-size: 10px;">min hour dom mon dow</span>
                </label>
                <input type="text" id="settingTelemetryCron" class="cyber-input font-mono" placeholder="0 8 * * *" value="${telemetryReportCron}" style="margin-top: 6px;" />
              </div>
            </div>

            <!-- Checkbox of Metrics (What I am interested to get) -->
            <div style="margin-bottom: 16px;">
              <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px;">
                <label style="font-size: 11px; font-weight: 700; color: var(--text-dim); text-transform: uppercase;">
                  Included Telemetry Metrics Checkboxes (Select What To Receive)
                </label>
                <div style="display: flex; gap: 8px;">
                  <button type="button" class="btn-cyber btn-cyber-outline btn-xs" id="btnSelectAllTelemetryMetrics" style="font-size: 10px; padding: 2px 8px;">Select All</button>
                  <button type="button" class="btn-cyber btn-cyber-outline btn-xs" id="btnDeselectAllTelemetryMetrics" style="font-size: 10px; padding: 2px 8px;">Clear All</button>
                </div>
              </div>

              <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 10px; background: rgba(0,0,0,0.18); padding: 14px; border-radius: var(--radius-sm); border: 1px solid var(--border-color);">
                <label style="display: flex; align-items: flex-start; gap: 10px; cursor: pointer; font-size: 12px; margin: 0;">
                  <input type="checkbox" class="telemetry-metric-check" value="subscribers" ${telemetryReportMetrics.includes('subscribers') ? 'checked' : ''} style="margin-top: 2px; width: 16px; height: 16px; accent-color: var(--accent-cyan);" />
                  <div>
                    <div style="font-weight: 700; color: var(--text-main);">👥 Channel Subscribers & Reach</div>
                    <div style="font-size: 10px; color: var(--text-dim);">Total audience reach across channels, 24h delta, and growth velocity</div>
                  </div>
                </label>

                <label style="display: flex; align-items: flex-start; gap: 10px; cursor: pointer; font-size: 12px; margin: 0;">
                  <input type="checkbox" class="telemetry-metric-check" value="views" ${telemetryReportMetrics.includes('views') ? 'checked' : ''} style="margin-top: 2px; width: 16px; height: 16px; accent-color: var(--accent-emerald);" />
                  <div>
                    <div style="font-weight: 700; color: var(--text-main);">👁️ Aggregated Views & Engagement</div>
                    <div style="font-size: 10px; color: var(--text-dim);">Cumulative watch impressions, likes, and audience engagement</div>
                  </div>
                </label>

                <label style="display: flex; align-items: flex-start; gap: 10px; cursor: pointer; font-size: 12px; margin: 0;">
                  <input type="checkbox" class="telemetry-metric-check" value="content_breakdown" ${telemetryReportMetrics.includes('content_breakdown') ? 'checked' : ''} style="margin-top: 2px; width: 16px; height: 16px; accent-color: var(--accent-purple);" />
                  <div>
                    <div style="font-weight: 700; color: var(--text-main);">🎬 Content Breakdown (Videos, Shorts, Podcasts)</div>
                    <div style="font-size: 10px; color: var(--text-dim);">Detailed inventory counts: Long-form 16:9, Shorts 9:16, and Podcast episodes</div>
                  </div>
                </label>

                <label style="display: flex; align-items: flex-start; gap: 10px; cursor: pointer; font-size: 12px; margin: 0;">
                  <input type="checkbox" class="telemetry-metric-check" value="server_health" ${telemetryReportMetrics.includes('server_health') ? 'checked' : ''} style="margin-top: 2px; width: 16px; height: 16px; accent-color: var(--accent-teal);" />
                  <div>
                    <div style="font-weight: 700; color: var(--text-main);">⚡ Server Runtime & PostgreSQL 18 Latency</div>
                    <div style="font-size: 10px; color: var(--text-dim);">Node.js uptime, memory RSS/Heap, DB ping latency, and platform telemetry</div>
                  </div>
                </label>

                <label style="display: flex; align-items: flex-start; gap: 10px; cursor: pointer; font-size: 12px; margin: 0;">
                  <input type="checkbox" class="telemetry-metric-check" value="top_videos" ${telemetryReportMetrics.includes('top_videos') ? 'checked' : ''} style="margin-top: 2px; width: 16px; height: 16px; accent-color: var(--accent-cyan);" />
                  <div>
                    <div style="font-weight: 700; color: var(--text-main);">🏆 Top Content Assets Leaderboard</div>
                    <div style="font-size: 10px; color: var(--text-dim);">Top 5 highest performing videos/shorts ranked by lifetime audience views</div>
                  </div>
                </label>

                <label style="display: flex; align-items: flex-start; gap: 10px; cursor: pointer; font-size: 12px; margin: 0;">
                  <input type="checkbox" class="telemetry-metric-check" value="recent_audit" ${telemetryReportMetrics.includes('recent_audit') ? 'checked' : ''} style="margin-top: 2px; width: 16px; height: 16px; accent-color: var(--accent-amber);" />
                  <div>
                    <div style="font-weight: 700; color: var(--text-main);">🔒 Security & Admin Audit Trail</div>
                    <div style="font-size: 10px; color: var(--text-dim);">Operator actions, configuration modifications, and system alerts in past 24h</div>
                  </div>
                </label>

                <label style="display: flex; align-items: flex-start; gap: 10px; cursor: pointer; font-size: 12px; margin: 0; grid-column: span 2;">
                  <input type="checkbox" class="telemetry-metric-check" value="snapshots_status" ${telemetryReportMetrics.includes('snapshots_status') ? 'checked' : ''} style="margin-top: 2px; width: 16px; height: 16px; accent-color: var(--accent-emerald);" />
                  <div>
                    <div style="font-weight: 700; color: var(--text-main);">⏱️ Snapshot Synchronization Telemetry</div>
                    <div style="font-size: 10px; color: var(--text-dim);">Historical snapshots recorded, YouTube API sync cadence, and engine status</div>
                  </div>
                </label>
              </div>
            </div>

            <!-- Custom Template Format Support & Nice Design -->
            <div style="margin-bottom: 16px;">
              <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 14px; margin-bottom: 12px;">
                <div>
                  <label style="font-size: 11px; font-weight: 700; color: var(--text-dim); text-transform: uppercase;">
                    Email Design Template Style
                  </label>
                  <select id="settingTelemetryTheme" class="cyber-input" style="margin-top: 6px;">
                    <option value="executive_dark" ${telemetryReportTemplateTheme === 'executive_dark' ? 'selected' : ''}>🌃 Executive Studio Dark (Cyberpunk High-Contrast, Neon Accents)</option>
                    <option value="modern_light" ${telemetryReportTemplateTheme === 'modern_light' ? 'selected' : ''}>☀️ Clean Minimalist Light (Crisp Corporate White & Slate)</option>
                    <option value="ops_blueprint" ${telemetryReportTemplateTheme === 'ops_blueprint' ? 'selected' : ''}>🖥️ SRE & DevOps Blueprint (Terminal Monospace Telemetry)</option>
                    <option value="custom" ${telemetryReportTemplateTheme === 'custom' ? 'selected' : ''}>🛠️ Custom HTML Template with Dynamic Placeholders</option>
                  </select>
                </div>
                <div>
                  <label style="font-size: 11px; font-weight: 700; color: var(--text-dim); text-transform: uppercase;">
                    Executive Directive / Header Notes
                  </label>
                  <input type="text" id="settingTelemetryNotes" class="cyber-input" value="${telemetryReportCustomNotes}" placeholder="Daily studio intelligence digest..." style="margin-top: 6px;" />
                </div>
              </div>

              <!-- Custom Template Editor Container -->
              <div id="customTemplateEditorContainer" style="display: ${telemetryReportTemplateTheme === 'custom' ? 'block' : 'none'}; background: rgba(0,0,0,0.25); border: 1px solid var(--border-color); border-radius: var(--radius-sm); padding: 12px; margin-top: 10px;">
                <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 6px;">
                  <span style="font-size: 11px; font-weight: 700; color: var(--accent-teal);">CUSTOM HTML EMAIL TEMPLATE</span>
                  <span style="font-size: 10px; color: var(--text-dim);">Placeholders: {{channel_name}}, {{subscribers_stat}}, {{views_stat}}, {{catalog_count}}, {{db_latency_ms}}, {{server_uptime}}, {{custom_notes}}</span>
                </div>
                <textarea id="settingTelemetryCustomTemplate" class="cyber-input font-mono" rows="5" placeholder="<!DOCTYPE html><html><body><h1>{{channel_name}} Daily Digest</h1>...</body></html>" style="font-size: 11px; width: 100%; resize: vertical;">${telemetryReportCustomTemplate}</textarea>
              </div>
            </div>

            <!-- Toggles and Actions -->
            <div style="display: flex; align-items: center; justify-content: space-between; background: rgba(0,0,0,0.18); padding: 14px 18px; border-radius: var(--radius-sm); margin-bottom: 16px; flex-wrap: wrap; gap: 12px;">
              <label style="display: flex; align-items: center; gap: 10px; font-weight: 700; font-size: 13px; cursor: pointer; margin: 0;">
                <input type="checkbox" id="settingTelemetryEnabled" ${telemetryReportEnabled ? 'checked' : ''} style="width: 18px; height: 18px; accent-color: var(--accent-emerald);" />
                <span>ENABLE AUTOMATED TELEMETRY EMAIL CRON DISPATCH</span>
              </label>

              <div style="font-size: 11px; color: var(--text-dim);">
                Last Dispatched: <strong style="color: var(--text-main);">${telemetryReportLastSentAt ? new Date(telemetryReportLastSentAt).toLocaleString() : 'Never'}</strong>
                <span class="badge ${telemetryReportLastStatus === 'success' ? 'badge-emerald' : 'badge-cyan'}" style="margin-left: 6px; font-size: 9px;" id="telemetryLastStatusBadge">${telemetryReportLastStatus.toUpperCase()}</span>
              </div>
            </div>

            <!-- Card Bottom Action Bar -->
            <div style="display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 12px; padding-top: 14px; border-top: 1px solid var(--border-color);">
              <div style="display: flex; gap: 10px; flex-wrap: wrap;">
                <button type="button" class="btn-cyber btn-cyber-outline" id="btnPreviewTelemetryReport" style="display: flex; align-items: center; gap: 8px;">
                  <span>👁️</span>
                  <span>PREVIEW EMAIL TEMPLATE</span>
                </button>
                <button type="button" class="btn-cyber btn-cyber-outline" id="btnDispatchTelemetryReportNow" style="display: flex; align-items: center; gap: 8px;">
                  <span>⚡</span>
                  <span>DISPATCH LIVE REPORT NOW</span>
                </button>
              </div>
              <div>
                <button type="button" class="btn-cyber btn-cyber-primary" id="btnSaveTelemetryCard" style="display: flex; align-items: center; gap: 8px;">
                  <span>💾</span>
                  <span>SAVE TELEMETRY DIRECTIVES</span>
                </button>
              </div>
            </div>
          </div>

          <!-- Section 4: Media & Asset Storage Directives -->
          <div class="glass-card" style="padding: 24px; margin-bottom: 22px; border-color: var(--accent-teal);">
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 14px; flex-wrap: wrap; gap: 10px;">
              <div style="display: flex; align-items: center; gap: 8px;">
                <span style="font-size: 20px;">📁</span>
                <h3 style="font-size: 15px; font-weight: 700; color: var(--text-main);">
                  MEDIA & ASSET STORAGE DIRECTIVES
                </h3>
              </div>
              <span class="badge badge-teal" id="mediaStorageBadge">PERSISTENT VOLUME: ./media</span>
            </div>
            <p style="font-size: 12px; color: var(--text-muted); margin-bottom: 16px;">
              Configure allowed file extensions and maximum upload thresholds for thumbnail images and video assets. Uploaded media is saved into the mounted volume (<code>./media ⇄ /app/media</code>) and renamed to <code>[media_uuid].[ext]</code>.
            </p>

            <div style="background: rgba(0,0,0,0.18); padding: 12px 16px; border-radius: var(--radius-sm); margin-bottom: 16px; border: 1px solid var(--border-color); display: flex; align-items: center; justify-content: space-between; flex-wrap: wrap; gap: 10px;">
              <div style="display: flex; align-items: center; gap: 10px;">
                <span style="font-size: 18px;">🐳</span>
                <div>
                  <div style="font-size: 12px; font-weight: 700; color: var(--text-main);">Docker Compose Volume Mapping</div>
                  <div style="font-size: 11px; font-family: var(--font-mono); color: var(--accent-teal);">Host: ./media ⇄ Container: /app/media</div>
                </div>
              </div>
              <span class="badge badge-emerald" style="font-size: 10px;">ACTIVE MOUNT</span>
            </div>

            <div style="display: grid; grid-template-columns: 2fr 1fr; gap: 16px; margin-bottom: 16px;">
              <div>
                <label style="font-size: 11px; font-weight: 700; color: var(--text-dim); text-transform: uppercase;">Allowed Media File Extensions (Comma-Separated) *</label>
                <input type="text" id="settingAllowedMediaExtensions" class="cyber-input" placeholder=".mp4,.png,.jpg,.jpeg,.webp" value="${allowedMediaExtensions}" style="margin-top: 6px;" />
                <span style="font-size: 10px; color: var(--text-dim); margin-top: 4px; display: block;">Define comma-separated extensions (e.g. <code>.mp4,.png</code>). Future formats can be added here without code edits.</span>
              </div>
              <div>
                <label style="font-size: 11px; font-weight: 700; color: var(--text-dim); text-transform: uppercase;">Max Upload Size per File (MB) *</label>
                <input type="number" id="settingMaxMediaUploadSizeMb" class="cyber-input" placeholder="500" value="${maxMediaUploadSizeMb}" min="1" max="5000" style="margin-top: 6px;" />
                <span style="font-size: 10px; color: var(--text-dim); margin-top: 4px; display: block;">Maximum threshold in megabytes (Default: 500 MB)</span>
              </div>
            </div>

            <div style="display: flex; justify-content: flex-end; padding-top: 14px; border-top: 1px solid var(--border-color);">
              <button type="button" class="btn-cyber btn-cyber-primary" id="saveMediaSettingsBtn" style="display: flex; align-items: center; gap: 8px;">
                <span>💾</span>
                <span>SAVE MEDIA DIRECTIVES</span>
              </button>
            </div>
          </div>

          <!-- Section 5: Dynamic Logging & Console Verbosity -->
          <div class="glass-card" style="padding: 24px; margin-bottom: 22px; border-color: var(--border-color);">
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 14px;">
              <div style="display: flex; align-items: center; gap: 8px;">
                <span style="font-size: 20px;">📡</span>
                <h3 style="font-size: 15px; font-weight: 700; color: var(--text-main);">
                  LOGGING & SERVER CONSOLE LEVEL
                </h3>
              </div>
              <span class="badge badge-cyan" id="activeLogLevelBadge">ACTIVE: ${activeLogLevel.toUpperCase()}</span>
            </div>
            <p style="font-size: 12px; color: var(--text-muted); margin-bottom: 16px;">
              Manage the backend Winston log verbosity in real time. Updates take effect immediately without restarting the container.
            </p>

            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 16px;">
              <div>
                <label style="font-size: 11px; font-weight: 700; color: var(--text-dim); text-transform: uppercase;">Console Log Level</label>
                <select id="settingLogLevel" class="cyber-input" style="margin-top: 6px;">
                  <option value="error" ${consoleLogLevel === 'error' ? 'selected' : ''}>ERROR (Only critical failures)</option>
                  <option value="warn" ${consoleLogLevel === 'warn' ? 'selected' : ''}>WARN (Warnings & errors)</option>
                  <option value="info" ${consoleLogLevel === 'info' ? 'selected' : ''}>INFO (Standard production logging)</option>
                  <option value="http" ${consoleLogLevel === 'http' ? 'selected' : ''}>HTTP (API traffic + status codes)</option>
                  <option value="verbose" ${consoleLogLevel === 'verbose' ? 'selected' : ''}>VERBOSE (High detail telemetry)</option>
                  <option value="debug" ${consoleLogLevel === 'debug' ? 'selected' : ''}>DEBUG (Full diagnostics & SQL traces)</option>
                </select>
              </div>
              <div style="display: flex; align-items: flex-end;">
                <button class="btn-cyber btn-cyber-outline" id="applyLogLevelNowBtn" style="width: 100%;">
                  ⚡ APPLY LOG LEVEL INSTANTLY
                </button>
              </div>
            </div>
          </div>

          <!-- Section 4: Swagger OpenAPI 3.0 Documentation Toggle -->
          <div class="glass-card" style="padding: 24px; margin-bottom: 22px; border-color: var(--border-color);">
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 14px;">
              <div style="display: flex; align-items: center; gap: 8px;">
                <span style="font-size: 20px;">📖</span>
                <h3 style="font-size: 15px; font-weight: 700; color: var(--text-main);">
                  SWAGGER OPENAPI 3.0 EXPLORER
                </h3>
              </div>
              <span class="badge ${swaggerEnabled ? 'badge-emerald' : 'badge-magenta'}" id="swaggerStatusBadge">
                ${swaggerEnabled ? 'EXPLORER ACTIVE' : 'EXPLORER DISABLED'}
              </span>
            </div>
            <p style="font-size: 12px; color: var(--text-muted); margin-bottom: 16px;">
              Enable or disable the public interactive Swagger API endpoint (<code>/api/docs</code>). When disabled, external requests receive 403 Forbidden.
            </p>

            <div style="display: flex; align-items: center; justify-content: space-between; background: rgba(0,0,0,0.18); padding: 14px 18px; border-radius: var(--radius-sm);">
              <div>
                <div style="font-weight: 700; font-size: 13px;">Swagger Documentation Endpoint</div>
                <div style="font-size: 11px; color: var(--text-dim); margin-top: 2px;">
                  Path: <a href="/api/docs" target="_blank" style="color: var(--accent-teal);">http://localhost:3000/api/docs</a>
                </div>
              </div>
              <div style="display: flex; align-items: center; gap: 14px;">
                <label style="display: flex; align-items: center; gap: 8px; font-weight: 700; font-size: 13px; cursor: pointer;">
                  <input type="checkbox" id="settingSwaggerToggle" ${swaggerEnabled ? 'checked' : ''} style="width: 18px; height: 18px; accent-color: var(--accent-teal);" />
                  <span>ENABLED</span>
                </label>
                <button class="btn-cyber btn-cyber-secondary btn-sm" id="testSwaggerBtn" onclick="window.open('/api/docs', '_blank')">
                  OPEN SWAGGER ↗
                </button>
              </div>
            </div>
          </div>

          <!-- Section 5: Studio Branding & Profiles -->
          <div class="glass-card" style="padding: 24px; margin-bottom: 22px;">
            <div style="display: flex; align-items: center; gap: 8px; margin-bottom: 14px;">
              <span style="font-size: 20px;">📺</span>
              <h3 style="font-size: 15px; font-weight: 700; color: var(--text-main);">
                DEFAULT STUDIO PROFILE & METADATA
              </h3>
            </div>

            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 16px; margin-bottom: 14px;">
              <div>
                <label style="font-size: 11px; font-weight: 700; color: var(--text-dim); text-transform: uppercase;">Studio / Channel Name</label>
                <input type="text" id="settingChannelName" class="cyber-input" value="${channelName}" style="margin-top: 4px;" />
              </div>
              <div>
                <label style="font-size: 11px; font-weight: 700; color: var(--text-dim); text-transform: uppercase;">Channel Handle</label>
                <input type="text" id="settingChannelHandle" class="cyber-input" value="${channelHandle}" style="margin-top: 4px;" />
              </div>
            </div>

            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 16px;">
              <div>
                <label style="font-size: 11px; font-weight: 700; color: var(--text-dim); text-transform: uppercase;">Channel Creator / Lead</label>
                <input type="text" id="settingAuthorName" class="cyber-input" value="${authorName}" style="margin-top: 4px;" />
              </div>
              <div>
                <label style="font-size: 11px; font-weight: 700; color: var(--text-dim); text-transform: uppercase;">Channel URL</label>
                <input type="url" id="settingChannelUrl" class="cyber-input" value="${channelUrl}" style="margin-top: 4px;" />
              </div>
            </div>

            <div style="margin-top: 16px;">
              <label style="font-size: 11px; font-weight: 700; color: var(--text-dim); text-transform: uppercase;">Official GitHub Repository</label>
              <input type="url" id="settingGithubUrl" class="cyber-input" value="${githubUrl}" style="margin-top: 4px;" />
            </div>
          </div>

          <!-- Section 6: n8n Workflow Automation Engine Directives -->
          <div class="glass-card" style="padding: 24px; margin-bottom: 22px; border-color: #8b5cf6;">
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 14px; flex-wrap: wrap; gap: 10px;">
              <div style="display: flex; align-items: center; gap: 8px;">
                <span style="font-size: 20px;">⚡</span>
                <h3 style="font-size: 15px; font-weight: 700; color: var(--text-main);">
                  N8N WORKFLOW AUTOMATION ENGINE DIRECTIVES
                </h3>
              </div>
              <div style="display: flex; align-items: center; gap: 10px;">
                <span class="badge ${n8nEnabled ? 'badge-indigo' : 'badge-amber'}" id="n8nStatusBadge" style="background: ${n8nEnabled ? 'rgba(139, 92, 246, 0.2)' : ''}; color: ${n8nEnabled ? '#a78bfa' : ''}; border-color: ${n8nEnabled ? '#8b5cf6' : ''};">
                  ${n8nEnabled ? 'ENGINE ACTIVE' : 'ENGINE DISABLED'}
                </span>
                <label style="display: flex; align-items: center; gap: 6px; font-weight: 700; font-size: 13px; cursor: pointer;">
                  <input type="checkbox" id="settingN8nEnabledToggle" ${n8nEnabled ? 'checked' : ''} style="width: 18px; height: 18px; accent-color: #8b5cf6;" />
                  <span>ENABLE N8N</span>
                </label>
              </div>
            </div>
            <p style="font-size: 12px; color: var(--text-muted); margin-bottom: 16px;">
              Connect your self-hosted or cloud n8n orchestrator to execute event-driven workflows, trigger webhooks, pass dynamic JSON payloads, and track real-time execution histories.
            </p>

            <div style="display: grid; grid-template-columns: 2fr 1fr; gap: 16px; margin-bottom: 16px;">
              <div>
                <label style="font-size: 11px; font-weight: 700; color: var(--text-dim); text-transform: uppercase;">n8n Base Endpoint URL *</label>
                <input type="url" id="settingN8nBaseUrl" class="cyber-input" placeholder="http://localhost:5678 or https://n8n.yourdomain.com" value="${n8nBaseUrl}" style="margin-top: 6px;" />
                <span style="font-size: 10px; color: var(--text-dim); margin-top: 4px; display: block;">Base URL where your n8n instance is accessible from the YouTube Studio container.</span>
              </div>
              <div>
                <label style="font-size: 11px; font-weight: 700; color: var(--text-dim); text-transform: uppercase;">Default Timeout (Seconds) *</label>
                <input type="number" id="settingN8nDefaultTimeout" class="cyber-input" placeholder="30" value="${n8nDefaultTimeout}" min="5" max="300" style="margin-top: 6px;" />
                <span style="font-size: 10px; color: var(--text-dim); margin-top: 4px; display: block;">Webhook execution HTTP request timeout (5 - 300s).</span>
              </div>
            </div>

            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 16px; margin-bottom: 16px;">
              <div>
                <label style="font-size: 11px; font-weight: 700; color: var(--text-dim); text-transform: uppercase;">n8n Global API Key (Optional)</label>
                <input type="password" id="settingN8nApiKey" class="cyber-input" placeholder="n8n_api_key_..." value="${n8nApiKey}" autocomplete="off" style="margin-top: 6px;" />
                <span style="font-size: 10px; color: var(--text-dim); margin-top: 4px; display: block;">Sent as <code>X-N8N-API-KEY</code> for secured administrative probes.</span>
              </div>
              <div>
                <label style="font-size: 11px; font-weight: 700; color: var(--text-dim); text-transform: uppercase;">Default Webhook Shared Secret / Bearer Token (Optional)</label>
                <input type="password" id="settingN8nDefaultWebhookToken" class="cyber-input" placeholder="Shared token or header secret" value="${n8nDefaultWebhookToken}" autocomplete="off" style="margin-top: 6px;" />
                <span style="font-size: 10px; color: var(--text-dim); margin-top: 4px; display: block;">Injected as default auth header if individual workflow token is empty.</span>
              </div>
            </div>

            <div id="n8nProbeResultContainer" style="display: none; margin-bottom: 16px; padding: 12px 16px; border-radius: var(--radius-sm); font-size: 12px;"></div>

            <div style="display: flex; justify-content: space-between; align-items: center; padding-top: 14px; border-top: 1px solid var(--border-color); flex-wrap: wrap; gap: 10px;">
              <div style="display: flex; gap: 10px;">
                <button type="button" class="btn-cyber btn-cyber-secondary" id="testN8nProbeBtn" style="display: flex; align-items: center; gap: 6px;">
                  <span>🔌</span>
                  <span>TEST N8N REACHABILITY</span>
                </button>
                <button type="button" class="btn-cyber btn-cyber-outline" onclick="window.navigateTo('n8n')" style="display: flex; align-items: center; gap: 6px;">
                  <span>⚡</span>
                  <span>OPEN N8N WORKFLOWS STUDIO ↗</span>
                </button>
              </div>
              <button type="button" class="btn-cyber btn-cyber-primary" id="saveN8nSettingsBtn" style="display: flex; align-items: center; gap: 6px;">
                <span>💾</span>
                <span>SAVE N8N DIRECTIVES</span>
              </button>
            </div>
          </div>

          <!-- Section 7: Color Themes -->
          <div class="glass-card" style="padding: 24px;">
            <div style="display: flex; align-items: center; gap: 8px; margin-bottom: 14px;">
              <span style="font-size: 20px;">🎨</span>
              <h3 style="font-size: 15px; font-weight: 700; color: var(--text-main);">
                THEME SELECTION
              </h3>
            </div>

            <div style="display: grid; grid-template-columns: repeat(2, 1fr); gap: 14px;">
              <div class="glass-card" style="padding: 16px; cursor: pointer; border-color: var(--accent-teal);" onclick="window.setTheme('dark')">
                <div style="display: flex; align-items: center; gap: 10px;">
                  <span style="font-size: 24px;">🌌</span>
                  <div>
                    <div style="font-weight: 700; font-size: 14px;">Executive Dark (Default)</div>
                    <div style="font-size: 11px; color: var(--text-dim);">Deep space canvas with teal & emerald accents</div>
                  </div>
                </div>
              </div>

              <div class="glass-card" style="padding: 16px; cursor: pointer; border-color: var(--border-color);" onclick="window.setTheme('light')">
                <div style="display: flex; align-items: center; gap: 10px;">
                  <span style="font-size: 24px;">☀️</span>
                  <div>
                    <div style="font-weight: 700; font-size: 14px;">Executive Light</div>
                    <div style="font-size: 11px; color: var(--text-dim);">Crisp high-contrast enterprise design</div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <!-- Section 6.5: Studio Workspace & Demo Data Management -->
          <div class="glass-card" style="padding: 24px; margin-top: 22px; border-color: var(--accent-cyan); background: rgba(6, 182, 212, 0.03);">
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 14px; flex-wrap: wrap; gap: 10px;">
              <div style="display: flex; align-items: center; gap: 10px;">
                <span style="font-size: 22px;">🛸</span>
                <h3 style="font-size: 16px; font-weight: 800; color: var(--text-main); letter-spacing: 0.5px;">
                  STUDIO WORKSPACE & DEMO DATA MANAGEMENT
                </h3>
              </div>
              <span class="badge ${settings.initial_setup_done === true || settings.initial_setup_done === 'true' ? 'badge-emerald' : 'badge-amber'}" id="badgeInitialSetupStatus">
                ${settings.initial_setup_done === true || settings.initial_setup_done === 'true' ? 'INITIAL SETUP: COMPLETED' : 'INITIAL SETUP: PENDING'}
              </span>
            </div>

            <p style="font-size: 13px; color: var(--text-muted); line-height: 1.6; margin-bottom: 18px;">
              Manage your studio environment mode. Populate realistic sample data (channels, video assets, historical trajectory snapshots, tag presets, n8n workflows, and SOP notes) for testing and evaluation, or re-open the initial setup dialog.
            </p>

            <div style="background: rgba(0, 0, 0, 0.25); border: 1px solid var(--border-color); border-radius: var(--radius-sm); padding: 18px; display: flex; align-items: center; justify-content: space-between; flex-wrap: wrap; gap: 14px;">
              <div>
                <div style="font-size: 13.5px; font-weight: 700; color: var(--text-main); display: flex; align-items: center; gap: 8px;">
                  <span>🚀</span> Sample Demo Data Seeder
                </div>
                <div style="font-size: 11.5px; color: var(--text-dim); margin-top: 3px;">
                  Loads 2 channels, 14-day snapshots, 10 content assets, 6 subscriptions, 10 tag presets, 4 workflows, and 5 SOP notes.
                </div>
              </div>

              <div style="display: flex; align-items: center; gap: 10px; flex-wrap: wrap;">
                <button id="btnLoadDemoFromSettings" class="btn-cyber btn-cyber-primary btn-sm">
                  <span>🚀</span> LOAD SAMPLE DEMO DATA
                </button>
                <button id="btnOpenSetupModalFromSettings" class="btn-cyber btn-cyber-secondary btn-sm">
                  <span>⚙️</span> ONBOARDING MODAL
                </button>
              </div>
            </div>
          </div>

          <!-- Section 7: Danger Zone (Flush All System Data) -->
          <div class="glass-card" style="padding: 24px; margin-top: 22px; border-color: #ef4444; background: rgba(239, 68, 68, 0.04);">
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 14px; flex-wrap: wrap; gap: 10px;">
              <div style="display: flex; align-items: center; gap: 10px;">
                <span style="font-size: 22px;">⚠️</span>
                <h3 style="font-size: 16px; font-weight: 800; color: #ef4444; letter-spacing: 0.5px;">
                  DANGER ZONE: FLUSH ALL SYSTEM DATA
                </h3>
              </div>
              <span class="badge badge-magenta" style="background: rgba(239, 68, 68, 0.2); color: #f87171; border-color: #ef4444;">
                IRREVERSIBLE ACTION
              </span>
            </div>

            <p style="font-size: 13px; color: var(--text-muted); line-height: 1.6; margin-bottom: 18px;">
              Permanently purges ALL system data across all tables: channels, content items, snapshots, subscribed channels, tag presets, workflows, notes, logs, uploaded media files, and extra user accounts. Resets the database to a clean zero-data state and sets initial setup to false.
            </p>

            <div style="background: rgba(0, 0, 0, 0.35); border: 1px solid rgba(239, 68, 68, 0.3); border-radius: var(--radius-sm); padding: 18px; display: flex; flex-direction: column; gap: 16px;">
              <!-- Verification Math Prompt -->
              <div>
                <label style="font-size: 12px; font-weight: 700; color: #fca5a5; display: block; margin-bottom: 6px;">
                  1. SECURITY VERIFICATION CHALLENGE:
                </label>
                <div style="display: flex; align-items: center; gap: 12px; flex-wrap: wrap;">
                  <span style="font-family: var(--font-mono); font-size: 16px; font-weight: 800; color: #ef4444; background: rgba(239, 68, 68, 0.15); padding: 6px 14px; border-radius: 6px; border: 1px solid rgba(239, 68, 68, 0.4);">
                    ${num1} + ${num2} = ?
                  </span>
                  <input 
                    type="number" 
                    id="flushMathInput" 
                    class="cyber-input" 
                    placeholder="Enter answer" 
                    style="max-width: 180px; font-weight: 700; font-family: var(--font-mono); border-color: rgba(239, 68, 68, 0.4);" 
                  />
                  <span id="flushMathFeedback" style="font-size: 12px; font-weight: 600;"></span>
                </div>
              </div>

              <!-- Mandatory Checkbox Confirmation -->
              <div>
                <label style="display: flex; align-items: center; gap: 10px; cursor: pointer; font-size: 13px; font-weight: 600; color: var(--text-main);">
                  <input 
                    type="checkbox" 
                    id="flushConfirmCheckbox" 
                    style="width: 18px; height: 18px; accent-color: #ef4444; cursor: pointer;" 
                  />
                  <span>I understand and am ready to permanently delete all data</span>
                </label>
              </div>

              <!-- Flush Button -->
              <div style="display: flex; justify-content: flex-end; padding-top: 6px; border-top: 1px solid rgba(239, 68, 68, 0.2);">
                <button 
                  id="btnExecuteFlushAll" 
                  class="btn-cyber btn-cyber-danger" 
                  style="opacity: 0.5; cursor: not-allowed;" 
                  disabled
                >
                  <span>🗑️</span>
                  <span>PERMANENTLY FLUSH ALL DATA</span>
                </button>
              </div>
            </div>
          </div>

          <!-- SMTP Diagnostic & Delivery Test Modal -->
          <div id="testSmtpModal" class="modal-overlay">
            <div class="modal-dialog" style="max-width: 580px;">
              <div class="modal-header">
                <div class="modal-title" style="display: flex; align-items: center; gap: 8px;">
                  <span>⚡</span>
                  <span>TEST SMTP CONNECTION & VERIFY RELAY</span>
                </div>
                <button class="modal-close-btn" data-close-modal="true" id="btnCloseSmtpTestModalX">✕</button>
              </div>
              <form id="smtpTestExecutionForm">
                <div class="modal-body" style="display: flex; flex-direction: column; gap: 16px;">
                  <p style="font-size: 12px; color: var(--text-muted); margin: 0; line-height: 1.5;">
                    Performs a real-time TLS handshake and authentication test against your configured SMTP relay, and dispatches an executive diagnostic test email.
                  </p>

                  <div style="background: rgba(0,0,0,0.25); border: 1px solid var(--border-color); border-radius: var(--radius-sm); padding: 12px; font-size: 12px;">
                    <div style="font-weight: 700; color: var(--text-dim); margin-bottom: 6px; text-transform: uppercase;">Current Configuration to Test:</div>
                    <div style="display: flex; gap: 16px; flex-wrap: wrap; font-family: var(--font-mono); font-size: 11px;">
                      <div>Host: <span id="testPreviewHost" style="color: var(--accent-teal); font-weight: 700;">-</span></div>
                      <div>Port: <span id="testPreviewPort" style="color: var(--text-main); font-weight: 700;">-</span></div>
                      <div>Security: <span id="testPreviewEnc" style="color: var(--accent-emerald); font-weight: 700;">-</span></div>
                    </div>
                  </div>

                  <div>
                    <label style="font-size: 11px; font-weight: 700; color: var(--text-dim); text-transform: uppercase;">
                      Recipient Email for Test Delivery *
                    </label>
                    <input 
                      type="email" 
                      id="smtpTestRecipientEmail" 
                      class="cyber-input" 
                      placeholder="e.g. your-email@domain.com" 
                      value="${currentUser.email || ''}" 
                      required 
                      style="margin-top: 6px;" 
                    />
                    <span style="font-size: 10px; color: var(--text-dim); margin-top: 4px; display: block;">
                      An executive diagnostic HTML report will be dispatched to this inbox upon successful handshake.
                    </span>
                  </div>

                  <!-- Live Diagnostic Telemetry Box -->
                  <div id="smtpTestDiagnosticBox" style="display: none; padding: 14px; border-radius: var(--radius-sm); font-size: 12px; line-height: 1.6;"></div>
                </div>

                <div class="modal-footer">
                  <button type="button" class="btn-cyber btn-cyber-outline" data-close-modal="true" id="btnCancelSmtpTest">CANCEL</button>
                  <button type="submit" class="btn-cyber btn-cyber-primary" id="btnRunSmtpTestExecution">
                    <span>🚀</span>
                    <span>DISPATCH TEST PROBE</span>
                  </button>
                </div>
              </form>
            </div>
          </div>

          <!-- Telemetry Live Email Preview Modal -->
          <div id="telemetryPreviewModal" class="modal-overlay" style="display: none;">
            <div class="modal-dialog" style="max-width: 880px; width: 95%; max-height: 92vh; display: flex; flex-direction: column; padding: 0; overflow: hidden;">
              <div class="modal-header" style="padding: 16px 20px; background: rgba(0,0,0,0.5); border-bottom: 1px solid var(--border-color); display: flex; justify-content: space-between; align-items: center;">
                <div class="modal-title" style="display: flex; align-items: center; gap: 10px;">
                  <span style="font-size: 20px;">👁️</span>
                  <div>
                    <div style="font-size: 15px; font-weight: 800; color: var(--accent-cyan);">LIVE TELEMETRY EMAIL REPORT PREVIEW</div>
                    <div style="font-size: 11px; color: var(--text-dim); margin-top: 2px;">Rendered dynamically with live PostgreSQL metrics & selected theme</div>
                  </div>
                </div>
                <div style="display: flex; align-items: center; gap: 10px;">
                  <button type="button" class="btn-cyber btn-cyber-outline btn-xs" id="btnPreviewToggleWidth" style="display: flex; align-items: center; gap: 6px;">
                    <span id="previewDeviceIcon">📱</span> <span id="previewWidthLabel">Switch to Mobile (420px)</span>
                  </button>
                  <button type="button" class="modal-close-btn" id="btnCloseTelemetryPreviewX" style="margin-left: 8px;">✕</button>
                </div>
              </div>
              <div style="flex: 1; padding: 16px; overflow-y: auto; display: flex; justify-content: center; background: #05070f; min-height: 520px;">
                <iframe id="telemetryPreviewIframe" style="width: 100%; max-width: 720px; height: 560px; border: 1px solid var(--border-color); border-radius: 8px; background: #070913; transition: max-width 0.3s ease;"></iframe>
              </div>
              <div style="padding: 12px 20px; background: rgba(0,0,0,0.4); border-top: 1px solid var(--border-color); display: flex; justify-content: space-between; align-items: center; font-size: 11px; color: var(--text-dim);">
                <div id="previewMetaSummary">Channels: - • Subs: - • Latency: -</div>
                <button type="button" class="btn-cyber btn-cyber-primary btn-sm" id="btnCloseTelemetryPreviewBtn">CLOSE PREVIEW</button>
              </div>
            </div>
          </div>
        </div>
      `;

      // SMTP Handlers & Presets
      const portInput = document.getElementById('settingSmtpPort');
      const encInput = document.getElementById('settingSmtpEncryption');

      document.querySelectorAll('.smtp-preset-btn').forEach(btn => {
        btn.onclick = () => {
          const p = btn.getAttribute('data-port');
          const enc = btn.getAttribute('data-enc');
          if (p) portInput.value = p;
          if (enc) encInput.value = enc;
          Toast.show(`Preset loaded: Port ${p} (${enc.toUpperCase()})`, 'info', 1500);
        };
      });

      const authToggle = document.getElementById('settingSmtpAuthToggle');
      const credContainer = document.getElementById('smtpCredentialsContainer');
      const updateAuthVis = () => {
        if (!authToggle || !credContainer) return;
        if (authToggle.checked) {
          credContainer.style.opacity = '1';
          credContainer.style.pointerEvents = 'auto';
        } else {
          credContainer.style.opacity = '0.45';
          credContainer.style.pointerEvents = 'none';
        }
      };
      if (authToggle) {
        authToggle.onchange = updateAuthVis;
        updateAuthVis();
      }

      const passInput = document.getElementById('settingSmtpPass');
      const togglePassBtn = document.getElementById('toggleSmtpPassBtn');
      if (togglePassBtn && passInput) {
        togglePassBtn.onclick = () => {
          if (passInput.type === 'password') {
            passInput.type = 'text';
            togglePassBtn.textContent = '🙈';
            togglePassBtn.title = 'Hide Password';
          } else {
            passInput.type = 'password';
            togglePassBtn.textContent = '👁️';
            togglePassBtn.title = 'Reveal Password';
          }
        };
      }

      // Test Modal Controls
      const openTestModalBtn = document.getElementById('btnOpenSmtpTestModal');
      const testDiagBox = document.getElementById('smtpTestDiagnosticBox');
      const closeTestModal = () => window.closeModal('testSmtpModal');
      
      const closeX = document.getElementById('btnCloseSmtpTestModalX');
      const cancelBtn = document.getElementById('btnCancelSmtpTest');
      if (closeX) closeX.onclick = closeTestModal;
      if (cancelBtn) cancelBtn.onclick = closeTestModal;

      if (openTestModalBtn) {
        openTestModalBtn.onclick = () => {
          const host = document.getElementById('settingSmtpHost').value.trim();
          const port = document.getElementById('settingSmtpPort').value.trim();
          const enc = document.getElementById('settingSmtpEncryption').value;

          if (!host) {
            Toast.show('Please specify an SMTP Host before running the test.', 'warning');
            document.getElementById('settingSmtpHost').focus();
            return;
          }

          document.getElementById('testPreviewHost').textContent = host;
          document.getElementById('testPreviewPort').textContent = port || '587';
          document.getElementById('testPreviewEnc').textContent = enc.toUpperCase();

          const recInput = document.getElementById('smtpTestRecipientEmail');
          if (!recInput.value) {
            const fromEmail = document.getElementById('settingSmtpFromEmail').value.trim();
            const userEmail = currentUser.email || '';
            recInput.value = userEmail || fromEmail;
          }

          if (testDiagBox) {
            testDiagBox.style.display = 'none';
            testDiagBox.innerHTML = '';
          }
          window.openModal('testSmtpModal');
        };
      }

      // Test Execution Form Handler
      const testForm = document.getElementById('smtpTestExecutionForm');
      const runTestBtn = document.getElementById('btnRunSmtpTestExecution');

      if (testForm) {
        testForm.onsubmit = async (e) => {
          e.preventDefault();
          const recipient = document.getElementById('smtpTestRecipientEmail').value.trim();
          if (!recipient) {
            Toast.show('Recipient email address is required.', 'warning');
            return;
          }

          const testPayload = {
            smtp_host: document.getElementById('settingSmtpHost').value.trim(),
            smtp_port: document.getElementById('settingSmtpPort').value.trim(),
            smtp_encryption: document.getElementById('settingSmtpEncryption').value,
            smtp_auth_enabled: document.getElementById('settingSmtpAuthToggle').checked,
            smtp_user: document.getElementById('settingSmtpUser').value.trim(),
            smtp_pass: document.getElementById('settingSmtpPass').value,
            smtp_from_email: document.getElementById('settingSmtpFromEmail').value.trim(),
            smtp_from_name: document.getElementById('settingSmtpFromName').value.trim(),
            smtp_allow_self_signed: document.getElementById('settingSmtpSelfSigned').checked,
            smtp_timeout_seconds: document.getElementById('settingSmtpTimeout').value,
            test_recipient_email: recipient
          };

          runTestBtn.disabled = true;
          runTestBtn.innerHTML = `<span>⏳</span><span>VERIFYING HANDSHAKE & SENDING...</span>`;
          testDiagBox.style.display = 'block';
          testDiagBox.style.background = 'rgba(13, 148, 136, 0.1)';
          testDiagBox.style.border = '1px solid var(--accent-teal)';
          testDiagBox.style.color = 'var(--text-main)';
          testDiagBox.innerHTML = `
            <div style="display: flex; align-items: center; gap: 8px; color: var(--accent-teal); font-weight: 700;">
              <span>🔄</span>
              <span>Connecting to ${testPayload.smtp_host}:${testPayload.smtp_port} via ${testPayload.smtp_encryption.toUpperCase()}...</span>
            </div>
          `;

          try {
            const result = await API.settings.testSmtp(testPayload);
            testDiagBox.style.background = 'rgba(16, 185, 129, 0.12)';
            testDiagBox.style.border = '1px solid #10b981';
            testDiagBox.innerHTML = `
              <div style="color: #10b981; font-weight: 800; font-size: 13px; margin-bottom: 6px; display: flex; align-items: center; gap: 6px;">
                <span>✅</span>
                <span>SMTP HANDSHAKE & RELAY SUCCESSFUL!</span>
              </div>
              <div style="color: var(--text-main); font-size: 12px; margin-bottom: 6px;">
                ${result.message}
              </div>
              <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 6px; font-size: 11px; color: var(--text-dim); font-family: var(--font-mono); margin-top: 8px; padding-top: 8px; border-top: 1px solid rgba(16, 185, 129, 0.2);">
                <div>Handshake Latency: <strong style="color: #10b981;">${result.details?.handshakeLatencyMs || '-'} ms</strong></div>
                <div>Total Latency: <strong style="color: var(--accent-teal);">${result.details?.totalLatencyMs || '-'} ms</strong></div>
                <div>Recipient: <strong style="color: var(--text-main);">${recipient}</strong></div>
                <div>TLS / Auth: <strong style="color: #10b981;">Verified</strong></div>
              </div>
            `;
            Toast.show('SMTP relay test email delivered successfully!', 'success');
          } catch (err) {
            let errorHint = 'Verify your host address, port, and network firewall.';
            const msg = err.message || '';
            if (msg.includes('EAUTH') || msg.includes('Invalid login') || msg.includes('authentication failed')) {
              errorHint = 'Authentication failed. If using Gmail, make sure to generate an App Password with 2FA enabled.';
            } else if (msg.includes('ETIMEDOUT') || msg.includes('timeout')) {
              errorHint = 'Connection timed out. Check if port is blocked by firewall or if server host is reachable.';
            } else if (msg.includes('ECONNREFUSED')) {
              errorHint = 'Connection refused. Ensure the mail server is running and listening on the specified port.';
            } else if (msg.includes('DEPTH_ZERO_SELF_SIGNED_CERT') || msg.includes('self-signed')) {
              errorHint = 'Self-signed certificate detected. Enable the "Allow Self-Signed TLS Certificates" option.';
            }

            testDiagBox.style.background = 'rgba(239, 68, 68, 0.12)';
            testDiagBox.style.border = '1px solid #ef4444';
            testDiagBox.innerHTML = `
              <div style="color: #ef4444; font-weight: 800; font-size: 13px; margin-bottom: 6px; display: flex; align-items: center; gap: 6px;">
                <span>❌</span>
                <span>SMTP TEST FAILED</span>
              </div>
              <div style="color: #fca5a5; font-size: 12px; font-family: var(--font-mono); word-break: break-all; margin-bottom: 6px;">
                ${err.message}
              </div>
              <div style="font-size: 11px; color: var(--text-muted); padding-top: 6px; border-top: 1px solid rgba(239, 68, 68, 0.2);">
                💡 <strong>Troubleshooting Hint:</strong> ${errorHint}
              </div>
            `;
            Toast.show(`SMTP Test Failed: ${err.message}`, 'error', 5000);
          } finally {
            runTestBtn.disabled = false;
            runTestBtn.innerHTML = `<span>🚀</span><span>DISPATCH TEST PROBE</span>`;
          }
        };
      }

      // Dedicated Card Save Button
      const saveSmtpCardBtn = document.getElementById('btnSaveSmtpCard');
      if (saveSmtpCardBtn) {
        saveSmtpCardBtn.onclick = async () => {
          const smtpPayload = {
            smtp_host: document.getElementById('settingSmtpHost').value.trim(),
            smtp_port: document.getElementById('settingSmtpPort').value.trim(),
            smtp_encryption: document.getElementById('settingSmtpEncryption').value,
            smtp_auth_enabled: document.getElementById('settingSmtpAuthToggle').checked,
            smtp_user: document.getElementById('settingSmtpUser').value.trim(),
            smtp_pass: document.getElementById('settingSmtpPass').value,
            smtp_from_email: document.getElementById('settingSmtpFromEmail').value.trim(),
            smtp_from_name: document.getElementById('settingSmtpFromName').value.trim(),
            smtp_allow_self_signed: document.getElementById('settingSmtpSelfSigned').checked,
            smtp_timeout_seconds: document.getElementById('settingSmtpTimeout').value,
            smtp_notifications_enabled: document.getElementById('settingSmtpNotificationsEnabled').checked
          };

          saveSmtpCardBtn.disabled = true;
          saveSmtpCardBtn.innerHTML = `<span>⏳</span><span>SAVING SMTP DIRECTIVES...</span>`;
          try {
            await API.settings.bulkUpdate(smtpPayload);
            Toast.show('SMTP configuration persisted dynamically to PostgreSQL!', 'success');
            const badge = document.getElementById('smtpStatusBadge');
            if (badge) {
              if (smtpPayload.smtp_host) {
                badge.className = smtpPayload.smtp_notifications_enabled ? 'badge badge-emerald' : 'badge badge-amber';
                badge.textContent = smtpPayload.smtp_notifications_enabled ? 'SMTP CONFIGURED & ACTIVE' : 'SMTP CONFIGURED (NOTIFICATIONS OFF)';
              } else {
                badge.className = 'badge badge-cyan';
                badge.textContent = 'SMTP UNCONFIGURED';
              }
            }
          } catch (err) {
            Toast.show(`Failed to save SMTP settings: ${err.message}`, 'error');
          } finally {
            saveSmtpCardBtn.disabled = false;
            saveSmtpCardBtn.innerHTML = `<span>💾</span><span>SAVE SMTP CONFIGURATION</span>`;
          }
        };
      }

      // =========================================================================
      // Telemetry Email Report & Metric Alert Handlers
      // =========================================================================
      const telemetryPresetSelect = document.getElementById('settingTelemetryPreset');
      const telemetryCronInput = document.getElementById('settingTelemetryCron');
      const telemetryThemeSelect = document.getElementById('settingTelemetryTheme');
      const telemetryThemeBadge = document.getElementById('telemetryThemeBadge');
      const customEditorContainer = document.getElementById('customTemplateEditorContainer');
      const telemetryCronBadge = document.getElementById('telemetryCronBadge');
      const saveTelemetryCardBtn = document.getElementById('btnSaveTelemetryCard');
      const previewReportBtn = document.getElementById('btnPreviewTelemetryReport');
      const dispatchReportBtn = document.getElementById('btnDispatchTelemetryReportNow');
      const previewModal = document.getElementById('telemetryPreviewModal');
      const previewIframe = document.getElementById('telemetryPreviewIframe');

      // Schedule Preset Switcher
      if (telemetryPresetSelect && telemetryCronInput) {
        telemetryPresetSelect.onchange = () => {
          const val = telemetryPresetSelect.value;
          const presetCronMap = {
            'daily-08': '0 8 * * *',
            'daily-12': '0 12 * * *',
            'daily-20': '0 20 * * *',
            'interval-6': '0 */6 * * *',
            'interval-12': '0 */12 * * *',
            'interval-1': '0 * * * *'
          };
          if (presetCronMap[val]) {
            telemetryCronInput.value = presetCronMap[val];
            telemetryCronInput.style.borderColor = 'var(--accent-teal)';
            setTimeout(() => { telemetryCronInput.style.borderColor = ''; }, 800);
          }
        };
      }

      // Metrics Select / Deselect All
      const btnSelectAllMetrics = document.getElementById('btnSelectAllTelemetryMetrics');
      const btnDeselectAllMetrics = document.getElementById('btnDeselectAllTelemetryMetrics');
      if (btnSelectAllMetrics) {
        btnSelectAllMetrics.onclick = () => {
          document.querySelectorAll('.telemetry-metric-check').forEach(chk => { chk.checked = true; });
        };
      }
      if (btnDeselectAllMetrics) {
        btnDeselectAllMetrics.onclick = () => {
          document.querySelectorAll('.telemetry-metric-check').forEach(chk => { chk.checked = false; });
        };
      }

      // Theme Change Handler
      if (telemetryThemeSelect) {
        telemetryThemeSelect.onchange = () => {
          const val = telemetryThemeSelect.value;
          if (telemetryThemeBadge) {
            telemetryThemeBadge.textContent = `THEME: ${val.toUpperCase().replace('_', ' ')}`;
          }
          if (customEditorContainer) {
            customEditorContainer.style.display = (val === 'custom') ? 'block' : 'none';
          }
        };
      }

      // Helper to gather all Telemetry Report payload directives
      const getTelemetryPayload = () => {
        const checkedMetrics = Array.from(document.querySelectorAll('.telemetry-metric-check:checked')).map(c => c.value);
        return {
          telemetry_report_enabled: document.getElementById('settingTelemetryEnabled').checked,
          telemetry_report_cron: (document.getElementById('settingTelemetryCron').value || '0 8 * * *').trim(),
          telemetry_report_schedule_preset: document.getElementById('settingTelemetryPreset').value,
          telemetry_report_recipients: document.getElementById('settingTelemetryRecipients').value.trim(),
          telemetry_report_metrics: checkedMetrics,
          telemetry_report_template_theme: document.getElementById('settingTelemetryTheme').value,
          telemetry_report_custom_notes: document.getElementById('settingTelemetryNotes').value.trim(),
          telemetry_report_custom_template: document.getElementById('settingTelemetryCustomTemplate').value
        };
      };

      // Dedicated Save Telemetry Card Button
      if (saveTelemetryCardBtn) {
        saveTelemetryCardBtn.onclick = async () => {
          const payload = getTelemetryPayload();
          saveTelemetryCardBtn.disabled = true;
          saveTelemetryCardBtn.innerHTML = `<span>⏳</span><span>SAVING TELEMETRY DIRECTIVES...</span>`;
          try {
            await API.settings.bulkUpdate(payload);
            Toast.show('Telemetry report directives persisted dynamically to PostgreSQL!', 'success');
            if (telemetryCronBadge) {
              telemetryCronBadge.className = payload.telemetry_report_enabled ? 'badge badge-emerald' : 'badge badge-amber';
              telemetryCronBadge.textContent = payload.telemetry_report_enabled ? 'CRON REPORT ACTIVE' : 'CRON REPORT PAUSED';
            }
          } catch (err) {
            Toast.show(`Failed to save telemetry settings: ${err.message}`, 'error');
          } finally {
            saveTelemetryCardBtn.disabled = false;
            saveTelemetryCardBtn.innerHTML = `<span>💾</span><span>SAVE TELEMETRY DIRECTIVES</span>`;
          }
        };
      }

      // Live Template Preview Handler
      if (previewReportBtn) {
        previewReportBtn.onclick = async () => {
          const payload = getTelemetryPayload();
          previewReportBtn.disabled = true;
          previewReportBtn.innerHTML = `<span>⏳</span><span>RENDERING PREVIEW...</span>`;
          try {
            const previewData = {
              metrics: payload.telemetry_report_metrics,
              templateTheme: payload.telemetry_report_template_theme,
              customNotes: payload.telemetry_report_custom_notes,
              customTemplate: payload.telemetry_report_custom_template,
              recipients: payload.telemetry_report_recipients,
              cron: payload.telemetry_report_cron
            };

            const res = await API.settings.previewTelemetryReport(previewData);
            if (res && res.html) {
              if (previewIframe) {
                previewIframe.srcdoc = res.html;
              }
              const metaElem = document.getElementById('previewMetaSummary');
              if (metaElem && res.telemetrySummary) {
                const s = res.telemetrySummary;
                metaElem.textContent = `Channels: ${s.totalChannels} • Subscribers: ${Number(s.totalSubscribers).toLocaleString()} • Views: ${Number(s.totalViews).toLocaleString()} • DB Latency: ${s.dbLatencyMs}ms`;
              }
              if (previewModal) {
                previewModal.style.display = 'flex';
              }
            } else {
              Toast.show('Failed to render template preview: empty output.', 'error');
            }
          } catch (err) {
            Toast.show(`Preview failed: ${err.message}`, 'error');
          } finally {
            previewReportBtn.disabled = false;
            previewReportBtn.innerHTML = `<span>👁️</span><span>PREVIEW EMAIL TEMPLATE</span>`;
          }
        };
      }

      // Preview Modal Device Width Toggle
      let isMobilePreview = false;
      const btnToggleWidth = document.getElementById('btnPreviewToggleWidth');
      if (btnToggleWidth && previewIframe) {
        btnToggleWidth.onclick = () => {
          isMobilePreview = !isMobilePreview;
          if (isMobilePreview) {
            previewIframe.style.maxWidth = '420px';
            document.getElementById('previewDeviceIcon').textContent = '💻';
            document.getElementById('previewWidthLabel').textContent = 'Switch to Desktop (720px)';
          } else {
            previewIframe.style.maxWidth = '720px';
            document.getElementById('previewDeviceIcon').textContent = '📱';
            document.getElementById('previewWidthLabel').textContent = 'Switch to Mobile (420px)';
          }
        };
      }

      // Close Preview Modal
      const closePreview = () => { if (previewModal) previewModal.style.display = 'none'; };
      const btnCloseX = document.getElementById('btnCloseTelemetryPreviewX');
      const btnCloseBtn = document.getElementById('btnCloseTelemetryPreviewBtn');
      if (btnCloseX) btnCloseX.onclick = closePreview;
      if (btnCloseBtn) btnCloseBtn.onclick = closePreview;
      if (previewModal) {
        previewModal.onclick = (e) => {
          if (e.target === previewModal) closePreview();
        };
      }

      // Dispatch Live Test Report Now
      if (dispatchReportBtn) {
        dispatchReportBtn.onclick = async () => {
          const payload = getTelemetryPayload();
          if (!payload.telemetry_report_recipients) {
            Toast.show('Please provide at least one recipient email address to dispatch the report.', 'warning');
            return;
          }

          dispatchReportBtn.disabled = true;
          dispatchReportBtn.innerHTML = `<span>⏳</span><span>DISPATCHING LIVE REPORT...</span>`;

          try {
            const res = await API.settings.testTelemetryReport({
              recipients: payload.telemetry_report_recipients,
              metrics: payload.telemetry_report_metrics,
              templateTheme: payload.telemetry_report_template_theme,
              customNotes: payload.telemetry_report_custom_notes,
              customTemplate: payload.telemetry_report_custom_template,
              cron: payload.telemetry_report_cron
            });

            Toast.show(`✅ ${res.message || 'Telemetry report dispatched successfully!'}`, 'success', 6000);
            const statusBadge = document.getElementById('telemetryLastStatusBadge');
            if (statusBadge) {
              statusBadge.className = 'badge badge-emerald';
              statusBadge.textContent = 'SUCCESS';
            }
          } catch (err) {
            Toast.show(`Report dispatch failed: ${err.message}`, 'error', 6000);
          } finally {
            dispatchReportBtn.disabled = false;
            dispatchReportBtn.innerHTML = `<span>⚡</span><span>DISPATCH LIVE REPORT NOW</span>`;
          }
        };
      }

      // Other Handlers
      const saveMediaSettingsBtn = document.getElementById('saveMediaSettingsBtn');
      if (saveMediaSettingsBtn) {
        saveMediaSettingsBtn.onclick = async () => {
          const allowedExt = document.getElementById('settingAllowedMediaExtensions').value.trim();
          const maxSize = document.getElementById('settingMaxMediaUploadSizeMb').value.trim();

          if (!allowedExt) {
            Toast.show('Allowed media extensions cannot be empty.', 'warning');
            return;
          }

          saveMediaSettingsBtn.disabled = true;
          saveMediaSettingsBtn.innerHTML = `<span>⏳</span><span>SAVING MEDIA DIRECTIVES...</span>`;
          try {
            await API.settings.bulkUpdate({
              allowed_media_extensions: allowedExt,
              max_media_upload_size_mb: maxSize || '500'
            });
            Toast.show('Media storage directives updated successfully!', 'success');
          } catch (err) {
            Toast.show(`Failed to save media settings: ${err.message}`, 'error');
          } finally {
            saveMediaSettingsBtn.disabled = false;
            saveMediaSettingsBtn.innerHTML = `<span>💾</span><span>SAVE MEDIA DIRECTIVES</span>`;
          }
        };
      }

      // n8n Directives Handlers
      const saveN8nSettingsBtn = document.getElementById('saveN8nSettingsBtn');
      if (saveN8nSettingsBtn) {
        saveN8nSettingsBtn.onclick = async () => {
          const baseUrl = document.getElementById('settingN8nBaseUrl').value.trim();
          const apiKey = document.getElementById('settingN8nApiKey').value.trim();
          const token = document.getElementById('settingN8nDefaultWebhookToken').value.trim();
          const timeout = document.getElementById('settingN8nDefaultTimeout').value.trim();
          const enabled = document.getElementById('settingN8nEnabledToggle').checked;

          if (!baseUrl) {
            Toast.show('n8n Base URL cannot be empty.', 'warning');
            return;
          }

          saveN8nSettingsBtn.disabled = true;
          saveN8nSettingsBtn.innerHTML = `<span>⏳</span><span>SAVING N8N DIRECTIVES...</span>`;
          try {
            await API.settings.bulkUpdate({
              n8n_base_url: baseUrl,
              n8n_api_key: apiKey,
              n8n_default_webhook_token: token,
              n8n_default_timeout_seconds: timeout || '30',
              n8n_integration_enabled: enabled
            });
            const badge = document.getElementById('n8nStatusBadge');
            if (badge) {
              badge.className = enabled ? 'badge badge-indigo' : 'badge badge-amber';
              badge.textContent = enabled ? 'ENGINE ACTIVE' : 'ENGINE DISABLED';
              badge.style.background = enabled ? 'rgba(139, 92, 246, 0.2)' : '';
              badge.style.color = enabled ? '#a78bfa' : '';
              badge.style.borderColor = enabled ? '#8b5cf6' : '';
            }
            Toast.show('n8n integration directives updated successfully!', 'success');
          } catch (err) {
            Toast.show(`Failed to save n8n settings: ${err.message}`, 'error');
          } finally {
            saveN8nSettingsBtn.disabled = false;
            saveN8nSettingsBtn.innerHTML = `<span>💾</span><span>SAVE N8N DIRECTIVES</span>`;
          }
        };
      }

      const testN8nProbeBtn = document.getElementById('testN8nProbeBtn');
      if (testN8nProbeBtn) {
        testN8nProbeBtn.onclick = async () => {
          const baseUrl = document.getElementById('settingN8nBaseUrl').value.trim();
          const apiKey = document.getElementById('settingN8nApiKey').value.trim();
          const resultDiv = document.getElementById('n8nProbeResultContainer');

          testN8nProbeBtn.disabled = true;
          testN8nProbeBtn.innerHTML = `<span>⏳</span><span>PROBING N8N ENDPOINT...</span>`;
          resultDiv.style.display = 'block';
          resultDiv.style.background = 'rgba(0,0,0,0.3)';
          resultDiv.style.border = '1px solid var(--border-color)';
          resultDiv.style.color = 'var(--text-dim)';
          resultDiv.innerHTML = `Connecting to ${baseUrl}...`;

          try {
            const res = await API.n8n.testConnection({ baseUrl, apiKey });
            if (res.reachable) {
              resultDiv.style.background = 'rgba(16, 185, 129, 0.1)';
              resultDiv.style.border = '1px solid rgba(16, 185, 129, 0.3)';
              resultDiv.style.color = '#10b981';
              resultDiv.innerHTML = `<strong>✓ REACHABLE:</strong> ${res.message} (Status: HTTP ${res.statusCode}, Roundtrip Latency: <strong>${res.latencyMs}ms</strong>)`;
              Toast.show(`n8n endpoint reached successfully (${res.latencyMs}ms)`, 'success');
            } else {
              resultDiv.style.background = 'rgba(239, 68, 68, 0.1)';
              resultDiv.style.border = '1px solid rgba(239, 68, 68, 0.3)';
              resultDiv.style.color = '#ef4444';
              resultDiv.innerHTML = `<strong>✗ UNREACHABLE:</strong> ${res.message} (Roundtrip Probe: ${res.latencyMs}ms)`;
              Toast.show(`Could not reach n8n endpoint`, 'error');
            }
          } catch (err) {
            resultDiv.style.background = 'rgba(239, 68, 68, 0.1)';
            resultDiv.style.border = '1px solid rgba(239, 68, 68, 0.3)';
            resultDiv.style.color = '#ef4444';
            resultDiv.innerHTML = `<strong>✗ ERROR:</strong> ${err.message}`;
            Toast.show(`Probe failed: ${err.message}`, 'error');
          } finally {
            testN8nProbeBtn.disabled = false;
            testN8nProbeBtn.innerHTML = `<span>🔌</span><span>TEST N8N REACHABILITY</span>`;
          }
        };
      }

      document.getElementById('applyLogLevelNowBtn').onclick = async () => {
        const newLevel = document.getElementById('settingLogLevel').value;
        try {
          await API.settings.updateKey('console_log_level', newLevel, 'Active Console & Server Log Level');
          document.getElementById('activeLogLevelBadge').textContent = `ACTIVE: ${newLevel.toUpperCase()}`;
          Toast.show(`Log Level updated to ${newLevel.toUpperCase()} dynamically!`, 'success');
        } catch (err) {
          Toast.show(`Failed to update log level: ${err.message}`, 'error');
        }
      };

      document.getElementById('settingSwaggerToggle').onchange = async (e) => {
        const isEnabled = e.target.checked;
        try {
          await API.settings.updateKey('swagger_enabled', isEnabled, 'Swagger Interactive Documentation Toggle');
          const badge = document.getElementById('swaggerStatusBadge');
          if (isEnabled) {
            badge.className = 'badge badge-emerald';
            badge.textContent = 'EXPLORER ACTIVE';
            Toast.show('Swagger Documentation Enabled!', 'success');
          } else {
            badge.className = 'badge badge-magenta';
            badge.textContent = 'EXPLORER DISABLED';
            Toast.show('Swagger Documentation Disabled!', 'warning');
          }
        } catch (err) {
          Toast.show(`Failed to update Swagger setting: ${err.message}`, 'error');
        }
      };

      document.getElementById('triggerCronNowBtn').onclick = async () => {
        const btn = document.getElementById('triggerCronNowBtn');
        btn.disabled = true;
        btn.innerHTML = `<span>⏳</span><span>Executing Telemetry Sync...</span>`;
        try {
          const activeCh = API.getActiveChannelId();
          const chId = activeCh !== 'all' ? activeCh : null;
          const res = chId ? await API.channels.sync(chId) : await API.settings.updateKey('cron_sync_enabled', true, 'Force Cron');
          Toast.show('Cron telemetry synchronization completed successfully!', 'success');
          btn.disabled = false;
          btn.innerHTML = `<span>🔄</span><span>RUN TELEMETRY SYNC NOW</span>`;
        } catch (err) {
          Toast.show(`Cron run failed: ${err.message}`, 'error');
          btn.disabled = false;
          btn.innerHTML = `<span>🔄</span><span>RUN TELEMETRY SYNC NOW</span>`;
        }
      };

      // Ingest Channel Form
      document.getElementById('channelIngestionForm').onsubmit = async (e) => {
        e.preventDefault();
        const btn = document.getElementById('submitIngestBtn');
        const input = document.getElementById('ingestChannelInput').value.trim();
        const name = document.getElementById('ingestChannelName').value.trim();

        btn.disabled = true;
        btn.innerHTML = `<span>⏳</span><span>INGESTING YOUTUBE METADATA...</span>`;

        try {
          const res = await API.channels.importYouTube({
            channelUrlOrHandle: input,
            channelName: name
          });

          Toast.show(res.message, 'success');
          btn.disabled = false;
          btn.innerHTML = `<span>📥</span><span>INGEST CHANNEL & FEED DATABASE</span>`;
          document.getElementById('channelIngestionForm').reset();
          
          if (res.channel && res.channel.id) {
            API.setActiveChannelId(res.channel.id);
            window.navigateTo('tracker');
          }
        } catch (err) {
          Toast.show(`Ingestion failed: ${err.message}`, 'error');
          btn.disabled = false;
          btn.innerHTML = `<span>📥</span><span>INGEST CHANNEL & FEED DATABASE</span>`;
        }
      };

      document.getElementById('saveAllSettingsBtn').onclick = async () => {
        const payload = {
          console_log_level: document.getElementById('settingLogLevel').value,
          swagger_enabled: document.getElementById('settingSwaggerToggle').checked,
          cron_sync_enabled: document.getElementById('settingCronToggle').checked,
          cron_sync_interval_hours: document.getElementById('settingCronInterval').value,
          youtube_api_key: document.getElementById('settingYoutubeApiKey').value.trim(),
          channel_name: document.getElementById('settingChannelName').value.trim(),
          channel_handle: document.getElementById('settingChannelHandle').value.trim(),
          channel_url: document.getElementById('settingChannelUrl').value.trim(),
          author_name: document.getElementById('settingAuthorName').value.trim(),
          github_url: document.getElementById('settingGithubUrl').value.trim(),
          smtp_host: document.getElementById('settingSmtpHost').value.trim(),
          smtp_port: document.getElementById('settingSmtpPort').value.trim(),
          smtp_encryption: document.getElementById('settingSmtpEncryption').value,
          smtp_auth_enabled: document.getElementById('settingSmtpAuthToggle').checked,
          smtp_user: document.getElementById('settingSmtpUser').value.trim(),
          smtp_pass: document.getElementById('settingSmtpPass').value,
          smtp_from_email: document.getElementById('settingSmtpFromEmail').value.trim(),
          smtp_from_name: document.getElementById('settingSmtpFromName').value.trim(),
          smtp_allow_self_signed: document.getElementById('settingSmtpSelfSigned').checked,
          smtp_timeout_seconds: document.getElementById('settingSmtpTimeout').value,
          smtp_notifications_enabled: document.getElementById('settingSmtpNotificationsEnabled').checked,
          allowed_media_extensions: document.getElementById('settingAllowedMediaExtensions').value.trim(),
          max_media_upload_size_mb: document.getElementById('settingMaxMediaUploadSizeMb').value.trim(),
          n8n_base_url: document.getElementById('settingN8nBaseUrl').value.trim(),
          n8n_api_key: document.getElementById('settingN8nApiKey').value.trim(),
          n8n_default_webhook_token: document.getElementById('settingN8nDefaultWebhookToken').value.trim(),
          n8n_default_timeout_seconds: document.getElementById('settingN8nDefaultTimeout').value.trim(),
          n8n_integration_enabled: document.getElementById('settingN8nEnabledToggle').checked,
          ...getTelemetryPayload()
        };

        try {
          await API.settings.bulkUpdate(payload);
          Toast.show('All directives persisted to PostgreSQL 18 successfully!', 'success');
          SettingsComponent.render(container);
        } catch (err) {
          Toast.show(`Failed to save settings: ${err.message}`, 'error');
        }
      };

      // Danger Zone Verification & Execution Logic
      const mathInput = document.getElementById('flushMathInput');
      const confirmCheck = document.getElementById('flushConfirmCheckbox');
      const flushBtn = document.getElementById('btnExecuteFlushAll');
      const mathFeedback = document.getElementById('flushMathFeedback');

      const validateFlushInputs = () => {
        const userVal = parseInt(mathInput.value, 10);
        const isMathCorrect = userVal === flushAnswerExpected;
        const isChecked = confirmCheck.checked;

        if (mathInput.value.trim().length > 0) {
          if (isMathCorrect) {
            mathFeedback.textContent = '✓ Correct';
            mathFeedback.style.color = '#10b981';
          } else {
            mathFeedback.textContent = '✗ Incorrect sum';
            mathFeedback.style.color = '#ef4444';
          }
        } else {
          mathFeedback.textContent = '';
        }

        if (isMathCorrect && isChecked) {
          flushBtn.disabled = false;
          flushBtn.style.opacity = '1';
          flushBtn.style.cursor = 'pointer';
        } else {
          flushBtn.disabled = true;
          flushBtn.style.opacity = '0.5';
          flushBtn.style.cursor = 'not-allowed';
        }
      };

      // Studio Workspace Demo Data Buttons
      const loadDemoSettingsBtn = document.getElementById('btnLoadDemoFromSettings');
      const openSetupModalBtn = document.getElementById('btnOpenSetupModalFromSettings');

      if (loadDemoSettingsBtn) {
        loadDemoSettingsBtn.onclick = async () => {
          const confirmed = await cyberConfirm({
            title: 'Load Sample Demo Data?',
            subtitle: 'FULL WORKSPACE POPULATION',
            message: 'Are you sure you want to populate all tables with rich sample channels, content, snapshots, and directives?',
            details: 'This will seed sample channels, 14-day trajectory snapshots, content items (Shorts, Videos, Podcasts), tag presets, and SOP notes.',
            confirmText: 'LOAD DEMO DATA',
            cancelText: 'CANCEL',
            type: 'info',
            icon: '🚀'
          });

          if (!confirmed) return;

          loadDemoSettingsBtn.disabled = true;
          loadDemoSettingsBtn.innerHTML = `<span>⏳</span><span>SEEDING ALL TABLES...</span>`;

          try {
            const res = await API.settings.initialSetup({ mode: 'demo' });
            Toast.show(res.message || 'Demo data loaded successfully!', 'success', 5000);
            
            // Reload channels
            if (window.NavbarComponent) {
              await window.NavbarComponent.loadChannels();
              const navContainer = document.getElementById('navbarContainer') || document.querySelector('header.top-navbar')?.parentElement;
              if (navContainer && window.NavbarComponent.render) {
                await window.NavbarComponent.render(navContainer, API.getCurrentUser());
              }
            }

            // Re-render settings
            SettingsComponent.render(container);
          } catch (err) {
            Toast.show(`Failed to load demo data: ${err.message}`, 'error');
            loadDemoSettingsBtn.disabled = false;
            loadDemoSettingsBtn.innerHTML = `<span>🚀</span><span>LOAD SAMPLE DEMO DATA</span>`;
          }
        };
      }

      if (openSetupModalBtn) {
        openSetupModalBtn.onclick = () => {
          if (window.App && typeof window.App.openInitialSetupModal === 'function') {
            window.App.openInitialSetupModal();
          }
        };
      }

      mathInput.oninput = validateFlushInputs;
      confirmCheck.onchange = validateFlushInputs;

      flushBtn.onclick = async () => {
        if (flushBtn.disabled) return;
        flushBtn.disabled = true;
        flushBtn.innerHTML = `<span>⏳</span><span>PURGING ALL DATABASE RECORDS...</span>`;

        try {
          const res = await API.settings.flushAll({
            answer: mathInput.value,
            expected: flushAnswerExpected,
            confirmed: confirmCheck.checked
          });

          Toast.show(res.message, 'success', 6000);
          
          // Clear active channel state and reload navbar channels
          localStorage.removeItem('yt_active_channel_id');
          API.setActiveChannelId('all');
          if (window.NavbarComponent) {
            await window.NavbarComponent.loadChannels();
            const navContainer = document.getElementById('navbarContainer') || document.querySelector('header.top-navbar')?.parentElement;
            if (navContainer && window.NavbarComponent.render) {
              await window.NavbarComponent.render(navContainer, API.getCurrentUser());
            }
          }

          // Navigate to dashboard cleanly and trigger initial setup onboarding prompt
          if (window.App) {
            window.App.navigateTo('dashboard');
            setTimeout(() => {
              if (typeof window.App.checkInitialSetupStatus === 'function') {
                window.App.checkInitialSetupStatus();
              }
            }, 300);
          }
        } catch (err) {
          Toast.show(`System Flush Failed: ${err.message}`, 'error');
          flushBtn.disabled = false;
          flushBtn.innerHTML = `<span>🗑️</span><span>PERMANENTLY FLUSH ALL DATA</span>`;
          validateFlushInputs();
        }
      };

    } catch (err) {
      container.innerHTML = `
        <div class="glass-card" style="padding: 30px; text-align: center; color: #ef4444;">
          Failed to load settings: ${err.message}
        </div>
      `;
    }
  }
};

window.SettingsComponent = SettingsComponent;
