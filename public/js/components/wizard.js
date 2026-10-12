/**
 * Step-by-Step Content Creator Wizard Component
 * Zero-loss state, multi-channel tagging, AI prompt generators, and pre-flight validation
 */
const WizardComponent = {
  currentStep: 1,
  channels: [],
  preselectedType: null,
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
    scheduled_at: null
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

  async render(container) {
    this.currentStep = 1;
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

    await this.initChannels();

    if (!container) return;

    container.innerHTML = `
      <div style="max-width: 860px; margin: 0 auto;">
        <!-- Header -->
        <div style="text-align: center; margin-bottom: 24px;">
          <h1 style="font-size: 22px; font-weight: 800; letter-spacing: -0.3px; color: var(--text-main);">
            🧙 CONTENT CREATOR WIZARD
          </h1>
          <p style="color: var(--text-muted); font-size: 13px; margin-top: 4px;">
            Step-by-step pipeline for engineering high-CTR YouTube Shorts, Long Videos, and Podcast episodes
          </p>
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
          <div class="modal-footer" style="padding: 18px 28px; background: rgba(0,0,0,0.15);">
            <button class="btn-cyber btn-cyber-outline" id="wizardPrevBtn" style="display: none;">
              ◀ PREVIOUS STEP
            </button>
            <div style="flex: 1;"></div>
            <button class="btn-cyber btn-cyber-primary" id="wizardNextBtn">
              NEXT STEP ▶
            </button>
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

    if (!body) return;

    // Update stepper node status
    for (let i = 1; i <= 5; i++) {
      const node = document.getElementById(`stepNode${i}`);
      if (!node) continue;
      node.classList.remove('active', 'completed');
      if (i === this.currentStep) node.classList.add('active');
      else if (i < this.currentStep) node.classList.add('completed');
    }

    if (prevBtn) {
      prevBtn.style.display = this.currentStep > 1 ? 'inline-flex' : 'none';
    }

    if (nextBtn) {
      if (this.currentStep === 5) {
        nextBtn.innerHTML = `🚀 DEPLOY DIRECTIVE`;
        nextBtn.className = 'btn-cyber btn-cyber-primary';
      } else {
        nextBtn.innerHTML = `NEXT STEP ▶`;
        nextBtn.className = 'btn-cyber btn-cyber-primary';
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
          STEP 2: THUMBNAIL DESIGN & AI IMAGE PROMPT
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
    } else if (this.currentStep === 3) {
      body.innerHTML = `
        <h3 style="font-size: 15px; font-weight: 700; margin-bottom: 16px; color: var(--accent-teal);">
          STEP 3: TAGS & VIDEO DESCRIPTION
        </h3>

        <!-- Tags Field with 500 characters counter -->
        <div style="margin-bottom: 16px;">
          <div style="display: flex; justify-content: space-between; align-items: center;">
            <label style="font-size: 11px; font-weight: 700; color: var(--text-dim); text-transform: uppercase;">Tags (Comma-Separated) *</label>
            <span id="wizTagsCounter" style="font-size: 11px; font-family: var(--font-mono); color: ${this.formData.tags.length > 450 ? 'var(--accent-rose)' : 'var(--text-dim)'};">
              ${this.formData.tags.length} / 500 max
            </span>
          </div>
          <textarea id="wizTags" class="cyber-input" rows="3" style="margin-top: 6px; resize: vertical;" placeholder="cloud, postgresql, nodejs, devops, architecture, engineering">${this.formData.tags}</textarea>
        </div>

        <!-- Tag helper chips -->
        <div style="display: flex; gap: 6px; flex-wrap: wrap; margin-bottom: 18px;">
          <span style="font-size: 11px; color: var(--text-dim); display: flex; align-items: center;">Quick Tags:</span>
          <button type="button" class="btn-cyber btn-cyber-outline btn-sm" onclick="WizardComponent.appendTag('postgresql, database, pg18')">+ PostgreSQL</button>
          <button type="button" class="btn-cyber btn-cyber-outline btn-sm" onclick="WizardComponent.appendTag('kubernetes, containers, devops')">+ Kubernetes</button>
          <button type="button" class="btn-cyber btn-cyber-outline btn-sm" onclick="WizardComponent.appendTag('docker, docker compose, microservices')">+ Docker</button>
          <button type="button" class="btn-cyber btn-cyber-outline btn-sm" onclick="WizardComponent.appendTag('ai, automation, production')">+ Automation</button>
        </div>

        <!-- Description -->
        <div>
          <label style="font-size: 11px; font-weight: 700; color: var(--text-dim); text-transform: uppercase;">Comprehensive Description & Links</label>
          <textarea id="wizDescription" class="cyber-input" rows="5" style="margin-top: 6px; resize: vertical;" placeholder="Comprehensive summary, GitHub repo links, step-by-step timestamps, connect links...">${this.formData.description}</textarea>
        </div>
      `;

      const tagsInput = document.getElementById('wizTags');
      const counter = document.getElementById('wizTagsCounter');
      if (tagsInput && counter) {
        tagsInput.oninput = () => {
          counter.textContent = `${tagsInput.value.length} / 500 max`;
          counter.style.color = tagsInput.value.length > 500 ? '#ef4444' : 'var(--text-dim)';
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

          ${this.formData.tags ? `
            <div style="margin-top: 12px;">
              <span style="color: var(--text-dim); font-weight: 700; font-size: 12px;">TAGS (${this.formData.tags.length} chars):</span>
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
      if (this.formData.tags.length > 500) {
        Toast.show('Tags exceed 500 characters limit. Please shorten.', 'warning');
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

  appendTag(tagStr) {
    const tElem = document.getElementById('wizTags');
    const current = (tElem ? tElem.value : this.formData.tags).trim();
    const updated = current ? `${current}, ${tagStr}` : tagStr;
    if (tElem) tElem.value = updated;
    this.formData.tags = updated;
    const counter = document.getElementById('wizTagsCounter');
    if (counter) {
      counter.textContent = `${updated.length} / 500 max`;
      if (updated.length > 500) counter.style.color = '#ef4444';
    }
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
    if (nextBtn) {
      nextBtn.disabled = true;
      nextBtn.innerHTML = `<span>⏳</span> COMMITTING TO POSTGRESQL...`;
    }

    try {
      const payload = {
        ...this.formData,
        channel_id: this.formData.channel_id || null,
        image_present: Boolean(this.formData.image_url || this.formData.image_prompt),
        video_present: Boolean(this.formData.video_url)
      };

      const res = await API.content.create(payload);
      Toast.show(`Successfully deployed new ${payload.content_type.toUpperCase()} (#${res.data.id})!`, 'success');
      
      // Navigate to content view
      if (payload.content_type === 'short') {
        window.navigateTo('shorts');
      } else if (payload.content_type === 'video') {
        window.navigateTo('videos');
      } else {
        window.navigateTo('content');
      }
    } catch (err) {
      Toast.show(`Submission failed: ${err.message}`, 'error');
      if (nextBtn) {
        nextBtn.disabled = false;
        nextBtn.innerHTML = `🚀 DEPLOY DIRECTIVE`;
      }
    }
  }
};

window.WizardComponent = WizardComponent;
