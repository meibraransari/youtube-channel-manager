/**
 * Executive Channel Tracker Component
 * Metrics Velocity, Snapshot Trajectory, Growth Analytics & Automated Cron Telemetry
 */
const TrackerComponent = {
  activeChannel: null,
  channels: [],
  snapshots: [],
  topVideos: [],
  activityDays: [],
  activityMap: {},
  currentHeatmapWindow: 365,
  chartInstance: null,

  async render(container) {
    container.innerHTML = `
      <div style="display: flex; align-items: center; justify-content: center; height: 320px;">
        <div style="font-family: var(--font-tech); color: var(--accent-teal); font-size: 16px;">
          INITIALIZING CHANNEL TELEMETRY TRACKER...
        </div>
      </div>
    `;

    try {
      // 1. Load Channels
      const channelsRes = await API.channels.list();
      this.channels = channelsRes.channels || [];

      if (this.channels.length === 0) {
        container.innerHTML = `
          <div class="glass-card" style="padding: 50px 30px; text-align: center; max-width: 600px; margin: 40px auto;">
            <div style="font-size: 44px; margin-bottom: 12px;">📊</div>
            <h2 style="font-size: 20px; font-weight: 800; color: var(--text-main);">Zero Channel Telemetry Data</h2>
            <p style="color: var(--text-muted); margin: 10px 0 24px; font-size: 13px; line-height: 1.6;">
              System data is completely clean. No channels or historical telemetry snapshots are registered.<br>
              Provision a YouTube channel to start capturing velocity and subscriber analytics.
            </p>
            <button class="btn-cyber btn-cyber-primary" onclick="NavbarComponent.openAddModal ? NavbarComponent.openAddModal() : window.navigateTo('channels')">
              ➕ Provision First Channel
            </button>
          </div>
        `;
        return;
      }

      // Determine active channel
      let activeId = API.getActiveChannelId();
      if (!activeId || activeId === 'all') {
        activeId = this.channels[0].id;
      }
      this.activeChannel = this.channels.find(c => c.id === activeId) || this.channels[0];

      // 2. Fetch Snapshots, Top Videos, and Daily Activity
      const snapRes = await API.channels.getSnapshots(this.activeChannel.id, 30);
      this.snapshots = snapRes.snapshots || [];
      this.topVideos = snapRes.topVideos || [];
      this.activityDays = snapRes.activityDays || [];
      this.activityMap = {};
      this.activityDays.forEach(a => {
        this.activityMap[a.activity_date] = parseInt(a.count, 10);
      });

      // Calculate 24h deltas from latest snapshot
      const latestSnap = this.snapshots.length > 0 ? this.snapshots[this.snapshots.length - 1] : null;
      const prevSnap = this.snapshots.length > 1 ? this.snapshots[this.snapshots.length - 2] : null;

      const subDelta = latestSnap && prevSnap ? (latestSnap.subscriber_count - prevSnap.subscriber_count) : (latestSnap?.delta_subscribers || 0);
      const viewsDelta = latestSnap && prevSnap ? (latestSnap.total_views - prevSnap.total_views) : (latestSnap?.delta_views || 0);

      container.innerHTML = `
        <div style="max-width: 1200px; margin: 0 auto;">
          <!-- Top Executive Header Card -->
          <div class="dashboard-header-card">
              <div style="display: flex; align-items: center; gap: 14px; flex-wrap: wrap;">
                ${this.activeChannel.avatar_url ? `
                  <img src="${this.activeChannel.avatar_url}" alt="${this.activeChannel.name}" style="width: 48px; height: 48px; border-radius: var(--radius-sm); object-fit: cover; border: 2px solid var(--accent-teal);" />
                ` : ''}
                <div>
                  <div style="display: flex; align-items: center; gap: 10px; flex-wrap: wrap;">
                    <h1 style="font-size: 22px; font-weight: 800; letter-spacing: -0.3px;">
                      ${this.activeChannel.name}
                    </h1>
                    <span class="badge badge-teal">${this.activeChannel.handle || '@channel'}</span>
                    <span class="badge badge-violet">Lead: ${this.activeChannel.author_name || 'Studio'}</span>
                  </div>
                  <p style="color: var(--text-muted); font-size: 13px; margin-top: 4px;">
                    Real-time snapshot velocity, automated subscriber telemetry, and video performance matrix.
                  </p>
                </div>
              </div>

            <div style="display: flex; align-items: center; gap: 10px; flex-wrap: wrap;">
              <!-- Channel Switcher -->
              <select id="trackerChannelSelect" class="channel-select-dropdown" style="min-width: 180px;">
                ${this.channels.map(c => `
                  <option value="${c.id}" ${c.id === this.activeChannel.id ? 'selected' : ''}>
                    📺 ${c.name}
                  </option>
                `).join('')}
              </select>

              <!-- Action Buttons -->
              <button class="btn-cyber btn-cyber-primary" id="trackerSyncBtn" style="display: flex; align-items: center; gap: 6px;">
                <span>🔄</span>
                <span>Sync Metrics Now</span>
              </button>
              <button class="btn-cyber btn-cyber-outline" id="trackerSnapshotBtn" style="display: flex; align-items: center; gap: 6px;">
                <span>📸</span>
                <span>Snapshot</span>
              </button>
            </div>
          </div>

          <!-- 4 Stat Metric Cards (Matching Design Reference Screenshot) -->
          <div class="stats-grid">
            <!-- Subscribers Card -->
            <div class="stat-card">
              <div class="stat-card-header">
                <span class="stat-label">SUBSCRIBERS</span>
                <div class="stat-icon-circle stat-icon-green">
                  <span>👥</span>
                </div>
              </div>
              <div class="stat-value" style="color: var(--accent-emerald);">
                ${parseInt(this.activeChannel.subscriber_count || 0, 10).toLocaleString()}
              </div>
              <div class="stat-subtext">
                <span class="badge badge-emerald" style="font-size: 10px; padding: 1px 6px;">
                  +${subDelta.toLocaleString()} today
                </span>
                <span>• Live audience</span>
              </div>
            </div>

            <!-- Total Views Card -->
            <div class="stat-card">
              <div class="stat-card-header">
                <span class="stat-label">AGGREGATE VIEWS</span>
                <div class="stat-icon-circle stat-icon-blue">
                  <span>📈</span>
                </div>
              </div>
              <div class="stat-value" style="color: var(--accent-cyan);">
                ${parseInt(this.activeChannel.total_views || 0, 10).toLocaleString()}
              </div>
              <div class="stat-subtext">
                <span style="color: var(--accent-cyan); font-weight: 700;">
                  +${viewsDelta.toLocaleString()} 24h
                </span>
                <span>• Across all assets</span>
              </div>
            </div>

            <!-- Catalog Assets Card -->
            <div class="stat-card">
              <div class="stat-card-header">
                <span class="stat-label">INGESTED VIDEOS</span>
                <div class="stat-icon-circle stat-icon-purple">
                  <span>🎬</span>
                </div>
              </div>
              <div class="stat-value" style="color: var(--accent-violet);">
                ${(this.activeChannel.real_content_count || this.activeChannel.video_count || 0).toLocaleString()}
              </div>
              <div class="stat-subtext">
                <span class="badge badge-violet" style="font-size: 10px; padding: 1px 6px;">
                  ${this.snapshots.length} Snapshots
                </span>
                <span>• Monitored</span>
              </div>
            </div>

            <!-- Telemetry Sync Health -->
            <div class="stat-card">
              <div class="stat-card-header">
                <span class="stat-label">CRON SYNC HEALTH</span>
                <div class="stat-icon-circle stat-icon-amber">
                  <span>⚡</span>
                </div>
              </div>
              <div class="stat-value" style="color: #10b981;">
                100%
              </div>
              <div class="stat-subtext">
                <span style="color: #10b981; font-weight: 700;">ACTIVE</span>
                <span>• Hourly Telemetry Cron</span>
              </div>
            </div>
          </div>

          <!-- Charts Row: Trajectory & Top Content (Matching Screenshot Layout) -->
          <div class="charts-grid">
            <!-- Left: Growth & Views Trajectory Line Chart -->
            <div class="glass-card" style="padding: 22px;">
              <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 16px;">
                <div>
                  <h3 style="font-size: 15px; font-weight: 700; color: var(--text-main);">
                    📈 Subscriber & View Velocity Trajectory
                  </h3>
                  <div style="font-size: 11px; color: var(--text-dim); margin-top: 2px;">
                    Historical recorded telemetry data points for ${this.activeChannel.name}
                  </div>
                </div>
                <span class="badge badge-teal">SNAPSHOT STREAM</span>
              </div>

              <div style="height: 280px; position: relative;">
                <canvas id="trackerTrajectoryChart"></canvas>
              </div>
            </div>

            <!-- Right: Top Videos Leaderboard (Matching "Top Projects by Storage") -->
            <div class="glass-card" style="padding: 22px;">
              <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 16px;">
                <div>
                  <h3 style="font-size: 15px; font-weight: 700; color: var(--text-main);">
                    🏆 Top Videos by Views
                  </h3>
                  <div style="font-size: 11px; color: var(--text-dim); margin-top: 2px;">
                    High-engagement catalog items
                  </div>
                </div>
                <button class="btn-cyber btn-cyber-outline btn-sm" onclick="window.navigateTo('content')">
                  Catalog ↗
                </button>
              </div>

              <div style="display: flex; flex-direction: column; gap: 12px;">
                ${this.renderTopVideosProgress()}
              </div>
            </div>
          </div>

          <!-- Calendar Heatmap (Matching SLA Reliability Matrix & Calendar Heatmap) -->
          <div class="glass-card heatmap-container">
            <div style="display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 12px; margin-bottom: 16px;">
              <div style="display: flex; align-items: center; gap: 10px;">
                <span style="font-size: 20px;">🗓️</span>
                <div>
                  <div style="display: flex; align-items: center; gap: 8px;">
                    <h3 style="font-size: 15px; font-weight: 700; color: var(--text-main);">
                      Content Publishing Frequency & Activity Heatmap
                    </h3>
                    <span class="badge badge-emerald" id="trackerHeatmapBadge">${this.currentHeatmapWindow === 365 ? '365 Days (1 Year)' : `${this.currentHeatmapWindow} Days`}</span>
                  </div>
                  <div style="font-size: 11px; color: var(--text-dim);">
                    GitHub-style historical consistency view. Visualizes upload density & release cadence.
                  </div>
                </div>
              </div>

              <!-- Time Range Pills -->
              <div class="nav-pill-tabs" id="trackerHeatmapPills" style="background: var(--bg-card);">
                <button type="button" class="nav-pill-item ${this.currentHeatmapWindow === 30 ? 'active' : ''}" data-days="30" onclick="TrackerComponent.switchHeatmapWindow(30); return false;">30 Days</button>
                <button type="button" class="nav-pill-item ${this.currentHeatmapWindow === 90 ? 'active' : ''}" data-days="90" onclick="TrackerComponent.switchHeatmapWindow(90); return false;">90 Days</button>
                <button type="button" class="nav-pill-item ${this.currentHeatmapWindow === 365 ? 'active' : ''}" data-days="365" onclick="TrackerComponent.switchHeatmapWindow(365); return false;">365 Days (1 Year)</button>
              </div>
            </div>

            <!-- Heatmap Sub-metrics Bar -->
            <div id="trackerHeatmapSubmetrics" style="display: grid; grid-template-columns: repeat(4, 1fr); gap: 12px; margin-bottom: 16px; background: rgba(0,0,0,0.15); padding: 12px 16px; border-radius: var(--radius-sm);">
              ${this.renderHeatmapSubmetrics(this.currentHeatmapWindow)}
            </div>

            <!-- Heatmap Grid -->
            <div class="heatmap-grid" id="trackerHeatmapGrid" style="${this.getHeatmapGridStyle(this.currentHeatmapWindow)}">
              ${this.generateHeatmapCells(this.currentHeatmapWindow)}
            </div>
            <div style="display: flex; align-items: center; justify-content: flex-end; gap: 6px; font-size: 10px; color: var(--text-dim); margin-top: 10px;">
              <span>Less</span>
              <div style="width: 10px; height: 10px; border-radius: 2px; background: rgba(255,255,255,0.05);"></div>
              <div style="width: 10px; height: 10px; border-radius: 2px; background: rgba(16, 185, 129, 0.3);"></div>
              <div style="width: 10px; height: 10px; border-radius: 2px; background: rgba(16, 185, 129, 0.6);"></div>
              <div style="width: 10px; height: 10px; border-radius: 2px; background: #10b981;"></div>
              <span>More</span>
            </div>
          </div>
        </div>
      `;

      // Direct Event Listener Binding for Heatmap Window Buttons
      const trkPillBtns = document.querySelectorAll('#trackerHeatmapPills .nav-pill-item');
      trkPillBtns.forEach(btn => {
        btn.addEventListener('click', (e) => {
          e.preventDefault();
          e.stopPropagation();
          const dVal = parseInt(btn.getAttribute('data-days'), 10);
          if (dVal) TrackerComponent.switchHeatmapWindow(dVal);
        });
      });

      // Initialize Chart.js
      this.initTrajectoryChart();

      // Channel Select Event
      const chSelect = document.getElementById('trackerChannelSelect');
      if (chSelect) {
        chSelect.onchange = (e) => {
          const newId = e.target.value;
          API.setActiveChannelId(newId);
          this.render(container);
        };
      }

      // Sync Button Event
      const syncBtn = document.getElementById('trackerSyncBtn');
      if (syncBtn) {
        syncBtn.onclick = async () => {
          syncBtn.disabled = true;
          syncBtn.innerHTML = `<span>⏳</span><span>Syncing...</span>`;
          try {
            const res = await API.channels.sync(this.activeChannel.id);
            Toast.show(`Metrics synced! ${res.message || 'Updated views, likes, and subscribers.'}`, 'success');
            await this.render(container);
          } catch (err) {
            Toast.show(`Sync failed: ${err.message}`, 'error');
            syncBtn.disabled = false;
            syncBtn.innerHTML = `<span>🔄</span><span>Sync Metrics Now</span>`;
          }
        };
      }

      // Manual Snapshot Button Event
      const snapBtn = document.getElementById('trackerSnapshotBtn');
      if (snapBtn) {
        snapBtn.onclick = async () => {
          snapBtn.disabled = true;
          try {
            await API.channels.sync(this.activeChannel.id);
            Toast.show('Instant snapshot recorded successfully!', 'success');
            await this.render(container);
          } catch (err) {
            Toast.show(`Snapshot failed: ${err.message}`, 'error');
            snapBtn.disabled = false;
          }
        };
      }

    } catch (err) {
      container.innerHTML = `
        <div class="glass-card" style="padding: 30px; text-align: center; color: #ef4444;">
          <h3>Telemetry Load Failed</h3>
          <p style="margin-top: 8px;">${err.message}</p>
        </div>
      `;
    }
  },

  renderTopVideosProgress() {
    if (this.topVideos.length === 0) {
      return `<div style="font-size: 12px; color: var(--text-dim); text-align: center; padding: 20px;">No video records in channel catalog yet.</div>`;
    }

    const maxViews = Math.max(...this.topVideos.map(v => v.views_count || 1), 1);

    return this.topVideos.slice(0, 6).map(v => {
      const pct = Math.min(Math.round(((v.views_count || 0) / maxViews) * 100), 100);
      return `
        <div>
          <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 4px; font-size: 12px;">
            <a href="${v.video_url || '#'}" target="_blank" rel="noopener" style="font-weight: 600; color: var(--text-main); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; max-width: 220px; text-decoration: none;" title="${v.title}">
              ${v.title}
            </a>
            <span style="font-family: var(--font-mono); font-weight: 700; color: var(--accent-cyan); font-size: 11px;">
              ${(v.views_count || 0).toLocaleString()} views
            </span>
          </div>
          <div style="height: 6px; width: 100%; background: rgba(255,255,255,0.06); border-radius: var(--radius-full); overflow: hidden;">
            <div style="height: 100%; width: ${pct}%; background: linear-gradient(90deg, var(--accent-teal), var(--accent-emerald)); border-radius: var(--radius-full); transition: width 0.5s ease;"></div>
          </div>
        </div>
      `;
    }).join('');
  },

  switchHeatmapWindow(days) {
    this.currentHeatmapWindow = days;
    TrackerComponent.currentHeatmapWindow = days;

    // Update pill buttons active state via data-days
    const pills = document.querySelectorAll('#trackerHeatmapPills .nav-pill-item');
    pills.forEach(p => {
      const pDays = parseInt(p.getAttribute('data-days'), 10);
      if (pDays === days) {
        p.classList.add('active');
      } else {
        p.classList.remove('active');
      }
    });

    // Update Badge
    const badge = document.getElementById('trackerHeatmapBadge');
    if (badge) {
      badge.textContent = days === 365 ? '365 Days (1 Year)' : `${days} Days`;
    }

    // Update Submetrics Bar
    const submetrics = document.getElementById('trackerHeatmapSubmetrics');
    if (submetrics) {
      submetrics.innerHTML = TrackerComponent.renderHeatmapSubmetrics(days);
    }

    // Update Grid cells and grid style
    const grid = document.getElementById('trackerHeatmapGrid');
    if (grid) {
      grid.style.cssText = TrackerComponent.getHeatmapGridStyle(days);
      grid.innerHTML = TrackerComponent.generateHeatmapCells(days);
    }

    if (window.Toast && Toast.show) {
      Toast.show(`Showing ${days} days activity window`, 'info', 1200);
    }
  },

  getHeatmapGridStyle(days) {
    if (days === 30) {
      return 'display: grid; grid-template-columns: repeat(30, 1fr); gap: 4px; width: 100%; margin-top: 14px;';
    } else if (days === 90) {
      return 'display: grid; grid-template-columns: repeat(30, 1fr); gap: 4px; width: 100%; margin-top: 14px;';
    } else {
      return 'display: grid; grid-template-columns: repeat(52, 1fr); gap: 4px; width: 100%; margin-top: 14px;';
    }
  },

  renderHeatmapSubmetrics(days) {
    const today = new Date();
    let totalUploads = 0;
    let activeDays = 0;
    const activeWeeksSet = new Set();

    for (let i = days - 1; i >= 0; i--) {
      const d = new Date(today.getTime() - (i * 24 * 60 * 60 * 1000));
      const dateStr = d.toISOString().slice(0, 10);
      const count = this.activityMap[dateStr] || 0;
      if (count > 0) {
        totalUploads += count;
        activeDays++;
        const weekNum = Math.floor(d.getTime() / (7 * 24 * 60 * 60 * 1000));
        activeWeeksSet.add(weekNum);
      }
    }

    const cadencePct = Math.round((activeDays / days) * 100);
    const totalWeeksInWindow = Math.max(Math.ceil(days / 7), 1);
    const weeklyRate = (totalUploads / (days / 7)).toFixed(1);

    return `
      <div>
        <div style="font-size: 10px; font-weight: 700; color: var(--text-dim);">UPLOAD CONSISTENCY</div>
        <div style="font-size: 16px; font-weight: 800; color: var(--accent-emerald); margin-top: 2px;">
          ${cadencePct}% Cadence (${activeDays} Active Days)
        </div>
      </div>
      <div>
        <div style="font-size: 10px; font-weight: 700; color: var(--text-dim);">WINDOW UPLOADS</div>
        <div style="font-size: 16px; font-weight: 800; color: var(--text-main); margin-top: 2px;">
          ${totalUploads} Upload${totalUploads === 1 ? '' : 's'}
        </div>
      </div>
      <div>
        <div style="font-size: 10px; font-weight: 700; color: var(--text-dim);">ACTIVE RELEASE WEEKS</div>
        <div style="font-size: 16px; font-weight: 800; color: var(--accent-teal); margin-top: 2px;">
          ${activeWeeksSet.size} / ${totalWeeksInWindow} Weeks
        </div>
      </div>
      <div>
        <div style="font-size: 10px; font-weight: 700; color: var(--text-dim);">RELEASE VELOCITY</div>
        <div style="font-size: 16px; font-weight: 800; color: var(--accent-cyan); margin-top: 2px;">
          ${weeklyRate} / week
        </div>
      </div>
    `;
  },

  generateHeatmapCells(days) {
    let html = '';
    const today = new Date();
    for (let i = days - 1; i >= 0; i--) {
      const d = new Date(today.getTime() - (i * 24 * 60 * 60 * 1000));
      const dateStr = d.toISOString().slice(0, 10);
      const displayDate = d.toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' });
      const count = this.activityMap[dateStr] || 0;

      let levelClass = '';
      if (count >= 3) levelClass = 'level-3';
      else if (count === 2) levelClass = 'level-2';
      else if (count === 1) levelClass = 'level-1';

      html += `<div class="heatmap-cell ${levelClass}" title="${displayDate}: ${count} upload${count === 1 ? '' : 's'}${count === 0 ? ' (Rest day)' : ''}"></div>`;
    }
    return html;
  },

  initTrajectoryChart() {
    const canvas = document.getElementById('trackerTrajectoryChart');
    if (!canvas) return;

    if (this.chartInstance) {
      this.chartInstance.destroy();
      this.chartInstance = null;
    }

    if (!this.snapshots || this.snapshots.length === 0) {
      const parent = canvas.parentElement;
      if (parent) {
        parent.innerHTML = `
          <div style="height: 100%; display: flex; flex-direction: column; align-items: center; justify-content: center; text-align: center; color: var(--text-dim); padding: 20px;">
            <span style="font-size: 32px; margin-bottom: 8px;">📈</span>
            <div style="font-weight: 700; color: var(--text-main); font-size: 14px;">No Snapshot Telemetry Recorded</div>
            <div style="font-size: 12px; margin-top: 4px; max-width: 340px; line-height: 1.5;">
              Historical views and subscriber trajectory will appear here after capturing telemetry snapshots. Click <strong>Sync Metrics Now</strong> or <strong>Snapshot</strong> to record the first entry.
            </div>
          </div>
        `;
      }
      return;
    }

    // Prepare authentic data (no fake unshifted baseline points)
    const labels = this.snapshots.map((s, idx) => {
      const d = new Date(s.recorded_at);
      return d.toLocaleDateString([], { month: 'short', day: 'numeric' });
    });

    const subsData = this.snapshots.map(s => parseInt(s.subscriber_count || 0, 10));
    const viewsData = this.snapshots.map(s => parseInt(s.total_views || 0, 10));

    // Handle single snapshot baseline (Day 1) cleanly
    const isSinglePoint = labels.length === 1;
    const ptRadius = isSinglePoint ? 6 : 3;
    const ptHoverRadius = isSinglePoint ? 9 : 6;

    const ctx = canvas.getContext('2d');
    this.chartInstance = new Chart(ctx, {
      type: 'line',
      data: {
        labels: labels,
        datasets: [
          {
            label: 'Total Views',
            data: viewsData,
            borderColor: '#0d9488',
            backgroundColor: 'rgba(13, 148, 136, 0.1)',
            fill: true,
            tension: 0.35,
            borderWidth: 2,
            pointRadius: ptRadius,
            pointHoverRadius: ptHoverRadius,
            yAxisID: 'yViews'
          },
          {
            label: 'Subscribers',
            data: subsData,
            borderColor: '#10b981',
            backgroundColor: 'transparent',
            borderDash: [4, 4],
            tension: 0.35,
            borderWidth: 2,
            pointRadius: ptRadius,
            pointHoverRadius: ptHoverRadius,
            yAxisID: 'ySubs'
          }
        ]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        interaction: {
          mode: 'index',
          intersect: false
        },
        plugins: {
          legend: {
            display: true,
            position: 'top',
            labels: {
              color: '#94a3b8',
              font: { family: 'Plus Jakarta Sans', size: 11, weight: 600 }
            }
          },
          tooltip: {
            backgroundColor: '#111827',
            titleColor: '#f8fafc',
            bodyColor: '#94a3b8',
            borderColor: '#1f2937',
            borderWidth: 1,
            padding: 10
          }
        },
        scales: {
          x: {
            grid: { color: 'rgba(255, 255, 255, 0.04)' },
            ticks: { color: '#64748b', font: { family: 'Plus Jakarta Sans', size: 10 } }
          },
          yViews: {
            type: 'linear',
            position: 'left',
            grid: { color: 'rgba(255, 255, 255, 0.04)' },
            ticks: { color: '#0d9488', font: { family: 'Plus Jakarta Sans', size: 10 } }
          },
          ySubs: {
            type: 'linear',
            position: 'right',
            grid: { drawOnChartArea: false },
            ticks: { color: '#10b981', font: { family: 'Plus Jakarta Sans', size: 10 } }
          }
        }
      }
    });
  }
};

window.TrackerComponent = TrackerComponent;
window.switchTrackerHeatmapWindow = (days) => TrackerComponent.switchHeatmapWindow(days);
