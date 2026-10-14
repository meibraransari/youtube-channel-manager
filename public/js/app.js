/**
 * YouTube Channel Manager - Main Application Controller
 */

const App = {
  currentView: 'dashboard',
  currentUser: null,
  sidebarCollapsed: false,
  healthAutoRefreshTimer: null,
  healthAutoRefreshInterval: 0,
  lastHealthData: null,

  escapeHtml(str) {
    if (!str) return '';
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  },

  async init() {
    // 1. Initialize Theme from localStorage
    const savedTheme = localStorage.getItem('yt_theme') || 'dark';
    this.setTheme(savedTheme);

    // 2. Check Auth Status
    const token = API.getToken();
    if (token) {
      try {
        const meRes = await API.auth.me();
        this.currentUser = meRes.user;
        API.setUser(this.currentUser);
      } catch (err) {
        console.warn('Stored token invalid:', err.message);
        API.setToken(null);
        API.setUser(null);
        this.currentUser = null;
      }
    }

    // 3. Listen to auth expired event
    window.addEventListener('auth:expired', () => {
      this.currentUser = null;
      Toast.show('Session expired. Please sign in.', 'warning');
      this.render();
    });

    // 4. Listen to channel change event
    window.addEventListener('channel:changed', () => {
      this.render();
    });

    // 5. Initial Route
    const hash = window.location.hash.replace(/^#\/?/, '') || 'dashboard';
    this.currentView = hash;

    window.addEventListener('hashchange', () => {
      if (this.isNavigating) return;
      const h = window.location.hash.replace(/^#\/?/, '') || 'dashboard';
      if (this.currentView !== h) {
        this.navigateTo(h, false);
      }
    });

    // Render interface
    this.render();
  },

  setTheme(theme) {
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('yt_theme', theme);
    const iconSpan = document.getElementById('themeIcon');
    if (iconSpan) {
      iconSpan.textContent = theme === 'dark' ? '☀️' : '🌙';
    }
  },

  toggleTheme() {
    const current = document.documentElement.getAttribute('data-theme') || 'dark';
    const next = current === 'dark' ? 'light' : 'dark';
    this.setTheme(next);
    Toast.show(`Theme changed to ${next.toUpperCase()}`, 'info', 1500);
  },

  toggleSidebar() {
    const sidebar = document.getElementById('appSidebar');
    if (sidebar) {
      this.sidebarCollapsed = !this.sidebarCollapsed;
      if (this.sidebarCollapsed) {
        sidebar.classList.add('collapsed');
      } else {
        sidebar.classList.remove('collapsed');
      }
    }
  },

  isNavigating: false,

  navigateTo(view, updateHash = true, extra = null) {
    const cleanView = String(view).replace(/^#\/?/, '') || 'dashboard';

    // Track origin before navigating to wizard
    if (cleanView === 'wizard') {
      if (this.currentView && this.currentView !== 'wizard') {
        if (window.WizardComponent) {
          window.WizardComponent.returnView = this.currentView;
        }
        try {
          sessionStorage.setItem('yt_wizard_return_view', this.currentView);
        } catch (_) {}
      }
      if (extra && window.WizardComponent) {
        window.WizardComponent.preselectedType = extra;
      }
    }

    const currentHash = window.location.hash.replace(/^#\/?/, '') || 'dashboard';

    // If already on this view and hash matches, only re-render if extra is provided
    if (this.currentView === cleanView && currentHash === cleanView && !extra) {
      return;
    }

    this.currentView = cleanView;

    if (updateHash && currentHash !== cleanView) {
      this.isNavigating = true;
      window.location.hash = cleanView;
      setTimeout(() => {
        this.isNavigating = false;
      }, 100);
    }

    this.render();
  },

  render() {
    const appRoot = document.getElementById('appRoot');
    if (!appRoot) return;

    if (!this.currentUser) {
      // Render Futuristic Login Screen
      this.renderLoginScreen(appRoot);
      return;
    }

    try {
      let mainArea = document.getElementById('mainContentArea');
      if (!mainArea || !document.getElementById('navbarContainer') || !document.getElementById('sidebarContainer')) {
        appRoot.innerHTML = `
          <div id="navbarContainer"></div>
          <div class="app-layout">
            <div id="sidebarContainer"></div>
            <main class="main-wrapper" id="mainContentArea">
              <!-- Active view component renders here -->
            </main>
          </div>
        `;
        mainArea = document.getElementById('mainContentArea');
      }

      // Render Navbar & Sidebar
      NavbarComponent.render(document.getElementById('navbarContainer'), this.currentUser);
      SidebarComponent.render(document.getElementById('sidebarContainer'), this.currentView);

      // Apply sidebar state
      const sidebar = document.getElementById('appSidebar');
      if (sidebar && this.sidebarCollapsed) {
        sidebar.classList.add('collapsed');
      }

      // Clear health timer if navigating away from health view
      if (this.currentView !== 'health' && this.healthAutoRefreshTimer) {
        clearInterval(this.healthAutoRefreshTimer);
        this.healthAutoRefreshTimer = null;
      }

      // Render active view
      switch (this.currentView) {
        case 'dashboard':
          DashboardComponent.render(mainArea);
          break;
        case 'content':
          ContentComponent.render(mainArea, 'all');
          break;
        case 'shorts':
          ContentComponent.render(mainArea, 'short');
          break;
        case 'videos':
          ContentComponent.render(mainArea, 'video');
          break;
        case 'podcasts':
          ContentComponent.render(mainArea, 'podcast');
          break;
        case 'wizard':
          WizardComponent.render(mainArea);
          break;
        case 'channels':
          ChannelsComponent.render(mainArea);
          break;
        case 'tracker':
          TrackerComponent.render(mainArea);
          break;
        case 'subscriptions':
          SubscriptionsComponent.render(mainArea);
          break;
        case 'n8n':
        case 'workflows':
          N8nComponent.render(mainArea);
          break;
        case 'secret-migration':
        case 'migration':
          if (this.currentUser && this.currentUser.role === 'admin') {
            MigrationComponent.render(mainArea);
          } else {
            Toast.show('Access Denied: Confidential migration portal is restricted to administrator only.', 'error');
            this.navigateTo('dashboard');
          }
          break;
        case 'users':
          UsersComponent.render(mainArea);
          break;
        case 'audit':
          AuditComponent.render(mainArea);
          break;
        case 'settings':
          SettingsComponent.render(mainArea);
          break;
        case 'health':
          this.renderHealthView(mainArea);
          break;
        default:
          DashboardComponent.render(mainArea);
      }
    } catch (err) {
      console.error('Render error:', err);
      Toast.show('Error loading view: ' + err.message, 'error');
    }
  },

  // Login Screen with Futuristic Aesthetic & Credentials helper
  renderLoginScreen(container) {
    if (window.closeAllModals) window.closeAllModals();
    container.innerHTML = `
      <header class="top-navbar">
        <div class="nav-brand">
          <div class="brand-icon">YT</div>
          <div>
            <div class="brand-title">YOUTUBE CHANNEL MANAGER</div>
            <div class="brand-subtitle">Multi-Channel Studio & Operations • PostgreSQL 18</div>
          </div>
        </div>
        <div class="nav-actions">
          <!-- GitHub Repo Link (Before Login) -->
          <a 
            href="https://github.com/meibraransari/youtube-channel-manager" 
            target="_blank" 
            rel="noopener noreferrer" 
            class="github-link-btn"
            title="View Official GitHub Repository"
          >
            <svg height="16" width="16" viewBox="0 0 16 16" fill="currentColor">
              <path d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82.64-.18 1.32-.27 2-.27.68 0 1.36.09 2 .27 1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.013 8.013 0 0016 8c0-4.42-3.58-8-8-8z"></path>
            </svg>
            <span>GitHub ↗</span>
          </a>

          <!-- Light/Dark Theme Switcher on Top Right -->
          <button class="theme-switch-btn" id="themeSwitchBtn" title="Switch Light/Dark Theme">
            <span id="themeIcon">${(document.documentElement.getAttribute('data-theme') || 'dark') === 'dark' ? '☀️' : '🌙'}</span>
          </button>
        </div>
      </header>

      <div style="min-height: calc(100vh - 64px); margin-top: 64px; display: flex; align-items: center; justify-content: center; padding: 24px;">
        <div class="glass-card" style="width: 100%; max-width: 440px; padding: 36px 32px; border-color: var(--accent-teal);">
          <div style="text-align: center; margin-bottom: 26px;">
            <div style="width: 58px; height: 58px; margin: 0 auto 14px; border-radius: 16px; background: linear-gradient(135deg, var(--accent-teal), var(--accent-emerald)); display: flex; align-items: center; justify-content: center; font-size: 28px;">
              🛸
            </div>
            <h2 style="font-size: 20px; font-weight: 800; letter-spacing: -0.2px;">
              AUTHENTICATE ACCESS
            </h2>
            <p style="color: var(--text-muted); font-size: 13px; margin-top: 4px;">
              Enter your credentials to enter the Studio Console
            </p>
          </div>

          <form id="loginForm" style="display: flex; flex-direction: column; gap: 16px;">
            <div>
              <label style="font-size: 11px; font-weight: 700; color: var(--text-dim); text-transform: uppercase;">Operator Username or Email</label>
              <input type="text" id="loginUsername" class="cyber-input" placeholder="Enter username or email" required style="margin-top: 6px;" />
            </div>

            <div>
              <label style="font-size: 11px; font-weight: 700; color: var(--text-dim); text-transform: uppercase;">Secure Password</label>
              <input type="password" id="loginPassword" class="cyber-input" placeholder="Enter password" required style="margin-top: 6px;" />
            </div>

            <button type="submit" class="btn-cyber btn-cyber-primary" id="loginSubmitBtn" style="padding: 12px; margin-top: 8px;">
              <span>⚡</span> INITIATE SECURE SESSION
            </button>
          </form>
        </div>
      </div>
    `;

    const themeBtn = document.getElementById('themeSwitchBtn');
    if (themeBtn) themeBtn.onclick = () => this.toggleTheme();

    const loginForm = document.getElementById('loginForm');
    if (loginForm) {
      loginForm.onsubmit = async (e) => {
        e.preventDefault();
        const btn = document.getElementById('loginSubmitBtn');
        const u = (document.getElementById('loginUsername')?.value || '').trim();
        const p = document.getElementById('loginPassword')?.value || '';

        if (btn) {
          btn.disabled = true;
          btn.innerHTML = `<span>⏳</span> VERIFYING CREDENTIALS...`;
        }

        try {
          const res = await API.auth.login({ username: u, password: p });
          API.setToken(res.token);
          API.setUser(res.user);
          this.currentUser = res.user;
          Toast.show(`Authentication successful! Welcome, ${res.user.username}.`, 'success');
          this.currentView = 'dashboard';
          this.render();
        } catch (err) {
          Toast.show(err.message, 'error');
          if (btn) {
            btn.disabled = false;
            btn.innerHTML = `<span>⚡</span> INITIATE SECURE SESSION`;
          }
        }
      };
    }
  },

  logout() {
    console.log('[AUTH] App.logout executing immediate purge & redirect');
    try {
      localStorage.removeItem('yt_auth_token');
      localStorage.removeItem('yt_auth_user');
      sessionStorage.clear();
      for (let i = localStorage.length - 1; i >= 0; i--) {
        const k = localStorage.key(i);
        if (k && (k.startsWith('yt_auth') || k.includes('token') || k.includes('user'))) {
          localStorage.removeItem(k);
        }
      }
    } catch {}

    if (window.API) {
      API.setToken(null);
      API.setUser(null);
    }

    this.currentUser = null;
    this.currentView = 'dashboard';

    try {
      fetch('/api/auth/logout', { method: 'POST', keepalive: true }).catch(() => {});
    } catch {}

    if (window.history && window.history.replaceState) {
      window.history.replaceState(null, '', window.location.pathname);
    }

    window.location.href = '/';
  },

  // Live Server Health View
  async renderHealthView(container) {
    container.innerHTML = `
      <div style="max-width: 1080px; margin: 0 auto; padding-bottom: 40px;">
        <!-- Executive Header & Control Toolbar -->
        <div class="glass-card" style="padding: 24px; margin-bottom: 20px; border-color: rgba(0, 245, 255, 0.25);">
          <div style="display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 16px;">
            <div>
              <div style="display: flex; align-items: center; gap: 10px; margin-bottom: 6px;">
                <span style="font-size: 22px;">🩺</span>
                <h1 style="font-family: var(--font-tech); font-size: 20px; font-weight: 800; color: var(--text-main); margin: 0; letter-spacing: 0.5px;">
                  HIGH PERFORMANCE SERVER HEALTH & DIAGNOSTICS
                </h1>
                <span class="badge badge-emerald" style="display: inline-flex; align-items: center; gap: 6px; font-size: 11px; padding: 3px 9px;">
                  <span class="health-pulse-dot"></span>
                  <span>ONLINE & HEALTHY</span>
                </span>
              </div>
              <p style="font-size: 12px; color: var(--text-dim); margin: 0;">
                Real-time operational telemetry, PostgreSQL 18 connection pool saturation, V8 heap memory allocation, and service mesh diagnostics
              </p>
            </div>

            <!-- Toolbar Actions -->
            <div style="display: flex; align-items: center; gap: 8px; flex-wrap: wrap;">
              <!-- Auto-Refresh Selector -->
              <div class="filter-dropdown-premium" style="padding: 5px 10px;">
                <span class="filter-icon">⏱️</span>
                <span class="filter-prefix-label">POLL</span>
                <select id="healthAutoRefreshSelect" onchange="App.toggleHealthAutoRefresh(parseInt(this.value, 10))" style="font-size: 11.5px;">
                  <option value="0" ${this.healthAutoRefreshInterval === 0 ? 'selected' : ''}>Off (Manual)</option>
                  <option value="5" ${this.healthAutoRefreshInterval === 5 ? 'selected' : ''}>Every 5s</option>
                  <option value="10" ${this.healthAutoRefreshInterval === 10 ? 'selected' : ''}>Every 10s</option>
                  <option value="30" ${this.healthAutoRefreshInterval === 30 ? 'selected' : ''}>Every 30s</option>
                </select>
              </div>

              <!-- Latency Benchmark Button -->
              <button class="btn-action-premium outline-neutral btn-sm" id="healthBenchmarkBtn" onclick="App.runLatencyBenchmark()" title="Run 3-sample latency ping benchmark">
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                  <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"></polygon>
                </svg>
                <span>Ping Benchmark</span>
              </button>

              <!-- Copy Report Button -->
              <button class="btn-action-premium outline-neutral btn-sm" onclick="App.copyHealthReport()" title="Copy structured diagnostics report">
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                  <rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect>
                  <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path>
                </svg>
                <span>Copy Report</span>
              </button>

              <!-- Probe Now Button -->
              <button class="btn-action-premium primary-teal btn-sm" id="healthProbeBtn" onclick="App.refreshHealthData(this)">
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                  <polyline points="23 4 23 10 17 10"></polyline>
                  <polyline points="1 20 1 14 7 14"></polyline>
                  <path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"></path>
                </svg>
                <span>Probe Now</span>
              </button>
            </div>
          </div>
        </div>

        <!-- Telemetry Dynamic Area -->
        <div id="healthTelemetryContainer">
          <div class="glass-card" style="padding: 40px; text-align: center; color: var(--accent-cyan);">
            <div style="font-size: 28px; margin-bottom: 10px;">🩺</div>
            <div style="font-weight: 700; font-family: var(--font-tech); letter-spacing: 0.5px;">CONNECTING TO CLUSTER TELEMETRY ENGINE...</div>
            <div style="font-size: 12px; color: var(--text-dim); margin-top: 4px;">Gathering live kernel statistics and database pool diagnostics</div>
          </div>
        </div>

        <!-- Latency Benchmark Target Container -->
        <div id="healthBenchmarkResultContainer" style="margin-top: 18px; display: none;"></div>
      </div>
    `;

    await this.refreshHealthData();
  },

  async refreshHealthData(btn) {
    const container = document.getElementById('healthTelemetryContainer');
    if (!container) return;
    if (btn) btn.disabled = true;

    try {
      const data = await API.health.get();
      this.lastHealthData = data;

      const dbStatus = data.database?.status || 'unknown';
      const isDbHealthy = dbStatus === 'healthy';
      const pool = data.database?.pool || { totalConnections: 0, idleConnections: 0, waitingClients: 0, maxPoolSize: 20 };
      const poolPercent = Math.min(100, Math.round(((pool.totalConnections || 0) / (pool.maxPoolSize || 20)) * 100));
      const heapPercent = data.system?.memoryHeapPercent || 0;
      const hostMemPercent = data.system?.hostMemoryUsedPercent || 0;
      const tableStats = data.database?.tableStats || {};

      container.innerHTML = `
        <!-- 1. Executive Telemetry KPI Grid (6 Cards) -->
        <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(310px, 1fr)); gap: 14px; margin-bottom: 20px;">
          <!-- Card 1: PostgreSQL 18 -->
          <div class="health-kpi-card">
            <div class="health-kpi-header">
              <span class="health-kpi-label">
                <span class="health-pulse-dot ${isDbHealthy ? '' : 'danger'}"></span>
                POSTGRESQL 18 ENGINE
              </span>
              <span class="badge ${isDbHealthy ? 'badge-emerald' : 'badge-magenta'}" style="font-size: 10.5px;">
                ${isDbHealthy ? 'OPTIMAL' : 'UNREACHABLE'}
              </span>
            </div>
            <div class="health-kpi-val" style="color: ${isDbHealthy ? 'var(--neon-emerald)' : '#ef4444'};">
              ${dbStatus.toUpperCase()} <span style="font-size: 13px; font-weight: 600; color: var(--text-dim);">(${data.database?.latencyMs ?? 0}ms ping)</span>
            </div>
            <div class="health-meter-bar">
              <div class="health-meter-fill ${isDbHealthy ? 'emerald' : 'amber'}" style="width: 100%;"></div>
            </div>
            <div class="health-kpi-sub">
              <span>${this.escapeHtml(data.database?.version || 'PostgreSQL 18.6')}</span>
              <span style="color: var(--accent-teal); font-weight: 700;">⚡ Ultra-Low Latency</span>
            </div>
          </div>

          <!-- Card 2: Server Uptime & SLA -->
          <div class="health-kpi-card">
            <div class="health-kpi-header">
              <span class="health-kpi-label">
                <span>⏱️</span> SERVER UPTIME & AVAILABILITY
              </span>
              <span class="badge badge-cyan" style="font-size: 10.5px;">99.98% SLA</span>
            </div>
            <div class="health-kpi-val" style="color: var(--neon-cyan);">
              ${this.escapeHtml(data.uptimeHuman || data.uptimeSeconds + 's')}
            </div>
            <div class="health-meter-bar">
              <div class="health-meter-fill cyan" style="width: 99%;"></div>
            </div>
            <div class="health-kpi-sub">
              <span>Elapsed: ${data.uptimeSeconds} seconds</span>
              <span style="font-family: var(--font-mono); color: var(--text-dim);">PID: ${data.system?.pid || 1}</span>
            </div>
          </div>

          <!-- Card 3: V8 Heap Memory -->
          <div class="health-kpi-card">
            <div class="health-kpi-header">
              <span class="health-kpi-label">
                <span>🧠</span> V8 HEAP ALLOCATION
              </span>
              <span class="badge badge-violet" style="font-size: 10.5px;">${heapPercent}% ALLOCATED</span>
            </div>
            <div class="health-kpi-val" style="color: var(--neon-violet);">
              ${data.system?.memoryHeapUsedMb || 0} MB <span style="font-size: 13px; font-weight: 500; color: var(--text-dim);">/ ${data.system?.memoryHeapTotalMb || 0} MB</span>
            </div>
            <div class="health-meter-bar">
              <div class="health-meter-fill violet" style="width: ${Math.max(5, heapPercent)}%;"></div>
            </div>
            <div class="health-kpi-sub">
              <span>RSS: ${data.system?.memoryRssMb || 0} MB Resident</span>
              <span>External: ${data.system?.memoryExternalMb || 0} MB</span>
            </div>
          </div>

          <!-- Card 4: CPU Architecture & Cores -->
          <div class="health-kpi-card">
            <div class="health-kpi-header">
              <span class="health-kpi-label">
                <span>⚡</span> COMPUTE CORES & ARCHITECTURE
              </span>
              <span class="badge badge-amber" style="font-size: 10.5px;">${data.system?.arch?.toUpperCase() || 'X64'}</span>
            </div>
            <div class="health-kpi-val" style="color: var(--neon-amber);">
              ${data.system?.cpuCores || 1} Cores <span style="font-size: 13px; font-weight: 500; color: var(--text-dim);">${data.system?.nodeVersion}</span>
            </div>
            <div class="health-meter-bar">
              <div class="health-meter-fill amber" style="width: 100%;"></div>
            </div>
            <div class="health-kpi-sub">
              <span style="overflow: hidden; text-overflow: ellipsis; white-space: nowrap; max-width: 220px;" title="${this.escapeHtml(data.system?.cpuModel || '')}">
                ${this.escapeHtml(data.system?.cpuModel || 'Multi-Core Server')}
              </span>
              <span style="text-transform: uppercase;">${data.system?.platform || 'linux'}</span>
            </div>
          </div>

          <!-- Card 5: DB Connection Pool Saturation -->
          <div class="health-kpi-card">
            <div class="health-kpi-header">
              <span class="health-kpi-label">
                <span>🏊</span> PG CONNECTION POOL
              </span>
              <span class="badge badge-teal" style="font-size: 10.5px;">${poolPercent}% UTILIZED</span>
            </div>
            <div class="health-kpi-val" style="color: var(--accent-teal);">
              ${pool.totalConnections || 0} / ${pool.maxPoolSize || 20} <span style="font-size: 13px; font-weight: 500; color: var(--text-dim);">Connections</span>
            </div>
            <div class="health-meter-bar">
              <div class="health-meter-fill emerald" style="width: ${Math.max(5, poolPercent)}%;"></div>
            </div>
            <div class="health-kpi-sub">
              <span>Idle in pool: ${pool.idleConnections || 0}</span>
              <span>Queued waiters: ${pool.waitingClients || 0}</span>
            </div>
          </div>

          <!-- Card 6: Host Memory Allocation -->
          <div class="health-kpi-card">
            <div class="health-kpi-header">
              <span class="health-kpi-label">
                <span>💾</span> HOST RAM CAPACITY
              </span>
              <span class="badge badge-magenta" style="font-size: 10.5px;">${hostMemPercent}% CONSUMED</span>
            </div>
            <div class="health-kpi-val" style="color: var(--neon-magenta);">
              ${data.system?.hostFreeMemoryMb || 0} MB <span style="font-size: 13px; font-weight: 500; color: var(--text-dim);">Free</span>
            </div>
            <div class="health-meter-bar">
              <div class="health-meter-fill violet" style="width: ${Math.max(5, hostMemPercent)}%;"></div>
            </div>
            <div class="health-kpi-sub">
              <span>Total Host RAM: ${data.system?.hostTotalMemoryMb || 0} MB</span>
              <span>Used: ${hostMemPercent}%</span>
            </div>
          </div>
        </div>

        <!-- 2. Subsystems & Service Mesh Matrix -->
        <div class="glass-card" style="padding: 0; overflow: hidden; margin-bottom: 20px;">
          <div style="padding: 16px 20px; border-bottom: 1px solid rgba(255, 255, 255, 0.08); display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 8px;">
            <div>
              <div style="font-family: var(--font-tech); font-size: 15px; font-weight: 800; color: var(--text-main); display: flex; align-items: center; gap: 8px;">
                <span>🧩</span> CLUSTER SUBSYSTEMS & INFRASTRUCTURE CONNECTORS
              </div>
              <div style="font-size: 11.5px; color: var(--text-dim); margin-top: 2px;">
                Active service registry reporting protocol health, latency budgets, and security posture
              </div>
            </div>
            <span class="badge badge-cyan" style="font-size: 10.5px;">
              ${(data.subsystems || []).length} MONITORED SUBSYSTEMS
            </span>
          </div>

          <div class="table-responsive">
            <table class="health-subsystems-table">
              <thead>
                <tr>
                  <th>SUBSYSTEM / SERVICE</th>
                  <th>DOMAIN</th>
                  <th>LATENCY</th>
                  <th>RUNTIME DETAIL</th>
                  <th style="text-align: right;">STATUS</th>
                </tr>
              </thead>
              <tbody>
                ${(data.subsystems || []).map(s => {
                  let badgeClass = 'badge-emerald';
                  if (s.status === 'UNREACHABLE' || s.status === 'DEGRADED') badgeClass = 'badge-magenta';
                  else if (s.status === 'STANDBY') badgeClass = 'badge-amber';
                  else if (s.status === 'ACTIVE' || s.status === 'READY') badgeClass = 'badge-teal';
                  else if (s.status === 'CONTAINERIZED') badgeClass = 'badge-cyan';

                  return `
                    <tr>
                      <td style="font-weight: 700; color: var(--text-main);">
                        ${this.escapeHtml(s.name)}
                      </td>
                      <td>
                        <span class="badge badge-outline" style="font-size: 10px;">${this.escapeHtml(s.category)}</span>
                      </td>
                      <td style="font-family: var(--font-mono); font-size: 12px; color: var(--accent-cyan);">
                        ${this.escapeHtml(s.latency)}
                      </td>
                      <td style="font-size: 11.5px; color: var(--text-muted); font-family: var(--font-mono);">
                        ${this.escapeHtml(s.detail)}
                      </td>
                      <td style="text-align: right;">
                        <span class="badge ${badgeClass}" style="font-size: 11px; font-weight: 700; padding: 3px 8px;">
                          ${this.escapeHtml(s.status)}
                        </span>
                      </td>
                    </tr>
                  `;
                }).join('')}
              </tbody>
            </table>
          </div>
        </div>

        <!-- 3. Database Table Record Cardinality & Storage Distribution -->
        <div class="glass-card" style="padding: 20px; margin-bottom: 20px;">
          <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 14px; flex-wrap: wrap; gap: 8px;">
            <div>
              <div style="font-family: var(--font-tech); font-size: 15px; font-weight: 800; color: var(--text-main); display: flex; align-items: center; gap: 8px;">
                <span>📊</span> POSTGRESQL 18 TABLE CAPACITY & RECORD COUNTS
              </div>
              <div style="font-size: 11.5px; color: var(--text-dim); margin-top: 2px;">
                Real-time cardinality across production operational tables
              </div>
            </div>
            <span class="badge badge-emerald" style="font-size: 10.5px;">NORMALIZED SCHEMA UTF-8</span>
          </div>

          <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(190px, 1fr)); gap: 12px;">
            <div class="health-table-stat-card">
              <div style="font-size: 11px; color: var(--text-dim); text-transform: uppercase; font-weight: 700;">📺 CONNECTED CHANNELS</div>
              <div style="font-family: var(--font-tech); font-size: 20px; font-weight: 800; color: var(--neon-cyan);">
                ${tableStats.channels ?? 0}
              </div>
              <div style="font-size: 10.5px; color: var(--text-muted);">channels table</div>
            </div>

            <div class="health-table-stat-card">
              <div style="font-size: 11px; color: var(--text-dim); text-transform: uppercase; font-weight: 700;">🎬 CATALOG CONTENT</div>
              <div style="font-family: var(--font-tech); font-size: 20px; font-weight: 800; color: var(--neon-emerald);">
                ${tableStats.contentItems ?? 0}
              </div>
              <div style="font-size: 10.5px; color: var(--text-muted);">content_items table</div>
            </div>

            <div class="health-table-stat-card">
              <div style="font-size: 11px; color: var(--text-dim); text-transform: uppercase; font-weight: 700;">🔔 SUBSCRIBED CHANNELS</div>
              <div style="font-family: var(--font-tech); font-size: 20px; font-weight: 800; color: var(--neon-violet);">
                ${tableStats.subscriptions ?? 0}
              </div>
              <div style="font-size: 10.5px; color: var(--text-muted);">channel_subscriptions table</div>
            </div>

            <div class="health-table-stat-card">
              <div style="font-size: 11px; color: var(--text-dim); text-transform: uppercase; font-weight: 700;">👥 ENROLLED OPERATORS</div>
              <div style="font-family: var(--font-tech); font-size: 20px; font-weight: 800; color: var(--neon-amber);">
                ${tableStats.users ?? 0}
              </div>
              <div style="font-size: 10.5px; color: var(--text-muted);">users table (RBAC)</div>
            </div>

            <div class="health-table-stat-card">
              <div style="font-size: 11px; color: var(--text-dim); text-transform: uppercase; font-weight: 700;">📜 AUDIT TRANSACTIONS</div>
              <div style="font-family: var(--font-tech); font-size: 20px; font-weight: 800; color: var(--neon-magenta);">
                ${tableStats.auditLogs ?? 0}
              </div>
              <div style="font-size: 10.5px; color: var(--text-muted);">audit_logs ledger</div>
            </div>
          </div>
        </div>

        <!-- 4. Environment & Security Config Parameters -->
        <div class="glass-card" style="padding: 18px 20px; margin-bottom: 20px; display: flex; align-items: center; justify-content: space-between; flex-wrap: wrap; gap: 14px;">
          <div style="display: flex; align-items: center; gap: 14px; flex-wrap: wrap;">
            <div>
              <span style="font-size: 10.5px; font-weight: 700; color: var(--text-dim); text-transform: uppercase;">ENVIRONMENT:</span>
              <strong style="color: var(--accent-cyan); font-family: var(--font-mono); margin-left: 4px;">${this.escapeHtml(data.config?.environment || 'production')}</strong>
            </div>
            <div>
              <span style="font-size: 10.5px; font-weight: 700; color: var(--text-dim); text-transform: uppercase;">LOG LEVEL:</span>
              <strong style="color: var(--accent-teal); font-family: var(--font-mono); margin-left: 4px;">${this.escapeHtml(data.config?.activeLogLevel || 'info')}</strong>
            </div>
            <div>
              <span style="font-size: 10.5px; font-weight: 700; color: var(--text-dim); text-transform: uppercase;">PROBE LATENCY:</span>
              <strong style="color: var(--neon-emerald); font-family: var(--font-mono); margin-left: 4px;">${data.responseTimeMs || 0}ms</strong>
            </div>
          </div>
          <div style="font-size: 11px; color: var(--text-dim); font-family: var(--font-mono);">
            Probed at: ${new Date(data.timestamp).toLocaleTimeString()}
          </div>
        </div>

        <!-- 5. Collapsible Raw JSON Telemetry Inspector -->
        <details class="health-accordion">
          <summary>
            <span style="display: flex; align-items: center; gap: 8px;">
              <span>🛠️</span> RAW KERNEL TELEMETRY PAYLOAD (JSON)
            </span>
            <span class="badge badge-outline" style="font-size: 10px;">Click to Expand</span>
          </summary>
          <div style="padding: 16px; background: rgba(0,0,0,0.4);">
            <div style="display: flex; justify-content: flex-end; margin-bottom: 8px;">
              <button class="btn-action-premium outline-neutral btn-sm" onclick="App.copyHealthReport()">
                📋 Copy Raw JSON
              </button>
            </div>
            <pre style="margin: 0; padding: 14px; border-radius: 6px; font-family: var(--font-mono); font-size: 11.5px; color: var(--neon-cyan); background: rgba(0,0,0,0.5); overflow-x: auto; max-height: 380px;">${this.escapeHtml(JSON.stringify(data, null, 2))}</pre>
          </div>
        </details>
      `;
    } catch (err) {
      container.innerHTML = `
        <div class="glass-card" style="padding: 30px; text-align: center; color: #ef4444; border-color: rgba(239, 68, 68, 0.4);">
          <div style="font-size: 28px; margin-bottom: 8px;">⚠️</div>
          <div style="font-weight: 700; font-size: 15px;">Server Telemetry Probe Failure</div>
          <div style="font-size: 12px; margin-top: 4px; color: var(--text-muted);">${this.escapeHtml(err.message)}</div>
          <button class="btn-action-premium primary-teal btn-sm" style="margin-top: 16px;" onclick="App.refreshHealthData()">
            Retry Probe
          </button>
        </div>
      `;
    } finally {
      if (btn) btn.disabled = false;
    }
  },

  // Toggle Auto-Refresh
  toggleHealthAutoRefresh(seconds) {
    if (this.healthAutoRefreshTimer) {
      clearInterval(this.healthAutoRefreshTimer);
      this.healthAutoRefreshTimer = null;
    }
    this.healthAutoRefreshInterval = seconds;
    if (seconds > 0) {
      this.healthAutoRefreshTimer = setInterval(() => {
        if (this.currentView === 'health') {
          this.refreshHealthData();
        } else {
          clearInterval(this.healthAutoRefreshTimer);
          this.healthAutoRefreshTimer = null;
        }
      }, seconds * 1000);
      Toast.show(`Telemetry polling set to every ${seconds}s`, 'info', 1500);
    } else {
      Toast.show('Telemetry auto-polling disabled', 'info', 1200);
    }
  },

  // Run 3-Sample Latency Benchmark
  async runLatencyBenchmark() {
    const target = document.getElementById('healthBenchmarkResultContainer');
    const btn = document.getElementById('healthBenchmarkBtn');
    if (!target) return;
    target.style.display = 'block';
    if (btn) btn.disabled = true;

    target.innerHTML = `
      <div class="glass-card" style="padding: 16px; border-color: var(--accent-cyan); display: flex; align-items: center; gap: 12px;">
        <span style="font-size: 20px;">⚡</span>
        <div>
          <div style="font-weight: 700; font-size: 13px; color: var(--text-main);">Running 3-Sample Database Latency Benchmark...</div>
          <div style="font-size: 11px; color: var(--text-dim);">Measuring roundtrip ping across PostgreSQL 18 connection pool</div>
        </div>
      </div>
    `;

    try {
      const res = await API.health.ping();
      const avg = res.avg ?? 0;
      let latencyGrade = '⚡ Ultra-Fast (< 2ms)';
      let gradeColor = 'var(--neon-emerald)';
      if (avg >= 10) {
        latencyGrade = '🟡 Normal Latency';
        gradeColor = '#f59e0b';
      }

      target.innerHTML = `
        <div class="glass-card" style="padding: 20px; border-color: var(--accent-cyan); position: relative;">
          <button style="position: absolute; top: 12px; right: 14px; background: transparent; border: none; color: var(--text-dim); cursor: pointer;" onclick="document.getElementById('healthBenchmarkResultContainer').style.display='none'">✕</button>
          <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 12px; flex-wrap: wrap; gap: 8px;">
            <div style="display: flex; align-items: center; gap: 8px;">
              <span style="font-size: 20px;">⚡</span>
              <div>
                <div style="font-family: var(--font-tech); font-weight: 800; font-size: 15px; color: var(--text-main);">3-SAMPLE DATABASE LATENCY BENCHMARK</div>
                <div style="font-size: 11px; color: var(--text-dim);">PostgreSQL 18 Roundtrip Network & Query Evaluation</div>
              </div>
            </div>
            <span class="badge badge-emerald" style="color: ${gradeColor}; font-weight: 700; font-size: 11.5px;">${latencyGrade}</span>
          </div>

          <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(130px, 1fr)); gap: 10px; margin-bottom: 14px;">
            <div style="background: rgba(0,0,0,0.3); padding: 12px; border-radius: 6px; text-align: center;">
              <div style="font-size: 10.5px; color: var(--text-dim); font-weight: 700;">AVERAGE LATENCY</div>
              <div style="font-size: 20px; font-weight: 800; color: var(--neon-cyan); font-family: var(--font-tech);">${res.avg} ms</div>
            </div>
            <div style="background: rgba(0,0,0,0.3); padding: 12px; border-radius: 6px; text-align: center;">
              <div style="font-size: 10.5px; color: var(--text-dim); font-weight: 700;">MIN LATENCY</div>
              <div style="font-size: 20px; font-weight: 800; color: var(--neon-emerald); font-family: var(--font-tech);">${res.min} ms</div>
            </div>
            <div style="background: rgba(0,0,0,0.3); padding: 12px; border-radius: 6px; text-align: center;">
              <div style="font-size: 10.5px; color: var(--text-dim); font-weight: 700;">MAX LATENCY</div>
              <div style="font-size: 20px; font-weight: 800; color: var(--neon-amber); font-family: var(--font-tech);">${res.max} ms</div>
            </div>
          </div>

          <div style="display: flex; align-items: center; gap: 8px;">
            <span style="font-size: 11px; color: var(--text-dim); font-weight: 700;">SAMPLES:</span>
            ${(res.pings || []).map((p, i) => `
              <span class="badge badge-outline" style="font-family: var(--font-mono); font-size: 11px; padding: 2px 8px;">
                Sample #${i + 1}: <strong style="color: var(--neon-cyan);">${p}ms</strong>
              </span>
            `).join('')}
          </div>
        </div>
      `;
    } catch (err) {
      target.innerHTML = `
        <div class="glass-card" style="padding: 14px; color: #ef4444; border-color: rgba(239, 68, 68, 0.4);">
          Benchmark error: ${this.escapeHtml(err.message)}
        </div>
      `;
    } finally {
      if (btn) btn.disabled = false;
    }
  },

  // Copy structured report to clipboard
  copyHealthReport() {
    if (!this.lastHealthData) {
      Toast.show('No telemetry data available to copy', 'warning');
      return;
    }
    const jsonStr = JSON.stringify(this.lastHealthData, null, 2);
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(jsonStr)
        .then(() => Toast.show('Diagnostics JSON copied to clipboard!', 'success'))
        .catch(() => Toast.show('Failed to copy to clipboard', 'error'));
    } else {
      const textarea = document.createElement('textarea');
      textarea.value = jsonStr;
      document.body.appendChild(textarea);
      textarea.select();
      document.execCommand('copy');
      document.body.removeChild(textarea);
      Toast.show('Diagnostics JSON copied to clipboard!', 'success');
    }
  }
};

// Global inspection modal for any content item
window.viewContentModal = async function(id) {
  try {
    const res = await API.content.get(id);
    const item = res.data;

    let modal = document.getElementById('contentDetailModal');
    if (!modal) {
      modal = document.createElement('div');
      modal.id = 'contentDetailModal';
      modal.className = 'modal-overlay';
      document.body.appendChild(modal);
    }

    modal.innerHTML = `
      <div class="modal-dialog" style="max-width: 680px;">
        <div class="modal-header">
          <div style="display: flex; align-items: center; gap: 10px;">
            <span class="badge ${item.content_type === 'short' ? 'badge-violet' : 'badge-cyan'}">
              ${item.content_type.toUpperCase()}
            </span>
            <span class="badge ${item.status === 'uploaded' ? 'badge-emerald' : 'badge-amber'}">
              ${item.status.toUpperCase()}
            </span>
            <span style="font-family: var(--font-tech); font-size: 14px;">ITEM #${item.id}</span>
          </div>
          <button class="modal-close-btn" data-close-modal="true" onclick="window.closeModal('contentDetailModal')">✕</button>
        </div>
        <div class="modal-body" style="display: flex; flex-direction: column; gap: 16px;">
          <div>
            <h2 style="font-size: 18px; font-weight: 800; color: var(--text-main); margin-bottom: 4px;">
              ${item.title}
            </h2>
            ${item.topic ? `<div style="font-size: 13px; color: var(--neon-cyan);">📌 ${item.topic}</div>` : ''}
          </div>

          <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 12px; background: rgba(0,0,0,0.2); padding: 12px; border-radius: 8px; font-size: 12px;">
            <div>
              <span style="color: var(--text-dim); font-weight: 700;">MEDIA UUID:</span>
              <div style="font-family: var(--font-mono); color: var(--neon-cyan); word-break: break-all;">${item.media_uuid}</div>
            </div>
            <div>
              <span style="color: var(--text-dim); font-weight: 700;">METRICS:</span>
              <div style="color: var(--text-muted);">👁️ ${(item.views_count || 0).toLocaleString()} views • ❤️ ${(item.likes_count || 0).toLocaleString()} likes</div>
            </div>
            <div>
              <span style="color: var(--text-dim); font-weight: 700;">CREATED AT:</span>
              <div style="color: var(--text-muted); font-family: var(--font-mono);">${new Date(item.created_at).toLocaleString()}</div>
            </div>
            <div>
              <span style="color: var(--text-dim); font-weight: 700;">UPLOADED AT:</span>
              <div style="color: var(--text-muted); font-family: var(--font-mono);">${item.uploaded_at ? new Date(item.uploaded_at).toLocaleString() : 'Pending'}</div>
            </div>
          </div>

          ${item.video_url ? `
            <div>
              <span style="color: var(--text-dim); font-weight: 700; font-size: 11px;">YOUTUBE TARGET LINK:</span>
              <div style="margin-top: 4px;">
                <a href="${item.video_url}" target="_blank" rel="noopener" class="btn-cyber btn-cyber-primary btn-sm">
                  ▶ OPEN ON YOUTUBE (${item.video_url})
                </a>
              </div>
            </div>
          ` : ''}

          ${(item.image_url || item.image_file) ? `
            <div>
              <span style="color: var(--text-dim); font-weight: 700; font-size: 11px;">IMAGE / THUMBNAIL TARGET LINK:</span>
              <div style="margin-top: 4px; display: flex; flex-direction: column; gap: 8px;">
                <div>
                  <a href="${item.image_file || item.image_url}" target="_blank" rel="noopener" class="btn-cyber btn-cyber-secondary btn-sm" style="display: inline-flex; align-items: center; gap: 6px;">
                    🖼️ VIEW IMAGE (${item.image_file || item.image_url})
                  </a>
                </div>
                <div style="margin-top: 2px; border-radius: var(--radius-sm); overflow: hidden; max-width: 260px; border: 1px solid var(--border-color);">
                  <img src="${item.image_file || item.image_url}" alt="Thumbnail Preview" style="width: 100%; height: auto; display: block;" onerror="this.style.display='none'" />
                </div>
              </div>
            </div>
          ` : ''}

          ${item.video_file ? `
            <div>
              <span style="color: var(--text-dim); font-weight: 700; font-size: 11px;">LOCAL MEDIA VIDEO ASSET:</span>
              <div style="margin-top: 4px;">
                <a href="${item.video_file}" target="_blank" rel="noopener" class="btn-cyber btn-cyber-secondary btn-sm" style="display: inline-flex; align-items: center; gap: 6px;">
                  📹 PLAY/DOWNLOAD VIDEO ASSET (${item.video_file})
                </a>
              </div>
            </div>
          ` : ''}

          ${item.description ? `
            <div>
              <span style="color: var(--text-dim); font-weight: 700; font-size: 11px;">DESCRIPTION / SUMMARY:</span>
              <div style="background: rgba(0,0,0,0.2); padding: 12px; border-radius: 8px; font-size: 12px; color: var(--text-muted); white-space: pre-wrap; max-height: 200px; overflow-y: auto; margin-top: 4px; line-height: 1.6;">
                ${item.description}
              </div>
            </div>
          ` : ''}

          ${item.image_prompt ? `
            <div>
              <span style="color: var(--text-dim); font-weight: 700; font-size: 11px;">THUMBNAIL / AI IMAGE PROMPT:</span>
              <pre style="background: rgba(0,0,0,0.3); padding: 12px; border-radius: 8px; font-size: 11px; color: var(--neon-violet); white-space: pre-wrap; max-height: 150px; overflow-y: auto; margin-top: 4px; font-family: var(--font-mono);">${item.image_prompt}</pre>
            </div>
          ` : ''}

          ${item.tags ? `
            <div>
              <span style="color: var(--text-dim); font-weight: 700; font-size: 11px;">TAGS DIRECTORY:</span>
              <div style="background: rgba(0,0,0,0.2); padding: 10px; border-radius: 8px; font-size: 11px; color: var(--text-main); font-family: var(--font-mono); margin-top: 4px;">
                ${item.tags}
              </div>
            </div>
          ` : ''}
        </div>
        <div class="modal-footer">
          <button class="btn-cyber btn-cyber-secondary btn-sm" onclick="window.duplicateContentItem(${item.id}, event);">
            📋 CLONE / DUPLICATE
          </button>
          <button class="btn-cyber btn-cyber-primary btn-sm" data-close-modal="true" onclick="window.closeModal('contentDetailModal')">
            CLOSE
          </button>
        </div>
      </div>
    `;

    window.openModal(modal);
  } catch (err) {
    Toast.show(`Failed to load details: ${err.message}`, 'error');
  }
};

window.openContentEditModal = function(id, event) {
  if (event) {
    if (typeof event.preventDefault === 'function') event.preventDefault();
    if (typeof event.stopPropagation === 'function') event.stopPropagation();
  }
  window.closeModal('contentDetailModal');
  setTimeout(() => {
    if (window.ContentComponent && typeof window.ContentComponent.openEditModal === 'function') {
      window.ContentComponent.openEditModal(id);
    }
  }, 40);
};

window.duplicateContentItem = function(id, event) {
  if (event) {
    if (typeof event.preventDefault === 'function') event.preventDefault();
    if (typeof event.stopPropagation === 'function') event.stopPropagation();
  }
  window.closeModal('contentDetailModal');
  setTimeout(() => {
    if (window.ContentComponent && typeof window.ContentComponent.duplicateItem === 'function') {
      window.ContentComponent.duplicateItem(id);
    }
  }, 40);
};

window.navigateTo = (view, extra) => App.navigateTo(view, true, extra);
window.navigateToWizard = (type = 'short') => App.navigateTo('wizard', true, type);
window.toggleTheme = () => App.toggleTheme();
window.setTheme = (theme) => App.setTheme(theme);
window.toggleSidebar = () => App.toggleSidebar();
window.logout = () => App.logout();
window.openTagManager = (onSelect) => {
  if (window.TagManagerComponent) {
    window.TagManagerComponent.openModal(onSelect);
  }
};

// Bootstrap application on DOM ready
document.addEventListener('DOMContentLoaded', () => {
  App.init();
});
