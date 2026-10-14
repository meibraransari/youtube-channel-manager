/**
 * n8n Workflow Automation & Orchestration Component
 * Event-Driven Workflows, Webhook Dispatching, Real-Time Telemetry & Execution Ledger
 */
const N8nComponent = {
  workflows: [],
  executions: [],
  activeTab: 'workflows', // 'workflows' | 'executions'
  searchQuery: '',
  categoryFilter: 'all',
  statusFilter: 'all',
  executionStatusFilter: 'all',
  executionWorkflowFilter: 'all',
  orchestratorStatus: null, // { reachable: boolean, statusCode: number, latencyMs: number }
  isLoading: false,

  categoryMeta: {
    ai_enrichment: { label: 'AI Enrichment', icon: '🧠', color: '#a855f7', bg: 'rgba(168, 85, 247, 0.15)' },
    social: { label: 'Social Cross-Post', icon: '📣', color: '#3b82f6', bg: 'rgba(59, 130, 246, 0.15)' },
    assets: { label: 'Asset Generation', icon: '🎨', color: '#10b981', bg: 'rgba(16, 185, 129, 0.15)' },
    telemetry: { label: 'Telemetry & Reports', icon: '📊', color: '#f59e0b', bg: 'rgba(245, 158, 11, 0.15)' },
    automation: { label: 'General Automation', icon: '⚡', color: '#06b6d4', bg: 'rgba(6, 182, 212, 0.15)' },
    custom: { label: 'Custom Workflow', icon: '🔧', color: '#ec4899', bg: 'rgba(236, 72, 153, 0.15)' }
  },

  escapeHtml(str) {
    if (!str) return '';
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  },

  async render(container) {
    container.innerHTML = `
      <div style="display: flex; align-items: center; justify-content: center; height: 320px;">
        <div style="font-family: var(--font-tech); color: #8b5cf6; font-size: 16px; letter-spacing: 1px;">
          INITIALIZING N8N WORKFLOW AUTOMATION ENGINE...
        </div>
      </div>
    `;

    try {
      await this.loadData();
      this.renderView(container);
      // Run reachability probe in background
      this.probeOrchestrator();
    } catch (err) {
      console.error('[N8N] Render error:', err);
      container.innerHTML = `
        <div class="glass-card" style="padding: 40px; text-align: center; max-width: 600px; margin: 40px auto; border-color: #ef4444;">
          <div style="font-size: 40px; margin-bottom: 12px;">⚠️</div>
          <h2 style="font-size: 18px; color: #ef4444; font-weight: 800;">Failed to Load n8n Workflows</h2>
          <p style="color: var(--text-muted); font-size: 13px; margin: 10px 0 20px;">${this.escapeHtml(err.message)}</p>
          <button class="btn-cyber btn-cyber-primary" onclick="N8nComponent.render(document.getElementById('mainContentArea'))">
            🔄 Retry Loading
          </button>
        </div>
      `;
    }
  },

  async loadData() {
    this.isLoading = true;
    try {
      const [workflowsRes, executionsRes] = await Promise.all([
        API.n8n.workflows.getAll(),
        API.n8n.executions.getAll({ limit: 100 })
      ]);
      this.workflows = workflowsRes.workflows || [];
      this.executions = executionsRes.executions || [];
    } catch (err) {
      Toast.show('Error loading n8n data: ' + err.message, 'error');
    } finally {
      this.isLoading = false;
    }
  },

  async probeOrchestrator() {
    try {
      const res = await API.n8n.testConnection();
      this.orchestratorStatus = res;
      this.updateOrchestratorBadge();
    } catch (err) {
      this.orchestratorStatus = { reachable: false, error: err.message };
      this.updateOrchestratorBadge();
    }
  },

  updateOrchestratorBadge() {
    const badge = document.getElementById('n8nEngineStatusBadge');
    if (!badge) return;

    if (!this.orchestratorStatus) {
      badge.className = 'badge';
      badge.style.background = 'rgba(156, 163, 175, 0.2)';
      badge.style.color = '#9ca3af';
      badge.textContent = 'PROBING ENGINE...';
      return;
    }

    if (this.orchestratorStatus.reachable) {
      badge.className = 'badge badge-emerald';
      badge.textContent = `ORCHESTRATOR ONLINE (${this.orchestratorStatus.latencyMs}ms)`;
      badge.title = `HTTP ${this.orchestratorStatus.statusCode} - ${this.orchestratorStatus.message || 'Ready'}`;
    } else {
      badge.className = 'badge badge-magenta';
      badge.textContent = 'ORCHESTRATOR OFFLINE';
      badge.title = this.orchestratorStatus.error || 'Connection failed';
    }
  },

  renderView(container) {
    const totalWorkflows = this.workflows.length;
    const activeWorkflows = this.workflows.filter(w => w.is_active).length;
    const totalExecutions = this.executions.length;
    const successfulExecutions = this.executions.filter(e => e.status === 'success').length;
    const successRate = totalExecutions > 0 ? Math.round((successfulExecutions / totalExecutions) * 100) : 100;
    
    let avgDuration = 0;
    const executionsWithDuration = this.executions.filter(e => e.duration_ms !== null && e.duration_ms !== undefined);
    if (executionsWithDuration.length > 0) {
      const sum = executionsWithDuration.reduce((acc, curr) => acc + (parseInt(curr.duration_ms, 10) || 0), 0);
      avgDuration = Math.round(sum / executionsWithDuration.length);
    }

    container.innerHTML = `
      <div style="max-width: 1300px; margin: 0 auto; padding-bottom: 50px;">
        <!-- Top Action & Title Header -->
        <div class="glass-card" style="padding: 24px; margin-bottom: 22px; border-color: #8b5cf6;">
          <div style="display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 16px;">
            <div style="display: flex; align-items: center; gap: 14px;">
              <div style="width: 48px; height: 48px; border-radius: 12px; background: linear-gradient(135deg, rgba(139, 92, 246, 0.3), rgba(59, 130, 246, 0.3)); display: flex; align-items: center; justify-content: center; font-size: 26px; border: 1px solid #8b5cf6;">
                ⚡
              </div>
              <div>
                <div style="display: flex; align-items: center; gap: 10px;">
                  <h1 style="font-size: 22px; font-weight: 800; color: var(--text-main); margin: 0;">
                    n8n WORKFLOW AUTOMATION ENGINE
                  </h1>
                  <span id="n8nEngineStatusBadge" class="badge" style="background: rgba(156, 163, 175, 0.2); color: #9ca3af; font-size: 10px;">
                    PROBING ENGINE...
                  </span>
                </div>
                <p style="font-size: 12px; color: var(--text-dim); margin-top: 4px;">
                  Event-driven workflow orchestration, webhook triggers, dynamic payload injection & telemetry tracking.
                </p>
              </div>
            </div>

            <div style="display: flex; align-items: center; gap: 10px; flex-wrap: wrap;">
              <button class="btn-cyber btn-cyber-secondary btn-sm" id="btnProbeOrchestrator" onclick="N8nComponent.manualProbe()">
                <span>🔌</span>
                <span>PROBE ENGINE</span>
              </button>
              <button class="btn-cyber btn-cyber-outline btn-sm" onclick="window.navigateTo('settings')">
                <span>⚙️</span>
                <span>N8N SETTINGS</span>
              </button>
              <button class="btn-cyber btn-cyber-primary" id="btnNewWorkflow" onclick="N8nComponent.openWorkflowModal()">
                <span>+</span>
                <span>REGISTER WORKFLOW</span>
              </button>
            </div>
          </div>
        </div>

        <!-- KPI Metric Strip -->
        <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(230px, 1fr)); gap: 16px; margin-bottom: 24px;">
          <!-- Card 1: Registered Workflows -->
          <div class="glass-card" style="padding: 18px; border-color: rgba(139, 92, 246, 0.3);">
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px;">
              <span style="font-size: 11px; font-weight: 700; color: var(--text-dim); text-transform: uppercase; letter-spacing: 0.5px;">Registered Workflows</span>
              <span style="font-size: 18px;">📋</span>
            </div>
            <div style="font-size: 28px; font-weight: 900; color: #a78bfa; font-family: var(--font-tech);">${totalWorkflows}</div>
            <div style="font-size: 11px; color: var(--text-muted); margin-top: 4px;">
              <span style="color: #10b981; font-weight: 700;">${activeWorkflows} Active</span> • <span style="color: var(--text-dim);">${totalWorkflows - activeWorkflows} Disabled</span>
            </div>
          </div>

          <!-- Card 2: Executions Dispatched -->
          <div class="glass-card" style="padding: 18px; border-color: rgba(6, 182, 212, 0.3);">
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px;">
              <span style="font-size: 11px; font-weight: 700; color: var(--text-dim); text-transform: uppercase; letter-spacing: 0.5px;">Executions Dispatched</span>
              <span style="font-size: 18px;">🚀</span>
            </div>
            <div style="font-size: 28px; font-weight: 900; color: var(--accent-cyan); font-family: var(--font-tech);">${totalExecutions}</div>
            <div style="font-size: 11px; color: var(--text-muted); margin-top: 4px;">
              <span>Webhook calls recorded</span>
            </div>
          </div>

          <!-- Card 3: Success Rate -->
          <div class="glass-card" style="padding: 18px; border-color: rgba(16, 185, 129, 0.3);">
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px;">
              <span style="font-size: 11px; font-weight: 700; color: var(--text-dim); text-transform: uppercase; letter-spacing: 0.5px;">Success Rate</span>
              <span style="font-size: 18px;">🎯</span>
            </div>
            <div style="font-size: 28px; font-weight: 900; color: ${successRate >= 90 ? '#10b981' : (successRate >= 70 ? '#f59e0b' : '#ef4444')}; font-family: var(--font-tech);">
              ${successRate}%
            </div>
            <div style="font-size: 11px; color: var(--text-muted); margin-top: 4px;">
              <span style="color: #10b981; font-weight: 700;">${successfulExecutions} Succeeded</span> • <span style="color: #ef4444;">${totalExecutions - successfulExecutions} Failed</span>
            </div>
          </div>

          <!-- Card 4: Avg Execution Latency -->
          <div class="glass-card" style="padding: 18px; border-color: rgba(245, 158, 11, 0.3);">
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px;">
              <span style="font-size: 11px; font-weight: 700; color: var(--text-dim); text-transform: uppercase; letter-spacing: 0.5px;">Avg Execution Latency</span>
              <span style="font-size: 18px;">⏱️</span>
            </div>
            <div style="font-size: 28px; font-weight: 900; color: #fbbf24; font-family: var(--font-tech);">
              ${avgDuration} <span style="font-size: 16px; font-weight: 600; color: var(--text-dim);">ms</span>
            </div>
            <div style="font-size: 11px; color: var(--text-muted); margin-top: 4px;">
              <span>Average webhook roundtrip</span>
            </div>
          </div>
        </div>

        <!-- Navigation Tabs: Workflows vs Executions -->
        <div style="display: flex; gap: 8px; margin-bottom: 20px; border-bottom: 1px solid var(--border-color); padding-bottom: 10px;">
          <button class="nav-pill-item ${this.activeTab === 'workflows' ? 'active' : ''}" onclick="N8nComponent.switchTab('workflows')" style="cursor: pointer; padding: 8px 18px; font-weight: 700; display: flex; align-items: center; gap: 8px;">
            <span>⚡</span>
            <span>Workflows Catalog</span>
            <span class="pill-count">${totalWorkflows}</span>
          </button>
          <button class="nav-pill-item ${this.activeTab === 'executions' ? 'active' : ''}" onclick="N8nComponent.switchTab('executions')" style="cursor: pointer; padding: 8px 18px; font-weight: 700; display: flex; align-items: center; gap: 8px;">
            <span>📜</span>
            <span>Execution Ledger</span>
            <span class="pill-count">${totalExecutions}</span>
          </button>
        </div>

        <!-- Active Tab Content Container -->
        <div id="n8nTabContentArea">
          ${this.activeTab === 'workflows' ? this.renderWorkflowsTab() : this.renderExecutionsTab()}
        </div>
      </div>
    `;

    this.updateOrchestratorBadge();
  },

  switchTab(tab) {
    this.activeTab = tab;
    const container = document.getElementById('n8nTabContentArea');
    if (!container) {
      this.render(document.getElementById('mainContentArea'));
      return;
    }
    // Update pill styles
    document.querySelectorAll('#n8nTabContentArea').forEach(() => {});
    this.render(document.getElementById('mainContentArea'));
  },

  async manualProbe() {
    const btn = document.getElementById('btnProbeOrchestrator');
    if (btn) {
      btn.disabled = true;
      btn.innerHTML = `<span>⏳</span><span>PROBING...</span>`;
    }
    Toast.show('Probing n8n orchestrator reachability...', 'info', 2000);
    try {
      const res = await API.n8n.testConnection();
      this.orchestratorStatus = res;
      this.updateOrchestratorBadge();
      if (res.reachable) {
        Toast.show(`n8n orchestrator is ONLINE (HTTP ${res.statusCode}, ${res.latencyMs}ms)`, 'success');
      } else {
        Toast.show(`n8n probe failed: ${res.error || res.message}`, 'error', 5000);
      }
    } catch (err) {
      Toast.show(`Probe failed: ${err.message}`, 'error');
    } finally {
      if (btn) {
        btn.disabled = false;
        btn.innerHTML = `<span>🔌</span><span>PROBE ENGINE</span>`;
      }
    }
  },

  // ==========================================
  // TAB 1: WORKFLOWS CATALOG & CARDS
  // ==========================================
  renderWorkflowsTab() {
    const filteredWorkflows = this.getFilteredWorkflows();

    return `
      <!-- Filter Toolbar -->
      <div class="glass-card" style="padding: 16px 20px; margin-bottom: 22px;">
        <div style="display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 14px;">
          <!-- Search Box -->
          <div style="flex: 1; min-width: 260px; position: relative;">
            <input 
              type="text" 
              id="n8nWorkflowSearchInput" 
              class="cyber-input" 
              placeholder="🔍 Search workflows by name, category, or webhook..." 
              value="${this.escapeHtml(this.searchQuery)}"
              oninput="N8nComponent.onSearchChange(this.value)"
              style="padding-left: 14px;"
            />
          </div>

          <!-- Category Filter -->
          <div style="display: flex; align-items: center; gap: 8px;">
            <label style="font-size: 11px; font-weight: 700; color: var(--text-dim); text-transform: uppercase;">Category:</label>
            <select class="cyber-input" style="width: 170px;" onchange="N8nComponent.onCategoryFilterChange(this.value)">
              <option value="all" ${this.categoryFilter === 'all' ? 'selected' : ''}>All Categories</option>
              <option value="ai_enrichment" ${this.categoryFilter === 'ai_enrichment' ? 'selected' : ''}>🧠 AI Enrichment</option>
              <option value="social" ${this.categoryFilter === 'social' ? 'selected' : ''}>📣 Social Cross-Post</option>
              <option value="assets" ${this.categoryFilter === 'assets' ? 'selected' : ''}>🎨 Asset Generation</option>
              <option value="telemetry" ${this.categoryFilter === 'telemetry' ? 'selected' : ''}>📊 Telemetry & Reports</option>
              <option value="automation" ${this.categoryFilter === 'automation' ? 'selected' : ''}>⚡ General Automation</option>
              <option value="custom" ${this.categoryFilter === 'custom' ? 'selected' : ''}>🔧 Custom</option>
            </select>
          </div>

          <!-- Status Filter -->
          <div style="display: flex; align-items: center; gap: 8px;">
            <label style="font-size: 11px; font-weight: 700; color: var(--text-dim); text-transform: uppercase;">Status:</label>
            <select class="cyber-input" style="width: 130px;" onchange="N8nComponent.onStatusFilterChange(this.value)">
              <option value="all" ${this.statusFilter === 'all' ? 'selected' : ''}>All Status</option>
              <option value="active" ${this.statusFilter === 'active' ? 'selected' : ''}>Active Only</option>
              <option value="inactive" ${this.statusFilter === 'inactive' ? 'selected' : ''}>Disabled Only</option>
            </select>
          </div>

          ${(this.searchQuery || this.categoryFilter !== 'all' || this.statusFilter !== 'all') ? `
            <button class="btn-cyber btn-cyber-secondary btn-sm" onclick="N8nComponent.resetWorkflowFilters()">
              ✕ Clear
            </button>
          ` : ''}
        </div>
      </div>

      <!-- Workflows Grid -->
      ${filteredWorkflows.length === 0 ? `
        <div class="glass-card" style="padding: 60px 20px; text-align: center;">
          <div style="font-size: 42px; margin-bottom: 14px;">⚡</div>
          <h3 style="font-size: 17px; font-weight: 800; color: var(--text-main); margin-bottom: 8px;">No Workflows Found</h3>
          <p style="font-size: 13px; color: var(--text-muted); max-width: 480px; margin: 0 auto 20px;">
            ${this.searchQuery || this.categoryFilter !== 'all' || this.statusFilter !== 'all' 
              ? 'No registered n8n workflows match your current search and filter criteria.' 
              : 'Register your first n8n webhook workflow to automate content enrichment, social publishing, and telemetry.'}
          </p>
          <button class="btn-cyber btn-cyber-primary" onclick="N8nComponent.openWorkflowModal()">
            <span>+</span>
            <span>CREATE FIRST WORKFLOW</span>
          </button>
        </div>
      ` : `
        <div style="display: grid; grid-template-columns: repeat(auto-fill, minmax(380px, 1fr)); gap: 20px;">
          ${filteredWorkflows.map(w => this.renderWorkflowCard(w)).join('')}
        </div>
      `}
    `;
  },

  getFilteredWorkflows() {
    return this.workflows.filter(w => {
      if (this.statusFilter === 'active' && !w.is_active) return false;
      if (this.statusFilter === 'inactive' && w.is_active) return false;
      if (this.categoryFilter !== 'all' && (w.category || '').toLowerCase() !== this.categoryFilter.toLowerCase()) return false;

      if (this.searchQuery.trim()) {
        const q = this.searchQuery.trim().toLowerCase();
        const match = (
          (w.name || '').toLowerCase().includes(q) ||
          (w.description || '').toLowerCase().includes(q) ||
          (w.category || '').toLowerCase().includes(q) ||
          (w.webhook_url || '').toLowerCase().includes(q)
        );
        if (!match) return false;
      }
      return true;
    });
  },

  renderWorkflowCard(w) {
    const meta = this.categoryMeta[w.category] || this.categoryMeta.custom;
    const totalRuns = parseInt(w.total_executions, 10) || 0;
    const successRate = totalRuns > 0 ? Math.round(parseFloat(w.success_rate || 0)) : 100;
    const avgLatency = w.avg_duration_ms ? Math.round(parseFloat(w.avg_duration_ms)) : 0;
    const lastRunStatus = (w.last_execution_status || 'never').toUpperCase();

    let statusBadgeColor = 'var(--text-dim)';
    let statusBadgeBg = 'rgba(156, 163, 175, 0.15)';
    if (lastRunStatus === 'SUCCESS') {
      statusBadgeColor = '#10b981';
      statusBadgeBg = 'rgba(16, 185, 129, 0.15)';
    } else if (lastRunStatus === 'FAILED' || lastRunStatus === 'ERROR') {
      statusBadgeColor = '#ef4444';
      statusBadgeBg = 'rgba(239, 68, 68, 0.15)';
    } else if (lastRunStatus === 'RUNNING' || lastRunStatus === 'PENDING') {
      statusBadgeColor = '#06b6d4';
      statusBadgeBg = 'rgba(6, 182, 212, 0.15)';
    }

    return `
      <div class="glass-card" style="padding: 22px; display: flex; flex-direction: column; justify-content: space-between; border-color: ${w.is_active ? 'rgba(139, 92, 246, 0.4)' : 'rgba(255,255,255,0.08)'}; transition: all 0.2s ease;">
        <div>
          <!-- Top Row: Category Badge & Active Toggle Status -->
          <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 12px;">
            <div style="display: flex; align-items: center; gap: 6px;">
              <span style="font-size: 14px;">${meta.icon}</span>
              <span class="badge" style="background: ${meta.bg}; color: ${meta.color}; border-color: ${meta.color}; font-size: 10px; font-weight: 700;">
                ${meta.label.toUpperCase()}
              </span>
            </div>
            <div style="display: flex; align-items: center; gap: 8px;">
              <span class="badge ${w.is_active ? 'badge-emerald' : ''}" style="font-size: 9px; padding: 2px 8px; ${!w.is_active ? 'background: rgba(156, 163, 175, 0.15); color: #9ca3af;' : ''}">
                ${w.is_active ? 'ACTIVE' : 'DISABLED'}
              </span>
            </div>
          </div>

          <!-- Workflow Title -->
          <h3 style="font-size: 16px; font-weight: 800; color: var(--text-main); margin-bottom: 6px; line-height: 1.3;">
            ${this.escapeHtml(w.name)}
          </h3>

          <!-- Description -->
          <p style="font-size: 12px; color: var(--text-muted); line-height: 1.5; margin-bottom: 16px; min-height: 36px; display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden;">
            ${this.escapeHtml(w.description || 'No description provided.')}
          </p>

          <!-- Webhook Endpoint Preview -->
          <div style="background: rgba(0, 0, 0, 0.3); border: 1px solid var(--border-color); border-radius: var(--radius-sm); padding: 8px 12px; margin-bottom: 14px; display: flex; align-items: center; justify-content: space-between; gap: 8px;">
            <div style="display: flex; align-items: center; gap: 8px; min-width: 0; flex: 1;">
              <span class="badge" style="background: rgba(139, 92, 246, 0.2); color: #a78bfa; font-size: 9px; padding: 1px 6px;">
                ${w.http_method || 'POST'}
              </span>
              <span style="font-family: var(--font-mono); font-size: 11px; color: var(--accent-cyan); white-space: nowrap; overflow: hidden; text-overflow: ellipsis;" title="${this.escapeHtml(w.webhook_url)}">
                ${this.escapeHtml(w.webhook_url)}
              </span>
            </div>
            <button 
              type="button" 
              class="btn-cyber btn-cyber-secondary btn-sm" 
              style="padding: 2px 8px; font-size: 10px;" 
              onclick="N8nComponent.copyToClipboard('${this.escapeHtml(w.webhook_url)}', 'Webhook URL copied!')" 
              title="Copy Webhook URL"
            >
              📋
            </button>
          </div>

          <!-- Quick Stats Row -->
          <div style="display: grid; grid-template-columns: repeat(3, 1fr); gap: 8px; background: rgba(0,0,0,0.15); padding: 10px 12px; border-radius: var(--radius-sm); margin-bottom: 16px;">
            <div>
              <div style="font-size: 9px; font-weight: 700; color: var(--text-dim); text-transform: uppercase;">Total Runs</div>
              <div style="font-size: 14px; font-weight: 800; color: var(--text-main); font-family: var(--font-tech);">${totalRuns}</div>
            </div>
            <div>
              <div style="font-size: 9px; font-weight: 700; color: var(--text-dim); text-transform: uppercase;">Success</div>
              <div style="font-size: 14px; font-weight: 800; color: ${successRate >= 90 ? '#10b981' : '#f59e0b'}; font-family: var(--font-tech);">${totalRuns > 0 ? successRate + '%' : '—'}</div>
            </div>
            <div>
              <div style="font-size: 9px; font-weight: 700; color: var(--text-dim); text-transform: uppercase;">Avg Latency</div>
              <div style="font-size: 14px; font-weight: 800; color: #fbbf24; font-family: var(--font-tech);">${totalRuns > 0 ? avgLatency + 'ms' : '—'}</div>
            </div>
          </div>

          <!-- Last Execution Indicator -->
          <div style="display: flex; justify-content: space-between; align-items: center; font-size: 11px; margin-bottom: 18px;">
            <span style="color: var(--text-dim);">Last Run:</span>
            <div style="display: flex; align-items: center; gap: 6px;">
              <span class="badge" style="background: ${statusBadgeBg}; color: ${statusBadgeColor}; border-color: ${statusBadgeColor}; font-size: 9px; padding: 1px 6px;">
                ${lastRunStatus}
              </span>
              <span style="color: var(--text-muted); font-size: 10px;">
                ${w.last_executed_at ? this.formatDate(w.last_executed_at) : 'Never executed'}
              </span>
            </div>
          </div>
        </div>

        <!-- Action Buttons -->
        <div style="display: flex; gap: 8px; border-top: 1px solid var(--border-color); padding-top: 14px;">
          <button 
            class="btn-cyber btn-cyber-primary" 
            style="flex: 2; display: flex; align-items: center; justify-content: center; gap: 6px; font-weight: 800; background: linear-gradient(135deg, #8b5cf6, #6366f1);" 
            onclick="N8nComponent.openExecuteModal('${w.id}')"
            ${!w.is_active ? 'disabled title="Workflow is disabled"' : ''}
          >
            <span>⚡</span>
            <span>EXECUTE NOW</span>
          </button>
          <button 
            class="btn-cyber btn-cyber-secondary" 
            style="flex: 1; display: flex; align-items: center; justify-content: center; gap: 4px;" 
            onclick="N8nComponent.openWorkflowModal('${w.id}')"
            title="Edit Workflow Configuration"
          >
            <span>⚙️</span>
            <span>EDIT</span>
          </button>
          <button 
            class="btn-cyber btn-cyber-outline" 
            style="padding: 6px 10px;" 
            onclick="N8nComponent.viewWorkflowExecutions('${w.id}')"
            title="View Execution History"
          >
            <span>📜</span>
          </button>
          <button 
            class="btn-cyber btn-cyber-danger" 
            style="padding: 6px 10px;" 
            onclick="N8nComponent.confirmDeleteWorkflow('${w.id}')"
            title="Delete Workflow"
          >
            <span>🗑️</span>
          </button>
        </div>
      </div>
    `;
  },

  onSearchChange(val) {
    this.searchQuery = val;
    this.reRenderTabContent();
  },

  onCategoryFilterChange(val) {
    this.categoryFilter = val;
    this.reRenderTabContent();
  },

  onStatusFilterChange(val) {
    this.statusFilter = val;
    this.reRenderTabContent();
  },

  resetWorkflowFilters() {
    this.searchQuery = '';
    this.categoryFilter = 'all';
    this.statusFilter = 'all';
    this.reRenderTabContent();
  },

  reRenderTabContent() {
    const area = document.getElementById('n8nTabContentArea');
    if (area) {
      area.innerHTML = this.activeTab === 'workflows' ? this.renderWorkflowsTab() : this.renderExecutionsTab();
    }
  },

  viewWorkflowExecutions(workflowId) {
    this.executionWorkflowFilter = workflowId;
    this.switchTab('executions');
  },

  // ==========================================
  // TAB 2: EXECUTION LEDGER & HISTORY
  // ==========================================
  renderExecutionsTab() {
    const filteredExecutions = this.getFilteredExecutions();

    return `
      <!-- Execution Filter Toolbar -->
      <div class="glass-card" style="padding: 16px 20px; margin-bottom: 22px;">
        <div style="display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 14px;">
          <!-- Filter by Workflow -->
          <div style="display: flex; align-items: center; gap: 8px;">
            <label style="font-size: 11px; font-weight: 700; color: var(--text-dim); text-transform: uppercase;">Workflow:</label>
            <select class="cyber-input" style="min-width: 200px;" onchange="N8nComponent.onExecutionWorkflowFilterChange(this.value)">
              <option value="all" ${this.executionWorkflowFilter === 'all' ? 'selected' : ''}>All Workflows (${this.executions.length})</option>
              ${this.workflows.map(w => `
                <option value="${w.id}" ${this.executionWorkflowFilter === w.id ? 'selected' : ''}>${this.escapeHtml(w.name)}</option>
              `).join('')}
            </select>
          </div>

          <!-- Filter by Status -->
          <div style="display: flex; align-items: center; gap: 8px;">
            <label style="font-size: 11px; font-weight: 700; color: var(--text-dim); text-transform: uppercase;">Status:</label>
            <select class="cyber-input" style="width: 140px;" onchange="N8nComponent.onExecutionStatusFilterChange(this.value)">
              <option value="all" ${this.executionStatusFilter === 'all' ? 'selected' : ''}>All Statuses</option>
              <option value="success" ${this.executionStatusFilter === 'success' ? 'selected' : ''}>✓ Success</option>
              <option value="failed" ${this.executionStatusFilter === 'failed' ? 'selected' : ''}>✗ Failed</option>
              <option value="running" ${this.executionStatusFilter === 'running' ? 'selected' : ''}>⏳ Running</option>
            </select>
          </div>

          <div style="display: flex; align-items: center; gap: 10px; margin-left: auto;">
            <button class="btn-cyber btn-cyber-secondary btn-sm" onclick="N8nComponent.refreshExecutions()">
              <span>🔄</span>
              <span>REFRESH</span>
            </button>
            <button class="btn-cyber btn-cyber-danger btn-sm" onclick="N8nComponent.confirmClearExecutions()">
              <span>🗑️</span>
              <span>PURGE LEDGER</span>
            </button>
          </div>
        </div>
      </div>

      <!-- Execution History Table -->
      ${filteredExecutions.length === 0 ? `
        <div class="glass-card" style="padding: 60px 20px; text-align: center;">
          <div style="font-size: 42px; margin-bottom: 14px;">📜</div>
          <h3 style="font-size: 17px; font-weight: 800; color: var(--text-main); margin-bottom: 8px;">No Executions Recorded</h3>
          <p style="font-size: 13px; color: var(--text-muted); max-width: 480px; margin: 0 auto 20px;">
            No workflow executions have been dispatched yet matching the active criteria. Trigger a workflow manually or via background event hooks.
          </p>
          <button class="btn-cyber btn-cyber-primary" onclick="N8nComponent.switchTab('workflows')">
            <span>⚡</span>
            <span>GO TO WORKFLOWS</span>
          </button>
        </div>
      ` : `
        <div class="glass-card" style="padding: 0; overflow: hidden;">
          <div style="overflow-x: auto;">
            <table class="cyber-table" style="width: 100%; border-collapse: collapse; text-align: left;">
              <thead>
                <tr style="border-bottom: 1px solid var(--border-color); background: rgba(0,0,0,0.2);">
                  <th style="padding: 14px 18px; font-size: 11px; font-weight: 700; color: var(--text-dim); text-transform: uppercase;">Status</th>
                  <th style="padding: 14px 18px; font-size: 11px; font-weight: 700; color: var(--text-dim); text-transform: uppercase;">Workflow Name</th>
                  <th style="padding: 14px 18px; font-size: 11px; font-weight: 700; color: var(--text-dim); text-transform: uppercase;">HTTP / Status</th>
                  <th style="padding: 14px 18px; font-size: 11px; font-weight: 700; color: var(--text-dim); text-transform: uppercase;">Latency</th>
                  <th style="padding: 14px 18px; font-size: 11px; font-weight: 700; color: var(--text-dim); text-transform: uppercase;">Trigger</th>
                  <th style="padding: 14px 18px; font-size: 11px; font-weight: 700; color: var(--text-dim); text-transform: uppercase;">Triggered By</th>
                  <th style="padding: 14px 18px; font-size: 11px; font-weight: 700; color: var(--text-dim); text-transform: uppercase;">Timestamp</th>
                  <th style="padding: 14px 18px; font-size: 11px; font-weight: 700; color: var(--text-dim); text-transform: uppercase; text-align: right;">Inspector</th>
                </tr>
              </thead>
              <tbody>
                ${filteredExecutions.map(e => this.renderExecutionRow(e)).join('')}
              </tbody>
            </table>
          </div>
        </div>
      `}
    `;
  },

  getFilteredExecutions() {
    return this.executions.filter(e => {
      if (this.executionStatusFilter !== 'all' && (e.status || '').toLowerCase() !== this.executionStatusFilter.toLowerCase()) return false;
      if (this.executionWorkflowFilter !== 'all' && e.workflow_id !== this.executionWorkflowFilter) return false;
      return true;
    });
  },

  renderExecutionRow(e) {
    const isSuccess = e.status === 'success';
    const isRunning = e.status === 'running';

    let statusBadge = `<span class="badge badge-emerald" style="font-size: 10px;">✓ SUCCESS</span>`;
    if (isRunning) {
      statusBadge = `<span class="badge badge-cyan" style="font-size: 10px;">⏳ RUNNING</span>`;
    } else if (!isSuccess) {
      statusBadge = `<span class="badge badge-magenta" style="font-size: 10px;">✗ FAILED</span>`;
    }

    const statusCode = e.status_code ? `HTTP ${e.status_code}` : '—';
    const duration = e.duration_ms !== null && e.duration_ms !== undefined ? `${e.duration_ms}ms` : '—';

    return `
      <tr style="border-bottom: 1px solid rgba(255,255,255,0.05); transition: background 0.15s ease;">
        <td style="padding: 12px 18px;">
          ${statusBadge}
        </td>
        <td style="padding: 12px 18px;">
          <div style="font-weight: 700; font-size: 13px; color: var(--text-main);">
            ${this.escapeHtml(e.workflow_name || 'Workflow')}
          </div>
          <div style="font-family: var(--font-mono); font-size: 10px; color: var(--text-dim);" title="Execution ID: ${e.id}">
            ${e.id.substring(0, 13)}...
          </div>
        </td>
        <td style="padding: 12px 18px;">
          <div style="display: flex; align-items: center; gap: 6px;">
            <span class="badge" style="background: rgba(139, 92, 246, 0.15); color: #a78bfa; font-size: 9px; padding: 1px 6px;">
              ${e.http_method || 'POST'}
            </span>
            <span style="font-family: var(--font-mono); font-size: 11px; color: ${isSuccess ? '#10b981' : '#ef4444'};">
              ${statusCode}
            </span>
          </div>
        </td>
        <td style="padding: 12px 18px; font-family: var(--font-mono); font-size: 12px; color: #fbbf24;">
          ${duration}
        </td>
        <td style="padding: 12px 18px;">
          <span class="badge" style="background: rgba(255,255,255,0.06); color: var(--text-muted); font-size: 10px;">
            ${(e.trigger_source || 'manual').toUpperCase()}
          </span>
        </td>
        <td style="padding: 12px 18px; font-size: 12px; color: var(--text-dim);">
          ${this.escapeHtml(e.triggered_by || 'System')}
        </td>
        <td style="padding: 12px 18px; font-size: 11px; color: var(--text-muted);">
          ${this.formatDate(e.created_at)}
        </td>
        <td style="padding: 12px 18px; text-align: right;">
          <button 
            type="button" 
            class="btn-cyber btn-cyber-secondary btn-sm" 
            style="padding: 4px 10px; font-size: 11px;"
            onclick="N8nComponent.openInspectorModal('${e.id}')"
          >
            <span>🔍</span>
            <span>INSPECT</span>
          </button>
        </td>
      </tr>
    `;
  },

  onExecutionWorkflowFilterChange(val) {
    this.executionWorkflowFilter = val;
    this.reRenderTabContent();
  },

  onExecutionStatusFilterChange(val) {
    this.executionStatusFilter = val;
    this.reRenderTabContent();
  },

  async refreshExecutions() {
    Toast.show('Refreshing execution history...', 'info', 1500);
    try {
      const res = await API.n8n.executions.getAll({ limit: 100 });
      this.executions = res.executions || [];
      this.reRenderTabContent();
      Toast.show('Execution ledger updated!', 'success');
    } catch (err) {
      Toast.show('Failed to refresh executions: ' + err.message, 'error');
    }
  },

  confirmClearExecutions() {
    const modalRoot = document.getElementById('modalRoot');
    if (!modalRoot) return;

    modalRoot.innerHTML = `
      <div class="cyber-modal-overlay" style="display: flex; align-items: center; justify-content: center; position: fixed; inset: 0; background: rgba(0,0,0,0.85); z-index: 10000; padding: 20px;">
        <div class="glass-card" style="max-width: 480px; width: 100%; padding: 26px; border-color: #ef4444;">
          <div style="display: flex; align-items: center; gap: 12px; margin-bottom: 14px;">
            <span style="font-size: 26px;">⚠️</span>
            <h3 style="font-size: 17px; font-weight: 800; color: #ef4444; margin: 0;">PURGE EXECUTION HISTORY</h3>
          </div>
          <p style="font-size: 13px; color: var(--text-muted); line-height: 1.6; margin-bottom: 22px;">
            Are you sure you want to permanently delete all webhook execution telemetry logs from the database? This action cannot be undone.
          </p>
          <div style="display: flex; justify-content: flex-end; gap: 10px;">
            <button class="btn-cyber btn-cyber-secondary" onclick="document.getElementById('modalRoot').innerHTML=''">
              CANCEL
            </button>
            <button class="btn-cyber btn-cyber-danger" id="btnConfirmPurgeExecutions">
              CONFIRM PURGE
            </button>
          </div>
        </div>
      </div>
    `;

    document.getElementById('btnConfirmPurgeExecutions').onclick = async () => {
      const btn = document.getElementById('btnConfirmPurgeExecutions');
      btn.disabled = true;
      btn.innerHTML = '<span>⏳</span><span>PURGING...</span>';
      try {
        await API.n8n.executions.clear();
        modalRoot.innerHTML = '';
        Toast.show('Execution history purged successfully.', 'success');
        await this.loadData();
        this.render(document.getElementById('mainContentArea'));
      } catch (err) {
        Toast.show('Failed to clear executions: ' + err.message, 'error');
      }
    };
  },

  // ==========================================
  // MODAL 1: LIVE EXECUTION DIALOG
  // ==========================================
  openExecuteModal(workflowId) {
    const workflow = this.workflows.find(w => w.id === workflowId);
    if (!workflow) {
      Toast.show('Workflow not found', 'error');
      return;
    }

    const modalRoot = document.getElementById('modalRoot');
    if (!modalRoot) return;

    let payloadString = '{}';
    if (workflow.payload_template) {
      payloadString = typeof workflow.payload_template === 'object' 
        ? JSON.stringify(workflow.payload_template, null, 2) 
        : String(workflow.payload_template);
    }

    modalRoot.innerHTML = `
      <div class="cyber-modal-overlay" style="display: flex; align-items: center; justify-content: center; position: fixed; inset: 0; background: rgba(0,0,0,0.85); z-index: 10000; padding: 20px; overflow-y: auto;">
        <div class="glass-card" style="max-width: 680px; width: 100%; padding: 26px; border-color: #8b5cf6; max-height: 90vh; overflow-y: auto;">
          <!-- Modal Header -->
          <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 18px; border-bottom: 1px solid var(--border-color); padding-bottom: 14px;">
            <div style="display: flex; align-items: center; gap: 10px;">
              <span style="font-size: 24px;">⚡</span>
              <div>
                <h3 style="font-size: 17px; font-weight: 800; color: var(--text-main); margin: 0;">
                  EXECUTE WORKFLOW
                </h3>
                <div style="font-size: 12px; color: var(--accent-cyan); margin-top: 2px;">
                  ${this.escapeHtml(workflow.name)}
                </div>
              </div>
            </div>
            <button class="btn-cyber btn-cyber-secondary btn-sm" onclick="document.getElementById('modalRoot').innerHTML=''" style="padding: 4px 8px;">✕</button>
          </div>

          <!-- Webhook Target Selector -->
          <div style="margin-bottom: 16px;">
            <label style="font-size: 11px; font-weight: 700; color: var(--text-dim); text-transform: uppercase;">Target Webhook Endpoint</label>
            <div style="display: flex; gap: 12px; margin-top: 6px;">
              <label style="display: flex; align-items: center; gap: 6px; font-size: 12px; cursor: pointer;">
                <input type="radio" name="execEndpointTarget" value="production" checked style="accent-color: #8b5cf6;" />
                <span style="font-weight: 700;">Production Webhook</span>
              </label>
              ${workflow.test_webhook_url ? `
                <label style="display: flex; align-items: center; gap: 6px; font-size: 12px; cursor: pointer;">
                  <input type="radio" name="execEndpointTarget" value="test" style="accent-color: var(--accent-amber);" />
                  <span style="font-weight: 700; color: #fbbf24;">Test Webhook Endpoint</span>
                </label>
              ` : ''}
            </div>
            <div id="execTargetUrlDisplay" style="font-family: var(--font-mono); font-size: 11px; color: var(--text-dim); margin-top: 6px; background: rgba(0,0,0,0.3); padding: 6px 10px; border-radius: var(--radius-sm); word-break: break-all;">
              [${workflow.http_method || 'POST'}] ${this.escapeHtml(workflow.webhook_url)}
            </div>
          </div>

          <!-- JSON Payload Editor -->
          <div style="margin-bottom: 16px;">
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 6px;">
              <label style="font-size: 11px; font-weight: 700; color: var(--text-dim); text-transform: uppercase;">
                Custom Payload (JSON Body)
              </label>
              <button 
                type="button" 
                class="btn-cyber btn-cyber-secondary btn-sm" 
                style="padding: 2px 8px; font-size: 10px;"
                onclick="N8nComponent.formatJsonInTextarea('execPayloadTextarea')"
              >
                ✨ Format JSON
              </button>
            </div>
            <textarea 
              id="execPayloadTextarea" 
              class="cyber-input" 
              rows="7" 
              style="font-family: var(--font-mono); font-size: 11px; width: 100%; resize: vertical; line-height: 1.4;"
            >${this.escapeHtml(payloadString)}</textarea>
            <div style="font-size: 10px; color: var(--text-dim); margin-top: 4px;">
              Dynamic context variables available in template: <code>{{channel_id}}</code>, <code>{{timestamp}}</code>, <code>{{action}}</code>
            </div>
          </div>

          <!-- Studio Context Banner -->
          <div style="background: rgba(139, 92, 246, 0.08); border: 1px solid rgba(139, 92, 246, 0.25); border-radius: var(--radius-sm); padding: 10px 14px; margin-bottom: 18px; font-size: 11px; color: var(--text-muted); display: flex; align-items: center; gap: 10px;">
            <span style="font-size: 16px;">ℹ️</span>
            <div>
              <strong style="color: #a78bfa;">Studio Telemetry Auto-Injection:</strong> 
              The server will automatically attach <code>_studio_context</code> (channel ID, session user, environment timestamp) into the outgoing payload.
            </div>
          </div>

          <!-- Execution Live Result Area (Hidden initially) -->
          <div id="execLiveResultContainer" style="display: none; margin-bottom: 18px; border-radius: var(--radius-sm); padding: 12px 14px; background: rgba(0,0,0,0.4); border: 1px solid var(--border-color);">
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px;">
              <span id="execLiveStatusBadge" class="badge"></span>
              <span id="execLiveLatency" style="font-family: var(--font-mono); font-size: 11px; color: #fbbf24;"></span>
            </div>
            <div style="font-size: 11px; font-weight: 700; color: var(--text-dim); margin-bottom: 4px;">Response Body:</div>
            <pre id="execLiveResponseBody" style="background: rgba(0,0,0,0.5); padding: 10px; border-radius: 4px; font-family: var(--font-mono); font-size: 10px; color: var(--accent-cyan); max-height: 160px; overflow-y: auto; white-space: pre-wrap; word-break: break-all; margin: 0;"></pre>
          </div>

          <!-- Modal Actions -->
          <div style="display: flex; justify-content: flex-end; gap: 10px; border-top: 1px solid var(--border-color); padding-top: 16px;">
            <button class="btn-cyber btn-cyber-secondary" onclick="document.getElementById('modalRoot').innerHTML=''">
              CLOSE
            </button>
            <button class="btn-cyber btn-cyber-primary" id="btnDispatchExecute" style="background: linear-gradient(135deg, #8b5cf6, #6366f1); font-weight: 800;">
              <span>⚡</span>
              <span>DISPATCH WEBHOOK</span>
            </button>
          </div>
        </div>
      </div>
    `;

    // Listen to endpoint target radio changes
    const targetRadios = document.querySelectorAll('input[name="execEndpointTarget"]');
    const targetDisplay = document.getElementById('execTargetUrlDisplay');
    targetRadios.forEach(radio => {
      radio.onchange = () => {
        const isTest = radio.value === 'test';
        const url = isTest ? (workflow.test_webhook_url || workflow.webhook_url) : workflow.webhook_url;
        targetDisplay.innerHTML = `[${workflow.http_method || 'POST'}] ${N8nComponent.escapeHtml(url)}`;
      };
    });

    // Handle dispatch button click
    document.getElementById('btnDispatchExecute').onclick = async () => {
      const btn = document.getElementById('btnDispatchExecute');
      const payloadText = document.getElementById('execPayloadTextarea').value.trim();
      const isTestTarget = document.querySelector('input[name="execEndpointTarget"]:checked')?.value === 'test';

      let parsedPayload = {};
      if (payloadText) {
        try {
          parsedPayload = JSON.parse(payloadText);
        } catch (err) {
          Toast.show('Invalid JSON format in payload: ' + err.message, 'warning');
          return;
        }
      }

      btn.disabled = true;
      btn.innerHTML = `<span>⏳</span><span>DISPATCHING WEBHOOK...</span>`;

      const resultBox = document.getElementById('execLiveResultContainer');
      const badge = document.getElementById('execLiveStatusBadge');
      const latency = document.getElementById('execLiveLatency');
      const bodyPre = document.getElementById('execLiveResponseBody');

      resultBox.style.display = 'block';
      badge.className = 'badge badge-cyan';
      badge.textContent = 'DISPATCHING...';
      latency.textContent = '';
      bodyPre.textContent = 'Waiting for response from n8n webhook...';

      try {
        const res = await API.n8n.workflows.execute(workflow.id, parsedPayload, {
          target: isTestTarget ? 'test' : 'production'
        });

        const execution = res.execution || {};
        const isSuccess = res.success && execution.status === 'success';

        badge.className = isSuccess ? 'badge badge-emerald' : 'badge badge-magenta';
        badge.textContent = isSuccess ? `✓ HTTP ${execution.status_code || 200} SUCCESS` : `✗ HTTP ${execution.status_code || 500} FAILED`;
        latency.textContent = `Latency: ${execution.duration_ms || 0}ms`;

        let respContent = '';
        if (execution.response_payload) {
          respContent = typeof execution.response_payload === 'object' 
            ? JSON.stringify(execution.response_payload, null, 2) 
            : String(execution.response_payload);
        } else if (execution.error_message) {
          respContent = `Error: ${execution.error_message}`;
        } else {
          respContent = 'No response body returned.';
        }
        bodyPre.textContent = respContent;

        if (isSuccess) {
          Toast.show(`Workflow executed successfully in ${execution.duration_ms}ms!`, 'success');
        } else {
          Toast.show(`Workflow execution failed (HTTP ${execution.status_code}): ${execution.error_message || 'Unknown error'}`, 'error', 6000);
        }

        // Refresh underlying dataset in background
        await N8nComponent.loadData();
      } catch (err) {
        badge.className = 'badge badge-magenta';
        badge.textContent = '✗ DISPATCH ERROR';
        latency.textContent = '';
        bodyPre.textContent = `System Error: ${err.message}`;
        Toast.show('Failed to execute workflow: ' + err.message, 'error');
      } finally {
        btn.disabled = false;
        btn.innerHTML = `<span>⚡</span><span>DISPATCH AGAIN</span>`;
      }
    };
  },

  formatJsonInTextarea(textareaId) {
    const el = document.getElementById(textareaId);
    if (!el) return;
    try {
      const parsed = JSON.parse(el.value);
      el.value = JSON.stringify(parsed, null, 2);
      Toast.show('JSON formatted successfully', 'info', 1000);
    } catch (err) {
      Toast.show('Cannot format: invalid JSON (' + err.message + ')', 'warning');
    }
  },

  // ==========================================
  // MODAL 2: WORKFLOW EDITOR (ADD / EDIT)
  // ==========================================
  openWorkflowModal(workflowId = null) {
    const isEditing = Boolean(workflowId);
    let workflow = {
      name: '',
      description: '',
      category: 'automation',
      webhook_url: '',
      test_webhook_url: '',
      http_method: 'POST',
      auth_header_name: 'X-Webhook-Token',
      auth_header_value: '',
      payload_template: {},
      timeout_seconds: 30,
      is_active: true
    };

    if (isEditing) {
      const existing = this.workflows.find(w => w.id === workflowId);
      if (existing) {
        workflow = { ...existing };
      }
    }

    let payloadString = '{}';
    if (workflow.payload_template) {
      payloadString = typeof workflow.payload_template === 'object'
        ? JSON.stringify(workflow.payload_template, null, 2)
        : String(workflow.payload_template);
    }

    const modalRoot = document.getElementById('modalRoot');
    if (!modalRoot) return;

    modalRoot.innerHTML = `
      <div class="cyber-modal-overlay" style="display: flex; align-items: center; justify-content: center; position: fixed; inset: 0; background: rgba(0,0,0,0.85); z-index: 10000; padding: 20px; overflow-y: auto;">
        <div class="glass-card" style="max-width: 680px; width: 100%; padding: 26px; border-color: #8b5cf6; max-height: 90vh; overflow-y: auto;">
          <!-- Header -->
          <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 18px; border-bottom: 1px solid var(--border-color); padding-bottom: 14px;">
            <div style="display: flex; align-items: center; gap: 10px;">
              <span style="font-size: 22px;">⚙️</span>
              <h3 style="font-size: 17px; font-weight: 800; color: var(--text-main); margin: 0;">
                ${isEditing ? 'EDIT N8N WORKFLOW DIRECTIVE' : 'REGISTER NEW N8N WORKFLOW'}
              </h3>
            </div>
            <button class="btn-cyber btn-cyber-secondary btn-sm" onclick="document.getElementById('modalRoot').innerHTML=''" style="padding: 4px 8px;">✕</button>
          </div>

          <!-- Form Fields -->
          <form id="workflowEditForm">
            <div style="display: grid; grid-template-columns: 2fr 1fr; gap: 14px; margin-bottom: 14px;">
              <div>
                <label style="font-size: 11px; font-weight: 700; color: var(--text-dim); text-transform: uppercase;">Workflow Name *</label>
                <input type="text" id="wfFormName" class="cyber-input" placeholder="e.g. AI SEO Enrichment" value="${this.escapeHtml(workflow.name)}" required style="margin-top: 4px;" />
              </div>
              <div>
                <label style="font-size: 11px; font-weight: 700; color: var(--text-dim); text-transform: uppercase;">Category *</label>
                <select id="wfFormCategory" class="cyber-input" style="margin-top: 4px;">
                  <option value="ai_enrichment" ${workflow.category === 'ai_enrichment' ? 'selected' : ''}>🧠 AI Enrichment</option>
                  <option value="social" ${workflow.category === 'social' ? 'selected' : ''}>📣 Social Cross-Post</option>
                  <option value="assets" ${workflow.category === 'assets' ? 'selected' : ''}>🎨 Asset Generation</option>
                  <option value="telemetry" ${workflow.category === 'telemetry' ? 'selected' : ''}>📊 Telemetry & Reports</option>
                  <option value="automation" ${workflow.category === 'automation' ? 'selected' : ''}>⚡ General Automation</option>
                  <option value="custom" ${workflow.category === 'custom' ? 'selected' : ''}>🔧 Custom</option>
                </select>
              </div>
            </div>

            <div style="margin-bottom: 14px;">
              <label style="font-size: 11px; font-weight: 700; color: var(--text-dim); text-transform: uppercase;">Description</label>
              <textarea id="wfFormDesc" class="cyber-input" rows="2" placeholder="Brief summary of what this workflow triggers and orchestrates..." style="margin-top: 4px; resize: vertical;">${this.escapeHtml(workflow.description || '')}</textarea>
            </div>

            <div style="display: grid; grid-template-columns: 3fr 1fr; gap: 14px; margin-bottom: 14px;">
              <div>
                <label style="font-size: 11px; font-weight: 700; color: var(--text-dim); text-transform: uppercase;">Production Webhook URL *</label>
                <input type="url" id="wfFormWebhookUrl" class="cyber-input" placeholder="http://localhost:5678/webhook/..." value="${this.escapeHtml(workflow.webhook_url)}" required style="margin-top: 4px;" />
              </div>
              <div>
                <label style="font-size: 11px; font-weight: 700; color: var(--text-dim); text-transform: uppercase;">HTTP Method *</label>
                <select id="wfFormMethod" class="cyber-input" style="margin-top: 4px;">
                  <option value="POST" ${workflow.http_method === 'POST' ? 'selected' : ''}>POST</option>
                  <option value="GET" ${workflow.http_method === 'GET' ? 'selected' : ''}>GET</option>
                  <option value="PUT" ${workflow.http_method === 'PUT' ? 'selected' : ''}>PUT</option>
                  <option value="PATCH" ${workflow.http_method === 'PATCH' ? 'selected' : ''}>PATCH</option>
                </select>
              </div>
            </div>

            <div style="margin-bottom: 14px;">
              <label style="font-size: 11px; font-weight: 700; color: var(--text-dim); text-transform: uppercase;">Test Webhook URL (Optional)</label>
              <input type="url" id="wfFormTestWebhookUrl" class="cyber-input" placeholder="http://localhost:5678/webhook-test/..." value="${this.escapeHtml(workflow.test_webhook_url || '')}" style="margin-top: 4px;" />
              <span style="font-size: 10px; color: var(--text-dim); margin-top: 2px; display: block;">Used for test triggers when crafting workflows inside the n8n visual editor canvas.</span>
            </div>

            <div style="display: grid; grid-template-columns: 1fr 1fr 100px; gap: 14px; margin-bottom: 14px;">
              <div>
                <label style="font-size: 11px; font-weight: 700; color: var(--text-dim); text-transform: uppercase;">Auth Header Name</label>
                <input type="text" id="wfFormAuthHeaderName" class="cyber-input" placeholder="X-Webhook-Token" value="${this.escapeHtml(workflow.auth_header_name || '')}" style="margin-top: 4px;" />
              </div>
              <div>
                <label style="font-size: 11px; font-weight: 700; color: var(--text-dim); text-transform: uppercase;">Auth Header Value</label>
                <input type="password" id="wfFormAuthHeaderValue" class="cyber-input" placeholder="Secret token" value="${this.escapeHtml(workflow.auth_header_value || '')}" autocomplete="off" style="margin-top: 4px;" />
              </div>
              <div>
                <label style="font-size: 11px; font-weight: 700; color: var(--text-dim); text-transform: uppercase;">Timeout (s)</label>
                <input type="number" id="wfFormTimeout" class="cyber-input" placeholder="30" value="${workflow.timeout_seconds || 30}" min="5" max="300" style="margin-top: 4px;" />
              </div>
            </div>

            <div style="margin-bottom: 16px;">
              <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 4px;">
                <label style="font-size: 11px; font-weight: 700; color: var(--text-dim); text-transform: uppercase;">Default Payload Template (JSON)</label>
                <button type="button" class="btn-cyber btn-cyber-secondary btn-sm" style="padding: 2px 8px; font-size: 10px;" onclick="N8nComponent.formatJsonInTextarea('wfFormPayloadTemplate')">
                  ✨ Format
                </button>
              </div>
              <textarea id="wfFormPayloadTemplate" class="cyber-input" rows="6" style="font-family: var(--font-mono); font-size: 11px; resize: vertical;">${this.escapeHtml(payloadString)}</textarea>
            </div>

            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px; background: rgba(0,0,0,0.2); padding: 12px 14px; border-radius: var(--radius-sm);">
              <div>
                <div style="font-weight: 700; font-size: 13px; color: var(--text-main);">Workflow Active Status</div>
                <div style="font-size: 11px; color: var(--text-dim);">Enable or pause automatic and manual execution of this workflow.</div>
              </div>
              <label style="display: flex; align-items: center; gap: 8px; cursor: pointer; font-weight: 700; font-size: 13px;">
                <input type="checkbox" id="wfFormIsActive" ${workflow.is_active ? 'checked' : ''} style="width: 18px; height: 18px; accent-color: #8b5cf6;" />
                <span>ACTIVE</span>
              </label>
            </div>

            <div style="display: flex; justify-content: flex-end; gap: 10px; border-top: 1px solid var(--border-color); padding-top: 16px;">
              <button type="button" class="btn-cyber btn-cyber-secondary" onclick="document.getElementById('modalRoot').innerHTML=''">
                CANCEL
              </button>
              <button type="submit" class="btn-cyber btn-cyber-primary" id="btnSaveWorkflow" style="background: linear-gradient(135deg, #8b5cf6, #6366f1); font-weight: 800;">
                <span>💾</span>
                <span>${isEditing ? 'UPDATE WORKFLOW' : 'CREATE WORKFLOW'}</span>
              </button>
            </div>
          </form>
        </div>
      </div>
    `;

    document.getElementById('workflowEditForm').onsubmit = async (e) => {
      e.preventDefault();
      const btn = document.getElementById('btnSaveWorkflow');
      btn.disabled = true;
      btn.innerHTML = `<span>⏳</span><span>SAVING...</span>`;

      const payloadRaw = document.getElementById('wfFormPayloadTemplate').value.trim();
      let parsedTemplate = {};
      if (payloadRaw) {
        try {
          parsedTemplate = JSON.parse(payloadRaw);
        } catch (err) {
          Toast.show('Invalid JSON format in payload template: ' + err.message, 'warning');
          btn.disabled = false;
          btn.innerHTML = `<span>💾</span><span>${isEditing ? 'UPDATE WORKFLOW' : 'CREATE WORKFLOW'}</span>`;
          return;
        }
      }

      const postData = {
        name: document.getElementById('wfFormName').value.trim(),
        description: document.getElementById('wfFormDesc').value.trim(),
        category: document.getElementById('wfFormCategory').value,
        webhook_url: document.getElementById('wfFormWebhookUrl').value.trim(),
        test_webhook_url: document.getElementById('wfFormTestWebhookUrl').value.trim(),
        http_method: document.getElementById('wfFormMethod').value,
        auth_header_name: document.getElementById('wfFormAuthHeaderName').value.trim(),
        auth_header_value: document.getElementById('wfFormAuthHeaderValue').value.trim(),
        payload_template: parsedTemplate,
        timeout_seconds: parseInt(document.getElementById('wfFormTimeout').value, 10) || 30,
        is_active: document.getElementById('wfFormIsActive').checked
      };

      try {
        if (isEditing) {
          await API.n8n.workflows.update(workflowId, postData);
          Toast.show('Workflow updated successfully!', 'success');
        } else {
          await API.n8n.workflows.create(postData);
          Toast.show('Workflow registered successfully!', 'success');
        }
        modalRoot.innerHTML = '';
        await this.loadData();
        this.render(document.getElementById('mainContentArea'));
      } catch (err) {
        Toast.show(`Failed to save workflow: ${err.message}`, 'error');
        btn.disabled = false;
        btn.innerHTML = `<span>💾</span><span>${isEditing ? 'UPDATE WORKFLOW' : 'CREATE WORKFLOW'}</span>`;
      }
    };
  },

  confirmDeleteWorkflow(workflowId) {
    const workflow = this.workflows.find(w => w.id === workflowId);
    if (!workflow) return;

    const modalRoot = document.getElementById('modalRoot');
    if (!modalRoot) return;

    modalRoot.innerHTML = `
      <div class="cyber-modal-overlay" style="display: flex; align-items: center; justify-content: center; position: fixed; inset: 0; background: rgba(0,0,0,0.85); z-index: 10000; padding: 20px;">
        <div class="glass-card" style="max-width: 480px; width: 100%; padding: 26px; border-color: #ef4444;">
          <div style="display: flex; align-items: center; gap: 12px; margin-bottom: 14px;">
            <span style="font-size: 26px;">⚠️</span>
            <h3 style="font-size: 17px; font-weight: 800; color: #ef4444; margin: 0;">DELETE WORKFLOW DIRECTIVE</h3>
          </div>
          <p style="font-size: 13px; color: var(--text-muted); line-height: 1.6; margin-bottom: 22px;">
            Are you sure you want to permanently delete workflow <strong>${this.escapeHtml(workflow.name)}</strong>? All associated execution logs will also be removed.
          </p>
          <div style="display: flex; justify-content: flex-end; gap: 10px;">
            <button class="btn-cyber btn-cyber-secondary" onclick="document.getElementById('modalRoot').innerHTML=''">
              CANCEL
            </button>
            <button class="btn-cyber btn-cyber-danger" id="btnConfirmDeleteWf">
              DELETE NOW
            </button>
          </div>
        </div>
      </div>
    `;

    document.getElementById('btnConfirmDeleteWf').onclick = async () => {
      const btn = document.getElementById('btnConfirmDeleteWf');
      btn.disabled = true;
      btn.innerHTML = `<span>⏳</span><span>DELETING...</span>`;
      try {
        await API.n8n.workflows.delete(workflowId);
        modalRoot.innerHTML = '';
        Toast.show('Workflow deleted successfully.', 'success');
        await this.loadData();
        this.render(document.getElementById('mainContentArea'));
      } catch (err) {
        Toast.show('Failed to delete workflow: ' + err.message, 'error');
      }
    };
  },

  // ==========================================
  // MODAL 3: EXECUTION INSPECTOR
  // ==========================================
  openInspectorModal(executionId) {
    const execution = this.executions.find(e => e.id === executionId);
    if (!execution) {
      Toast.show('Execution record not found', 'error');
      return;
    }

    const modalRoot = document.getElementById('modalRoot');
    if (!modalRoot) return;

    const isSuccess = execution.status === 'success';
    const reqPayloadStr = execution.request_payload ? JSON.stringify(execution.request_payload, null, 2) : '{}';
    const resPayloadStr = execution.response_payload ? JSON.stringify(execution.response_payload, null, 2) : 'No response content';

    modalRoot.innerHTML = `
      <div class="cyber-modal-overlay" style="display: flex; align-items: center; justify-content: center; position: fixed; inset: 0; background: rgba(0,0,0,0.85); z-index: 10000; padding: 20px; overflow-y: auto;">
        <div class="glass-card" style="max-width: 740px; width: 100%; padding: 26px; border-color: ${isSuccess ? '#10b981' : '#ef4444'}; max-height: 90vh; overflow-y: auto;">
          <!-- Header -->
          <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 18px; border-bottom: 1px solid var(--border-color); padding-bottom: 14px;">
            <div>
              <div style="display: flex; align-items: center; gap: 10px;">
                <span class="badge ${isSuccess ? 'badge-emerald' : 'badge-magenta'}" style="font-size: 11px;">
                  ${(execution.status || 'UNKNOWN').toUpperCase()}
                </span>
                <h3 style="font-size: 17px; font-weight: 800; color: var(--text-main); margin: 0;">
                  EXECUTION TELEMETRY INSPECTOR
                </h3>
              </div>
              <div style="font-family: var(--font-mono); font-size: 11px; color: var(--text-dim); margin-top: 4px;">
                ID: ${execution.id}
              </div>
            </div>
            <button class="btn-cyber btn-cyber-secondary btn-sm" onclick="document.getElementById('modalRoot').innerHTML=''" style="padding: 4px 8px;">✕</button>
          </div>

          <!-- Metadata Grid -->
          <div style="display: grid; grid-template-columns: repeat(4, 1fr); gap: 10px; background: rgba(0,0,0,0.25); padding: 12px 16px; border-radius: var(--radius-sm); margin-bottom: 18px; font-size: 11px;">
            <div>
              <div style="font-weight: 700; color: var(--text-dim); text-transform: uppercase;">Workflow</div>
              <div style="font-weight: 800; color: var(--text-main); margin-top: 2px;">${this.escapeHtml(execution.workflow_name || 'Workflow')}</div>
            </div>
            <div>
              <div style="font-weight: 700; color: var(--text-dim); text-transform: uppercase;">HTTP Status</div>
              <div style="font-weight: 800; color: ${isSuccess ? '#10b981' : '#ef4444'}; margin-top: 2px;">
                ${execution.status_code ? `HTTP ${execution.status_code}` : '—'}
              </div>
            </div>
            <div>
              <div style="font-weight: 700; color: var(--text-dim); text-transform: uppercase;">Latency</div>
              <div style="font-weight: 800; color: #fbbf24; margin-top: 2px;">${execution.duration_ms || 0}ms</div>
            </div>
            <div>
              <div style="font-weight: 700; color: var(--text-dim); text-transform: uppercase;">Dispatched At</div>
              <div style="color: var(--text-muted); margin-top: 2px;">${this.formatDate(execution.created_at)}</div>
            </div>
          </div>

          <!-- Request Target Endpoint -->
          <div style="margin-bottom: 14px;">
            <div style="font-size: 11px; font-weight: 700; color: var(--text-dim); text-transform: uppercase; margin-bottom: 4px;">Webhook Target URL:</div>
            <div style="background: rgba(0,0,0,0.3); padding: 8px 12px; border-radius: var(--radius-sm); font-family: var(--font-mono); font-size: 11px; color: var(--accent-cyan); word-break: break-all;">
              [${execution.http_method || 'POST'}] ${this.escapeHtml(execution.request_url || '—')}
            </div>
          </div>

          ${execution.error_message ? `
            <div style="background: rgba(239, 68, 68, 0.1); border: 1px solid rgba(239, 68, 68, 0.3); border-radius: var(--radius-sm); padding: 12px 14px; margin-bottom: 16px;">
              <div style="font-size: 11px; font-weight: 800; color: #ef4444; margin-bottom: 4px;">ERROR MESSAGE:</div>
              <div style="font-size: 12px; color: #fca5a5; font-family: var(--font-mono);">${this.escapeHtml(execution.error_message)}</div>
            </div>
          ` : ''}

          <!-- Request Payload -->
          <div style="margin-bottom: 16px;">
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 4px;">
              <span style="font-size: 11px; font-weight: 700; color: var(--text-dim); text-transform: uppercase;">Dispatched Payload:</span>
              <button class="btn-cyber btn-cyber-secondary btn-sm" style="padding: 2px 8px; font-size: 10px;" onclick="N8nComponent.copyToClipboard(document.getElementById('inspectorReqPayload').innerText, 'Request payload copied!')">📋 Copy</button>
            </div>
            <pre id="inspectorReqPayload" style="background: rgba(0,0,0,0.4); padding: 10px 14px; border-radius: var(--radius-sm); font-family: var(--font-mono); font-size: 11px; color: #a78bfa; max-height: 140px; overflow-y: auto; margin: 0; white-space: pre-wrap; word-break: break-all;">${this.escapeHtml(reqPayloadStr)}</pre>
          </div>

          <!-- Response Payload -->
          <div style="margin-bottom: 18px;">
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 4px;">
              <span style="font-size: 11px; font-weight: 700; color: var(--text-dim); text-transform: uppercase;">Webhook Response:</span>
              <button class="btn-cyber btn-cyber-secondary btn-sm" style="padding: 2px 8px; font-size: 10px;" onclick="N8nComponent.copyToClipboard(document.getElementById('inspectorResPayload').innerText, 'Response payload copied!')">📋 Copy</button>
            </div>
            <pre id="inspectorResPayload" style="background: rgba(0,0,0,0.4); padding: 10px 14px; border-radius: var(--radius-sm); font-family: var(--font-mono); font-size: 11px; color: ${isSuccess ? '#10b981' : '#f87171'}; max-height: 180px; overflow-y: auto; margin: 0; white-space: pre-wrap; word-break: break-all;">${this.escapeHtml(resPayloadStr)}</pre>
          </div>

          <div style="display: flex; justify-content: flex-end; border-top: 1px solid var(--border-color); padding-top: 14px;">
            <button class="btn-cyber btn-cyber-secondary" onclick="document.getElementById('modalRoot').innerHTML=''">
              CLOSE INSPECTOR
            </button>
          </div>
        </div>
      </div>
    `;
  },

  // ==========================================
  // HELPERS
  // ==========================================
  copyToClipboard(text, successMsg = 'Copied to clipboard!') {
    if (!text) return;
    navigator.clipboard.writeText(text).then(() => {
      Toast.show(successMsg, 'success', 2000);
    }).catch(err => {
      Toast.show('Copy failed: ' + err.message, 'error');
    });
  },

  formatDate(dateStr) {
    if (!dateStr) return '—';
    try {
      const d = new Date(dateStr);
      return d.toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit'
      });
    } catch (e) {
      return String(dateStr);
    }
  }
};

window.N8nComponent = N8nComponent;
