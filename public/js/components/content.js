/**
 * Content Management Component (Videos, Shorts/Reels, Podcasts)
 * Robust event delegation, Map-based lookup, and multi-channel filtering
 */
const ContentComponent = {
  currentType: 'all', // 'all', 'short', 'video', 'podcast'
  currentStatus: 'all',
  searchQuery: '',
  currentPage: 1,
  limit: 15,
  itemsMap: new Map(),

  escapeHtml(str) {
    if (!str) return '';
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  },

  initialType: 'all',

  clearSearch() {
    this.searchQuery = '';
    const searchInput = document.getElementById('contentSearchInput');
    if (searchInput) searchInput.value = '';
    this.currentPage = 1;
    this.updateActiveFiltersIndicator();
    this.loadTableData();
  },

  updateActiveFiltersIndicator() {
    const indicator = document.getElementById('contentActiveFiltersIndicator');
    const isFiltered = Boolean(
      (this.searchQuery && this.searchQuery.trim()) ||
      this.currentStatus !== 'all' ||
      (this.initialType === 'all' && this.currentType !== 'all')
    );
    if (indicator) {
      indicator.style.display = isFiltered ? 'inline-flex' : 'none';
    }
    const clearSearchBtn = document.getElementById('contentClearSearchBtn');
    if (clearSearchBtn) {
      clearSearchBtn.style.display = (this.searchQuery && this.searchQuery.trim()) ? 'flex' : 'none';
    }
    // Update pills active state
    document.querySelectorAll('.content-status-pill').forEach(pill => {
      const s = pill.getAttribute('data-status');
      if (s === this.currentStatus) {
        pill.classList.add('active');
      } else {
        pill.classList.remove('active');
      }
    });
  },

  setStatusFilter(status) {
    this.currentStatus = status;
    const statusSelect = document.getElementById('contentStatusSelect');
    if (statusSelect) statusSelect.value = status;
    this.currentPage = 1;
    this.updateActiveFiltersIndicator();
    this.loadTableData();
  },

  resetFilters() {
    this.searchQuery = '';
    this.currentStatus = 'all';
    if (this.initialType === 'all') {
      this.currentType = 'all';
      const typeSelect = document.getElementById('contentTypeSelect');
      if (typeSelect) typeSelect.value = 'all';
    }
    const searchInput = document.getElementById('contentSearchInput');
    if (searchInput) searchInput.value = '';
    const statusSelect = document.getElementById('contentStatusSelect');
    if (statusSelect) statusSelect.value = 'all';
    this.currentPage = 1;
    this.updateActiveFiltersIndicator();
    this.loadTableData();
    if (window.Toast && Toast.show) {
      Toast.show('Catalog filters cleared', 'info', 1200);
    }
  },

  async render(container, filterType = 'all') {
    this.initialType = filterType;
    this.currentType = filterType;
    this.currentPage = 1;

    let titleText = 'All Content Catalog';
    let icon = '🎬';
    if (filterType === 'short') {
      titleText = 'Reels & Shorts (9:16 Vertical)';
      icon = '⚡';
    } else if (filterType === 'video') {
      titleText = 'Long-Form Videos (16:9)';
      icon = '📹';
    } else if (filterType === 'podcast') {
      titleText = 'Podcast Episodes';
      icon = '🎙️';
    }

    container.innerHTML = `
      <!-- Toolbar Header -->
      <div class="glass-card" style="padding: 18px 20px; margin-bottom: 20px;">
        <div style="display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 14px;">
          <div>
            <h1 style="font-size: 18px; font-weight: 700; display: flex; align-items: center; gap: 8px;">
              <span>${icon}</span> ${titleText}
            </h1>
            <p style="font-size: 12px; color: var(--text-muted); margin-top: 2px;">
              Manage, duplicate, edit, rename, and publish media assets across connected channels
            </p>
          </div>
          <div style="display: flex; gap: 10px; align-items: center; flex-wrap: wrap;">
            <button class="btn-action-premium primary-teal" id="contentCreateNewBtn" onclick="window.navigateTo('wizard', '${this.currentType === 'all' ? 'short' : this.currentType}')">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <line x1="12" y1="5" x2="12" y2="19"></line>
                <line x1="5" y1="12" x2="19" y2="12"></line>
              </svg>
              <span>Create New Content</span>
            </button>
          </div>
        </div>

        <!-- Professional Filter Controls Bar -->
        <div class="filter-toolbar-premium" style="margin-top: 18px; margin-bottom: 0;">
          <div class="filter-toolbar-row">
            <!-- Left: Search Box -->
            <div class="search-box-premium">
              <span class="search-icon">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                  <circle cx="11" cy="11" r="8"></circle>
                  <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
                </svg>
              </span>
              <input 
                type="text" 
                id="contentSearchInput" 
                placeholder="Search titles, topics, tags..." 
                value="${this.escapeHtml(this.searchQuery)}"
              />
              <button 
                type="button" 
                id="contentClearSearchBtn" 
                class="clear-icon-btn" 
                title="Clear search" 
                style="display: ${this.searchQuery ? 'flex' : 'none'};" 
                onclick="ContentComponent.clearSearch()"
              >✕</button>
            </div>

            <!-- Filter Controls Group -->
            <div class="filter-controls-group">
              <!-- Status Filter Dropdown -->
              <div class="filter-dropdown-premium">
                <span class="filter-icon">
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                    <polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3"></polygon>
                  </svg>
                </span>
                <span class="filter-prefix-label">STATUS</span>
                <select id="contentStatusSelect">
                  <option value="all">All Statuses</option>
                  <option value="uploaded">Uploaded / Live</option>
                  <option value="pending">Pending</option>
                  <option value="draft">Draft</option>
                  <option value="scheduled">Scheduled</option>
                  <option value="archived">Archived</option>
                </select>
                <svg class="dropdown-arrow" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <polyline points="6 9 12 15 18 9"></polyline>
                </svg>
              </div>

              <!-- Format Filter (if viewing All) -->
              ${filterType === 'all' ? `
                <div class="filter-dropdown-premium">
                  <span class="filter-icon">
                    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                      <rect x="2" y="2" width="20" height="20" rx="2.18" ry="2.18"></rect>
                      <line x1="7" y1="2" x2="7" y2="22"></line>
                      <line x1="17" y1="2" x2="17" y2="22"></line>
                      <line x1="2" y1="12" x2="22" y2="12"></line>
                    </svg>
                  </span>
                  <span class="filter-prefix-label">FORMAT</span>
                  <select id="contentTypeSelect">
                    <option value="all">All Formats</option>
                    <option value="short">Shorts / Reels</option>
                    <option value="video">Long Videos</option>
                    <option value="podcast">Podcasts</option>
                  </select>
                  <svg class="dropdown-arrow" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <polyline points="6 9 12 15 18 9"></polyline>
                  </svg>
                </div>
              ` : ''}

              <!-- Active Filters & Reset Action -->
              <div id="contentActiveFiltersIndicator" class="active-filters-indicator" style="display: ${Boolean(this.searchQuery || this.currentStatus !== 'all' || (filterType === 'all' && this.currentType !== 'all')) ? 'inline-flex' : 'none'};">
                <button type="button" class="filter-reset-action" onclick="ContentComponent.resetFilters()" title="Reset all filters">
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                    <line x1="18" y1="6" x2="6" y2="18"></line>
                    <line x1="6" y1="6" x2="18" y2="18"></line>
                  </svg>
                  <span>Clear Filters</span>
                </button>
              </div>

              <div style="flex: 1;"></div>

              <button class="btn-action-premium outline-neutral btn-sm" id="refreshContentBtn" title="Reload data">
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                  <polyline points="23 4 23 10 17 10"></polyline>
                  <polyline points="1 20 1 14 7 14"></polyline>
                  <path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"></path>
                </svg>
                <span>Refresh</span>
              </button>
            </div>
          </div>

          <!-- Row 2: Quick Status Filter Pills -->
          <div class="filter-pills-bar" style="margin-top: 4px;">
            <span style="font-size: 10.5px; font-weight: 700; color: var(--text-dim); text-transform: uppercase; margin-right: 4px; letter-spacing: 0.5px;">FAST FILTER:</span>
            <button type="button" class="filter-pill-item content-status-pill ${this.currentStatus === 'all' ? 'active' : ''}" data-status="all" onclick="ContentComponent.setStatusFilter('all')">
              <span>All Statuses</span>
            </button>
            <button type="button" class="filter-pill-item content-status-pill ${this.currentStatus === 'uploaded' ? 'active' : ''}" data-status="uploaded" onclick="ContentComponent.setStatusFilter('uploaded')">
              <span>🟢 Live / Uploaded</span>
            </button>
            <button type="button" class="filter-pill-item content-status-pill ${this.currentStatus === 'pending' ? 'active' : ''}" data-status="pending" onclick="ContentComponent.setStatusFilter('pending')">
              <span>🟡 Pending</span>
            </button>
            <button type="button" class="filter-pill-item content-status-pill ${this.currentStatus === 'scheduled' ? 'active' : ''}" data-status="scheduled" onclick="ContentComponent.setStatusFilter('scheduled')">
              <span>🔵 Scheduled</span>
            </button>
            <button type="button" class="filter-pill-item content-status-pill ${this.currentStatus === 'draft' ? 'active' : ''}" data-status="draft" onclick="ContentComponent.setStatusFilter('draft')">
              <span>⚪ Draft</span>
            </button>
            <button type="button" class="filter-pill-item content-status-pill ${this.currentStatus === 'archived' ? 'active' : ''}" data-status="archived" onclick="ContentComponent.setStatusFilter('archived')">
              <span>📦 Archived</span>
            </button>
          </div>
        </div>
      </div>

      <!-- Table Container -->
      <div class="glass-card" style="padding: 0; overflow: hidden;">
        <div id="contentTableWrapper">
          <div style="padding: 40px; text-align: center; color: var(--text-muted);">
            Loading content catalog...
          </div>
        </div>
      </div>
    `;

    // Bind event listeners
    const searchInput = document.getElementById('contentSearchInput');
    let debounceTimer;
    searchInput.oninput = (e) => {
      clearTimeout(debounceTimer);
      debounceTimer = setTimeout(() => {
        this.searchQuery = e.target.value;
        this.currentPage = 1;
        this.updateActiveFiltersIndicator();
        this.loadTableData();
      }, 250);
    };

    const statusSelect = document.getElementById('contentStatusSelect');
    statusSelect.value = this.currentStatus;
    statusSelect.onchange = (e) => {
      this.currentStatus = e.target.value;
      this.currentPage = 1;
      this.updateActiveFiltersIndicator();
      this.loadTableData();
    };

    const typeSelect = document.getElementById('contentTypeSelect');
    if (typeSelect) {
      typeSelect.value = this.currentType;
      typeSelect.onchange = (e) => {
        this.currentType = e.target.value;
        this.currentPage = 1;
        this.updateActiveFiltersIndicator();
        this.loadTableData();
      };
    }

    document.getElementById('refreshContentBtn').onclick = () => {
      this.loadTableData();
    };

    const createBtn = document.getElementById('contentCreateNewBtn');
    if (createBtn) {
      createBtn.onclick = (e) => {
        e.preventDefault();
        window.navigateTo('wizard', this.currentType === 'all' ? 'short' : this.currentType);
      };
    }

    // Attach delegated click listener on table wrapper
    const wrapper = document.getElementById('contentTableWrapper');
    wrapper.onclick = (e) => {
      const btn = e.target.closest('[data-action]');
      if (!btn) return;

      const action = btn.getAttribute('data-action');
      const id = parseInt(btn.getAttribute('data-id'), 10);
      if (!id) return;

      if (action === 'view') {
        window.viewContentModal(id);
      } else if (action === 'edit') {
        ContentComponent.openEditModal(id);
      } else if (action === 'rename') {
        ContentComponent.quickRenameModal(id);
      } else if (action === 'duplicate') {
        ContentComponent.duplicateItem(id);
      } else if (action === 'delete') {
        ContentComponent.deleteItem(id);
      }
    };

    wrapper.onchange = (e) => {
      const select = e.target.closest('.quick-status-select');
      if (!select) return;
      const id = parseInt(select.getAttribute('data-id'), 10);
      const newStatus = select.value;
      if (id && newStatus) {
        ContentComponent.quickStatusChange(id, newStatus);
      }
    };

    this.loadTableData();
  },

  async loadTableData() {
    const wrapper = document.getElementById('contentTableWrapper');
    if (!wrapper) return;

    try {
      const channelId = API.getActiveChannelId();

      const res = await API.content.list({
        channel_id: channelId,
        type: this.currentType,
        status: this.currentStatus,
        search: this.searchQuery,
        page: this.currentPage,
        limit: this.limit
      });

      const { data, pagination } = res;
      this.itemsMap.clear();

      if (!data || data.length === 0) {
        const hasFilters = Boolean(
          (this.searchQuery && this.searchQuery.trim()) ||
          this.currentStatus !== 'all' ||
          (this.initialType === 'all' && this.currentType !== 'all')
        );
        wrapper.innerHTML = `
          <div style="padding: 50px 20px; text-align: center;">
            <div style="font-size: 36px; margin-bottom: 10px;">🎬</div>
            <h3 style="font-size: 15px; font-weight: 700; color: var(--text-main);">No Content Found</h3>
            <p style="color: var(--text-muted); font-size: 13px; margin-top: 4px;">
              ${hasFilters ? 'No media matches your search query or filter criteria.' : 'No media items registered yet.'}
            </p>
            <div style="display: flex; align-items: center; justify-content: center; gap: 10px; margin-top: 16px; flex-wrap: wrap;">
              ${hasFilters ? `
                <button type="button" class="btn-action-premium outline-neutral" onclick="ContentComponent.resetFilters()">
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                    <line x1="18" y1="6" x2="6" y2="18"></line>
                    <line x1="6" y1="6" x2="18" y2="18"></line>
                  </svg>
                  <span>Clear Filter Criteria</span>
                </button>
              ` : ''}
              <button class="btn-action-premium primary-teal" id="contentEmptyCreateBtn" onclick="window.navigateTo('wizard', '${this.currentType === 'all' ? 'short' : this.currentType}')">
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                  <line x1="12" y1="5" x2="12" y2="19"></line>
                  <line x1="5" y1="12" x2="19" y2="12"></line>
                </svg>
                <span>Create New Content with Wizard</span>
              </button>
            </div>
          </div>
        `;
        return;
      }

      // Populate itemsMap
      data.forEach(item => {
        this.itemsMap.set(item.id, item);
      });

      wrapper.innerHTML = `
        <div class="table-responsive">
          <table class="cyber-table">
            <thead>
              <tr>
                <th style="width: 45px;">#</th>
                <th style="width: 90px;">FORMAT</th>
                <th>TITLE / TOPIC</th>
                <th style="width: 120px;">STATUS</th>
                <th style="width: 130px;">METRICS</th>
                <th style="width: 110px;">DATE</th>
                <th style="width: 240px; text-align: right;">ACTIONS</th>
              </tr>
            </thead>
            <tbody>
              ${data.map(item => `
                <tr>
                  <!-- ID -->
                  <td style="font-family: var(--font-mono); color: var(--text-dim); font-size: 11px;">
                    #${item.id}
                  </td>

                  <!-- Type Badge -->
                  <td>
                    <span class="badge ${item.content_type === 'short' ? 'badge-violet' : (item.content_type === 'podcast' ? 'badge-amber' : 'badge-teal')}">
                      ${item.content_type === 'short' ? '⚡ Short' : (item.content_type === 'podcast' ? '🎙️ Podcast' : '📹 Video')}
                    </span>
                  </td>

                  <!-- Title / Topic / Tags -->
                  <td>
                    <div style="font-weight: 600; font-size: 13px; color: var(--text-main); margin-bottom: 2px; max-width: 450px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">
                      ${this.escapeHtml(item.title)}
                    </div>
                    ${item.topic && item.topic !== item.title ? `
                      <div style="font-size: 11px; color: var(--text-muted); margin-bottom: 3px;">
                        📌 ${this.escapeHtml(item.topic)}
                      </div>
                    ` : ''}
                    <div style="display: flex; gap: 8px; align-items: center; flex-wrap: wrap;">
                      ${item.video_url ? `
                        <a href="${this.escapeHtml(item.video_url)}" target="_blank" rel="noopener" style="color: var(--accent-cyan); font-size: 11px; text-decoration: none;">
                          🔗 YouTube
                        </a>
                      ` : ''}
                      ${item.tags ? `
                        <span style="font-size: 11px; color: var(--text-dim); font-family: var(--font-mono);">
                          🏷️ ${this.escapeHtml(item.tags.substring(0, 40))}${item.tags.length > 40 ? '...' : ''}
                        </span>
                      ` : ''}
                    </div>
                  </td>

                  <!-- Status Dropdown Quick-Toggle -->
                  <td>
                    <select class="cyber-input quick-status-select" data-id="${item.id}" style="padding: 4px 8px; font-size: 11px; width: 110px;">
                      <option value="pending" ${item.status === 'pending' ? 'selected' : ''}>⏳ Pending</option>
                      <option value="uploaded" ${item.status === 'uploaded' ? 'selected' : ''}>✅ Live</option>
                      <option value="draft" ${item.status === 'draft' ? 'selected' : ''}>📝 Draft</option>
                      <option value="scheduled" ${item.status === 'scheduled' ? 'selected' : ''}>🗓️ Scheduled</option>
                      <option value="archived" ${item.status === 'archived' ? 'selected' : ''}>📦 Archived</option>
                    </select>
                  </td>

                  <!-- Metrics -->
                  <td>
                    <div style="font-size: 12px; font-weight: 700; color: var(--text-main);">
                      👁️ ${(item.views_count || 0).toLocaleString()}
                    </div>
                    <div style="font-size: 10px; color: var(--text-dim);">
                      ❤️ ${(item.likes_count || 0).toLocaleString()} • 💬 ${(item.comments_count || 0).toLocaleString()}
                    </div>
                  </td>

                  <!-- Created At -->
                  <td style="font-size: 11px; color: var(--text-muted); font-family: var(--font-mono);">
                    ${new Date(item.created_at).toLocaleDateString()}
                  </td>

                  <!-- Robust Action Buttons via Data Attributes -->
                  <td style="text-align: right;">
                    <div style="display: inline-flex; gap: 4px;">
                      <button class="btn-cyber btn-cyber-outline btn-sm" data-action="view" data-id="${item.id}" title="View Details">
                        👁️ View
                      </button>
                      <button class="btn-cyber btn-cyber-outline btn-sm" data-action="edit" data-id="${item.id}" title="Edit">
                        ✏️ Edit
                      </button>
                      <button class="btn-cyber btn-cyber-outline btn-sm" data-action="rename" data-id="${item.id}" title="Quick Rename">
                        🏷️ Rename
                      </button>
                      <button class="btn-cyber btn-cyber-secondary btn-sm" data-action="duplicate" data-id="${item.id}" title="Clone Item">
                        📋 Clone
                      </button>
                      <button class="btn-cyber btn-cyber-danger btn-sm" data-action="delete" data-id="${item.id}" title="Delete Item">
                        🗑️ Delete
                      </button>
                    </div>
                  </td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        </div>

        <!-- Pagination Controls -->
        <div style="padding: 12px 18px; border-top: 1px solid var(--border-color); display: flex; align-items: center; justify-content: space-between; flex-wrap: wrap; gap: 10px;">
          <div style="font-size: 12px; color: var(--text-dim); font-family: var(--font-mono);">
            Showing ${((pagination.page - 1) * pagination.limit) + 1} to ${Math.min(pagination.total, pagination.page * pagination.limit)} of ${pagination.total} entries
          </div>
          <div style="display: flex; gap: 6px;">
            <button class="btn-cyber btn-cyber-outline btn-sm" ${pagination.page <= 1 ? 'disabled style="opacity:0.4"' : ''} onclick="ContentComponent.goToPage(${pagination.page - 1})">
              ◀ Prev
            </button>
            <span style="font-size: 12px; font-weight: 700; color: var(--text-main); display: flex; align-items: center; padding: 0 6px;">
              Page ${pagination.page} / ${pagination.totalPages || 1}
            </span>
            <button class="btn-cyber btn-cyber-outline btn-sm" ${pagination.page >= pagination.totalPages ? 'disabled style="opacity:0.4"' : ''} onclick="ContentComponent.goToPage(${pagination.page + 1})">
              Next ▶
            </button>
          </div>
        </div>
      `;
    } catch (err) {
      wrapper.innerHTML = `
        <div style="padding: 30px; text-align: center; color: #ef4444;">
          Failed to load content list: ${this.escapeHtml(err.message)}
        </div>
      `;
    }
  },

  goToPage(page) {
    this.currentPage = page;
    this.loadTableData();
  },

  // 1. Quick Status Change
  async quickStatusChange(id, newStatus) {
    try {
      await API.content.setStatus(id, newStatus);
      Toast.show(`Status updated to ${newStatus.toUpperCase()}`, 'success');
    } catch (err) {
      Toast.show(`Failed to change status: ${err.message}`, 'error');
      this.loadTableData();
    }
  },

  // 2. Duplicate Content
  async duplicateItem(id) {
    try {
      const res = await API.content.duplicate(id);
      Toast.show(`Content cloned successfully! New item #${res.data.id} created`, 'success');
      this.loadTableData();
    } catch (err) {
      Toast.show(`Failed to duplicate item: ${err.message}`, 'error');
    }
  },

  // 3. Quick Rename Modal
  quickRenameModal(id) {
    const item = this.itemsMap.get(id);
    const currentTitle = item ? item.title : '';

    let modal = document.getElementById('quickRenameModal');
    if (!modal) {
      modal = document.createElement('div');
      modal.id = 'quickRenameModal';
      modal.className = 'modal-overlay';
      document.body.appendChild(modal);
    }

    modal.innerHTML = `
      <div class="modal-dialog" style="max-width: 500px;">
        <div class="modal-header">
          <div class="modal-title">🏷️ Rename Content Title</div>
          <button class="modal-close-btn" data-close-modal="true" id="closeRenameModalBtn">✕</button>
        </div>
        <div class="modal-body">
          <div>
            <label style="font-size: 11px; font-weight: 700; color: var(--text-dim); text-transform: uppercase;">Title *</label>
            <input type="text" id="renameInputTitle" class="cyber-input" value="${this.escapeHtml(currentTitle)}" style="margin-top: 6px;" />
          </div>
        </div>
        <div class="modal-footer">
          <button class="btn-cyber btn-cyber-outline" data-close-modal="true" id="cancelRenameModalBtn">Cancel</button>
          <button class="btn-cyber btn-cyber-primary" id="saveRenameBtn">Save Title</button>
        </div>
      </div>
    `;

    window.openModal(modal);
    const input = document.getElementById('renameInputTitle');
    input.focus();
    input.select();

    const closeModal = () => window.closeModal(modal);
    document.getElementById('closeRenameModalBtn').onclick = closeModal;
    document.getElementById('cancelRenameModalBtn').onclick = closeModal;

    document.getElementById('saveRenameBtn').onclick = async () => {
      const newTitle = input.value.trim();
      if (!newTitle) {
        Toast.show('Title cannot be empty', 'warning');
        return;
      }
      try {
        await API.content.rename(id, { title: newTitle });
        closeModal();
        Toast.show('Title updated successfully', 'success');
        ContentComponent.loadTableData();
      } catch (err) {
        Toast.show(`Rename failed: ${err.message}`, 'error');
      }
    };
  },

  // 4. Delete Item
  async deleteItem(id) {
    const item = this.itemsMap.get(id);
    const title = item ? item.title : `Item #${id}`;

    const confirmed = await cyberConfirm({
      title: 'Delete Content Asset',
      message: `Are you sure you want to delete content item #${id} ("${title}")? This action cannot be reversed.`,
      confirmText: 'Yes, Delete',
      type: 'danger'
    });

    if (confirmed) {
      try {
        await API.content.delete(id);
        Toast.show('Item deleted from catalog', 'success');
        this.loadTableData();
      } catch (err) {
        Toast.show(`Delete failed: ${err.message}`, 'error');
      }
    }
  },

  // 5. Open Full Edit Modal
  async openEditModal(id) {
    try {
      const res = await API.content.get(id);
      const item = res.data;

      let modal = document.getElementById('contentEditModal');
      if (!modal) {
        modal = document.createElement('div');
        modal.id = 'contentEditModal';
        modal.className = 'modal-overlay';
        document.body.appendChild(modal);
      }

      modal.innerHTML = `
        <div class="modal-dialog" style="max-width: 680px;">
          <div class="modal-header">
            <div class="modal-title">✏️ Edit Content: #${item.id}</div>
            <button class="modal-close-btn" data-close-modal="true" id="closeEditModalBtn">✕</button>
          </div>
          <div class="modal-body" style="display: flex; flex-direction: column; gap: 14px;">
            <!-- Format & Status -->
            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 14px;">
              <div>
                <label style="font-size: 11px; font-weight: 700; color: var(--text-dim);">FORMAT</label>
                <select id="editContentType" class="cyber-input" style="margin-top: 4px;">
                  <option value="short" ${item.content_type === 'short' ? 'selected' : ''}>⚡ Short / Reel (9:16)</option>
                  <option value="video" ${item.content_type === 'video' ? 'selected' : ''}>📹 Long-Form Video (16:9)</option>
                  <option value="podcast" ${item.content_type === 'podcast' ? 'selected' : ''}>🎙️ Podcast</option>
                </select>
              </div>
              <div>
                <label style="font-size: 11px; font-weight: 700; color: var(--text-dim);">LIFECYCLE STATUS</label>
                <select id="editStatus" class="cyber-input" style="margin-top: 4px;">
                  <option value="pending" ${item.status === 'pending' ? 'selected' : ''}>⏳ Pending</option>
                  <option value="uploaded" ${item.status === 'uploaded' ? 'selected' : ''}>✅ Live</option>
                  <option value="draft" ${item.status === 'draft' ? 'selected' : ''}>📝 Draft</option>
                  <option value="scheduled" ${item.status === 'scheduled' ? 'selected' : ''}>🗓️ Scheduled</option>
                  <option value="archived" ${item.status === 'archived' ? 'selected' : ''}>📦 Archived</option>
                </select>
              </div>
            </div>

            <!-- Title -->
            <div>
              <label style="font-size: 11px; font-weight: 700; color: var(--text-dim);">TITLE *</label>
              <input type="text" id="editTitle" class="cyber-input" value="${this.escapeHtml(item.title || '')}" style="margin-top: 4px;" />
            </div>

            <!-- Topic -->
            <div>
              <label style="font-size: 11px; font-weight: 700; color: var(--text-dim);">TOPIC</label>
              <input type="text" id="editTopic" class="cyber-input" value="${this.escapeHtml(item.topic || '')}" style="margin-top: 4px;" />
            </div>

            <!-- Video URL with Fetch from YouTube Button -->
            <div>
              <div style="display: flex; justify-content: space-between; align-items: center;">
                <label style="font-size: 11px; font-weight: 700; color: var(--text-dim);">YOUTUBE URL</label>
                <button type="button" class="btn-cyber btn-cyber-outline btn-sm" id="btnFetchYTMeta" style="padding: 2px 8px; font-size: 10px; display: inline-flex; align-items: center; gap: 4px;" title="Fetch live title, full description, and tags from YouTube">
                  <span>🔄</span> Fetch from YouTube
                </button>
              </div>
              <input type="url" id="editVideoUrl" class="cyber-input" value="${this.escapeHtml(item.video_url || '')}" placeholder="https://youtube.com/shorts/... or https://youtu.be/..." style="margin-top: 4px;" />
            </div>

            <!-- Description -->
            <div>
              <label style="font-size: 11px; font-weight: 700; color: var(--text-dim);">DESCRIPTION / NOTES</label>
              <textarea id="editDescription" class="cyber-input" rows="6" style="margin-top: 4px; resize: vertical; max-height: 250px; font-size: 12px; line-height: 1.5;">${this.escapeHtml(item.description || '')}</textarea>
            </div>

            <!-- Image Prompt -->
            <div>
              <label style="font-size: 11px; font-weight: 700; color: var(--text-dim);">AI THUMBNAIL PROMPT</label>
              <textarea id="editImagePrompt" class="cyber-input" rows="3" style="margin-top: 4px; resize: vertical;">${this.escapeHtml(item.image_prompt || '')}</textarea>
            </div>

            <!-- Tags -->
            <div>
              <div style="display: flex; justify-content: space-between; align-items: center;">
                <label style="font-size: 11px; font-weight: 700; color: var(--text-dim);">TAGS</label>
                <span id="editTagsCounter" style="font-size: 11px; font-family: var(--font-mono); color: var(--text-dim);">
                  ${(item.tags || '').length} / 500 max
                </span>
              </div>
              <textarea id="editTags" class="cyber-input" rows="3" style="margin-top: 4px; resize: vertical; font-size: 11px; font-family: var(--font-mono);">${this.escapeHtml(item.tags || '')}</textarea>
            </div>
          </div>
          <div class="modal-footer">
            <button class="btn-cyber btn-cyber-outline" data-close-modal="true" id="cancelEditModalBtn">Cancel</button>
            <button class="btn-cyber btn-cyber-primary" id="saveEditModalBtn">Save Changes</button>
          </div>
        </div>
      `;

      window.openModal(modal);

      const closeModal = () => window.closeModal(modal);
      document.getElementById('closeEditModalBtn').onclick = closeModal;
      document.getElementById('cancelEditModalBtn').onclick = closeModal;

      const tagsArea = document.getElementById('editTags');
      const tagsCounter = document.getElementById('editTagsCounter');
      tagsArea.oninput = () => {
        tagsCounter.textContent = `${tagsArea.value.length} / 500 max`;
        tagsCounter.style.color = tagsArea.value.length > 500 ? '#ef4444' : 'var(--text-dim)';
      };

      // Wire up on-demand Fetch from YouTube button
      const btnFetchYTMeta = document.getElementById('btnFetchYTMeta');
      if (btnFetchYTMeta) {
        btnFetchYTMeta.onclick = async (e) => {
          e.preventDefault();
          const urlInput = document.getElementById('editVideoUrl');
          const videoUrl = urlInput.value.trim();
          if (!videoUrl) {
            Toast.show('Please enter a YouTube video or short URL first', 'warning');
            urlInput.focus();
            return;
          }

          const originalText = btnFetchYTMeta.innerHTML;
          btnFetchYTMeta.disabled = true;
          btnFetchYTMeta.innerHTML = '<span>⏳</span> Fetching...';

          try {
            const fetchRes = await API.content.fetchMeta({ video_url: videoUrl });
            if (fetchRes.success && fetchRes.data) {
              const d = fetchRes.data;
              if (d.title) {
                document.getElementById('editTitle').value = d.title;
              }
              if (d.description) {
                document.getElementById('editDescription').value = d.description;
              }
              if (d.tags) {
                tagsArea.value = d.tags;
                tagsArea.dispatchEvent(new Event('input'));
              }
              Toast.show('Metadata successfully fetched from YouTube!', 'success');
            } else {
              Toast.show(fetchRes.error || 'Failed to extract YouTube details', 'error');
            }
          } catch (err) {
            Toast.show(`Fetch failed: ${err.message}`, 'error');
          } finally {
            btnFetchYTMeta.disabled = false;
            btnFetchYTMeta.innerHTML = originalText;
          }
        };
      }

      document.getElementById('saveEditModalBtn').onclick = async () => {
        const title = document.getElementById('editTitle').value.trim();
        const tags = tagsArea.value;

        if (!title) {
          Toast.show('Title is required', 'warning');
          return;
        }

        if (tags.length > 500) {
          Toast.show('Tags cannot exceed 500 characters', 'warning');
          return;
        }

        try {
          await API.content.update(id, {
            content_type: document.getElementById('editContentType').value,
            status: document.getElementById('editStatus').value,
            title,
            topic: document.getElementById('editTopic').value,
            video_url: document.getElementById('editVideoUrl').value,
            description: document.getElementById('editDescription').value,
            image_prompt: document.getElementById('editImagePrompt').value,
            tags
          });

          closeModal();
          Toast.show('Content item updated successfully', 'success');
          ContentComponent.loadTableData();
        } catch (err) {
          Toast.show(`Update failed: ${err.message}`, 'error');
        }
      };
    } catch (err) {
      Toast.show(`Failed to fetch item: ${err.message}`, 'error');
    }
  }
};

window.ContentComponent = ContentComponent;
