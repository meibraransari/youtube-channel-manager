/**
 * Step-by-Step Content Creator Wizard Component
 * Zero-loss state, multi-channel tagging, AI prompt generators, and pre-flight validation
 */
const WizardComponent = {
  currentStep: 1,
  channels: [],
  tagPresets: [],
  settings: null,
  quickTagSearchQuery: '',
  preselectedType: null,
  returnView: 'dashboard',
  _escBound: false,
  formData: {
    channel_id: '',
    content_type: 'short',
    topic: '',
    title: '',
    image_prompt: '',
    video_url: '',
    image_url: '',
    tags: '',
    description: '',
    status: 'pending',
    scheduled_at: null,
    image_file: null,
    video_file: null
  },

  getReturnView() {
    let target = this.returnView;
    if (!target || target === 'wizard') {
      try {
        target = sessionStorage.getItem('yt_wizard_return_view');
      } catch (_) {}
    }
    if (!target || target === 'wizard') target = 'dashboard';
    return target;
  },

  getReturnViewLabel() {
    const v = this.getReturnView();
    switch (v) {
      case 'shorts': return 'Shorts';
      case 'videos': return 'Videos';
      case 'podcasts': return 'Podcasts';
      case 'content': return 'Content Hub';
      case 'subscriptions': return 'Subscriptions';
      case 'channels': return 'Channels';
      case 'tracker': return 'Tracker';
      case 'settings': return 'Settings';
      case 'users': return 'Team';
      case 'audit': return 'Audit Logs';
      case 'dashboard':
      default: return 'Dashboard';
    }
  },

  async cancelWizard() {
    this.saveCurrentStepInputs();
    const hasData = Boolean(
      (this.formData.title && this.formData.title.trim()) ||
      (this.formData.topic && this.formData.topic.trim()) ||
      (this.formData.description && this.formData.description.trim()) ||
      (this.formData.image_prompt && this.formData.image_prompt.trim()) ||
      (this.formData.tags && this.formData.tags.trim()) ||
      (this.formData.video_url && this.formData.video_url.trim()) ||
      (this.formData.image_url && this.formData.image_url.trim()) ||
      this.formData.image_file ||
      this.formData.video_file
    );

    const proceedExit = () => {
      const target = this.getReturnView();
      Toast.show('Content Creator Wizard closed', 'info');
      if (window.App && typeof window.App.navigateTo === 'function') {
        window.App.navigateTo(target);
      } else if (typeof window.navigateTo === 'function') {
        window.navigateTo(target);
      } else {
        window.location.hash = target;
      }
    };

    if (hasData) {
      const draftTitle = this.formData.title ? `"${this.formData.title.trim()}"` : 'Untitled Asset';
      const confirmed = await cyberConfirm({
        title: 'Discard Wizard Draft?',
        subtitle: 'Unsaved creator session in progress',
        message: `You have active unsaved draft metadata in progress. Exiting now will discard this creation session and return you to ${this.getReturnViewLabel()}.`,
        details: `Draft in progress: ${draftTitle} • ${(this.formData.content_type || 'short').toUpperCase()}`,
        confirmText: 'Discard & Exit Wizard',
        cancelText: 'Keep Editing',
        badge: 'UNSAVED DRAFT',
        type: 'danger',
        icon: '🗑️'
      });
      if (confirmed) {
        proceedExit();
      }
    } else {
      proceedExit();
    }
  },

  async initChannels() {
    try {
      const res = await API.channels.list();
      this.channels = res.channels || [];
      if (!this.formData.channel_id) {
        const activeCh = API.getActiveChannelId();
        if (activeCh && activeCh !== 'all') {
          this.formData.channel_id = activeCh;
        } else if (this.channels.length > 0) {
          this.formData.channel_id = this.channels[0].id;
        }
      }
    } catch (err) {
      console.warn('Failed to load channels for wizard:', err.message);
    }
  },

  async initTagPresets() {
    try {
      if (window.TagManagerComponent) {
        this.tagPresets = await window.TagManagerComponent.loadPresets();
      } else {
        const res = await API.tags.getPresets();
        this.tagPresets = res.presets || [];
      }
    } catch (err) {
      console.warn('Failed to load tag presets for wizard:', err.message);
      this.tagPresets = [];
    }
  },

  async initSettings() {
    try {
      const res = await API.settings.get();
      this.settings = res.settings || {};
    } catch (err) {
      console.warn('Failed to load system settings for wizard limits:', err.message);
      this.settings = {};
    }
  },

  getContentLimits() {
    const type = (this.formData.content_type || 'short').toLowerCase();
    const parseNum = (val, fallback) => {
      if (val === undefined || val === null) return fallback;
      if (typeof val === 'string') val = val.replace(/^"|"$/g, '');
      const num = parseInt(val, 10);
      return !isNaN(num) && num > 0 ? num : fallback;
    };

    const maxDesc = parseNum(this.settings?.[`char_limit_desc_${type}`], 5000);
    const maxTags = parseNum(this.settings?.[`char_limit_tags_${type}`], parseNum(this.settings?.max_tags_length, 500));

    return { maxDesc, maxTags };
  },

  filterTagPresets(query = '') {
    if (!this.tagPresets || !Array.isArray(this.tagPresets)) return [];
    const q = (query || '').trim().toLowerCase();
    if (!q) return this.tagPresets;
    return this.tagPresets.filter(p => {
      const nameMatch = (p.name || '').toLowerCase().includes(q);
      const catMatch = (p.category || '').toLowerCase().includes(q);
      const tagsMatch = (p.tags || '').toLowerCase().includes(q);
      return nameMatch || catMatch || tagsMatch;
    });
  },

  renderQuickTagsOptions(query = '') {
    const dropdown = document.getElementById('wizQuickTagsDropdown');
    const clearBtn = document.getElementById('wizClearTagSearchBtn');
    if (clearBtn) clearBtn.style.display = query.trim() ? 'block' : 'none';

    if (!dropdown) return;
    const filtered = this.filterTagPresets(query);

    if (filtered.length === 0) {
      dropdown.innerHTML = `<option value="">⚠️ No presets match "${query.trim()}"</option>`;
      dropdown.disabled = true;
    } else {
      dropdown.disabled = false;
      const countLabel = query.trim() ? ` (${filtered.length} matching "${query.trim()}")` : '';
      dropdown.innerHTML = `
        <option value="">⚡ Select Tag Preset from Registry to Append...${countLabel}</option>
        ${filtered.map(p => `
          <option value="${p.id}" data-tags="${encodeURIComponent(p.tags)}" data-name="${encodeURIComponent(p.name)}">
            📁 [${p.category || 'General'}] ${p.name} (${p.tags.split(',').length} tags • ${p.tags.length} chars)
          </option>
        `).join('')}
      `;
      // If exactly 1 match and search was typed, auto-select it for rapid append
      if (filtered.length === 1 && query.trim()) {
        dropdown.selectedIndex = 1;
      }
    }

    // Also update fast chips to reflect search results
    const chipsContainer = document.getElementById('wizQuickTagChipsContainer');
    if (chipsContainer) {
      chipsContainer.innerHTML = `
        <span style="font-size: 10px; color: var(--text-dim); text-transform: uppercase; font-weight: 700;">Fast Chips:</span>
        ${filtered.slice(0, 8).map(p => `
          <button type="button" class="btn-cyber btn-cyber-outline btn-sm" style="font-size: 11px; padding: 2px 8px;" onclick="WizardComponent.appendTag('${p.tags.replace(/'/g, "\\'")}', '${p.name.replace(/'/g, "\\'")}')">
            + ${p.name}
          </button>
        `).join('')}
        ${filtered.length > 8 ? `
          <button type="button" class="btn-cyber btn-cyber-secondary btn-sm" style="font-size: 10px; padding: 2px 8px;" onclick="WizardComponent.openTagManager()">
            +${filtered.length - 8} more in Tag Manager ↗
          </button>
        ` : ''}
        ${filtered.length === 0 ? `
          <span style="font-size: 11px; color: var(--text-dim); font-style: italic;">No matching presets</span>
        ` : ''}
      `;
    }
  },

  async render(container) {
    this.currentStep = 1;
    this.quickTagSearchQuery = '';
    const initialType = this.preselectedType || 'short';
    this.preselectedType = null;
    this.formData = {
      channel_id: '',
      content_type: initialType,
      topic: '',
      title: '',
      image_prompt: '',
      video_url: '',
      image_url: '',
      tags: '',
      description: '',
      status: 'pending',
      scheduled_at: null
    };

    await Promise.all([
      this.initChannels(),
      this.initTagPresets(),
      this.initSettings()
    ]);

    if (!container) return;

    if (!this._escBound) {
      this._escBound = true;
      window.addEventListener('keydown', (e) => {
        if (e.key === 'Escape' && window.App && window.App.currentView === 'wizard') {
          if (document.querySelector('.modal-overlay.active')) return;
          this.cancelWizard();
        }
      });
    }

    const returnLabel = this.getReturnViewLabel();

    container.innerHTML = `
      <div style="max-width: 860px; margin: 0 auto;">
        <!-- Header with Back & Cancel Buttons -->
        <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 20px; gap: 14px; flex-wrap: wrap;">
          <button type="button" class="btn-action-premium outline-neutral" onclick="WizardComponent.cancelWizard()" title="Return to ${returnLabel}">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <path d="M19 12H5M12 19l-7-7 7-7"/>
            </svg>
            <span>Back to ${returnLabel}</span>
          </button>
          
          <div style="text-align: center; flex: 1; min-width: 220px;">
            <h1 style="font-size: 20px; font-weight: 800; letter-spacing: -0.3px; color: var(--text-main); margin: 0; display: flex; align-items: center; justify-content: center; gap: 8px;">
              <span>🧙</span> CONTENT CREATOR WIZARD
            </h1>
            <p style="color: var(--text-muted); font-size: 12.5px; margin-top: 4px; margin-bottom: 0;">
              Step-by-step pipeline for engineering high-CTR YouTube Shorts, Long Videos, and Podcast episodes
            </p>
          </div>

          <button type="button" class="btn-action-premium danger-subtle" onclick="WizardComponent.cancelWizard()" title="Cancel and close wizard">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <line x1="18" y1="6" x2="6" y2="18"></line>
              <line x1="6" y1="6" x2="18" y2="18"></line>
            </svg>
            <span>Cancel Wizard</span>
          </button>
        </div>

        <!-- Wizard Box -->
        <div class="glass-card" style="padding: 0; overflow: hidden;">
          <!-- Stepper Navigation -->
          <div class="wizard-stepper" id="wizardStepper">
            <div class="wizard-step-node active" id="stepNode1" onclick="WizardComponent.goToStep(1)">
              <div class="step-circle">1</div>
              <div>IDENTIFIER</div>
            </div>
            <div class="wizard-step-node" id="stepNode2" onclick="WizardComponent.goToStep(2)">
              <div class="step-circle">2</div>
              <div>AI PROMPTS</div>
            </div>
            <div class="wizard-step-node" id="stepNode3" onclick="WizardComponent.goToStep(3)">
              <div class="step-circle">3</div>
              <div>TAGS & SEO</div>
            </div>
            <div class="wizard-step-node" id="stepNode4" onclick="WizardComponent.goToStep(4)">
              <div class="step-circle">4</div>
              <div>SCHEDULE</div>
            </div>
            <div class="wizard-step-node" id="stepNode5" onclick="WizardComponent.goToStep(5)">
              <div class="step-circle">5</div>
              <div>LAUNCH</div>
            </div>
          </div>

          <!-- Step Content Body -->
          <div id="wizardStepBody" style="padding: 28px;">
            <!-- Dynamically rendered -->
          </div>

          <!-- Footer Buttons -->
          <div class="modal-footer" style="padding: 16px 24px; background: rgba(0,0,0,0.18); display: flex; align-items: center; justify-content: space-between; border-top: 1px solid var(--border-subtle); gap: 12px; flex-wrap: wrap;">
            <div style="display: flex; align-items: center; gap: 10px;">
              <button type="button" class="btn-action-premium danger-subtle" id="wizardCancelBtn" onclick="WizardComponent.cancelWizard()" title="Cancel and exit wizard">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                  <line x1="18" y1="6" x2="6" y2="18"></line>
                  <line x1="6" y1="6" x2="18" y2="18"></line>
                </svg>
                <span>Cancel Wizard</span>
              </button>
              <button type="button" class="btn-action-premium outline-neutral" id="wizardPrevBtn" style="display: none;" title="Go to previous step">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                  <polyline points="15 18 9 12 15 6"></polyline>
                </svg>
                <span>Previous Step</span>
              </button>
            </div>
            
            <div style="display: flex; align-items: center; gap: 10px;">
              <button type="button" class="btn-action-premium primary-teal" id="wizardNextBtn" title="Continue to next step">
                <span>Next Step</span>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                  <polyline points="9 18 15 12 9 6"></polyline>
                </svg>
              </button>
            </div>
          </div>
        </div>
      </div>
    `;

    const prevBtn = container.querySelector('#wizardPrevBtn');
    const nextBtn = container.querySelector('#wizardNextBtn');
    if (prevBtn) prevBtn.onclick = () => this.prevStep();
    if (nextBtn) nextBtn.onclick = () => this.nextStep();

    this.renderCurrentStep();
  },

  renderCurrentStep() {
    const body = document.getElementById('wizardStepBody');
    const prevBtn = document.getElementById('wizardPrevBtn');
    const nextBtn = document.getElementById('wizardNextBtn');
    const cancelBtn = document.getElementById('wizardCancelBtn');

    if (!body) return;

    // Update stepper node status
    for (let i = 1; i <= 5; i++) {
      const node = document.getElementById(`stepNode${i}`);
      if (!node) continue;
      node.classList.remove('active', 'completed');
      if (i === this.currentStep) node.classList.add('active');
      else if (i < this.currentStep) node.classList.add('completed');
    }

    if (cancelBtn) {
      cancelBtn.style.display = 'inline-flex';
    }

    if (prevBtn) {
      prevBtn.style.display = this.currentStep > 1 ? 'inline-flex' : 'none';
    }

    if (nextBtn) {
      if (this.currentStep === 5) {
        nextBtn.innerHTML = `
          <span>Deploy Directive</span>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <line x1="22" y1="2" x2="11" y2="13"></line>
            <polygon points="22 2 15 22 11 13 2 9 22 2"></polygon>
          </svg>
        `;
        nextBtn.className = 'btn-action-premium primary-teal';
      } else {
        nextBtn.innerHTML = `
          <span>Next Step</span>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <polyline points="9 18 15 12 9 6"></polyline>
          </svg>
        `;
        nextBtn.className = 'btn-action-premium primary-teal';
      }
    }

    if (this.currentStep === 1) {
      body.innerHTML = `
        <h3 style="font-size: 15px; font-weight: 700; margin-bottom: 16px; color: var(--accent-teal);">
          STEP 1: SELECT CHANNEL, FORMAT & TOPIC
        </h3>

        <!-- Target Channel Selector -->
        <div style="margin-bottom: 18px;">
          <label style="font-size: 11px; font-weight: 700; color: var(--text-dim); text-transform: uppercase;">TARGET YOUTUBE CHANNEL</label>
          <select id="wizChannelSelect" class="cyber-input" style="margin-top: 6px;">
            ${this.channels.map(c => `
              <option value="${c.id}" ${this.formData.channel_id === c.id ? 'selected' : ''}>
                📺 ${c.name} (${c.handle || '@channel'})
              </option>
            `).join('')}
          </select>
        </div>

        <!-- Format Cards -->
        <label style="font-size: 11px; font-weight: 700; color: var(--text-dim); text-transform: uppercase;">SELECT CONTENT FORMAT</label>
        <div style="display: grid; grid-template-columns: repeat(3, 1fr); gap: 14px; margin-top: 8px; margin-bottom: 20px;">
          <!-- Short / Reel -->
          <div class="glass-card" style="padding: 16px; cursor: pointer; text-align: center; border-color: ${this.formData.content_type === 'short' ? 'var(--accent-teal)' : 'var(--border-subtle)'}; background: ${this.formData.content_type === 'short' ? 'rgba(13, 148, 136, 0.15)' : 'var(--bg-card)'};" onclick="WizardComponent.selectType('short')">
            <div style="font-size: 26px; margin-bottom: 6px;">⚡</div>
            <div style="font-weight: 700; font-size: 13px;">YouTube Short / Reel</div>
            <div style="font-size: 11px; color: var(--text-dim); margin-top: 2px;">9:16 Vertical (1080x1920)</div>
          </div>

          <!-- Long Video -->
          <div class="glass-card" style="padding: 16px; cursor: pointer; text-align: center; border-color: ${this.formData.content_type === 'video' ? 'var(--accent-teal)' : 'var(--border-subtle)'}; background: ${this.formData.content_type === 'video' ? 'rgba(13, 148, 136, 0.15)' : 'var(--bg-card)'};" onclick="WizardComponent.selectType('video')">
            <div style="font-size: 26px; margin-bottom: 6px;">📹</div>
            <div style="font-weight: 700; font-size: 13px;">Long-Form Video</div>
            <div style="font-size: 11px; color: var(--text-dim); margin-top: 2px;">16:9 Landscape (1920x1080)</div>
          </div>

          <!-- Podcast -->
          <div class="glass-card" style="padding: 16px; cursor: pointer; text-align: center; border-color: ${this.formData.content_type === 'podcast' ? 'var(--accent-teal)' : 'var(--border-subtle)'}; background: ${this.formData.content_type === 'podcast' ? 'rgba(13, 148, 136, 0.15)' : 'var(--bg-card)'};" onclick="WizardComponent.selectType('podcast')">
            <div style="font-size: 26px; margin-bottom: 6px;">🎙️</div>
            <div style="font-weight: 700; font-size: 13px;">Deep Dive Podcast</div>
            <div style="font-size: 11px; color: var(--text-dim); margin-top: 2px;">Multi-Host / Audio Discussion</div>
          </div>
        </div>

        <!-- Topic -->
        <div style="margin-bottom: 16px;">
          <label style="font-size: 11px; font-weight: 700; color: var(--text-dim); text-transform: uppercase;">Topic / Domain Area</label>
          <input type="text" id="wizTopic" class="cyber-input" placeholder="e.g. Production PostgreSQL 18 Tuning or Microservices Scaling" value="${this.formData.topic}" style="margin-top: 6px;" />
        </div>

        <!-- Title -->
        <div>
          <label style="font-size: 11px; font-weight: 700; color: var(--text-dim); text-transform: uppercase;">Public Video Title *</label>
          <input type="text" id="wizTitle" class="cyber-input" placeholder="e.g. 5 PostgreSQL 18 Features You Must Know Before Upgrading" value="${this.formData.title}" required style="margin-top: 6px;" />
        </div>
      `;
    } else if (this.currentStep === 2) {
      body.innerHTML = `
        <h3 style="font-size: 15px; font-weight: 700; margin-bottom: 16px; color: var(--accent-teal);">
          STEP 2: THUMBNAIL DESIGN, ASSET UPLOAD & AI PROMPTS
        </h3>

        <!-- Prompt Suggestions helper -->
        <div style="margin-bottom: 14px; display: flex; gap: 8px; flex-wrap: wrap;">
          <button type="button" class="btn-cyber btn-cyber-outline btn-sm" onclick="WizardComponent.suggestPrompt('tech')">
            ✨ Generate Tech Architecture Prompt
          </button>
          <button type="button" class="btn-cyber btn-cyber-outline btn-sm" onclick="WizardComponent.suggestPrompt('futuristic')">
            🌌 Futuristic Cyber Glow Style
          </button>
          <button type="button" class="btn-cyber btn-cyber-outline btn-sm" onclick="WizardComponent.suggestPrompt('minimal')">
            📐 Minimal High-Contrast Style
          </button>
        </div>

        <!-- Image Prompt -->
        <div style="margin-bottom: 16px;">
          <label style="font-size: 11px; font-weight: 700; color: var(--text-dim); text-transform: uppercase;">AI Image Generation Prompt (Midjourney / DALL-E / Flux)</label>
          <textarea id="wizImagePrompt" class="cyber-input" rows="4" style="margin-top: 6px; resize: vertical;" placeholder="High contrast 3D illustration of cloud servers, vibrant glowing accents, bold typography space, aspect ratio ${this.formData.content_type === 'short' ? '9:16' : '16:9'}...">${this.formData.image_prompt}</textarea>
        </div>

        <!-- Optional Media Asset File Uploads -->
        <div class="glass-card" style="padding: 16px; margin-bottom: 16px; border-color: var(--accent-teal); background: rgba(13, 148, 136, 0.05);">
          <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 10px; flex-wrap: wrap; gap: 8px;">
            <div style="display: flex; align-items: center; gap: 8px;">
              <span style="font-size: 16px;">📁</span>
              <span style="font-size: 12px; font-weight: 800; color: var(--text-main); text-transform: uppercase;">LOCAL MEDIA FILE UPLOADS (OPTIONAL)</span>
            </div>
            <span class="badge badge-teal" style="font-size: 10px;">STORAGE: ./media</span>
          </div>
          <p style="font-size: 11px; color: var(--text-muted); margin-bottom: 12px;">
            Optionally attach an image thumbnail (.png) and video file (.mp4). Uploads are stored in <code>./media</code> and renamed to <code>[media_uuid].[ext]</code>.
          </p>

          <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 14px;">
            <!-- Thumbnail Image Upload -->
            <div>
              <label style="font-size: 11px; font-weight: 700; color: var(--text-dim); text-transform: uppercase;">Upload Thumbnail Image</label>
              <input type="file" id="wizImageFileInput" class="cyber-input" accept="image/*,.png,.jpg,.jpeg,.webp" style="margin-top: 6px; padding: 6px;" />
              <div id="wizImagePreviewBox" style="margin-top: 8px; display: ${this.formData.image_file ? 'flex' : 'none'}; align-items: center; gap: 8px; background: rgba(0,0,0,0.3); padding: 6px 10px; border-radius: var(--radius-sm);">
                <span>🖼️</span>
                <span id="wizImagePreviewText" style="font-size: 11px; font-family: var(--font-mono); color: var(--accent-teal); flex: 1; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">
                  ${this.formData.image_file ? this.formData.image_file.name : ''}
                </span>
                <button type="button" class="btn-cyber btn-cyber-danger btn-sm" id="wizClearImageBtn" style="padding: 1px 6px; font-size: 10px;">✕</button>
              </div>
            </div>

            <!-- Video Asset Upload -->
            <div>
              <label style="font-size: 11px; font-weight: 700; color: var(--text-dim); text-transform: uppercase;">Upload Video Asset</label>
              <input type="file" id="wizVideoFileInput" class="cyber-input" accept="video/*,.mp4,.mov,.mkv" style="margin-top: 6px; padding: 6px;" />
              <div id="wizVideoPreviewBox" style="margin-top: 8px; display: ${this.formData.video_file ? 'flex' : 'none'}; align-items: center; gap: 8px; background: rgba(0,0,0,0.3); padding: 6px 10px; border-radius: var(--radius-sm);">
                <span>🎥</span>
                <span id="wizVideoPreviewText" style="font-size: 11px; font-family: var(--font-mono); color: var(--accent-emerald); flex: 1; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">
                  ${this.formData.video_file ? `${this.formData.video_file.name} (${(this.formData.video_file.size / (1024*1024)).toFixed(1)} MB)` : ''}
                </span>
                <button type="button" class="btn-cyber btn-cyber-danger btn-sm" id="wizClearVideoBtn" style="padding: 1px 6px; font-size: 10px;">✕</button>
              </div>
            </div>
          </div>
        </div>

        <!-- Image URL -->
        <div style="margin-bottom: 16px;">
          <label style="font-size: 11px; font-weight: 700; color: var(--text-dim); text-transform: uppercase;">External Thumbnail Image URL (Optional)</label>
          <input type="url" id="wizImageUrl" class="cyber-input" placeholder="https://..." value="${this.formData.image_url}" style="margin-top: 6px;" />
        </div>

        <!-- Video URL -->
        <div>
          <label style="font-size: 11px; font-weight: 700; color: var(--text-dim); text-transform: uppercase;">YouTube Video / Reel URL (Optional)</label>
          <input type="url" id="wizVideoUrl" class="cyber-input" placeholder="https://youtube.com/shorts/... or https://youtu.be/..." value="${this.formData.video_url}" style="margin-top: 6px;" />
        </div>
      `;

      const imgInput = document.getElementById('wizImageFileInput');
      const vidInput = document.getElementById('wizVideoFileInput');
      const imgPreviewBox = document.getElementById('wizImagePreviewBox');
      const imgPreviewText = document.getElementById('wizImagePreviewText');
      const vidPreviewBox = document.getElementById('wizVideoPreviewBox');
      const vidPreviewText = document.getElementById('wizVideoPreviewText');
      const clearImgBtn = document.getElementById('wizClearImageBtn');
      const clearVidBtn = document.getElementById('wizClearVideoBtn');

      if (imgInput) {
        imgInput.onchange = (e) => {
          if (e.target.files && e.target.files[0]) {
            this.formData.image_file = e.target.files[0];
            imgPreviewText.textContent = this.formData.image_file.name;
            imgPreviewBox.style.display = 'flex';
          }
        };
      }
      if (clearImgBtn) {
        clearImgBtn.onclick = () => {
          this.formData.image_file = null;
          if (imgInput) imgInput.value = '';
          imgPreviewBox.style.display = 'none';
        };
      }

      if (vidInput) {
        vidInput.onchange = (e) => {
          if (e.target.files && e.target.files[0]) {
            this.formData.video_file = e.target.files[0];
            vidPreviewText.textContent = `${this.formData.video_file.name} (${(this.formData.video_file.size / (1024*1024)).toFixed(1)} MB)`;
            vidPreviewBox.style.display = 'flex';
          }
        };
      }
      if (clearVidBtn) {
        clearVidBtn.onclick = () => {
          this.formData.video_file = null;
          if (vidInput) vidInput.value = '';
          vidPreviewBox.style.display = 'none';
        };
      }
    } else if (this.currentStep === 3) {
      const { maxDesc, maxTags } = this.getContentLimits();
      const descLen = (this.formData.description || '').length;
      const tagsLen = (this.formData.tags || '').length;

      body.innerHTML = `
        <h3 style="font-size: 15px; font-weight: 700; margin-bottom: 16px; color: var(--accent-teal); display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 8px;">
          <span>STEP 3: DESCRIPTION, TAGS & SEO REGISTRY</span>
          <span class="badge badge-teal" style="font-size: 10px; text-transform: uppercase;">FORMAT: ${(this.formData.content_type || 'short').toUpperCase()} (DESC: ${maxDesc} • TAGS: ${maxTags})</span>
        </h3>

        <!-- Description Field (Card 1: First Position with Real-Time Character Count) -->
        <div style="margin-bottom: 18px;">
          <div style="display: flex; justify-content: space-between; align-items: center;">
            <label style="font-size: 11px; font-weight: 700; color: var(--text-dim); text-transform: uppercase;">Comprehensive Description & Links</label>
            <span id="wizDescCounter" style="font-size: 11px; font-family: var(--font-mono); color: ${descLen > maxDesc ? '#ef4444' : 'var(--text-dim)'}; font-weight: 600;">
              ${descLen} / ${maxDesc} max
            </span>
          </div>
          <textarea id="wizDescription" class="cyber-input" rows="8" style="margin-top: 6px; resize: vertical; line-height: 1.5;" placeholder="Comprehensive summary, GitHub repo links, step-by-step timestamps, connect links...">${this.formData.description}</textarea>
          <span style="font-size: 10px; color: var(--text-dim); margin-top: 3px; display: block;">Dynamic format constraint: max ${maxDesc} characters for ${(this.formData.content_type || 'short').toUpperCase()}.</span>
        </div>

        <!-- Tags Field (Card 2: Below Description with Character Count) -->
        <div style="margin-bottom: 16px;">
          <div style="display: flex; justify-content: space-between; align-items: center;">
            <label style="font-size: 11px; font-weight: 700; color: var(--text-dim); text-transform: uppercase;">Tags (Comma-Separated) *</label>
            <span id="wizTagsCounter" style="font-size: 11px; font-family: var(--font-mono); color: ${tagsLen > maxTags ? '#ef4444' : 'var(--text-dim)'}; font-weight: 600;">
              ${tagsLen} / ${maxTags} max
            </span>
          </div>
          <textarea id="wizTags" class="cyber-input" rows="3" style="margin-top: 6px; resize: vertical;" placeholder="cloud, postgresql, nodejs, devops, architecture, engineering">${this.formData.tags}</textarea>
        </div>

        <!-- Quick Tags & Tag Manager Section (Card 3: Searchable Registry) -->
        <div class="glass-card" style="padding: 14px 16px; margin-bottom: 18px; border-color: var(--accent-teal); background: rgba(13, 148, 136, 0.05);">
          <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 10px; flex-wrap: wrap; gap: 8px;">
            <div style="display: flex; align-items: center; gap: 6px;">
              <span style="font-size: 14px;">⚡</span>
              <span style="font-size: 11px; font-weight: 800; color: var(--text-main); text-transform: uppercase; letter-spacing: 0.5px;">Quick Tags & Preset Registry:</span>
            </div>
            <button type="button" class="btn-cyber btn-cyber-outline btn-sm" id="wizOpenTagManagerBtn" style="padding: 3px 10px; font-size: 11px; display: inline-flex; align-items: center; gap: 6px;">
              <span>🏷️</span>
              <span>MANAGE TAGS</span>
            </button>
          </div>

          <!-- Keyword Search Filter Bar -->
          <div style="margin-bottom: 10px;">
            <div style="position: relative; display: flex; align-items: center;">
              <span style="position: absolute; left: 10px; color: var(--accent-teal); font-size: 12px; pointer-events: none;">🔍</span>
              <input 
                type="text" 
                id="wizQuickTagsSearch" 
                class="cyber-input" 
                placeholder="Search presets by title, category, or tag keyword (e.g. postgres, k8s, devops)..." 
                value="${this.quickTagSearchQuery || ''}" 
                style="padding-left: 30px; padding-right: 28px; font-size: 11.5px;"
              />
              <button 
                type="button" 
                id="wizClearTagSearchBtn" 
                style="position: absolute; right: 8px; background: none; border: none; color: var(--text-dim); cursor: pointer; display: ${this.quickTagSearchQuery ? 'block' : 'none'}; font-size: 12px; padding: 2px 6px;"
                title="Clear Search"
              >✕</button>
            </div>
          </div>

          <!-- Dropdown Selector + Insert Button -->
          <div style="display: flex; gap: 8px; align-items: center; margin-bottom: 10px; flex-wrap: wrap;">
            <select id="wizQuickTagsDropdown" class="cyber-input" style="flex: 1; min-width: 240px; font-size: 12px; font-weight: 600;">
            </select>
            <button type="button" class="btn-cyber btn-cyber-primary btn-sm" id="wizAppendDropdownTagBtn" style="white-space: nowrap; font-weight: 700;">
              <span>+</span>
              <span>APPEND TAGS</span>
            </button>
          </div>

          <!-- Quick Pill Chips for 1-Click Access -->
          <div style="display: flex; gap: 6px; flex-wrap: wrap; align-items: center;" id="wizQuickTagChipsContainer">
          </div>
        </div>
      `;

      const descInput = document.getElementById('wizDescription');
      const descCounter = document.getElementById('wizDescCounter');
      if (descInput && descCounter) {
        descInput.oninput = () => {
          const len = descInput.value.length;
          descCounter.textContent = `${len} / ${maxDesc} max`;
          descCounter.style.color = len > maxDesc ? '#ef4444' : 'var(--text-dim)';
        };
      }

      const tagsInput = document.getElementById('wizTags');
      const tagsCounter = document.getElementById('wizTagsCounter');
      if (tagsInput && tagsCounter) {
        tagsInput.oninput = () => {
          const len = tagsInput.value.length;
          tagsCounter.textContent = `${len} / ${maxTags} max`;
          tagsCounter.style.color = len > maxTags ? '#ef4444' : 'var(--text-dim)';
        };
      }

      // Populate Quick Tags options & chips based on current search query
      this.renderQuickTagsOptions(this.quickTagSearchQuery || '');

      // Quick Tags Search, Dropdown & Manager Event Handlers
      const searchInput = document.getElementById('wizQuickTagsSearch');
      const clearSearchBtn = document.getElementById('wizClearTagSearchBtn');
      const tagsDropdown = document.getElementById('wizQuickTagsDropdown');
      const appendDropdownBtn = document.getElementById('wizAppendDropdownTagBtn');
      const openTagMgrBtn = document.getElementById('wizOpenTagManagerBtn');

      if (searchInput) {
        searchInput.oninput = (e) => {
          this.quickTagSearchQuery = e.target.value;
          this.renderQuickTagsOptions(this.quickTagSearchQuery);
        };
        searchInput.onkeydown = (e) => {
          if (e.key === 'Enter') {
            e.preventDefault();
            if (appendDropdownBtn) appendDropdownBtn.click();
          }
        };
      }

      if (clearSearchBtn) {
        clearSearchBtn.onclick = () => {
          this.quickTagSearchQuery = '';
          if (searchInput) {
            searchInput.value = '';
            searchInput.focus();
          }
          this.renderQuickTagsOptions('');
        };
      }

      if (tagsDropdown) {
        tagsDropdown.onchange = (e) => {
          const selectedOption = e.target.options[e.target.selectedIndex];
          if (!selectedOption || !selectedOption.value) return;
          const tags = decodeURIComponent(selectedOption.getAttribute('data-tags') || '');
          const name = decodeURIComponent(selectedOption.getAttribute('data-name') || '');
          if (tags) {
            WizardComponent.appendTag(tags, name);
            tagsDropdown.value = '';
          }
        };
      }

      if (appendDropdownBtn) {
        appendDropdownBtn.onclick = () => {
          if (!tagsDropdown || !tagsDropdown.value) {
            Toast.show('Please select a tag preset from the registry first.', 'info');
            tagsDropdown?.focus();
            return;
          }
          const selectedOption = tagsDropdown.options[tagsDropdown.selectedIndex];
          const tags = decodeURIComponent(selectedOption.getAttribute('data-tags') || '');
          const name = decodeURIComponent(selectedOption.getAttribute('data-name') || '');
          if (tags) {
            WizardComponent.appendTag(tags, name);
            tagsDropdown.value = '';
          }
        };
      }

      if (openTagMgrBtn) {
        openTagMgrBtn.onclick = () => {
          WizardComponent.openTagManager();
        };
      }
    } else if (this.currentStep === 4) {
      body.innerHTML = `
        <h3 style="font-size: 15px; font-weight: 700; margin-bottom: 16px; color: var(--accent-teal);">
          STEP 4: STATUS LIFECYCLE & SCHEDULING
        </h3>

        <!-- Status selector -->
        <div style="margin-bottom: 20px;">
          <label style="font-size: 11px; font-weight: 700; color: var(--text-dim); text-transform: uppercase;">LIFECYCLE STATUS</label>
          <select id="wizStatus" class="cyber-input" style="margin-top: 6px;">
            <option value="pending" ${this.formData.status === 'pending' ? 'selected' : ''}>⏳ Pending (Ready for recording / review)</option>
            <option value="uploaded" ${this.formData.status === 'uploaded' ? 'selected' : ''}>✅ Uploaded (Live on YouTube channel)</option>
            <option value="draft" ${this.formData.status === 'draft' ? 'selected' : ''}>📝 Draft (Work In Progress)</option>
            <option value="scheduled" ${this.formData.status === 'scheduled' ? 'selected' : ''}>🗓️ Scheduled for Release</option>
          </select>
        </div>

        <!-- Custom Datepicker Box -->
        <div class="glass-card" style="padding: 20px;">
          <div style="font-weight: 700; font-size: 14px; margin-bottom: 6px;">
            🗓️ SCHEDULE TIME COORDINATES
          </div>
          <p style="font-size: 12px; color: var(--text-muted); margin-bottom: 14px;">
            Select exact publication coordinates for release planning.
          </p>
          <div style="display: flex; align-items: center; gap: 12px; flex-wrap: wrap;">
            <button type="button" class="btn-cyber btn-cyber-secondary" onclick="WizardComponent.openDatePicker()">
              <span>🗓️</span> OPEN PRECISION CALENDAR
            </button>
            <div id="wizScheduleDisplay" style="font-family: var(--font-mono); font-size: 13px; color: var(--accent-teal);">
              ${this.formData.scheduled_at ? new Date(this.formData.scheduled_at).toLocaleString() : 'Not Scheduled (Immediate / As-Needed)'}
            </div>
          </div>
        </div>
      `;
    } else if (this.currentStep === 5) {
      // Step 5: Pre-Flight Review
      const targetChannel = this.channels.find(c => c.id === this.formData.channel_id);
      const { maxDesc, maxTags } = this.getContentLimits();
      body.innerHTML = `
        <h3 style="font-size: 15px; font-weight: 700; margin-bottom: 16px; color: var(--accent-teal);">
          STEP 5: PRE-FLIGHT VERIFICATION
        </h3>

        <div class="glass-card" style="padding: 22px; border-color: var(--accent-teal);">
          <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 14px; flex-wrap: wrap; gap: 10px;">
            <div style="display: flex; gap: 6px; align-items: center;">
              <span class="badge ${this.formData.content_type === 'short' ? 'badge-violet' : 'badge-cyan'}">
                ${this.formData.content_type.toUpperCase()}
              </span>
              <span class="badge badge-emerald">
                STATUS: ${this.formData.status.toUpperCase()}
              </span>
              ${targetChannel ? `<span class="badge badge-teal">CHANNEL: ${targetChannel.name}</span>` : ''}
            </div>
            <div style="font-size: 11px; font-family: var(--font-mono); color: var(--text-dim);">
              READY FOR POSTGRESQL 18 COMMITS
            </div>
          </div>

          <h2 style="font-size: 18px; font-weight: 800; color: var(--text-main); margin-bottom: 6px;">
            ${this.formData.title}
          </h2>
          ${this.formData.topic ? `<div style="font-size: 13px; color: var(--accent-teal); margin-bottom: 10px;">📌 ${this.formData.topic}</div>` : ''}

          <div style="margin-top: 14px; padding-top: 14px; border-top: 1px solid var(--border-subtle); display: grid; grid-template-columns: 1fr 1fr; gap: 14px; font-size: 12px;">
            <div>
              <span style="color: var(--text-dim); font-weight: 700;">VIDEO LINK:</span>
              <div style="color: var(--text-muted); word-break: break-all;">${this.formData.video_url || 'None specified'}</div>
            </div>
            <div>
              <span style="color: var(--text-dim); font-weight: 700;">SCHEDULE:</span>
              <div style="color: var(--accent-emerald);">${this.formData.scheduled_at ? new Date(this.formData.scheduled_at).toLocaleString() : 'Immediate'}</div>
            </div>
          </div>

          ${(this.formData.image_file || this.formData.video_file) ? `
            <div style="margin-top: 12px; padding: 10px; background: rgba(13, 148, 136, 0.08); border-radius: var(--radius-sm); border: 1px solid rgba(13, 148, 136, 0.2); display: grid; grid-template-columns: 1fr 1fr; gap: 12px; font-size: 12px;">
              <div>
                <span style="color: var(--text-dim); font-weight: 700;">ATTACHED IMAGE:</span>
                <div style="color: var(--accent-teal); font-family: var(--font-mono); font-size: 11px; margin-top: 2px;">
                  ${this.formData.image_file ? `🖼️ ${this.formData.image_file.name} (${(this.formData.image_file.size / 1024).toFixed(1)} KB)` : 'None (Using Prompt/URL)'}
                </div>
              </div>
              <div>
                <span style="color: var(--text-dim); font-weight: 700;">ATTACHED VIDEO:</span>
                <div style="color: var(--accent-emerald); font-family: var(--font-mono); font-size: 11px; margin-top: 2px;">
                  ${this.formData.video_file ? `🎥 ${this.formData.video_file.name} (${(this.formData.video_file.size / (1024 * 1024)).toFixed(2)} MB)` : 'None (External/Draft)'}
                </div>
              </div>
            </div>
          ` : ''}

          ${this.formData.description ? `
            <div style="margin-top: 12px;">
              <span style="color: var(--text-dim); font-weight: 700; font-size: 12px;">DESCRIPTION (${this.formData.description.length} / ${maxDesc} chars):</span>
              <div style="font-size: 11px; color: var(--text-muted); background: rgba(0,0,0,0.2); padding: 8px 12px; border-radius: 6px; margin-top: 3px; max-height: 120px; overflow-y: auto; white-space: pre-wrap; word-break: break-word;">${this.formData.description}</div>
            </div>
          ` : ''}

          ${this.formData.tags ? `
            <div style="margin-top: 12px;">
              <span style="color: var(--text-dim); font-weight: 700; font-size: 12px;">TAGS (${this.formData.tags.length} / ${maxTags} chars):</span>
              <div style="font-size: 11px; color: var(--text-muted); font-family: var(--font-mono); margin-top: 3px;">
                ${this.formData.tags}
              </div>
            </div>
          ` : ''}

          ${this.formData.image_prompt ? `
            <div style="margin-top: 12px;">
              <span style="color: var(--text-dim); font-weight: 700; font-size: 12px;">AI IMAGE PROMPT:</span>
              <div style="font-size: 11px; color: var(--text-muted); background: rgba(0,0,0,0.2); padding: 8px; border-radius: 6px; margin-top: 3px;">
                ${this.formData.image_prompt}
              </div>
            </div>
          ` : ''}
        </div>
      `;
    }
  },

  selectType(type) {
    this.saveCurrentStepInputs();
    this.formData.content_type = type;
    this.renderCurrentStep();
  },

  saveCurrentStepInputs() {
    if (this.currentStep === 1) {
      const ch = document.getElementById('wizChannelSelect');
      const topic = document.getElementById('wizTopic');
      const title = document.getElementById('wizTitle');
      if (ch) this.formData.channel_id = ch.value;
      if (topic) this.formData.topic = topic.value;
      if (title) this.formData.title = title.value;
    } else if (this.currentStep === 2) {
      const p = document.getElementById('wizImagePrompt');
      const img = document.getElementById('wizImageUrl');
      const vid = document.getElementById('wizVideoUrl');
      if (p) this.formData.image_prompt = p.value;
      if (img) this.formData.image_url = img.value;
      if (vid) this.formData.video_url = vid.value;
    } else if (this.currentStep === 3) {
      const t = document.getElementById('wizTags');
      const d = document.getElementById('wizDescription');
      if (t) this.formData.tags = t.value;
      if (d) this.formData.description = d.value;
    } else if (this.currentStep === 4) {
      const s = document.getElementById('wizStatus');
      if (s) this.formData.status = s.value;
    }
  },

  goToStep(stepNumber) {
    this.saveCurrentStepInputs();
    if (stepNumber > 1 && (!this.formData.title || !this.formData.title.trim())) {
      Toast.show('Please enter a Title before jumping to other steps', 'warning');
      return;
    }
    this.currentStep = stepNumber;
    this.renderCurrentStep();
  },

  nextStep() {
    this.saveCurrentStepInputs();

    if (this.currentStep === 1) {
      if (!this.formData.title || !this.formData.title.trim()) {
        Toast.show('Title is required to proceed', 'warning');
        return;
      }
    }

    if (this.currentStep === 3) {
      const { maxDesc, maxTags } = this.getContentLimits();
      if (this.formData.tags && this.formData.tags.length > maxTags) {
        Toast.show(`Tags exceed ${maxTags} characters limit (${this.formData.tags.length}/${maxTags}). Please shorten tags before proceeding.`, 'warning');
        return;
      }
      if (this.formData.description && this.formData.description.length > maxDesc) {
        Toast.show(`Description exceeds ${maxDesc} characters limit (${this.formData.description.length}/${maxDesc}). Please shorten description before proceeding.`, 'warning');
        return;
      }
    }

    if (this.currentStep === 5) {
      this.submitWizard();
      return;
    }

    this.currentStep++;
    this.renderCurrentStep();
  },

  prevStep() {
    this.saveCurrentStepInputs();
    if (this.currentStep > 1) {
      this.currentStep--;
      this.renderCurrentStep();
    }
  },

  suggestPrompt(style) {
    this.saveCurrentStepInputs();
    const isShort = this.formData.content_type === 'short';
    const aspect = isShort ? '9:16, 1080x1920' : '16:9, 1920x1080';
    const topic = this.formData.topic || this.formData.title || 'Cloud Infrastructure';

    let prompt = '';
    if (style === 'futuristic') {
      prompt = `Futuristic high-tech visual for "${topic}", glowing cyan and violet server racks, holographic user interface panels, cloud icons, cinematic lighting, ultra-detailed, aspect ratio ${aspect}`;
    } else if (style === 'minimal') {
      prompt = `Clean minimalist graphic illustration for "${topic}", modern SaaS design aesthetic, high contrast bold typography space, elegant dark palette, aspect ratio ${aspect}`;
    } else {
      prompt = `Dramatic tech architecture visual for "${topic}", clean cloud infrastructure topology, distributed systems diagram, modern dark aesthetic, aspect ratio ${aspect}`;
    }

    this.formData.image_prompt = prompt;
    const pElem = document.getElementById('wizImagePrompt');
    if (pElem) pElem.value = prompt;
    Toast.show('AI prompt suggestion applied', 'info', 1500);
  },

  appendTag(tagStr, presetName = '') {
    const tElem = document.getElementById('wizTags');
    const currentVal = (tElem ? tElem.value : this.formData.tags).trim();

    // Split existing tags and new incoming tags
    const currentTags = currentVal ? currentVal.split(',').map(s => s.trim()).filter(Boolean) : [];
    const newTags = tagStr ? tagStr.split(',').map(s => s.trim()).filter(Boolean) : [];

    // Deduplicate (case-insensitive)
    const existingLower = new Set(currentTags.map(s => s.toLowerCase()));
    const toAdd = [];
    for (const tag of newTags) {
      if (!existingLower.has(tag.toLowerCase())) {
        toAdd.push(tag);
        existingLower.add(tag.toLowerCase());
      }
    }

    if (toAdd.length === 0 && newTags.length > 0) {
      Toast.show(`All tags from "${presetName || 'preset'}" are already in your list!`, 'info', 2000);
      return;
    }

    const mergedList = [...currentTags, ...toAdd];
    let updated = mergedList.join(', ');

    // Enforce dynamic limit
    const { maxTags } = this.getContentLimits();
    if (updated.length > maxTags) {
      Toast.show(`Warning: Tags exceed ${maxTags} characters limit (${updated.length}/${maxTags}). Please trim tags before submitting.`, 'warning', 3500);
    } else {
      Toast.show(`Added ${toAdd.length} tag${toAdd.length === 1 ? '' : 's'}${presetName ? ` from "${presetName}"` : ''} (${updated.length}/${maxTags} chars)`, 'success', 2500);
    }

    if (tElem) tElem.value = updated;
    this.formData.tags = updated;
    const counter = document.getElementById('wizTagsCounter');
    if (counter) {
      counter.textContent = `${updated.length} / ${maxTags} max`;
      counter.style.color = updated.length > maxTags ? '#ef4444' : 'var(--text-dim)';
    }
  },

  openTagManager() {
    this.saveCurrentStepInputs();
    if (window.TagManagerComponent) {
      TagManagerComponent.openModal((preset) => {
        this.appendTag(preset.tags, preset.name);
      });
    } else {
      Toast.show('Opening Tag Manager...', 'info');
    }
  },

  refreshQuickTagsUI() {
    this.renderQuickTagsOptions(this.quickTagSearchQuery || '');
  },

  openDatePicker() {
    this.saveCurrentStepInputs();
    openCyberDatePicker(this.formData.scheduled_at, (isoString) => {
      this.formData.scheduled_at = isoString;
      const disp = document.getElementById('wizScheduleDisplay');
      if (disp) disp.textContent = new Date(isoString).toLocaleString();
      Toast.show('Publication schedule coordinates established', 'success');
    });
  },

  async submitWizard() {
    this.saveCurrentStepInputs();
    const nextBtn = document.getElementById('wizardNextBtn');
    const prevBtn = document.getElementById('wizardPrevBtn');
    const cancelBtn = document.getElementById('wizardCancelBtn');

    if (nextBtn) {
      nextBtn.disabled = true;
      nextBtn.innerHTML = `
        <span class="spin-icon">⏳</span>
        <span>Committing Directive...</span>
      `;
    }
    if (prevBtn) prevBtn.disabled = true;
    if (cancelBtn) cancelBtn.disabled = true;

    try {
      let res;
      if (this.formData.image_file || this.formData.video_file) {
        const formData = new FormData();
        formData.append('channel_id', this.formData.channel_id || '');
        formData.append('content_type', this.formData.content_type);
        formData.append('topic', this.formData.topic || '');
        formData.append('title', this.formData.title || '');
        formData.append('image_prompt', this.formData.image_prompt || '');
        formData.append('video_url', this.formData.video_url || '');
        formData.append('image_url', this.formData.image_url || '');
        formData.append('tags', this.formData.tags || '');
        formData.append('description', this.formData.description || '');
        formData.append('status', this.formData.status || 'pending');
        if (this.formData.scheduled_at) {
          formData.append('scheduled_at', this.formData.scheduled_at);
        }
        if (this.formData.image_file) {
          formData.append('image_file', this.formData.image_file);
        }
        if (this.formData.video_file) {
          formData.append('video_file', this.formData.video_file);
        }
        res = await API.content.create(formData);
      } else {
        const payload = {
          ...this.formData,
          channel_id: this.formData.channel_id || null,
          image_present: Boolean(this.formData.image_url || this.formData.image_prompt),
          video_present: Boolean(this.formData.video_url)
        };
        res = await API.content.create(payload);
      }

      const targetType = this.formData.content_type;
      Toast.show(`Successfully deployed new ${targetType.toUpperCase()} (#${res.data.id})!`, 'success');
      
      // Reset files
      this.formData.image_file = null;
      this.formData.video_file = null;

      // Navigate to corresponding view or return view
      if (targetType === 'short') {
        window.navigateTo('shorts');
      } else if (targetType === 'video') {
        window.navigateTo('videos');
      } else if (targetType === 'podcast') {
        window.navigateTo('podcasts');
      } else {
        window.navigateTo(this.getReturnView());
      }
    } catch (err) {
      Toast.show(`Submission failed: ${err.message}`, 'error');
      if (nextBtn) {
        nextBtn.disabled = false;
        nextBtn.innerHTML = `
          <span>Deploy Directive</span>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <line x1="22" y1="2" x2="11" y2="13"></line>
            <polygon points="22 2 15 22 11 13 2 9 22 2"></polygon>
          </svg>
        `;
      }
      if (prevBtn) prevBtn.disabled = false;
      if (cancelBtn) cancelBtn.disabled = false;
    }
  }
};

window.WizardComponent = WizardComponent;

// Listen for global tag presets updates to refresh Wizard dropdown in real time
window.addEventListener('tags:updated', (e) => {
  if (e.detail && e.detail.presets) {
    WizardComponent.tagPresets = e.detail.presets;
    if (WizardComponent.currentStep === 3) {
      WizardComponent.refreshQuickTagsUI();
    }
  }
});
