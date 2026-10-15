const { query } = require('../config/db');
const { logger } = require('../config/logger');

/**
 * Service to manage initial setup and demo data population
 */
const DemoDataService = {
  /**
   * Check if initial setup is completed
   */
  async isInitialSetupDone() {
    try {
      const res = await query("SELECT value FROM system_settings WHERE key = 'initial_setup_done'");
      if (res.rows.length === 0) {
        return false;
      }
      const val = res.rows[0].value;
      return val === true || val === 'true';
    } catch (err) {
      logger.error(`[DEMO-SERVICE] Error checking initial_setup_done: ${err.message}`);
      return false;
    }
  },

  /**
   * Set initial setup status
   */
  async setInitialSetupStatus(done, updatedBy = null) {
    await query(
      `INSERT INTO system_settings (key, value, category, description, updated_at, updated_by)
       VALUES ('initial_setup_done', $1, 'general', 'Indicates whether initial studio onboarding setup has been completed (demo data loaded or production mode chosen)', CURRENT_TIMESTAMP, $2)
       ON CONFLICT (key) DO UPDATE SET
        value = EXCLUDED.value,
        updated_at = CURRENT_TIMESTAMP,
        updated_by = EXCLUDED.updated_by`,
      [JSON.stringify(Boolean(done)), updatedBy]
    );
  },

  /**
   * Seed comprehensive sample / demo data across ALL tables
   */
  async seedAllDemoData(userId = null) {
    logger.info('[DEMO-DATA] Commencing full demo data population across all database tables...');

    // 1. Seed Managed Channels (2 channels)
    const ch1Id = 'c1000000-0000-0000-0000-000000000001';
    const ch2Id = 'c1000000-0000-0000-0000-000000000002';

    await query(`
      INSERT INTO channels (id, name, handle, channel_url, author_name, subscriber_count, total_views, video_count, is_default)
      VALUES 
        ($1, 'Cloud Native Studio', '@CloudNativeStudio', 'https://www.youtube.com/@CloudNativeStudio', 'Ibrar Ansari', 54200, 1850000, 42, TRUE),
        ($2, 'DevSecOps Daily', '@DevSecOpsDaily', 'https://www.youtube.com/@DevSecOpsDaily', 'Security Operations Lead', 23100, 740000, 28, FALSE)
      ON CONFLICT (id) DO UPDATE SET
        name = EXCLUDED.name,
        handle = EXCLUDED.handle,
        channel_url = EXCLUDED.channel_url,
        author_name = EXCLUDED.author_name,
        subscriber_count = EXCLUDED.subscriber_count,
        total_views = EXCLUDED.total_views,
        video_count = EXCLUDED.video_count,
        is_default = EXCLUDED.is_default
    `, [ch1Id, ch2Id]);

    // 2. Seed 14 Daily Historical Snapshots for each channel (for rich Chart.js trajectory curves)
    await query('DELETE FROM channel_snapshots WHERE channel_id IN ($1, $2)', [ch1Id, ch2Id]);

    const now = Date.now();
    for (let day = 14; day >= 0; day--) {
      const snapDate = new Date(now - day * 86400000);
      
      // Channel 1 progression
      const ch1Subs = 48000 + (14 - day) * 440;
      const ch1Views = 1500000 + (14 - day) * 25000;
      const ch1Vids = 38 + Math.floor((14 - day) / 3);

      await query(`
        INSERT INTO channel_snapshots (channel_id, subscriber_count, total_views, video_count, recorded_at)
        VALUES ($1, $2, $3, $4, $5)
      `, [ch1Id, ch1Subs, ch1Views, ch1Vids, snapDate]);

      // Channel 2 progression
      const ch2Subs = 19500 + (14 - day) * 257;
      const ch2Views = 580000 + (14 - day) * 11400;
      const ch2Vids = 24 + Math.floor((14 - day) / 4);

      await query(`
        INSERT INTO channel_snapshots (channel_id, subscriber_count, total_views, video_count, recorded_at)
        VALUES ($1, $2, $3, $4, $5)
      `, [ch2Id, ch2Subs, ch2Views, ch2Vids, snapDate]);
    }

    // 3. Seed Content Items (10 items: 5 Shorts 9:16, 4 Videos 16:9, 1 Podcast)
    await query('DELETE FROM content_items WHERE media_uuid LIKE \'e1000000-0000-0000-0000-%\'');

    const sampleContent = [
      {
        media_uuid: 'e1000000-0000-0000-0000-000000000001',
        channel_id: ch1Id,
        content_type: 'short',
        topic: 'Database Optimization',
        title: 'Top 3 PostgreSQL 18 Performance Hacks You Need!',
        description: 'Supercharge your PostgreSQL 18 database with composite indexing, autovacuum tuning, and connection pooling.',
        tags: 'postgresql, database, pg18, sql, performance, indexing',
        video_url: 'https://youtube.com/shorts/sample1',
        status: 'uploaded',
        views_count: 24800,
        likes_count: 1840,
        comments_count: 142,
        uploaded_at: new Date(now - 86400000 * 5)
      },
      {
        media_uuid: 'e1000000-0000-0000-0000-000000000002',
        channel_id: ch1Id,
        content_type: 'short',
        topic: 'Docker & Containers',
        title: 'Secret Docker Compose Volume Mount Trick',
        description: 'Stop mounting entire directories! Use targeted sub-volume mounts for high performance in Node and Python containers.',
        tags: 'docker, containers, devops, microservices, linux',
        video_url: 'https://youtube.com/shorts/sample2',
        status: 'uploaded',
        views_count: 31200,
        likes_count: 2450,
        comments_count: 188,
        uploaded_at: new Date(now - 86400000 * 3)
      },
      {
        media_uuid: 'e1000000-0000-0000-0000-000000000003',
        channel_id: ch2Id,
        content_type: 'short',
        topic: 'Kubernetes & Cloud',
        title: 'Kubernetes Pod CrashLoopBackOff: Fixed in 30 Seconds',
        description: 'Quick guide to debugging and fixing CrashLoopBackOff errors in Kubernetes deployments.',
        tags: 'kubernetes, k8s, devops, cloud, microservices',
        video_url: 'https://youtube.com/shorts/sample3',
        status: 'scheduled',
        views_count: 0,
        likes_count: 0,
        comments_count: 0,
        scheduled_for: new Date(now + 86400000 * 2)
      },
      {
        media_uuid: 'e1000000-0000-0000-0000-000000000004',
        channel_id: ch2Id,
        content_type: 'short',
        topic: 'Cybersecurity & RBAC',
        title: 'Why You Should Stop Using Default Linux Passwords',
        description: 'Protecting root accounts from automated brute force attacks with key-based authentication and fail2ban.',
        tags: 'security, cybersecurity, rbac, devsecops, linux',
        status: 'pending',
        views_count: 0,
        likes_count: 0,
        comments_count: 0
      },
      {
        media_uuid: 'e1000000-0000-0000-0000-000000000005',
        channel_id: ch1Id,
        content_type: 'short',
        topic: 'Development & Architecture',
        title: 'Node.js 20 Event Loop Explained Fast',
        description: 'Microtasks vs Macrotasks in Node.js 20 LTS runtime and event queue prioritization.',
        tags: 'nodejs, javascript, backend, performance',
        status: 'draft',
        views_count: 0,
        likes_count: 0,
        comments_count: 0
      },
      {
        media_uuid: 'e1000000-0000-0000-0000-000000000006',
        channel_id: ch1Id,
        content_type: 'video',
        topic: 'DevOps & Cloud',
        title: 'Complete Production Docker Compose & PostgreSQL 18 Deployment Guide',
        description: 'Full step-by-step masterclass deploying containerized PostgreSQL 18 with persistent volumes, zero-downtime rolling updates, and healthcheck probes.',
        tags: 'docker, postgresql, deployment, devops, production, cloud',
        video_url: 'https://youtube.com/watch?v=sample6',
        status: 'uploaded',
        views_count: 58400,
        likes_count: 4200,
        comments_count: 360,
        uploaded_at: new Date(now - 86400000 * 8)
      },
      {
        media_uuid: 'e1000000-0000-0000-0000-000000000007',
        channel_id: ch1Id,
        content_type: 'video',
        topic: 'System Design',
        title: 'Building Multi-Channel Studio Architecture with Node.js & Alpine',
        description: 'Deep dive into multi-tenant database partitioning, connection pooling, and responsive SaaS interfaces.',
        tags: 'system design, software architecture, scalability, microservices',
        video_url: 'https://youtube.com/watch?v=sample7',
        status: 'uploaded',
        views_count: 29100,
        likes_count: 2180,
        comments_count: 195,
        uploaded_at: new Date(now - 86400000 * 4)
      },
      {
        media_uuid: 'e1000000-0000-0000-0000-000000000008',
        channel_id: ch2Id,
        content_type: 'video',
        topic: 'DevOps & CI/CD Pipelines',
        title: 'Full End-to-End Automated CI/CD Pipeline with GitHub Actions',
        description: 'Automate testing, linting, Docker multi-arch container builds, and deployment on every git push.',
        tags: 'devops, cicd, github actions, automation, continuous integration',
        status: 'scheduled',
        views_count: 0,
        likes_count: 0,
        comments_count: 0,
        scheduled_for: new Date(now + 86400000 * 4)
      },
      {
        media_uuid: 'e1000000-0000-0000-0000-000000000009',
        channel_id: ch2Id,
        content_type: 'video',
        topic: 'Database & Architecture',
        title: 'PostgreSQL 18 vs MySQL 8.4: Deep Architectural Benchmark',
        description: 'Head-to-head performance analysis of read throughput, transactional ACID concurrency, and JSON query latency.',
        tags: 'database, postgresql, mysql, benchmark, sql',
        status: 'pending',
        views_count: 0,
        likes_count: 0,
        comments_count: 0
      },
      {
        media_uuid: 'e1000000-0000-0000-0000-000000000010',
        channel_id: ch1Id,
        content_type: 'podcast',
        topic: 'Cloud Native Trends',
        title: 'The Future of Cloud Native DevOps & Platform Engineering',
        description: 'Episode 1: How internal developer platforms (IDPs) and container orchestrators are transforming software delivery.',
        tags: 'cloud native, devops, platform engineering, podcast, tech',
        video_url: 'https://youtube.com/watch?v=sample10',
        status: 'uploaded',
        views_count: 14200,
        likes_count: 980,
        comments_count: 85,
        uploaded_at: new Date(now - 86400000 * 10)
      }
    ];

    for (const c of sampleContent) {
      await query(`
        INSERT INTO content_items (
          media_uuid, channel_id, content_type, topic, title, description, tags, 
          video_url, status, views_count, likes_count, comments_count, 
          created_at, updated_at, uploaded_at, scheduled_at, created_by
        ) VALUES (
          $1, $2, $3, $4, $5, $6, $7, 
          $8, $9, $10, $11, $12, 
          CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, $13, $14, $15
        )
      `, [
        c.media_uuid, c.channel_id, c.content_type, c.topic, c.title, c.description, c.tags,
        c.video_url || null, c.status, c.views_count || 0, c.likes_count || 0, c.comments_count || 0,
        c.uploaded_at || null, c.scheduled_for || null, userId
      ]);
    }

    // 4. Seed Subscribed Channels (6 channels)
    const sampleSubscriptions = [
      { channel_title: 'Docker', channel_handle: '@docker', category: 'DevOps & Cloud', subscriber_count: 350000, channel_id_str: 'UC_x5XG1OV2P6uZZ5FSM9Ttw' },
      { channel_title: 'Kubernetes', channel_handle: '@kubernetes', category: 'DevOps & Cloud', subscriber_count: 220000, channel_id_str: 'UCvqaG47n89P6U1E7Iqf_zTQ' },
      { channel_title: 'PostgreSQL Conference', channel_handle: '@postgresqlconf', category: 'Development', subscriber_count: 95000, channel_id_str: 'UC5_pgz7gD_PqU6nQ_9L2rWA' },
      { channel_title: 'Linux Foundation', channel_handle: '@linuxfoundation', category: 'Networking & Security', subscriber_count: 480000, channel_id_str: 'UCfX55Sx5hEFzF2mC0mHhVzA' },
      { channel_title: 'n8n.io Automation', channel_handle: '@n8n-io', category: 'AI & Machine Learning', subscriber_count: 140000, channel_id_str: 'UC0jL3_5Kz17uE1jX7wzT9QA' },
      { channel_title: 'Fireship', channel_handle: '@fireship', category: 'Development', subscriber_count: 3200000, channel_id_str: 'UCsBjURrP688zK4HC62zQdYg' }
    ];

    for (const s of sampleSubscriptions) {
      await query(`
        INSERT INTO channel_subscriptions (
          channel_id, subscribed_channel_id, subscribed_channel_title, subscribed_channel_handle, 
          category, subscriber_count, description
        ) VALUES ($1, $2, $3, $4, $5, $6, 'Sample curated subscription')
        ON CONFLICT (channel_id, subscribed_channel_id) DO NOTHING
      `, [ch1Id, s.channel_id_str, s.channel_title, s.channel_handle, s.category, s.subscriber_count]);
    }

    // 5. Seed Tag Presets (10 presets)
    await query(`
      INSERT INTO tag_presets (id, name, category, tags, is_system)
      VALUES
        ('preset-postgres', 'PostgreSQL & Database', 'Database', 'postgresql, database, pg18, sql, rdbms, performance, indexing, backend, data modeling', TRUE),
        ('preset-kubernetes', 'Kubernetes & Cloud', 'Cloud & DevOps', 'kubernetes, k8s, containers, devops, cloud, microservices, helm, cluster, cloud native', TRUE),
        ('preset-docker', 'Docker & Microservices', 'DevOps', 'docker, docker compose, microservices, containers, devops, linux, deployment', TRUE),
        ('preset-automation', 'AI & Automation', 'AI & ML', 'ai, machine learning, automation, llm, artificial intelligence, deep learning, workflow', TRUE),
        ('preset-nodejs', 'Node.js & Backend Architecture', 'Development', 'nodejs, javascript, backend, express, rest api, web development, fullstack, software', TRUE),
        ('preset-devops', 'DevOps & CI/CD Pipelines', 'DevOps', 'devops, cicd, github actions, automation, continuous integration, deployment, sre', TRUE),
        ('preset-shorts', 'YouTube Shorts Growth', 'YouTube', 'shorts, youtube shorts, content creator, viral, trending, algorithm, tech tips, coding', TRUE),
        ('preset-system-design', 'System Design & Scalability', 'Architecture', 'system design, software architecture, scalability, high availability, cloud native, distributed systems', TRUE),
        ('preset-security', 'Cybersecurity & RBAC', 'Security', 'security, authentication, jwt, rbac, cybersecurity, infosec, access control, devsecops', TRUE),
        ('preset-frontend', 'Modern Web & UI/UX Design', 'Frontend', 'frontend, ui, ux, responsive design, css, javascript, web design, modern web', TRUE)
      ON CONFLICT (id) DO NOTHING;
    `);

    // 6. Seed n8n Workflows (4 workflows)
    await query(`
      INSERT INTO n8n_workflows (id, name, category, description, webhook_url, payload_template, timeout_seconds, is_active)
      VALUES
        (
            'wf-metadata-enricher',
            '🤖 AI Metadata & SEO Description Auto-Enricher',
            'AI & SEO',
            'Sends video titles and raw topics to an n8n AI agent to generate engaging YouTube descriptions, chapter timestamps, and SEO tags.',
            'http://localhost:5678/webhook/yt-metadata-enricher',
            '{"content_type": "short", "title": "Top PostgreSQL 18 Performance Hacks", "topic": "Database Optimization"}',
            30,
            TRUE
        ),
        (
            'wf-social-cross-poster',
            '📢 Social Multi-Platform Cross-Poster',
            'Publishing',
            'Dispatches release metadata for newly published videos across X (Twitter), LinkedIn, Discord, and Telegram communities.',
            'http://localhost:5678/webhook/social-crosspost',
            '{"title": "New Video Live!", "video_url": "https://youtube.com/shorts/sample", "platforms": ["twitter", "linkedin", "discord"]}',
            30,
            TRUE
        ),
        (
            'wf-thumbnail-generator',
            '🎨 Automated Thumbnail Asset Renderer',
            'AI & SEO',
            'Triggers n8n image generation pipeline using Midjourney/DALL-E/Flux nodes to produce 16:9 and 9:16 high-resolution thumbnail graphics.',
            'http://localhost:5678/webhook/generate-thumbnails',
            '{"aspect_ratio": "16:9", "prompt": "Futuristic neon cloud server room with vibrant teal illumination", "resolution": "1920x1080"}',
            45,
            TRUE
        ),
        (
            'wf-weekly-analytics-digest',
            '📊 Weekly Telemetry & Audience Growth Pipeline',
            'Telemetry',
            'Aggregates rolling 7-day velocity metrics and subscriber milestones and exports them directly into Notion / Google Sheets.',
            'http://localhost:5678/webhook/weekly-telemetry-digest',
            '{"range_days": 7, "channel": "all", "notify_slack": true}',
            30,
            TRUE
        )
      ON CONFLICT (id) DO NOTHING;
    `);

    // 7. Seed Topic Notes & Instructions (5 notes)
    await query(`
      INSERT INTO notes (id, title, topic, category, content, tags, color, is_pinned)
      VALUES
        (
            'a1000000-0000-0000-0000-000000000001',
            '🚀 YouTube Shorts Viral Algorithm & Retention Playbook',
            'YouTube Strategy',
            'guideline',
            '# 🚀 YouTube Shorts Viral Algorithm & Retention Playbook\n\n> **Executive Rule of Thumb:** In vertical short-form video (9:16), the first **1.8 seconds** determine 80% of your reach. If the viewer does not commit immediately, the recommendation engine ceases distribution.\n\n---\n\n## ⏱️ The 3-Phase Retention Framework\n\n\`\`\`\nPhase 1: Visual Shock / Paradox (0:00 - 0:02)\n   └── Break expectation, fast zoom, or high-contrast caption.\nPhase 2: High-Velocity Knowledge Delivery (0:02 - 0:45)\n   └── Rapid problem/solution steps. Zero filler phrases like "welcome back".\nPhase 3: The Seamless Infinite Loop (End -> Beginning)\n   └── Connect final sentence seamlessly back into the opening hook.\n\`\`\`\n\n---\n\n## 🎯 Target Benchmarks for Viral Distribution\n\n| Metric | Minimum Baseline | Viral Velocity Tier | Action Directive |\n| :--- | :--- | :--- | :--- |\n| **Viewed vs Swiped Away** | \`> 72%\` | \`> 85%\` | Test tighter opening hooks and motion graphics |\n| **Average Percentage Viewed (APV)** | \`> 100%\` | \`> 135%\` | Script seamless loopback endings |\n| **Audience Engagement Ratio** | \`> 6.5%\` | \`> 12%\` | Pin engaging curiosity questions in top comment |\n\n---\n\n## 📋 Pre-Publishing Checklist\n\n- [x] Video formatted strictly as vertical 9:16 (\`1080x1920\` minimum resolution).\n- [x] Safe zones respected (no critical text covered by like/comment UI overlays).\n- [x] High-contrast dynamic captions enabled with active word highlighting.\n- [x] 3 to 5 hyper-targeted niche tags applied (e.g. \`#DevOps #Docker #PostgreSQL\`).\n- [x] Pinned comment ready with a community discussion trigger.',
            'algorithm, viral, shorts, retention, youtube',
            '#a855f7',
            TRUE
        ),
        (
            'a1000000-0000-0000-0000-000000000002',
            '🐳 Production Docker Compose & PostgreSQL 18 Deployment SOP',
            'DevOps & Cloud',
            'instruction',
            '# 🐳 Production Docker Compose & PostgreSQL 18 Deployment SOP\n\nStandard Operating Procedure for deploying and maintaining containerized PostgreSQL 18 and Node.js microservices in hardened production environments.\n\n---\n\n## 🛡️ Pre-Flight Environment Sanity Checks\n\n1. **Verify Volume Mount Permissions**: Ensure \`./media\` and \`./database\` host directories are properly owned by non-root daemon users.\n2. **Environment Variable Parity**: Audit \`.env\` against \`.env.example\` before triggering container initialization:\n   \`\`\`bash\n   # Validate environment configuration\n   docker compose config --quiet\n   \`\`\`\n\n---\n\n## 🚀 Zero-Downtime Deployment Lifecycle\n\nExecute sequential rolling updates to maintain 99.98% uptime:\n\n\`\`\`bash\n# 1. Pull base runtime layers & build production artifact\ndocker compose build --pull yt-manager\n\n# 2. Verify PostgreSQL container health status\ndocker inspect --format="{{.State.Health.Status}}" postgres18\n\n# 3. Apply schema migrations idempotently\ndocker exec -i postgres18 psql -U postgres -d youtube_channel_manager_db -f /docker-entrypoint-initdb.d/init.sql\n\n# 4. Recreate application container with zero-cache assets\ndocker compose up -d --no-deps yt-manager\n\`\`\`\n\n---\n\n## 🩺 Post-Deployment Observability Checklist\n\n- [ ] Check \`/health\` endpoint reports \`status: "pass"\` and PostgreSQL latency \`< 5ms\`.\n- [ ] Verify Winston logging is capturing at \`INFO\` or \`DEBUG\` level.\n- [ ] Inspect memory consumption: \`docker stats --no-stream\`.\n- [ ] Confirm persistent \`./media\` directory volume mount is writable.',
            'docker, postgres, deployment, sop, devops',
            '#06b6d4',
            TRUE
        ),
        (
            'a1000000-0000-0000-0000-000000000003',
            '🎨 High-CTR Thumbnail Design Directives & Midjourney Prompt Templates',
            'Thumbnails & Graphics',
            'instruction',
            '# 🎨 High-CTR Thumbnail Directives & Prompt Templates\n\n> **Core Philosophy:** A YouTube thumbnail is not an illustration of your video; it is a **billboard advertising an irresistible question**.\n\n---\n\n## 👁️ Visual Hierarchy Rule of Thirds\n\n1. **Primary Focal Point (Left 60%)**: High-emotion human expression, glowing 3D asset, or dramatic contrast element.\n2. **Complementary Text (Right 40%)**: Maximum 3 to 4 punchy words. Never repeat the exact video title.\n3. **Lighting & Contrast**: Deep background (\`#070913\`) with electric cyan (\`#06b6d4\`) and neon amber (\`#f59e0b\`) rim lighting.\n\n---\n\n## 🤖 Curated Midjourney / Flux Prompt Templates\n\n### Prompt Preset 1: Cyber DevOps Architecture\n\`\`\`\nFuturistic server blade glowing with electric cyan neon light, sleek obsidian glass textures, volumetric mist, depth of field, hyper-detailed 3D octane render, cinematic lighting --ar 16:9 --style raw --v 6.0\n\`\`\`\n\n### Prompt Preset 2: Data Stream Velocity\n\`\`\`\nVibrant holographic data streams accelerating through a dark digital tunnel, purple and emerald laser pulses, clean executive tech aesthetic, ultra-sharp focus --ar 16:9 --stylize 250\n\`\`\`\n\n---\n\n## 🛠️ Export Guidelines\n- Format: \`.png\` or high-quality \`.webp\`\n- Native Dimensions: \`1920x1080\` (16:9) or \`1080x1920\` (9:16)\n- File Size Constraint: Under \`2 MB\` for rapid browser pre-fetching.',
            'thumbnails, midjourney, design, ctr, graphics',
            '#10b981',
            FALSE
        ),
        (
            'a1000000-0000-0000-0000-000000000004',
            '🐘 PostgreSQL 18 Indexing, Vacuuming & Performance Directives',
            'Database & Architecture',
            'note',
            '# 🐘 PostgreSQL 18 Indexing & Performance Directives\n\nTechnical notes and query optimization guidelines for high-cardinality YouTube telemetry snapshot tables.\n\n---\n\n## ⚡ Index Strategy for Telemetry Timeseries\n\nFor high-throughput snapshot tables (\`channel_snapshots\` and \`n8n_executions\`):\n\n\`\`\`sql\n-- Composite index for rapid channel telemetry trajectory queries\nCREATE INDEX CONCURRENTLY IF NOT EXISTS idx_snapshots_channel_recorded \nON channel_snapshots (channel_id, recorded_at DESC);\n\n-- Partial index for active workflow executions only\nCREATE INDEX CONCURRENTLY IF NOT EXISTS idx_active_executions \nON n8n_executions (workflow_id, created_at DESC) \nWHERE status = ''running'';\n\`\`\`\n\n---\n\n## 🧹 Autovacuum Hardening for Docker Volumes\n\nAdd to PostgreSQL configuration when snapshot volume exceeds 500k rows:\n\n\`\`\`ini\nautovacuum_vacuum_scale_factor = 0.05\nautovacuum_analyze_scale_factor = 0.02\nautovacuum_vacuum_cost_limit = 2000\n\`\`\`\n\n---\n\n## 📊 Quick Performance Diagnostic Queries\n\n\`\`\`sql\n-- Check connection pool saturation\nSELECT count(*), state FROM pg_stat_activity GROUP BY state;\n\n-- Identify slowest query statements\nSELECT query, calls, total_exec_time, mean_exec_time \nFROM pg_stat_statements \nORDER BY total_exec_time DESC LIMIT 5;\n\`\`\`',
            'postgresql, indexing, optimization, database, sql',
            '#3b82f6',
            FALSE
        ),
        (
            'a1000000-0000-0000-0000-000000000005',
            '✅ Studio Video Release Pre-Flight Verification Checklist',
            'Content Production',
            'checklist',
            '# ✅ Studio Video Release Pre-Flight Verification Checklist\n\nComprehensive quality assurance gate before scheduling or deploying any video, short, or podcast episode.\n\n---\n\n## 🔍 Stage 1: Audio & Visual Fidelity\n- [ ] Audio normalized to \`-14 LUFS\` standard YouTube integrated loudness.\n- [ ] No clipping or digital distortion in vocal track peaks.\n- [ ] Color grading verified in Rec.709 color space across both OLED and LCD displays.\n- [ ] End-screen cards positioned with zero interference with active content.\n\n---\n\n## 🏷️ Stage 2: Metadata & SEO Optimization\n- [ ] Title tested with emotional hook and keyword placed in first 40 characters.\n- [ ] Description includes summary, chapter timestamps, and official repository link.\n- [ ] 500-character tag limit fully populated using curated Studio Tag Presets.\n- [ ] Associated playlist assigned.\n\n---\n\n## 🌐 Stage 3: Community & Multi-Platform Distribution\n- [ ] First comment drafted with discussion question and pinned.\n- [ ] Teaser clip exported for social cross-posting via n8n automation pipeline.\n- [ ] Community tab poll or behind-the-scenes teaser scheduled.\n- [ ] Metrics snapshot captured baseline at \`T+0\`.',
            'checklist, release, quality, production, youtube',
            '#f59e0b',
            FALSE
        )
      ON CONFLICT (id) DO NOTHING;
    `);

    // 8. Update System Settings Branding & Mark Initial Setup as Complete
    await query(`
      UPDATE system_settings SET value = '"Cloud Native Studio"'::jsonb WHERE key = 'channel_name';
      UPDATE system_settings SET value = '"@CloudNativeStudio"'::jsonb WHERE key = 'channel_handle';
      UPDATE system_settings SET value = '"https://www.youtube.com/@CloudNativeStudio"'::jsonb WHERE key = 'channel_url';
      UPDATE system_settings SET value = '"Ibrar Ansari"'::jsonb WHERE key = 'author_name';
    `);

    await this.setInitialSetupStatus(true, userId);

    logger.info('[DEMO-DATA] Demo data population completed successfully.');

    return {
      channels: 2,
      snapshots: 28,
      content_items: 10,
      subscriptions: 6,
      tag_presets: 10,
      n8n_workflows: 4,
      notes: 5
    };
  }
};

module.exports = DemoDataService;
