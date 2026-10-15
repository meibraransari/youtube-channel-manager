# ⚡ YouTube Channel Manager - Comprehensive Features Directory

## 🎨 Executive SaaS Design & UI/UX Experience
- **Executive SaaS Aesthetics**: Modern enterprise dark theme with teal (`#0d9488`), emerald (`#10b981`), and cyan (`#06b6d4`) accents, circular stat badges, and clean rounded metric cards inspired by production cloud consoles.
- **Light / Dark Theme Mode**: Instant toggle button located in the top-right corner, persisting user preferences in local storage.
- **Pill Navigation Tabs**: Top bar quick-access tabs (`Home`, `Catalog`, `Shorts`, `Tracker`, `Subscribed`, `Users`, `Settings`) with active channel counts and role badges.
- **GitHub Repository Pill**: Direct shortcut to `https://github.com/meibraransari/youtube-channel-manager` visible before and after authentication.
- **Collapsible Sidebar**: Full expand/collapse drawer with clean section headers, navigation badges, and direct "Manage Tags" button.
- **Executive Filter & Search Toolbar System (`.filter-toolbar-premium`)**:
  - Elevated glassmorphic backdrop container with subtle responsive wrapping.
  - Embedded SVG vector search box with instant debounce search and 1-click clear button (`✕`).
  - Prefix-labeled custom dropdown selectors (`STATUS:`, `FORMAT:`, `ROLE:`, `ACTION:`, `ENTITY:`, `CATEGORY:`).
  - 1-Click fast segmented filter pills with real-time record count badges.
  - Universal "Clear Filters" indicator.
  - Deployed across: Content Hub, Shorts, Videos, Podcasts, Subscribed Channels, Audit Trail, Tag Manager, Connected Channels Registry, and RBAC User Management.
- **Custom UI Controls**:
  - Precision interactive Calendar & TimePicker modal.
  - Confirmation modals with directive warning dialogs.
  - Floating toast notification system with animated dismissal bars.

---

## 📺 Dedicated Channel Manager & Multi-Channel Studio (`#channels`)
- **Dedicated Channel Manager Console**: Comprehensive `#channels` management dashboard featuring consolidated subscriber, asset, and view cards, connected channels table, lead creator tags, YouTube links, and action directives.
- **Full Channel Lifecycle CRUD**: View channel detail modals with top catalog assets and snapshot history, edit channel metadata, trigger telemetry synchronization, make default channel, and safely delete channels with last-channel safeguards.
- **Global Channel Switcher**: Navbar dropdown allows switching the active channel context or viewing all channels consolidated.
- **Provision Channels On-The-Fly**: Modal workflow to establish new channel profiles, branding, handles, and subscriber baseline targets.
- **Automatic Channel Association**: All created content, snapshots, and metrics are strictly foreign-keyed to the selected channel (`channels` table in PostgreSQL 18).
- **Default Channel Flag**: Mark any channel as default across the studio platform.
- **Executive Filter Toolbar**: Instant search by channel name, handle, or creator lead, status dropdown, and fast status pills (`All`, `🟢 Connected`, `🟡 Pending`, `🔴 Suspended`).

---

## 📈 Channel Tracker & Snapshot Telemetry (`#tracker`)
- **Snapshot Velocity Trajectory**: Real-time Chart.js line charts tracking historical views and subscriber growth across recorded snapshots.
- **365-Day Activity Heatmap**: GitHub-style calendar consistency matrix with 30-day, 90-day, and 1-year time ranges visualizing upload cadence and release frequency.
- **Top Video Leaderboard**: Horizontal progress bars ranking high-engagement catalog assets by views with percentage bars.
- **1-Click Sync & Snapshot**: Buttons to trigger immediate telemetry sync or capture an on-demand snapshot record.

---

## 🔔 Subscribed Channels Hub & Multi-Channel Feed Registry (`#subscriptions`)
- **Centralized Subscriptions Tracking**: Dedicated view (`#subscriptions`) tracking YouTube channels subscribed to by your managed channels, supporting consolidated or individual channel scopes.
- **Telemetry Overview Cards**:
  - Subscribed channels count.
  - Cumulative creator reach (aggregate subscriber reach across subscribed creators).
  - Active scope and dominant category.
- **Real-Time Filtering & Search**:
  - Debounced search across creator title, handle (`@...`), channel ID, description, and notes.
  - Category filtering (`DevOps & Cloud`, `Development`, `Networking & Security`, `AI & Machine Learning`, etc.).
  - Subscriber tier segregation: Mega (1M+), Large (100K-1M), Mid (10K-100K), and Micro (<10K).
  - Multi-column sorting (Subscribed date, subscriber count, alphabetical).
