/**
 * Tag Manager & Reusable Preset Registry Component
 * Provides CRUD management, category tagging, search filtering, and 1-click wizard insertion.
 */
const TagManagerComponent = {
  presets: [],
  editingId: null,
  onSelectCallback: null,
  searchQuery: '',

  async loadPresets() {
    try {
      const res = await API.tags.getPresets();
      this.presets = res.presets || [];
      return this.presets;
    } catch (err) {
      console.warn('Failed to load tag presets:', err.message);
      this.presets = [];
      return [];
    }
  },

  async openModal(onSelectCallback = null) {
    this.onSelectCallback = onSelectCallback;
    this.editingId = null;
    this.searchQuery = '';

    let modal = document.getElementById('tagManagerModal');
    if (!modal) {
      modal = document.createElement('div');
      modal.id = 'tagManagerModal';
      modal.className = 'modal-overlay';
      document.body.appendChild(modal);
    }

    await this.loadPresets();
    this.renderModalContent();
    window.openModal('tagManagerModal');
  },

  renderModalContent() {
    const modal = document.getElementById('tagManagerModal');
    if (!modal) return;

    modal.innerHTML = `
      <div class="modal-dialog" style="max-width: 820px; max-height: 90vh;">
        <div class="modal-header">
          <div class="modal-title" style="display: flex; align-items: center; gap: 8px;">
            <span style="font-size: 18px;">🏷️</span>
            <span>TAG MANAGER & REUSABLE PRESET REGISTRY</span>
          </div>
          <button class="modal-close-btn" data-close-modal="true" onclick="window.closeModal('tagManagerModal')">✕</button>
        </div>

        <div class="modal-body" style="display: flex; flex-direction: column; gap: 16px; padding: 20px;">
          <!-- Description & Help Header -->
          <div style="background: rgba(13, 148, 136, 0.08); border: 1px solid var(--accent-teal); border-radius: var(--radius-sm); padding: 12px 16px;">
            <div style="font-weight: 700; font-size: 13px; color: var(--accent-teal); margin-bottom: 2px;">
              ⚡ High-CTR Tag Cluster Engine
            </div>
            <div style="font-size: 12px; color: var(--text-muted); line-height: 1.5;">
              Organize and deploy reusable comma-separated tags across your YouTube channel assets. Enforces YouTube's 500 characters limit automatically.
            </div>
          </div>

          <!-- Section 1: Create or Edit Preset Form -->
          <div class="glass-card" style="padding: 18px; border-color: var(--border-color); background: rgba(0, 0, 0, 0.2);">
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 12px;">
              <h4 id="tagMgrFormTitle" style="font-size: 13px; font-weight: 800; color: var(--text-main); margin: 0; display: flex; align-items: center; gap: 6px;">
                <span>➕</span>
                <span id="tagMgrFormHeadingText">CREATE NEW TAG PRESET</span>
              </h4>
              <button type="button" class="btn-cyber btn-cyber-outline btn-sm" id="btnResetTagDefaults" style="padding: 2px 8px; font-size: 10px;">
                🔄 RESTORE DEFAULTS
              </button>
            </div>

            <form id="tagPresetForm" style="display: flex; flex-direction: column; gap: 12px;">
              <div style="display: grid; grid-template-columns: 2fr 1fr; gap: 12px;">
                <div>
                  <label style="font-size: 11px; font-weight: 700; color: var(--text-dim); text-transform: uppercase;">
                    Preset Name *
                  </label>
                  <input 
                    type="text" 
                    id="tagMgrName" 
                    class="cyber-input" 
                    placeholder="e.g. Next.js & React Ecosystem" 
                    required 
                    style="margin-top: 4px;" 
                  />
                </div>
                <div>
                  <label style="font-size: 11px; font-weight: 700; color: var(--text-dim); text-transform: uppercase;">
                    Category / Topic
                  </label>
                  <input 
                    type="text" 
                    id="tagMgrCategory" 
                    class="cyber-input" 
                    placeholder="e.g. Web Dev" 
                    list="tagCategoryDatalist" 
                    style="margin-top: 4px;" 
                  />
                  <datalist id="tagCategoryDatalist">
                    <option value="Database">
                    <option value="DevOps">
                    <option value="Cloud">
                    <option value="Development">
                    <option value="AI & ML">
                    <option value="YouTube">
                    <option value="Architecture">
                    <option value="Security">
                    <option value="Frontend">
                  </datalist>
                </div>
              </div>

              <div>
                <div style="display: flex; justify-content: space-between; align-items: center;">
                  <label style="font-size: 11px; font-weight: 700; color: var(--text-dim); text-transform: uppercase;">
                    Tags (Comma-Separated) *
                  </label>
                  <span id="tagMgrCharCount" style="font-size: 11px; font-family: var(--font-mono); color: var(--text-dim);">
                    0 / 500 chars (0 tags)
                  </span>
                </div>
                <textarea 
                  id="tagMgrTags" 
                  class="cyber-input" 
                  rows="2" 
                  placeholder="react, nextjs, tailwind, typescript, web development, frontend" 
                  required 
                  style="margin-top: 4px; resize: vertical; font-family: var(--font-mono); font-size: 12px;"
                ></textarea>
              </div>

              <div style="display: flex; justify-content: flex-end; align-items: center; gap: 8px;">
                <button type="button" class="btn-cyber btn-cyber-outline btn-sm" id="btnCancelTagEdit" style="display: none;">
                  CANCEL EDIT
                </button>
                <button type="submit" class="btn-cyber btn-cyber-primary btn-sm" id="btnSaveTagPreset" style="display: flex; align-items: center; gap: 6px;">
                  <span>💾</span>
                  <span id="btnSavePresetText">SAVE PRESET</span>
                </button>
              </div>
            </form>
          </div>

          <!-- Section 2: Preset Search & Filter Bar -->
          <div style="display: flex; justify-content: space-between; align-items: center; gap: 12px; flex-wrap: wrap;">
            <div style="font-weight: 800; font-size: 12px; color: var(--text-dim); text-transform: uppercase; letter-spacing: 0.5px;">
              REGISTERED TAG PRESETS (${this.presets.length})
            </div>
            <div style="flex: 1; max-width: 320px;">
              <input 
                type="text" 
                id="tagMgrSearch" 
                class="cyber-input" 
                placeholder="🔍 Filter presets by keyword..." 
                value="${this.escapeHtml(this.searchQuery)}"
                style="padding: 6px 12px; font-size: 12px;" 
              />
            </div>
          </div>

          <!-- Section 3: Presets Grid Container -->
          <div id="tagPresetsListContainer" style="display: flex; flex-direction: column; gap: 10px; max-height: 380px; overflow-y: auto; padding-right: 4px;">
            ${this.renderPresetsCardsHtml()}
          </div>
        </div>

        <div class="modal-footer">
          <button type="button" class="btn-cyber btn-cyber-primary" data-close-modal="true" onclick="window.closeModal('tagManagerModal')">
            DONE / CLOSE
          </button>
        </div>
      </div>
    `;

    this.wireModalListeners();
  },

  renderPresetsCardsHtml() {
    const q = this.searchQuery.trim().toLowerCase();
    const filtered = this.presets.filter(p => {
      if (!q) return true;
      return (
        p.name.toLowerCase().includes(q) ||
        (p.category || '').toLowerCase().includes(q) ||
        p.tags.toLowerCase().includes(q)
      );
    });

    if (filtered.length === 0) {
      return `
        <div style="text-align: center; padding: 30px; color: var(--text-dim); background: rgba(0,0,0,0.15); border-radius: var(--radius-sm);">
          No tag presets matched your search criteria.
        </div>
      `;
    }

    return filtered.map(p => {
      const tagList = p.tags.split(',').map(t => t.trim()).filter(Boolean);
      const isEditing = this.editingId === p.id;

      return `
        <div class="glass-card" style="padding: 12px 16px; border-color: ${isEditing ? 'var(--accent-teal)' : 'var(--border-color)'}; background: ${isEditing ? 'rgba(13, 148, 136, 0.08)' : 'rgba(0,0,0,0.18)'};">
          <div style="display: flex; justify-content: space-between; align-items: flex-start; gap: 10px; flex-wrap: wrap; margin-bottom: 8px;">
            <div>
              <div style="display: flex; align-items: center; gap: 8px;">
                <span style="font-weight: 800; font-size: 13px; color: var(--text-main);">
                  ${this.escapeHtml(p.name)}
                </span>
                <span class="badge badge-teal" style="font-size: 10px; padding: 2px 6px;">
                  ${this.escapeHtml(p.category || 'General')}
                </span>
              </div>
              <div style="font-size: 11px; color: var(--text-dim); font-family: var(--font-mono); margin-top: 2px;">
                ${tagList.length} tags • ${p.tags.length}/500 chars
              </div>
            </div>

            <!-- Action buttons -->
            <div style="display: flex; align-items: center; gap: 6px;">
              ${this.onSelectCallback ? `
                <button type="button" class="btn-cyber btn-cyber-primary btn-sm" style="font-size: 11px; padding: 3px 8px;" onclick="TagManagerComponent.selectPreset('${p.id}')">
                  ➕ INSERT
                </button>
              ` : ''}
              <button type="button" class="btn-cyber btn-cyber-outline btn-sm" style="font-size: 11px; padding: 3px 8px;" onclick="TagManagerComponent.editPreset('${p.id}')">
                ✏️ EDIT
              </button>
              <button type="button" class="btn-cyber btn-cyber-outline btn-sm" style="font-size: 11px; padding: 3px 8px;" onclick="TagManagerComponent.copyPreset('${p.id}')" title="Copy to clipboard">
                📋
              </button>
              <button type="button" class="btn-cyber btn-cyber-danger btn-sm" style="font-size: 11px; padding: 3px 8px;" onclick="TagManagerComponent.deletePreset('${p.id}')" title="Delete preset">
                🗑️
              </button>
            </div>
          </div>

          <!-- Tag chips display -->
          <div style="display: flex; gap: 4px; flex-wrap: wrap;">
            ${tagList.slice(0, 10).map(t => `
              <span style="font-size: 10px; padding: 2px 6px; border-radius: 4px; background: rgba(255,255,255,0.06); color: var(--text-muted); font-family: var(--font-mono); border: 1px solid var(--border-subtle);">
                #${this.escapeHtml(t)}
              </span>
            `).join('')}
            ${tagList.length > 10 ? `
              <span style="font-size: 10px; color: var(--text-dim); padding: 2px 4px;">
                +${tagList.length - 10} more
              </span>
            ` : ''}
          </div>
        </div>
      `;
    }).join('');
  },

  wireModalListeners() {
    const tagsInput = document.getElementById('tagMgrTags');
    const counter = document.getElementById('tagMgrCharCount');
    const form = document.getElementById('tagPresetForm');
    const search = document.getElementById('tagMgrSearch');
    const resetBtn = document.getElementById('btnResetTagDefaults');
    const cancelBtn = document.getElementById('btnCancelTagEdit');

    const updateCounter = () => {
      if (!tagsInput || !counter) return;
      const val = tagsInput.value;
      const count = val.split(',').map(s => s.trim()).filter(Boolean).length;
      counter.textContent = `${val.length} / 500 chars (${count} tags)`;
      counter.style.color = val.length > 500 ? '#ef4444' : 'var(--text-dim)';
    };

    if (tagsInput) {
      tagsInput.oninput = updateCounter;
      updateCounter();
    }

    if (search) {
      search.oninput = (e) => {
        this.searchQuery = e.target.value;
        const list = document.getElementById('tagPresetsListContainer');
        if (list) list.innerHTML = this.renderPresetsCardsHtml();
      };
    }

    if (cancelBtn) {
      cancelBtn.onclick = () => {
        this.editingId = null;
        document.getElementById('tagPresetForm').reset();
        document.getElementById('tagMgrFormHeadingText').textContent = 'CREATE NEW TAG PRESET';
        document.getElementById('btnSavePresetText').textContent = 'SAVE PRESET';
        cancelBtn.style.display = 'none';
        updateCounter();
        const list = document.getElementById('tagPresetsListContainer');
        if (list) list.innerHTML = this.renderPresetsCardsHtml();
      };
    }

    if (resetBtn) {
      resetBtn.onclick = async () => {
        if (!confirm('Are you sure you want to restore default curated tag presets? Any custom additions will be reset.')) {
          return;
        }
        try {
          const res = await API.tags.resetPresets();
          this.presets = res.presets || [];
          Toast.show('Default tag presets restored successfully!', 'success');
          this.renderModalContent();
          this.notifyPresetsUpdated();
        } catch (err) {
          Toast.show(`Failed to restore presets: ${err.message}`, 'error');
        }
      };
    }

    if (form) {
      form.onsubmit = async (e) => {
        e.preventDefault();
        const name = document.getElementById('tagMgrName').value.trim();
        const category = document.getElementById('tagMgrCategory').value.trim();
        const tags = document.getElementById('tagMgrTags').value.trim();

        if (!name || !tags) {
          Toast.show('Name and tags are required', 'warning');
          return;
        }

        if (tags.length > 500) {
          Toast.show('Tags cannot exceed 500 characters', 'error');
          return;
        }

        const saveBtn = document.getElementById('btnSaveTagPreset');
        saveBtn.disabled = true;

        try {
          if (this.editingId) {
            const res = await API.tags.updatePreset(this.editingId, { name, category, tags });
            this.presets = res.presets;
            Toast.show(`Preset "${name}" updated successfully!`, 'success');
          } else {
            const res = await API.tags.createPreset({ name, category, tags });
            this.presets = res.presets;
            Toast.show(`Preset "${name}" created successfully!`, 'success');
          }

          this.editingId = null;
          form.reset();
          document.getElementById('tagMgrFormHeadingText').textContent = 'CREATE NEW TAG PRESET';
          document.getElementById('btnSavePresetText').textContent = 'SAVE PRESET';
          cancelBtn.style.display = 'none';
          updateCounter();

          const list = document.getElementById('tagPresetsListContainer');
          if (list) list.innerHTML = this.renderPresetsCardsHtml();
          this.notifyPresetsUpdated();
        } catch (err) {
          Toast.show(`Save failed: ${err.message}`, 'error');
        } finally {
          saveBtn.disabled = false;
        }
      };
    }
  },

  editPreset(id) {
    const preset = this.presets.find(p => p.id === id);
    if (!preset) return;

    this.editingId = id;
    const nameInput = document.getElementById('tagMgrName');
    const catInput = document.getElementById('tagMgrCategory');
    const tagsInput = document.getElementById('tagMgrTags');
    const heading = document.getElementById('tagMgrFormHeadingText');
    const btnText = document.getElementById('btnSavePresetText');
    const cancelBtn = document.getElementById('btnCancelTagEdit');

    if (nameInput) nameInput.value = preset.name;
    if (catInput) catInput.value = preset.category || '';
    if (tagsInput) {
      tagsInput.value = preset.tags;
      tagsInput.dispatchEvent(new Event('input'));
    }
    if (heading) heading.textContent = `EDIT PRESET: ${preset.name.toUpperCase()}`;
    if (btnText) btnText.textContent = 'UPDATE PRESET';
    if (cancelBtn) cancelBtn.style.display = 'inline-block';

    const list = document.getElementById('tagPresetsListContainer');
    if (list) list.innerHTML = this.renderPresetsCardsHtml();

    if (nameInput) {
      nameInput.focus();
      nameInput.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }
  },

  async deletePreset(id) {
    const preset = this.presets.find(p => p.id === id);
    if (!preset) return;

    if (!confirm(`Are you sure you want to delete tag preset "${preset.name}"?`)) {
      return;
    }

    try {
      const res = await API.tags.deletePreset(id);
      this.presets = res.presets;
      Toast.show(`Preset "${preset.name}" deleted`, 'info');
      if (this.editingId === id) {
        this.editingId = null;
        document.getElementById('tagPresetForm')?.reset();
        document.getElementById('btnCancelTagEdit')?.click();
      }
      const list = document.getElementById('tagPresetsListContainer');
      if (list) list.innerHTML = this.renderPresetsCardsHtml();
      this.notifyPresetsUpdated();
    } catch (err) {
      Toast.show(`Failed to delete preset: ${err.message}`, 'error');
    }
  },

  copyPreset(id) {
    const preset = this.presets.find(p => p.id === id);
    if (!preset) return;

    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(preset.tags).then(() => {
        Toast.show(`Tags for "${preset.name}" copied to clipboard!`, 'success', 2000);
      }).catch(() => {
        this.fallbackCopyText(preset.tags);
      });
    } else {
      this.fallbackCopyText(preset.tags);
    }
  },

  fallbackCopyText(text) {
    const ta = document.createElement('textarea');
    ta.value = text;
    document.body.appendChild(ta);
    ta.select();
    try {
      document.execCommand('copy');
      Toast.show('Tags copied to clipboard!', 'success', 2000);
    } catch {
      Toast.show('Unable to auto-copy. Please copy manually.', 'warning');
    }
    document.body.removeChild(ta);
  },

  selectPreset(id) {
    const preset = this.presets.find(p => p.id === id);
    if (!preset) return;

    if (typeof this.onSelectCallback === 'function') {
      this.onSelectCallback(preset);
      window.closeModal('tagManagerModal');
    }
  },

  notifyPresetsUpdated() {
    window.dispatchEvent(new CustomEvent('tags:updated', { detail: { presets: this.presets } }));
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

window.TagManagerComponent = TagManagerComponent;
window.openTagManager = function(onSelect) {
  TagManagerComponent.openModal(onSelect);
};
