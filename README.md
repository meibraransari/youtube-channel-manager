# 🚀 YouTube Channel Manager (`youtube-channel-manager`)

> **Next-Generation Executive Multi-Channel YouTube Operations & Studio Platform**  
> Powered by **Node.js 20 LTS, PostgreSQL 18 Alpine, Docker Compose & Professional Executive SaaS UI**  
> Engineered by **[Ibrar Ansari](https://github.com/meibraransari)** for creators, multi-channel networks, and media production engineering teams.

[![Docker Image](https://img.shields.io/badge/Docker%20Image-ibraransaridocker%2Fyt--manager--app-0d9488?logo=docker)](https://hub.docker.com/r/ibraransaridocker/yt-manager-app)
[![Node.js](https://img.shields.io/badge/Node.js-v20%20LTS-339933?logo=node.js)](https://nodejs.org/)
[![PostgreSQL](https://img.shields.io/badge/PostgreSQL-18%20Alpine-336791?logo=postgresql)](https://www.postgresql.org/)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)
[![GitHub Repository](https://img.shields.io/badge/GitHub-meibraransari%2Fyoutube--channel--manager-6366f1?logo=github)](https://github.com/meibraransari/youtube-channel-manager)

---

## 📖 Overview

**YouTube Channel Manager** is a high-performance, containerized studio operations hub designed to manage multiple YouTube channels from a single unified control plane. 

Built with an executive SaaS aesthetic featuring deep dark modes, frosted pearlescent light modes, rounded metrics charts, and a GitHub-style 365-day cadence heatmap, the platform brings enterprise-grade management to YouTube Shorts / Reels (9:16), long-form tutorials (16:9), and podcasts. It features rapid YouTube channel onboarding, telemetry snapshots, an automated cron sync engine for metrics (views, likes, comments, subscribers), granular RBAC permissions, live immutable audit trails, dynamic zero-downtime database settings, and an interactive 5-stage Content Creator Wizard.

---

## 🎯 Why YouTube Channel Manager?

Operating multi-channel networks and complex content production pipelines often creates workflow bottlenecks:

- **Multi-Channel Fragmentation**: Creators managing several channels struggle to isolate catalogs and analyze individual channel velocity in one centralized console.
- **Legacy Ingestion Hurdles**: Onboarding existing channels or converting legacy MariaDB/MySQL dumps (e.g., from n8n automation pipelines) requires complex custom scripts.
- **Downtime Configuration**: Adjusting backend logging levels or toggling Swagger API docs usually demands rebuilding images or restarting containers.
- **Metric Desynchronization**: Views, likes, and subscriber metrics become stale without an automated background scheduler and snapshot telemetry engine.
- **Absence of Immutable Audit Trails**: Multi-operator studios lack accountability when titles, thumbnails, prompts, or release dates are altered.

**YouTube Channel Manager** solves this with a unified, zero-downtime architecture providing instantaneous multi-channel switching, automatic telemetry cron synchronization, and seamless MySQL-to-PostgreSQL migration.

---

## ✨ Features

### 📺 Dedicated Channel Manager & Multi-Channel Studio
- **Dedicated Channel Manager Console**: Dedicated full-page view (`#channels`) with channel metric cards, connected profiles table, baseline telemetry, default status assignment, rapid ingestion trigger, manual sync, and deletion safeguards.
- **Instant Channel Switching**: Global top navbar dropdown allows switching between channels or viewing consolidated multi-channel telemetry.
- **Rapid Channel Onboarding Engine**: Connect any existing YouTube channel by URL or handle (`@handle` or `https://youtube.com/@handle`). The engine ingests channel data, establishes snapshots, and feeds catalog metadata into PostgreSQL 18.
- **Provision Channels On-The-Fly**: Modal workflow to establish new channel profiles, branding, handles, and subscriber targets.

### 📈 Channel Tracker & Telemetry Matrix
- **Snapshot Velocity Trajectory**: Real-time line charts tracking historical views and subscriber growth across recorded snapshots.
- **365-Day Activity Heatmap**: GitHub-style calendar consistency matrix with 30-day, 90-day, and 1-year time ranges to visualize upload cadence and release frequency.
- **Top Video Leaderboard**: Traction progress bars ranking high-engagement catalog assets.
- **Manual Snapshot & Sync Directives**: Trigger immediate snapshot recordings with one click.

### ⏱️ Automated Background Cron Scheduler
- **Zero-Downtime Cron Sync**: Background worker periodically synchronizes views, likes, comments, and subscriber counts.
- **Configurable Cadence**: Adjustable from System Settings (1h, 2h, 6h, 12h, 24h intervals) without restarting Docker containers.
- **Optional YouTube Data API v3**: Seamlessly integrates API keys or falls back to organic growth telemetry.

### 🧙 5-Stage Content Creator Wizard
- **Step 1: Identity & Format**: Target channel selector, format selection (9:16 Shorts vs 16:9 Long Videos vs Podcasts), domain topic, and public title.
- **Step 2: AI Thumbnails & Prompts**: Built-in prompt engineering generators (Tech Architecture, Futuristic Glow, Minimalist) for Midjourney, DALL-E, and Flux.
- **Step 3: Tags & SEO Optimization**: 500-character constrained tag manager with instant tech chips and rich description editor.
- **Step 4: Lifecycle & Scheduling**: Custom precision interactive date/time coordinates calendar.
- **Step 5: Pre-Flight Verification**: Full holographic review before committing directives to PostgreSQL 18.

### 🎬 Production Content Catalog
- **Robust Table Actions**: Fully tested and bug-free actions for every asset:
  - 👁️ **View Details**: Full metadata modal with direct YouTube link and creation coordinates.
  - ✏️ **Edit Metadata**: Comprehensive editing modal for titles, topics, descriptions, tags, and status.
  - ⚡ **Quick Rename**: Fast title update without opening heavy forms.
  - 📋 **1-Click Duplicate / Clone**: Instant asset replication with fresh UUIDs and `draft` status.
  - 🗑️ **Delete**: Modal confirmation safeguards preventing accidental catalog deletion.
- **Format Segregation**: Dedicated side-drawer views for Reels & Shorts (9:16), Long-Form (16:9), and Podcasts.

### 🔒 Secret Admin Migration Portal (`#secret-migration`)
- **Admin-Only Ingestion Console**: Hidden, confidential tool accessible exclusively to the administrator at `#secret-migration`.
- **Bundled Reference Ingestion**: 1-click test migration from `sql11-10-2026_data.sql` with real-time feedback.
- **Custom SQL Upload**: Drag-and-drop or upload custom `.sql` dumps to migrate MariaDB/MySQL tables (`youtube_topics`) into PostgreSQL 18.
- **Clean Zero-Data Baseline**: Initial setup starts with zero content items and a single admin user so creators have a clean slate to test manual ingestion.

### 👥 Enterprise RBAC User Management
- **Single Admin Baseline**: New deployments provision a single root admin account (`admin` / `Admin@2026`).
- **Full CRUD Management**: Provision new operators, modify emails, assign security roles, toggle account locks, and reset passwords.
- **Granular Permissions**:
  - `can_view_content`: Browse catalog and media assets.
  - `can_manage_content`: Create, edit, rename, duplicate, and delete content.
  - `can_manage_users`: Create, update roles, reset passwords, and remove operators.
  - `can_manage_settings`: Modify system settings and dynamic log verbosity.
  - `can_view_audit_logs`: Inspect audit trails and login attempts.
  - `can_export_data`: Export JSON telemetry data.
  - `can_migrate_data`: Execute database migrations.

### 📜 Immutable Audit Trail & Login Tracker
- **Audit Logging**: Comprehensive logs for all `CREATE`, `UPDATE`, `DELETE`, `DUPLICATE`, `RENAME`, `STATUS_CHANGE`, `MIGRATION`, and `FLUSH_ALL` actions.
- **Login Tracker**: Dedicated security log tracking user sign-ins, IP addresses, user agents, and outcomes.
- **JSON Export**: Export audit logs for compliance reviews.

### ⚙️ Dynamic Zero-Downtime Settings & Danger Zone
- **Console Log Level**: Switch backend Winston log verbosity (`debug`, `info`, `warn`, `error`, `http`) in real time.
- **Swagger Documentation Toggle**: Instantly enable or disable `/api/docs` without touching Docker Compose.
- **Dynamic Studio Branding**: Fully customizable studio display name, handle, creator name, and repository coordinates.
- **⚠️ Danger Zone - Flush All Data**: Math challenge verification (`2-digit sum: X + Y = ?`) and mandatory confirmation checkbox to permanently reset all content, channels, and extra accounts to a zero-data state.

---

## ⚙️ Prerequisites

- **Docker Engine**: Version 24.0+ or Docker Desktop
- **Docker Compose**: Version 2.20+
- **Host Ports**:
  - Port `3000` (Default web console port, customizable via `.env`)
  - Port `5432` (Default PostgreSQL port, customizable via `.env`)
- **System Memory**: Minimum 1GB RAM allocated to Docker Engine

---

## 🚀 Quick Start

Launch the complete multi-container stack in 60 seconds:

```bash
# 1. Clone repository
git clone https://github.com/meibraransari/youtube-channel-manager.git
cd youtube-channel-manager

# 2. Review environment configuration
cp .env.example .env

# 3. Launch Docker Compose
docker compose up -d --build
```

Access the studio console in your web browser:
- **Web Studio Console**: [http://localhost:3000](http://localhost:3000)
- **API Swagger Documentation**: [http://localhost:3000/api/docs](http://localhost:3000/api/docs)
- **Diagnostic Health Check**: [http://localhost:3000/health](http://localhost:3000/health)

---

## 🎯 Easy Deployment (Recommended)

To deploy using custom host ports or specialized credentials, customize your `.env` file:

```env
# Customizable Host Port Mapping
APP_PORT=3000
POSTGRES_EXTERNAL_PORT=5432

# PostgreSQL 18 Credentials
POSTGRES_USER=postgres
POSTGRES_PASSWORD=postgres_secure_pass_123
POSTGRES_DB=youtube_channel_manager_db

# Initial Administrator Credentials
INITIAL_ADMIN_USERNAME=admin
INITIAL_ADMIN_PASSWORD=Admin@2026
INITIAL_ADMIN_EMAIL=admin@ytstudio.local
```

Launch with updated configurations:

```bash
docker compose up -d
```

---

## 🔐 First Login

On initial deployment, the database seeds default administrative accounts:

| Username | Default Password | Role | Access Scope |
| :--- | :--- | :--- | :--- |
| **`admin`** | `Admin@2026` | Administrator | Full Directives & System Settings |
| **`ibrar`** | `Admin@2026` | Manager | Content Operations, Audit Trail & Exports |
| **`editor`** | `Admin@2026` | Editor | Content Catalog, Creator Wizard & Editing |

> [!IMPORTANT]
> Change the default password upon initial production login in the **Users & RBAC** tab.

---

## 🏗️ Architecture

```mermaid
flowchart TD
    Client["🌐 Web Browser / Studio Operator"] -->|HTTP / REST (Port 3000)| AppContainer["📦 yt-manager Container (Node.js 20 LTS)"]
    
    subgraph AppContainer ["App Container (yt-manager)"]
        SPA["🎨 Executive SaaS Client (Vanilla JS + Chart.js)"]
        APIRoutes["⚙️ Express REST API Routes"]
        CronService["⏱️ Background Telemetry Cron Scheduler"]
        SwaggerDoc["📖 Swagger OpenAPI 3.0 (/api/docs)"]
        WinstonLog["📡 Dynamic Winston Logging Engine"]
    end

    AppContainer -->|PostgreSQL Connection Pool| DBContainer["🐘 postgres18 Container (PostgreSQL 18 Alpine)"]

    subgraph DBContainer ["Database Engine (postgres18)"]
        T1["channels (Multi-Channel Profiles)"]
        T2["channel_snapshots (Growth & Velocity Telemetry)"]
        T3["content_items (Videos, Shorts, Podcasts)"]
        T4["users (RBAC Permissions & Bcrypt Hashes)"]
        T5["system_settings (Zero-Downtime Dynamic Config)"]
        T6["audit_logs (Immutable Action Trail)"]
        T7["user_login_logs (Security Access Tracker)"]
        T8["migration_history (Dump Ingestion Records)"]
    end

    AppContainer -.->|Reference Ingestion| SQLFile["📄 sql11-10-2026_data.sql"]
```

---

## 📁 Project Structure

```
youtube-channel-manager/
├── .env                              # Environment configuration
├── .env.example                      # Template environment variables
├── docker-compose.yml                # Multi-container orchestration
├── Dockerfile                        # Multi-stage production container
├── package.json                      # Node.js project manifest & scripts
├── README.md                         # Comprehensive platform documentation
├── FEATURES.md                       # Complete feature index
├── LICENSE                           # MIT License
├── sql11-10-2026_data.sql            # Bundled MySQL reference dataset (90 items)
├── tests/
│   └── verify.ps1                    # Automated E2E verification test suite
├── database/
│   ├── init.sql                      # PostgreSQL 18 schema, triggers & seed
│   └── migrations/                   # Migration scripts (002_multi_channel...)
├── src/
│   ├── server.js                     # Express bootstrap & background cron init
│   ├── config/
│   │   ├── db.js                     # PostgreSQL connection pool & health checks
│   │   └── logger.js                 # Winston dynamic logging system
│   ├── services/
│   │   └── cronSync.js               # Background metric sync service
│   ├── middleware/
│   │   ├── auth.js                   # JWT bearer authentication & RBAC checker
│   │   ├── audit.js                  # Automated audit trail logging
│   │   └── swaggerToggle.js          # Dynamic Swagger enable/disable middleware
│   ├── routes/
│   │   ├── auth.routes.js            # Login, sessions, login history
│   │   ├── channels.routes.js        # Multi-channel CRUD, snapshots & ingestion
│   │   ├── content.routes.js         # Content CRUD, duplicate, rename, status
│   │   ├── dashboard.routes.js       # Dynamic channel metrics & analytics
│   │   ├── users.routes.js           # RBAC user management & passwords
│   │   ├── settings.routes.js        # Dynamic database settings & log level
│   │   ├── audit.routes.js           # Audit trail queries & JSON export
│   │   ├── migration.routes.js       # MySQL dump parser & ingestion
│   │   └── health.routes.js          # /health diagnostic probe
│   ├── swagger/
│   │   └── swaggerDoc.js             # OpenAPI 3.0 JSON specification
│   └── utils/
│       └── mysqlToPostgresParser.js  # MySQL tuple parsing engine
└── public/
    ├── index.html                    # Single-Page Application entry point
    ├── css/
    │   ├── futuristic.css            # Executive design variables & palettes
    │   └── components.css            # Custom UI controls, navbar & heatmap
    └── js/
        ├── api.js                    # Unified REST client with JWT handling
        ├── app.js                    # State router, login & theme manager
        └── components/
            ├── customControls.js     # Toasts, Confirm modals & Precision Datepicker
            ├── navbar.js             # Channel selector, pill tabs, GitHub link
            ├── sidebar.js            # Collapsible navigation drawer
            ├── dashboard.js          # Overview metrics, green bar charts & heatmap
            ├── tracker.js            # Channel Tracker, snapshots & growth curves
            ├── content.js            # Video/Shorts tables & action delegation
            ├── wizard.js             # 5-step Content Creator Wizard
            ├── users.js              # RBAC user provisioning modal
            ├── audit.js              # Audit trail & login history inspector
            ├── settings.js           # Live system settings, cron & rapid ingestion
            └── migration.js          # MySQL-to-PostgreSQL migration tool
```

---

## 📊 Monitoring & Alerts

1. **Diagnostic Health Probe (`/health`)**:
   - Live PostgreSQL connection status and query latency (ms).
   - Node process memory (`rss` and `heapUsed` in MB).
   - System uptime and server environment flags.
2. **Dynamic Server Logs**:
   - Real-time formatted Winston logs configurable on the fly:
   ```
   [2026-10-11 18:00:00] [INFO] ✨ YouTube Channel Manager is running live at http://0.0.0.0:3000
   [2026-10-11 18:01:05] [HTTP] GET /api/dashboard/stats?channel_id=... 200 - 6ms
   [2026-10-11 18:02:10] [AUDIT] DUPLICATE on short (ID: 137) by admin
   [2026-10-11 18:03:00] [CRON-SYNC] Completed sync for channel: Cloud Native Studio
   ```
3. **Security Access Ledger**:
   - Detects unauthorized credential attempts and records IP addresses in `user_login_logs`.

---

## 🎯 Use Cases

- **Multi-Channel Media Studios**: Oversee multiple branded YouTube channels from a single self-hosted operations center.
- **Technical & DevOps Educators**: Structure multi-part tutorials (Kubernetes, Docker, CI/CD, Python, Cloud) with thumbnail prompts and code repository links.
- **Automated n8n / AI Topic Ingestion**: Migrate automated AI topic generation pipelines directly into production PostgreSQL content queues.
- **Collaborative Production Teams**: Give editors, scriptwriters, and channel leads tailored permissions without exposing raw database credentials.

---

## 🗺️ Roadmap

- [x] Multi-channel management and top navigation channel selector.
- [x] Channel Tracker with snapshot curves and 365-day cadence heatmap.
- [x] Automated background cron synchronization for views, likes, and subscribers.
- [x] Rapid YouTube channel onboarding and starter catalog ingestion.
- [x] Executive SaaS dark/light UI overhaul.
- [x] 5-Stage Content Creator Wizard with multi-channel tagging.
- [x] 1-Click duplicate content and quick inline rename actions.
- [x] Granular RBAC user management and immutable audit trails.
- [ ] OAuth2 YouTube Data API publishing automation.
- [ ] Direct ComfyUI / Stable Diffusion thumbnail generation sidecar.

---

## 🤝 Contributing

Contributions and pull requests are welcomed!

1. Fork the Project at [meibraransari/youtube-channel-manager](https://github.com/meibraransari/youtube-channel-manager).
2. Create your Feature Branch (`git checkout -b feature/NewStudioFeature`).
3. Commit your Changes (`git commit -m 'feat: Add analytics export feature'`).
4. Push to the Branch (`git push origin feature/NewStudioFeature`).
5. Open a Pull Request.

---

## 📄 License

Distributed under the **MIT License**. See [`LICENSE`](LICENSE) for details.

**Engineered with ⚡ by [Ibrar Ansari](https://github.com/meibraransari).**