- **Fast Segmented Category Pills**: Live category pill bar with subscription count badges.
- **Dual Display Modes**: Toggle between Data Table View and futuristic Cards Grid View.
- **RFC 4180 CSV & JSON Export**: 1-click downloads with UTF-8 BOM.
- **3 Import Mechanisms**:
  - Google Takeout CSV Import (`subscriptions.csv`).
  - YouTube Data API v3 Pagination Sync (batches through `nextPageToken` up to 1,000 subscriptions).
  - Bulk Paste Handles or Links.

---

## 🏷️ Centralized Tag Preset Registry & Tag Manager (`#tags`)
- **Centralized Tag Manager Overlay**: Accessible from top navigation, sidebar, and Content Creator Wizard.
- **Pre-Packaged Domains**: Presets for DevOps, Cloud Native, Cybersecurity, AI/LLMs, Web Development, Databases, etc.
- **Full Preset CRUD**: Add custom tag presets, edit tags and categories, delete presets, or restore factory defaults with 1 click.
- **Live Search & Category Filtering**: Search by tag name or keyword, category dropdown, and fast category pills with counts.
- **1-Click Quick Tag Insertion**: Direct dropdown and fast chips in Content Creator Wizard inject tags while enforcing the 500-character constraint.

---

## 🧙 5-Stage Content Creator Wizard (`#wizard`)
- **Step 1 - Channel, Format & Topic**: Target channel selection, format selection (9:16 Shorts vs 16:9 Videos vs Podcasts), domain topic, and public title.
- **Step 2 - AI Thumbnails & Prompts**: Built-in prompt generator with Tech Architecture, Futuristic Glow, and Minimalist presets for Midjourney, DALL-E, Flux. Image and YouTube URLs.
- **Step 3 - Tags & SEO**: Tag manager with live character counter enforcing 500 characters constraint. Quick-tag preset dropdown and fast chips from Tag Manager. Markdown description editor.
- **Step 4 - Lifecycle & Schedule**: Status selector and custom precision calendar datepicker.
- **Step 5 - Holographic Pre-Flight Review**: Full summary verification before database commit.
- **Cancel & Close Action**: Dedicated executive "Cancel" button available on all 5 steps with confirmation safeguard.
- **Zero Data-Loss Navigation**: Jump freely between stepper pills without losing entered form fields.

---

## 🎬 Content Operations & Catalog (`#content`, `#shorts`, `#videos`, `#podcasts`)
- **Format Segregation**: Dedicated side-drawer views for Content Hub (`#content`), Reels & Shorts (`#shorts` - 9:16), Long-Form (`#videos` - 16:9), and Podcasts (`#podcasts`).
- **Full Metadata Management**: Edit title, topic, description, tags, URLs, prompts, and timestamps.
- **1-Click Duplication (Clone)**: Duplicate any existing Short or Video with automatic UUID regeneration and "(Duplicate)" suffix in `draft` status.
- **Quick Inline Rename**: Fast title modal without navigating away from the table.
- **Quick Status Toggle**: Dropdown selector to change status between `uploaded`, `pending`, `draft`, `scheduled`, and `archived`.
- **View Inspection Modal**: Detailed inspector with YouTube links, creation timestamps, and raw prompt views.
- **Safe Deletion**: Two-step directive confirmation modal before deleting assets.
- **Executive Filter Toolbar**: Real-time title/topic search with clear button, Status dropdown, Format dropdown, fast status pills with counters, and Clear Filters action.

---

## 🩺 High-Performance Server Health & Enterprise Diagnostics Suite (`#health`)
- **Live SLA Status Bar**: Real-time indicator (`ONLINE & HEALTHY`) with `99.98% SLA` target tracking.
- **6-Card Executive Telemetry KPI Grid**:
  1. PostgreSQL 18 Engine: Query latency ping (`< 1ms`), database version (`PostgreSQL 18.6 Alpine`), ultra-low latency rating.
  2. Server Uptime & Availability: Humanized uptime counter (`Xh Ym Zs`), total elapsed seconds, and process tracking (`PID: 1`).
  3. V8 Heap Memory Allocation: Used vs Total Heap memory in MB, visual percentage progress bar, Resident Set Size (`RSS`), and external buffers.
  4. Compute Hardware & CPU Engine: Core count, architecture (`x64`), host processor model (e.g. `AMD Ryzen 7 5800X`), Node version, and platform OS (`Linux`).
  5. PostgreSQL Connection Pool Saturation: Active clients vs pool maximum (`2/20 Active`), saturation gauge bar, idle connections, and client queue count (`0 queued`).
  6. Host System Memory Allocation: Free host RAM vs total capacity, consumption gauge percentage.
