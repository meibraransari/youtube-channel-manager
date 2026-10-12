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

          <!-- Section 4: Dynamic Logging & Console Verbosity -->
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

          <!-- Section 6: Color Themes -->
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
              Permanently purges all content items (videos, reels/shorts, podcasts), channels, historical snapshots, telemetry logs, login history, and extra user accounts. Resets the database to a clean zero-data state with only the root administrator.
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

      // Other Handlers
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
          smtp_notifications_enabled: document.getElementById('settingSmtpNotificationsEnabled').checked
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

          // Navigate to dashboard cleanly
          if (window.App) {
            window.App.navigateTo('dashboard');
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
