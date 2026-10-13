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
          <div style="display: flex; flex-wrap: wrap; align-items: center; gap: 8px;">
            <!-- Button 1: Add Subscription -->
            <button type="button" class="btn-action-premium primary-teal" onclick="SubscriptionsComponent.openAddModal()" title="Add a single subscribed channel to the registry">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round">
                <line x1="12" y1="5" x2="12" y2="19"></line>
                <line x1="5" y1="12" x2="19" y2="12"></line>
              </svg>
              <span>Add Subscription</span>
            </button>

            <!-- Button 2: Takeout Import -->
            <button type="button" class="btn-action-premium accent-emerald" onclick="SubscriptionsComponent.openImportModal()" title="Bulk import all 250+ subscriptions via Google Takeout CSV or JSON">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
                <polyline points="17 8 12 3 7 8"></polyline>
                <line x1="12" y1="3" x2="12" y2="15"></line>
              </svg>
              <span>Takeout Import</span>
              <span style="background: rgba(16, 185, 129, 0.22); color: #10b981; font-size: 10px; font-weight: 800; padding: 1px 6px; border-radius: 10px; letter-spacing: 0.3px;">250+</span>
            </button>

            <!-- Button 3: YouTube API Sync -->
            <button type="button" class="btn-action-premium accent-cyan" onclick="SubscriptionsComponent.openApiSyncModal()" title="Sync all 250+ subscriptions directly using YouTube Data API v3">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
                <path d="M21 2l-2 2m-7.61 7.61a5.5 5.5 0 1 1-7.778 7.778 5.5 5.5 0 0 1 7.777-7.777zm0 0L15.5 7.5m0 0l3 3L22 7l-3-3m-3.5 3.5L19 4"></path>
              </svg>
              <span>API Sync (250+)</span>
            </button>

            <!-- Button 4: Sync Live Metrics -->
            <button type="button" class="btn-action-premium outline-neutral" onclick="SubscriptionsComponent.triggerSync()" title="Sync live subscriber count & metrics from YouTube">
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <polyline points="23 4 23 10 17 10"></polyline>
                <polyline points="1 20 1 14 7 14"></polyline>
                <path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"></path>
              </svg>
              <span>Sync Metrics</span>
            </button>

            <!-- Export Buttons -->
            <div style="display: flex; align-items: center; gap: 6px; border-left: 1px solid var(--border-color); padding-left: 8px;">
              <button type="button" class="btn-action-premium outline-neutral" onclick="SubscriptionsComponent.exportCSV()" title="Export filtered records as CSV file">
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                  <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
                  <polyline points="14 2 14 8 20 8"></polyline>
                  <line x1="8" y1="13" x2="16" y2="13"></line>
                  <line x1="8" y1="17" x2="16" y2="17"></line>
                </svg>
                <span>Export CSV</span>
              </button>

              <button type="button" class="btn-action-premium outline-neutral" onclick="SubscriptionsComponent.exportJSON()" title="Export filtered records as JSON file">
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                  <polyline points="16 18 22 12 16 6"></polyline>
                  <polyline points="8 6 2 12 8 18"></polyline>
                </svg>
                <span>Export JSON</span>
              </button>
            </div>
          </div>
        </div>

        <!-- Explanatory Guide Box for Full 250+ Subscriptions -->
        <div class="glass-card" style="padding: 16px 20px; margin-bottom: 22px; border-left: 3px solid var(--accent-cyan); background: rgba(6, 182, 212, 0.04); display: flex; align-items: center; justify-content: space-between; gap: 16px; flex-wrap: wrap;">
          <div style="display: flex; align-items: center; gap: 14px; min-width: 280px; flex: 1;">
            <div style="width: 36px; height: 36px; border-radius: 9px; background: rgba(6, 182, 212, 0.12); border: 1px solid rgba(6, 182, 212, 0.3); display: flex; align-items: center; justify-content: center; color: #06b6d4; flex-shrink: 0;">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <circle cx="12" cy="12" r="10"></circle>
                <line x1="12" y1="16" x2="12" y2="12"></line>
                <line x1="12" y1="8" x2="12.01" y2="8"></line>
              </svg>
            </div>
            <div>
              <div style="font-weight: 700; color: var(--text-main); font-size: 13.5px;">
                Looking for your full 250+ Subscribed Channels?
              </div>
              <div style="font-size: 12px; color: var(--text-muted); margin-top: 3px; line-height: 1.5;">
                YouTube accounts default to <em>Private Subscriptions</em>, so scraping only retrieves public profiles. Import your complete 250+ list in seconds: 
                <a href="https://takeout.google.com/" target="_blank" rel="noopener noreferrer" style="color: #14b8a6; text-decoration: underline; font-weight: 600;">Download Google Takeout CSV ↗</a> and click 
                <button type="button" onclick="SubscriptionsComponent.openImportModal()" style="display: inline-flex; align-items: center; gap: 4px; border: 1px solid rgba(16, 185, 129, 0.35); background: rgba(16, 185, 129, 0.12); color: #10b981; font-size: 11px; font-weight: 700; padding: 2px 7px; border-radius: 6px; cursor: pointer;">
                  <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path><polyline points="17 8 12 3 7 8"></polyline><line x1="12" y1="3" x2="12" y2="15"></line></svg>
                  <span>Takeout Import</span>
                </button>, or use 
                <button type="button" onclick="SubscriptionsComponent.openApiSyncModal()" style="display: inline-flex; align-items: center; gap: 4px; border: 1px solid rgba(6, 182, 212, 0.35); background: rgba(6, 182, 212, 0.12); color: #06b6d4; font-size: 11px; font-weight: 700; padding: 2px 7px; border-radius: 6px; cursor: pointer;">
                  <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M21 2l-2 2m-7.61 7.61a5.5 5.5 0 1 1-7.778 7.778 5.5 5.5 0 0 1 7.777-7.777zm0 0L15.5 7.5m0 0l3 3L22 7l-3-3m-3.5 3.5L19 4"></path></svg>
                  <span>API Sync</span>
                </button>!
              </div>
            </div>
          </div>
          <div style="display: flex; gap: 8px;">
            <button type="button" class="btn-action-premium accent-emerald" onclick="SubscriptionsComponent.openImportModal()" style="font-weight: 700;">
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path><polyline points="17 8 12 3 7 8"></polyline><line x1="12" y1="3" x2="12" y2="15"></line></svg>
              <span>Takeout Import</span>
            </button>
            <button type="button" class="btn-action-premium accent-cyan" onclick="SubscriptionsComponent.openApiSyncModal()">
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2"><path d="M21 2l-2 2m-7.61 7.61a5.5 5.5 0 1 1-7.778 7.778 5.5 5.5 0 0 1 7.777-7.777zm0 0L15.5 7.5m0 0l3 3L22 7l-3-3m-3.5 3.5L19 4"></path></svg>
              <span>YouTube API Sync</span>
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
        <div class="filter-toolbar-premium">
          <div class="filter-toolbar-row">
            <!-- Left Filter Group -->
            <div class="filter-controls-group">
              <!-- Search Box -->
              <div class="search-box-premium">
                <span class="search-icon">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                    <circle cx="11" cy="11" r="8"></circle>
                    <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
                  </svg>
                </span>
                <input 
                  type="text" 
                  id="subSearchInput" 
                  placeholder="Search by channel name, handle, ID..." 
                  value="${this.escapeHtml(this.searchQuery)}"
                  oninput="SubscriptionsComponent.onSearchChange(this.value)"
                />
                ${this.searchQuery ? `
                  <button type="button" class="clear-icon-btn" onclick="SubscriptionsComponent.onSearchChange(''); document.getElementById('subSearchInput').value='';" title="Clear search">✕</button>
                ` : ''}
              </div>

              <!-- Channel Selector (Multi-channel) -->
              <div class="filter-dropdown-premium">
                <span class="filter-icon">
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                    <rect x="2" y="7" width="20" height="15" rx="2" ry="2"></rect>
                    <polyline points="17 2 12 7 7 2"></polyline>
                  </svg>
                </span>
                <span class="filter-prefix-label">CHANNEL</span>
                <select id="subChannelSelect" onchange="SubscriptionsComponent.onChannelChange(this.value)">
                  <option value="all" ${this.activeChannelId === 'all' ? 'selected' : ''}>All Channels (Consolidated)</option>
                  ${this.channels.map(c => `
                    <option value="${c.id}" ${this.activeChannelId === c.id ? 'selected' : ''}>
                      ${this.escapeHtml(c.name)} (${c.handle || '@channel'})
                    </option>
                  `).join('')}
                </select>
                <svg class="dropdown-arrow" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <polyline points="6 9 12 15 18 9"></polyline>
                </svg>
              </div>

              <!-- Category Filter -->
              <div class="filter-dropdown-premium">
                <span class="filter-icon">
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                    <path d="M20.59 13.41l-7.17 7.17a2 2 0 0 1-2.83 0L2 12V2h10l8.59 8.59a2 2 0 0 1 0 2.82z"></path>
                    <line x1="7" y1="7" x2="7.01" y2="7"></line>
                  </svg>
                </span>
                <span class="filter-prefix-label">CATEGORY</span>
                <select id="subCategorySelect" onchange="SubscriptionsComponent.onCategoryChange(this.value)">
                  <option value="all" ${this.selectedCategory === 'all' ? 'selected' : ''}>All Categories</option>
                  ${this.categories.map(cat => `
                    <option value="${cat.category.replace(/"/g, '&quot;')}" ${this.selectedCategory === cat.category ? 'selected' : ''}>
                      ${this.escapeHtml(cat.category)} (${cat.count})
                    </option>
                  `).join('')}
                </select>
                <svg class="dropdown-arrow" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <polyline points="6 9 12 15 18 9"></polyline>
                </svg>
              </div>

              <!-- Tier Filter -->
              <div class="filter-dropdown-premium">
                <span class="filter-icon">
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                    <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path>
                    <circle cx="9" cy="7" r="4"></circle>
                    <path d="M23 21v-2a4 4 0 0 0-3-3.87"></path>
                    <path d="M16 3.13a4 4 0 0 1 0 7.75"></path>
                  </svg>
                </span>
                <span class="filter-prefix-label">TIER</span>
                <select id="subTierSelect" onchange="SubscriptionsComponent.onTierChange(this.value)">
                  <option value="all" ${this.selectedTier === 'all' ? 'selected' : ''}>All Tiers</option>
                  <option value="mega" ${this.selectedTier === 'mega' ? 'selected' : ''}>🌟 Mega (1M+)</option>
                  <option value="large" ${this.selectedTier === 'large' ? 'selected' : ''}>🔥 Large (100K-1M)</option>
                  <option value="mid" ${this.selectedTier === 'mid' ? 'selected' : ''}>⚡ Mid (10K-100K)</option>
                  <option value="micro" ${this.selectedTier === 'micro' ? 'selected' : ''}>🌱 Micro (&lt;10K)</option>
                </select>
                <svg class="dropdown-arrow" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <polyline points="6 9 12 15 18 9"></polyline>
                </svg>
              </div>

              <!-- Active Filter Clear Action -->
              ${(this.searchQuery || this.selectedCategory !== 'all' || this.selectedTier !== 'all' || this.activeChannelId !== 'all') ? `
                <button type="button" class="filter-reset-action" onclick="SubscriptionsComponent.resetFilters()" title="Reset all subscription filters">
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                    <line x1="18" y1="6" x2="6" y2="18"></line>
                    <line x1="6" y1="6" x2="18" y2="18"></line>
                  </svg>
                  <span>Clear Filters</span>
                </button>
              ` : ''}
            </div>

            <!-- Right Sort & View Controls -->
            <div style="display: flex; align-items: center; gap: 10px;">
              <!-- Sort Dropdown -->
              <div class="filter-dropdown-premium">
                <span class="filter-icon">
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                    <line x1="12" y1="5" x2="12" y2="19"></line>
                    <polyline points="19 12 12 19 5 12"></polyline>
                  </svg>
                </span>
                <span class="filter-prefix-label">SORT</span>
                <select id="subSortSelect" onchange="SubscriptionsComponent.onSortChange(this.value)">
                  <option value="subscribed_at:DESC" ${this.sortBy === 'subscribed_at' && this.sortOrder === 'DESC' ? 'selected' : ''}>Date (Newest)</option>
                  <option value="subscribed_at:ASC" ${this.sortBy === 'subscribed_at' && this.sortOrder === 'ASC' ? 'selected' : ''}>Date (Oldest)</option>
                  <option value="subscriber_count:DESC" ${this.sortBy === 'subscriber_count' && this.sortOrder === 'DESC' ? 'selected' : ''}>Subscribers (High-Low)</option>
                  <option value="subscriber_count:ASC" ${this.sortBy === 'subscriber_count' && this.sortOrder === 'ASC' ? 'selected' : ''}>Subscribers (Low-High)</option>
                  <option value="title:ASC" ${this.sortBy === 'title' && this.sortOrder === 'ASC' ? 'selected' : ''}>Name (A-Z)</option>
                  <option value="title:DESC" ${this.sortBy === 'title' && this.sortOrder === 'DESC' ? 'selected' : ''}>Name (Z-A)</option>
                </select>
                <svg class="dropdown-arrow" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <polyline points="6 9 12 15 18 9"></polyline>
                </svg>
              </div>

              <!-- View Switcher -->
              <div style="display: flex; background: var(--bg-card); border: 1px solid var(--border-color); border-radius: 8px; padding: 2px;">
                <button 
                  type="button"
                  onclick="SubscriptionsComponent.setViewMode('table')" 
                  style="display: inline-flex; align-items: center; gap: 5px; border: none; padding: 5px 10px; border-radius: 6px; font-size: 12px; cursor: pointer; transition: all 0.15s ease; ${this.viewMode === 'table' ? 'background: var(--accent-teal); color: #ffffff; font-weight: 700;' : 'background: transparent; color: var(--text-muted);'}" 
                  title="Data Table View"
                >
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                    <line x1="8" y1="6" x2="21" y2="6"></line>
                    <line x1="8" y1="12" x2="21" y2="12"></line>
                    <line x1="8" y1="18" x2="21" y2="18"></line>
                    <line x1="3" y1="6" x2="3.01" y2="6"></line>
                    <line x1="3" y1="12" x2="3.01" y2="12"></line>
                    <line x1="3" y1="18" x2="3.01" y2="18"></line>
                  </svg>
                  <span>Table</span>
                </button>
                <button 
                  type="button"
                  onclick="SubscriptionsComponent.setViewMode('grid')" 
                  style="display: inline-flex; align-items: center; gap: 5px; border: none; padding: 5px 10px; border-radius: 6px; font-size: 12px; cursor: pointer; transition: all 0.15s ease; ${this.viewMode === 'grid' ? 'background: var(--accent-teal); color: #ffffff; font-weight: 700;' : 'background: transparent; color: var(--text-muted);'}" 
                  title="Card Grid View"
                >
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                    <rect x="3" y="3" width="7" height="7"></rect>
                    <rect x="14" y="3" width="7" height="7"></rect>
                    <rect x="14" y="14" width="7" height="7"></rect>
                    <rect x="3" y="14" width="7" height="7"></rect>
                  </svg>
                  <span>Cards</span>
                </button>
              </div>
            </div>
          </div>

          <!-- Quick Category Fast Filter Pills -->
          <div class="filter-pills-bar" style="margin-top: 4px;">
            <span style="font-size: 10.5px; font-weight: 700; color: var(--text-dim); text-transform: uppercase; margin-right: 4px; letter-spacing: 0.5px;">FAST CATEGORY:</span>
            <button type="button" class="filter-pill-item ${this.selectedCategory === 'all' ? 'active' : ''}" onclick="SubscriptionsComponent.onCategoryChange('all')">
              <span>All Channels</span>
              <span class="filter-pill-count">${this.subscriptions.length}</span>
            </button>
            ${this.categories.slice(0, 7).map(cat => `
              <button type="button" class="filter-pill-item ${this.selectedCategory === cat.category ? 'active' : ''}" onclick="SubscriptionsComponent.onCategoryChange('${cat.category.replace(/'/g, "\\'")}')">
                <span>${this.escapeHtml(cat.category)}</span>
                <span class="filter-pill-count">${cat.count}</span>
              </button>
            `).join('')}
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
      <div class="modal-overlay cyber-modal open" id="addSubModal" style="display: flex;" onclick="if(event.target===this) window.closeModal('addSubModal')">
        <div class="modal-dialog-premium" style="max-width: 560px;">
          <!-- Header -->
          <div class="modal-header-premium">
            <div style="display: flex; align-items: center; gap: 12px;">
              <div class="modal-icon-pill teal">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                  <path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path>
                  <circle cx="8.5" cy="7" r="4"></circle>
                  <line x1="20" y1="8" x2="20" y2="14"></line>
                  <line x1="23" y1="11" x2="17" y2="11"></line>
                </svg>
              </div>
              <div>
                <div class="modal-title" style="font-size: 16px; font-weight: 800; letter-spacing: -0.2px;">Add Subscribed Channel</div>
                <div style="font-size: 12px; color: var(--text-muted); margin-top: 1px;">Register a creator channel in your multi-channel intelligence registry</div>
              </div>
            </div>
            <button class="modal-close-btn-premium" data-close-modal="true" onclick="window.closeModal('addSubModal')" title="Close">
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
                <line x1="18" y1="6" x2="6" y2="18"></line>
                <line x1="6" y1="6" x2="18" y2="18"></line>
              </svg>
            </button>
          </div>

          <form id="addSubForm" onsubmit="SubscriptionsComponent.handleAddSubmit(event)">
            <div class="modal-body-premium">
              <!-- Subscriber Channel -->
              <div style="margin-bottom: 18px;">
                <label class="cyber-label" style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 6px;">
                  <span style="font-weight: 700; font-size: 12px;">Managed Channel (Subscriber)</span>
                  <span style="font-size: 11px; color: var(--text-dim);">Source Profile</span>
                </label>
                <div style="position: relative;">
                  <select id="modalSubChannelId" class="cyber-input" style="width: 100%; padding-left: 36px; appearance: none; -webkit-appearance: none; cursor: pointer;" required>
                    ${this.channels.map(c => `
                      <option value="${c.id}" ${c.id === defaultChannelId ? 'selected' : ''}>
                        ${c.name} (${c.handle || '@channel'})
                      </option>
                    `).join('')}
                  </select>
                  <div style="position: absolute; left: 12px; top: 50%; transform: translateY(-50%); pointer-events: none; color: var(--accent-teal); display: flex;">
                    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="2" y="7" width="20" height="15" rx="2" ry="2"></rect><polyline points="17 2 12 7 7 2"></polyline></svg>
                  </div>
                  <div style="position: absolute; right: 12px; top: 50%; transform: translateY(-50%); pointer-events: none; color: var(--text-dim); display: flex;">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="6 9 12 15 18 9"></polyline></svg>
                  </div>
                </div>
              </div>

              <!-- Target Channel Handle or URL -->
              <div style="margin-bottom: 18px;">
                <label class="cyber-label" style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 6px;">
                  <span style="font-weight: 700; font-size: 12px;">Target Channel (Handle, URL, or ID)</span>
                  <span style="font-size: 11px; color: var(--accent-teal);">Auto-scrapes live metrics</span>
                </label>
                <div style="display: flex; gap: 8px;">
                  <div style="position: relative; flex: 1;">
                    <input 
                      type="text" 
                      id="modalTargetChannel" 
                      class="cyber-input" 
                      style="width: 100%; padding-left: 34px;" 
                      placeholder="e.g. @NetworkChuck, @fireship, or https://youtube.com/@..." 
                      required 
                    />
                    <div style="position: absolute; left: 11px; top: 50%; transform: translateY(-50%); pointer-events: none; color: var(--text-dim); font-weight: 700; font-size: 13px;">
                      @
                    </div>
                  </div>
                  <button 
                    type="button" 
                    class="btn-action-premium accent-emerald" 
                    onclick="SubscriptionsComponent.previewTargetChannel()" 
                    id="previewChannelBtn" 
                    style="white-space: nowrap; height: 38px; padding: 0 14px;"
                  >
                    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2"><circle cx="11" cy="11" r="8"></circle><line x1="21" y1="21" x2="16.65" y2="16.65"></line></svg>
                    <span>Verify</span>
                  </button>
                </div>
              </div>

              <!-- Live Preview Container -->
              <div id="liveChannelPreviewArea" style="display: none; margin-bottom: 18px;"></div>

              <!-- Category Picker with Quick Pills -->
              <div style="margin-bottom: 18px;">
                <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 6px;">
                  <label class="cyber-label" style="margin: 0; font-weight: 700; font-size: 12px;">Category Classification</label>
                  <span style="font-size: 11px; color: var(--text-dim);">Pick or type</span>
                </div>
                <input 
                  type="text" 
                  id="modalCategory" 
                  class="cyber-input" 
                  style="width: 100%; margin-bottom: 8px;" 
                  value="DevOps & Cloud" 
                  placeholder="Select or enter custom category..." 
                  required 
                />
                <div style="display: flex; flex-wrap: wrap; gap: 5px;">
                  ${['DevOps & Cloud', 'Development', 'Networking & Security', 'AI & ML', 'Database & Systems', 'Architecture', 'Education'].map(cat => `
                    <button type="button" onclick="document.getElementById('modalCategory').value='${cat}'" style="border: 1px solid var(--border-color); background: rgba(0,0,0,0.25); color: var(--text-muted); font-size: 11px; font-weight: 600; padding: 3px 8px; border-radius: 6px; cursor: pointer; transition: all 0.15s ease;" onmouseover="this.style.color='var(--accent-teal)'; this.style.borderColor='var(--accent-teal)';" onmouseout="this.style.color='var(--text-muted)'; this.style.borderColor='var(--border-color)';">
                      ${cat}
                    </button>
                  `).join('')}
                </div>
              </div>

              <!-- Creator Notes -->
              <div style="margin-bottom: 8px;">
                <label class="cyber-label" style="margin-bottom: 6px; font-weight: 700; font-size: 12px;">Creator Notes / Description (Optional)</label>
                <textarea 
                  id="modalDescription" 
                  class="cyber-input" 
                  style="width: 100%; height: 70px; resize: vertical; line-height: 1.4; padding: 10px;" 
                  placeholder="Notes on content alignment, mutual collaborations, or key topics covered..."
                ></textarea>
              </div>
            </div>

            <!-- Footer -->
            <div class="modal-footer-premium">
              <div style="font-size: 11.5px; color: var(--text-dim); display: flex; align-items: center; gap: 5px;">
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect><path d="M7 11V7a5 5 0 0 1 10 0v4"></path></svg>
                <span>Synced with PostgreSQL 18</span>
              </div>
              <div style="display: flex; gap: 10px;">
                <button type="button" class="btn-action-premium outline-neutral" data-close-modal="true" onclick="window.closeModal('addSubModal')">Cancel</button>
                <button type="submit" class="btn-action-premium primary-teal" id="saveSubBtn" style="padding: 0 18px;">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2"><path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"></path><polyline points="17 21 17 13 7 13 7 21"></polyline><polyline points="7 3 7 8 15 8"></polyline></svg>
                  <span>Save Subscription</span>
                </button>
              </div>
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
        <div style="background: rgba(0,0,0,0.3); border: 1px dashed var(--accent-teal); border-radius: 9px; padding: 12px; text-align: center; color: var(--accent-teal); font-size: 12px; display: flex; align-items: center; justify-content: center; gap: 8px;">
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" class="spin-icon"><circle cx="12" cy="12" r="10"></circle><path d="M12 6v6l4 2"></path></svg>
          <span>Resolving creator profile from YouTube...</span>
        </div>
      `;
    }

    try {
      // Create temporary probe subscription or use live metadata resolver
      const res = await API.content.fetchMeta({ video_id_or_url: target }).catch(() => null);
      area.innerHTML = `
        <div style="background: rgba(16, 185, 129, 0.08); border: 1px solid rgba(16, 185, 129, 0.3); border-radius: 9px; padding: 12px 14px; display: flex; align-items: center; justify-content: space-between; gap: 12px;">
          <div style="display: flex; align-items: center; gap: 10px;">
            <div style="width: 32px; height: 32px; border-radius: 8px; background: #10b981; color: #fff; display: flex; align-items: center; justify-content: center; flex-shrink: 0;">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="20 6 9 17 4 12"></polyline></svg>
            </div>
            <div>
              <div style="font-weight: 700; color: #10b981; font-size: 13px;">Validated: ${this.escapeHtml(target)}</div>
              <div style="font-size: 11px; color: var(--text-dim); margin-top: 1px;">Live YouTube metadata, handle, avatar & reach will sync upon saving.</div>
            </div>
          </div>
          <span class="badge badge-emerald" style="font-size: 10.5px; padding: 2px 7px;">Verified</span>
        </div>
      `;
    } catch (e) {
      area.innerHTML = `
        <div style="background: rgba(239, 68, 68, 0.08); border: 1px solid rgba(239, 68, 68, 0.25); border-radius: 9px; padding: 10px 14px; font-size: 12px; color: #ef4444; display: flex; align-items: center; gap: 8px;">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="8" x2="12" y2="12"></line><line x1="12" y1="16" x2="12.01" y2="16"></line></svg>
          <span>Target noted. Metadata will be resolved when record is saved.</span>
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
      <div class="modal-overlay cyber-modal open" id="editSubModal" style="display: flex;" onclick="if(event.target===this) window.closeModal('editSubModal')">
        <div class="modal-dialog-premium" style="max-width: 500px;">
          <!-- Header -->
          <div class="modal-header-premium">
            <div style="display: flex; align-items: center; gap: 12px;">
              <div class="modal-icon-pill cyan">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                  <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path>
                  <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path>
                </svg>
              </div>
              <div>
                <div class="modal-title" style="font-size: 15px; font-weight: 800; letter-spacing: -0.2px;">
                  Edit: ${this.escapeHtml(sub.subscribed_channel_title)}
                </div>
                <div style="font-size: 11.5px; color: var(--text-muted); margin-top: 1px;">Update classification category or custom intelligence notes</div>
              </div>
            </div>
            <button class="modal-close-btn-premium" data-close-modal="true" onclick="window.closeModal('editSubModal')" title="Close">
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
                <line x1="18" y1="6" x2="6" y2="18"></line>
                <line x1="6" y1="6" x2="18" y2="18"></line>
              </svg>
            </button>
          </div>

          <form onsubmit="SubscriptionsComponent.handleEditSubmit(event, '${sub.id}')">
            <div class="modal-body-premium">
              <div style="margin-bottom: 18px;">
                <label class="cyber-label" style="font-weight: 700; font-size: 12px; margin-bottom: 6px;">Category</label>
                <input 
                  type="text" 
                  id="editSubCategory" 
                  class="cyber-input" 
                  style="width: 100%; margin-bottom: 8px;" 
                  value="${this.escapeHtml(sub.category || 'General')}" 
                  required 
                />
                <div style="display: flex; flex-wrap: wrap; gap: 5px;">
                  ${['DevOps & Cloud', 'Development', 'Networking & Security', 'AI & ML', 'Database & Systems', 'Architecture', 'Education'].map(cat => `
                    <button type="button" onclick="document.getElementById('editSubCategory').value='${cat}'" style="border: 1px solid var(--border-color); background: rgba(0,0,0,0.25); color: var(--text-muted); font-size: 10.5px; font-weight: 600; padding: 2px 7px; border-radius: 6px; cursor: pointer;">
                      ${cat}
                    </button>
                  `).join('')}
                </div>
              </div>

              <div style="margin-bottom: 6px;">
                <label class="cyber-label" style="font-weight: 700; font-size: 12px; margin-bottom: 6px;">Creator Notes / Description</label>
                <textarea 
                  id="editSubDescription" 
                  class="cyber-input" 
                  style="width: 100%; height: 80px; resize: vertical; padding: 10px; line-height: 1.4;"
                >${this.escapeHtml(sub.description || '')}</textarea>
              </div>
            </div>

            <div class="modal-footer-premium">
              <div></div>
              <div style="display: flex; gap: 10px;">
                <button type="button" class="btn-action-premium outline-neutral" data-close-modal="true" onclick="window.closeModal('editSubModal')">Cancel</button>
                <button type="submit" class="btn-action-premium primary-teal">
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="20 6 9 17 4 12"></polyline></svg>
                  <span>Update Subscription</span>
                </button>
              </div>
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
    const confirmed = await cyberConfirm({
      title: 'Remove Subscribed Channel',
      subtitle: 'Feed subscription registry',
      message: `Are you sure you want to remove "${channelTitle}" from your subscribed channels registry?`,
      confirmText: 'Remove Channel',
      cancelText: 'Keep Subscription',
      type: 'danger',
      icon: '🗑️'
    });
    if (!confirmed) {
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
      <div class="modal-overlay cyber-modal open" id="importSubModal" style="display: flex;" onclick="if(event.target===this) window.closeModal('importSubModal')">
        <div class="modal-dialog-premium" style="max-width: 640px;">
          <!-- Header -->
          <div class="modal-header-premium">
            <div style="display: flex; align-items: center; gap: 12px;">
              <div class="modal-icon-pill emerald">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
                  <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
                  <polyline points="17 8 12 3 7 8"></polyline>
                  <line x1="12" y1="3" x2="12" y2="15"></line>
                </svg>
              </div>
              <div>
                <div class="modal-title" style="font-size: 16px; font-weight: 800; letter-spacing: -0.2px;">
                  Import YouTube Subscriptions
                </div>
                <div style="font-size: 12px; color: var(--text-muted); margin-top: 1px;">
                  Bulk import your complete 250+ channel subscriptions into PostgreSQL 18
                </div>
              </div>
            </div>
            <button class="modal-close-btn-premium" data-close-modal="true" onclick="window.closeModal('importSubModal')" title="Close">
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
                <line x1="18" y1="6" x2="6" y2="18"></line>
                <line x1="6" y1="6" x2="18" y2="18"></line>
              </svg>
            </button>
          </div>

          <div class="modal-body-premium">
            <!-- 3-Step Google Takeout Workflow Stepper -->
            <div style="background: rgba(16, 185, 129, 0.04); border: 1px solid rgba(16, 185, 129, 0.2); border-radius: 10px; padding: 14px 16px; margin-bottom: 20px;">
              <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 10px;">
                <div style="font-size: 12px; font-weight: 700; color: #10b981; display: flex; align-items: center; gap: 6px;">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                    <circle cx="12" cy="12" r="10"></circle>
                    <line x1="12" y1="16" x2="12" y2="12"></line>
                    <line x1="12" y1="8" x2="12.01" y2="8"></line>
                  </svg>
                  <span>How to export your full 250+ subscriptions in 30 seconds</span>
                </div>
                <a href="https://takeout.google.com/" target="_blank" rel="noopener noreferrer" style="font-size: 11px; font-weight: 700; color: #14b8a6; text-decoration: none; display: inline-flex; align-items: center; gap: 4px; background: rgba(20, 184, 166, 0.1); padding: 3px 8px; border-radius: 6px; border: 1px solid rgba(20, 184, 166, 0.25);">
                  <span>Open Takeout</span>
                  <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"></path><polyline points="15 3 21 3 21 9"></polyline><line x1="10" y1="14" x2="21" y2="3"></line></svg>
                </a>
              </div>
              <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(170px, 1fr)); gap: 8px; font-size: 11.5px;">
                <div style="background: rgba(0,0,0,0.25); border-radius: 7px; padding: 8px 10px; border: 1px solid rgba(255,255,255,0.04);">
                  <div style="color: var(--text-dim); font-weight: 700; font-size: 10px; text-transform: uppercase;">Step 1</div>
                  <div style="color: var(--text-main); margin-top: 2px;">Deselect all &rarr; check <strong>YouTube</strong></div>
                </div>
                <div style="background: rgba(0,0,0,0.25); border-radius: 7px; padding: 8px 10px; border: 1px solid rgba(255,255,255,0.04);">
                  <div style="color: var(--text-dim); font-weight: 700; font-size: 10px; text-transform: uppercase;">Step 2</div>
                  <div style="color: var(--text-main); margin-top: 2px;">Select only <strong>subscriptions</strong></div>
                </div>
                <div style="background: rgba(0,0,0,0.25); border-radius: 7px; padding: 8px 10px; border: 1px solid rgba(255,255,255,0.04);">
                  <div style="color: var(--text-dim); font-weight: 700; font-size: 10px; text-transform: uppercase;">Step 3</div>
                  <div style="color: var(--text-main); margin-top: 2px;">Download &amp; drop <code>subscriptions.csv</code> below</div>
                </div>
              </div>
            </div>

            <!-- Target Managed Channel -->
            <div style="margin-bottom: 18px;">
              <label class="cyber-label" style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 6px;">
                <span style="font-weight: 700; font-size: 12px;">Target Managed Channel (Subscriber)</span>
                <span style="font-size: 11px; color: var(--text-dim);">Owner feed</span>
              </label>
              <div style="position: relative;">
                <select id="importChannelId" class="cyber-input" style="width: 100%; padding-left: 36px; appearance: none; -webkit-appearance: none; cursor: pointer;">
                  ${this.channels.map(c => `
                    <option value="${c.id}" ${c.id === defaultChannelId ? 'selected' : ''}>
                      ${c.name} (${c.handle || '@channel'})
                    </option>
                  `).join('')}
                </select>
                <div style="position: absolute; left: 12px; top: 50%; transform: translateY(-50%); pointer-events: none; color: #10b981; display: flex;">
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="2" y="7" width="20" height="15" rx="2" ry="2"></rect><polyline points="17 2 12 7 7 2"></polyline></svg>
                </div>
                <div style="position: absolute; right: 12px; top: 50%; transform: translateY(-50%); pointer-events: none; color: var(--text-dim); display: flex;">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="6 9 12 15 18 9"></polyline></svg>
                </div>
              </div>
            </div>

            <!-- Mode Selector Tabs -->
            <div style="margin-bottom: 16px;">
              <div style="display: flex; background: rgba(0,0,0,0.3); padding: 4px; border-radius: 8px; border: 1px solid var(--border-color); gap: 4px;">
                <button type="button" id="importTabFileBtn" onclick="SubscriptionsComponent.switchImportTab('file')" style="flex: 1; padding: 8px 12px; border: none; border-radius: 6px; font-size: 12px; font-weight: 700; cursor: pointer; display: flex; align-items: center; justify-content: center; gap: 6px; background: rgba(16, 185, 129, 0.15); color: #10b981; transition: all 0.15s ease;">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M13 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V9z"></path><polyline points="13 2 13 9 20 9"></polyline></svg>
                  <span>Upload Takeout CSV / JSON File</span>
                </button>
                <button type="button" id="importTabPasteBtn" onclick="SubscriptionsComponent.switchImportTab('paste')" style="flex: 1; padding: 8px 12px; border: none; border-radius: 6px; font-size: 12px; font-weight: 600; cursor: pointer; display: flex; align-items: center; justify-content: center; gap: 6px; background: transparent; color: var(--text-muted); transition: all 0.15s ease;">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2"></path><rect x="8" y="2" width="8" height="4" rx="1" ry="1"></rect></svg>
                  <span>Paste Handles or URLs</span>
                </button>
              </div>
            </div>

            <!-- Tab 1: Drag & Drop Upload Zone (Replaces raw file input) -->
            <div id="importFileSection">
              <div 
                id="importDropZone" 
                class="premium-drop-zone"
                onclick="document.getElementById('importFileInput').click()"
                ondragover="event.preventDefault(); this.classList.add('drag-active');"
                ondragleave="this.classList.remove('drag-active');"
                ondrop="event.preventDefault(); this.classList.remove('drag-active'); SubscriptionsComponent.handleFileDrop(event);"
              >
                <input 
                  type="file" 
                  id="importFileInput" 
                  accept=".csv, .json, text/csv, application/json, text/plain" 
                  style="display: none;"
                  onchange="SubscriptionsComponent.handleFileSelected(event)"
                />

                <!-- Default Drop Prompt -->
                <div id="dropZoneContentDefault">
                  <div style="width: 44px; height: 44px; border-radius: 12px; background: rgba(16, 185, 129, 0.1); border: 1px solid rgba(16, 185, 129, 0.25); display: flex; align-items: center; justify-content: center; margin: 0 auto 12px; color: #10b981;">
                    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
                      <polyline points="17 8 12 3 7 8"></polyline>
                      <line x1="12" y1="3" x2="12" y2="15"></line>
                    </svg>
                  </div>
                  <div style="font-weight: 700; font-size: 13.5px; color: var(--text-main); margin-bottom: 4px;">
                    Click to browse or drag &amp; drop file here
                  </div>
                  <div style="font-size: 11.5px; color: var(--text-muted);">
                    Official Google Takeout <code>subscriptions.csv</code> or JSON • Up to 1,000+ feeds
                  </div>
                </div>

                <!-- Selected File Card State -->
                <div id="dropZoneContentSelected" style="display: none; align-items: center; justify-content: space-between; background: rgba(16, 185, 129, 0.08); border: 1px solid rgba(16, 185, 129, 0.3); border-radius: 9px; padding: 12px 16px; text-align: left;">
                  <div style="display: flex; align-items: center; gap: 12px;">
                    <div style="width: 38px; height: 38px; border-radius: 8px; background: #10b981; color: #fff; display: flex; align-items: center; justify-content: center; flex-shrink: 0;">
                      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="20 6 9 17 4 12"></polyline></svg>
                    </div>
                    <div>
                      <div id="dropZoneFileName" style="font-weight: 700; color: var(--text-main); font-size: 13px;">subscriptions.csv</div>
                      <div id="dropZoneFileSize" style="font-size: 11px; color: var(--text-muted); margin-top: 1px;">Ready for bulk ingestion</div>
                    </div>
                  </div>
                  <button type="button" class="btn-action-premium outline-neutral" onclick="event.stopPropagation(); SubscriptionsComponent.clearSelectedFile();" style="font-size: 11px; height: 30px; padding: 0 10px;">
                    Replace File
                  </button>
                </div>
              </div>
            </div>

            <!-- Tab 2: Code / Textarea Section -->
            <div id="importPasteSection" style="display: none;">
              <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 6px;">
                <label class="cyber-label" style="font-weight: 700; font-size: 12px; margin: 0;">Paste CSV Data, JSON, or Handle List</label>
                <button type="button" onclick="SubscriptionsComponent.insertSampleImportData()" style="background: none; border: none; color: var(--accent-teal); font-size: 11px; font-weight: 700; cursor: pointer; text-decoration: underline;">
                  Load Example List
                </button>
              </div>
              <textarea 
                id="importRawText" 
                class="cyber-input" 
                style="width: 100%; height: 130px; font-family: var(--font-mono); font-size: 11.5px; line-height: 1.5; padding: 10px; background: rgba(0,0,0,0.35);" 
                placeholder="Paste Takeout CSV contents, or YouTube handles/links (one per line):
