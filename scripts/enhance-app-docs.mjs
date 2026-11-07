import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const appsJsonPath = path.join(root, 'docs', 'applications.json');
const apps = JSON.parse(fs.readFileSync(appsJsonPath, 'utf8'));

const rootApp = apps.find(a => a.path === '.');
if (rootApp) {
  rootApp.sections = {
    "Architecture and System Topology": `\`\`\`mermaid
flowchart TD
    subgraph ClientTier ["Client Interfaces"]
        WebPortal["Web Portal (http://127.0.0.1:5000/Ultimate/)"]
        DesktopApp["Desktop App (Electron v2.0.1)"]
        AdminDemo["Review Demo (http://127.0.0.1:5410/admin-demo.html)"]
    end

    subgraph GatewayRouter ["Unified Gateway (:5300)"]
        GW["scripts/gateway.mjs"]
    end

    subgraph UltimateCore ["GrowthTrack Ultimate (Desktop & Web Portal)"]
        CoreAPI["Express API Server (:3001)"]
        ViteUI["Vite 8 / React 19 Frontend (:5000)"]
        DigitalTwin["3D Anatomical Twin & Posture Rig"]
        Companion["Kinetic Motion Personal Companion"]
    end

    subgraph NativeDomains ["Domain-Owned Service Modules"]
        EquityMod["NiftyLens Equity Watch (:5105)"]
        FamilyMod["Family Connect Tree & API (:3104 / :5104)"]
        ForexMod["Forex ML Inference & Streamlit (:8000 / :8501)"]
        AdminAdapters["FinSync & OxFin Customer Admin"]
    end

    subgraph DataStorage ["Data & Intelligence Layer"]
        DBStudio["GrowthTrack DB Studio (:5556)"]
        SQLiteDB["SQLite / LibSQL (dev.db)"]
        MSSQLDB["Microsoft SQL Server (SSMS GrowthTrackDB)"]
    end

    ClientTier --> GW
    GW --> ViteUI
    GW --> CoreAPI
    GW --> DBStudio
    GW --> EquityMod
    GW --> FamilyMod
    GW --> ForexMod
    CoreAPI --> SQLiteDB
    CoreAPI -.-> MSSQLDB
    DBStudio --> SQLiteDB
\`\`\``,

    "Service Port & Protocol Matrix": `| Service | Port | Local URL | Health Check | Description |
| :--- | :--- | :--- | :--- | :--- |
| **Workspace Gateway** | \`5300\` | [http://127.0.0.1:5300](http://127.0.0.1:5300) | \`/health\` | Unified reverse proxy & companion router |
| **Ultimate UI** | \`5000\` | [http://127.0.0.1:5000/Ultimate/](http://127.0.0.1:5000/Ultimate/) | \`/Ultimate/\` | Core React 19 / Vite 8 portal interface |
| **Ultimate API** | \`3001\` | [http://127.0.0.1:3001](http://127.0.0.1:3001) | \`/api/health\` | Express backend, SQLite adapter, authentication |
| **GrowthTrack DB Studio** | \`5556\` | [http://localhost:5556](http://localhost:5556) | \`/api/tables\` | Live database browser and console |
| **NiftyLens (Equity)** | \`5105\` | [http://127.0.0.1:5105](http://127.0.0.1:5105) | \`/health\` | NSE/BSE market watch and technical charting |
| **Family Connect API** | \`3104\` | [http://127.0.0.1:3104](http://127.0.0.1:3104) | \`/health\` | Tree nodes, permissions and documents |
| **Family Connect Web** | \`5104\` | [http://127.0.0.1:5104](http://127.0.0.1:5104) | \`/\` | Standalone family interface (legacy) |
| **Forex Inference API** | \`8000\` | [http://127.0.0.1:8000](http://127.0.0.1:8000) | \`/health\` | FastAPI saved-model prediction service |
| **Forex Dashboard** | \`8501\` | [http://127.0.0.1:8501](http://127.0.0.1:8501) | \`/_stcore/health\` | Streamlit currency analytics dashboard |
| **Admin Design Demo** | \`5410\` | [http://127.0.0.1:5410/admin-demo.html](http://127.0.0.1:5410/admin-demo.html) | \`/admin-demo.html\` | Fictional customer-admin preview |`,

    "Key Capabilities & Highlights": `- 🧬 **3D Digital Twin Engine & Humanoid Rig:** Three.js / @react-three/fiber parametric physique simulator with real-time morphing, posture evaluation, authored wardrobe deformation, and GLB asset delivery.
- 🧠 **AI Personal Companion & Life OS:** Physics-driven floating interactive companion, habit streaks, sleep analytics, encrypted note revision vault, and calendar ICS synchronization.
- 📊 **NiftyLens Equity Intelligence:** Real-time / cached price tracking, Indian indices (NIFTY/SENSEX), watchlist management, technical charting, and explicit market freshness verification.
- 🌳 **Family Connect:** Interactive genealogical tree builder with React Flow, member relationship matrices, shared memory timelines, and encrypted private document storage.
- 📈 **Forex Machine Learning Inference:** FastAPI model serving, multi-currency ensemble predictions, and integrated Streamlit quantitative research cockpit.
- 🖥️ **Desktop Portal (Electron v2.0.1):** Native desktop client packaging with hardware-accelerated WebGL, per-user cache isolation, and live hot-reloading bridge.
- 🗄️ **Multi-Database Architecture:** Browser-based DB Studio console plus ready-to-run Microsoft SQL Server (SSMS) T-SQL schema alongside native SQLite/LibSQL storage.`,

    "Microsoft SQL Server & SSMS Setup": `For local enterprise database setups using **Microsoft SQL Server** and **SQL Server Management Studio (SSMS)**, a complete T-SQL schema script is available:

- **Script Path:** \`docs/GrowthTrack_MSSQL_SSMS.sql\` (also mirrored at \`growthtrack-ultimate/prisma/GrowthTrack_MSSQL_SSMS.sql\`)
- **Compatibility:** SQL Server 2017, 2019, 2022, and Azure SQL Database
- **Contents:** Complete DDL for all 73 tables, primary keys, foreign key constraints (configured to prevent cascade cycles), performance indexes, and initial system app settings.

### Instructions to Execute in SSMS:
1. Open **SQL Server Management Studio (SSMS)** and connect to your SQL Server instance (e.g. \`localhost\` or \`.\`).
2. Open \`docs/GrowthTrack_MSSQL_SSMS.sql\` via **File → Open → File...** (or \`Ctrl+O\`).
3. Click **Execute** (\`F5\`).
4. The script creates the database \`[GrowthTrackDB]\`, builds all tables, foreign keys, nonclustered indexes, and seeds default application configuration.`,

    "GitHub Wiki Architecture Plan": `The planned GitHub Wiki structure organizes the platform into modular guides:

1. **Home & Quickstart:** High-level project vision, directory map, prerequisites, and instant launcher guide.
2. **System Architecture & Gateway:** Reverse proxy routing, inter-service contracts, port matrix, and isolation policies.
3. **3D Digital Twin & Morph Engine:** Parametric avatar modeling, MakeHuman CC0 asset pipeline, GLB validation, and skeletal rigging.
4. **Life OS & Personal Companion:** Reactive motion physics, state persistence, habits matrix, and encrypted vault storage.
5. **Database Strategy (SQLite vs SSMS):** Choosing between the local LibSQL/SQLite adapter and Microsoft SQL Server / SSMS with schema comparison.
6. **Domain Modules & Portals:** NiftyLens (Equity), Family Connect, Forex ML Studio, and FinSync/OxFin admin adapters.
7. **Desktop Packaging & Electron:** Electron Builder setup, code signing, hardware acceleration, and release workflows.
8. **Testing & Quality Assurance:** Running Vitest, Playwright E2E tests, architecture linting, and accessibility audits.`
  };
}

fs.writeFileSync(appsJsonPath, JSON.stringify(apps, null, 2) + '\n');
console.log('Successfully updated docs/applications.json with rich sections');

