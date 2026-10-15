/**
 * Executive Topic Notes & Instructions Manager Component
 * Markdown Knowledge Base, SOPs, Scripting Vault, Checklists & Instructions
 */
const NotesComponent = {
  notes: [],
  topics: [],
  summary: { total_notes: 0, pinned_notes: 0, total_topics: 0 },
  selectedTopic: 'all',
  selectedCategory: 'all',
  selectedChannelId: 'all',
  searchQuery: '',
  sortBy: 'updated_at',
  sortOrder: 'DESC',
  viewMode: 'grid', // 'grid' | 'table'
  isLoading: false,

  categoryMeta: {
    instruction: { label: 'Instruction', icon: '📋', color: '#06b6d4', bg: 'rgba(6, 182, 212, 0.15)' },
    guideline: { label: 'SOP / Guideline', icon: '🛡️', color: '#10b981', bg: 'rgba(16, 185, 129, 0.15)' },
    checklist: { label: 'Checklist', icon: '✅', color: '#f59e0b', bg: 'rgba(245, 158, 11, 0.15)' },
    note: { label: 'Note', icon: '📝', color: '#a855f7', bg: 'rgba(168, 85, 247, 0.15)' },
    script: { label: 'Video Script', icon: '🎬', color: '#ec4899', bg: 'rgba(236, 72, 153, 0.15)' },
    snippet: { label: 'Code Snippet', icon: '💻', color: '#3b82f6', bg: 'rgba(59, 130, 246, 0.15)' }
  },

  colorPresets: [
    { label: 'Cyan Glow', value: '#06b6d4' },
    { label: 'Emerald Neon', value: '#10b981' },
    { label: 'Purple Pulse', value: '#a855f7' },
    { label: 'Amber Flame', value: '#f59e0b' },
    { label: 'Rose Tech', value: '#f43f5e' },
    { label: 'Electric Blue', value: '#3b82f6' }
  ],

  escapeHtml(str) {
    if (!str) return '';
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  },

  /**
   * Resilient, high-fidelity Markdown parser with syntax highlighting, tables & task lists
   */
  renderMarkdown(md) {
    if (!md) return '<p style="color: var(--text-dim); font-style: italic;">Empty document.</p>';

    // If marked library is available from CDN, use it
    if (typeof window.marked !== 'undefined' && typeof window.marked.parse === 'function') {
      try {
        return window.marked.parse(md, { gfm: true, breaks: true });
      } catch (e) {
        console.warn('Marked parse error, using native parser:', e);
      }
    }

    // Built-in fallback parser
    let html = this.escapeHtml(md);

    // Code blocks with syntax copy button
    html = html.replace(/```([a-zA-Z0-9_\-\.]*)\n([\s\S]*?)```/g, (match, lang, code) => {
      const codeId = 'code_' + Math.random().toString(36).substring(2, 9);
      return `
        <div class="md-code-block-wrap" style="position: relative; margin: 16px 0; background: #070913; border: 1px solid rgba(255,255,255,0.1); border-radius: 8px; overflow: hidden;">
          <div style="display: flex; justify-content: space-between; align-items: center; padding: 6px 12px; background: rgba(255,255,255,0.04); border-bottom: 1px solid rgba(255,255,255,0.06); font-family: var(--font-mono); font-size: 11px; color: var(--text-dim);">
            <span>${lang || 'code'}</span>
            <button type="button" class="btn-cyber btn-cyber-secondary btn-sm" style="padding: 2px 8px; font-size: 10px;" onclick="NotesComponent.copyCodeBlock('${codeId}')">📋 Copy</button>
          </div>
          <pre id="${codeId}" style="margin: 0; padding: 14px; overflow-x: auto; font-family: var(--font-mono); font-size: 12px; line-height: 1.5; color: #a5f3fc;"><code>${code}</code></pre>
        </div>
      `;
    });

    // Inline code
    html = html.replace(/`([^`]+)`/g, '<code class="md-inline-code" style="background: rgba(255,255,255,0.08); padding: 2px 6px; border-radius: 4px; font-family: var(--font-mono); font-size: 11.5px; color: var(--accent-cyan);">$1</code>');

    // Headings
    html = html.replace(/^### (.*$)/gim, '<h3 style="font-size: 16px; font-weight: 800; color: var(--text-main); margin: 20px 0 10px 0;">$1</h3>');
    html = html.replace(/^## (.*$)/gim, '<h2 style="font-size: 18px; font-weight: 800; color: var(--text-main); margin: 24px 0 12px 0; border-bottom: 1px solid var(--border-color); padding-bottom: 6px;">$1</h2>');
    html = html.replace(/^# (.*$)/gim, '<h1 style="font-size: 22px; font-weight: 900; color: var(--text-main); margin: 28px 0 16px 0; border-bottom: 1px solid var(--border-color); padding-bottom: 8px;">$1</h1>');

    // Blockquotes & Alerts
    html = html.replace(/^\> \[\!NOTE\] (.*$)/gim, '<div class="md-alert md-alert-note" style="background: rgba(59, 130, 246, 0.1); border-left: 4px solid #3b82f6; padding: 12px 16px; margin: 14px 0; border-radius: 0 6px 6px 0; font-size: 12.5px;"><strong>ℹ️ Note:</strong> $1</div>');
    html = html.replace(/^\> \[\!TIP\] (.*$)/gim, '<div class="md-alert md-alert-tip" style="background: rgba(16, 185, 129, 0.1); border-left: 4px solid #10b981; padding: 12px 16px; margin: 14px 0; border-radius: 0 6px 6px 0; font-size: 12.5px;"><strong>💡 Tip:</strong> $1</div>');
    html = html.replace(/^\> \[\!WARNING\] (.*$)/gim, '<div class="md-alert md-alert-warning" style="background: rgba(245, 158, 11, 0.1); border-left: 4px solid #f59e0b; padding: 12px 16px; margin: 14px 0; border-radius: 0 6px 6px 0; font-size: 12.5px;"><strong>⚠️ Warning:</strong> $1</div>');
    html = html.replace(/^\> (.*$)/gim, '<blockquote style="border-left: 3px solid var(--accent-cyan); margin: 14px 0; padding: 8px 16px; background: rgba(0,0,0,0.2); color: var(--text-muted); font-style: italic;">$1</blockquote>');

    // Task Checklists
    html = html.replace(/^- \[x\] (.*$)/gim, '<div style="display: flex; align-items: center; gap: 8px; margin: 4px 0;"><span style="color: #10b981; font-weight: 800;">✓</span> <span style="text-decoration: line-through; color: var(--text-dim);">$1</span></div>');
    html = html.replace(/^- \[ \] (.*$)/gim, '<div style="display: flex; align-items: center; gap: 8px; margin: 4px 0;"><span style="color: var(--text-dim);">○</span> <span>$1</span></div>');

    // Bullet lists
    html = html.replace(/^\- (.*$)/gim, '<li style="margin: 4px 0; margin-left: 20px;">$1</li>');
    html = html.replace(/(<li.*<\/li>)/s, '<ul>$1</ul>');

    // Bold & Italics
    html = html.replace(/\*\*([^*]+)\*\*/g, '<strong style="color: var(--text-main); font-weight: 700;">$1</strong>');
    html = html.replace(/\*([^*]+)\*/g, '<em style="color: var(--text-muted);">$1</em>');

    // Horizontal Rules
    html = html.replace(/^---$/gim, '<hr style="border: 0; border-top: 1px solid var(--border-color); margin: 20px 0;" />');

    // Markdown Links
    html = html.replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" target="_blank" rel="noopener noreferrer" style="color: var(--accent-cyan); text-decoration: underline;">$1 ↗</a>');

    // Paragraphs
    html = html.split('\n\n').map(p => {
      p = p.trim();
      if (!p) return '';
      if (p.startsWith('<h') || p.startsWith('<div') || p.startsWith('<blockquote') || p.startsWith('<pre') || p.startsWith('<hr') || p.startsWith('<ul')) {
        return p;
      }
      return `<p style="margin: 10px 0; line-height: 1.6; color: var(--text-main); font-size: 13.5px;">${p}</p>`;
    }).join('');

    return html;
  },

  /**
   * Plain text excerpt generator
   */
  getExcerpt(md, maxChars = 140) {
    if (!md) return 'No content provided.';
    const clean = md
      .replace(/#+\s/g, '')
      .replace(/```[\s\S]*?```/g, '[Code Snippet]')
      .replace(/`([^`]+)`/g, '$1')
      .replace(/\*\*([^*]+)\*\*/g, '$1')
      .replace(/\*([^*]+)\*/g, '$1')
      .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')
      .replace(/>\s/g, '')
      .replace(/[-*]\s/g, '')
      .replace(/\n+/g, ' ')
      .trim();

    if (clean.length <= maxChars) return clean;
    return clean.substring(0, maxChars) + '...';
  },

  /**
   * Word count & reading time calculation
   */
  getReadingStats(text) {
    if (!text) return { words: 0, readTime: '1 min read' };
    const words = text.trim().split(/\s+/).filter(Boolean).length;
    const minutes = Math.max(1, Math.ceil(words / 200));
    return {
      words,
      readTime: `${minutes} min read`
    };
  },

  async render(container) {
    container.innerHTML = `
      <div style="display: flex; align-items: center; justify-content: center; height: 320px;">
        <div style="font-family: var(--font-tech); color: var(--accent-cyan); font-size: 16px; letter-spacing: 1px;">
          INITIALIZING TOPIC NOTES & INSTRUCTION VAULT...
        </div>
      </div>
    `;

    try {
      await this.loadData();
      this.renderView(container);
    } catch (err) {
      console.error('[NOTES] Render error:', err);
      container.innerHTML = `
        <div class="glass-card" style="padding: 40px; text-align: center; max-width: 600px; margin: 40px auto; border-color: #ef4444;">
          <div style="font-size: 40px; margin-bottom: 12px;">⚠️</div>
          <h2 style="font-size: 18px; color: #ef4444; font-weight: 800;">Failed to Load Notes Vault</h2>
          <p style="color: var(--text-muted); font-size: 13px; margin: 10px 0 20px;">${this.escapeHtml(err.message)}</p>
          <button class="btn-cyber btn-cyber-primary" onclick="NotesComponent.render(document.getElementById('mainContentArea'))">
            🔄 Retry Loading
          </button>
        </div>
      `;
    }
  },

  async loadData() {
    this.isLoading = true;
    try {
      const globalActive = API.getActiveChannelId();
      this.selectedChannelId = globalActive || 'all';

      const res = await API.notes.list({
        topic: this.selectedTopic,
        category: this.selectedCategory,
        search: this.searchQuery,
        channel_id: this.selectedChannelId,
        sort_by: this.sortBy,
        order: this.sortOrder,
        limit: 200
      });

      this.notes = res.notes || [];
      this.topics = res.topics || [];
      this.summary = res.summary || { total_notes: 0, pinned_notes: 0, total_topics: 0 };
    } catch (err) {
      Toast.show('Error loading notes: ' + err.message, 'error');
      this.notes = [];
    } finally {
      this.isLoading = false;
    }
  },

  renderView(container) {
    const totalCount = this.summary.total_notes || this.notes.length;
    const pinnedCount = this.summary.pinned_notes || this.notes.filter(n => n.is_pinned).length;
    const topicCount = this.summary.total_topics || this.topics.length;

    // Total words across loaded notes
    const totalWords = this.notes.reduce((acc, curr) => acc + (this.getReadingStats(curr.content).words), 0);

    container.innerHTML = `
      <div style="max-width: 1300px; margin: 0 auto; padding-bottom: 60px;">
        <!-- Top Action & Title Header -->
        <div class="glass-card" style="padding: 24px; margin-bottom: 22px; border-color: var(--accent-cyan);">
          <div style="display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 16px;">
            <div style="display: flex; align-items: center; gap: 14px;">
              <div style="width: 48px; height: 48px; border-radius: 12px; background: linear-gradient(135deg, rgba(6, 182, 212, 0.3), rgba(59, 130, 246, 0.3)); display: flex; align-items: center; justify-content: center; font-size: 24px; border: 1px solid var(--accent-cyan);">
                📝
              </div>
              <div>
                <div style="display: flex; align-items: center; gap: 10px;">
                  <h1 style="font-size: 22px; font-weight: 800; color: var(--text-main); margin: 0;">
                    TOPIC NOTES & INSTRUCTION VAULT
                  </h1>
                  <span class="badge badge-cyan" style="font-size: 10px; padding: 2px 8px;">
                    MARKDOWN KNOWLEDGE BASE
                  </span>
                </div>
                <p style="font-size: 12px; color: var(--text-dim); margin-top: 4px;">
                  Centralized studio guidelines, SOPs, scripting playbooks, checklists & topic-based instructions.
                </p>
              </div>
            </div>

            <div style="display: flex; align-items: center; gap: 10px; flex-wrap: wrap;">
              <!-- View Mode Toggles -->
              <div style="display: flex; background: var(--bg-panel); padding: 3px; border-radius: var(--radius-sm); border: 1px solid var(--border-color);">
                <button 
                  type="button" 
                  class="btn-cyber btn-sm" 
                  style="padding: 4px 10px; ${this.viewMode === 'grid' ? 'background: var(--accent-cyan); color: #070913; font-weight: 800;' : 'background: transparent; color: var(--text-dim);'}" 
                  onclick="NotesComponent.setViewMode('grid')"
                  title="Grid Cards View"
                >
                  ◫ Cards
                </button>
                <button 
                  type="button" 
                  class="btn-cyber btn-sm" 
                  style="padding: 4px 10px; ${this.viewMode === 'table' ? 'background: var(--accent-cyan); color: #070913; font-weight: 800;' : 'background: transparent; color: var(--text-dim);'}" 
                  onclick="NotesComponent.setViewMode('table')"
                  title="Data Table View"
                >
                  ☰ Ledger
                </button>
              </div>

              <button class="btn-cyber btn-cyber-primary" onclick="NotesComponent.openEditorModal()">
                <span>+</span>
                <span>NEW NOTE / INSTRUCTION</span>
              </button>
            </div>
          </div>
        </div>

        <!-- KPI Metric Strip -->
        <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(230px, 1fr)); gap: 16px; margin-bottom: 24px;">
          <!-- Card 1: Total Notes -->
          <div class="glass-card" style="padding: 18px; border-color: rgba(6, 182, 212, 0.3);">
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px;">
              <span style="font-size: 11px; font-weight: 700; color: var(--text-dim); text-transform: uppercase; letter-spacing: 0.5px;">Indexed Directives</span>
              <span style="font-size: 18px;">📚</span>
            </div>
            <div style="font-size: 28px; font-weight: 900; color: var(--accent-cyan); font-family: var(--font-tech);">${totalCount}</div>
            <div style="font-size: 11px; color: var(--text-muted); margin-top: 4px;">
              <span>Active documents in vault</span>
            </div>
          </div>

          <!-- Card 2: Pinned Directives -->
          <div class="glass-card" style="padding: 18px; border-color: rgba(168, 85, 247, 0.3);">
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px;">
              <span style="font-size: 11px; font-weight: 700; color: var(--text-dim); text-transform: uppercase; letter-spacing: 0.5px;">Pinned to Top</span>
              <span style="font-size: 18px;">📌</span>
            </div>
            <div style="font-size: 28px; font-weight: 900; color: #a78bfa; font-family: var(--font-tech);">${pinnedCount}</div>
            <div style="font-size: 11px; color: var(--text-muted); margin-top: 4px;">
              <span>High-priority directives</span>
            </div>
          </div>

          <!-- Card 3: Topic Categories -->
          <div class="glass-card" style="padding: 18px; border-color: rgba(16, 185, 129, 0.3);">
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px;">
              <span style="font-size: 11px; font-weight: 700; color: var(--text-dim); text-transform: uppercase; letter-spacing: 0.5px;">Domain Topics</span>
              <span style="font-size: 18px;">🏷️</span>
            </div>
            <div style="font-size: 28px; font-weight: 900; color: #10b981; font-family: var(--font-tech);">${topicCount}</div>
            <div style="font-size: 11px; color: var(--text-muted); margin-top: 4px;">
              <span>Distinct topics organized</span>
            </div>
          </div>

          <!-- Card 4: Total Knowledge Words -->
          <div class="glass-card" style="padding: 18px; border-color: rgba(245, 158, 11, 0.3);">
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px;">
              <span style="font-size: 11px; font-weight: 700; color: var(--text-dim); text-transform: uppercase; letter-spacing: 0.5px;">Knowledge Volume</span>
              <span style="font-size: 18px;">💡</span>
            </div>
            <div style="font-size: 28px; font-weight: 900; color: #fbbf24; font-family: var(--font-tech);">${totalWords.toLocaleString()} <span style="font-size: 14px; font-weight: 600; color: var(--text-dim);">words</span></div>
            <div style="font-size: 11px; color: var(--text-muted); margin-top: 4px;">
              <span>Markdown documentation</span>
            </div>
          </div>
        </div>

        <!-- Executive SaaS Filter & Search Toolbar -->
        <div class="filter-toolbar-premium" style="margin-bottom: 22px;">
          <div style="display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 14px;">
            <!-- Search Box with Embedded SVG -->
            <div style="flex: 2; min-width: 280px; position: relative;">
              <input 
                type="text" 
                id="notesSearchInput" 
                class="cyber-input" 
                placeholder="🔍 Search notes by title, topic, content, or tags..." 
                value="${this.escapeHtml(this.searchQuery)}"
                oninput="NotesComponent.onSearchChange(this.value)"
                style="padding-left: 14px;"
              />
              ${this.searchQuery ? `
                <button type="button" style="position: absolute; right: 10px; top: 50%; transform: translateY(-50%); background: none; border: none; color: var(--text-dim); cursor: pointer;" onclick="NotesComponent.clearSearch()">✕</button>
              ` : ''}
            </div>

            <!-- Topic Dropdown -->
            <div style="display: flex; align-items: center; gap: 8px;">
              <label style="font-size: 11px; font-weight: 700; color: var(--text-dim); text-transform: uppercase;">Topic:</label>
              <select class="cyber-input" style="min-width: 170px;" onchange="NotesComponent.onTopicChange(this.value)">
                <option value="all" ${this.selectedTopic === 'all' ? 'selected' : ''}>All Topics (${totalCount})</option>
                ${this.topics.map(t => `
                  <option value="${this.escapeHtml(t.topic)}" ${this.selectedTopic === t.topic ? 'selected' : ''}>
                    ${this.escapeHtml(t.topic)} (${t.count})
                  </option>
                `).join('')}
              </select>
            </div>

            <!-- Type Dropdown -->
            <div style="display: flex; align-items: center; gap: 8px;">
              <label style="font-size: 11px; font-weight: 700; color: var(--text-dim); text-transform: uppercase;">Type:</label>
              <select class="cyber-input" style="min-width: 150px;" onchange="NotesComponent.onCategoryChange(this.value)">
                <option value="all" ${this.selectedCategory === 'all' ? 'selected' : ''}>All Types</option>
                <option value="instruction" ${this.selectedCategory === 'instruction' ? 'selected' : ''}>📋 Instruction</option>
                <option value="guideline" ${this.selectedCategory === 'guideline' ? 'selected' : ''}>🛡️ SOP / Guideline</option>
                <option value="checklist" ${this.selectedCategory === 'checklist' ? 'selected' : ''}>✅ Checklist</option>
                <option value="note" ${this.selectedCategory === 'note' ? 'selected' : ''}>📝 Note</option>
                <option value="script" ${this.selectedCategory === 'script' ? 'selected' : ''}>🎬 Video Script</option>
                <option value="snippet" ${this.selectedCategory === 'snippet' ? 'selected' : ''}>💻 Code Snippet</option>
              </select>
            </div>

            <!-- Sort Dropdown -->
            <div style="display: flex; align-items: center; gap: 8px;">
              <label style="font-size: 11px; font-weight: 700; color: var(--text-dim); text-transform: uppercase;">Sort:</label>
              <select class="cyber-input" style="width: 150px;" onchange="NotesComponent.onSortChange(this.value)">
                <option value="updated_at" ${this.sortBy === 'updated_at' ? 'selected' : ''}>Recently Updated</option>
                <option value="created_at" ${this.sortBy === 'created_at' ? 'selected' : ''}>Date Created</option>
                <option value="title" ${this.sortBy === 'title' ? 'selected' : ''}>Title (A-Z)</option>
                <option value="topic" ${this.sortBy === 'topic' ? 'selected' : ''}>Topic (A-Z)</option>
              </select>
            </div>

            ${(this.searchQuery || this.selectedTopic !== 'all' || this.selectedCategory !== 'all') ? `
              <button class="btn-cyber btn-cyber-secondary btn-sm" onclick="NotesComponent.resetFilters()">
                ✕ Clear
              </button>
            ` : ''}
          </div>

          <!-- Fast Clickable Topic Pills -->
          <div style="display: flex; align-items: center; gap: 8px; flex-wrap: wrap; margin-top: 14px; padding-top: 12px; border-top: 1px solid var(--border-color);">
            <span style="font-size: 11px; font-weight: 700; color: var(--text-dim); text-transform: uppercase;">Quick Topics:</span>
            <button 
              type="button" 
              class="nav-pill-item ${this.selectedTopic === 'all' ? 'active' : ''}" 
              style="padding: 3px 10px; font-size: 11px; cursor: pointer;"
              onclick="NotesComponent.onTopicChange('all')"
            >
              All Topics
            </button>
            ${this.topics.slice(0, 8).map(t => `
              <button 
                type="button" 
                class="nav-pill-item ${this.selectedTopic === t.topic ? 'active' : ''}" 
                style="padding: 3px 10px; font-size: 11px; cursor: pointer;"
                onclick="NotesComponent.onTopicChange('${this.escapeHtml(t.topic)}')"
              >
                <span>${this.escapeHtml(t.topic)}</span>
                <span class="pill-count" style="margin-left: 4px;">${t.count}</span>
              </button>
            `).join('')}
          </div>
        </div>

        <!-- Notes Content Container (Grid or Table) -->
        <div id="notesContainerArea">
          ${this.viewMode === 'grid' ? this.renderGridView() : this.renderTableView()}
        </div>
      </div>
    `;
  },

  renderGridView() {
    if (this.notes.length === 0) {
      return this.renderEmptyState();
    }

    return `
      <div style="display: grid; grid-template-columns: repeat(auto-fill, minmax(360px, 1fr)); gap: 20px;">
        ${this.notes.map(note => this.renderNoteCard(note)).join('')}
      </div>
    `;
  },

  renderNoteCard(note) {
    const meta = this.categoryMeta[note.category] || this.categoryMeta.note;
    const stats = this.getReadingStats(note.content);
    const excerpt = this.getExcerpt(note.content, 140);
    const color = note.color || '#06b6d4';

    return `
      <div class="glass-card" style="padding: 22px; display: flex; flex-direction: column; justify-content: space-between; border-color: ${note.is_pinned ? color : 'rgba(255,255,255,0.08)'}; position: relative; transition: all 0.2s ease;">
        <!-- Top Colored Glow Border Accent -->
        <div style="position: absolute; top: 0; left: 0; right: 0; height: 3px; background: ${color}; border-radius: var(--radius-sm) var(--radius-sm) 0 0;"></div>

        <div>
          <!-- Top Row: Topic Badge & Category & Pin -->
          <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 12px;">
            <div style="display: flex; align-items: center; gap: 8px; flex-wrap: wrap;">
              <span class="badge" style="background: ${color}25; color: ${color}; border-color: ${color}60; font-size: 10px; font-weight: 700;">
                🏷️ ${this.escapeHtml(note.topic)}
              </span>
              <span class="badge" style="background: ${meta.bg}; color: ${meta.color}; border-color: ${meta.color}60; font-size: 9.5px;">
                ${meta.icon} ${meta.label.toUpperCase()}
              </span>
            </div>

            <!-- Pin Toggle Button -->
            <button 
              type="button" 
              class="btn-cyber btn-sm" 
              style="padding: 2px 7px; font-size: 12px; background: ${note.is_pinned ? 'rgba(168, 85, 247, 0.2)' : 'transparent'}; border-color: ${note.is_pinned ? '#a855f7' : 'transparent'};" 
              onclick="NotesComponent.togglePin('${note.id}')"
              title="${note.is_pinned ? 'Unpin directive' : 'Pin directive to top'}"
            >
              ${note.is_pinned ? '📌' : '📍'}
            </button>
          </div>

          <!-- Note Title -->
          <h3 
            style="font-size: 16px; font-weight: 800; color: var(--text-main); margin-bottom: 8px; line-height: 1.35; cursor: pointer;" 
            onclick="NotesComponent.openReaderModal('${note.id}')"
            title="Click to read markdown note"
          >
            ${this.escapeHtml(note.title)}
          </h3>

          <!-- Excerpt -->
          <p style="font-size: 12.5px; color: var(--text-muted); line-height: 1.5; margin-bottom: 16px; min-height: 38px; display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden;">
            ${this.escapeHtml(excerpt)}
          </p>

          <!-- Tags -->
          ${note.tags ? `
            <div style="display: flex; gap: 6px; flex-wrap: wrap; margin-bottom: 14px;">
              ${note.tags.split(',').map(tag => tag.trim()).filter(Boolean).slice(0, 4).map(t => `
                <span style="font-size: 10px; color: var(--text-dim); background: rgba(255,255,255,0.05); padding: 1px 6px; border-radius: 4px; font-family: var(--font-mono);">
                  #${this.escapeHtml(t)}
                </span>
              `).join('')}
            </div>
          ` : ''}

          <!-- Metadata info: reading time & last updated -->
          <div style="display: flex; justify-content: space-between; align-items: center; font-size: 11px; color: var(--text-dim); margin-bottom: 16px; padding-top: 8px; border-top: 1px solid rgba(255,255,255,0.05);">
            <span>⏱️ ${stats.readTime} • ${stats.words} words</span>
            <span>${this.formatDate(note.updated_at)}</span>
          </div>
        </div>

        <!-- Action Buttons -->
        <div style="display: flex; gap: 8px; border-top: 1px solid var(--border-color); padding-top: 14px;">
          <button 
            type="button" 
            class="btn-cyber btn-cyber-primary" 
            style="flex: 2; display: flex; align-items: center; justify-content: center; gap: 6px; font-weight: 700; font-size: 12px; background: linear-gradient(135deg, ${color}, #3b82f6);" 
            onclick="NotesComponent.openReaderModal('${note.id}')"
          >
            <span>👁️</span>
            <span>READ</span>
          </button>
          <button 
            type="button" 
            class="btn-cyber btn-cyber-secondary" 
            style="flex: 1; display: flex; align-items: center; justify-content: center; gap: 4px; font-size: 12px;" 
            onclick="NotesComponent.openEditorModal('${note.id}')"
            title="Edit Note"
          >
            <span>✏️</span>
            <span>EDIT</span>
          </button>
          <button 
            type="button" 
            class="btn-cyber btn-cyber-outline" 
            style="padding: 6px 10px;" 
            onclick="NotesComponent.downloadMarkdown('${note.id}')"
            title="Download .md File"
          >
            <span>⬇️</span>
          </button>
          <button 
            type="button" 
            class="btn-cyber btn-cyber-danger" 
            style="padding: 6px 10px;" 
            onclick="NotesComponent.confirmDeleteNote('${note.id}')"
            title="Delete Note"
          >
            <span>🗑️</span>
          </button>
        </div>
      </div>
    `;
  },

  renderTableView() {
    if (this.notes.length === 0) {
      return this.renderEmptyState();
    }

    return `
      <div class="glass-card" style="padding: 0; overflow: hidden;">
        <div style="overflow-x: auto;">
          <table class="cyber-table" style="width: 100%; border-collapse: collapse; text-align: left;">
            <thead>
              <tr style="border-bottom: 1px solid var(--border-color); background: rgba(0,0,0,0.2);">
                <th style="padding: 14px 18px; font-size: 11px; font-weight: 700; color: var(--text-dim); text-transform: uppercase;">Doc Title</th>
                <th style="padding: 14px 18px; font-size: 11px; font-weight: 700; color: var(--text-dim); text-transform: uppercase;">Topic</th>
                <th style="padding: 14px 18px; font-size: 11px; font-weight: 700; color: var(--text-dim); text-transform: uppercase;">Type</th>
                <th style="padding: 14px 18px; font-size: 11px; font-weight: 700; color: var(--text-dim); text-transform: uppercase;">Volume</th>
                <th style="padding: 14px 18px; font-size: 11px; font-weight: 700; color: var(--text-dim); text-transform: uppercase;">Updated</th>
                <th style="padding: 14px 18px; font-size: 11px; font-weight: 700; color: var(--text-dim); text-transform: uppercase; text-align: right;">Actions</th>
              </tr>
            </thead>
            <tbody>
              ${this.notes.map(note => {
                const meta = this.categoryMeta[note.category] || this.categoryMeta.note;
                const stats = this.getReadingStats(note.content);
                const color = note.color || '#06b6d4';

                return `
                  <tr style="border-bottom: 1px solid rgba(255,255,255,0.05); transition: background 0.15s ease;">
                    <td style="padding: 12px 18px;">
                      <div style="display: flex; align-items: center; gap: 8px;">
                        ${note.is_pinned ? '<span title="Pinned">📌</span>' : ''}
                        <div 
                          style="font-weight: 700; font-size: 13.5px; color: var(--text-main); cursor: pointer;" 
                          onclick="NotesComponent.openReaderModal('${note.id}')"
                        >
                          ${this.escapeHtml(note.title)}
                        </div>
                      </div>
                    </td>
                    <td style="padding: 12px 18px;">
                      <span class="badge" style="background: ${color}20; color: ${color}; border-color: ${color}50; font-size: 10px;">
                        ${this.escapeHtml(note.topic)}
                      </span>
                    </td>
                    <td style="padding: 12px 18px;">
                      <span class="badge" style="background: ${meta.bg}; color: ${meta.color}; border-color: ${meta.color}50; font-size: 10px;">
                        ${meta.icon} ${meta.label}
                      </span>
                    </td>
                    <td style="padding: 12px 18px; font-size: 11px; color: var(--text-dim); font-family: var(--font-mono);">
                      ${stats.words} words
                    </td>
                    <td style="padding: 12px 18px; font-size: 11px; color: var(--text-muted);">
                      ${this.formatDate(note.updated_at)}
                    </td>
                    <td style="padding: 12px 18px; text-align: right;">
                      <div style="display: flex; justify-content: flex-end; gap: 6px;">
                        <button type="button" class="btn-cyber btn-cyber-primary btn-sm" onclick="NotesComponent.openReaderModal('${note.id}')" title="Read Note">
                          👁️ View
                        </button>
                        <button type="button" class="btn-cyber btn-cyber-secondary btn-sm" onclick="NotesComponent.openEditorModal('${note.id}')" title="Edit Note">
                          ✏️ Edit
                        </button>
                        <button type="button" class="btn-cyber btn-cyber-danger btn-sm" onclick="NotesComponent.confirmDeleteNote('${note.id}')" title="Delete Note">
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
      </div>
    `;
  },

  renderEmptyState() {
    return `
      <div class="glass-card" style="padding: 60px 20px; text-align: center;">
        <div style="font-size: 44px; margin-bottom: 14px;">📝</div>
        <h3 style="font-size: 17px; font-weight: 800; color: var(--text-main); margin-bottom: 8px;">No Notes Found</h3>
        <p style="font-size: 13px; color: var(--text-muted); max-width: 480px; margin: 0 auto 20px;">
          ${this.searchQuery || this.selectedTopic !== 'all' || this.selectedCategory !== 'all'
            ? 'No notes match your current search query or topic filter.'
            : 'Your knowledge base is empty. Create your first topic-based instruction, SOP, or script note now.'}
        </p>
        <button class="btn-cyber btn-cyber-primary" onclick="NotesComponent.openEditorModal()">
          <span>+</span>
          <span>CREATE FIRST NOTE</span>
        </button>
      </div>
    `;
  },

  setViewMode(mode) {
    this.viewMode = mode;
    const area = document.getElementById('notesContainerArea');
    if (area) {
      area.innerHTML = mode === 'grid' ? this.renderGridView() : this.renderTableView();
    } else {
      this.render(document.getElementById('mainContentArea'));
    }
  },

  onSearchChange(val) {
    this.searchQuery = val;
    this.reloadAndRefresh();
  },

  clearSearch() {
    this.searchQuery = '';
    const input = document.getElementById('notesSearchInput');
    if (input) input.value = '';
    this.reloadAndRefresh();
  },

  onTopicChange(val) {
    this.selectedTopic = val;
    this.reloadAndRefresh();
  },

  onCategoryChange(val) {
    this.selectedCategory = val;
    this.reloadAndRefresh();
  },

  onSortChange(val) {
    this.sortBy = val;
    this.reloadAndRefresh();
  },

  resetFilters() {
    this.searchQuery = '';
    this.selectedTopic = 'all';
    this.selectedCategory = 'all';
    this.sortBy = 'updated_at';
    this.reloadAndRefresh();
  },

  async reloadAndRefresh() {
    await this.loadData();
    const area = document.getElementById('notesContainerArea');
    if (area) {
      area.innerHTML = this.viewMode === 'grid' ? this.renderGridView() : this.renderTableView();
    }
  },

  async togglePin(noteId) {
    try {
      const res = await API.notes.togglePin(noteId);
      Toast.show(res.message, 'success', 2000);
      await this.reloadAndRefresh();
    } catch (err) {
      Toast.show('Failed to toggle pin: ' + err.message, 'error');
    }
  },

  downloadMarkdown(noteId) {
    const note = this.notes.find(n => n.id === noteId);
    if (!note) return;

    const blob = new Blob([note.content || ''], { type: 'text/markdown;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    const cleanTitle = (note.title || 'note').replace(/[^a-zA-Z0-9_\-\.]/g, '_').toLowerCase();
    a.download = `${cleanTitle}.md`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    Toast.show(`Downloaded "${cleanTitle}.md"`, 'info', 2000);
  },

  copyCodeBlock(codeId) {
    const el = document.getElementById(codeId);
    if (!el) return;
    const text = el.innerText;
    navigator.clipboard.writeText(text).then(() => {
      Toast.show('Code snippet copied to clipboard!', 'success', 2000);
    }).catch(err => {
      Toast.show('Copy failed: ' + err.message, 'error');
    });
  },

  // ==========================================
  // MODAL 1: RICH MARKDOWN READER MODAL
  // ==========================================
  openReaderModal(noteId) {
    const note = this.notes.find(n => n.id === noteId);
    if (!note) {
      Toast.show('Note not found.', 'error');
      return;
    }

    const modalRoot = document.getElementById('modalRoot');
    if (!modalRoot) return;

    const meta = this.categoryMeta[note.category] || this.categoryMeta.note;
    const stats = this.getReadingStats(note.content);
    const renderedHtml = this.renderMarkdown(note.content);
    const color = note.color || '#06b6d4';

    modalRoot.innerHTML = `
      <div class="cyber-modal-overlay" style="display: flex; align-items: center; justify-content: center; position: fixed; inset: 0; background: rgba(0,0,0,0.88); z-index: 10000; padding: 20px; overflow-y: auto;">
        <div class="glass-card" style="max-width: 860px; width: 100%; padding: 0; border-color: ${color}; max-height: 90vh; display: flex; flex-direction: column; overflow: hidden; box-shadow: 0 10px 40px rgba(0,0,0,0.6);">
          <!-- Top Accent Glow Stripe -->
          <div style="height: 4px; background: linear-gradient(90deg, ${color}, #3b82f6, #a855f7);"></div>

          <!-- Modal Header -->
          <div style="padding: 22px 26px; border-bottom: 1px solid var(--border-color); display: flex; justify-content: space-between; align-items: flex-start; background: rgba(0,0,0,0.2);">
            <div style="flex: 1; padding-right: 20px;">
              <div style="display: flex; align-items: center; gap: 8px; flex-wrap: wrap; margin-bottom: 8px;">
                <span class="badge" style="background: ${color}25; color: ${color}; border-color: ${color}; font-size: 10.5px; font-weight: 700;">
                  🏷️ ${this.escapeHtml(note.topic)}
                </span>
                <span class="badge" style="background: ${meta.bg}; color: ${meta.color}; border-color: ${meta.color}; font-size: 10px;">
                  ${meta.icon} ${meta.label.toUpperCase()}
                </span>
                ${note.is_pinned ? '<span class="badge badge-purple" style="font-size: 10px;">📌 PINNED DIRECTIVE</span>' : ''}
              </div>
              <h2 style="font-size: 20px; font-weight: 800; color: var(--text-main); margin: 0; line-height: 1.3;">
                ${this.escapeHtml(note.title)}
              </h2>
              <div style="font-size: 11.5px; color: var(--text-dim); margin-top: 6px; display: flex; align-items: center; gap: 12px; flex-wrap: wrap;">
                <span>⏱️ ${stats.readTime} (${stats.words} words)</span>
                <span>•</span>
                <span>Last Updated: ${this.formatDate(note.updated_at)}</span>
                ${note.author_username ? `<span>• Author: @${this.escapeHtml(note.author_username)}</span>` : ''}
              </div>
            </div>

            <!-- Header Controls: Edit, Download, Close -->
            <div style="display: flex; align-items: center; gap: 8px;">
              <button 
                type="button" 
                class="btn-cyber btn-cyber-secondary btn-sm" 
                onclick="NotesComponent.openEditorModal('${note.id}')"
                title="Edit this note"
              >
                ✏️ Edit
              </button>
              <button 
                type="button" 
                class="btn-cyber btn-cyber-outline btn-sm" 
                onclick="NotesComponent.downloadMarkdown('${note.id}')"
                title="Download .md file"
              >
                ⬇️ Export
              </button>
              <button 
                type="button" 
                class="modal-close-btn" 
                onclick="document.getElementById('modalRoot').innerHTML=''" 
                style="background: none; border: none; color: var(--text-dim); font-size: 18px; cursor: pointer; padding: 4px;"
                title="Close (Esc)"
              >
                ✕
              </button>
            </div>
          </div>

          <!-- Modal Body (Rendered Markdown) -->
          <div style="padding: 26px; overflow-y: auto; flex: 1; background: rgba(7, 9, 19, 0.4);">
            <div class="markdown-body-rendered" style="color: var(--text-main); line-height: 1.7; font-size: 13.5px;">
              ${renderedHtml}
            </div>

            ${note.tags ? `
              <div style="margin-top: 30px; padding-top: 16px; border-top: 1px solid var(--border-color); display: flex; align-items: center; gap: 8px; flex-wrap: wrap;">
                <span style="font-size: 11px; font-weight: 700; color: var(--text-dim); text-transform: uppercase;">Tagged Topics:</span>
                ${note.tags.split(',').map(tag => tag.trim()).filter(Boolean).map(t => `
                  <span class="badge" style="background: rgba(255,255,255,0.06); color: var(--accent-cyan); font-family: var(--font-mono); font-size: 10px;">
                    #${this.escapeHtml(t)}
                  </span>
                `).join('')}
              </div>
            ` : ''}
          </div>

          <!-- Modal Footer -->
          <div style="padding: 14px 26px; border-top: 1px solid var(--border-color); display: flex; justify-content: space-between; align-items: center; background: rgba(0,0,0,0.3);">
            <button 
              type="button" 
              class="btn-cyber btn-cyber-secondary btn-sm" 
              onclick="navigator.clipboard.writeText(document.querySelector('.markdown-body-rendered').innerText); Toast.show('Document text copied to clipboard!', 'success');"
            >
              📋 Copy Raw Text
            </button>
            <button 
              type="button" 
              class="btn-cyber btn-cyber-primary btn-sm" 
              onclick="document.getElementById('modalRoot').innerHTML=''"
            >
              Close Reader
            </button>
          </div>
        </div>
      </div>
    `;

    // Keyboard ESC listener
    const escHandler = (e) => {
      if (e.key === 'Escape') {
        modalRoot.innerHTML = '';
        window.removeEventListener('keydown', escHandler);
      }
    };
    window.addEventListener('keydown', escHandler);
  },

  // ==========================================
  // MODAL 2: FULL-FEATURED MARKDOWN EDITOR
  // ==========================================
  openEditorModal(noteId = null) {
    const isEditing = Boolean(noteId);
    let note = {
      title: '',
      topic: 'General',
      category: 'instruction',
      content: '',
      tags: '',
      color: '#06b6d4',
      is_pinned: false,
      channel_id: this.selectedChannelId !== 'all' ? this.selectedChannelId : null
    };

    if (isEditing) {
      const existing = this.notes.find(n => n.id === noteId);
      if (existing) {
        note = { ...existing };
      }
    }

    const modalRoot = document.getElementById('modalRoot');
    if (!modalRoot) return;

    modalRoot.innerHTML = `
      <div class="cyber-modal-overlay" style="display: flex; align-items: center; justify-content: center; position: fixed; inset: 0; background: rgba(0,0,0,0.88); z-index: 10000; padding: 20px; overflow-y: auto;">
        <div class="glass-card" style="max-width: 960px; width: 100%; padding: 0; border-color: var(--accent-cyan); max-height: 92vh; display: flex; flex-direction: column; overflow: hidden; box-shadow: 0 10px 40px rgba(0,0,0,0.7);">
          <!-- Top Accent Glow Stripe -->
          <div style="height: 4px; background: linear-gradient(90deg, var(--accent-cyan), #3b82f6, #a855f7);"></div>

          <!-- Header -->
          <div style="padding: 18px 24px; border-bottom: 1px solid var(--border-color); display: flex; justify-content: space-between; align-items: center; background: rgba(0,0,0,0.2);">
            <div style="display: flex; align-items: center; gap: 10px;">
              <span style="font-size: 20px;">${isEditing ? '✏️' : '✨'}</span>
              <h3 style="font-size: 17px; font-weight: 800; color: var(--text-main); margin: 0;">
                ${isEditing ? 'EDIT TOPIC DIRECTIVE' : 'COMPOSE NEW TOPIC INSTRUCTION / NOTE'}
              </h3>
            </div>
            <button 
              type="button" 
              class="modal-close-btn" 
              onclick="document.getElementById('modalRoot').innerHTML=''" 
              style="background: none; border: none; color: var(--text-dim); font-size: 18px; cursor: pointer;"
              title="Close"
            >
              ✕
            </button>
          </div>

          <!-- Form Area -->
          <form id="noteComposeForm" style="display: flex; flex-direction: column; flex: 1; overflow: hidden; margin: 0;">
            <div style="padding: 20px 24px; overflow-y: auto; flex: 1;">
              <!-- Row 1: Title & Topic -->
              <div style="display: grid; grid-template-columns: 2fr 1fr; gap: 16px; margin-bottom: 14px;">
                <div>
                  <label style="font-size: 11px; font-weight: 700; color: var(--text-dim); text-transform: uppercase;">Directive / Note Title *</label>
                  <input 
                    type="text" 
                    id="noteFormTitle" 
                    class="cyber-input" 
                    placeholder="e.g. YouTube Shorts Retention Playbook" 
                    value="${this.escapeHtml(note.title)}" 
                    required 
                    style="margin-top: 5px; font-weight: 700;" 
                  />
                </div>
                <div>
                  <label style="font-size: 11px; font-weight: 700; color: var(--text-dim); text-transform: uppercase;">Domain Topic *</label>
                  <input 
                    type="text" 
                    id="noteFormTopic" 
                    list="noteTopicSuggestions" 
                    class="cyber-input" 
                    placeholder="e.g. YouTube Strategy" 
                    value="${this.escapeHtml(note.topic)}" 
                    required 
                    style="margin-top: 5px;" 
                  />
                  <datalist id="noteTopicSuggestions">
                    ${this.topics.map(t => `<option value="${this.escapeHtml(t.topic)}">`).join('')}
                    <option value="YouTube Strategy">
                    <option value="DevOps & Cloud">
                    <option value="Thumbnails & Graphics">
                    <option value="Database & Architecture">
                    <option value="Content Production">
                    <option value="AI & Automation">
                    <option value="Channel Operations">
                  </datalist>
                </div>
              </div>

              <!-- Row 2: Type, Color, Tags & Pin -->
              <div style="display: grid; grid-template-columns: 1fr 1fr 1fr auto; gap: 14px; margin-bottom: 16px; align-items: flex-end;">
                <div>
                  <label style="font-size: 11px; font-weight: 700; color: var(--text-dim); text-transform: uppercase;">Category Type *</label>
                  <select id="noteFormCategory" class="cyber-input" style="margin-top: 5px;">
                    <option value="instruction" ${note.category === 'instruction' ? 'selected' : ''}>📋 Instruction</option>
                    <option value="guideline" ${note.category === 'guideline' ? 'selected' : ''}>🛡️ SOP / Guideline</option>
                    <option value="checklist" ${note.category === 'checklist' ? 'selected' : ''}>✅ Checklist</option>
                    <option value="note" ${note.category === 'note' ? 'selected' : ''}>📝 Note</option>
                    <option value="script" ${note.category === 'script' ? 'selected' : ''}>🎬 Video Script</option>
                    <option value="snippet" ${note.category === 'snippet' ? 'selected' : ''}>💻 Code Snippet</option>
                  </select>
                </div>

                <div>
                  <label style="font-size: 11px; font-weight: 700; color: var(--text-dim); text-transform: uppercase;">Accent Theme</label>
                  <select id="noteFormColor" class="cyber-input" style="margin-top: 5px;">
                    ${this.colorPresets.map(c => `
                      <option value="${c.value}" ${note.color === c.value ? 'selected' : ''}>● ${c.label}</option>
                    `).join('')}
                  </select>
                </div>

                <div>
                  <label style="font-size: 11px; font-weight: 700; color: var(--text-dim); text-transform: uppercase;">Tags (Comma-Separated)</label>
                  <input 
                    type="text" 
                    id="noteFormTags" 
                    class="cyber-input" 
                    placeholder="docker, retention, algorithm" 
                    value="${this.escapeHtml(note.tags || '')}" 
                    style="margin-top: 5px;" 
                  />
                </div>

                <div style="padding-bottom: 4px;">
                  <label style="display: flex; align-items: center; gap: 6px; cursor: pointer; font-size: 12px; font-weight: 700; color: var(--text-main);">
                    <input type="checkbox" id="noteFormIsPinned" ${note.is_pinned ? 'checked' : ''} style="width: 16px; height: 16px; accent-color: #a855f7;" />
                    <span>📌 PIN TO TOP</span>
                  </label>
                </div>
              </div>

              <!-- Markdown Quick Format Toolbar & View Mode Switcher -->
              <div style="display: flex; justify-content: space-between; align-items: center; background: rgba(0,0,0,0.3); padding: 8px 12px; border-radius: var(--radius-sm) var(--radius-sm) 0 0; border: 1px solid var(--border-color); border-bottom: none; flex-wrap: wrap; gap: 8px;">
                <div style="display: flex; align-items: center; gap: 4px; flex-wrap: wrap;">
                  <button type="button" class="btn-cyber btn-sm" onclick="NotesComponent.insertMarkdown('## ')" title="Heading 2">H2</button>
                  <button type="button" class="btn-cyber btn-sm" onclick="NotesComponent.insertMarkdown('### ')" title="Heading 3">H3</button>
                  <button type="button" class="btn-cyber btn-sm" onclick="NotesComponent.insertMarkdown('**', '**')" title="Bold"><strong>B</strong></button>
                  <button type="button" class="btn-cyber btn-sm" onclick="NotesComponent.insertMarkdown('*', '*')" title="Italic"><em>I</em></button>
                  <button type="button" class="btn-cyber btn-sm" onclick="NotesComponent.insertMarkdown('\`\`\`bash\\n', '\\n\`\`\`')" title="Code Block">Code</button>
                  <button type="button" class="btn-cyber btn-sm" onclick="NotesComponent.insertMarkdown('- ')" title="Bullet List">• List</button>
                  <button type="button" class="btn-cyber btn-sm" onclick="NotesComponent.insertMarkdown('- [ ] ')" title="Checklist Task">☑ Task</button>
                  <button type="button" class="btn-cyber btn-sm" onclick="NotesComponent.insertMarkdown('> ')" title="Blockquote">” Quote</button>
                  <button type="button" class="btn-cyber btn-sm" onclick="NotesComponent.insertMarkdown('| Header 1 | Header 2 |\\n| :--- | :--- |\\n| Data 1 | Data 2 |\\n')" title="Markdown Table">Table</button>
                  <button type="button" class="btn-cyber btn-sm" onclick="NotesComponent.insertMarkdown('[', '](url)')" title="Link">Link</button>
                </div>

                <!-- Mode Selector: Write vs Preview vs Split -->
                <div style="display: flex; gap: 4px; background: rgba(0,0,0,0.3); padding: 2px; border-radius: 4px;">
                  <button type="button" id="btnEditorWrite" class="btn-cyber btn-sm" style="background: var(--accent-cyan); color: #070913; font-weight: 700; padding: 2px 10px;" onclick="NotesComponent.switchEditorMode('write')">
                    ✏️ Write
                  </button>
                  <button type="button" id="btnEditorSplit" class="btn-cyber btn-sm" style="background: transparent; color: var(--text-dim); padding: 2px 10px;" onclick="NotesComponent.switchEditorMode('split')">
                    ◫ Split
                  </button>
                  <button type="button" id="btnEditorPreview" class="btn-cyber btn-sm" style="background: transparent; color: var(--text-dim); padding: 2px 10px;" onclick="NotesComponent.switchEditorMode('preview')">
                    👁️ Preview
                  </button>
                </div>
              </div>

              <!-- Main Editor & Live Preview Area -->
              <div id="editorWorkspace" style="display: flex; height: 380px; border: 1px solid var(--border-color); border-radius: 0 0 var(--radius-sm) var(--radius-sm); overflow: hidden;">
                <!-- Textarea -->
                <textarea 
                  id="noteFormContent" 
                  class="cyber-input" 
                  placeholder="# Enter your markdown instructions, checklist, or scripting playbook here...&#10;&#10;Use headings, bold, code blocks, or tables." 
                  style="flex: 1; height: 100%; border: none; border-radius: 0; resize: none; font-family: var(--font-mono); font-size: 12.5px; line-height: 1.6; padding: 16px;"
                  oninput="NotesComponent.onEditorInput()"
                >${this.escapeHtml(note.content)}</textarea>

                <!-- Live Preview Pane -->
                <div 
                  id="noteLivePreviewPane" 
                  class="markdown-body-rendered" 
                  style="display: none; flex: 1; height: 100%; padding: 18px; overflow-y: auto; background: rgba(0,0,0,0.25); border-left: 1px solid var(--border-color); font-size: 13px;"
                ></div>
              </div>

              <!-- Character & Word Status Bar -->
              <div style="display: flex; justify-content: space-between; font-size: 11px; color: var(--text-dim); margin-top: 8px;">
                <span id="editorStatsCounter">Words: 0 • Characters: 0</span>
                <span>Supports GFM Markdown, Tables, Task Lists & Code Blocks</span>
              </div>
            </div>

            <!-- Footer Buttons -->
            <div style="padding: 16px 24px; border-top: 1px solid var(--border-color); display: flex; justify-content: flex-end; gap: 10px; background: rgba(0,0,0,0.3);">
              <button type="button" class="btn-cyber btn-cyber-secondary" onclick="document.getElementById('modalRoot').innerHTML=''">
                CANCEL
              </button>
              <button type="submit" class="btn-cyber btn-cyber-primary" id="btnSaveNote" style="font-weight: 800; min-width: 140px;">
                <span>💾</span>
                <span>${isEditing ? 'UPDATE NOTE' : 'SAVE DIRECTIVE'}</span>
              </button>
            </div>
          </form>
        </div>
      </div>
    `;

    // Trigger initial stats calculation
    this.onEditorInput();

    // Form submission
    document.getElementById('noteComposeForm').onsubmit = async (e) => {
      e.preventDefault();
      const btn = document.getElementById('btnSaveNote');
      btn.disabled = true;
      btn.innerHTML = `<span>⏳</span><span>SAVING DIRECTIVE...</span>`;

      const title = document.getElementById('noteFormTitle').value.trim();
      const topic = document.getElementById('noteFormTopic').value.trim();
      const category = document.getElementById('noteFormCategory').value;
      const color = document.getElementById('noteFormColor').value;
      const tags = document.getElementById('noteFormTags').value.trim();
      const is_pinned = document.getElementById('noteFormIsPinned').checked;
      const content = document.getElementById('noteFormContent').value;

      if (!title) {
        Toast.show('Title is required.', 'warning');
        btn.disabled = false;
        btn.innerHTML = `<span>💾</span><span>${isEditing ? 'UPDATE NOTE' : 'SAVE DIRECTIVE'}</span>`;
        return;
      }

      try {
        const payload = {
          title,
          topic: topic || 'General',
          category,
          color,
          tags,
          is_pinned,
          content,
          channel_id: note.channel_id
        };

        if (isEditing) {
          await API.notes.update(noteId, payload);
          Toast.show('Note updated successfully!', 'success');
        } else {
          await API.notes.create(payload);
          Toast.show('Note created successfully!', 'success');
        }

        modalRoot.innerHTML = '';
        await this.reloadAndRefresh();
      } catch (err) {
        Toast.show('Failed to save note: ' + err.message, 'error');
        btn.disabled = false;
        btn.innerHTML = `<span>💾</span><span>${isEditing ? 'UPDATE NOTE' : 'SAVE DIRECTIVE'}</span>`;
      }
    };
  },

  onEditorInput() {
    const textarea = document.getElementById('noteFormContent');
    const statsEl = document.getElementById('editorStatsCounter');
    const previewPane = document.getElementById('noteLivePreviewPane');

    if (!textarea) return;
    const text = textarea.value;
    const words = text.trim() ? text.trim().split(/\s+/).filter(Boolean).length : 0;
    const chars = text.length;

    if (statsEl) {
      statsEl.textContent = `Words: ${words.toLocaleString()} • Characters: ${chars.toLocaleString()} • Estimated ${Math.max(1, Math.ceil(words / 200))} min read`;
    }

    if (previewPane && previewPane.style.display !== 'none') {
      previewPane.innerHTML = this.renderMarkdown(text);
    }
  },

  switchEditorMode(mode) {
    const textarea = document.getElementById('noteFormContent');
    const preview = document.getElementById('noteLivePreviewPane');
    const btnWrite = document.getElementById('btnEditorWrite');
    const btnSplit = document.getElementById('btnEditorSplit');
    const btnPreview = document.getElementById('btnEditorPreview');

    if (!textarea || !preview) return;

    // Reset styles
    [btnWrite, btnSplit, btnPreview].forEach(b => {
      if (b) {
        b.style.background = 'transparent';
        b.style.color = 'var(--text-dim)';
        b.style.fontWeight = 'normal';
      }
    });

    if (mode === 'write') {
      textarea.style.display = 'block';
      textarea.style.flex = '1';
      preview.style.display = 'none';
      if (btnWrite) {
        btnWrite.style.background = 'var(--accent-cyan)';
        btnWrite.style.color = '#070913';
        btnWrite.style.fontWeight = '700';
      }
    } else if (mode === 'preview') {
      textarea.style.display = 'none';
      preview.style.display = 'block';
      preview.style.flex = '1';
      preview.innerHTML = this.renderMarkdown(textarea.value);
      if (btnPreview) {
        btnPreview.style.background = 'var(--accent-cyan)';
        btnPreview.style.color = '#070913';
        btnPreview.style.fontWeight = '700';
      }
    } else if (mode === 'split') {
      textarea.style.display = 'block';
      textarea.style.flex = '1';
      preview.style.display = 'block';
      preview.style.flex = '1';
      preview.innerHTML = this.renderMarkdown(textarea.value);
      if (btnSplit) {
        btnSplit.style.background = 'var(--accent-cyan)';
        btnSplit.style.color = '#070913';
        btnSplit.style.fontWeight = '700';
      }
    }
  },

  insertMarkdown(prefix, suffix = '') {
    const textarea = document.getElementById('noteFormContent');
    if (!textarea) return;

    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const selected = textarea.value.substring(start, end);

    const replacement = prefix + selected + suffix;
    textarea.value = textarea.value.substring(0, start) + replacement + textarea.value.substring(end);

    textarea.focus();
    textarea.selectionStart = start + prefix.length;
    textarea.selectionEnd = start + prefix.length + selected.length;

    this.onEditorInput();
  },

  // ==========================================
  // CONFIRM DELETE
  // ==========================================
  async confirmDeleteNote(noteId) {
    const note = this.notes.find(n => n.id === noteId);
    if (!note) return;

    const confirmed = await cyberConfirm({
      title: 'DELETE TOPIC DIRECTIVE',
      subtitle: `Topic: ${note.topic}`,
      message: `Are you sure you want to permanently delete directive <strong>"${this.escapeHtml(note.title)}"</strong>?`,
      details: `Word count: ${this.getReadingStats(note.content).words} words`,
      confirmText: 'CONFIRM DELETE',
      cancelText: 'KEEP DIRECTIVE',
      type: 'danger',
      icon: '🗑️'
    });

    if (!confirmed) return;

    try {
      await API.notes.delete(noteId);
      Toast.show(`Note "${note.title}" deleted successfully.`, 'success');
      await this.reloadAndRefresh();
    } catch (err) {
      Toast.show('Failed to delete note: ' + err.message, 'error');
    }
  },

  formatDate(dateStr) {
    if (!dateStr) return '—';
    try {
      const d = new Date(dateStr);
      return d.toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric'
      });
    } catch (e) {
      return String(dateStr);
    }
  }
};

window.NotesComponent = NotesComponent;
