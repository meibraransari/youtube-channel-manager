/**
 * Audit Trail & Security Login History Component
 */
const AuditComponent = {
  currentTab: 'audit', // 'audit' or 'logins'
  currentPage: 1,
  limit: 20,
  actionFilter: 'all',
  entityFilter: 'all',

  async render(container) {
    this.currentPage = 1;

    container.innerHTML = `
      <div style="max-width: 1080px; margin: 0 auto;">
        <!-- Header Toolbar -->
        <div class="glass-card" style="padding: 22px; margin-bottom: 22px;">
          <div style="display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 14px;">
            <div>
              <h1 style="font-family: var(--font-tech); font-size: 20px; font-weight: 800; display: flex; align-items: center; gap: 10px;">
                <span>📜</span> AUDIT TRAIL & SECURITY TRACKER
              </h1>
              <p style="font-size: 12px; color: var(--text-dim); margin-top: 3px;">
                Immutable operational ledger recording all administrative, content, and authentication transactions
              </p>
            </div>
            <div style="display: flex; gap: 10px;">
              <button class="btn-cyber btn-cyber-outline" onclick="AuditComponent.exportAuditJson()">
                <span>📥</span> EXPORT JSON LEDGER
              </button>
            </div>
          </div>

          <!-- Tab Bar -->
          <div style="display: flex; gap: 10px; margin-top: 18px; border-bottom: 1px solid var(--border-subtle); padding-bottom: 10px;">
            <button class="btn-cyber ${this.currentTab === 'audit' ? 'btn-cyber-primary' : 'btn-cyber-outline'} btn-sm" id="tabAuditBtn" onclick="AuditComponent.switchTab('audit')">
              OPERATIONAL AUDIT TRAIL
            </button>
            <button class="btn-cyber ${this.currentTab === 'logins' ? 'btn-cyber-primary' : 'btn-cyber-outline'} btn-sm" id="tabLoginsBtn" onclick="AuditComponent.switchTab('logins')">
              SECURITY LOGIN HISTORY
            </button>
          </div>

          <!-- Audit Filters (Visible on audit tab) -->
          <div id="auditFiltersRow" style="display: ${this.currentTab === 'audit' ? 'flex' : 'none'}; gap: 12px; align-items: center; margin-top: 14px; flex-wrap: wrap;">
            <div>
              <label style="font-size: 10px; font-weight: 700; color: var(--text-dim);">ACTION:</label>
              <select id="auditActionSelect" class="cyber-input" style="padding: 6px 10px; font-size: 11px; width: 140px;">
                <option value="all">All Directives</option>
                <option value="CREATE">CREATE</option>
                <option value="UPDATE">UPDATE</option>
                <option value="RENAME">RENAME</option>
                <option value="DELETE">DELETE</option>
                <option value="DUPLICATE">DUPLICATE</option>
                <option value="STATUS_CHANGE">STATUS_CHANGE</option>
                <option value="SETTINGS_CHANGE">SETTINGS_CHANGE</option>
                <option value="MIGRATION">MIGRATION</option>
                <option value="LOGIN">LOGIN</option>
                <option value="LOGOUT">LOGOUT</option>
              </select>
            </div>

            <div>
              <label style="font-size: 10px; font-weight: 700; color: var(--text-dim);">ENTITY:</label>
              <select id="auditEntitySelect" class="cyber-input" style="padding: 6px 10px; font-size: 11px; width: 130px;">
                <option value="all">All Entities</option>
                <option value="short">Shorts</option>
                <option value="video">Videos</option>
                <option value="podcast">Podcasts</option>
                <option value="user">Users</option>
                <option value="setting">Settings</option>
                <option value="migration">Migrations</option>
                <option value="auth">Auth</option>
              </select>
            </div>

            <div style="flex: 1;"></div>
            <button class="btn-cyber btn-cyber-outline btn-sm" onclick="AuditComponent.loadData()">
              🔄 REFRESH
            </button>
          </div>
        </div>

        <!-- Table Container -->
        <div class="glass-card" style="padding: 0; overflow: hidden;" id="auditTableContainer">
          <div style="padding: 40px; text-align: center; color: var(--neon-cyan); font-family: var(--font-tech);">
            FETCHING SECURITY LOGS...
          </div>
        </div>
      </div>
    `;

    const actionSelect = document.getElementById('auditActionSelect');
    if (actionSelect) {
      actionSelect.value = this.actionFilter;
      actionSelect.onchange = (e) => {
        this.actionFilter = e.target.value;
        this.currentPage = 1;
        this.loadData();
      };
    }

    const entitySelect = document.getElementById('auditEntitySelect');
    if (entitySelect) {
      entitySelect.value = this.entityFilter;
      entitySelect.onchange = (e) => {
        this.entityFilter = e.target.value;
        this.currentPage = 1;
        this.loadData();
      };
    }

    this.loadData();
  },

  switchTab(tab) {
    this.currentTab = tab;
    this.currentPage = 1;
    this.render(document.getElementById('mainContentArea'));
  },

  async loadData() {
    const container = document.getElementById('auditTableContainer');
    if (!container) return;

    if (this.currentTab === 'audit') {
      try {
        const res = await API.audit.list({
          action: this.actionFilter,
          entity: this.entityFilter,
          page: this.currentPage,
          limit: this.limit
        });

        const { data, pagination } = res;

        if (!data || data.length === 0) {
          container.innerHTML = `
            <div style="padding: 40px; text-align: center; color: var(--text-dim);">
              No audit logs recorded for this criteria.
            </div>
          `;
          return;
        }

        container.innerHTML = `
          <div class="table-responsive">
            <table class="cyber-table">
              <thead>
                <tr>
                  <th style="width: 140px;">TIMESTAMP</th>
                  <th style="width: 120px;">OPERATOR</th>
                  <th style="width: 130px;">DIRECTIVE</th>
                  <th>ENTITY & TARGET</th>
                  <th style="width: 120px;">IP ADDRESS</th>
                  <th style="text-align: right; width: 80px;">INSPECT</th>
                </tr>
              </thead>
              <tbody>
                ${data.map(log => `
                  <tr>
                    <td style="font-family: var(--font-mono); font-size: 11px; color: var(--text-dim);">
                      ${new Date(log.created_at).toLocaleString()}
                    </td>
                    <td>
                      <span style="font-weight: 700; color: var(--text-main); font-family: var(--font-mono);">
                        ${log.username}
                      </span>
                    </td>
                    <td>
                      <span class="badge ${this.getBadgeForAction(log.action)}">
                        ${log.action}
                      </span>
                    </td>
                    <td>
                      <span style="font-weight: 600; color: var(--neon-cyan);">${log.entity}</span>
                      ${log.entity_id ? `<span style="color: var(--text-dim); font-size: 11px; margin-left: 6px; font-family: var(--font-mono);">(#${log.entity_id})</span>` : ''}
                    </td>
                    <td style="font-family: var(--font-mono); font-size: 11px; color: var(--text-muted);">
                      ${log.ip_address || '127.0.0.1'}
                    </td>
                    <td style="text-align: right;">
                      <button class="btn-cyber btn-cyber-outline btn-sm" onclick='AuditComponent.viewAuditDetail(${JSON.stringify(log).replace(/'/g, "&#39;")})'>
                        🔍
                      </button>
                    </td>
                  </tr>
                `).join('')}
              </tbody>
            </table>
          </div>

          <!-- Pagination -->
          <div style="padding: 12px 20px; border-top: 1px solid var(--border-color); display: flex; justify-content: space-between; align-items: center;">
            <div style="font-size: 12px; color: var(--text-dim); font-family: var(--font-mono);">
              TOTAL ENTRIES: ${pagination.total}
            </div>
            <div style="display: flex; gap: 6px;">
              <button class="btn-cyber btn-cyber-outline btn-sm" ${pagination.page <= 1 ? 'disabled style="opacity:0.4"' : ''} onclick="AuditComponent.changePage(${pagination.page - 1})">
                ◀ PREV
              </button>
              <span style="font-size: 12px; color: var(--neon-cyan); display: flex; align-items: center; padding: 0 6px;">
                PAGE ${pagination.page} / ${pagination.totalPages || 1}
              </span>
              <button class="btn-cyber btn-cyber-outline btn-sm" ${pagination.page >= pagination.totalPages ? 'disabled style="opacity:0.4"' : ''} onclick="AuditComponent.changePage(${pagination.page + 1})">
                NEXT ▶
              </button>
            </div>
          </div>
        `;
      } catch (err) {
        container.innerHTML = `<div style="padding: 30px; text-align: center; color: #ef4444;">${err.message}</div>`;
      }
    } else {
      // Security Login Logs Tab
      try {
        const res = await API.auth.getLoginHistory();
        const logs = res.logs || [];

        container.innerHTML = `
          <div class="table-responsive">
            <table class="cyber-table">
              <thead>
                <tr>
                  <th>TIMESTAMP</th>
                  <th>ACCOUNT</th>
                  <th>IP ADDRESS</th>
                  <th>RESULT</th>
                  <th>USER AGENT / CLIENT</th>
                </tr>
              </thead>
              <tbody>
                ${logs.map(l => `
                  <tr>
                    <td style="font-family: var(--font-mono); font-size: 11px; color: var(--text-dim);">
                      ${new Date(l.created_at).toLocaleString()}
                    </td>
                    <td style="font-weight: 700; color: var(--text-main); font-family: var(--font-mono);">
                      ${l.username}
                    </td>
                    <td style="font-family: var(--font-mono); font-size: 11px; color: var(--neon-cyan);">
                      ${l.ip_address || '127.0.0.1'}
                    </td>
                    <td>
                      <span class="badge ${l.status === 'success' ? 'badge-emerald' : 'badge-magenta'}">
                        ${l.status.toUpperCase()} ${l.failure_reason ? `(${l.failure_reason})` : ''}
                      </span>
                    </td>
                    <td style="font-size: 11px; color: var(--text-dim); max-width: 300px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">
                      ${l.user_agent || 'Unknown'}
                    </td>
                  </tr>
                `).join('')}
              </tbody>
            </table>
          </div>
        `;
      } catch (err) {
        container.innerHTML = `<div style="padding: 30px; text-align: center; color: #ef4444;">${err.message}</div>`;
      }
    }
  },

  changePage(page) {
    this.currentPage = page;
    this.loadData();
  },

  getBadgeForAction(action) {
    if (action === 'CREATE') return 'badge-emerald';
    if (action === 'UPDATE' || action === 'RENAME') return 'badge-cyan';
    if (action === 'DELETE') return 'badge-magenta';
    if (action === 'DUPLICATE') return 'badge-violet';
    if (action === 'SETTINGS_CHANGE') return 'badge-amber';
    return 'badge-cyan';
  },

  viewAuditDetail(log) {
    let modal = document.getElementById('auditDetailModal');
    if (!modal) {
      modal = document.createElement('div');
      modal.id = 'auditDetailModal';
      modal.className = 'modal-overlay';
      document.body.appendChild(modal);
    }

    modal.innerHTML = `
      <div class="modal-dialog" style="max-width: 620px;">
        <div class="modal-header">
          <div class="modal-title">🔍 AUDIT LOG INSPECTOR: #${log.id.substring(0, 8)}</div>
          <button class="modal-close-btn" data-close-modal="true" onclick="window.closeModal('auditDetailModal')">✕</button>
        </div>
        <div class="modal-body">
          <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 10px; font-size: 12px; margin-bottom: 14px;">
            <div><strong>Operator:</strong> ${log.username}</div>
            <div><strong>Directive:</strong> <span class="badge ${this.getBadgeForAction(log.action)}">${log.action}</span></div>
            <div><strong>Entity:</strong> ${log.entity}</div>
            <div><strong>Entity ID:</strong> ${log.entity_id || 'N/A'}</div>
            <div><strong>IP:</strong> ${log.ip_address}</div>
            <div><strong>Timestamp:</strong> ${new Date(log.created_at).toLocaleString()}</div>
          </div>
          <div>
            <label style="font-size: 11px; font-weight: 700; color: var(--text-dim);">PAYLOAD & STATE DIFF (JSON)</label>
            <pre style="background: rgba(0,0,0,0.4); padding: 12px; border-radius: 8px; font-family: var(--font-mono); font-size: 11px; color: var(--neon-cyan); max-height: 250px; overflow-y: auto; margin-top: 4px;">${JSON.stringify(log.details, null, 2) || 'No extra payload'}</pre>
          </div>
        </div>
        <div class="modal-footer">
          <button class="btn-cyber btn-cyber-primary" data-close-modal="true" onclick="window.closeModal('auditDetailModal')">CLOSE</button>
        </div>
      </div>
    `;

    window.openModal(modal);
  },

  exportAuditJson() {
    window.open('/api/audit/export?token=' + API.getToken(), '_blank');
  }
};

window.AuditComponent = AuditComponent;
