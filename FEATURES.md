# ⚡ YouTube Channel Manager - Comprehensive Features Directory

## 🎨 Executive SaaS Design & UI/UX Experience
- **Executive SaaS Aesthetics**: Modern enterprise dark theme with teal (`#0d9488`), emerald (`#10b981`), and cyan (`#06b6d4`) accents, circular stat badges, and clean rounded metric cards inspired by production cloud consoles.
- **Light / Dark Theme Mode**: Instant toggle button located in the top-right corner, persisting user preferences in local storage.
- **Pill Navigation Tabs**: Top bar quick-access tabs (`Home`, `Catalog`, `Shorts`, `Tracker`, `Users`, `Settings`) with active channel counts and role badges.
- **GitHub Repository Pill**: Direct shortcut to `https://github.com/meibraransari/youtube-channel-manager` visible before and after authentication.
- **Collapsible Sidebar**: Full expand/collapse drawer with clean section headers and navigation badges.
- **Custom UI Controls**:
  - Precision interactive Calendar & TimePicker modal.
  - Confirmation modal with directive warning dialogs.
  - Floating toast notification system with animated dismissal bars.
  - Debounced search inputs and dynamic select menus.

---

## 📺 Dedicated Channel Manager & Multi-Channel Studio
- **Dedicated Channel Manager Console**: Comprehensive `#channels` management dashboard featuring consolidated subscriber, asset, and view cards, connected channels table, lead creator tags, YouTube links, and action directives.
- **Full Channel Lifecycle CRUD**: View channel detail modals with top catalog assets and snapshot history, edit channel metadata, trigger telemetry synchronization, make default channel, and safely delete channels with last-channel safeguards.
- **Global Channel Switcher**: Navbar dropdown allows switching the active channel context or viewing all channels consolidated.
- **Provision Channels On-The-Fly**: Modal workflow to establish new channel profiles, branding, handles, and subscriber baseline targets.
- **Automatic Channel Association**: All created content, snapshots, and metrics are strictly foreign-keyed to the selected channel (`channels` table in PostgreSQL 18).
- **Default Channel Flag**: Mark any channel as default across the studio platform.

---

## 📈 Channel Tracker & Snapshot Telemetry
- **Snapshot Velocity Trajectory**: Real-time Chart.js line charts tracking historical views and subscriber growth across recorded snapshots.
- **365-Day Activity Heatmap**: GitHub-style calendar consistency matrix with 30-day, 90-day, and 1-year time ranges visualizing upload cadence and release frequency.
- **Top Video Leaderboard**: Horizontal progress bars ranking high-engagement catalog assets by views with percentage bars.
- **1-Click Sync & Snapshot**: Buttons to trigger immediate telemetry sync or capture an on-demand snapshot record.

---

## ⏱️ Automated Background Cron Scheduler
- **Zero-Downtime Cron Sync**: Background service periodically synchronizes views, likes, comments, and subscriber counts.
- **Configurable Cadence**: Adjustable from System Settings (1h, 2h, 6h, 12h, 24h intervals) without restarting Docker containers.
- **Optional YouTube Data API v3**: Seamlessly integrates API keys or falls back to organic growth telemetry.
- **Dynamic Scheduler Control**: Toggle cron engine on/off with real-time state saved to PostgreSQL `system_settings`.

---

## 🚀 Rapid YouTube Channel Ingestion Engine
- **Instant Channel Onboarding**: Connect any YouTube channel by handle (`@handle`) or URL (`https://youtube.com/@handle`).
- **Starter Catalog Ingestion**: Ingests channel metadata, initializes baseline snapshots, and seeds starter video and short assets into PostgreSQL.
- **Frictionless Setup**: Allows new creators or multi-channel operators to get started with an existing channel in seconds.

---

## 🔒 Secret Admin Migration Portal (`#secret-migration`)
- **Admin-Only Confidential Portal**: Hidden from public sidebar and content navigation, accessible only by navigating to `#secret-migration` as root administrator.
- **MySQL to PostgreSQL 18 Translation**:
  - Automatically translates `sql11-10-2026_data.sql` schema and 90 records into PostgreSQL 18 best practices.
  - Translates `media_uuid` into unique constraints.
  - Enforces database triggers for 500 characters max limit on tags.
  - Classifies content into vertical 9:16 Shorts/Reels vs 16:9 Long-Form videos based on prompt resolution and YouTube URL structure.
