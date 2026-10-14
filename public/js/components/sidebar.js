/**
 * Collapsible Executive Sidebar Component
 */
const SidebarComponent = {
  render(container, currentView = 'dashboard') {
    container.innerHTML = `
      <aside class="sidebar" id="appSidebar">
        <div class="sidebar-nav">
          <!-- Overview Section -->
          <div class="sidebar-section-title">CHANNELS & TELEMETRY</div>

          <a href="#dashboard" class="sidebar-link ${currentView === 'dashboard' ? 'active' : ''}" onclick="window.navigateTo('dashboard'); return false;">
            <i>🛸</i>
            <span class="sidebar-text">Studio Dashboard</span>
          </a>

          <a href="#channels" class="sidebar-link ${currentView === 'channels' ? 'active' : ''}" onclick="window.navigateTo('channels'); return false;">
            <i>📺</i>
            <span class="sidebar-text">Channel Manager</span>
          </a>

          <a href="#tracker" class="sidebar-link ${currentView === 'tracker' ? 'active' : ''}" onclick="window.navigateTo('tracker'); return false;">
            <i>📈</i>
            <span class="sidebar-text">Channel Tracker</span>
            <span class="sidebar-badge badge badge-emerald" style="margin-left: auto; font-size: 9px; padding: 1px 6px;">LIVE</span>
          </a>

          <a href="#subscriptions" class="sidebar-link ${currentView === 'subscriptions' ? 'active' : ''}" onclick="window.navigateTo('subscriptions'); return false;" title="Subscribed Channels & Feeds">
            <i>🔔</i>
            <span class="sidebar-text">Subscribed Channels</span>
            <span class="sidebar-badge badge badge-teal" style="margin-left: auto; font-size: 9px; padding: 1px 6px;">SUBS</span>
          </a>

          <!-- Content Studio Section -->
          <div class="sidebar-section-title">CONTENT STUDIO</div>

          <a href="#content" class="sidebar-link ${currentView === 'content' ? 'active' : ''}" onclick="window.navigateTo('content'); return false;">
            <i>🎬</i>
            <span class="sidebar-text">Content Catalog</span>
          </a>

          <a href="#shorts" class="sidebar-link ${currentView === 'shorts' ? 'active' : ''}" onclick="window.navigateTo('shorts'); return false;">
            <i>⚡</i>
            <span class="sidebar-text">Reels & Shorts</span>
            <span class="sidebar-badge badge badge-violet" style="margin-left: auto; font-size: 9px; padding: 1px 6px;">9:16</span>
          </a>

          <a href="#videos" class="sidebar-link ${currentView === 'videos' ? 'active' : ''}" onclick="window.navigateTo('videos'); return false;">
            <i>📹</i>
            <span class="sidebar-text">Long-Form Videos</span>
            <span class="sidebar-badge badge badge-cyan" style="margin-left: auto; font-size: 9px; padding: 1px 6px;">16:9</span>
          </a>

          <a href="#podcasts" class="sidebar-link ${currentView === 'podcasts' ? 'active' : ''}" onclick="window.navigateTo('podcasts'); return false;">
            <i>🎙️</i>
            <span class="sidebar-text">Podcasts Studio</span>
          </a>

          <a href="#wizard" class="sidebar-link ${currentView === 'wizard' ? 'active' : ''}" onclick="window.navigateTo('wizard'); return false;">
            <i>🧙</i>
            <span class="sidebar-text">Creator Wizard</span>
            <span class="sidebar-badge badge badge-emerald" style="margin-left: auto; font-size: 9px; padding: 1px 6px;">NEW</span>
          </a>

          <a href="javascript:void(0)" class="sidebar-link" id="sidebarManageTagsLink" onclick="window.openTagManager(); return false;" title="Open Tag Manager & Preset Registry">
            <i>🏷️</i>
            <span class="sidebar-text">Manage Tags</span>
            <span class="sidebar-badge badge badge-teal" style="margin-left: auto; font-size: 9px; padding: 1px 6px;">PRESETS</span>
          </a>

          <!-- Automation & Orchestration Section -->
          <div class="sidebar-section-title">AUTOMATION & ORCHESTRATION</div>

          <a href="#n8n" class="sidebar-link ${currentView === 'n8n' ? 'active' : ''}" onclick="window.navigateTo('n8n'); return false;" title="n8n Automated Workflow Engine & Webhooks">
            <i>⚡</i>
            <span class="sidebar-text">n8n Workflows</span>
            <span class="sidebar-badge badge badge-indigo" style="margin-left: auto; font-size: 9px; padding: 1px 6px;">AUTO</span>
          </a>

          <!-- Operations & Data Section -->
          <div class="sidebar-section-title">OPERATIONS & DATA</div>

          <a href="#users" class="sidebar-link ${currentView === 'users' ? 'active' : ''}" onclick="window.navigateTo('users'); return false;">
            <i>👥</i>
            <span class="sidebar-text">Users & RBAC</span>
          </a>

          <a href="#audit" class="sidebar-link ${currentView === 'audit' ? 'active' : ''}" onclick="window.navigateTo('audit'); return false;">
            <i>📜</i>
            <span class="sidebar-text">Audit Trail & Logins</span>
          </a>

          <a href="#settings" class="sidebar-link ${currentView === 'settings' ? 'active' : ''}" onclick="window.navigateTo('settings'); return false;">
            <i>⚙️</i>
            <span class="sidebar-text">System Settings</span>
          </a>

          <!-- Diagnostics & API -->
          <div class="sidebar-section-title">DIAGNOSTICS & SPECS</div>

          <a href="/api/docs" target="_blank" rel="noopener" class="sidebar-link">
            <i>📖</i>
            <span class="sidebar-text">Swagger API Docs</span>
            <span class="sidebar-badge" style="margin-left: auto; font-size: 10px;">↗</span>
          </a>

          <a href="#health" class="sidebar-link ${currentView === 'health' ? 'active' : ''}" onclick="window.navigateTo('health'); return false;">
            <i>🩺</i>
            <span class="sidebar-text">Live Server Health</span>
          </a>
        </div>

        <!-- Sidebar Footer Status -->
        <div style="padding: 14px; border-top: 1px solid var(--border-color); background: rgba(0,0,0,0.1);">
          <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 8px;">
            <div class="sidebar-text" style="font-size: 11px; color: var(--text-dim); font-family: var(--font-mono);">
              PG18 • v2.0
            </div>
            <button class="sidebar-toggle-btn" onclick="window.toggleSidebar()" title="Collapse / Expand Sidebar">
              <span style="font-size: 13px;">↔</span>
            </button>
          </div>
          <button type="button" class="btn-cyber btn-cyber-outline btn-sm sidebar-text signout-trigger-btn" id="sidebarSignoutBtn" onclick="window.logout()" style="width: 100%; color: #ef4444; border-color: rgba(239, 68, 68, 0.3); justify-content: center; padding: 6px; display: flex; align-items: center; gap: 6px; cursor: pointer;">
            🚪 Sign Out
          </button>
        </div>
      </aside>
    `;
  }
};

window.SidebarComponent = SidebarComponent;
