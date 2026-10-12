/**
 * Top Navigation Bar Component - Executive SaaS Style with Multi-Channel Selector & Pill Tabs
 */
const NavbarComponent = {
  channelsList: [],

  async loadChannels() {
    try {
      const res = await API.channels.list();
      this.channelsList = res.channels || [];
    } catch (err) {
      console.warn('Could not load channels for navbar:', err.message);
    }
  },

  async render(container, currentUser) {
    await this.loadChannels();
    const activeChannelId = API.getActiveChannelId();

    const currentHash = window.location.hash.replace('#', '') || 'dashboard';

    container.innerHTML = `
      <header class="top-navbar">
        <!-- Left: Brand & Sidebar Toggle & Channel Selector -->
        <div style="display: flex; align-items: center; gap: 14px; min-width: 0;">
          ${currentUser ? `
            <button class="sidebar-toggle-btn" id="sidebarToggleBtn" title="Toggle Sidebar">
              <span style="font-size: 15px;">☰</span>
            </button>
          ` : ''}

          <div class="nav-brand" style="cursor: pointer;" onclick="window.navigateTo('dashboard')">
            <div class="brand-icon">YT</div>
            <div class="nav-brand-text">
              <div class="brand-title">YOUTUBE STUDIO</div>
            </div>
          </div>

          <!-- Channel Selector Dropdown -->
          ${currentUser ? `
            <div class="channel-selector-container">
              <select id="navbarChannelSelect" class="channel-select-dropdown" title="Select Active Channel">
                <option value="all" ${activeChannelId === 'all' ? 'selected' : ''}>${this.channelsList.length === 0 ? '🌐 No Channels (0 Registered)' : '🌐 All Channels (Consolidated)'}</option>
                ${this.channelsList.map(c => `
                  <option value="${c.id}" ${activeChannelId === c.id ? 'selected' : ''}>
                    📺 ${c.name} (${c.handle || '@channel'})
                  </option>
                `).join('')}
                <option value="__manage_channels__">⚙️ Manage All Channels...</option>
              </select>
            </div>
          ` : ''}
        </div>

        <!-- Center: Pill Navigation Tabs (from design reference screenshot) -->
        ${currentUser ? `
          <nav class="nav-pill-tabs" id="navPillTabs">
            <a href="#dashboard" class="nav-pill-item ${currentHash === 'dashboard' ? 'active' : ''}" onclick="window.navigateTo('dashboard'); return false;">
              <span>🏠</span>
              <span>Home</span>
              <span class="pill-count">${this.channelsList.length}</span>
            </a>
            <a href="#channels" class="nav-pill-item ${currentHash === 'channels' ? 'active' : ''}" onclick="window.navigateTo('channels'); return false;">
              <span>📺</span>
              <span>Channels</span>
              <span class="pill-count">${this.channelsList.length}</span>
            </a>
            <a href="#content" class="nav-pill-item ${currentHash === 'content' ? 'active' : ''}" onclick="window.navigateTo('content'); return false;">
              <span>🎬</span>
              <span>Catalog</span>
            </a>
            <a href="#shorts" class="nav-pill-item ${currentHash === 'shorts' ? 'active' : ''}" onclick="window.navigateTo('shorts'); return false;">
              <span>⚡</span>
              <span>Shorts</span>
            </a>
            <a href="#tracker" class="nav-pill-item ${currentHash === 'tracker' ? 'active' : ''}" onclick="window.navigateTo('tracker'); return false;">
              <span>📈</span>
              <span>Tracker</span>
            </a>
            <a href="#users" class="nav-pill-item ${currentHash === 'users' ? 'active' : ''}" onclick="window.navigateTo('users'); return false;">
              <span>👥</span>
              <span>Users</span>
              ${currentUser.role === 'admin' ? '<span class="pill-count" style="background: rgba(245, 158, 11, 0.2); color: #f59e0b;">Admin</span>' : ''}
            </a>
            <a href="#settings" class="nav-pill-item ${currentHash === 'settings' ? 'active' : ''}" onclick="window.navigateTo('settings'); return false;">
              <span>⚙️</span>
              <span>Settings</span>
            </a>
          </nav>
        ` : ''}

        <!-- Right: Action Buttons, GitHub, Theme, User Pill, Sign Out -->
        <div class="nav-actions">
          ${currentUser ? `
            <!-- Deploy New Content CTA (matches green pill button in screenshot) -->
            <button class="btn-cyber btn-cyber-primary btn-sm" id="navDeployContentBtn" onclick="window.navigateTo('wizard', 'short')" style="display: flex; align-items: center; gap: 6px; font-weight: 700;">
              <span>✨</span>
              <span>Deploy Content</span>
            </button>
          ` : ''}

          <!-- GitHub Repo Link (Always visible before and after login) -->
          <a 
            href="https://github.com/meibraransari/youtube-channel-manager" 
            target="_blank" 
            rel="noopener noreferrer" 
            class="github-link-btn"
            title="Official GitHub Repository"
          >
            <svg height="15" width="15" viewBox="0 0 16 16" fill="currentColor">
              <path d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82.64-.18 1.32-.27 2-.27.68 0 1.36.09 2 .27 1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.013 8.013 0 0016 8c0-4.42-3.58-8-8-8z"></path>
            </svg>
            <span>GitHub ↗</span>
          </a>

          <!-- Light/Dark Theme Switcher on Top Right -->
          <button class="theme-switch-btn" id="themeSwitchBtn" title="Switch Light/Dark Theme">
            <span id="themeIcon">${(document.documentElement.getAttribute('data-theme') || 'dark') === 'dark' ? '☀️' : '🌙'}</span>
          </button>

          <!-- Direct Sign Out Button (Always visible on header when authenticated) -->
          ${currentUser ? `
            <button class="btn-cyber btn-cyber-outline btn-sm signout-trigger-btn" id="navDirectSignoutBtn" title="Sign Out of Studio Console" style="color: #ef4444; border-color: rgba(239, 68, 68, 0.4); padding: 5px 12px; display: flex; align-items: center; gap: 6px; font-weight: 700; cursor: pointer;">
              <span>🚪</span>
              <span>Sign Out</span>
            </button>
          ` : ''}

          <!-- User Profile Dropdown (If authenticated) -->
          ${currentUser ? `
            <div style="position: relative;">
              <div class="user-profile-pill" id="userPillBtn">
                <div class="user-avatar">${currentUser.username.substring(0, 2).toUpperCase()}</div>
                <div style="font-size: 12px; font-weight: 700;">${currentUser.username}</div>
                <span class="badge ${currentUser.role === 'admin' ? 'badge-amber' : 'badge-violet'}" style="font-size: 9px; padding: 1px 6px;">
                  ${currentUser.role}
                </span>
                <span style="font-size: 10px;">▼</span>
              </div>

              <!-- Dropdown Menu -->
              <div id="userDropdownMenu" style="position: absolute; top: 45px; right: 0; min-width: 190px; background: var(--bg-card); border: 1px solid var(--border-color); border-radius: var(--radius-sm); box-shadow: var(--card-shadow); display: none; flex-direction: column; padding: 6px 0; z-index: 1200;">
                <div style="padding: 8px 16px; border-bottom: 1px solid var(--border-subtle); font-size: 11px; color: var(--text-dim);">
                  Signed in as <strong>${currentUser.email}</strong>
                </div>
                <button type="button" class="sidebar-link" style="border-radius: 0; padding: 8px 16px; width: 100%; border: none; background: transparent; text-align: left; cursor: pointer;" onclick="document.getElementById('userDropdownMenu').style.display='none'; window.navigateTo('channels');">
                  📺 Channel Manager
                </button>
                <button type="button" class="sidebar-link" style="border-radius: 0; padding: 8px 16px; width: 100%; border: none; background: transparent; text-align: left; cursor: pointer;" onclick="document.getElementById('userDropdownMenu').style.display='none'; window.navigateTo('tracker');">
                  📈 Channel Tracker
                </button>
                <button type="button" class="sidebar-link" style="border-radius: 0; padding: 8px 16px; width: 100%; border: none; background: transparent; text-align: left; cursor: pointer;" onclick="document.getElementById('userDropdownMenu').style.display='none'; window.navigateTo('settings');">
                  ⚙️ System Settings
                </button>
                <button type="button" class="sidebar-link" style="border-radius: 0; padding: 8px 16px; width: 100%; border: none; background: transparent; text-align: left; cursor: pointer;" onclick="document.getElementById('userDropdownMenu').style.display='none'; window.navigateTo('users');">
                  👥 Users & Permissions
                </button>
                <div style="border-top: 1px solid var(--border-subtle); margin-top: 4px;"></div>
                <button type="button" class="sidebar-link signout-trigger-btn" id="navDropdownSignoutBtn" style="border-radius: 0; padding: 10px 16px; color: #ef4444; width: 100%; border: none; background: transparent; text-align: left; cursor: pointer; display: flex; align-items: center; gap: 8px; font-weight: 700;">
                  <span>🚪</span>
                  <span>Sign Out</span>
                </button>
              </div>
            </div>
          ` : ''}
        </div>
      </header>

      <!-- Channel Creation Modal (Global) -->
      <div id="quickAddChannelModal" class="modal-overlay">
        <div class="modal-dialog" style="max-width: 480px;">
          <div class="modal-header">
            <div class="modal-title">📺 PROVISION NEW YOUTUBE CHANNEL</div>
            <button class="modal-close-btn" id="closeAddChannelModalX" data-close-modal="true">✕</button>
          </div>
          <form id="quickAddChannelForm">
            <div class="modal-body" style="display: flex; flex-direction: column; gap: 14px;">
              <div>
                <label style="font-size: 11px; font-weight: 700; color: var(--text-dim); text-transform: uppercase;">Channel Name *</label>
                <input type="text" id="newChannelName" class="cyber-input" placeholder="e.g. Cloud Native Daily" required style="margin-top: 4px;" />
              </div>
              <div>
                <label style="font-size: 11px; font-weight: 700; color: var(--text-dim); text-transform: uppercase;">Channel Handle</label>
                <input type="text" id="newChannelHandle" class="cyber-input" placeholder="e.g. @CloudNativeDaily" style="margin-top: 4px;" />
              </div>
              <div>
                <label style="font-size: 11px; font-weight: 700; color: var(--text-dim); text-transform: uppercase;">Channel URL</label>
                <input type="url" id="newChannelUrl" class="cyber-input" placeholder="https://www.youtube.com/@CloudNativeDaily" style="margin-top: 4px;" />
              </div>
              <div>
                <label style="font-size: 11px; font-weight: 700; color: var(--text-dim); text-transform: uppercase;">Creator / Lead Name</label>
                <input type="text" id="newChannelAuthor" class="cyber-input" placeholder="e.g. Ibrar Ansari" style="margin-top: 4px;" />
              </div>
              <div>
                <label style="font-size: 11px; font-weight: 700; color: var(--text-dim); text-transform: uppercase;">Current Subscriber Baseline</label>
                <input type="number" id="newChannelSubs" class="cyber-input" placeholder="0" min="0" value="0" style="margin-top: 4px;" />
              </div>
            </div>
            <div class="modal-footer">
              <button type="button" class="btn-cyber btn-cyber-outline" id="cancelAddChannelModalBtn" data-close-modal="true">ABORT</button>
              <button type="submit" class="btn-cyber btn-cyber-primary" id="submitAddChannelBtn">🚀 CREATE CHANNEL</button>
            </div>
          </form>
        </div>
      </div>
    `;

    // Event Bindings
    const themeBtn = document.getElementById('themeSwitchBtn');
    if (themeBtn) themeBtn.onclick = () => window.toggleTheme();

    const toggleBtn = document.getElementById('sidebarToggleBtn');
    if (toggleBtn) toggleBtn.onclick = () => window.toggleSidebar();

    const userPill = document.getElementById('userPillBtn');
    const userMenu = document.getElementById('userDropdownMenu');
    if (userPill && userMenu) {
      userPill.onclick = (e) => {
        e.stopPropagation();
        userMenu.style.display = userMenu.style.display === 'flex' ? 'none' : 'flex';
      };
      document.addEventListener('click', () => {
        if (userMenu) userMenu.style.display = 'none';
      });
    }

    const directSignout = document.getElementById('navDirectSignoutBtn');
    if (directSignout) directSignout.onclick = () => window.logout();

    const dropdownSignout = document.getElementById('navDropdownSignoutBtn');
    if (dropdownSignout) dropdownSignout.onclick = () => window.logout();

    // Channel Selector Change Handler
    const chSelect = document.getElementById('navbarChannelSelect');
    if (chSelect) {
      chSelect.onchange = (e) => {
        const selectedId = e.target.value;
        if (selectedId === '__manage_channels__') {
          window.navigateTo('channels');
          return;
        }
        API.setActiveChannelId(selectedId);
        Toast.show(`Active channel updated: ${chSelect.options[chSelect.selectedIndex].text}`, 'info', 1800);
      };
    }

    // Direct Event Listener for Deploy Content button
    const navDeployBtn = document.getElementById('navDeployContentBtn');
    if (navDeployBtn) {
      navDeployBtn.onclick = (e) => {
        e.preventDefault();
        window.navigateTo('wizard', 'short');
      };
    }

    // Modal Handlers for Add Channel
    const addChBtn = document.getElementById('navAddChannelBtn');
    const chModal = document.getElementById('quickAddChannelModal');
    const closeX = document.getElementById('closeAddChannelModalX');
    const cancelBtn = document.getElementById('cancelAddChannelModalBtn');
    const form = document.getElementById('quickAddChannelForm');

    if (addChBtn && chModal) {
      addChBtn.onclick = () => window.openModal(chModal);
      if (closeX) closeX.onclick = () => window.closeModal(chModal);
      if (cancelBtn) cancelBtn.onclick = () => window.closeModal(chModal);

      if (form) {
        form.onsubmit = async (e) => {
          e.preventDefault();
          const submitBtn = document.getElementById('submitAddChannelBtn');
          submitBtn.disabled = true;
          submitBtn.textContent = 'PROVISIONING...';

          try {
            const payload = {
              name: document.getElementById('newChannelName').value.trim(),
              handle: document.getElementById('newChannelHandle').value.trim(),
              channel_url: document.getElementById('newChannelUrl').value.trim(),
              author_name: document.getElementById('newChannelAuthor').value.trim(),
              subscriber_count: parseInt(document.getElementById('newChannelSubs').value, 10) || 0
            };

            const res = await API.channels.create(payload);
            Toast.show(`Channel "${res.channel.name}" created successfully!`, 'success');
            window.closeModal(chModal);
            API.setActiveChannelId(res.channel.id);
            NavbarComponent.render(container, currentUser);
          } catch (err) {
            Toast.show(`Failed to create channel: ${err.message}`, 'error');
            submitBtn.disabled = false;
            submitBtn.textContent = '🚀 CREATE CHANNEL';
          }
        };
      }
    }
  }
};

window.NavbarComponent = NavbarComponent;
