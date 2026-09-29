<!-- markdownlint-disable MD033 MD036 MD041 MD060 -->
<div align="center">
  
# 🌌 GrowthTrack Ultimate

**The Perfection of Universe**

<br/>

[![React](https://img.shields.io/badge/React-19-06b6d4?style=for-the-badge&logo=react&logoColor=white)](https://react.dev)
[![Three.js](https://img.shields.io/badge/Three.js-WebGL2-7c3aed?style=for-the-badge&logo=threedotjs&logoColor=white)](https://threejs.org/)
[![Zustand](https://img.shields.io/badge/Zustand-State-f59e0b?style=for-the-badge&logo=react&logoColor=white)](https://docs.pmnd.rs/zustand)
[![Vite](https://img.shields.io/badge/Vite-HMR-646CFF?style=for-the-badge&logo=vite&logoColor=white)](https://vitejs.dev)

<br/>
<br/>

> *“INITIALISING DIGITAL TWIN... CHAMBER ONLINE. GLB INTEGRITY: 100%.”*

</div>

## Windows desktop build

The desktop target is self-contained: packaging synchronises the Prisma schema,
builds the web UI, and creates a Windows installer. On first launch Electron
copies the packaged seed database into its writable per-user data directory, so
the installed app never tries to write inside `Program Files`.

```powershell
npm run build:desktop
```

The generated installer is written to a fresh timestamped folder next to the
project, such as `../growthtrack-release-20260911184500`. `npm run db:sync`
uses Prisma schema push: use it only with a disposable local database, never
an owner's or production database. The server resolves `file:./dev.db`
relative to the project directory rather than the shell's current directory.

The desktop build bundles the generated Prisma client into
`prisma-generated/client`, avoiding hidden `.prisma` packaging issues.

If npm itself is unavailable on the machine, run `..\build-desktop.ps1` from
PowerShell at the repository root.

---

**GrowthTrack Ultimate** is a private personal operations hub for finance,
wellness, work and life. Its six-area route system and responsive component
foundation support light, dark, AMOLED, palette and density preferences.
The optional 3D physique view loads on demand; measurements and history do
not require WebGL. External integrations remain setup-required until real
authorization and provider validation are complete.

Current handoff: [implementation status](./docs/IMPLEMENTATION_STATUS.md),
[routes](./docs/ROUTES.md), [components](./docs/COMPONENTS.md),
[backend contracts](./server/backend-contracts.md), and
[safe migration](./docs/MIGRATION.md).

<br/>

## 🛸 Core Telemetry & Features

| System | Module | Status | Description |
| :--- | :--- | :---: | :--- |
| **Core** | Six product areas | `LOCAL` | Canonical routes, responsive navigation and server-backed records. |
| **Physique** | Optional 3D Mirror | `OPTIONAL` | Lazy-loaded visualization; manual measurements work without WebGL. |
| **Drafts** | Recoverable work | `LOCAL ONLY` | Owner-scoped browser drafts are not automatically submitted or synchronized. |
| **Connections** | Provider integrations | `SETUP REQUIRED` | CSV and manual entry remain available; a saved link is not a connected account. |

<br/>

## 🔬 GLB Health & Blender Pipeline

The humanoid twin relies on a carefully rigged `.glb` asset located at `public/assets/models/humanoid-base.glb`. The application engine dynamically injects custom shaders (Aura, Subsurface Scattering, God Rays) at runtime.

### 🛠️ Diagnostics Console

Run these commands to validate or rebuild your 3D asset:

```bash
# 1. Check overall health and validation state of the twin
npm run glb:health

# 2. Output the current priority checklist for Blender rebuilds
npm run glb:priority-fixes

# 3. Deep validate model structure against application requirements
npm run validate:glb
```

> ⚠️ **CRITICAL ALERT:** If you are rebuilding the mesh geometry, ensure you adhere strictly to the topology and rig constraints. See [`docs/BLENDER_PRIORITY_FIXES.md`](./docs/BLENDER_PRIORITY_FIXES.md) for the exact canonical order of shape keys.

<br/>

## 🚀 Boot Sequence (Quick Start)

Initiate the local development chamber:

```bash
npm install
npm run dev
```

## Production operations

Run `npm run backup:db` before migrations and retain encrypted copies outside the application host. The service expects secrets through environment variables; never package `.env` files or commit credentials. CI runs tests, lint, dependency audit, and the production build before deployment.

For data rights requests, use the privacy and terms pages as the user-facing policy baseline and implement export/deletion handling in the deployment environment before accepting production users.

<br/>

<div align="center">
  <small>System engineered for optimal performance. End of transmission.</small>
</div>
