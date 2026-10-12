/**
 * Executive Channel Dashboard Component
 * Clean modern dark SaaS dashboard with rounded green bars, circular stat badges, and activity heatmap
 */
const DashboardComponent = {
  barChartInstance: null,
  donutChartInstance: null,
  activityDays: [],
  activityMap: {},
  currentHeatmapWindow: 365,

  async render(container) {
    container.innerHTML = `
      <div style="display: flex; align-items: center; justify-content: center; height: 320px;">
        <div style="font-family: var(--font-tech); color: var(--accent-teal); font-size: 16px;">
          INITIALIZING TELEMETRY STREAM...
        </div>
      </div>
    `;

    try {
      const activeChannelId = API.getActiveChannelId();
      const statsData = await API.dashboard.getStats(activeChannelId);
      const channel = statsData.channel || { name: 'Studio Overview (No Channels)', handle: '@no_channels' };
      const { metrics, timeline, recentContent, recentActivity } = statsData;

      this.activityDays = statsData.activityDays || [];
      this.activityMap = {};
      this.activityDays.forEach(a => {
        this.activityMap[a.activity_date] = parseInt(a.count, 10);
      });

      container.innerHTML = `
        <div style="max-width: 1200px; margin: 0 auto;">
          <!-- Top Executive Header Card (Matching Design Reference Screenshot) -->
          <div class="dashboard-header-card">
            <div>
              <div style="display: flex; align-items: center; gap: 10px; flex-wrap: wrap;">
                <h1 style="font-size: 22px; font-weight: 800; letter-spacing: -0.3px; color: var(--text-main);">
                  ${channel.name}
                </h1>
                <span class="badge badge-teal">${channel.handle}</span>
                <span class="badge ${metrics.totalItems > 0 ? 'badge-emerald' : 'badge-amber'}">
                  ${metrics.totalItems > 0 ? 'Live Content Stream' : 'Zero Data State'}
                </span>
              </div>
              <p style="color: var(--text-muted); font-size: 13px; margin-top: 4px;">
                ${metrics.totalItems > 0 
                  ? 'Live status, telemetry logs, content publishing cadence, and automated metrics synchronization across managed channels.'
                  : 'All studio content and channel metrics have been flushed. Provision a channel in Channel Manager or deploy content to begin.'}
              </p>
            </div>

            <div style="display: flex; align-items: center; gap: 10px; flex-wrap: wrap;">
              <button class="btn-cyber btn-cyber-primary" id="dashDeployContentBtn" onclick="window.navigateTo('wizard', 'short')" style="display: flex; align-items: center; gap: 6px;">
                <span>✨</span>
                <span>Deploy New Content</span>
              </button>
              <button class="btn-cyber btn-cyber-outline" id="dashRefreshBtn" style="display: flex; align-items: center; gap: 6px;">
                <span>🔄</span>
                <span>Refresh</span>
              </button>
            </div>
          </div>

          <!-- 4 Stat Metric Cards (Matching Screenshot Grid) -->
          <div class="stats-grid">
            <!-- Metric 1: Total Content Assets -->
            <div class="stat-card">
              <div class="stat-card-header">
                <span class="stat-label">CATALOG ASSETS</span>
                <div class="stat-icon-circle stat-icon-blue">
                  <span>🎬</span>
                </div>
              </div>
              <div class="stat-value">
                ${metrics.totalItems}
              </div>
              <div class="stat-subtext">
                <span style="color: var(--accent-teal); font-weight: 700;">⚡ ${metrics.typeBreakdown.short} Shorts</span>
                <span>•</span>
                <span style="color: var(--accent-cyan); font-weight: 700;">📹 ${metrics.typeBreakdown.video} Videos</span>
              </div>
            </div>

            <!-- Metric 2: Uploaded Success Rate -->
            <div class="stat-card">
              <div class="stat-card-header">
                <span class="stat-label">PUBLISHED RATIO</span>
                <div class="stat-icon-circle stat-icon-green">
                  <span>✓</span>
                </div>
              </div>
              <div class="stat-value" style="color: var(--accent-emerald);">
                ${metrics.totalItems > 0 ? Math.round((metrics.statusBreakdown.uploaded / metrics.totalItems) * 100) : 0}%
              </div>
              <div class="stat-subtext">
                <span class="badge badge-emerald" style="font-size: 10px; padding: 1px 6px;">
                  ${metrics.statusBreakdown.uploaded} Live
                </span>
                <span>• ${metrics.statusBreakdown.pending} Pending</span>
              </div>
            </div>

            <!-- Metric 3: Total Views Estimate -->
            <div class="stat-card">
              <div class="stat-card-header">
                <span class="stat-label">AGGREGATE VIEWS</span>
                <div class="stat-icon-circle stat-icon-purple">
                  <span>👁️</span>
                </div>
              </div>
              <div class="stat-value" style="color: var(--accent-violet);">
                ${metrics.totalViews.toLocaleString()}
              </div>
              <div class="stat-subtext">
                <span style="color: var(--accent-violet); font-weight: 700;">All-time telemetry</span>
              </div>
            </div>

            <!-- Metric 4: Engagements & Likes -->
            <div class="stat-card">
              <div class="stat-card-header">
                <span class="stat-label">COMMUNITY LIKES</span>
                <div class="stat-icon-circle stat-icon-amber">
                  <span>❤️</span>
                </div>
              </div>
              <div class="stat-value" style="color: var(--accent-amber);">
                ${metrics.totalLikes.toLocaleString()}
              </div>
              <div class="stat-subtext">
                <span class="badge badge-amber" style="font-size: 10px; padding: 1px 6px;">
                  💬 ${metrics.totalComments.toLocaleString()} comments
                </span>
              </div>
            </div>
          </div>

          <!-- Charts Grid: Daily Activity Bar Chart + Top Content (Matching Screenshot Layout) -->
          <div class="charts-grid">
            <!-- Left: Daily Activity Bar Chart (green bars matching screenshot) -->
            <div class="glass-card" style="padding: 22px;">
              <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 16px;">
                <div>
                  <h3 style="font-size: 15px; font-weight: 700; color: var(--text-main);">
                    📊 Publishing & Release Activity (Recent Cycles)
                  </h3>
                  <div style="font-size: 11px; color: var(--text-dim); margin-top: 2px;">
                    Daily upload frequency and cadence across pipeline
                  </div>
                </div>
                <span class="badge badge-teal">ACTIVITY LOG</span>
              </div>

              <div style="height: 250px; position: relative;">
                <canvas id="dashBarChart"></canvas>
              </div>
            </div>

            <!-- Right: Top Content by Views (Progress Bars matching "Top Projects by Storage") -->
            <div class="glass-card" style="padding: 22px;">
              <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 16px;">
                <div>
                  <h3 style="font-size: 15px; font-weight: 700; color: var(--text-main);">
                    📁 Top Content by Views
                  </h3>
                  <div style="font-size: 11px; color: var(--text-dim); margin-top: 2px;">
                    Highest traction assets
                  </div>
                </div>
                <button class="btn-cyber btn-cyber-outline btn-sm" onclick="window.navigateTo('content')">
                  View All ↗
                </button>
              </div>

              <div style="display: flex; flex-direction: column; gap: 14px;">
                ${this.renderTopContentProgress(recentContent)}
              </div>
            </div>
          </div>

          <!-- Bottom: Reliability Matrix & Activity Calendar Heatmap (From User Screenshot) -->
          <div class="glass-card heatmap-container">
            <div style="display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 12px; margin-bottom: 16px;">
              <div style="display: flex; align-items: center; gap: 10px;">
                <span style="font-size: 20px;">🗓️</span>
                <div>
                  <div style="display: flex; align-items: center; gap: 8px;">
                    <h3 style="font-size: 15px; font-weight: 700; color: var(--text-main);">
                      Channel Cadence Reliability Matrix & Calendar Heatmap
                    </h3>
                    <span class="badge badge-emerald" id="dashHeatmapBadge">${this.currentHeatmapWindow === 365 ? '365 Days (1 Year)' : `${this.currentHeatmapWindow} Days`}</span>
                  </div>
                  <div style="font-size: 11px; color: var(--text-dim);">
                    GitHub-style historical consistency view. Visualizes upload density & release cadence.
                  </div>
                </div>
              </div>

              <!-- Time Range Pills -->
              <div class="nav-pill-tabs" id="dashHeatmapPills" style="background: var(--bg-card);">
                <button type="button" class="nav-pill-item ${this.currentHeatmapWindow === 30 ? 'active' : ''}" data-days="30" onclick="DashboardComponent.switchHeatmapWindow(30); return false;">30 Days</button>
                <button type="button" class="nav-pill-item ${this.currentHeatmapWindow === 90 ? 'active' : ''}" data-days="90" onclick="DashboardComponent.switchHeatmapWindow(90); return false;">90 Days</button>
                <button type="button" class="nav-pill-item ${this.currentHeatmapWindow === 365 ? 'active' : ''}" data-days="365" onclick="DashboardComponent.switchHeatmapWindow(365); return false;">365 Days (1 Year)</button>
              </div>
            </div>

            <!-- Heatmap Sub-metrics Bar -->
            <div id="dashHeatmapSubmetrics" style="display: grid; grid-template-columns: repeat(4, 1fr); gap: 12px; margin-bottom: 16px; background: rgba(0,0,0,0.15); padding: 12px 16px; border-radius: var(--radius-sm);">
              ${this.renderHeatmapSubmetrics(this.currentHeatmapWindow, metrics.totalItems)}
            </div>

            <!-- Heatmap Grid -->
            <div class="heatmap-grid" id="dashHeatmapGrid" style="${this.getHeatmapGridStyle(this.currentHeatmapWindow)}">
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

          <!-- Bottom Row: Recent Releases & Audit Trail Stream -->
          <div style="display: grid; grid-template-columns: 3fr 2fr; gap: 18px; margin-top: 22px;">
            <!-- Recent Releases -->
            <div class="glass-card" style="padding: 22px;">
              <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 16px;">
                <h3 style="font-size: 15px; font-weight: 700; color: var(--text-main);">
                  🎬 Recent Studio Content
                </h3>
                <button class="btn-cyber btn-cyber-outline btn-sm" onclick="window.navigateTo('content')">
                  All Items (${metrics.totalItems})
                </button>
              </div>

              <div style="display: flex; flex-direction: column; gap: 10px;">
                ${recentContent && recentContent.length > 0 ? recentContent.slice(0, 5).map(item => `
                  <div style="display: flex; align-items: center; justify-content: space-between; padding: 10px 14px; background: rgba(0,0,0,0.12); border-radius: var(--radius-sm); border: 1px solid var(--border-subtle); gap: 10px;">
                    <div style="display: flex; align-items: center; gap: 10px; min-width: 0;">
                      <div style="width: 32px; height: 32px; border-radius: 6px; background: ${item.content_type === 'short' ? 'rgba(139, 92, 246, 0.2)' : 'rgba(13, 148, 136, 0.2)'}; display: flex; align-items: center; justify-content: center; font-size: 16px; flex-shrink: 0;">
                        ${item.content_type === 'short' ? '⚡' : '📹'}
                      </div>
                      <div style="min-width: 0;">
                        <div style="font-weight: 600; font-size: 13px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; max-width: 320px;" title="${item.title}">
                          ${item.title}
                        </div>
                        <div style="font-size: 11px; color: var(--text-dim); display: flex; gap: 8px; margin-top: 2px;">
                          <span>${new Date(item.created_at).toLocaleDateString()}</span>
                          <span>•</span>
                          <span style="color: var(--accent-cyan);">👁️ ${item.views_count.toLocaleString()} views</span>
                        </div>
                      </div>
                    </div>
                    <div style="display: flex; align-items: center; gap: 8px; flex-shrink: 0;">
                      <span class="badge ${item.status === 'uploaded' ? 'badge-emerald' : 'badge-amber'}">
                        ${item.status}
                      </span>
                      <button class="btn-cyber btn-cyber-outline btn-sm" onclick="window.viewContentModal(${item.id})">
                        VIEW
                      </button>
                    </div>
                  </div>
                `).join('') : `
                  <div style="text-align: center; padding: 32px 16px; color: var(--text-dim); font-size: 12px; background: rgba(0,0,0,0.1); border-radius: var(--radius-sm); border: 1px dashed var(--border-subtle);">
                    <span style="font-size: 26px; display: block; margin-bottom: 6px;">🎬</span>
                    No studio content available. Catalog is completely clean.
                  </div>
                `}
              </div>
            </div>

            <!-- Audit Trail Stream -->
            <div class="glass-card" style="padding: 22px;">
              <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 16px;">
                <h3 style="font-size: 15px; font-weight: 700; color: var(--text-main);">
                  📜 Live Audit Trail
                </h3>
                <button class="btn-cyber btn-cyber-outline btn-sm" onclick="window.navigateTo('audit')">
                  All Logs
                </button>
              </div>

              <div style="display: flex; flex-direction: column; gap: 8px;">
                ${recentActivity.slice(0, 5).map(log => `
                  <div style="padding: 10px 12px; background: rgba(0,0,0,0.12); border-radius: var(--radius-sm); border-left: 3px solid ${this.getActionColor(log.action)}; font-size: 12px;">
                    <div style="display: flex; justify-content: space-between; align-items: center;">
                      <span style="font-weight: 700; color: var(--text-main);">
                        ${log.username}
                      </span>
                      <span style="font-size: 10px; color: var(--text-dim);">
                        ${new Date(log.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </div>
                    <div style="margin-top: 3px; color: var(--text-muted);">
                      <span style="font-weight: 700; color: ${this.getActionColor(log.action)};">${log.action}</span>
                      <span style="color: var(--text-dim);">on</span>
                      <span>${log.entity_type}</span>
                    </div>
                  </div>
                `).join('')}
              </div>
            </div>
          </div>
        </div>
      `;

      // Render Bar Chart
      this.initBarChart(timeline);

      // Refresh Button Event
      const refreshBtn = document.getElementById('dashRefreshBtn');
      if (refreshBtn) {
        refreshBtn.onclick = () => this.render(container);
      }

      // Direct Event Listener Binding for Heatmap Window Buttons
      const dashPillBtns = document.querySelectorAll('#dashHeatmapPills .nav-pill-item');
      dashPillBtns.forEach(btn => {
        btn.addEventListener('click', (e) => {
          e.preventDefault();
          e.stopPropagation();
          const dVal = parseInt(btn.getAttribute('data-days'), 10);
          if (dVal) DashboardComponent.switchHeatmapWindow(dVal);
        });
      });

      // Direct Event Listener Binding for Deploy New Content button
      const deployBtn = container.querySelector('#dashDeployContentBtn');
      if (deployBtn) {
        deployBtn.addEventListener('click', (e) => {
          e.preventDefault();
          window.navigateTo('wizard', 'short');
        });
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

  renderTopContentProgress(items) {
    if (!items || items.length === 0) {
      return `<div style="font-size: 12px; color: var(--text-dim); text-align: center; padding: 20px;">No items available.</div>`;
    }

    const sorted = [...items].sort((a, b) => (b.views_count || 0) - (a.views_count || 0)).slice(0, 5);
    const maxViews = Math.max(...sorted.map(i => i.views_count || 1), 1);

    return sorted.map(item => {
      const pct = Math.min(Math.round(((item.views_count || 0) / maxViews) * 100), 100);
      return `
        <div>
          <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 4px; font-size: 12px;">
            <a href="${item.video_url || '#'}" target="_blank" rel="noopener" style="font-weight: 600; color: var(--text-main); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; max-width: 220px; text-decoration: none;" title="${item.title}">
              ${item.title}
            </a>
            <span style="font-family: var(--font-mono); font-weight: 700; color: var(--accent-cyan); font-size: 11px;">
              ${(item.views_count || 0).toLocaleString()} views
            </span>
          </div>
          <div style="height: 6px; width: 100%; background: rgba(255,255,255,0.06); border-radius: var(--radius-full); overflow: hidden;">
            <div style="height: 100%; width: ${pct}%; background: linear-gradient(90deg, #10b981, #0d9488); border-radius: var(--radius-full); transition: width 0.5s ease;"></div>
          </div>
        </div>
      `;
    }).join('');
  },

  switchHeatmapWindow(days) {
    this.currentHeatmapWindow = days;
    DashboardComponent.currentHeatmapWindow = days;

    // Update pill buttons active state via data-days
    const pills = document.querySelectorAll('#dashHeatmapPills .nav-pill-item');
    pills.forEach(p => {
      const pDays = parseInt(p.getAttribute('data-days'), 10);
      if (pDays === days) {
        p.classList.add('active');
      } else {
        p.classList.remove('active');
      }
    });

    // Update Badge
    const badge = document.getElementById('dashHeatmapBadge');
    if (badge) {
      badge.textContent = days === 365 ? '365 Days (1 Year)' : `${days} Days`;
    }

    // Update Submetrics Bar
    const submetrics = document.getElementById('dashHeatmapSubmetrics');
    if (submetrics) {
      submetrics.innerHTML = DashboardComponent.renderHeatmapSubmetrics(days);
    }

    // Update Grid cells and grid style
    const grid = document.getElementById('dashHeatmapGrid');
    if (grid) {
      grid.style.cssText = DashboardComponent.getHeatmapGridStyle(days);
      grid.innerHTML = DashboardComponent.generateHeatmapCells(days);
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

  renderHeatmapSubmetrics(days, fallbackTotal = 0) {
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

    return `
      <div>
        <div style="font-size: 10px; font-weight: 700; color: var(--text-dim);">PIPELINE ACTIVITY SLA</div>
        <div style="font-size: 16px; font-weight: 800; color: var(--accent-emerald); margin-top: 2px;">
          ${cadencePct}% Cadence (${activeDays} Active Days)
        </div>
      </div>
      <div>
        <div style="font-size: 10px; font-weight: 700; color: var(--text-dim);">WINDOW UPLOADS</div>
        <div style="font-size: 16px; font-weight: 800; color: var(--text-main); margin-top: 2px;">
          ${totalUploads || fallbackTotal} Items
        </div>
      </div>
      <div>
        <div style="font-size: 10px; font-weight: 700; color: var(--text-dim);">ACTIVE RELEASE WEEKS</div>
        <div style="font-size: 16px; font-weight: 800; color: var(--accent-teal); margin-top: 2px;">
          ${activeWeeksSet.size} / ${totalWeeksInWindow} Weeks
        </div>
      </div>
      <div>
        <div style="font-size: 10px; font-weight: 700; color: var(--text-dim);">FAILED RUN INCIDENTS</div>
        <div style="font-size: 16px; font-weight: 800; color: var(--text-muted); margin-top: 2px;">
          0 Unresolved
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

  initBarChart(timeline) {
    const canvas = document.getElementById('dashBarChart');
    if (!canvas) return;

    if (this.barChartInstance) {
      this.barChartInstance.destroy();
      this.barChartInstance = null;
    }

    if (!timeline || timeline.length === 0) {
      const parent = canvas.parentElement;
      if (parent) {
        parent.innerHTML = `
          <div style="display: flex; flex-direction: column; align-items: center; justify-content: center; height: 100%; color: var(--text-dim); text-align: center;">
            <span style="font-size: 36px; margin-bottom: 8px;">📊</span>
            <div style="font-size: 14px; font-weight: 700; color: var(--text-muted);">No Publishing Activity Recorded</div>
            <div style="font-size: 11px; margin-top: 4px; color: var(--text-dim);">Deploy content via Creator Wizard or ingest a YouTube channel.</div>
          </div>
        `;
      }
      return;
    }

    const labels = timeline.map(t => t.month);
    const values = timeline.map(t => t.count);

    const ctx = canvas.getContext('2d');
    this.barChartInstance = new Chart(ctx, {
      type: 'bar',
      data: {
        labels: labels,
        datasets: [
          {
            label: 'Successful Releases',
            data: values,
            backgroundColor: '#10b981', // green matching screenshot
            borderRadius: 6,
            borderSkipped: false,
            barThickness: 28
          }
        ]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: {
            display: true,
            position: 'bottom',
            labels: {
              color: '#94a3b8',
              font: { family: 'Plus Jakarta Sans', size: 11 },
              boxWidth: 12
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
            grid: { display: false },
            ticks: { color: '#64748b', font: { family: 'Plus Jakarta Sans', size: 10 } }
          },
          y: {
            grid: { color: 'rgba(255, 255, 255, 0.04)' },
            ticks: { color: '#64748b', font: { family: 'Plus Jakarta Sans', size: 10 }, stepSize: 1 },
            beginAtZero: true
          }
        }
      }
    });
  },

  getActionColor(action) {
    switch (action) {
      case 'CREATE': return '#10b981';
      case 'UPDATE': return '#0d9488';
      case 'DELETE': return '#ef4444';
      case 'MIGRATION': return '#8b5cf6';
      case 'LOGIN': return '#3b82f6';
      default: return '#64748b';
    }
  }
};

window.DashboardComponent = DashboardComponent;
window.switchDashboardHeatmapWindow = (days) => DashboardComponent.switchHeatmapWindow(days);
