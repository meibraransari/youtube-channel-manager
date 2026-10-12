/**
 * User Management & RBAC Permissions Component
 * High Performance Operator Administration & Security Directory
 */
const UsersComponent = {
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

      target.innerHTML = `
        <div style="max-width: 1080px; margin: 0 auto;">
          <!-- Header Toolbar -->
          <div class="glass-card" style="padding: 22px; margin-bottom: 22px;">
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
                <button class="btn-cyber btn-cyber-primary" onclick="UsersComponent.openCreateUserModal()">
                  <span>➕</span> PROVISION NEW USER
                </button>
              </div>
            </div>
          </div>

          <!-- Users Table -->
          <div class="glass-card" style="padding: 0; overflow: hidden;">
            <div class="table-responsive">
              <table class="cyber-table">
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
                <tbody>
                  ${users.length === 0 ? `
                    <tr>
                      <td colspan="7" style="text-align: center; padding: 30px; color: var(--text-dim);">
                        No operator accounts found.
                      </td>
                    </tr>
                  ` : users.map(u => {
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
                                ${u.username}
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
                            <button class="btn-cyber btn-cyber-outline btn-sm" title="Edit Permissions & Role" onclick="UsersComponent.openEditUserModal('${u.id}')">
                              ✏️
                            </button>
                            <!-- Reset Password -->
                            <button class="btn-cyber btn-cyber-outline btn-sm" title="Reset Password" onclick="UsersComponent.openPasswordResetModal('${u.id}', '${u.username}')">
                              🔑
                            </button>
                            <!-- Delete (Admin root account cannot be deleted) -->
                            ${u.username !== 'admin' ? `
                              <button class="btn-cyber btn-cyber-danger btn-sm" title="Delete User" onclick="UsersComponent.openDeleteModal('${u.id}', '${u.username}')">
                                🗑️
                              </button>
                            ` : ''}
                          </div>
                        </td>
                      </tr>
                    `;
                  }).join('')}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      `;
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
            <input type="text" id="newUsername" class="cyber-input" placeholder="e.g. content_lead" style="margin-top: 4px;" />
          </div>

          <div>
            <label style="font-size: 11px; font-weight: 700; color: var(--text-dim); text-transform: uppercase;">Email Address *</label>
            <input type="email" id="newEmail" class="cyber-input" placeholder="e.g. lead@studio.local" style="margin-top: 4px;" />
          </div>

          <div>
            <label style="font-size: 11px; font-weight: 700; color: var(--text-dim); text-transform: uppercase;">Initial Password *</label>
            <input type="password" id="newPassword" class="cyber-input" placeholder="Min 6 characters" style="margin-top: 4px;" />
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
              ${this.allPermissions.map(p => `
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

    document.getElementById('saveCreateUserBtn').onclick = async () => {
      const btn = document.getElementById('saveCreateUserBtn');
      const username = document.getElementById('newUsername').value.trim();
      const email = document.getElementById('newEmail').value.trim();
      const password = document.getElementById('newPassword').value;
      const role = document.getElementById('newRole').value;

      if (!username || !email || !password) {
        Toast.show('All fields marked * are required', 'warning');
        return;
      }

      if (password.length < 6) {
        Toast.show('Password must be at least 6 characters', 'warning');
        return;
      }

      const selectedPerms = Array.from(document.querySelectorAll('input[name="newPermCheck"]:checked')).map(cb => cb.value);

      btn.disabled = true;
      btn.textContent = 'PROVISIONING...';

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
        btn.disabled = false;
        btn.textContent = 'PROVISION ACCOUNT';
      }
    };
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
      const res = await API.users.list();
      const user = (res.users || []).find(u => u.id === userId);
      if (!user) {
        Toast.show('User not found in directory', 'error');
        return;
      }

      const userPerms = this.safePermissions(user.permissions);

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
            <div class="modal-title">✏️ MODIFY OPERATOR: ${user.username}</div>
            <button class="modal-close-btn" data-close-modal="true" onclick="window.closeModal('userEditModal')">✕</button>
          </div>
          <div class="modal-body" style="display: flex; flex-direction: column; gap: 14px;">
            <div>
              <label style="font-size: 11px; font-weight: 700; color: var(--text-dim); text-transform: uppercase;">Operator Username</label>
              <input type="text" class="cyber-input" value="${user.username}" disabled style="margin-top: 4px; opacity: 0.7; cursor: not-allowed;" />
            </div>

            <div>
              <label style="font-size: 11px; font-weight: 700; color: var(--text-dim); text-transform: uppercase;">Email Address *</label>
              <input type="email" id="editUserEmail" class="cyber-input" value="${user.email}" style="margin-top: 4px;" />
            </div>

            <div>
              <label style="font-size: 11px; font-weight: 700; color: var(--text-dim); text-transform: uppercase;">Security Role</label>
              <select id="editUserRole" class="cyber-input" style="margin-top: 4px;" onchange="UsersComponent.presetRolePermissions(this.value, 'editPermCheck')">
                <option value="admin" ${user.role === 'admin' ? 'selected' : ''}>Administrator</option>
                <option value="manager" ${user.role === 'manager' ? 'selected' : ''}>Manager</option>
                <option value="editor" ${user.role === 'editor' ? 'selected' : ''}>Editor</option>
                <option value="viewer" ${user.role === 'viewer' ? 'selected' : ''}>Viewer</option>
              </select>
            </div>

            <div>
              <label style="font-size: 11px; font-weight: 700; color: var(--text-dim); text-transform: uppercase;">Account Active Status</label>
              <select id="editUserActive" class="cyber-input" style="margin-top: 4px;">
                <option value="true" ${user.is_active ? 'selected' : ''}>Active (Authorized to login)</option>
                <option value="false" ${!user.is_active ? 'selected' : ''}>Deactivated (Locked out)</option>
              </select>
            </div>

            <div>
              <label style="font-size: 11px; font-weight: 700; color: var(--text-dim); text-transform: uppercase;">New Password (Optional)</label>
              <input type="password" id="editUserPassword" class="cyber-input" placeholder="Leave blank to keep existing password" style="margin-top: 4px;" />
            </div>

            <div>
              <label style="font-size: 11px; font-weight: 700; color: var(--text-dim); text-transform: uppercase;">Granular Permissions Directory</label>
              <div style="display: grid; grid-template-columns: 1fr; gap: 8px; margin-top: 8px; background: rgba(0,0,0,0.2); padding: 12px; border-radius: 8px;">
                ${this.allPermissions.map(p => `
                  <label style="display: flex; align-items: center; gap: 8px; font-size: 12px; cursor: pointer;">
                    <input type="checkbox" name="editPermCheck" value="${p.key}" ${userPerms.includes(p.key) ? 'checked' : ''} />
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

      document.getElementById('saveEditUserBtn').onclick = async () => {
        const btn = document.getElementById('saveEditUserBtn');
        const email = document.getElementById('editUserEmail').value.trim();
        const role = document.getElementById('editUserRole').value;
        const is_active = document.getElementById('editUserActive').value === 'true';
        const password = document.getElementById('editUserPassword').value;
        const permissions = Array.from(document.querySelectorAll('input[name="editPermCheck"]:checked')).map(cb => cb.value);

        if (!email) {
          Toast.show('Email is required', 'warning');
          return;
        }

        btn.disabled = true;
        btn.textContent = 'SAVING...';

        try {
          const payload = { email, role, is_active, permissions };
          if (password && password.trim().length >= 6) {
            payload.password = password.trim();
          }

          await API.users.update(userId, payload);
          window.closeModal(modal);
          Toast.show(`Operator ${user.username} updated successfully!`, 'success');
          UsersComponent.render();
        } catch (err) {
          Toast.show(`Update failed: ${err.message}`, 'error');
          btn.disabled = false;
          btn.textContent = 'COMMIT UPDATES';
        }
      };
    } catch (err) {
      Toast.show(err.message, 'error');
    }
  },

  // 3. Password Reset Modal
  openPasswordResetModal(userId, username) {
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
          <input type="password" id="resetPasswordInput" class="cyber-input" placeholder="Min 6 characters" style="margin-top: 6px;" />
        </div>
        <div class="modal-footer">
          <button class="btn-cyber btn-cyber-outline" data-close-modal="true" onclick="window.closeModal('userPasswordModal')">ABORT</button>
          <button class="btn-cyber btn-cyber-primary" id="confirmResetPwBtn">UPDATE PASSWORD</button>
        </div>
      </div>
    `;

    window.openModal(modal);
    document.getElementById('resetPasswordInput').focus();

    document.getElementById('confirmResetPwBtn').onclick = async () => {
      const pass = document.getElementById('resetPasswordInput').value;
      if (!pass || pass.length < 6) {
        Toast.show('Password must be at least 6 characters', 'warning');
        return;
      }
      try {
        await API.users.resetPassword(userId, pass);
        window.closeModal(modal);
        Toast.show(`Password reset for ${username} succeeded!`, 'success');
      } catch (err) {
        Toast.show(`Password reset failed: ${err.message}`, 'error');
      }
    };
  },

  // 4. Delete User Modal
  openDeleteModal(userId, username) {
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

    document.getElementById('confirmDeleteUserBtn').onclick = async () => {
      const btn = document.getElementById('confirmDeleteUserBtn');
      btn.disabled = true;
      btn.textContent = 'DELETING...';

      try {
        await API.users.delete(userId);
        window.closeModal(modal);
        Toast.show(`Operator ${username} deleted successfully`, 'success');
        UsersComponent.render();
      } catch (err) {
        Toast.show(`Delete failed: ${err.message}`, 'error');
        btn.disabled = false;
        btn.textContent = 'YES, DELETE OPERATOR';
      }
    };
  }
};

window.UsersComponent = UsersComponent;
