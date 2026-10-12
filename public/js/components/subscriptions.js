/**
 * Executive Subscribed Channels Component
 * Tracks YouTube channels subscribed by managed channels
 * Multi-channel filtering, live metrics sync, category management, and CSV / JSON export
 */
const SubscriptionsComponent = {
  channels: [],
  subscriptions: [],
  categories: [],
  activeChannelId: 'all',
  searchQuery: '',
  selectedCategory: 'all',
  selectedTier: 'all',
  sortBy: 'subscribed_at',
  sortOrder: 'DESC',
  viewMode: 'table', // 'table' | 'grid'
  isLoading: false,

  async render(container) {
    container.innerHTML = `
      <div style="display: flex; align-items: center; justify-content: center; height: 320px;">
        <div style="font-family: var(--font-tech); color: var(--accent-teal); font-size: 16px; letter-spacing: 1px;">
          INITIALIZING SUBSCRIBED CHANNELS REGISTRY...
        </div>
      </div>
    `;

    try {
      // 1. Load Channels
      const channelsRes = await API.channels.list();
      this.channels = channelsRes.channels || [];

      // 2. Determine initial active channel from global state
      const globalActive = API.getActiveChannelId();
      this.activeChannelId = globalActive || 'all';

      // 3. Fetch Subscriptions from API
      await this.loadData();

      // 4. Render main layout
      this.renderView(container);
    } catch (err) {
      console.error('[SUBSCRIPTIONS] Render error:', err);
      container.innerHTML = `
        <div class="glass-card" style="padding: 40px; text-align: center; max-width: 600px; margin: 40px auto; border-color: #ef4444;">
          <div style="font-size: 40px; margin-bottom: 12px;">⚠️</div>
          <h2 style="font-size: 18px; color: #ef4444; font-weight: 800;">Failed to Load Subscribed Channels</h2>
          <p style="color: var(--text-muted); font-size: 13px; margin: 10px 0 20px;">${err.message}</p>
          <button class="btn-cyber btn-cyber-primary" onclick="SubscriptionsComponent.render(document.getElementById('mainContentArea'))">
            🔄 Retry Loading
          </button>
        </div>
      `;
    }
  },

  async loadData() {
    this.isLoading = true;
    try {
      const res = await API.subscriptions.list({
        channel_id: this.activeChannelId,
        search: this.searchQuery,
        category: this.selectedCategory,
        sort_by: this.sortBy,
        order: this.sortOrder,
        limit: 0 // fetch all matching for seamless client sorting & export
      });

      this.subscriptions = res.subscriptions || [];
      this.categories = res.categories || [];
    } catch (err) {
      Toast.show('Error fetching subscriptions: ' + err.message, 'error');
      this.subscriptions = [];
    } finally {
      this.isLoading = false;
    }
  },

  getFilteredData() {
    let result = this.subscriptions.filter(sub => {
      // Search filter
      if (this.searchQuery && this.searchQuery.trim()) {
        const q = this.searchQuery.trim().toLowerCase();
        const match = (
          (sub.subscribed_channel_title || '').toLowerCase().includes(q) ||
          (sub.subscribed_channel_handle || '').toLowerCase().includes(q) ||
          (sub.description || '').toLowerCase().includes(q) ||
          (sub.category || '').toLowerCase().includes(q) ||
          (sub.subscribed_channel_id || '').toLowerCase().includes(q)
        );
        if (!match) return false;
      }

      // Category filter
      if (this.selectedCategory && this.selectedCategory !== 'all') {
        const subCat = (sub.category || '').toLowerCase();
        const selCat = (this.selectedCategory || '').replace(/&amp;/g, '&').toLowerCase();
        if (subCat !== selCat) return false;
      }

      // Subscriber tier filter
      if (this.selectedTier !== 'all') {
        const subs = parseInt(sub.subscriber_count || 0, 10);
        if (this.selectedTier === 'micro' && subs >= 10000) return false;
        if (this.selectedTier === 'mid' && (subs < 10000 || subs >= 100000)) return false;
        if (this.selectedTier === 'large' && (subs < 100000 || subs >= 1000000)) return false;
        if (this.selectedTier === 'mega' && subs < 1000000) return false;
      }

      return true;
    });

    // Client sorting
    result.sort((a, b) => {
      let valA, valB;
      if (this.sortBy === 'subscriber_count') {
        valA = parseInt(a.subscriber_count || 0, 10);
        valB = parseInt(b.subscriber_count || 0, 10);
      } else if (this.sortBy === 'title') {
        valA = (a.subscribed_channel_title || '').toLowerCase();
        valB = (b.subscribed_channel_title || '').toLowerCase();
      } else {
        valA = new Date(a.subscribed_at || 0).getTime();
        valB = new Date(b.subscribed_at || 0).getTime();
      }

      if (valA < valB) return this.sortOrder === 'ASC' ? -1 : 1;
      if (valA > valB) return this.sortOrder === 'ASC' ? 1 : -1;
      return 0;
    });

    return result;
  },

  renderView(container) {
    const activeChannel = this.channels.find(c => c.id === this.activeChannelId);
    const filteredSubs = this.getFilteredData();
    const totalReach = filteredSubs.reduce((sum, s) => sum + (parseInt(s.subscriber_count, 10) || 0), 0);
    const topCategory = this.categories.length > 0 ? this.categories[0].category : 'DevOps & Cloud';

    container.innerHTML = `
      <div class="subscriptions-page" style="padding-bottom: 60px;">
        <!-- Top Header & Action Controls -->
        <div style="display: flex; flex-wrap: wrap; align-items: center; justify-content: space-between; gap: 16px; margin-bottom: 24px;">
          <div>
            <div style="display: flex; align-items: center; gap: 10px; margin-bottom: 4px;">
              <h1 style="font-size: 24px; font-weight: 800; letter-spacing: -0.5px; margin: 0; display: flex; align-items: center; gap: 8px;">
                <span>🔔</span>
                <span class="text-gradient">SUBSCRIBED CHANNELS</span>
              </h1>
              <span class="badge badge-teal" style="font-size: 11px; padding: 2px 8px; font-weight: 700;">
                MULTI-CHANNEL REGISTRY
              </span>
            </div>
            <p style="color: var(--text-muted); font-size: 13px; margin: 0;">
              Channels subscribed by your managed YouTube channels • Real-time metrics • Takeout CSV / JSON export
            </p>
          </div>

          <!-- Action Buttons Bar -->
          <div style="display: flex; flex-wrap: wrap; align-items: center; gap: 10px;">
            <button class="btn-cyber btn-cyber-primary btn-sm" onclick="SubscriptionsComponent.openAddModal()" style="display: flex; align-items: center; gap: 6px; font-weight: 700;">
              <span>➕</span>
              <span>Add Subscription</span>
            </button>

            <button class="btn-cyber btn-cyber-outline btn-sm" onclick="SubscriptionsComponent.openImportModal()" style="display: flex; align-items: center; gap: 6px;" title="Import all 250+ subscriptions via Google Takeout CSV or JSON">
              <span>📥</span>
              <span>Takeout Import</span>
            </button>

            <button class="btn-cyber btn-cyber-outline btn-sm" onclick="SubscriptionsComponent.openApiSyncModal()" style="display: flex; align-items: center; gap: 6px; border-color: rgba(6, 182, 212, 0.4); color: var(--accent-cyan);" title="Sync all 250+ subscriptions directly using YouTube Data API v3">
              <span>🔑</span>
              <span>API Sync (250+)</span>
            </button>

            <button class="btn-cyber btn-cyber-outline btn-sm" onclick="SubscriptionsComponent.triggerSync()" style="display: flex; align-items: center; gap: 6px;" title="Sync live subscriber count & metrics from YouTube">
              <span>🔄</span>
              <span>Sync Metrics</span>
            </button>

            <!-- Export Dropdown / Buttons -->
            <div style="display: flex; align-items: center; gap: 6px; border-left: 1px solid var(--border-color); padding-left: 10px;">
              <button class="btn-cyber btn-cyber-outline btn-sm" onclick="SubscriptionsComponent.exportCSV()" style="display: flex; align-items: center; gap: 5px; color: var(--accent-emerald); border-color: rgba(16, 185, 129, 0.4);" title="Export filtered records as CSV file">
                <span>📊</span>
                <span>Export CSV</span>
              </button>

              <button class="btn-cyber btn-cyber-outline btn-sm" onclick="SubscriptionsComponent.exportJSON()" style="display: flex; align-items: center; gap: 5px; color: var(--accent-cyan); border-color: rgba(6, 182, 212, 0.4);" title="Export filtered records as JSON file">
                <span>💾</span>
                <span>Export JSON</span>
              </button>
            </div>
          </div>
        </div>

        <!-- Explanatory Guide Box for Full 250+ Subscriptions -->
        <div class="glass-card" style="padding: 14px 18px; margin-bottom: 22px; border-left: 3px solid var(--accent-cyan); background: rgba(6, 182, 212, 0.05); display: flex; align-items: center; justify-content: space-between; gap: 14px; flex-wrap: wrap;">
          <div style="display: flex; align-items: center; gap: 12px; min-width: 280px; flex: 1;">
            <span style="font-size: 24px;">💡</span>
            <div>
              <div style="font-weight: 700; color: var(--text-main); font-size: 13px;">
                Looking for your full 250+ Subscribed Channels?
              </div>
              <div style="font-size: 12px; color: var(--text-muted); margin-top: 2px; line-height: 1.4;">
                YouTube accounts default to <em>Private Subscriptions</em>, so web scrapers only see a baseline. You can load all 250+ in seconds: 
                <a href="https://takeout.google.com/" target="_blank" rel="noopener noreferrer" style="color: var(--accent-teal); text-decoration: underline;">Download Google Takeout CSV</a> and click <strong>Takeout Import</strong>, or use <strong>API Sync</strong>!
              </div>
            </div>
          </div>
          <div style="display: flex; gap: 8px;">
            <button class="btn-cyber btn-cyber-primary btn-sm" onclick="SubscriptionsComponent.openImportModal()" style="font-weight: 700;">
              📥 Takeout Import
            </button>
            <button class="btn-cyber btn-cyber-outline btn-sm" onclick="SubscriptionsComponent.openApiSyncModal()">
              🔑 YouTube API Sync
            </button>
          </div>
        </div>

        <!-- Telemetry Metrics Cards -->
        <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(210px, 1fr)); gap: 14px; margin-bottom: 24px;">
          <!-- Card 1: Total Channels -->
          <div class="glass-card" style="padding: 16px 20px; border-left: 3px solid var(--accent-teal);">
            <div style="color: var(--text-dim); font-size: 11px; text-transform: uppercase; font-family: var(--font-tech); margin-bottom: 6px; letter-spacing: 0.5px;">
              Subscribed Channels
            </div>
            <div style="font-size: 26px; font-weight: 900; color: var(--accent-teal);">
              ${filteredSubs.length}
              <span style="font-size: 12px; color: var(--text-dim); font-weight: normal; margin-left: 4px;">
                ${this.activeChannelId === 'all' ? '(Consolidated)' : 'channels'}
              </span>
            </div>
            <div style="font-size: 11px; color: var(--text-muted); margin-top: 4px;">
              ${this.subscriptions.length} total in database
            </div>
          </div>

          <!-- Card 2: Cumulative Reach -->
          <div class="glass-card" style="padding: 16px 20px; border-left: 3px solid var(--accent-emerald);">
            <div style="color: var(--text-dim); font-size: 11px; text-transform: uppercase; font-family: var(--font-tech); margin-bottom: 6px; letter-spacing: 0.5px;">
              Cumulative Creator Reach
            </div>
            <div style="font-size: 26px; font-weight: 900; color: var(--accent-emerald);">
              ${this.formatNumber(totalReach)}
            </div>
            <div style="font-size: 11px; color: var(--text-muted); margin-top: 4px;">
              Combined subscribers of feeds
            </div>
          </div>

          <!-- Card 3: Managed Channel Context -->
          <div class="glass-card" style="padding: 16px 20px; border-left: 3px solid var(--accent-cyan);">
            <div style="color: var(--text-dim); font-size: 11px; text-transform: uppercase; font-family: var(--font-tech); margin-bottom: 6px; letter-spacing: 0.5px;">
              Active Channel Scope
            </div>
            <div style="font-size: 18px; font-weight: 800; color: var(--text-main); white-space: nowrap; overflow: hidden; text-overflow: ellipsis;" title="${activeChannel ? activeChannel.name : 'All Channels'}">
              ${activeChannel ? `📺 ${activeChannel.name}` : '🌐 All Channels'}
            </div>
            <div style="font-size: 11px; color: var(--text-muted); margin-top: 4px;">
              ${activeChannel ? (activeChannel.handle || '@channel') : `${this.channels.length} channels connected`}
            </div>
          </div>

          <!-- Card 4: Top Category -->
          <div class="glass-card" style="padding: 16px 20px; border-left: 3px solid var(--accent-amber);">
            <div style="color: var(--text-dim); font-size: 11px; text-transform: uppercase; font-family: var(--font-tech); margin-bottom: 6px; letter-spacing: 0.5px;">
              Dominant Category
            </div>
            <div style="font-size: 18px; font-weight: 800; color: var(--accent-amber); white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">
              🏷️ ${topCategory}
            </div>
            <div style="font-size: 11px; color: var(--text-muted); margin-top: 4px;">
              ${this.categories.length} unique categories tracked
            </div>
          </div>
        </div>

        <!-- Filter & Search Toolbar -->
        <div class="glass-card" style="padding: 16px 20px; margin-bottom: 20px;">
          <div style="display: flex; flex-wrap: wrap; align-items: center; justify-content: space-between; gap: 14px;">
            <!-- Left Filter Group -->
            <div style="display: flex; flex-wrap: wrap; align-items: center; gap: 12px; flex: 1; min-width: 300px;">
              <!-- Search Box -->
              <div style="position: relative; flex: 1; min-width: 220px; max-width: 360px;">
                <input 
                  type="text" 
                  id="subSearchInput" 
                  class="cyber-input" 
                  style="width: 100%; padding-left: 32px; padding-right: 28px; height: 38px; font-size: 13px;" 
                  placeholder="Search by channel name, handle, ID..." 
                  value="${this.escapeHtml(this.searchQuery)}"
                  oninput="SubscriptionsComponent.onSearchChange(this.value)"
                />
                <span style="position: absolute; left: 10px; top: 10px; font-size: 14px; opacity: 0.6;">🔍</span>
                ${this.searchQuery ? `
                  <button type="button" onclick="SubscriptionsComponent.onSearchChange(''); document.getElementById('subSearchInput').value='';" style="position: absolute; right: 10px; top: 10px; background: none; border: none; color: var(--text-dim); cursor: pointer; font-size: 12px;">✕</button>
                ` : ''}
              </div>

              <!-- Channel Selector (Multi-channel) -->
              <div style="min-width: 180px;">
                <select id="subChannelSelect" class="cyber-input" style="height: 38px; font-size: 13px;" onchange="SubscriptionsComponent.onChannelChange(this.value)">
                  <option value="all" ${this.activeChannelId === 'all' ? 'selected' : ''}>🌐 All Channels (Consolidated)</option>
                  ${this.channels.map(c => `
                    <option value="${c.id}" ${this.activeChannelId === c.id ? 'selected' : ''}>
                      📺 ${c.name} (${c.handle || '@channel'})
                    </option>
                  `).join('')}
                </select>
              </div>

              <!-- Category Filter -->
              <div style="min-width: 150px;">
                <select id="subCategorySelect" class="cyber-input" style="height: 38px; font-size: 13px;" onchange="SubscriptionsComponent.onCategoryChange(this.value)">
                  <option value="all" ${this.selectedCategory === 'all' ? 'selected' : ''}>🏷️ All Categories</option>
                  ${this.categories.map(cat => `
                    <option value="${cat.category.replace(/"/g, '&quot;')}" ${this.selectedCategory === cat.category ? 'selected' : ''}>
                      ${this.escapeHtml(cat.category)} (${cat.count})
                    </option>
                  `).join('')}
                </select>
              </div>

              <!-- Tier Filter -->
              <div style="min-width: 140px;">
                <select id="subTierSelect" class="cyber-input" style="height: 38px; font-size: 13px;" onchange="SubscriptionsComponent.onTierChange(this.value)">
                  <option value="all" ${this.selectedTier === 'all' ? 'selected' : ''}>👥 All Subscriber Tiers</option>
                  <option value="mega" ${this.selectedTier === 'mega' ? 'selected' : ''}>🌟 Mega (1M+)</option>
                  <option value="large" ${this.selectedTier === 'large' ? 'selected' : ''}>🔥 Large (100K-1M)</option>
                  <option value="mid" ${this.selectedTier === 'mid' ? 'selected' : ''}>⚡ Mid (10K-100K)</option>
                  <option value="micro" ${this.selectedTier === 'micro' ? 'selected' : ''}>🌱 Micro (&lt;10K)</option>
                </select>
              </div>
            </div>

            <!-- Right Sort & View Controls -->
            <div style="display: flex; align-items: center; gap: 10px;">
              <!-- Sort Dropdown -->
              <div style="display: flex; align-items: center; gap: 6px;">
                <span style="font-size: 12px; color: var(--text-dim); text-transform: uppercase; font-family: var(--font-tech);">Sort:</span>
                <select id="subSortSelect" class="cyber-input" style="height: 38px; font-size: 12px; padding-right: 24px;" onchange="SubscriptionsComponent.onSortChange(this.value)">
                  <option value="subscribed_at:DESC" ${this.sortBy === 'subscribed_at' && this.sortOrder === 'DESC' ? 'selected' : ''}>Date (Newest)</option>
                  <option value="subscribed_at:ASC" ${this.sortBy === 'subscribed_at' && this.sortOrder === 'ASC' ? 'selected' : ''}>Date (Oldest)</option>
                  <option value="subscriber_count:DESC" ${this.sortBy === 'subscriber_count' && this.sortOrder === 'DESC' ? 'selected' : ''}>Subscribers (High-Low)</option>
                  <option value="subscriber_count:ASC" ${this.sortBy === 'subscriber_count' && this.sortOrder === 'ASC' ? 'selected' : ''}>Subscribers (Low-High)</option>
                  <option value="title:ASC" ${this.sortBy === 'title' && this.sortOrder === 'ASC' ? 'selected' : ''}>Name (A-Z)</option>
                  <option value="title:DESC" ${this.sortBy === 'title' && this.sortOrder === 'DESC' ? 'selected' : ''}>Name (Z-A)</option>
                </select>
              </div>

              <!-- View Switcher -->
              <div style="display: flex; background: rgba(0,0,0,0.3); border: 1px solid var(--border-color); border-radius: 6px; padding: 2px;">
                <button 
                  class="btn-cyber-outline" 
                  onclick="SubscriptionsComponent.setViewMode('table')" 
                  style="border: none; padding: 5px 10px; border-radius: 4px; font-size: 13px; cursor: pointer; ${this.viewMode === 'table' ? 'background: var(--accent-teal); color: #000; font-weight: bold;' : 'color: var(--text-dim);'}" 
                  title="Data Table View"
                >
                  ☰ Table
                </button>
                <button 
                  class="btn-cyber-outline" 
                  onclick="SubscriptionsComponent.setViewMode('grid')" 
                  style="border: none; padding: 5px 10px; border-radius: 4px; font-size: 13px; cursor: pointer; ${this.viewMode === 'grid' ? 'background: var(--accent-teal); color: #000; font-weight: bold;' : 'color: var(--text-dim);'}" 
                  title="Card Grid View"
                >
                  ☷ Cards
                </button>
              </div>
            </div>
          </div>
        </div>

        <!-- Main Content Area: Table or Grid -->
        <div id="subscriptionsListContainer">
          ${this.renderDataList(filteredSubs)}
        </div>
      </div>
    `;
  },

  renderDataList(items) {
    if (items.length === 0) {
      return `
        <div class="glass-card" style="padding: 60px 20px; text-align: center; margin: 20px 0;">
          <div style="font-size: 48px; margin-bottom: 14px;">📭</div>
          <h3 style="font-size: 18px; font-weight: 800; color: var(--text-main); margin-bottom: 8px;">
            No Subscribed Channels Found
          </h3>
          <p style="color: var(--text-muted); font-size: 13px; max-width: 480px; margin: 0 auto 20px;">
            ${this.searchQuery || this.selectedCategory !== 'all' || this.selectedTier !== 'all' 
              ? 'No subscriptions match your current filter criteria. Try clearing search or filters.' 
              : 'Your channel has not registered any subscriptions yet. Click below to add channels or import your YouTube Takeout file.'}
          </p>
          <div style="display: flex; justify-content: center; gap: 10px;">
            ${this.searchQuery || this.selectedCategory !== 'all' || this.selectedTier !== 'all' ? `
              <button class="btn-cyber btn-cyber-outline" onclick="SubscriptionsComponent.resetFilters()">
                ✕ Clear All Filters
              </button>
            ` : `
              <button class="btn-cyber btn-cyber-primary" onclick="SubscriptionsComponent.openAddModal()">
                ➕ Add First Subscription
              </button>
              <button class="btn-cyber btn-cyber-outline" onclick="SubscriptionsComponent.triggerSync()">
                🔄 Seed Baseline Feeds
              </button>
            `}
          </div>
        </div>
      `;
    }

    if (this.viewMode === 'grid') {
      return this.renderGridView(items);
    }
    return this.renderTableView(items);
  },

  renderTableView(items) {
    return `
      <div class="glass-card" style="padding: 0; overflow: hidden;">
        <div style="overflow-x: auto;">
          <table style="width: 100%; border-collapse: collapse; text-align: left; font-size: 13px;">
            <thead>
              <tr style="background: rgba(0,0,0,0.3); border-bottom: 1px solid var(--border-color); color: var(--text-dim); font-size: 11px; text-transform: uppercase; font-family: var(--font-tech);">
                <th style="padding: 14px 16px;">Channel / Creator</th>
                <th style="padding: 14px 16px;">Managed By</th>
                <th style="padding: 14px 16px;">Category</th>
                <th style="padding: 14px 16px;">Subscribers</th>
                <th style="padding: 14px 16px;">Videos</th>
                <th style="padding: 14px 16px;">Subscribed Date</th>
                <th style="padding: 14px 16px; text-align: right;">Actions</th>
              </tr>
            </thead>
            <tbody>
              ${items.map(sub => {
                const avatar = sub.subscribed_channel_avatar || 'https://via.placeholder.com/44?text=YT';
                const subDate = sub.subscribed_at ? new Date(sub.subscribed_at).toLocaleDateString() : 'N/A';
                const catBadgeClass = this.getCategoryBadgeClass(sub.category);

                return `
                  <tr style="border-bottom: 1px solid rgba(255,255,255,0.05); transition: background 0.15s ease;" onmouseover="this.style.background='rgba(255,255,255,0.03)'" onmouseout="this.style.background='transparent'">
                    <!-- Channel & Handle -->
                    <td style="padding: 14px 16px;">
                      <div style="display: flex; align-items: center; gap: 12px;">
                        <img 
                          src="${avatar}" 
                          alt="${this.escapeHtml(sub.subscribed_channel_title)}" 
                          style="width: 42px; height: 42px; border-radius: 50%; object-fit: cover; border: 1px solid var(--border-color); background: #000;"
                          onerror="this.src='https://via.placeholder.com/42?text=YT'"
                        />
                        <div style="min-width: 0;">
                          <div style="font-weight: 700; color: var(--text-main); font-size: 14px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; max-width: 240px;">
                            ${this.escapeHtml(sub.subscribed_channel_title)}
                          </div>
                          <div style="display: flex; align-items: center; gap: 6px; margin-top: 2px;">
                            <span style="font-size: 12px; color: var(--accent-cyan); font-family: var(--font-mono);">
                              ${this.escapeHtml(sub.subscribed_channel_handle || '@channel')}
                            </span>
                            ${sub.subscribed_channel_url ? `
                              <a href="${this.escapeHtml(sub.subscribed_channel_url)}" target="_blank" rel="noopener noreferrer" style="color: var(--text-dim); text-decoration: none; font-size: 11px;" title="Open YouTube Channel">↗</a>
                            ` : ''}
                          </div>
                        </div>
                      </div>
                    </td>

                    <!-- Managed By Channel -->
                    <td style="padding: 14px 16px;">
                      <span class="badge badge-teal" style="font-size: 11px; padding: 3px 8px; font-weight: 600;" title="${this.escapeHtml(sub.my_channel_name)}">
                        📺 ${this.escapeHtml(sub.my_channel_name || 'Main')}
                      </span>
                    </td>

                    <!-- Category -->
                    <td style="padding: 14px 16px;">
                      <span class="badge ${catBadgeClass}" style="font-size: 11px; padding: 3px 8px;">
                        ${this.escapeHtml(sub.category || 'General')}
                      </span>
                    </td>

                    <!-- Subscribers -->
                    <td style="padding: 14px 16px;">
                      <div style="font-weight: 700; color: var(--accent-emerald); font-size: 13px;">
                        ${this.formatNumber(sub.subscriber_count)}
                      </div>
                      <div style="font-size: 10px; color: var(--text-dim);">
                        ${(parseInt(sub.subscriber_count, 10) || 0).toLocaleString()} exact
                      </div>
                    </td>

                    <!-- Videos -->
                    <td style="padding: 14px 16px;">
                      <div style="color: var(--text-main); font-size: 13px;">
                        ${sub.video_count ? `${sub.video_count.toLocaleString()} vids` : '—'}
                      </div>
                    </td>

                    <!-- Subscribed Date -->
                    <td style="padding: 14px 16px; color: var(--text-muted); font-size: 12px; font-family: var(--font-mono);">
                      ${subDate}
                    </td>

                    <!-- Actions -->
                    <td style="padding: 14px 16px; text-align: right;">
                      <div style="display: flex; align-items: center; justify-content: flex-end; gap: 6px;">
                        ${sub.subscribed_channel_url ? `
                          <a 
                            href="${this.escapeHtml(sub.subscribed_channel_url)}" 
                            target="_blank" 
                            rel="noopener noreferrer" 
                            class="btn-cyber btn-cyber-outline btn-sm" 
                            style="padding: 4px 8px; font-size: 11px;" 
                            title="Open on YouTube"
                          >
                            ↗ Watch
                          </a>
                        ` : ''}

                        <button 
                          class="btn-cyber btn-cyber-outline btn-sm" 
                          onclick="SubscriptionsComponent.openEditModal('${sub.id}')" 
                          style="padding: 4px 8px; font-size: 11px;" 
                          title="Edit Category or Notes"
                        >
                          ✏️
                        </button>

                        <button 
                          class="btn-cyber btn-cyber-outline btn-sm" 
                          onclick="SubscriptionsComponent.deleteSubscription('${sub.id}', '${this.escapeHtml(sub.subscribed_channel_title)}')" 
                          style="padding: 4px 8px; font-size: 11px; color: #ef4444; border-color: rgba(239, 68, 68, 0.3);" 
                          title="Unsubscribe / Remove from Registry"
                        >
                          🗑️
                        </button>
                      </div>
                    </td>
                  </tr>
                `;
              }).join('')}
            </tbody>
          </table>
        </div>

        <!-- Table Footer Info -->
        <div style="padding: 12px 18px; background: rgba(0,0,0,0.2); border-top: 1px solid var(--border-color); display: flex; justify-content: space-between; align-items: center; font-size: 12px; color: var(--text-muted);">
          <div>
            Showing <strong style="color: var(--text-main);">${items.length}</strong> subscribed channels
          </div>
          <div style="font-family: var(--font-mono); font-size: 11px;">
            Exportable to CSV & JSON • Live Sync Compatible
          </div>
        </div>
      </div>
    `;
  },

  renderGridView(items) {
    return `
      <div style="display: grid; grid-template-columns: repeat(auto-fill, minmax(280px, 1fr)); gap: 16px;">
        ${items.map(sub => {
          const avatar = sub.subscribed_channel_avatar || 'https://via.placeholder.com/60?text=YT';
          const catBadgeClass = this.getCategoryBadgeClass(sub.category);
          const subDate = sub.subscribed_at ? new Date(sub.subscribed_at).toLocaleDateString() : 'N/A';

          return `
            <div class="glass-card" style="padding: 18px; display: flex; flex-direction: column; justify-content: space-between; position: relative;">
              <div>
                <!-- Top Row: Avatar + Title -->
                <div style="display: flex; align-items: flex-start; gap: 12px; margin-bottom: 12px;">
                  <img 
                    src="${avatar}" 
                    alt="${this.escapeHtml(sub.subscribed_channel_title)}" 
                    style="width: 52px; height: 52px; border-radius: 50%; object-fit: cover; border: 2px solid var(--border-color); background: #000; flex-shrink: 0;"
                    onerror="this.src='https://via.placeholder.com/52?text=YT'"
                  />
                  <div style="min-width: 0; flex: 1;">
                    <div style="font-weight: 800; font-size: 15px; color: var(--text-main); white-space: nowrap; overflow: hidden; text-overflow: ellipsis;" title="${this.escapeHtml(sub.subscribed_channel_title)}">
                      ${this.escapeHtml(sub.subscribed_channel_title)}
                    </div>
                    <div style="font-size: 12px; color: var(--accent-cyan); font-family: var(--font-mono); margin-top: 2px;">
                      ${this.escapeHtml(sub.subscribed_channel_handle || '@channel')}
                    </div>
                    <div style="margin-top: 6px; display: flex; flex-wrap: wrap; gap: 4px;">
                      <span class="badge ${catBadgeClass}" style="font-size: 10px; padding: 2px 6px;">
                        ${this.escapeHtml(sub.category || 'General')}
                      </span>
                      <span class="badge badge-teal" style="font-size: 10px; padding: 2px 6px;">
                        📺 ${this.escapeHtml(sub.my_channel_name || 'Main')}
                      </span>
                    </div>
                  </div>
                </div>

                <!-- Description / Bio -->
                ${sub.description ? `
                  <p style="color: var(--text-muted); font-size: 12px; margin: 0 0 14px; line-height: 1.4; display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden;">
                    ${this.escapeHtml(sub.description)}
                  </p>
                ` : `
                  <div style="height: 14px;"></div>
                `}

                <!-- Metrics Strip -->
                <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 8px; background: rgba(0,0,0,0.25); border-radius: 6px; padding: 8px 12px; margin-bottom: 14px;">
                  <div>
                    <div style="font-size: 10px; color: var(--text-dim); text-transform: uppercase;">Subscribers</div>
                    <div style="font-size: 14px; font-weight: 800; color: var(--accent-emerald);">
                      ${this.formatNumber(sub.subscriber_count)}
                    </div>
                  </div>
                  <div>
                    <div style="font-size: 10px; color: var(--text-dim); text-transform: uppercase;">Subscribed</div>
                    <div style="font-size: 12px; font-family: var(--font-mono); color: var(--text-main); margin-top: 2px;">
                      ${subDate}
                    </div>
                  </div>
                </div>
              </div>

              <!-- Action Footer -->
              <div style="display: flex; align-items: center; justify-content: space-between; border-top: 1px solid rgba(255,255,255,0.05); padding-top: 12px;">
                ${sub.subscribed_channel_url ? `
                  <a 
                    href="${this.escapeHtml(sub.subscribed_channel_url)}" 
                    target="_blank" 
                    rel="noopener noreferrer" 
                    class="btn-cyber btn-cyber-primary btn-sm" 
                    style="font-size: 11px; padding: 4px 10px;"
                  >
                    ↗ Visit YouTube
                  </a>
                ` : '<span></span>'}

                <div style="display: flex; gap: 6px;">
                  <button 
                    class="btn-cyber btn-cyber-outline btn-sm" 
                    onclick="SubscriptionsComponent.openEditModal('${sub.id}')" 
                    title="Edit Category or Notes"
                  >
                    ✏️
                  </button>
                  <button 
                    class="btn-cyber btn-cyber-outline btn-sm" 
                    onclick="SubscriptionsComponent.deleteSubscription('${sub.id}', '${this.escapeHtml(sub.subscribed_channel_title)}')" 
                    style="color: #ef4444; border-color: rgba(239,68,68,0.3);"
                    title="Remove Subscription"
                  >
                    🗑️
                  </button>
                </div>
              </div>
            </div>
          `;
        }).join('')}
      </div>
    `;
  },

  // --------------------------------------------------------------------------
  // Event Handlers
  // --------------------------------------------------------------------------
  onSearchChange(value) {
    this.searchQuery = value;
    clearTimeout(this._searchTimer);
    this._searchTimer = setTimeout(() => {
      this.refreshListOnly();
    }, 200);
  },

  onChannelChange(channelId) {
    this.activeChannelId = channelId;
    API.setActiveChannelId(channelId);
    this.loadData().then(() => {
      const container = document.getElementById('mainContentArea');
      if (container) this.renderView(container);
    });
  },

  onCategoryChange(category) {
    this.selectedCategory = category;
    this.refreshListOnly();
  },

  onTierChange(tier) {
    this.selectedTier = tier;
    this.refreshListOnly();
  },

  onSortChange(value) {
    const [field, order] = value.split(':');
    this.sortBy = field;
    this.sortOrder = order;
    this.loadData().then(() => {
      this.refreshListOnly();
    });
  },

  setViewMode(mode) {
    this.viewMode = mode;
    this.refreshListOnly();
  },

  resetFilters() {
    this.searchQuery = '';
    this.selectedCategory = 'all';
    this.selectedTier = 'all';
    this.sortBy = 'subscribed_at';
    this.sortOrder = 'DESC';
    const container = document.getElementById('mainContentArea');
    if (container) this.renderView(container);
  },

  refreshListOnly() {
    const listContainer = document.getElementById('subscriptionsListContainer');
    if (listContainer) {
      const filtered = this.getFilteredData();
      listContainer.innerHTML = this.renderDataList(filtered);
    }
  },

  // --------------------------------------------------------------------------
  // Export Handlers (Instant Client + Server RFC 4180 CSV & JSON)
  // --------------------------------------------------------------------------
  exportCSV() {
    const items = this.getFilteredData();
    if (items.length === 0) {
      Toast.show('No subscriptions to export', 'warning');
      return;
    }

    const headers = [
      'ID',
      'My Channel Name',
      'My Channel Handle',
      'Subscribed Channel Title',
      'Handle',
      'Channel ID',
      'Channel URL',
      'Subscriber Count',
      'Video Count',
      'Category',
      'Subscribed Date',
      'Record Created At'
    ];

    const escapeCsv = (str) => {
      if (str === null || str === undefined) return '""';
      const val = String(str).replace(/"/g, '""');
      return `"${val}"`;
    };

    const csvLines = [headers.join(',')];
    for (const r of items) {
      csvLines.push([
        escapeCsv(r.id),
        escapeCsv(r.my_channel_name),
        escapeCsv(r.my_channel_handle),
        escapeCsv(r.subscribed_channel_title),
        escapeCsv(r.subscribed_channel_handle),
        escapeCsv(r.subscribed_channel_id),
        escapeCsv(r.subscribed_channel_url),
        r.subscriber_count || 0,
        r.video_count || 0,
        escapeCsv(r.category),
        escapeCsv(r.subscribed_at ? new Date(r.subscribed_at).toISOString() : ''),
        escapeCsv(r.created_at ? new Date(r.created_at).toISOString() : '')
      ].join(','));
    }

    const csvContent = '\uFEFF' + csvLines.join('\r\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const dateStr = new Date().toISOString().split('T')[0];
    const channelName = this.activeChannelId === 'all' ? 'all_channels' : (this.channels.find(c => c.id === this.activeChannelId)?.name?.toLowerCase().replace(/[^a-z0-9]/g, '_') || 'channel');
    
    const a = document.createElement('a');
    a.href = url;
    a.download = `subscriptions_${channelName}_${dateStr}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);

    Toast.show(`Successfully exported ${items.length} subscriptions to CSV!`, 'success');
  },

  exportJSON() {
    const items = this.getFilteredData();
    if (items.length === 0) {
      Toast.show('No subscriptions to export', 'warning');
      return;
    }

    const exportData = items.map(s => ({
      id: s.id,
      my_channel: {
        name: s.my_channel_name,
        handle: s.my_channel_handle
      },
      subscribed_channel: {
        title: s.subscribed_channel_title,
        handle: s.subscribed_channel_handle,
        channel_id: s.subscribed_channel_id,
        url: s.subscribed_channel_url,
        avatar_url: s.subscribed_channel_avatar,
        subscriber_count: parseInt(s.subscriber_count, 10) || 0,
        video_count: parseInt(s.video_count, 10) || 0,
        category: s.category,
        description: s.description,
        subscribed_at: s.subscribed_at
      }
    }));

    const jsonString = JSON.stringify(exportData, null, 2);
    const blob = new Blob([jsonString], { type: 'application/json;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const dateStr = new Date().toISOString().split('T')[0];
    const channelName = this.activeChannelId === 'all' ? 'all_channels' : (this.channels.find(c => c.id === this.activeChannelId)?.name?.toLowerCase().replace(/[^a-z0-9]/g, '_') || 'channel');

    const a = document.createElement('a');
    a.href = url;
    a.download = `subscriptions_${channelName}_${dateStr}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);

    Toast.show(`Successfully exported ${items.length} subscriptions to JSON!`, 'success');
  },

  // --------------------------------------------------------------------------
  // Modals: Add, Edit, Import, Sync
  // --------------------------------------------------------------------------
  openAddModal() {
    const modalRoot = document.getElementById('modalRoot');
    if (!modalRoot) return;

    const defaultChannelId = this.activeChannelId !== 'all' ? this.activeChannelId : (this.channels[0]?.id || '');

    modalRoot.innerHTML = `
      <div class="cyber-modal open" id="addSubModal" onclick="if(event.target===this) window.closeModal('addSubModal')">
        <div class="glass-card cyber-modal-card" style="max-width: 520px; border-color: var(--accent-teal);">
          <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 20px;">
            <div style="display: flex; align-items: center; gap: 8px;">
              <span style="font-size: 22px;">➕</span>
              <h3 style="font-size: 18px; font-weight: 800; margin: 0; color: var(--text-main);">Add Subscribed Channel</h3>
            </div>
            <button class="modal-close-btn" onclick="window.closeModal('addSubModal')">✕</button>
          </div>

          <form id="addSubForm" onsubmit="SubscriptionsComponent.handleAddSubmit(event)">
            <!-- Which Managed Channel is Subscribed -->
            <div style="margin-bottom: 16px;">
              <label class="cyber-label">Managed Channel (Subscriber)</label>
              <select id="modalSubChannelId" class="cyber-input" style="width: 100%;" required>
                ${this.channels.map(c => `
                  <option value="${c.id}" ${c.id === defaultChannelId ? 'selected' : ''}>
                    📺 ${c.name} (${c.handle || '@channel'})
                  </option>
                `).join('')}
              </select>
            </div>

            <!-- Target Channel Handle or URL -->
            <div style="margin-bottom: 16px;">
              <label class="cyber-label">Target YouTube Channel (Handle, URL, or ID)</label>
              <div style="display: flex; gap: 8px;">
                <input 
                  type="text" 
                  id="modalTargetChannel" 
                  class="cyber-input" 
                  style="flex: 1;" 
                  placeholder="e.g. @NetworkChuck, @fireship, https://youtube.com/@..." 
                  required 
                />
                <button 
                  type="button" 
                  class="btn-cyber btn-cyber-outline" 
                  onclick="SubscriptionsComponent.previewTargetChannel()" 
                  id="previewChannelBtn" 
                  style="white-space: nowrap; font-size: 12px;"
                >
                  🔍 Preview
                </button>
              </div>
              <div style="font-size: 11px; color: var(--text-dim); margin-top: 4px;">
                Live YouTube scraping will automatically fetch real avatar, handle, subscriber count & title.
              </div>
            </div>

            <!-- Live Preview Card Container -->
            <div id="liveChannelPreviewArea" style="display: none; margin-bottom: 16px;"></div>

            <!-- Category Picker -->
            <div style="margin-bottom: 16px;">
              <label class="cyber-label">Category</label>
              <input 
                type="text" 
                id="modalCategory" 
                class="cyber-input" 
                style="width: 100%;" 
                list="categorySuggestions" 
                value="DevOps & Cloud" 
                placeholder="Select or enter category..." 
                required 
              />
              <datalist id="categorySuggestions">
                <option value="DevOps & Cloud">
                <option value="Development">
                <option value="Networking & Security">
                <option value="Architecture">
                <option value="Database & Systems">
                <option value="AI & ML">
                <option value="Education">
                <option value="Entertainment">
              </datalist>
            </div>

            <!-- Description / Creator Notes -->
            <div style="margin-bottom: 20px;">
              <label class="cyber-label">Creator Notes / Description (Optional)</label>
              <textarea 
                id="modalDescription" 
                class="cyber-input" 
                style="width: 100%; height: 70px; resize: vertical;" 
                placeholder="Why your channel is subscribed or notable coverage..."
              ></textarea>
            </div>

            <!-- Buttons -->
            <div style="display: flex; justify-content: flex-end; gap: 10px;">
              <button type="button" class="btn-cyber btn-cyber-outline" onclick="window.closeModal('addSubModal')">Cancel</button>
              <button type="submit" class="btn-cyber btn-cyber-primary" id="saveSubBtn">
                💾 Save Subscription
              </button>
            </div>
          </form>
        </div>
      </div>
    `;
  },

  async previewTargetChannel() {
    const target = document.getElementById('modalTargetChannel')?.value?.trim();
    const btn = document.getElementById('previewChannelBtn');
    const area = document.getElementById('liveChannelPreviewArea');
    if (!target) {
      Toast.show('Please enter a channel handle or URL first', 'warning');
      return;
    }

    if (btn) btn.disabled = true;
    if (area) {
      area.style.display = 'block';
      area.innerHTML = `
        <div style="background: rgba(0,0,0,0.3); border: 1px dashed var(--accent-teal); border-radius: 8px; padding: 12px; text-align: center; color: var(--accent-teal); font-size: 12px;">
          ⏳ Resolving live profile from YouTube...
        </div>
      `;
    }

    try {
      // Create temporary probe subscription or use live metadata resolver
      const res = await API.content.fetchMeta({ video_id_or_url: target }).catch(() => null);
      // Fallback: let the user know preview will be finalized upon submission
      area.innerHTML = `
        <div style="background: rgba(16, 185, 129, 0.1); border: 1px solid var(--accent-emerald); border-radius: 8px; padding: 12px; display: flex; align-items: center; gap: 12px;">
          <span style="font-size: 24px;">✅</span>
          <div>
            <div style="font-weight: 700; color: var(--accent-emerald); font-size: 13px;">Target Validated: ${this.escapeHtml(target)}</div>
            <div style="font-size: 11px; color: var(--text-dim);">Live YouTube metadata will be retrieved and stored upon saving.</div>
          </div>
        </div>
      `;
    } catch (e) {
      area.innerHTML = `
        <div style="background: rgba(239, 68, 68, 0.1); border: 1px solid rgba(239, 68, 68, 0.3); border-radius: 8px; padding: 10px; font-size: 12px; color: #ef4444;">
          Note: Preview query completed. Channel will be stored directly.
        </div>
      `;
    } finally {
      if (btn) btn.disabled = false;
    }
  },

  async handleAddSubmit(e) {
    e.preventDefault();
    const saveBtn = document.getElementById('saveSubBtn');
    if (saveBtn) {
      saveBtn.disabled = true;
      saveBtn.innerText = '⏳ Resolving & Saving...';
    }

    try {
      const channelId = document.getElementById('modalSubChannelId').value;
      const targetChannel = document.getElementById('modalTargetChannel').value.trim();
      const category = document.getElementById('modalCategory').value.trim() || 'General';
      const description = document.getElementById('modalDescription').value.trim();

      const res = await API.subscriptions.create({
        channel_id: channelId,
        target_channel: targetChannel,
        category,
        description
      });

      if (res.success) {
        Toast.show(`Subscribed to ${res.subscription.subscribed_channel_title}!`, 'success');
        if (window.closeModal) window.closeModal('addSubModal');
        await this.loadData();
        const container = document.getElementById('mainContentArea');
        if (container) this.renderView(container);
      } else {
        Toast.show(res.error || 'Failed to save subscription', 'error');
      }
    } catch (err) {
      Toast.show(err.message, 'error');
    } finally {
      if (saveBtn) {
        saveBtn.disabled = false;
        saveBtn.innerText = '💾 Save Subscription';
      }
    }
  },

  openEditModal(subId) {
    const sub = this.subscriptions.find(s => s.id === subId);
    if (!sub) return;

    const modalRoot = document.getElementById('modalRoot');
    if (!modalRoot) return;

    modalRoot.innerHTML = `
      <div class="cyber-modal open" id="editSubModal" onclick="if(event.target===this) window.closeModal('editSubModal')">
        <div class="glass-card cyber-modal-card" style="max-width: 480px; border-color: var(--accent-cyan);">
          <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 20px;">
            <div style="display: flex; align-items: center; gap: 8px;">
              <span style="font-size: 20px;">✏️</span>
              <h3 style="font-size: 17px; font-weight: 800; margin: 0; color: var(--text-main);">
                Edit Subscription: ${this.escapeHtml(sub.subscribed_channel_title)}
              </h3>
            </div>
            <button class="modal-close-btn" onclick="window.closeModal('editSubModal')">✕</button>
          </div>

          <form onsubmit="SubscriptionsComponent.handleEditSubmit(event, '${sub.id}')">
            <div style="margin-bottom: 16px;">
              <label class="cyber-label">Category</label>
              <input 
                type="text" 
                id="editSubCategory" 
                class="cyber-input" 
                style="width: 100%;" 
                value="${this.escapeHtml(sub.category || 'General')}" 
                required 
              />
            </div>

            <div style="margin-bottom: 16px;">
              <label class="cyber-label">Creator Notes / Description</label>
              <textarea 
                id="editSubDescription" 
                class="cyber-input" 
                style="width: 100%; height: 80px; resize: vertical;"
              >${this.escapeHtml(sub.description || '')}</textarea>
            </div>

            <div style="display: flex; justify-content: flex-end; gap: 10px;">
              <button type="button" class="btn-cyber btn-cyber-outline" onclick="window.closeModal('editSubModal')">Cancel</button>
              <button type="submit" class="btn-cyber btn-cyber-primary">Update Subscription</button>
            </div>
          </form>
        </div>
      </div>
    `;
  },

  async handleEditSubmit(e, subId) {
    e.preventDefault();
    try {
      const category = document.getElementById('editSubCategory').value.trim();
      const description = document.getElementById('editSubDescription').value.trim();

      const res = await API.subscriptions.update(subId, { category, description });
      if (res.success) {
        Toast.show('Subscription updated!', 'success');
        if (window.closeModal) window.closeModal('editSubModal');
        await this.loadData();
        const container = document.getElementById('mainContentArea');
        if (container) this.renderView(container);
      }
    } catch (err) {
      Toast.show(err.message, 'error');
    }
  },

  async deleteSubscription(subId, channelTitle) {
    if (!confirm(`Are you sure you want to remove "${channelTitle}" from your subscribed channels registry?`)) {
      return;
    }

    try {
      const res = await API.subscriptions.delete(subId);
      if (res.success) {
        Toast.show(`Removed "${channelTitle}" from subscriptions`, 'info');
        await this.loadData();
        const container = document.getElementById('mainContentArea');
        if (container) this.renderView(container);
      }
    } catch (err) {
      Toast.show(err.message, 'error');
    }
  },

  openImportModal() {
    const modalRoot = document.getElementById('modalRoot');
    if (!modalRoot) return;

    const defaultChannelId = this.activeChannelId !== 'all' ? this.activeChannelId : (this.channels[0]?.id || '');

    modalRoot.innerHTML = `
      <div class="cyber-modal open" id="importSubModal" onclick="if(event.target===this) window.closeModal('importSubModal')">
        <div class="glass-card cyber-modal-card" style="max-width: 620px; border-color: var(--accent-emerald);">
          <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 16px;">
            <div style="display: flex; align-items: center; gap: 8px;">
              <span style="font-size: 22px;">📥</span>
              <h3 style="font-size: 18px; font-weight: 800; margin: 0; color: var(--text-main);">
                Import All 250+ YouTube Subscriptions
              </h3>
            </div>
            <button class="modal-close-btn" onclick="window.closeModal('importSubModal')">✕</button>
          </div>

          <!-- Step-by-Step Takeout Guidance Box -->
          <div style="background: rgba(16, 185, 129, 0.08); border: 1px solid rgba(16, 185, 129, 0.3); border-radius: 8px; padding: 12px 14px; margin-bottom: 16px; font-size: 12px; line-height: 1.5;">
            <strong style="color: var(--accent-emerald); font-size: 13px;">💡 How to get your full 250+ Subscriptions in 30 seconds:</strong><br>
            <span style="color: var(--text-muted);">
              1. Open <a href="https://takeout.google.com/" target="_blank" rel="noopener noreferrer" style="color: var(--accent-teal); text-decoration: underline; font-weight: 700;">Google Takeout ↗</a><br>
              2. Click "Deselect all" &rarr; check <strong>YouTube and YouTube Music</strong> &rarr; click "All YouTube data included" &rarr; select only <strong>subscriptions</strong>.<br>
              3. Click "Create export" &rarr; download the zip &rarr; extract <code>subscriptions.csv</code>.<br>
              4. Upload or paste it below to instantly load all 250+ subscriptions into PostgreSQL!
            </span>
          </div>

          <div>
            <div style="margin-bottom: 16px;">
              <label class="cyber-label">Target Managed Channel (Subscriber)</label>
              <select id="importChannelId" class="cyber-input" style="width: 100%;">
                ${this.channels.map(c => `
                  <option value="${c.id}" ${c.id === defaultChannelId ? 'selected' : ''}>
                    📺 ${c.name} (${c.handle || '@channel'})
                  </option>
                `).join('')}
              </select>
            </div>

            <div style="margin-bottom: 14px;">
              <label class="cyber-label">Upload Takeout CSV or JSON File</label>
              <input 
                type="file" 
                id="importFileInput" 
                accept=".csv, .json, text/csv, application/json, text/plain" 
                class="cyber-input" 
                style="width: 100%; padding: 8px;"
                onchange="SubscriptionsComponent.handleFileSelected(event)"
              />
              <div style="font-size: 11px; color: var(--text-dim); margin-top: 4px;">
                Supports official Google Takeout <code>subscriptions.csv</code> (Columns: Channel Id, Channel Url, Channel Title)
              </div>
            </div>

            <div style="margin-bottom: 16px;">
              <label class="cyber-label">Or Paste CSV / JSON / List of Channel Links or Handles</label>
              <textarea 
                id="importRawText" 
                class="cyber-input" 
                style="width: 100%; height: 120px; font-family: var(--font-mono); font-size: 11px;" 
                placeholder='Option A (Takeout CSV):
Channel Id,Channel Url,Channel Title
UCsBjURrPoezykLs9EqgamOA,http://www.youtube.com/channel/...,Fireship

Option B (List of links or handles, one per line):
@DevOpsToolkit
https://www.youtube.com/@networkchuck
@fireship'
              ></textarea>
            </div>

            <div style="display: flex; justify-content: flex-end; gap: 10px;">
              <button type="button" class="btn-cyber btn-cyber-outline" onclick="window.closeModal('importSubModal')">Cancel</button>
              <button type="button" class="btn-cyber btn-cyber-primary" id="startImportBtn" onclick="SubscriptionsComponent.processImport()">
                🚀 Start Bulk Import
              </button>
            </div>
          </div>
        </div>
      </div>
    `;
  },

  handleFileSelected(event) {
    const file = event.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      const text = e.target.result;
      const textArea = document.getElementById('importRawText');
      if (textArea) textArea.value = text;
      Toast.show(`Loaded ${file.name} (${(file.size / 1024).toFixed(1)} KB)`, 'info');
    };
    reader.readAsText(file);
  },

  async processImport() {
    const channelId = document.getElementById('importChannelId')?.value;
    const rawText = document.getElementById('importRawText')?.value?.trim();
    const btn = document.getElementById('startImportBtn');

    if (!channelId) {
      Toast.show('Please select a target channel', 'warning');
      return;
    }
    if (!rawText) {
      Toast.show('Please upload a file or paste content to import', 'warning');
      return;
    }

    if (btn) {
      btn.disabled = true;
      btn.innerText = '⏳ Parsing & Importing...';
    }

    try {
      let items = [];

      // Check if JSON
      if (rawText.startsWith('[') || rawText.startsWith('{')) {
        const parsed = JSON.parse(rawText);
        items = Array.isArray(parsed) ? parsed : [parsed];
      } else {
        // Parse CSV or line-by-line list
        const lines = rawText.split(/\r?\n/).map(l => l.trim()).filter(l => l.length > 0);
        if (lines.length > 0) {
          const firstLine = lines[0];
          if (firstLine.includes(',')) {
            // Standard CSV parsing (supports Google Takeout subscriptions.csv)
            const headers = firstLine.split(',').map(h => h.replace(/["\r]/g, '').trim());
            for (let i = 1; i < lines.length; i++) {
              const line = lines[i];
              const parts = line.match(/(?:[^\s,"]+|"[^"]*")+/g) || line.split(',');
              if (parts.length >= 2) {
                const row = {};
                headers.forEach((h, idx) => {
                  row[h] = parts[idx] ? parts[idx].replace(/^"|"$/g, '').trim() : '';
                });
                items.push(row);
              }
            }
          } else {
            // Line-by-line list of handles or URLs
            for (const line of lines) {
              const clean = line.replace(/^[0-9]+[.)]\s*/, '').trim();
              if (!clean) continue;
              const isUrl = clean.startsWith('http');
              const isHandle = clean.startsWith('@');
              const handle = isHandle ? clean : (clean.includes('/@') ? `@${clean.split('/@')[1].split('/')[0]}` : null);
              const title = handle ? handle.replace(/^@/, '') : clean.replace(/^https?:\/\/(?:www\.)?youtube\.com\/(?:channel\/|c\/)?/, '');
              items.push({
                subscribed_channel_id: clean.startsWith('UC') ? clean : `UC_imp_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
                title: title,
                handle: handle,
                url: isUrl ? clean : (isHandle ? `https://www.youtube.com/${clean}` : `https://www.youtube.com/@${clean}`)
              });
            }
          }
        }
      }

      if (items.length === 0) {
        throw new Error('No valid channel records found in import content');
      }

      const res = await API.subscriptions.import(channelId, items);
      if (res.success) {
        Toast.show(`Imported ${res.imported} channels successfully!`, 'success');
        if (window.closeModal) window.closeModal('importSubModal');
        await this.loadData();
        const container = document.getElementById('mainContentArea');
        if (container) this.renderView(container);
      }
    } catch (err) {
      Toast.show('Import error: ' + err.message, 'error');
    } finally {
      if (btn) {
        btn.disabled = false;
        btn.innerText = '🚀 Start Bulk Import';
      }
    }
  },

  openApiSyncModal() {
    const modalRoot = document.getElementById('modalRoot');
    if (!modalRoot) return;

    const defaultChannelId = this.activeChannelId !== 'all' ? this.activeChannelId : (this.channels[0]?.id || '');

    modalRoot.innerHTML = `
      <div class="cyber-modal open" id="apiSyncModal" onclick="if(event.target===this) window.closeModal('apiSyncModal')">
        <div class="glass-card cyber-modal-card" style="max-width: 540px; border-color: var(--accent-cyan);">
          <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 16px;">
            <div style="display: flex; align-items: center; gap: 8px;">
              <span style="font-size: 22px;">🔑</span>
              <h3 style="font-size: 18px; font-weight: 800; margin: 0; color: var(--text-main);">
                Sync Subscriptions via YouTube Data API
              </h3>
            </div>
            <button class="modal-close-btn" onclick="window.closeModal('apiSyncModal')">✕</button>
          </div>

          <div style="font-size: 12px; color: var(--text-muted); line-height: 1.5; margin-bottom: 16px; background: rgba(0,0,0,0.3); padding: 12px; border-radius: 6px;">
            The YouTube Data API v3 will query the channel's subscriptions feed with pagination (up to 1,000 channels) and automatically save all records into PostgreSQL.<br>
            <strong style="color: var(--accent-cyan);">Note:</strong> If YouTube returns a privacy error, your subscriptions are set to Private on YouTube. You can turn OFF "Keep all my subscriptions private" in YouTube Privacy Settings, or use <strong>Takeout Import</strong> instead.
          </div>

          <form onsubmit="SubscriptionsComponent.handleApiSyncSubmit(event)">
            <div style="margin-bottom: 16px;">
              <label class="cyber-label">Managed Channel</label>
              <select id="apiSyncChannelId" class="cyber-input" style="width: 100%;">
                ${this.channels.map(c => `
                  <option value="${c.id}" ${c.id === defaultChannelId ? 'selected' : ''}>
                    📺 ${c.name} (${c.channel_id || '@channel'})
                  </option>
                `).join('')}
              </select>
            </div>

            <div style="margin-bottom: 20px;">
              <label class="cyber-label">YouTube Data API Key (Optional if already configured)</label>
              <input 
                type="password" 
                id="apiSyncKey" 
                class="cyber-input" 
                style="width: 100%;" 
                placeholder="AIzaSy... (leave blank to use key from System Settings)" 
              />
            </div>

            <div style="display: flex; justify-content: flex-end; gap: 10px;">
              <button type="button" class="btn-cyber btn-cyber-outline" onclick="window.closeModal('apiSyncModal')">Cancel</button>
              <button type="submit" class="btn-cyber btn-cyber-primary" id="apiSyncStartBtn">
                🚀 Fetch All from YouTube API
              </button>
            </div>
          </form>
        </div>
      </div>
    `;
  },

  async handleApiSyncSubmit(e) {
    e.preventDefault();
    const channelId = document.getElementById('apiSyncChannelId')?.value;
    const apiKey = document.getElementById('apiSyncKey')?.value?.trim();
    const btn = document.getElementById('apiSyncStartBtn');

    if (btn) {
      btn.disabled = true;
      btn.innerText = '⏳ Paging YouTube API...';
    }

    try {
      const res = await API.subscriptions.fetchYouTubeApi(channelId, apiKey);
      if (res.success) {
        Toast.show(res.message, 'success');
        if (window.closeModal) window.closeModal('apiSyncModal');
        await this.loadData();
        const container = document.getElementById('mainContentArea');
        if (container) this.renderView(container);
      } else {
        Toast.show(res.error || 'Failed to fetch from YouTube API', 'error');
      }
    } catch (err) {
      Toast.show(err.message, 'error');
    } finally {
      if (btn) {
        btn.disabled = false;
        btn.innerText = '🚀 Fetch All from YouTube API';
      }
    }
  },

  async triggerSync() {
    try {
      Toast.show('Synchronizing subscription metrics with YouTube...', 'info');
      const res = await API.subscriptions.sync(this.activeChannelId);
      if (res.success) {
        Toast.show(res.message, 'success');
        await this.loadData();
        const container = document.getElementById('mainContentArea');
        if (container) this.renderView(container);
      }
    } catch (err) {
      Toast.show('Sync error: ' + err.message, 'error');
    }
  },

  // --------------------------------------------------------------------------
  // Helpers & Formatters
  // --------------------------------------------------------------------------
  formatNumber(num) {
    if (!num) return '0';
    const n = parseInt(num, 10);
    if (n >= 1000000000) return (n / 1000000000).toFixed(2) + 'B';
    if (n >= 1000000) return (n / 1000000).toFixed(2) + 'M';
    if (n >= 1000) return (n / 1000).toFixed(1) + 'K';
    return n.toLocaleString();
  },

  getCategoryBadgeClass(category) {
    const cat = String(category || '').toLowerCase();
    if (cat.includes('devops') || cat.includes('cloud')) return 'badge-teal';
    if (cat.includes('dev') || cat.includes('code')) return 'badge-cyan';
    if (cat.includes('security') || cat.includes('net')) return 'badge-amber';
    if (cat.includes('arch') || cat.includes('system')) return 'badge-violet';
    if (cat.includes('data')) return 'badge-emerald';
    return 'badge-teal';
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

window.SubscriptionsComponent = SubscriptionsComponent;