- **Subsystem & Service Mesh Matrix**: Real-time table monitoring PostgreSQL 18, Node.js V8 Runtime, JWT Auth Guard, YouTube Data API v3 Ingestion, SMTP Alerting Gateway, Audit Trail Immutable Ledger, and Docker Container Runtime.
- **Database Table Cardinality Telemetry**: Direct production counts for Connected Channels, Catalog Content Assets, Subscribed Channels, Enrolled Users, and Audit Ledger Entries.
- **Interactive Operator Diagnostics**:
  - ⚡ **3-Sample Latency Ping Benchmark (`GET /health/ping`)**: Executes 3 rapid roundtrips on demand, calculating Average, Min, and Max latency with sample visualization.
  - ⏱️ **Auto-Polling Telemetry Controller**: Configurable polling interval (`[Off (Manual) | Every 5s | Every 10s | Every 30s]`) with automatic timer disposal on navigation.
  - 📋 **1-Click Copy Diagnostics Report**: Exports structured JSON telemetry directly to clipboard.
  - 🛠️ **Collapsible Raw JSON Telemetry Inspector**: Formatted kernel JSON payload viewer.

---

## 📧 Production SMTP Email Service & Transmission Test Engine (`#settings`)
- **Enterprise SMTP Configuration Card**: Configurable directly from System Settings (`#settings`) without touching container environment files.
- **Full Configuration Options**:
  - SMTP Host & Port (e.g., `smtp.gmail.com`, `587`, `465`, `25`).
  - Encryption protocol: `TLS (STARTTLS)`, `SSL`, or `None / Plaintext`.
  - Authentication toggle (Username / Password).
  - From Email & Sender Display Name.
  - Self-signed TLS certificate acceptance toggle.
  - Configurable socket timeout (seconds).
- **Interactive Test Transmission**: Live "Test Connection & Send Email" button with recipient dialog and instant diagnostic verification.
- **Audit Logging**: All test transmissions and configuration updates are recorded in the immutable audit trail under action `SMTP_TEST`.

---

## 👥 Granular RBAC User Management (`#users`)
- **Role Hierarchy**:
  - **Admin**: Root control over all directives, settings, users, channels, and migrations.
  - **Manager**: Content operations, audit logs, and data exports.
  - **Editor**: Content creation, editing, cloning, and renaming.
  - **Viewer**: Read-only access to catalog and dashboard.
- **Granular Permissions Matrix**:
  - `can_view_content`: Browse catalog and media assets.
  - `can_manage_content`: Create, edit, rename, duplicate, and delete content.
  - `can_manage_users`: Create, update roles, reset passwords, and deactivate operators.
  - `can_manage_settings`: Modify system settings and dynamic log verbosity.
  - `can_view_audit_logs`: Inspect audit trails and login attempts.
  - `can_export_data`: Export JSON telemetry data.
  - `can_migrate_data`: Execute database migrations.
- **Security Features**:
  - bcrypt password hashing with salt factor 10.
  - Administrative password resets.
  - Account deactivation toggle.
  - Protection preventing deletion of root admin or self-account.
- **Executive Users Filter Toolbar**: Search operators by username or email, Security Role dropdown, fast role pills (`All Operators`, `👑 Admins`, `🛡️ Managers`, `✏️ Editors`, `👁️ Viewers`), and Clear Filters button.

---

## 📜 Immutable Audit Trail & Security Tracker (`#audit`)
- **Operational Audit Trail**:
  - Logs `CREATE`, `UPDATE`, `RENAME`, `DELETE`, `DUPLICATE`, `STATUS_CHANGE`, `SETTINGS_CHANGE`, `SMTP_TEST`, `MIGRATION`, `LOGIN`, `LOGOUT`.
  - Records user ID, username, IP address, timestamp, and JSON state diffs.
  - Filterable by directive action, entity, user, and date range.
  - 1-Click export to structured JSON.
- **Security Login History**:
  - Tracks all authentication attempts with IP address, user-agent, and status (`success` vs `failed`).
- **Executive Audit Filter Toolbar**: Action type dropdown, Entity dropdown, fast directive pills, and Clear Filters action.

---

