/**
 * User Management & RBAC Permissions Component
 * High Performance Operator Administration & Security Directory
 */
const UsersComponent = {
  cachedUsers: [],
  searchQuery: '',
  roleFilter: 'all',

  escapeHtml(str) {
    if (!str) return '';
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  },

  allPermissions: [
    { key: 'can_view_content', label: 'View Content & Catalog' },
    { key: 'can_manage_content', label: 'Create, Edit & Delete Content' },
    { key: 'can_manage_users', label: 'Manage Users & Permissions' },
    { key: 'can_manage_settings', label: 'Modify System Settings' },
    { key: 'can_view_audit_logs', label: 'Inspect Audit Logs' },
    { key: 'can_export_data', label: 'Export Telemetry & Data' },
    { key: 'can_migrate_data', label: 'Execute MySQL-to-PostgreSQL Migrations' }
  ],

  getRoleBadgeClass(role) {
    if (role === 'admin') return 'badge-magenta';
    if (role === 'manager') return 'badge-violet';
    if (role === 'editor') return 'badge-cyan';
    return 'badge-amber';
  },

  safePermissions(perms) {
    if (Array.isArray(perms)) return perms;
    if (typeof perms === 'string') {
      try {
        const parsed = JSON.parse(perms);
        return Array.isArray(parsed) ? parsed : [];
      } catch {
        return [];
      }
    }
    return [];
  },

  getFilteredUsers() {
    const q = (this.searchQuery || '').trim().toLowerCase();
    return (this.cachedUsers || []).filter(u => {
      if (this.roleFilter !== 'all' && (u.role || '').toLowerCase() !== this.roleFilter.toLowerCase()) {
        return false;
      }
      if (!q) return true;
      return (
        (u.username || '').toLowerCase().includes(q) ||
        (u.email || '').toLowerCase().includes(q) ||
        (u.role || '').toLowerCase().includes(q)
      );
    });
  },

  onSearchChange(val) {
    this.searchQuery = val;
    this.refreshTableRows();
    const clearBtn = document.getElementById('userClearSearchBtn');
    if (clearBtn) clearBtn.style.display = val ? 'flex' : 'none';
    const indicator = document.getElementById('usersFilterIndicator');
    if (indicator) indicator.style.display = (val || this.roleFilter !== 'all') ? 'inline-flex' : 'none';
  },

  onRoleFilterChange(val) {
    this.roleFilter = val;
    this.refreshTableRows();
    const select = document.getElementById('usersRoleFilterSelect');
    if (select) select.value = val;
    document.querySelectorAll('.user-role-pill').forEach(pill => {
      if (pill.getAttribute('data-role') === val) {
        pill.classList.add('active');
      } else {
        pill.classList.remove('active');
      }
    });
    const indicator = document.getElementById('usersFilterIndicator');
    if (indicator) indicator.style.display = (this.searchQuery || val !== 'all') ? 'inline-flex' : 'none';
  },

  resetFilters() {
    this.searchQuery = '';
    this.roleFilter = 'all';
    const input = document.getElementById('usersSearchInput');
    if (input) input.value = '';
    const select = document.getElementById('usersRoleFilterSelect');
    if (select) select.value = 'all';
    const clearBtn = document.getElementById('userClearSearchBtn');
    if (clearBtn) clearBtn.style.display = 'none';
    const indicator = document.getElementById('usersFilterIndicator');
    if (indicator) indicator.style.display = 'none';
    document.querySelectorAll('.user-role-pill').forEach(pill => {
      if (pill.getAttribute('data-role') === 'all') {
        pill.classList.add('active');
      } else {
        pill.classList.remove('active');
      }
    });
    this.refreshTableRows();
    if (window.Toast && Toast.show) {
      Toast.show('User filters reset', 'info', 1200);
    }
  },

  refreshTableRows() {
    const tbody = document.getElementById('usersDirectoryTbody');
    if (!tbody) return;
    const filtered = this.getFilteredUsers();
    tbody.innerHTML = this.renderUsersTableRowsHtml(filtered);
  },

  renderUsersTableRowsHtml(users) {
    if (!users || users.length === 0) {
      const isFiltered = Boolean(this.searchQuery || this.roleFilter !== 'all');
      return `
        <tr>
          <td colspan="7" style="text-align: center; padding: 36px 20px; color: var(--text-dim);">
            <div style="font-size: 32px; margin-bottom: 8px;">👥</div>
            <div style="font-size: 14px; font-weight: 700; color: var(--text-main);">
              ${isFiltered ? 'No Operator Accounts Match Filter' : 'No operator accounts found.'}
            </div>
            <div style="font-size: 12px; margin-top: 4px; margin-bottom: 14px; color: var(--text-muted);">
              ${isFiltered ? 'Try clearing your search keyword or changing the role filter.' : 'Provision a new operator to assign security permissions.'}
            </div>
            ${isFiltered ? `
              <button class="btn-action-premium outline-neutral btn-sm" onclick="UsersComponent.resetFilters()">
                Clear Filters
              </button>
            ` : ''}
          </td>
        </tr>
      `;
    }

    return users.map(u => {
      const uPerms = UsersComponent.safePermissions(u.permissions);
      return `
        <tr>
          <!-- Username & Avatar -->
          <td>
            <div style="display: flex; align-items: center; gap: 10px;">
              <div class="user-avatar" style="width: 32px; height: 32px; font-size: 13px;">
                ${(u.username || 'OP').substring(0, 2).toUpperCase()}
              </div>
              <div>
                <div style="font-weight: 700; color: var(--text-main); font-size: 14px;">
                  ${u.username} ${u.username === 'admin' ? '<span style="font-size: 10px; color: #f59e0b; margin-left: 4px;">(Root)</span>' : ''}
                </div>
                <div style="font-size: 10px; color: var(--text-dim); font-family: var(--font-mono);">
                  ID: ${String(u.id).substring(0, 8)}...
                </div>
              </div>
            </div>
          </td>

          <!-- Email -->
          <td style="font-family: var(--font-mono); font-size: 12px; color: var(--text-muted);">
            ${u.email}
          </td>

          <!-- Role Badge -->
          <td>
            <span class="badge ${UsersComponent.getRoleBadgeClass(u.role)}">
              ${(u.role || 'viewer').toUpperCase()}
            </span>
          </td>

          <!-- Permissions -->
          <td>
            <div style="display: flex; gap: 4px; flex-wrap: wrap; max-width: 280px;">
              ${uPerms.map(p => `
                <span style="font-size: 10px; padding: 2px 6px; border-radius: 4px; background: rgba(13, 148, 136, 0.12); color: #14b8a6; border: 1px solid rgba(13, 148, 136, 0.25);">
                  ${p.replace('can_', '')}
                </span>
              `).join('')}
            </div>
          </td>

          <!-- Status -->
          <td>
            <span class="badge ${u.is_active ? 'badge-emerald' : 'badge-magenta'}">
              ${u.is_active ? 'ACTIVE' : 'LOCKED'}
            </span>
          </td>

          <!-- Created At -->
          <td style="font-size: 11px; color: var(--text-dim); font-family: var(--font-mono);">
            ${new Date(u.created_at).toLocaleDateString()}
          </td>

          <!-- Actions -->
          <td style="text-align: right;">
            <div style="display: inline-flex; gap: 6px;">
              <!-- Edit -->
              <button 
                class="btn-cyber btn-cyber-outline btn-sm" 
                data-action="edit-user" 
                data-id="${u.id}" 
                title="Edit Operator Profile & Role" 
                onclick="UsersComponent.openEditUserModal('${u.id}')"
              >
                ✏️ Edit
              </button>
              <!-- Reset Password -->
              <button 
                class="btn-cyber btn-cyber-outline btn-sm" 
                data-action="reset-pw" 
                data-id="${u.id}" 
                data-username="${u.username}" 
                title="Reset Password" 
                onclick="UsersComponent.openPasswordResetModal('${u.id}', '${u.username}')"
              >
                🔑 Password
              </button>
              <!-- Delete (Admin root account cannot be deleted) -->
              ${u.username !== 'admin' ? `
                <button 
                  class="btn-cyber btn-cyber-danger btn-sm" 
                  data-action="delete-user" 
                  data-id="${u.id}" 
                  data-username="${u.username}" 
                  title="Delete User" 
                  onclick="UsersComponent.openDeleteModal('${u.id}', '${u.username}')"
                >
                  🗑️
                </button>
              ` : `
                <span style="font-size: 11px; color: var(--text-dim); padding: 4px 6px;">Root</span>
              `}
            </div>
          </td>
        </tr>
      `;
    }).join('');
  },

  async render(container) {
    const target = container || document.getElementById('mainContentArea');
    if (!target) return;

    target.innerHTML = `
      <div style="display: flex; align-items: center; justify-content: center; height: 300px;">
        <div style="font-family: var(--font-tech); color: var(--accent-teal);">
          INITIALIZING RBAC DIRECTORY...
        </div>
      </div>
    `;

    try {
      const res = await API.users.list();
      const users = res.users || [];
      UsersComponent.cachedUsers = users;

      target.innerHTML = `
        <div style="max-width: 1080px; margin: 0 auto;">
          <!-- Header Toolbar -->
          <div class="glass-card" style="padding: 22px; margin-bottom: 20px;">
            <div style="display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 14px;">
              <div>
                <h1 style="font-size: 20px; font-weight: 800; display: flex; align-items: center; gap: 10px; color: var(--text-main);">
                  <span>👥</span> RBAC USER MANAGEMENT
                </h1>
                <p style="font-size: 12px; color: var(--text-dim); margin-top: 3px;">
                  Configure role-based access control, security permissions, and operator credentials
                </p>
              </div>
              <div>
                <button id="provisionUserBtn" class="btn-action-premium primary-teal" onclick="UsersComponent.openCreateUserModal()">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                    <line x1="12" y1="5" x2="12" y2="19"></line>
                    <line x1="5" y1="12" x2="19" y2="12"></line>
                  </svg>
                  <span>Provision New User</span>
                </button>
              </div>
            </div>
          </div>

          <!-- Professional Filter Controls Toolbar -->
          <div class="filter-toolbar-premium">
            <div class="filter-toolbar-row">
              <!-- Search Box -->
              <div class="search-box-premium" style="max-width: 320px;">
                <span class="search-icon">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                    <circle cx="11" cy="11" r="8"></circle>
                    <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
                  </svg>
                </span>
                <input 
                  type="text" 
                  id="usersSearchInput" 
                  placeholder="Search operators by username, email..." 
                  value="${this.escapeHtml(this.searchQuery)}"
                  oninput="UsersComponent.onSearchChange(this.value)"
                />
                <button 
                  type="button" 
                  id="userClearSearchBtn" 
                  class="clear-icon-btn" 
                  style="display: ${this.searchQuery ? 'flex' : 'none'};" 
                  onclick="UsersComponent.onSearchChange(''); document.getElementById('usersSearchInput').value='';" 
                  title="Clear search"
                >✕</button>
              </div>

              <!-- Filter Controls Group -->
              <div class="filter-controls-group" style="justify-content: flex-end;">
                <!-- Role Filter Dropdown -->
                <div class="filter-dropdown-premium">
                  <span class="filter-icon">
                    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                      <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"></path>
                    </svg>
                  </span>
                  <span class="filter-prefix-label">ROLE</span>
                  <select id="usersRoleFilterSelect" onchange="UsersComponent.onRoleFilterChange(this.value)">
                    <option value="all" ${this.roleFilter === 'all' ? 'selected' : ''}>All Roles</option>
                    <option value="admin" ${this.roleFilter === 'admin' ? 'selected' : ''}>Admin (Full Root)</option>
                    <option value="manager" ${this.roleFilter === 'manager' ? 'selected' : ''}>Manager</option>
                    <option value="editor" ${this.roleFilter === 'editor' ? 'selected' : ''}>Editor</option>
                    <option value="viewer" ${this.roleFilter === 'viewer' ? 'selected' : ''}>Viewer (Read-Only)</option>
                  </select>
                  <svg class="dropdown-arrow" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <polyline points="6 9 12 15 18 9"></polyline>
                  </svg>
                </div>

                <!-- Reset Filters Button -->
                <div id="usersFilterIndicator" class="active-filters-indicator" style="display: ${(this.searchQuery || this.roleFilter !== 'all') ? 'inline-flex' : 'none'};">
                  <button type="button" class="filter-reset-action" onclick="UsersComponent.resetFilters()" title="Reset user filters">
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                      <line x1="18" y1="6" x2="6" y2="18"></line>
                      <line x1="6" y1="6" x2="18" y2="18"></line>
                    </svg>
                    <span>Clear Filters</span>
                  </button>
                </div>
              </div>
            </div>

            <!-- Fast Role Pills -->
            <div class="filter-pills-bar" style="margin-top: 4px;">
              <span style="font-size: 10.5px; font-weight: 700; color: var(--text-dim); text-transform: uppercase; margin-right: 4px; letter-spacing: 0.5px;">FAST FILTER:</span>
              <button type="button" class="filter-pill-item user-role-pill ${this.roleFilter === 'all' ? 'active' : ''}" data-role="all" onclick="UsersComponent.onRoleFilterChange('all')">
                <span>All Operators</span>
                <span class="filter-pill-count">${users.length}</span>
              </button>
              <button type="button" class="filter-pill-item user-role-pill ${this.roleFilter === 'admin' ? 'active' : ''}" data-role="admin" onclick="UsersComponent.onRoleFilterChange('admin')">
                <span>👑 Admins</span>
              </button>
              <button type="button" class="filter-pill-item user-role-pill ${this.roleFilter === 'manager' ? 'active' : ''}" data-role="manager" onclick="UsersComponent.onRoleFilterChange('manager')">
                <span>🛡️ Managers</span>
              </button>
              <button type="button" class="filter-pill-item user-role-pill ${this.roleFilter === 'editor' ? 'active' : ''}" data-role="editor" onclick="UsersComponent.onRoleFilterChange('editor')">
                <span>✏️ Editors</span>
              </button>
              <button type="button" class="filter-pill-item user-role-pill ${this.roleFilter === 'viewer' ? 'active' : ''}" data-role="viewer" onclick="UsersComponent.onRoleFilterChange('viewer')">
                <span>👁️ Viewers</span>
              </button>
            </div>
          </div>

          <!-- Users Table -->
          <div class="glass-card" style="padding: 0; overflow: hidden;">
            <div class="table-responsive">
              <table class="cyber-table" id="usersDirectoryTable">
                <thead>
                  <tr>
                    <th>OPERATOR</th>
                    <th>EMAIL</th>
                    <th>SECURITY ROLE</th>
                    <th>PERMISSIONS</th>
                    <th>STATUS</th>
                    <th>ENROLLED</th>
                    <th style="text-align: right;">ACTIONS</th>
                  </tr>
                </thead>
                <tbody id="usersDirectoryTbody">
                  ${this.renderUsersTableRowsHtml(this.getFilteredUsers())}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      `;

      // 1. Programmatic click binding for provision button
      const provBtn = document.getElementById('provisionUserBtn');
      if (provBtn) {
        provBtn.onclick = (e) => {
          e.preventDefault();
          UsersComponent.openCreateUserModal();
        };
      }

      // 2. Programmatic click delegation for table actions
      const tableBody = document.getElementById('usersDirectoryTbody');
      if (tableBody) {
        tableBody.onclick = (e) => {
          const btn = e.target.closest('[data-action]');
          if (!btn) return;
          e.preventDefault();
          const action = btn.getAttribute('data-action');
          const id = btn.getAttribute('data-id');
          const username = btn.getAttribute('data-username');

          if (action === 'edit-user') {
            UsersComponent.openEditUserModal(id);
          } else if (action === 'reset-pw') {
            UsersComponent.openPasswordResetModal(id, username);
          } else if (action === 'delete-user') {
            UsersComponent.openDeleteModal(id, username);
          }
        };
      }
    } catch (err) {
      target.innerHTML = `
        <div class="glass-card" style="padding: 30px; text-align: center; color: #ef4444;">
          Failed to load operators directory: ${err.message}
        </div>
      `;
    }
  },

  // 1. Create User Modal
  openCreateUserModal() {
    try {
      let modal = document.getElementById('userCreateModal');
      if (!modal) {
        modal = document.createElement('div');
        modal.id = 'userCreateModal';
        modal.className = 'modal-overlay';
        document.body.appendChild(modal);
      }

      modal.innerHTML = `
        <div class="modal-dialog" style="max-width: 580px;">
          <div class="modal-header">
            <div class="modal-title">➕ PROVISION USER ACCOUNT</div>
            <button class="modal-close-btn" data-close-modal="true" onclick="window.closeModal('userCreateModal')">✕</button>
          </div>
          <div class="modal-body" style="display: flex; flex-direction: column; gap: 14px;">
            <div>
              <label style="font-size: 11px; font-weight: 700; color: var(--text-dim); text-transform: uppercase;">Username *</label>
              <input type="text" id="newUsername" class="cyber-input" placeholder="e.g. content_lead" style="margin-top: 4px;" autocomplete="off" />
            </div>

            <div>
              <label style="font-size: 11px; font-weight: 700; color: var(--text-dim); text-transform: uppercase;">Email Address *</label>
              <input type="email" id="newEmail" class="cyber-input" placeholder="e.g. lead@studio.local" style="margin-top: 4px;" autocomplete="off" />
            </div>

            <div>
              <label style="font-size: 11px; font-weight: 700; color: var(--text-dim); text-transform: uppercase;">Initial Password *</label>
              <input type="password" id="newPassword" class="cyber-input" placeholder="Min 6 characters" style="margin-top: 4px;" autocomplete="new-password" />
            </div>

            <div>
              <label style="font-size: 11px; font-weight: 700; color: var(--text-dim); text-transform: uppercase;">Role Preset</label>
              <select id="newRole" class="cyber-input" style="margin-top: 4px;" onchange="UsersComponent.presetRolePermissions(this.value, 'newPermCheck')">
                <option value="editor">Editor (Create & Edit Content)</option>
                <option value="manager">Manager (Content, Audit & Exports)</option>
                <option value="admin">Administrator (Full Directives)</option>
                <option value="viewer">Viewer (Read-only)</option>
              </select>
            </div>

            <div>
              <label style="font-size: 11px; font-weight: 700; color: var(--text-dim); text-transform: uppercase;">Granular Security Permissions</label>
              <div style="display: grid; grid-template-columns: 1fr; gap: 8px; margin-top: 8px; background: rgba(0,0,0,0.2); padding: 12px; border-radius: 8px;">
                ${UsersComponent.allPermissions.map(p => `
                  <label style="display: flex; align-items: center; gap: 8px; font-size: 12px; cursor: pointer;">
                    <input type="checkbox" name="newPermCheck" value="${p.key}" ${['can_view_content', 'can_manage_content'].includes(p.key) ? 'checked' : ''} />
                    <span>${p.label} <code style="color: #14b8a6; font-size: 10px;">(${p.key})</code></span>
                  </label>
                `).join('')}
              </div>
            </div>
          </div>
          <div class="modal-footer">
            <button class="btn-cyber btn-cyber-outline" data-close-modal="true" onclick="window.closeModal('userCreateModal')">ABORT</button>
            <button class="btn-cyber btn-cyber-primary" id="saveCreateUserBtn">PROVISION ACCOUNT</button>
          </div>
        </div>
      `;

      window.openModal(modal);

      const usernameInput = document.getElementById('newUsername');
      if (usernameInput) usernameInput.focus();

      const saveBtn = document.getElementById('saveCreateUserBtn');
      if (saveBtn) {
        saveBtn.onclick = async () => {
          const username = (document.getElementById('newUsername').value || '').trim();
          const email = (document.getElementById('newEmail').value || '').trim();
          const password = document.getElementById('newPassword').value || '';
          const role = document.getElementById('newRole').value || 'editor';

          if (!username || !email || !password) {
            Toast.show('All fields marked * are required', 'warning');
            return;
          }

          if (password.length < 6) {
            Toast.show('Password must be at least 6 characters', 'warning');
            return;
          }

          const selectedPerms = Array.from(document.querySelectorAll('input[name="newPermCheck"]:checked')).map(cb => cb.value);

          saveBtn.disabled = true;
          saveBtn.textContent = 'PROVISIONING...';

          try {
            await API.users.create({
              username,
              email,
              password,
              role,
              permissions: selectedPerms
            });
            window.closeModal(modal);
            Toast.show(`Operator ${username} provisioned successfully!`, 'success');
            UsersComponent.render();
          } catch (err) {
            Toast.show(`Failed to create user: ${err.message}`, 'error');
            saveBtn.disabled = false;
            saveBtn.textContent = 'PROVISION ACCOUNT';
          }
        };
      }
    } catch (err) {
      console.error('Error opening userCreateModal:', err);
      Toast.show(`Unable to open provision modal: ${err.message}`, 'error');
    }
  },

  presetRolePermissions(role, checkName) {
    const checkboxes = document.querySelectorAll(`input[name="${checkName}"]`);
    checkboxes.forEach(cb => {
      if (role === 'admin') {
        cb.checked = true;
      } else if (role === 'manager') {
        cb.checked = ['can_view_content', 'can_manage_content', 'can_view_audit_logs', 'can_export_data'].includes(cb.value);
      } else if (role === 'editor') {
        cb.checked = ['can_view_content', 'can_manage_content'].includes(cb.value);
      } else {
        cb.checked = cb.value === 'can_view_content';
      }
    });
  },

  // 2. Edit User Modal
  async openEditUserModal(userId) {
    try {
      // 1. Instant lookup from memory cache, fallback to API
      let user = (UsersComponent.cachedUsers || []).find(u => String(u.id).toLowerCase() === String(userId).toLowerCase());
      if (!user) {
        const res = await API.users.list();
        UsersComponent.cachedUsers = res.users || [];
        user = UsersComponent.cachedUsers.find(u => String(u.id).toLowerCase() === String(userId).toLowerCase());
      }

      if (!user) {
        Toast.show('Operator not found in directory', 'error');
        return;
      }

      const userPerms = UsersComponent.safePermissions(user.permissions);
      const isRootAdmin = user.username === 'admin';

      let modal = document.getElementById('userEditModal');
      if (!modal) {
        modal = document.createElement('div');
        modal.id = 'userEditModal';
        modal.className = 'modal-overlay';
        document.body.appendChild(modal);
      }

      modal.innerHTML = `
        <div class="modal-dialog" style="max-width: 580px;">
          <div class="modal-header">
            <div class="modal-title">✏️ MODIFY OPERATOR: ${user.username} ${isRootAdmin ? '<span style="font-size: 11px; color: #f59e0b; margin-left: 6px;">(Root Administrator)</span>' : ''}</div>
            <button class="modal-close-btn" data-close-modal="true" onclick="window.closeModal('userEditModal')">✕</button>
          </div>
          <div class="modal-body" style="display: flex; flex-direction: column; gap: 14px;">
            <div>
              <label style="font-size: 11px; font-weight: 700; color: var(--text-dim); text-transform: uppercase;">Operator Username</label>
              <input type="text" class="cyber-input" value="${user.username}" disabled style="margin-top: 4px; opacity: 0.75; cursor: not-allowed; font-weight: 700;" />
            </div>

            <div>
              <label style="font-size: 11px; font-weight: 700; color: var(--text-dim); text-transform: uppercase;">Email Address *</label>
              <input type="email" id="editUserEmail" class="cyber-input" value="${user.email}" style="margin-top: 4px;" autocomplete="off" />
            </div>

            <div>
              <label style="font-size: 11px; font-weight: 700; color: var(--text-dim); text-transform: uppercase;">Security Role</label>
              <select id="editUserRole" class="cyber-input" style="margin-top: 4px;" ${isRootAdmin ? 'disabled title="Root admin role is locked to Administrator"' : ''} onchange="UsersComponent.presetRolePermissions(this.value, 'editPermCheck')">
                <option value="admin" ${user.role === 'admin' ? 'selected' : ''}>Administrator (Full Directives)</option>
                <option value="manager" ${user.role === 'manager' ? 'selected' : ''}>Manager (Content, Audit & Exports)</option>
                <option value="editor" ${user.role === 'editor' ? 'selected' : ''}>Editor (Create & Edit Content)</option>
                <option value="viewer" ${user.role === 'viewer' ? 'selected' : ''}>Viewer (Read-only)</option>
              </select>
              ${isRootAdmin ? '<div style="font-size: 10px; color: var(--text-dim); margin-top: 3px;">Root account role is permanently assigned as Administrator.</div>' : ''}
            </div>

            <div>
              <label style="font-size: 11px; font-weight: 700; color: var(--text-dim); text-transform: uppercase;">Account Active Status</label>
              <select id="editUserActive" class="cyber-input" style="margin-top: 4px;" ${isRootAdmin ? 'disabled title="Root admin account cannot be deactivated"' : ''}>
                <option value="true" ${user.is_active ? 'selected' : ''}>Active (Authorized to login)</option>
                <option value="false" ${!user.is_active ? 'selected' : ''}>Deactivated (Locked out)</option>
              </select>
              ${isRootAdmin ? '<div style="font-size: 10px; color: var(--text-dim); margin-top: 3px;">Root account cannot be deactivated to prevent system lockouts.</div>' : ''}
            </div>

            <div>
              <label style="font-size: 11px; font-weight: 700; color: var(--text-dim); text-transform: uppercase;">New Password (Optional)</label>
              <input type="password" id="editUserPassword" class="cyber-input" placeholder="Leave blank to retain current password" style="margin-top: 4px;" autocomplete="new-password" />
            </div>

            <div>
              <label style="font-size: 11px; font-weight: 700; color: var(--text-dim); text-transform: uppercase;">Granular Security Permissions</label>
              <div style="display: grid; grid-template-columns: 1fr; gap: 8px; margin-top: 8px; background: rgba(0,0,0,0.2); padding: 12px; border-radius: 8px;">
                ${UsersComponent.allPermissions.map(p => `
                  <label style="display: flex; align-items: center; gap: 8px; font-size: 12px; cursor: pointer;">
                    <input type="checkbox" name="editPermCheck" value="${p.key}" ${(user.role === 'admin' || userPerms.includes(p.key)) ? 'checked' : ''} />
                    <span>${p.label} <code style="color: #14b8a6; font-size: 10px;">(${p.key})</code></span>
                  </label>
                `).join('')}
              </div>
            </div>
          </div>
          <div class="modal-footer">
            <button class="btn-cyber btn-cyber-outline" data-close-modal="true" onclick="window.closeModal('userEditModal')">ABORT</button>
            <button class="btn-cyber btn-cyber-primary" id="saveEditUserBtn">COMMIT UPDATES</button>
          </div>
        </div>
      `;

      window.openModal(modal);

      const saveBtn = document.getElementById('saveEditUserBtn');
      if (saveBtn) {
        saveBtn.onclick = async () => {
          const email = (document.getElementById('editUserEmail').value || '').trim();
          const role = isRootAdmin ? 'admin' : (document.getElementById('editUserRole').value || 'editor');
          const is_active = isRootAdmin ? true : (document.getElementById('editUserActive').value === 'true');
          const password = (document.getElementById('editUserPassword').value || '').trim();
          const permissions = Array.from(document.querySelectorAll('input[name="editPermCheck"]:checked')).map(cb => cb.value);

          if (!email) {
            Toast.show('Email address is required', 'warning');
            return;
          }

          if (password && password.length < 6) {
            Toast.show('New password must be at least 6 characters', 'warning');
            return;
          }

          saveBtn.disabled = true;
          saveBtn.textContent = 'SAVING UPDATES...';

          try {
            const payload = { email, role, is_active, permissions };
            if (password && password.length >= 6) {
              payload.password = password;
            }

            await API.users.update(userId, payload);
            window.closeModal(modal);
            Toast.show(`Operator ${user.username} updated successfully!`, 'success');
            UsersComponent.render();
          } catch (err) {
            Toast.show(`Update failed: ${err.message}`, 'error');
            saveBtn.disabled = false;
            saveBtn.textContent = 'COMMIT UPDATES';
          }
        };
      }
    } catch (err) {
      console.error('Error opening userEditModal:', err);
      Toast.show(`Failed to open edit modal: ${err.message}`, 'error');
    }
  },

  // 3. Password Reset Modal
  openPasswordResetModal(userId, username) {
    try {
      let modal = document.getElementById('userPasswordModal');
      if (!modal) {
        modal = document.createElement('div');
        modal.id = 'userPasswordModal';
        modal.className = 'modal-overlay';
        document.body.appendChild(modal);
      }

      modal.innerHTML = `
        <div class="modal-dialog" style="max-width: 480px;">
          <div class="modal-header">
            <div class="modal-title">🔑 RESET PASSWORD: ${username}</div>
            <button class="modal-close-btn" data-close-modal="true" onclick="window.closeModal('userPasswordModal')">✕</button>
          </div>
          <div class="modal-body">
            <label style="font-size: 11px; font-weight: 700; color: var(--text-dim); text-transform: uppercase;">New Secure Password</label>
            <input type="password" id="resetPasswordInput" class="cyber-input" placeholder="Min 6 characters" style="margin-top: 6px;" autocomplete="new-password" />
          </div>
          <div class="modal-footer">
            <button class="btn-cyber btn-cyber-outline" data-close-modal="true" onclick="window.closeModal('userPasswordModal')">ABORT</button>
            <button class="btn-cyber btn-cyber-primary" id="confirmResetPwBtn">UPDATE PASSWORD</button>
          </div>
        </div>
      `;

      window.openModal(modal);
      const input = document.getElementById('resetPasswordInput');
      if (input) input.focus();

      const confirmBtn = document.getElementById('confirmResetPwBtn');
      if (confirmBtn) {
        confirmBtn.onclick = async () => {
          const pass = (document.getElementById('resetPasswordInput').value || '').trim();
          if (!pass || pass.length < 6) {
            Toast.show('Password must be at least 6 characters', 'warning');
            return;
          }

          confirmBtn.disabled = true;
          confirmBtn.textContent = 'UPDATING...';

          try {
            await API.users.resetPassword(userId, pass);
            window.closeModal(modal);
            Toast.show(`Password reset for ${username} succeeded!`, 'success');
          } catch (err) {
            Toast.show(`Password reset failed: ${err.message}`, 'error');
            confirmBtn.disabled = false;
            confirmBtn.textContent = 'UPDATE PASSWORD';
          }
        };
      }
    } catch (err) {
      console.error('Error in openPasswordResetModal:', err);
      Toast.show(`Could not open reset password modal: ${err.message}`, 'error');
    }
  },

  // 4. Delete User Modal
  openDeleteModal(userId, username) {
    try {
      let modal = document.getElementById('userDeleteModal');
      if (!modal) {
        modal = document.createElement('div');
        modal.id = 'userDeleteModal';
        modal.className = 'modal-overlay';
        document.body.appendChild(modal);
      }

      modal.innerHTML = `
        <div class="modal-dialog" style="max-width: 460px; border-color: rgba(239, 68, 68, 0.4); box-shadow: 0 0 30px rgba(239, 68, 68, 0.3);">
          <div class="modal-header">
            <div class="modal-title" style="color: #ef4444; display: flex; align-items: center; gap: 8px;">
              <span>⚠️</span>
              <span>DELETE OPERATOR ACCOUNT</span>
            </div>
            <button class="modal-close-btn" data-close-modal="true" onclick="window.closeModal('userDeleteModal')">✕</button>
          </div>
          <div class="modal-body">
            <p style="font-size: 14px; color: var(--text-muted); line-height: 1.6;">
              Are you sure you want to permanently remove operator <strong style="color: var(--text-main);">${username}</strong>?
            </p>
            <p style="font-size: 12px; color: #f87171; margin-top: 8px;">
              Their system authorization, login sessions, and operator access will be permanently revoked.
            </p>
          </div>
          <div class="modal-footer">
            <button class="btn-cyber btn-cyber-outline" data-close-modal="true" onclick="window.closeModal('userDeleteModal')">ABORT</button>
            <button class="btn-cyber btn-cyber-danger" id="confirmDeleteUserBtn">YES, DELETE OPERATOR</button>
          </div>
        </div>
      `;

      window.openModal(modal);

      const confirmBtn = document.getElementById('confirmDeleteUserBtn');
      if (confirmBtn) {
        confirmBtn.onclick = async () => {
          confirmBtn.disabled = true;
          confirmBtn.textContent = 'DELETING...';

          try {
            await API.users.delete(userId);
            window.closeModal(modal);
            Toast.show(`Operator ${username} deleted successfully`, 'success');
            UsersComponent.render();
          } catch (err) {
            Toast.show(`Delete failed: ${err.message}`, 'error');
            confirmBtn.disabled = false;
            confirmBtn.textContent = 'YES, DELETE OPERATOR';
          }
        };
      }
    } catch (err) {
      console.error('Error in openDeleteModal:', err);
      Toast.show(`Could not open delete modal: ${err.message}`, 'error');
    }
  }
};

window.UsersComponent = UsersComponent;
