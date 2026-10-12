/**
 * YouTube Channel Manager Component
 * Comprehensive CRUD operations: Add, Edit, Delete, View, Set Default & Rapid YouTube Ingest
 */
const ChannelsComponent = {
  channels: [],
  channelsMap: new Map(),

  async render(container) {
    container.innerHTML = `
      <div style="display: flex; align-items: center; justify-content: center; height: 320px;">
        <div style="font-family: var(--font-tech); color: var(--accent-teal); font-size: 16px;">
          LOADING CHANNEL DIRECTORY...
        </div>
      </div>
    `;

    try {
      await this.loadChannels();
      this.renderView(container);
    } catch (err) {
      container.innerHTML = `
        <div class="glass-card" style="padding: 30px; text-align: center; color: #ef4444;">
          <h3>Failed to Load Channels</h3>
          <p style="margin-top: 8px;">${err.message}</p>
        </div>
      `;
    }
  },

  async loadChannels() {
    const res = await API.channels.list();
    this.channels = res.channels || [];
    this.channelsMap.clear();
    this.channels.forEach(c => this.channelsMap.set(c.id, c));
  },

  renderView(container) {
    const totalSubs = this.channels.reduce((sum, c) => sum + (parseInt(c.subscriber_count, 10) || 0), 0);
    const totalVideos = this.channels.reduce((sum, c) => sum + (parseInt(c.real_content_count, 10) || parseInt(c.video_count, 10) || 0), 0);
    const totalViews = this.channels.reduce((sum, c) => sum + (parseInt(c.real_views_count, 10) || parseInt(c.total_views, 10) || 0), 0);

    container.innerHTML = `
      <div style="max-width: 1200px; margin: 0 auto;">
        <!-- Header Toolbar -->
        <div class="dashboard-header-card">
          <div>
            <div style="display: flex; align-items: center; gap: 10px; flex-wrap: wrap;">
              <h1 style="font-size: 22px; font-weight: 800; letter-spacing: -0.3px; color: var(--text-main);">
                📺 YOUTUBE CHANNEL MANAGER
              </h1>
              <span class="badge badge-teal">${this.channels.length} Channels Managed</span>
              <span class="badge badge-emerald">PostgreSQL 18 Engine</span>
            </div>
            <p style="color: var(--text-muted); font-size: 13px; margin-top: 4px;">
              Provision, configure, synchronize, and monitor multiple YouTube channel profiles and catalog streams.
            </p>
          </div>

          <div style="display: flex; align-items: center; gap: 10px; flex-wrap: wrap;">
            <button class="btn-cyber btn-cyber-primary" id="addChannelBtn" style="display: flex; align-items: center; gap: 6px;">
              <span>➕</span>
              <span>Provision Channel</span>
            </button>
            <button class="btn-cyber btn-cyber-secondary" id="ingestChannelBtn" style="display: flex; align-items: center; gap: 6px;">
              <span>🚀</span>
              <span>Rapid Ingest</span>
            </button>
            <button class="btn-cyber btn-cyber-outline" id="syncAllChannelsBtn" style="display: flex; align-items: center; gap: 6px;">
              <span>🔄</span>
              <span>Sync All</span>
            </button>
          </div>
        </div>

        <!-- 4 Metric Cards -->
        <div class="stats-grid">
          <div class="stat-card">
            <div class="stat-card-header">
              <span class="stat-label">MANAGED CHANNELS</span>
              <div class="stat-icon-circle stat-icon-blue">
                <span>📺</span>
              </div>
            </div>
            <div class="stat-value" style="color: var(--accent-cyan);">${this.channels.length}</div>
            <div class="stat-subtext">Active channel hubs</div>
          </div>

          <div class="stat-card">
            <div class="stat-card-header">
              <span class="stat-label">TOTAL SUBSCRIBERS</span>
              <div class="stat-icon-circle stat-icon-green">
                <span>👥</span>
              </div>
            </div>
            <div class="stat-value" style="color: var(--accent-emerald);">${totalSubs.toLocaleString()}</div>
            <div class="stat-subtext">Consolidated audience</div>
          </div>

          <div class="stat-card">
            <div class="stat-card-header">
              <span class="stat-label">CATALOG ASSETS</span>
              <div class="stat-icon-circle stat-icon-purple">
                <span>🎬</span>
              </div>
            </div>
            <div class="stat-value" style="color: var(--accent-violet);">${totalVideos.toLocaleString()}</div>
            <div class="stat-subtext">Videos, Shorts & Podcasts</div>
          </div>

          <div class="stat-card">
            <div class="stat-card-header">
              <span class="stat-label">AGGREGATE VIEWS</span>
              <div class="stat-icon-circle stat-icon-amber">
                <span>👁️</span>
              </div>
            </div>
            <div class="stat-value" style="color: var(--accent-amber);">${totalViews.toLocaleString()}</div>
            <div class="stat-subtext">Recorded telemetry</div>
          </div>
        </div>

        <!-- Channels Grid / Table Card -->
        <div class="glass-card" style="padding: 0; overflow: hidden; margin-bottom: 24px;">
          <div style="padding: 18px 20px; border-bottom: 1px solid var(--border-color); display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 10px;">
            <h2 style="font-size: 16px; font-weight: 700; color: var(--text-main);">
              Connected Channel Registry
            </h2>
            <div style="font-size: 12px; color: var(--text-dim);">
              Click any channel to view telemetry, edit branding, or trigger synchronization
            </div>
          </div>

          <div class="table-responsive">
            <table class="cyber-table">
              <thead>
                <tr>
                  <th>CHANNEL PROFILE</th>
                  <th>HANDLE</th>
                  <th>CREATOR / LEAD</th>
                  <th>SUBSCRIBERS</th>
                  <th>ASSETS</th>
                  <th>TOTAL VIEWS</th>
                  <th>STATUS</th>
                  <th style="text-align: right;">ACTIONS</th>
                </tr>
              </thead>
              <tbody id="channelsTableBody">
                ${this.channels.length === 0 ? `
                  <tr>
                    <td colspan="8" style="text-align: center; padding: 48px 20px; color: var(--text-dim);">
                      <div style="font-size: 40px; margin-bottom: 10px;">📺</div>
                      <div style="font-size: 16px; font-weight: 700; color: var(--text-main);">No Channels Registered</div>
                      <div style="font-size: 12px; margin-top: 4px; margin-bottom: 18px; color: var(--text-muted);">
                        All channel profiles have been permanently flushed. Provision a channel to start managing content.
                      </div>
                      <button class="btn-cyber btn-cyber-primary btn-sm" onclick="document.getElementById('addChannelBtn').click()">
                        ➕ Provision Channel
                      </button>
                    </td>
                  </tr>
                ` : this.channels.map(c => `
                  <tr>
                    <!-- Profile -->
                    <td>
                      <div style="display: flex; align-items: center; gap: 12px;">
                        <div style="width: 38px; height: 38px; border-radius: var(--radius-sm); overflow: hidden; display: flex; align-items: center; justify-content: center; flex-shrink: 0; background: linear-gradient(135deg, var(--accent-teal), var(--accent-indigo));">
                          ${c.avatar_url ? `
                            <img src="${this.escapeHtml(c.avatar_url)}" alt="${this.escapeHtml(c.name)}" style="width: 100%; height: 100%; object-fit: cover;" onerror="this.style.display='none'" />
                          ` : `
                            <span style="font-weight: 800; font-size: 15px; color: #fff;">${(c.name || 'YT').substring(0, 2).toUpperCase()}</span>
                          `}
                        </div>
                        <div>
                          <div style="font-weight: 700; font-size: 13px; color: var(--text-main);">
                            ${this.escapeHtml(c.name)}
                          </div>
                          <div style="font-size: 11px; margin-top: 2px;">
                            ${c.channel_url ? `
                              <a href="${this.escapeHtml(c.channel_url)}" target="_blank" rel="noopener" style="color: var(--accent-teal); text-decoration: none;">
                                YouTube ↗
                              </a>
                            ` : '<span style="color: var(--text-dim);">No URL set</span>'}
                          </div>
                        </div>
                      </div>
                    </td>

                    <!-- Handle -->
                    <td>
                      <span class="badge badge-teal" style="font-family: var(--font-mono); font-size: 11px;">
                        ${this.escapeHtml(c.handle || '@channel')}
                      </span>
                    </td>

                    <!-- Lead / Author -->
                    <td style="font-size: 12px; color: var(--text-muted);">
                      ${this.escapeHtml(c.author_name || 'Studio')}
                    </td>

                    <!-- Subscribers -->
                    <td>
                      <div style="font-weight: 700; font-size: 13px; color: var(--accent-emerald);">
                        ${(parseInt(c.subscriber_count, 10) || 0).toLocaleString()}
                      </div>
                    </td>

                    <!-- Assets -->
                    <td>
                      <span class="badge badge-violet" style="font-size: 11px;">
                        ${(c.real_content_count || c.video_count || 0).toLocaleString()} items
                      </span>
                    </td>

                    <!-- Total Views -->
                    <td style="font-family: var(--font-mono); font-size: 12px; color: var(--accent-cyan);">
                      ${(parseInt(c.real_views_count, 10) || parseInt(c.total_views, 10) || 0).toLocaleString()}
                    </td>

                    <!-- Default Status -->
                    <td>
                      ${c.is_default ? `
                        <span class="badge badge-emerald" style="font-weight: 700;">⭐ DEFAULT</span>
                      ` : `
                        <button class="btn-cyber btn-cyber-outline btn-sm" data-action="set-default" data-id="${c.id}" style="font-size: 10px; padding: 2px 6px;">
                          Make Default
                        </button>
                      `}
                    </td>

                    <!-- Action Buttons -->
                    <td style="text-align: right;">
                      <div style="display: inline-flex; gap: 4px;">
                        <button class="btn-cyber btn-cyber-outline btn-sm" data-action="view-channel" data-id="${c.id}" title="View Channel Details">
                          👁️ View
                        </button>
                        <button class="btn-cyber btn-cyber-outline btn-sm" data-action="edit-channel" data-id="${c.id}" title="Edit Channel">
                          ✏️ Edit
                        </button>
                        <button class="btn-cyber btn-cyber-secondary btn-sm" data-action="sync-channel" data-id="${c.id}" title="Sync Metrics Now">
                          🔄 Sync
                        </button>
                        <button class="btn-cyber btn-cyber-danger btn-sm" data-action="delete-channel" data-id="${c.id}" title="Delete Channel">
                          🗑️
                        </button>
                      </div>
                    </td>
                  </tr>
                `).join('')}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    `;

    // Bind Action Buttons
    document.getElementById('addChannelBtn').onclick = () => this.openAddModal();
    document.getElementById('ingestChannelBtn').onclick = () => this.openIngestModal();
    document.getElementById('syncAllChannelsBtn').onclick = () => this.syncAll();

    // Table delegated action listener
    const tableBody = document.getElementById('channelsTableBody');
    tableBody.onclick = (e) => {
      const btn = e.target.closest('[data-action]');
      if (!btn) return;
      const action = btn.getAttribute('data-action');
      const id = btn.getAttribute('data-id');

      if (action === 'view-channel') this.openViewModal(id);
      else if (action === 'edit-channel') this.openEditModal(id);
      else if (action === 'sync-channel') this.syncChannel(id);
      else if (action === 'set-default') this.setDefaultChannel(id);
      else if (action === 'delete-channel') this.deleteChannel(id);
    };
  },

  // 1. Open Add Channel Modal
  openAddModal() {
    let modal = document.getElementById('channelAddModal');
    if (!modal) {
      modal = document.createElement('div');
      modal.id = 'channelAddModal';
      modal.className = 'modal-overlay';
      document.body.appendChild(modal);
    }

    modal.innerHTML = `
      <div class="modal-dialog" style="max-width: 520px;">
        <div class="modal-header">
          <div class="modal-title">📺 PROVISION NEW YOUTUBE CHANNEL</div>
          <button class="modal-close-btn" data-close-modal>✕</button>
        </div>
        <form id="addChannelFormModal">
          <div class="modal-body" style="display: flex; flex-direction: column; gap: 14px;">
            <div>
              <label style="font-size: 11px; font-weight: 700; color: var(--text-dim); text-transform: uppercase;">Channel Name *</label>
              <input type="text" id="addChName" class="cyber-input" placeholder="e.g. Kubernetes Weekly" required style="margin-top: 4px;" />
            </div>
            <div>
              <label style="font-size: 11px; font-weight: 700; color: var(--text-dim); text-transform: uppercase;">Channel Handle</label>
              <input type="text" id="addChHandle" class="cyber-input" placeholder="e.g. @KubernetesWeekly" style="margin-top: 4px;" />
            </div>
            <div>
              <label style="font-size: 11px; font-weight: 700; color: var(--text-dim); text-transform: uppercase;">YouTube Channel URL</label>
              <input type="url" id="addChUrl" class="cyber-input" placeholder="https://www.youtube.com/@KubernetesWeekly" style="margin-top: 4px;" />
            </div>
            <div>
              <label style="font-size: 11px; font-weight: 700; color: var(--text-dim); text-transform: uppercase;">Creator / Lead Name</label>
              <input type="text" id="addChAuthor" class="cyber-input" placeholder="e.g. Cloud Lead" style="margin-top: 4px;" />
            </div>
            <div>
              <label style="font-size: 11px; font-weight: 700; color: var(--text-dim); text-transform: uppercase;">Initial Subscriber Baseline</label>
              <input type="number" id="addChSubs" class="cyber-input" value="0" min="0" style="margin-top: 4px;" />
            </div>
            <div>
              <label style="font-size: 11px; font-weight: 700; color: var(--text-dim); text-transform: uppercase;">Description / Notes</label>
              <textarea id="addChDesc" class="cyber-input" rows="3" placeholder="Channel mission, target audience, release goals..." style="margin-top: 4px; resize: vertical;"></textarea>
            </div>
          </div>
          <div class="modal-footer">
            <button type="button" class="btn-cyber btn-cyber-outline" data-close-modal>Cancel</button>
            <button type="submit" class="btn-cyber btn-cyber-primary" id="addChSubmitBtn">🚀 PROVISION CHANNEL</button>
          </div>
        </form>
      </div>
    `;

    window.openModal(modal);

    document.getElementById('addChannelFormModal').onsubmit = async (e) => {
      e.preventDefault();
      const btn = document.getElementById('addChSubmitBtn');
      btn.disabled = true;
      btn.textContent = 'PROVISIONING...';

      try {
        const payload = {
          name: document.getElementById('addChName').value.trim(),
          handle: document.getElementById('addChHandle').value.trim(),
          channel_url: document.getElementById('addChUrl').value.trim(),
          author_name: document.getElementById('addChAuthor').value.trim(),
          subscriber_count: parseInt(document.getElementById('addChSubs').value, 10) || 0,
          description: document.getElementById('addChDesc').value.trim()
        };

        const res = await API.channels.create(payload);
        Toast.show(`Channel "${res.channel.name}" created successfully!`, 'success');
        window.closeModal(modal);
        API.setActiveChannelId(res.channel.id);
        NavbarComponent.render(document.getElementById('navbarContainer'), App.currentUser);
        this.render(document.getElementById('mainContentArea'));
      } catch (err) {
        Toast.show(`Creation failed: ${err.message}`, 'error');
        btn.disabled = false;
        btn.textContent = '🚀 PROVISION CHANNEL';
      }
    };
  },

  // 2. Open Edit Channel Modal
  openEditModal(channelId) {
    const channel = this.channelsMap.get(channelId);
    if (!channel) return;

    let modal = document.getElementById('channelEditModal');
    if (!modal) {
      modal = document.createElement('div');
      modal.id = 'channelEditModal';
      modal.className = 'modal-overlay';
      document.body.appendChild(modal);
    }

    modal.innerHTML = `
      <div class="modal-dialog" style="max-width: 520px;">
        <div class="modal-header">
          <div class="modal-title">✏️ EDIT CHANNEL: ${this.escapeHtml(channel.name)}</div>
          <button class="modal-close-btn" data-close-modal>✕</button>
        </div>
        <form id="editChannelFormModal">
          <div class="modal-body" style="display: flex; flex-direction: column; gap: 14px;">
            <div>
              <label style="font-size: 11px; font-weight: 700; color: var(--text-dim); text-transform: uppercase;">Channel Name *</label>
              <input type="text" id="editChName" class="cyber-input" value="${this.escapeHtml(channel.name)}" required style="margin-top: 4px;" />
            </div>
            <div>
              <label style="font-size: 11px; font-weight: 700; color: var(--text-dim); text-transform: uppercase;">Channel Handle</label>
              <input type="text" id="editChHandle" class="cyber-input" value="${this.escapeHtml(channel.handle || '')}" style="margin-top: 4px;" />
            </div>
            <div>
              <label style="font-size: 11px; font-weight: 700; color: var(--text-dim); text-transform: uppercase;">YouTube Channel URL</label>
              <input type="url" id="editChUrl" class="cyber-input" value="${this.escapeHtml(channel.channel_url || '')}" style="margin-top: 4px;" />
            </div>
            <div>
              <label style="font-size: 11px; font-weight: 700; color: var(--text-dim); text-transform: uppercase;">Creator / Lead Name</label>
              <input type="text" id="editChAuthor" class="cyber-input" value="${this.escapeHtml(channel.author_name || '')}" style="margin-top: 4px;" />
            </div>
            <div>
              <label style="font-size: 11px; font-weight: 700; color: var(--text-dim); text-transform: uppercase;">Subscriber Count</label>
              <input type="number" id="editChSubs" class="cyber-input" value="${channel.subscriber_count || 0}" min="0" style="margin-top: 4px;" />
            </div>
            <div>
              <label style="font-size: 11px; font-weight: 700; color: var(--text-dim); text-transform: uppercase;">Description / Notes</label>
              <textarea id="editChDesc" class="cyber-input" rows="3" style="margin-top: 4px; resize: vertical;">${this.escapeHtml(channel.description || '')}</textarea>
            </div>
          </div>
          <div class="modal-footer">
            <button type="button" class="btn-cyber btn-cyber-outline" data-close-modal>Cancel</button>
            <button type="submit" class="btn-cyber btn-cyber-primary" id="editChSubmitBtn">Save Changes</button>
          </div>
        </form>
      </div>
    `;

    window.openModal(modal);

    document.getElementById('editChannelFormModal').onsubmit = async (e) => {
      e.preventDefault();
      const btn = document.getElementById('editChSubmitBtn');
      btn.disabled = true;
      btn.textContent = 'SAVING...';

      try {
        const payload = {
          name: document.getElementById('editChName').value.trim(),
          handle: document.getElementById('editChHandle').value.trim(),
          channel_url: document.getElementById('editChUrl').value.trim(),
          author_name: document.getElementById('editChAuthor').value.trim(),
          subscriber_count: parseInt(document.getElementById('editChSubs').value, 10) || 0,
          description: document.getElementById('editChDesc').value.trim()
        };

        const res = await API.channels.update(channelId, payload);
        Toast.show(`Channel "${res.channel.name}" updated successfully!`, 'success');
        window.closeModal(modal);
        NavbarComponent.render(document.getElementById('navbarContainer'), App.currentUser);
        this.render(document.getElementById('mainContentArea'));
      } catch (err) {
        Toast.show(`Update failed: ${err.message}`, 'error');
        btn.disabled = false;
        btn.textContent = 'Save Changes';
      }
    };
  },

  // 3. Open View Channel Modal
  async openViewModal(channelId) {
    try {
      const channel = this.channelsMap.get(channelId);
      if (!channel) return;

      const snapRes = await API.channels.getSnapshots(channelId, 10);
      const topVideos = snapRes.topVideos || [];

      let modal = document.getElementById('channelViewModal');
      if (!modal) {
        modal = document.createElement('div');
        modal.id = 'channelViewModal';
        modal.className = 'modal-overlay';
        document.body.appendChild(modal);
      }

      modal.innerHTML = `
        <div class="modal-dialog" style="max-width: 640px;">
          <div class="modal-header">
            <div style="display: flex; align-items: center; gap: 10px;">
              <span class="badge ${channel.is_default ? 'badge-emerald' : 'badge-teal'}">
                ${channel.is_default ? '⭐ DEFAULT CHANNEL' : 'CHANNEL'}
              </span>
              <span class="badge badge-cyan">${this.escapeHtml(channel.handle || '@channel')}</span>
            </div>
            <button class="modal-close-btn" data-close-modal>✕</button>
          </div>
          <div class="modal-body" style="display: flex; flex-direction: column; gap: 16px;">
            <div>
              <h2 style="font-size: 20px; font-weight: 800; color: var(--text-main); margin-bottom: 4px;">
                ${this.escapeHtml(channel.name)}
              </h2>
              <div style="font-size: 12px; color: var(--text-muted);">
                Lead / Creator: <strong style="color: var(--accent-teal);">${this.escapeHtml(channel.author_name || 'Studio')}</strong>
              </div>
            </div>

            <!-- Metrics Summary Cards -->
            <div style="display: grid; grid-template-columns: repeat(3, 1fr); gap: 10px;">
              <div style="background: rgba(0,0,0,0.2); padding: 12px; border-radius: var(--radius-sm); text-align: center;">
                <div style="font-size: 10px; font-weight: 700; color: var(--text-dim);">SUBSCRIBERS</div>
                <div style="font-size: 18px; font-weight: 800; color: var(--accent-emerald); margin-top: 4px;">
                  ${(parseInt(channel.subscriber_count, 10) || 0).toLocaleString()}
                </div>
              </div>
              <div style="background: rgba(0,0,0,0.2); padding: 12px; border-radius: var(--radius-sm); text-align: center;">
                <div style="font-size: 10px; font-weight: 700; color: var(--text-dim);">ASSETS</div>
                <div style="font-size: 18px; font-weight: 800; color: var(--accent-violet); margin-top: 4px;">
                  ${(channel.real_content_count || channel.video_count || 0).toLocaleString()}
                </div>
              </div>
              <div style="background: rgba(0,0,0,0.2); padding: 12px; border-radius: var(--radius-sm); text-align: center;">
                <div style="font-size: 10px; font-weight: 700; color: var(--text-dim);">TOTAL VIEWS</div>
                <div style="font-size: 18px; font-weight: 800; color: var(--accent-cyan); margin-top: 4px;">
                  ${(parseInt(channel.real_views_count, 10) || parseInt(channel.total_views, 10) || 0).toLocaleString()}
                </div>
              </div>
            </div>

            ${channel.channel_url ? `
              <div>
                <a href="${this.escapeHtml(channel.channel_url)}" target="_blank" rel="noopener" class="btn-cyber btn-cyber-primary btn-sm" style="display: inline-flex; align-items: center; gap: 6px;">
                  <span>▶</span>
                  <span>Open on YouTube (${this.escapeHtml(channel.channel_url)})</span>
                </a>
              </div>
            ` : ''}

            ${channel.description ? `
              <div>
                <div style="font-size: 11px; font-weight: 700; color: var(--text-dim); text-transform: uppercase;">DESCRIPTION:</div>
                <div style="background: rgba(0,0,0,0.2); padding: 10px 14px; border-radius: var(--radius-sm); font-size: 12px; color: var(--text-muted); margin-top: 4px; line-height: 1.6;">
                  ${this.escapeHtml(channel.description)}
                </div>
              </div>
            ` : ''}

            <!-- Top Videos Section -->
            <div>
              <div style="font-size: 11px; font-weight: 700; color: var(--text-dim); text-transform: uppercase; margin-bottom: 8px;">
                TOP VIDEOS IN CATALOG:
              </div>
              ${topVideos.length > 0 ? `
                <div style="display: flex; flex-direction: column; gap: 6px;">
                  ${topVideos.slice(0, 4).map(v => `
                    <div style="display: flex; justify-content: space-between; align-items: center; padding: 8px 12px; background: rgba(0,0,0,0.15); border-radius: 6px; font-size: 12px;">
                      <span style="font-weight: 600; color: var(--text-main); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; max-width: 380px;">
                        ${v.content_type === 'short' ? '⚡' : '📹'} ${v.title}
                      </span>
                      <span style="font-family: var(--font-mono); font-weight: 700; color: var(--accent-cyan);">
                        ${(v.views_count || 0).toLocaleString()} views
                      </span>
                    </div>
                  `).join('')}
                </div>
              ` : '<div style="font-size: 12px; color: var(--text-dim);">No catalog items ingested yet.</div>'}
            </div>
          </div>
          <div class="modal-footer">
            <button class="btn-cyber btn-cyber-outline btn-sm" onclick="window.closeModal('channelViewModal'); ChannelsComponent.openEditModal('${channel.id}')">
              ✏️ Edit Channel
            </button>
            <button class="btn-cyber btn-cyber-secondary btn-sm" onclick="ChannelsComponent.syncChannel('${channel.id}')">
              🔄 Sync Metrics
            </button>
            <button class="btn-cyber btn-cyber-primary btn-sm" data-close-modal>
              CLOSE
            </button>
          </div>
        </div>
      `;

      window.openModal(modal);
    } catch (err) {
      Toast.show(`Failed to load channel details: ${err.message}`, 'error');
    }
  },

  // 4. Open Rapid Ingest Modal
  openIngestModal() {
    let modal = document.getElementById('channelIngestModal');
    if (!modal) {
      modal = document.createElement('div');
      modal.id = 'channelIngestModal';
      modal.className = 'modal-overlay';
      document.body.appendChild(modal);
    }

    modal.innerHTML = `
      <div class="modal-dialog" style="max-width: 520px;">
        <div class="modal-header">
          <div class="modal-title">🚀 RAPID YOUTUBE CHANNEL INGESTION</div>
          <button class="modal-close-btn" data-close-modal>✕</button>
        </div>
        <form id="ingestChannelModalForm">
          <div class="modal-body" style="display: flex; flex-direction: column; gap: 14px;">
            <p style="font-size: 12px; color: var(--text-muted); line-height: 1.5;">
              Enter any YouTube channel URL or @handle. The engine ingests channel metadata, baseline snapshots, and feeds catalog assets into PostgreSQL 18.
            </p>
            <div>
              <label style="font-size: 11px; font-weight: 700; color: var(--text-dim); text-transform: uppercase;">YouTube Channel URL or @Handle *</label>
              <input type="text" id="modalIngestInput" class="cyber-input" placeholder="https://www.youtube.com/@channel or @channel" required style="margin-top: 4px;" />
            </div>
            <div>
              <label style="font-size: 11px; font-weight: 700; color: var(--text-dim); text-transform: uppercase;">Display Channel Name (Optional)</label>
              <input type="text" id="modalIngestName" class="cyber-input" placeholder="e.g. My Tech Hub" style="margin-top: 4px;" />
            </div>
          </div>
          <div class="modal-footer">
            <button type="button" class="btn-cyber btn-cyber-outline" data-close-modal>Cancel</button>
            <button type="submit" class="btn-cyber btn-cyber-primary" id="modalIngestSubmitBtn">📥 INGEST CHANNEL</button>
          </div>
        </form>
      </div>
    `;

    window.openModal(modal);

    document.getElementById('ingestChannelModalForm').onsubmit = async (e) => {
      e.preventDefault();
      const btn = document.getElementById('modalIngestSubmitBtn');
      btn.disabled = true;
      btn.textContent = 'INGESTING...';

      try {
        const input = document.getElementById('modalIngestInput').value.trim();
        const name = document.getElementById('modalIngestName').value.trim();

        const res = await API.channels.importYouTube({ channelUrlOrHandle: input, channelName: name });
        Toast.show(res.message, 'success');
        window.closeModal(modal);
        if (res.channel) API.setActiveChannelId(res.channel.id);
        NavbarComponent.render(document.getElementById('navbarContainer'), App.currentUser);
        this.render(document.getElementById('mainContentArea'));
      } catch (err) {
        Toast.show(`Ingestion failed: ${err.message}`, 'error');
        btn.disabled = false;
        btn.textContent = '📥 INGEST CHANNEL';
      }
    };
  },

  // 5. Set Default Channel
  async setDefaultChannel(channelId) {
    try {
      await API.channels.setDefault(channelId);
      Toast.show('Default channel updated successfully!', 'success');
      API.setActiveChannelId(channelId);
      NavbarComponent.render(document.getElementById('navbarContainer'), App.currentUser);
      this.render(document.getElementById('mainContentArea'));
    } catch (err) {
      Toast.show(`Failed to set default: ${err.message}`, 'error');
    }
  },

  // 6. Sync Channel Metrics
  async syncChannel(channelId) {
    try {
      Toast.show('Executing telemetry synchronization...', 'info', 1500);
      const res = await API.channels.sync(channelId);
      Toast.show(res.message || 'Metrics synchronized successfully!', 'success');
      this.render(document.getElementById('mainContentArea'));
    } catch (err) {
      Toast.show(`Sync failed: ${err.message}`, 'error');
    }
  },

  // 7. Sync All Channels
  async syncAll() {
    try {
      Toast.show('Syncing telemetry across all channels...', 'info', 2000);
      for (const c of this.channels) {
        await API.channels.sync(c.id).catch(() => {});
      }
      Toast.show('All channels synchronized successfully!', 'success');
      this.render(document.getElementById('mainContentArea'));
    } catch (err) {
      Toast.show(`Sync all failed: ${err.message}`, 'error');
    }
  },

  // 8. Delete Channel
  async deleteChannel(channelId) {
    const channel = this.channelsMap.get(channelId);
    const name = channel ? channel.name : 'Channel';

    const confirmed = await cyberConfirm({
      title: 'DELETE CHANNEL & ALL MEDIA ASSETS',
      message: `Are you sure you want to delete channel "${name}"? All associated videos, shorts, snapshots, and telemetry will be permanently deleted from the studio database.`,
      confirmText: 'YES, DELETE CHANNEL & ALL ASSETS',
      cancelText: 'CANCEL',
      type: 'danger'
    });

    if (confirmed) {
      try {
        const res = await API.channels.delete(channelId);
        Toast.show(res.message || `Channel "${name}" and all associated assets deleted.`, 'success');
        
        // If deleted was active, reset active channel
        if (API.getActiveChannelId() === channelId) {
          API.setActiveChannelId('all');
        }
        if (window.NavbarComponent) {
          await window.NavbarComponent.loadChannels();
          const navContainer = document.getElementById('navbarContainer') || document.querySelector('header.top-navbar')?.parentElement;
          if (navContainer) {
            await window.NavbarComponent.render(navContainer, App.currentUser);
          }
        }
        await this.render(document.getElementById('mainContentArea'));
      } catch (err) {
        Toast.show(`Delete failed: ${err.message}`, 'error');
      }
    }
  },

  escapeHtml(str) {
    if (!str) return '';
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }
};

window.ChannelsComponent = ChannelsComponent;