### 📝 Topic Notes & Instructions Manager (`#notes`)
- **Dedicated Relational Database Architecture (`notes`)**: Independent table with columns: `id` (UUID), `title`, `topic`, `category` (`instruction`, `checklist`, `script`, `sop`, `idea`, `reference`), `content` (TEXT), `tags`, `color`, `is_pinned`, `is_archived`, `channel_id`, `created_at`, `updated_at`, `created_by`, `updated_by`. Backed by 6 performance indexes.
- **Pre-Seeded Curated Studio Directives**: Seeded with 5 production guides: YouTube Shorts Retention Playbook, Docker/PostgreSQL 18 Deployment SOP, Thumbnail Formula, PostgreSQL Indexing Reference, Video Release Checklist.
- **Feature-Rich Markdown Editor & Live Previewer**: Split/live preview mode, formatting helper toolbar (Headings, Bold, Italic, Code, Tables, Callouts), live word/character counters, topic auto-completion datalist, color picker, and pin toggles.
- **Fullscreen Markdown Reader Modal**: Executive reader modal with syntax copy blocks, task lists, tables, callout alerts, quick copy, and raw `.md` file export.
- **Universal Multi-Facet Filter Toolbar**: Fast debounce search across title/topic/content/tags, topic dropdown, type dropdown, channel scope, sorting, and fast interactive topic pills with counter badges.
- **Dual View Modes**: Switch between Grid Cards View and Table Ledger View.
- **Complete REST API**: Full CRUD, topic counts aggregation (`/api/notes/topics`), pin toggling (`/api/notes/:id/pin`), and raw markdown file download (`/api/notes/:id/export`).

---

### ⚡ n8n Automated Workflow Engine & Webhook Orchestrator (`#n8n`)
- **Dedicated Relational Database Tables**: `n8n_workflows` (workflow metadata, webhooks, auth headers, payload templates) and `n8n_executions` (run history, payloads, latency, HTTP status codes).
- **Pre-Seeded Automation Workflows**: AI Metadata & SEO Description Auto-Enricher, Social Multi-Platform Cross-Poster, Automated Thumbnail Asset Renderer, Weekly Telemetry & Growth Pipeline.
- **Interactive Live Execution & Testing**: Modal with test/production URL selection, JSON payload editor with format validator, dynamic variable interpolation, and syntax-highlighted response viewer.
- **Telemetry Ledger & Reachability Probes**: Dispatched webhook history, latency metrics, and orchestrator heartbeat ping tests.

---

## ⚙️ Zero-Downtime System Settings & Danger Zone (`#settings`)
- **Live Console Log Level**: Adjust Winston logger between `debug`, `info`, `warn`, `error`, and `http` without restarting containers.
- **Swagger Documentation Toggle**: Turn `/api/docs` on or off dynamically via system settings in PostgreSQL.
- **Automated Background Cron Scheduler**: Configurable cadence (1h, 2h, 6h, 12h, 24h) and scheduler toggle.
- **Studio Profile Customization**: Update studio name, handle, creator name, and GitHub repository links in real time.
- **⚠️ Danger Zone - Flush All Data**: Dynamic 2-digit sum verification (`X + Y = ?`) and mandatory confirmation checkbox to permanently purge all content, channels, snapshots, and extra user accounts back to clean baseline.

---

## 🔒 Secret Admin Migration Portal (`#secret-migration`)
- **Admin-Only Confidential Portal**: Hidden from public sidebar and content navigation, accessible only by navigating to `#secret-migration` as root administrator.
- **MySQL to PostgreSQL 18 Translation**:
  - Automatically translates MySQL / MariaDB schema and records into PostgreSQL 18 best practices.
  - Translates `media_uuid` into unique constraints.
  - Enforces database triggers for 500 characters max limit on tags.
  - Classifies content into vertical 9:16 Shorts/Reels vs 16:9 Long-Form videos based on prompt resolution and YouTube URL structure.
- **Interactive Migration Console**:
  - Custom file dropzone supporting any `.sql` dump.
  - Idempotent `ON CONFLICT (media_uuid) DO UPDATE` to prevent duplicate errors.
  - Dedicated `migration_history` ledger tracking execution status and records counts.
- **Clean Zero-Data Baseline**: Fresh installations start with 0 content items and a single admin account, allowing full manual control over when reference data is ingested and tested.

---

## ⏱️ Automated Background Cron Scheduler
- **Zero-Downtime Cron Sync**: Background service periodically synchronizes views, likes, comments, and subscriber counts.
- **Configurable Cadence**: Adjustable from System Settings (1h, 2h, 6h, 12h, 24h intervals) without restarting Docker containers.
- **Optional YouTube Data API v3**: Seamlessly integrates API keys or falls back to organic growth telemetry.
- **Dynamic Scheduler Control**: Toggle cron engine on/off with real-time state saved to PostgreSQL `system_settings`.

---

## 🐳 Docker & Docker Compose Architecture
- **Single App Container**: Frontend SPA and backend Express REST API hosted in the same container (`ibraransaridocker/yt-manager-app`).
- **PostgreSQL 18 Container**: High-performance `postgres:18-alpine` with healthcheck probes and persistent data volume (`/var/lib/postgresql`).
- **Fully Customizable Port Mapping**: All ports defined via `.env` (`APP_PORT=3000`, `POSTGRES_EXTERNAL_PORT=5432`).
- **Production Health Probe**: Real-time `/health` and `/health/ping` endpoints measuring DB latency, memory usage, pool saturation, and uptime.