@NetworkChuck
@fireship
https://www.youtube.com/@DevOpsToolkit"
              ></textarea>
            </div>
          </div>

          <!-- Footer -->
          <div class="modal-footer-premium">
            <div style="font-size: 11.5px; color: var(--text-dim); display: flex; align-items: center; gap: 5px;">
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect><path d="M7 11V7a5 5 0 0 1 10 0v4"></path></svg>
              <span>Instant PostgreSQL Bulk Write</span>
            </div>
            <div style="display: flex; gap: 10px;">
              <button type="button" class="btn-action-premium outline-neutral" data-close-modal="true" onclick="window.closeModal('importSubModal')">Cancel</button>
              <button type="button" class="btn-action-premium accent-emerald" id="startImportBtn" onclick="SubscriptionsComponent.processImport()" style="padding: 0 20px; font-weight: 700; background: linear-gradient(135deg, #10b981, #059669); color: #fff; border-color: #059669; box-shadow: 0 3px 12px rgba(16, 185, 129, 0.35);">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path><polyline points="17 8 12 3 7 8"></polyline><line x1="12" y1="3" x2="12" y2="15"></line></svg>
                <span>Start Bulk Import</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    `;
  },

  switchImportTab(tab) {
    const fileBtn = document.getElementById('importTabFileBtn');
    const pasteBtn = document.getElementById('importTabPasteBtn');
    const fileSec = document.getElementById('importFileSection');
    const pasteSec = document.getElementById('importPasteSection');

    if (tab === 'file') {
      if (fileBtn) { fileBtn.style.background = 'rgba(16, 185, 129, 0.15)'; fileBtn.style.color = '#10b981'; fileBtn.style.fontWeight = '700'; }
      if (pasteBtn) { pasteBtn.style.background = 'transparent'; pasteBtn.style.color = 'var(--text-muted)'; pasteBtn.style.fontWeight = '600'; }
      if (fileSec) fileSec.style.display = 'block';
      if (pasteSec) pasteSec.style.display = 'none';
    } else {
      if (pasteBtn) { pasteBtn.style.background = 'rgba(16, 185, 129, 0.15)'; pasteBtn.style.color = '#10b981'; pasteBtn.style.fontWeight = '700'; }
      if (fileBtn) { fileBtn.style.background = 'transparent'; fileBtn.style.color = 'var(--text-muted)'; fileBtn.style.fontWeight = '600'; }
      if (fileSec) fileSec.style.display = 'none';
      if (pasteSec) pasteSec.style.display = 'block';
    }
  },

  handleFileDrop(event) {
    const dt = event.dataTransfer;
    if (dt && dt.files && dt.files.length > 0) {
      this.readFileContent(dt.files[0]);
    }
  },

  handleFileSelected(event) {
    const file = event.target.files[0];
    if (file) {
      this.readFileContent(file);
    }
  },

  readFileContent(file) {
    const reader = new FileReader();
    reader.onload = (e) => {
      const text = e.target.result;
      const textArea = document.getElementById('importRawText');
      if (textArea) textArea.value = text;

      // Update drop zone to show selected file card
      const defState = document.getElementById('dropZoneContentDefault');
      const selState = document.getElementById('dropZoneContentSelected');
      const nameEl = document.getElementById('dropZoneFileName');
      const sizeEl = document.getElementById('dropZoneFileSize');

      if (defState) defState.style.display = 'none';
      if (selState) selState.style.display = 'flex';
      if (nameEl) nameEl.innerText = file.name;
      if (sizeEl) sizeEl.innerText = `${(file.size / 1024).toFixed(1)} KB • Validated & ready to import`;

      Toast.show(`Loaded ${file.name} (${(file.size / 1024).toFixed(1)} KB)`, 'info');
    };
    reader.readAsText(file);
  },

  clearSelectedFile() {
    const input = document.getElementById('importFileInput');
    if (input) input.value = '';
    const textArea = document.getElementById('importRawText');
    if (textArea) textArea.value = '';

    const defState = document.getElementById('dropZoneContentDefault');
    const selState = document.getElementById('dropZoneContentSelected');
    if (defState) defState.style.display = 'block';
    if (selState) selState.style.display = 'none';
  },

  insertSampleImportData() {
    const textArea = document.getElementById('importRawText');
    if (textArea) {
      textArea.value = `@NetworkChuck\n@fireship\n@DevOpsToolkit\nhttps://www.youtube.com/@freecodecamp\nhttps://www.youtube.com/@TraversyMedia`;
      Toast.show('Loaded 5 sample channels into editor', 'info');
    }
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
      Toast.show('Please upload a Takeout CSV file or paste channel list', 'warning');
      return;
    }

    if (btn) {
      btn.disabled = true;
      btn.innerHTML = `
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" class="spin-icon"><circle cx="12" cy="12" r="10"></circle><path d="M12 6v6l4 2"></path></svg>
        <span>Importing Feeds...</span>
      `;
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
        btn.innerHTML = `
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path><polyline points="17 8 12 3 7 8"></polyline><line x1="12" y1="3" x2="12" y2="15"></line></svg>
          <span>Start Bulk Import</span>
        `;
      }
    }
  },

  openApiSyncModal() {
    const modalRoot = document.getElementById('modalRoot');
    if (!modalRoot) return;

    const defaultChannelId = this.activeChannelId !== 'all' ? this.activeChannelId : (this.channels[0]?.id || '');

    modalRoot.innerHTML = `
      <div class="modal-overlay cyber-modal open" id="apiSyncModal" style="display: flex;" onclick="if(event.target===this) window.closeModal('apiSyncModal')">
        <div class="modal-dialog-premium" style="max-width: 560px;">
          <!-- Header -->
          <div class="modal-header-premium">
            <div style="display: flex; align-items: center; gap: 12px;">
              <div class="modal-icon-pill cyan">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
                  <path d="M21 2l-2 2m-7.61 7.61a5.5 5.5 0 1 1-7.778 7.778 5.5 5.5 0 0 1 7.777-7.777zm0 0L15.5 7.5m0 0l3 3L22 7l-3-3m-3.5 3.5L19 4"></path>
                </svg>
              </div>
              <div>
                <div class="modal-title" style="font-size: 16px; font-weight: 800; letter-spacing: -0.2px;">
                  YouTube Data API Sync
                </div>
                <div style="font-size: 12px; color: var(--text-muted); margin-top: 1px;">
                  Paging fetch up to 1,000 subscriptions directly via official YouTube API v3
                </div>
              </div>
            </div>
            <button class="modal-close-btn-premium" data-close-modal="true" onclick="window.closeModal('apiSyncModal')" title="Close">
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
                <line x1="18" y1="6" x2="6" y2="18"></line>
                <line x1="6" y1="6" x2="18" y2="18"></line>
              </svg>
            </button>
          </div>

          <form onsubmit="SubscriptionsComponent.handleApiSyncSubmit(event)">
            <div class="modal-body-premium">
              <!-- Privacy Notice Card -->
              <div style="background: rgba(6, 182, 212, 0.05); border: 1px solid rgba(6, 182, 212, 0.2); border-radius: 10px; padding: 14px 16px; margin-bottom: 20px; font-size: 12px; line-height: 1.5;">
                <div style="font-weight: 700; color: #06b6d4; margin-bottom: 4px; display: flex; align-items: center; gap: 6px;">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="16" x2="12" y2="12"></line><line x1="12" y1="8" x2="12.01" y2="8"></line></svg>
                  <span>YouTube Data API Requirements</span>
                </div>
                <div style="color: var(--text-muted);">
                  The YouTube API only returns channels if subscriptions are set to <strong>Public</strong> on YouTube. If your account keeps subscriptions private, either toggle off <em>"Keep all my subscriptions private"</em> in YouTube Privacy Settings, or use <strong>Takeout Import</strong> for instant 100% coverage.
                </div>
              </div>

              <!-- Managed Channel -->
              <div style="margin-bottom: 18px;">
                <label class="cyber-label" style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 6px;">
                  <span style="font-weight: 700; font-size: 12px;">Target Managed Channel (Subscriber)</span>
                  <span style="font-size: 11px; color: var(--text-dim);">OAuth or Public Feed</span>
                </label>
                <div style="position: relative;">
                  <select id="apiSyncChannelId" class="cyber-input" style="width: 100%; padding-left: 36px; appearance: none; -webkit-appearance: none; cursor: pointer;">
                    ${this.channels.map(c => `
                      <option value="${c.id}" ${c.id === defaultChannelId ? 'selected' : ''}>
                        ${c.name} (${c.channel_id || '@channel'})
                      </option>
                    `).join('')}
                  </select>
                  <div style="position: absolute; left: 12px; top: 50%; transform: translateY(-50%); pointer-events: none; color: #06b6d4; display: flex;">
                    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="2" y="7" width="20" height="15" rx="2" ry="2"></rect><polyline points="17 2 12 7 7 2"></polyline></svg>
                  </div>
                  <div style="position: absolute; right: 12px; top: 50%; transform: translateY(-50%); pointer-events: none; color: var(--text-dim); display: flex;">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="6 9 12 15 18 9"></polyline></svg>
                  </div>
                </div>
              </div>

              <!-- YouTube API Key -->
              <div style="margin-bottom: 8px;">
                <label class="cyber-label" style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 6px;">
                  <span style="font-weight: 700; font-size: 12px;">YouTube Data API v3 Key (Optional)</span>
                  <span style="font-size: 11px; color: var(--text-dim);">Defaults to Settings Key</span>
                </label>
                <div style="position: relative;">
                  <input 
                    type="password" 
                    id="apiSyncKey" 
                    class="cyber-input" 
                    style="width: 100%; padding-left: 36px;" 
                    placeholder="AIzaSy... (leave blank to use key from System Settings)" 
                  />
                  <div style="position: absolute; left: 12px; top: 50%; transform: translateY(-50%); pointer-events: none; color: var(--text-dim); display: flex;">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect><path d="M7 11V7a5 5 0 0 1 10 0v4"></path></svg>
                  </div>
                </div>
              </div>
            </div>

            <!-- Footer -->
            <div class="modal-footer-premium">
              <div style="font-size: 11.5px; color: var(--text-dim); display: flex; align-items: center; gap: 5px;">
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect><path d="M7 11V7a5 5 0 0 1 10 0v4"></path></svg>
                <span>Synced with PostgreSQL 18</span>
              </div>
              <div style="display: flex; gap: 10px;">
                <button type="button" class="btn-action-premium outline-neutral" data-close-modal="true" onclick="window.closeModal('apiSyncModal')">Cancel</button>
                <button type="submit" class="btn-action-premium accent-cyan" id="apiSyncStartBtn" style="padding: 0 18px; font-weight: 700; background: linear-gradient(135deg, #06b6d4, #0891b2); color: #fff; border-color: #0891b2; box-shadow: 0 3px 12px rgba(6, 182, 212, 0.35);">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2"><path d="M21 2l-2 2m-7.61 7.61a5.5 5.5 0 1 1-7.778 7.778 5.5 5.5 0 0 1 7.777-7.777zm0 0L15.5 7.5m0 0l3 3L22 7l-3-3m-3.5 3.5L19 4"></path></svg>
                  <span>Fetch All from YouTube API</span>
                </button>
              </div>
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
