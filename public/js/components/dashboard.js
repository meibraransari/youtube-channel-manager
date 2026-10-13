/**
 * Executive Channel Dashboard Component
 * Clean modern dark SaaS dashboard with rounded green bars, circular stat badges, and activity heatmap
 */
const DashboardComponent = {
  activityChartInstance: null,
  donutChartInstance: null,
  activityDays: [],
  activityDaysMap: {},
  activityMap: {},
  lastPublished: null,
  currentActivityWindow: 14,
  activityVisibility: { total: true, shorts: true, videos: true },
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
      this.lastPublished = statsData.lastPublished || null;
      this.activityMap = {};
      this.activityDaysMap = {};
      this.activityDays.forEach(a => {
        const count = parseInt(a.count, 10);
        this.activityMap[a.activity_date] = count;
        this.activityDaysMap[a.activity_date] = {
          count,
          shorts: parseInt(a.shorts || 0, 10),
          videos: parseInt(a.videos || 0, 10),
          podcasts: parseInt(a.podcasts || 0, 10),
          latest_title: a.latest_title || ''
        };
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

          <!-- Charts Grid: Activity Trajectory Line Chart + Top Content -->
          <div class="charts-grid">
            <!-- Left: Publishing & Release Activity Trajectory Line Chart -->
            <div class="glass-card tracker-trajectory-card" style="padding: 22px;">
              <!-- Header with Title, Range Selector Pills, and Dynamic Cadence Badge -->
              <div class="trajectory-card-header" style="margin-bottom: 14px;">
                <div>
                  <div style="display: flex; align-items: center; gap: 8px; flex-wrap: wrap;">
                    <h3 style="font-size: 15px; font-weight: 700; color: var(--text-main); margin: 0;">
                      📊 Publishing & Release Activity (Recent Cycles)
                    </h3>
                    <span class="badge badge-teal" id="dashActivityActiveBadge">${this.currentActivityWindow === 'all' ? 'ALL RELEASES' : `${this.currentActivityWindow}-DAY CADENCE`}</span>
                  </div>
                  <div style="font-size: 11px; color: var(--text-dim); margin-top: 3px;" id="dashActivitySubtitle">
                    ${this.getSubtitleText()}
                  </div>
                </div>

                <!-- Range Selector Pills: 7D, 14D, 30D, 90D, and All -->
                <div class="nav-pill-tabs trajectory-timeframe-pills" id="dashActivityPills">
                  <button type="button" class="nav-pill-item ${this.currentActivityWindow === 7 ? 'active' : ''}" data-window="7" onclick="DashboardComponent.switchActivityWindow(7); return false;">7D</button>
                  <button type="button" class="nav-pill-item ${this.currentActivityWindow === 14 ? 'active' : ''}" data-window="14" onclick="DashboardComponent.switchActivityWindow(14); return false;">14D</button>
                  <button type="button" class="nav-pill-item ${this.currentActivityWindow === 30 ? 'active' : ''}" data-window="30" onclick="DashboardComponent.switchActivityWindow(30); return false;">30D</button>
                  <button type="button" class="nav-pill-item ${this.currentActivityWindow === 90 ? 'active' : ''}" data-window="90" onclick="DashboardComponent.switchActivityWindow(90); return false;">90D</button>
                  <button type="button" class="nav-pill-item ${this.currentActivityWindow === 'all' ? 'active' : ''}" data-window="all" onclick="DashboardComponent.switchActivityWindow('all'); return false;">All</button>
                </div>
              </div>

              <!-- Interactive Legend Badges & Cadence KPI Bar -->
              <div class="trajectory-kpi-bar">
                <!-- Interactive Clickable Line Badges -->
                <div style="display: flex; align-items: center; gap: 10px; flex-wrap: wrap;">
                  <button type="button" id="toggleActivityTotalBtn" class="trajectory-legend-btn active-emerald" title="Click to show/hide Total Releases line" onclick="DashboardComponent.toggleActivityLine('total'); return false;">
                    <span class="legend-color-indicator emerald-dot"></span>
                    <span>Total Releases:</span>
                    <span class="legend-val" id="dashActivityTotalCount">0</span>
                  </button>
                  <button type="button" id="toggleActivityShortsBtn" class="trajectory-legend-btn active-purple" title="Click to show/hide Shorts line" onclick="DashboardComponent.toggleActivityLine('shorts'); return false;">
                    <span class="legend-color-indicator purple-dot"></span>
                    <span>Shorts (9:16):</span>
                    <span class="legend-val" id="dashActivityShortsCount">0</span>
                  </button>
                  <button type="button" id="toggleActivityVideosBtn" class="trajectory-legend-btn active-cyan" title="Click to show/hide Long Videos line" onclick="DashboardComponent.toggleActivityLine('videos'); return false;">
                    <span class="legend-color-indicator cyan-dot"></span>
                    <span>Videos (16:9):</span>
                    <span class="legend-val" id="dashActivityVideosCount">0</span>
                  </button>
                </div>

                <!-- Velocity Rates & Stream Indicator -->
                <div style="display: flex; align-items: center; gap: 14px; font-size: 11px; flex-wrap: wrap;">
                  <div style="display: flex; align-items: center; gap: 5px;">
                    <span style="color: var(--text-dim);">Last Published:</span>
                    <span style="font-family: var(--font-mono); font-weight: 700; color: #10b981;" id="dashLastPublishedDate">--</span>
                  </div>
                  <div style="display: flex; align-items: center; gap: 5px;">
                    <span style="color: var(--text-dim);">Cadence:</span>
                    <span style="font-family: var(--font-mono); font-weight: 700; color: #06b6d4;" id="dashActivityCadenceRate">--</span>
                  </div>
                  <div class="trajectory-status-indicator" id="dashActivityStreamTag">
                    <span class="live-pulse-dot"></span>
                    <span>PIPELINE ACTIVE</span>
                  </div>
                </div>
              </div>

              <!-- Canvas Container -->
              <div style="height: 290px; position: relative;">
                <canvas id="dashActivityChart"></canvas>
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

      // Render Activity Trajectory Chart
      this.initActivityChart();

      // Direct Event Listener Binding for Activity Window Buttons
      const actPillBtns = container.querySelectorAll('#dashActivityPills .nav-pill-item');
      actPillBtns.forEach(btn => {
        btn.addEventListener('click', (e) => {
          e.preventDefault();
          e.stopPropagation();
          const wVal = btn.getAttribute('data-window');
          DashboardComponent.switchActivityWindow(wVal === 'all' ? 'all' : parseInt(wVal, 10));
        });
      });

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

  getSubtitleText() {
    if (this.lastPublished && this.lastPublished.published_at) {
      const relTime = this.formatRelativeTime(this.lastPublished.published_at);
      const pubDate = new Date(this.lastPublished.published_at).toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' });
      const rawTitle = this.lastPublished.title || 'Untitled';
      const cleanTitle = rawTitle.length > 36 ? rawTitle.substring(0, 36) + '...' : rawTitle;
      return `Daily upload cadence across pipeline • Last published: <strong style="color: var(--accent-emerald);">${relTime}</strong> (${pubDate} • "${this.escapeHtml(cleanTitle)}")`;
    }
    return `Daily upload frequency and cadence across pipeline • <span style="color: var(--text-dim);">No published releases recorded yet</span>`;
  },

  formatRelativeTime(date) {
    if (!date) return 'No releases yet';
    const d = new Date(date);
    if (isNaN(d.getTime())) return 'No releases yet';
    const now = new Date();
    const diffMs = now.getTime() - d.getTime();
    if (diffMs < 0) {
      return d.toLocaleDateString([], { month: 'short', day: 'numeric' });
    }
    const diffSec = Math.floor(diffMs / 1000);
    const diffMin = Math.floor(diffSec / 60);
    const diffHours = Math.floor(diffMin / 60);
    const diffDays = Math.floor(diffHours / 24);

    if (diffMin < 1) return 'Just now';
    if (diffMin < 60) return `${diffMin}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays === 1) return 'Yesterday';
    if (diffDays < 7) return `${diffDays} days ago`;
    if (diffDays < 30) return `${Math.floor(diffDays / 7)} wk${Math.floor(diffDays / 7) === 1 ? '' : 's'} ago`;
    if (diffDays < 365) return `${Math.floor(diffDays / 30)} mo ago`;
    return d.toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' });
  },

  buildActivityData(window) {
    const now = new Date();
    let daysCount = (window === 'all') ? null : (parseInt(window, 10) || 14);

    if (window === 'all') {
      if (this.activityDays && this.activityDays.length > 0) {
        const firstDateStr = this.activityDays[0].activity_date;
        const firstDate = new Date(firstDateStr);
        const diffMs = now.getTime() - firstDate.getTime();
        const diffDays = Math.ceil(diffMs / (1000 * 60 * 60 * 24));
        daysCount = Math.max(diffDays + 1, 14);
      } else {
        daysCount = 14;
      }
    }

    const points = [];
    let totalReleases = 0;
    let totalShorts = 0;
    let totalVideos = 0;
    let activeDaysCount = 0;

    for (let i = 0; i < daysCount; i++) {
      const d = new Date(now);
      d.setDate(d.getDate() - (daysCount - 1 - i));
      const dateKey = d.toISOString().split('T')[0];
      const label = d.toLocaleDateString([], { month: 'short', day: 'numeric' });
      const fullDate = d.toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' });

      const entry = this.activityDaysMap[dateKey] || {
        count: 0,
        shorts: 0,
        videos: 0,
        podcasts: 0,
        latest_title: null
      };

      totalReleases += entry.count;
      totalShorts += entry.shorts;
      totalVideos += entry.videos;
      if (entry.count > 0) activeDaysCount++;

      points.push({
        date: d,
        dateKey,
        label,
        fullDate,
        total: entry.count,
        shorts: entry.shorts,
        videos: entry.videos,
        podcasts: entry.podcasts,
        latestTitle: entry.latest_title
      });
    }

    const effDays = Math.max(daysCount, 1);
    const dailyRate = (totalReleases / effDays).toFixed(2);
    const weeklyRate = ((totalReleases / effDays) * 7).toFixed(1);

    return {
      points,
      totalReleases,
      totalShorts,
      totalVideos,
      activeDaysCount,
      dailyRate,
      weeklyRate
    };
  },

  switchActivityWindow(window) {
    this.currentActivityWindow = window;
    DashboardComponent.currentActivityWindow = window;

    // Update pill buttons active state
    const pills = document.querySelectorAll('#dashActivityPills .nav-pill-item');
    pills.forEach(p => {
      const pWin = p.getAttribute('data-window');
      const matches = (window === 'all' && pWin === 'all') || (parseInt(pWin, 10) === window);
      if (matches) {
        p.classList.add('active');
      } else {
        p.classList.remove('active');
      }
    });

    // Update Badge
    const badge = document.getElementById('dashActivityActiveBadge');
    if (badge) {
      badge.textContent = window === 'all' ? 'ALL RELEASES' : `${window}-DAY CADENCE`;
    }

    const sub = document.getElementById('dashActivitySubtitle');
    if (sub) {
      sub.innerHTML = this.getSubtitleText();
    }

    // Re-initialize chart smoothly
    this.initActivityChart();
  },

  toggleActivityLine(metric) {
    if (metric === 'total') {
      if (this.activityVisibility.total && !this.activityVisibility.shorts && !this.activityVisibility.videos) return;
      this.activityVisibility.total = !this.activityVisibility.total;
    } else if (metric === 'shorts') {
      if (this.activityVisibility.shorts && !this.activityVisibility.total && !this.activityVisibility.videos) return;
      this.activityVisibility.shorts = !this.activityVisibility.shorts;
    } else if (metric === 'videos') {
      if (this.activityVisibility.videos && !this.activityVisibility.total && !this.activityVisibility.shorts) return;
      this.activityVisibility.videos = !this.activityVisibility.videos;
    }

    const totalBtn = document.getElementById('toggleActivityTotalBtn');
    if (totalBtn) {
      if (this.activityVisibility.total) {
        totalBtn.classList.remove('dimmed');
        totalBtn.classList.add('active-emerald');
      } else {
        totalBtn.classList.add('dimmed');
        totalBtn.classList.remove('active-emerald');
      }
    }

    const shortsBtn = document.getElementById('toggleActivityShortsBtn');
    if (shortsBtn) {
      if (this.activityVisibility.shorts) {
        shortsBtn.classList.remove('dimmed');
        shortsBtn.classList.add('active-purple');
      } else {
        shortsBtn.classList.add('dimmed');
        shortsBtn.classList.remove('active-purple');
      }
    }

    const videosBtn = document.getElementById('toggleActivityVideosBtn');
    if (videosBtn) {
      if (this.activityVisibility.videos) {
        videosBtn.classList.remove('dimmed');
        videosBtn.classList.add('active-cyan');
      } else {
        videosBtn.classList.add('dimmed');
        videosBtn.classList.remove('active-cyan');
      }
    }

    if (this.activityChartInstance) {
      this.activityChartInstance.setDatasetVisibility(0, this.activityVisibility.total);
      this.activityChartInstance.setDatasetVisibility(1, this.activityVisibility.shorts);
      this.activityChartInstance.setDatasetVisibility(2, this.activityVisibility.videos);
      this.activityChartInstance.update();
    }
  },

  initActivityChart() {
    const canvas = document.getElementById('dashActivityChart');
    if (!canvas) return;

    if (this.activityChartInstance) {
      this.activityChartInstance.destroy();
      this.activityChartInstance = null;
    }

    const data = this.buildActivityData(this.currentActivityWindow);
    const points = data.points;

    // Update KPI Bar Counters
    const totalCountEl = document.getElementById('dashActivityTotalCount');
    if (totalCountEl) totalCountEl.textContent = data.totalReleases.toLocaleString();

    const shortsCountEl = document.getElementById('dashActivityShortsCount');
    if (shortsCountEl) shortsCountEl.textContent = data.totalShorts.toLocaleString();

    const videosCountEl = document.getElementById('dashActivityVideosCount');
    if (videosCountEl) videosCountEl.textContent = data.totalVideos.toLocaleString();

    const cadenceRateEl = document.getElementById('dashActivityCadenceRate');
    if (cadenceRateEl) {
      cadenceRateEl.textContent = `+${data.weeklyRate} / wk`;
    }

    const lastPubDateEl = document.getElementById('dashLastPublishedDate');
    if (lastPubDateEl) {
      if (this.lastPublished && this.lastPublished.published_at) {
        lastPubDateEl.textContent = this.formatRelativeTime(this.lastPublished.published_at);
        lastPubDateEl.title = `${new Date(this.lastPublished.published_at).toLocaleString()} • ${this.lastPublished.title}`;
      } else {
        lastPubDateEl.textContent = 'None';
      }
    }

    const ctx = canvas.getContext('2d');
    const chartHeight = canvas.clientHeight || 280;

    // Emerald Gradient for Total Releases
    const totalGrad = ctx.createLinearGradient(0, 0, 0, chartHeight);
    totalGrad.addColorStop(0, 'rgba(16, 185, 129, 0.32)');
    totalGrad.addColorStop(0.5, 'rgba(16, 185, 129, 0.08)');
    totalGrad.addColorStop(1, 'rgba(16, 185, 129, 0.00)');

    // Purple Gradient for Shorts (9:16)
    const shortsGrad = ctx.createLinearGradient(0, 0, 0, chartHeight);
    shortsGrad.addColorStop(0, 'rgba(168, 85, 247, 0.22)');
    shortsGrad.addColorStop(0.5, 'rgba(168, 85, 247, 0.05)');
    shortsGrad.addColorStop(1, 'rgba(168, 85, 247, 0.00)');

    // Cyan Gradient for Long Videos (16:9)
    const videosGrad = ctx.createLinearGradient(0, 0, 0, chartHeight);
    videosGrad.addColorStop(0, 'rgba(6, 182, 212, 0.22)');
    videosGrad.addColorStop(0.5, 'rgba(6, 182, 212, 0.05)');
    videosGrad.addColorStop(1, 'rgba(6, 182, 212, 0.00)');

    const maxVal = Math.max(...points.map(p => Math.max(p.total, p.shorts, p.videos)), 1);

    this.activityChartInstance = new Chart(ctx, {
      type: 'line',
      data: {
        labels: points.map(p => p.label),
        datasets: [
          {
            label: 'Total Releases',
            data: points.map(p => p.total),
            borderColor: '#10b981',
            borderWidth: 2.5,
            backgroundColor: totalGrad,
            fill: true,
            tension: 0.36,
            pointRadius: (c) => {
              const pt = points[c.dataIndex];
              return (pt && pt.total > 0) ? (points.length > 35 ? 4 : 5.5) : (points.length > 35 ? 1.5 : 2.5);
            },
            pointHoverRadius: (c) => {
              const pt = points[c.dataIndex];
              return (pt && pt.total > 0) ? 8 : 5;
            },
            pointBackgroundColor: '#10b981',
            pointBorderColor: '#0b1120',
            pointBorderWidth: 2,
            hidden: !this.activityVisibility.total
          },
          {
            label: 'Shorts (9:16)',
            data: points.map(p => p.shorts),
            borderColor: '#a855f7',
            borderWidth: 2.2,
            backgroundColor: shortsGrad,
            fill: false,
            tension: 0.36,
            pointRadius: (c) => {
              const pt = points[c.dataIndex];
              return (pt && pt.shorts > 0) ? (points.length > 35 ? 3.5 : 4.5) : (points.length > 35 ? 1.5 : 2);
            },
            pointHoverRadius: 6,
            pointBackgroundColor: '#a855f7',
            pointBorderColor: '#0b1120',
            pointBorderWidth: 2,
            hidden: !this.activityVisibility.shorts
          },
          {
            label: 'Videos (16:9)',
            data: points.map(p => p.videos),
            borderColor: '#06b6d4',
            borderWidth: 2.2,
            backgroundColor: videosGrad,
            fill: false,
            tension: 0.36,
            pointRadius: (c) => {
              const pt = points[c.dataIndex];
              return (pt && pt.videos > 0) ? (points.length > 35 ? 3.5 : 4.5) : (points.length > 35 ? 1.5 : 2);
            },
            pointHoverRadius: 6,
            pointBackgroundColor: '#06b6d4',
            pointBorderColor: '#0b1120',
            pointBorderWidth: 2,
            hidden: !this.activityVisibility.videos
          }
        ]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        animation: {
          duration: 650,
          easing: 'easeOutQuart'
        },
        interaction: {
          mode: 'index',
          intersect: false
        },
        plugins: {
          legend: {
            display: false
          },
          tooltip: {
            backgroundColor: 'rgba(15, 23, 42, 0.95)',
            titleColor: '#f8fafc',
            titleFont: { family: 'Plus Jakarta Sans', size: 12, weight: '700' },
            bodyColor: '#cbd5e1',
            bodyFont: { family: 'JetBrains Mono', size: 11, weight: '500' },
            borderColor: 'rgba(255, 255, 255, 0.12)',
            borderWidth: 1,
            padding: 12,
            boxPadding: 6,
            usePointStyle: true,
            callbacks: {
              title: (items) => {
                if (!items.length) return '';
                const idx = items[0].dataIndex;
                return points[idx]?.fullDate || items[0].label;
              },
              afterTitle: (items) => {
                if (!items.length) return '';
                const idx = items[0].dataIndex;
                const pt = points[idx];
                if (pt && pt.total > 0 && pt.latestTitle) {
                  const safeTitle = pt.latestTitle.length > 40 ? pt.latestTitle.substring(0, 40) + '...' : pt.latestTitle;
                  return `🎬 Published: "${safeTitle}"`;
                }
                if (pt && pt.total === 0) {
                  return '💤 No releases recorded on this date';
                }
                return '';
              },
              label: (context) => {
                const val = context.raw || 0;
                if (context.datasetIndex === 0) {
                  return ` 🚀 Total Releases: ${val}`;
                } else if (context.datasetIndex === 1) {
                  return ` ⚡ Shorts (9:16): ${val}`;
                } else {
                  return ` 📹 Videos (16:9): ${val}`;
                }
              }
            }
          }
        },
        scales: {
          x: {
            grid: {
              color: 'rgba(255, 255, 255, 0.04)',
              drawBorder: false
            },
            ticks: {
              color: '#64748b',
              font: { family: 'Plus Jakarta Sans', size: 10, weight: '500' },
              maxRotation: 0,
              autoSkip: true,
              maxTicksLimit: points.length > 60 ? 12 : 8,
              padding: 6
            }
          },
          y: {
            type: 'linear',
            beginAtZero: true,
            grid: {
              color: 'rgba(255, 255, 255, 0.04)',
              drawBorder: false
            },
            ticks: {
              color: '#10b981',
              font: { family: 'JetBrains Mono', size: 10, weight: '600' },
              stepSize: 1,
              precision: 0,
              padding: 8
            },
            title: {
              display: true,
              text: 'DAILY RELEASES',
              color: '#10b981',
              font: { family: 'Plus Jakarta Sans', size: 9, weight: '700' }
            },
            suggestedMax: Math.max(maxVal + 1, 3)
          }
        }
      }
    });
  },

  escapeHtml(str) {
    if (!str) return '';
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
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
window.switchDashboardActivityWindow = (w) => DashboardComponent.switchActivityWindow(w);
window.toggleDashboardActivityLine = (m) => DashboardComponent.toggleActivityLine(m);
window.switchDashboardHeatmapWindow = (days) => DashboardComponent.switchHeatmapWindow(days);

