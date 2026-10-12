/**
 * YouTube Channel Manager - Main Application Controller
 */

const App = {
  currentView: 'dashboard',
  currentUser: null,
  sidebarCollapsed: false,

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
    if (view === 'wizard' && extra && window.WizardComponent) {
      window.WizardComponent.preselectedType = extra;
    }

    const cleanView = String(view).replace(/^#\/?/, '') || 'dashboard';
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

    // Render active view
    const mainArea = document.getElementById('mainContentArea');
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
              <input type="text" id="loginUsername" class="cyber-input" placeholder="admin" value="admin" required style="margin-top: 6px;" />
            </div>

            <div>
              <label style="font-size: 11px; font-weight: 700; color: var(--text-dim); text-transform: uppercase;">Secure Password</label>
              <input type="password" id="loginPassword" class="cyber-input" placeholder="••••••••••••" value="Admin@2026" required style="margin-top: 6px;" />
            </div>

            <button type="submit" class="btn-cyber btn-cyber-primary" id="loginSubmitBtn" style="padding: 12px; margin-top: 8px;">
              <span>⚡</span> INITIATE SECURE SESSION
            </button>
          </form>

          <!-- Quick Test Auto-fill -->
          <div style="margin-top: 22px; padding-top: 18px; border-top: 1px solid var(--border-subtle); text-align: center;">
            <div style="font-size: 11px; color: var(--text-dim); margin-bottom: 8px; font-weight: 700;">DEFAULT SEEDED CREDENTIALS:</div>
            <div style="display: flex; gap: 6px; justify-content: center;">
              <button class="btn-cyber btn-cyber-outline btn-sm" onclick="document.getElementById('loginUsername').value='admin'; document.getElementById('loginPassword').value='Admin@2026';">
                Admin: admin
              </button>
              <button class="btn-cyber btn-cyber-outline btn-sm" onclick="document.getElementById('loginUsername').value='ibrar'; document.getElementById('loginPassword').value='Admin@2026';">
                Manager: ibrar
              </button>
            </div>
          </div>
        </div>
      </div>
    `;

    document.getElementById('themeSwitchBtn').onclick = () => this.toggleTheme();

    document.getElementById('loginForm').onsubmit = async (e) => {
      e.preventDefault();
      const btn = document.getElementById('loginSubmitBtn');
      const u = document.getElementById('loginUsername').value.trim();
      const p = document.getElementById('loginPassword').value;

      btn.disabled = true;
      btn.innerHTML = `<span>⏳</span> VERIFYING CREDENTIALS...`;

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
        btn.disabled = false;
        btn.innerHTML = `<span>⚡</span> INITIATE SECURE SESSION`;
      }
    };
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
      <div style="max-width: 800px; margin: 0 auto;">
        <div class="glass-card" style="padding: 24px; border-color: var(--neon-cyan);">
          <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 18px;">
            <h2 style="font-family: var(--font-tech); font-size: 18px; color: var(--neon-cyan);">
              🩺 HIGH PERFORMANCE SERVER HEALTH & DIAGNOSTICS
            </h2>
            <button class="btn-cyber btn-cyber-outline btn-sm" onclick="App.renderHealthView(document.getElementById('mainContentArea'))">
              🔄 PROBE NOW
            </button>
          </div>
          <div id="healthDataContent">
            <div style="font-family: var(--font-tech); color: var(--neon-cyan);">PROBING /health ENDPOINT...</div>
          </div>
        </div>
      </div>
    `;

    try {
      const data = await API.health.get();
      document.getElementById('healthDataContent').innerHTML = `
        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 14px; margin-bottom: 18px;">
          <div class="glass-card" style="padding: 14px;">
            <div style="font-size: 11px; color: var(--text-dim);">POSTGRESQL 18 STATUS</div>
            <div style="font-size: 18px; font-weight: 800; color: var(--neon-emerald); font-family: var(--font-tech);">
              ${data.database.status.toUpperCase()} (${data.database.latencyMs}ms)
            </div>
          </div>
          <div class="glass-card" style="padding: 14px;">
            <div style="font-size: 11px; color: var(--text-dim);">SERVER UPTIME</div>
            <div style="font-size: 18px; font-weight: 800; color: var(--neon-cyan); font-family: var(--font-tech);">
              ${data.uptimeSeconds} SECONDS
            </div>
          </div>
          <div class="glass-card" style="padding: 14px;">
            <div style="font-size: 11px; color: var(--text-dim);">RAM RSS MEMORY</div>
            <div style="font-size: 18px; font-weight: 800; color: var(--neon-violet); font-family: var(--font-tech);">
              ${data.system.memoryRssMb} MB
            </div>
          </div>
          <div class="glass-card" style="padding: 14px;">
            <div style="font-size: 11px; color: var(--text-dim);">NODE ENGINE</div>
            <div style="font-size: 18px; font-weight: 800; color: var(--neon-magenta); font-family: var(--font-tech);">
              ${data.system.nodeVersion}
            </div>
          </div>
        </div>

        <label style="font-size: 11px; font-weight: 700; color: var(--text-dim);">RAW TELEMETRY PAYLOAD</label>
        <pre style="background: rgba(0,0,0,0.3); padding: 14px; border-radius: 8px; font-family: var(--font-mono); font-size: 12px; color: var(--neon-cyan); margin-top: 6px;">${JSON.stringify(data, null, 2)}</pre>
      `;
    } catch (err) {
      document.getElementById('healthDataContent').innerHTML = `<div style="color: #ef4444;">Health probe error: ${err.message}</div>`;
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

// Bootstrap application on DOM ready
document.addEventListener('DOMContentLoaded', () => {
  App.init();
});