- **Interactive Migration Console**:
  - One-click reference file migration (`sql11-10-2026_data.sql`) with real-time status and feedback.
  - Custom file dropzone supporting any `.sql` dump.
  - Idempotent `ON CONFLICT (media_uuid) DO UPDATE` to prevent duplicate errors.
  - Dedicated `migration_history` ledger tracking execution status and records counts.
- **Clean Zero-Data Baseline**: Fresh installations start with 0 content items and a single admin account, allowing full manual control over when reference data is ingested and tested.

---

## 🧙 5-Stage Content Creator Wizard
- **Step 1 - Channel, Format & Topic**: Target channel selection, format selection (9:16 Shorts vs 16:9 Videos vs Podcasts), domain topic, and public title.
- **Step 2 - AI Thumbnails & Prompts**: Built-in prompt generator with Tech Architecture, Futuristic Glow, and Minimalist presets. Image and YouTube URLs.
- **Step 3 - Tags & SEO**: Tag manager with live character counter enforcing the 500 characters constraint. Markdown description editor with quick tech tags.
- **Step 4 - Lifecycle & Schedule**: Status selector and custom precision calendar datepicker.
- **Step 5 - Holographic Pre-Flight Review**: Full summary verification before database commit.
- **Zero Data-Loss Navigation**: Jump freely between stepper pills without losing entered form fields.

---

## 🎬 Content Operations & Catalog
- **Full Metadata Management**: Edit title, topic, description, tags, URLs, prompts, and timestamps.
- **1-Click Duplication (Clone)**: Duplicate any existing Short or Video with automatic UUID regeneration and "(Duplicate)" suffix in `draft` status.
- **Quick Rename**: Fast title modal without navigating away from the table.
- **Quick Status Toggle**: Dropdown selector to change status between `uploaded`, `pending`, `draft`, `scheduled`, and `archived`.
- **View Inspection Modal**: Detailed inspector with YouTube links, creation timestamps, and raw prompt views.
- **Safe Deletion**: Two-step directive confirmation modal before deleting assets.

---

## 👥 Granular RBAC User Management
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

---

## 📜 Immutable Audit Trail & Security Tracker
- **Operational Audit Trail**:
  - Logs `CREATE`, `UPDATE`, `RENAME`, `DELETE`, `DUPLICATE`, `STATUS_CHANGE`, `SETTINGS_CHANGE`, `MIGRATION`, `LOGIN`, `LOGOUT`.
  - Records user ID, username, IP address, timestamp, and JSON state diffs.
  - Filterable by directive action, entity, user, and date range.
  - 1-Click export to structured JSON.
- **Security Login History**:
  - Tracks all authentication attempts with IP address, user-agent, and status (`success` vs `failed`).

---

## ⚙️ Zero-Downtime System Settings & Danger Zone
- **Live Console Log Level**: Adjust Winston logger between `debug`, `info`, `warn`, `error`, and `http` without restarting containers.
- **Swagger Documentation Toggle**: Turn `/api/docs` on or off dynamically via system settings in PostgreSQL.
- **Studio Profile Customization**: Update studio name, handle, creator name, and GitHub repository links in real time.
- **⚠️ Danger Zone - Flush All Data**: Dynamic 2-digit sum verification (`X + Y = ?`) and mandatory confirmation checkbox to permanently purge all content, channels, snapshots, and extra user accounts back to clean baseline.

---

## 🐳 Docker & Docker Compose Architecture
- **Single App Container**: Frontend SPA and backend Express REST API hosted in the same container (`ibraransaridocker/yt-manager-app`).
- **PostgreSQL 18 Container**: High-performance `postgres:18-alpine` with healthcheck probes and persistent data volume (`/var/lib/postgresql`).
- **Fully Customizable Port Mapping**: All ports defined via `.env` (`APP_PORT=3000`, `POSTGRES_EXTERNAL_PORT=5432`).
- **Production Health Probe**: Real-time `/health` endpoint measuring DB latency, memory usage, and uptime.
