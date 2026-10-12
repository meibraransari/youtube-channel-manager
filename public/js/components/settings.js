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

          <!-- Section 3: Dynamic Logging & Console Verbosity -->
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
        </div>
      `;

      // Handlers
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
          github_url: document.getElementById('settingGithubUrl').value.trim()
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
