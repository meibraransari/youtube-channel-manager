/**
 * MySQL to PostgreSQL 18 Migration Console Component
 */
const MigrationComponent = {
  async render(container) {
    container.innerHTML = `
      <div style="display: flex; align-items: center; justify-content: center; height: 300px;">
        <div style="font-family: var(--font-tech); color: var(--neon-cyan);">
          CONNECTING TO MIGRATION ENGINE...
        </div>
      </div>
    `;

    try {
      const statusRes = await API.migration.getStatus();
      const { currentTotalContentItems, referenceFileAvailable, history } = statusRes;

      container.innerHTML = `
        <div style="max-width: 960px; margin: 0 auto;">
          <!-- Header -->
          <div class="glass-card" style="padding: 24px; margin-bottom: 24px; border-color: #8b5cf6;">
            <div style="display: flex; align-items: center; justify-content: space-between; flex-wrap: wrap; gap: 16px;">
              <div style="display: flex; align-items: center; gap: 16px;">
                <div style="width: 56px; height: 56px; border-radius: 14px; background: linear-gradient(135deg, #8b5cf6, #0d9488); display: flex; align-items: center; justify-content: center; font-size: 28px; box-shadow: 0 0 20px rgba(139, 92, 246, 0.4);">
                  🔒
                </div>
                <div>
                  <div style="display: flex; align-items: center; gap: 10px;">
                    <h1 style="font-size: 20px; font-weight: 800; color: var(--text-main);">
                      SECRET ADMIN MIGRATION PORTAL
                    </h1>
                    <span class="badge badge-violet" style="font-size: 10px;">ADMIN CONFIDENTIAL</span>
                  </div>
                  <p style="color: var(--text-muted); font-size: 13px; margin-top: 4px;">
                    Internal ingestion console to convert legacy MySQL tables (<code>sql11-10-2026_data.sql</code>) or custom SQL dumps into PostgreSQL 18 format.
                  </p>
                </div>
              </div>
              <div style="text-align: right;">
                <span class="badge badge-teal" style="font-size: 12px; padding: 6px 14px;">
                  POSTGRESQL TOTAL: ${currentTotalContentItems} ITEMS
                </span>
              </div>
            </div>
          </div>

          <!-- Section 1: One-Click Primary Migration (from sql11-10-2026_data.sql) -->
          <div class="glass-card" style="padding: 24px; margin-bottom: 24px;">
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 14px; flex-wrap: wrap; gap: 10px;">
              <div>
                <h3 style="font-family: var(--font-tech); font-size: 16px; color: var(--neon-cyan);">
                  ⚡ ONE-CLICK REFERENCE MIGRATION
                </h3>
                <p style="font-size: 12px; color: var(--text-muted); margin-top: 2px;">
                  Source Reference File: <code>sql11-10-2026_data.sql</code> (Sample MySQL Channel Dump)
                </p>
              </div>
              <div>
                <span class="badge ${referenceFileAvailable ? 'badge-emerald' : 'badge-amber'}">
                  ${referenceFileAvailable ? 'FILE DETECTED ON SERVER' : 'REFERENCE FILE MISSING'}
                </span>
              </div>
            </div>

            <div style="background: rgba(0,0,0,0.25); border-radius: 10px; padding: 18px; border: 1px solid var(--border-subtle); margin-bottom: 18px;">
              <ul style="font-size: 12px; color: var(--text-dim); line-height: 1.8; list-style-position: inside;">
                <li>Parses 90 rows containing titles, topics, AI prompts, tags, and status</li>
                <li>Converts MariaDB/MySQL UUIDs and fixes non-standard keys</li>
                <li>Enforces 500 characters max constraint on tags field</li>
                <li>Automatically maps <code>https://youtube.com/shorts/...</code> to <strong>Shorts/Reels</strong></li>
                <li>Uses <code>ON CONFLICT (media_uuid) DO UPDATE</code> so re-running is 100% safe and idempotent</li>
              </ul>
            </div>

            <button class="btn-cyber btn-cyber-primary" id="runReferenceMigBtn" style="padding: 12px 24px; font-size: 14px;">
              <span>🚀</span> EXECUTE MIGRATION TO POSTGRESQL 18
            </button>
            <div id="migrationFeedback" style="margin-top: 14px; font-size: 13px; display: none;"></div>
          </div>

          <!-- Section 2: Upload Custom MySQL SQL File -->
          <div class="glass-card" style="padding: 24px; margin-bottom: 24px;">
            <h3 style="font-family: var(--font-tech); font-size: 16px; color: var(--neon-violet); margin-bottom: 6px;">
              📂 CUSTOM MYSQL FILE UPLOAD & INGESTION
            </h3>
            <p style="font-size: 12px; color: var(--text-muted); margin-bottom: 16px;">
              Upload any new MySQL dump file (.sql) to parse and ingest into the PostgreSQL content database.
            </p>

            <div style="border: 2px dashed var(--border-color); border-radius: 12px; padding: 30px; text-align: center; cursor: pointer; transition: all 0.2s;" id="dropzoneBox" onclick="document.getElementById('sqlFileInput').click()">
              <input type="file" id="sqlFileInput" accept=".sql" style="display: none;" />
              <div style="font-size: 36px; margin-bottom: 10px;">📄</div>
              <div style="font-weight: 700; font-size: 14px; color: var(--text-main);">
                Select or Drop MySQL Dump File (.sql)
              </div>
              <div id="selectedFileName" style="font-size: 12px; color: var(--neon-cyan); margin-top: 6px; font-family: var(--font-mono);">
                No file chosen
              </div>
            </div>

            <div style="margin-top: 16px; display: flex; justify-content: flex-end;">
              <button class="btn-cyber btn-cyber-secondary" id="uploadSqlBtn" disabled style="opacity: 0.5;">
                <span>📤</span> UPLOAD & MIGRATE DUMP
              </button>
            </div>
          </div>

          <!-- Section 3: Migration Audit & History -->
          <div class="glass-card" style="padding: 24px;">
            <h3 style="font-family: var(--font-tech); font-size: 16px; margin-bottom: 14px;">
              📜 MIGRATION RUN AUDIT TRAIL
            </h3>

            <div class="table-responsive">
              <table class="cyber-table">
                <thead>
                  <tr>
                    <th>SOURCE</th>
                    <th>RECORDS PROCESSED</th>
                    <th>STATUS</th>
                    <th>TIMESTAMP</th>
                  </tr>
                </thead>
                <tbody>
                  ${history.length > 0 ? history.map(h => `
                    <tr>
                      <td style="font-family: var(--font-mono); font-size: 12px; color: var(--neon-cyan);">${h.source_type}</td>
                      <td style="font-weight: 700;">${h.records_migrated} items</td>
                      <td>
                        <span class="badge ${h.status === 'success' ? 'badge-emerald' : 'badge-magenta'}">
                          ${h.status.toUpperCase()}
                        </span>
                      </td>
                      <td style="font-size: 11px; color: var(--text-dim); font-family: var(--font-mono);">
                        ${new Date(h.created_at).toLocaleString()}
                      </td>
                    </tr>
                  `).join('') : `
                    <tr><td colspan="4" style="text-align: center; color: var(--text-dim);">No previous migrations logged.</td></tr>
                  `}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      `;

      // Handlers
      const runRefBtn = document.getElementById('runReferenceMigBtn');
      const feedback = document.getElementById('migrationFeedback');
      runRefBtn.onclick = async () => {
        runRefBtn.disabled = true;
        runRefBtn.innerHTML = `<span>⏳</span> MIGRATING DATA TO POSTGRESQL...`;
        feedback.style.display = 'block';
        feedback.innerHTML = `<span style="color: var(--neon-cyan);">Parsing SQL dump and committing to PostgreSQL 18...</span>`;

        try {
          const res = await API.migration.runReference();
          feedback.innerHTML = `
            <div class="glass-card" style="padding: 14px; border-color: var(--neon-emerald); background: rgba(16, 185, 129, 0.1);">
              <span style="color: var(--neon-emerald); font-weight: 700;">✅ ${res.message}</span>
              <div style="font-size: 11px; color: var(--text-muted); margin-top: 4px;">
                Total Parsed: ${res.stats.totalParsed} | New Inserted: ${res.stats.inserted} | Updated: ${res.stats.updated}
              </div>
            </div>
          `;
          Toast.show(res.message, 'success');
          setTimeout(() => MigrationComponent.render(container), 2500);
        } catch (err) {
          feedback.innerHTML = `<span style="color: #ef4444;">❌ Migration Error: ${err.message}</span>`;
          Toast.show(`Migration failed: ${err.message}`, 'error');
          runRefBtn.disabled = false;
          runRefBtn.innerHTML = `<span>🚀</span> EXECUTE MIGRATION TO POSTGRESQL 18`;
        }
      };

      const fileInput = document.getElementById('sqlFileInput');
      const uploadBtn = document.getElementById('uploadSqlBtn');
      const nameDisp = document.getElementById('selectedFileName');

      fileInput.onchange = () => {
        if (fileInput.files.length > 0) {
          nameDisp.textContent = `Selected: ${fileInput.files[0].name} (${(fileInput.files[0].size / 1024).toFixed(1)} KB)`;
          uploadBtn.disabled = false;
          uploadBtn.style.opacity = '1';
        }
      };

      uploadBtn.onclick = async () => {
        if (!fileInput.files.length) return;
        uploadBtn.disabled = true;
        uploadBtn.innerHTML = `<span>⏳</span> UPLOADING & INGESTING...`;

        try {
          const formData = new FormData();
          formData.append('sqlFile', fileInput.files[0]);
          const res = await API.migration.upload(formData);
          Toast.show(res.message, 'success');
          MigrationComponent.render(container);
        } catch (err) {
          Toast.show(`Upload migration failed: ${err.message}`, 'error');
          uploadBtn.disabled = false;
          uploadBtn.innerHTML = `<span>📤</span> UPLOAD & MIGRATE DUMP`;
        }
      };

    } catch (err) {
      container.innerHTML = `
        <div class="glass-card" style="padding: 30px; text-align: center; color: #ef4444;">
          Failed to load migration status: ${err.message}
        </div>
      `;
    }
  }
};

window.MigrationComponent = MigrationComponent;
