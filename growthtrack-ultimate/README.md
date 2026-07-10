# 🔱 Ultimate — Digital Twin Engine

> **The definitive sovereign tracking ecosystem.**
> GrowthTrack Ultimate is a hyper-premium, glassmorphic digital twin platform designed for deep biological, cognitive, and environmental tracking.

![Ultimate Dashboard Demo](./docs/dashboard.png)

*Watch the live demo GIF on the [Live Site](https://gokulsenthilkumar3.github.io/Ultimate/) or see the preview above.*

## 📖 Overview & App Usage

Ultimate isn't just a dashboard; it's a **tactical command center** for your biological and environmental state. Built with a focus on sovereign data, photorealistic 3D modeling, and real-time audit tracing, it provides a deterministic view of your progress.

### Core Usage Flow

1. **Onboarding**: Initialize your profile, metrics, and goals.
2. **Daily Check-In**: Log your mood, vitals, sleep, and habits every morning.
3. **Telemetry & Tracking**: Use individual modules (e.g., Training, Nutrition, Tasks) throughout the day.
4. **Predictive Analysis**: Review the Dashboards and Transformation Predictor to see where you will be 30 days from now based on your velocity.

---

## 🚀 Module Directory & Tab Functions

The App Hub contains over 30+ specialized modules. Here is a detailed breakdown of each tab and its function stubs:

### 🧬 Physiology & Health

- **HumanoidViewer (3D Morph Engine)**: Renders a high-fidelity 3D model of your body. Dynamically adjusts morph targets based on real-time metrics (Weight, HR, Stamina).
- **Assessment**: A DB-fetched Q&A flow that assesses your current health baseline. Enforces strict form validation before generating insights.
- **Dashboards**: Unified analytics displaying Bio-Balance Radar, Recovery Correlation, Cash Flow, and Habit Consistency. Includes native PNG export for all charts.
- **HealthExtras**: Tracks secondary biological data like Stress and Recovery indexes.
- **MetricLogger**: Logs granular telemetry (Weight, Sleep, Hydration) with strict bounds validation (e.g., Weight between 20-300kg).
- **Nutrition & HydrationTracker**: Deep tracking of metabolic inputs, macro splits, and water intake.
- **SleepDashboard**: Logs sleep duration (capped at 12 hours) and correlates quality with environmental factors.
- **Medical & MindWellness**: Logs medications, symptoms, mood states, and cognitive drive.

### ⚔️ Training & Performance

- **Training**: Construct and manage workout routines and track session volumes.
- **StrengthMetrics**: Granular tracking for powerlifting and hypertrophy metrics.
- **TransformationPredictor**: Uses a 30-day lookahead algorithm to project future biometrics based on current growth velocity.
- **Progress**: Visualizes photo uploads (synced with Supabase Storage) and calculates precise 30-day delta comparisons.

### 📅 Productivity & Organization

- **HabitsMatrix (Routine)**: A 28-day streak matrix. Supports dynamic reordering of habits via Up/Down controls, updating the database `order_index`.
- **Tasks**: Hierarchical task management with circular-reference protections to prevent infinite rendering loops.
- **Projects**: Manage complex workflows alongside physiological data. Includes full inline edit/delete functionality.
- **Calendar & Timesheet**: Tracks appointments and deep-work hours.
- **GoalsDashboard**: Long-term objective tracking with strict future-dated deadline validation.

### 📂 Operations & Library

- **Finance & SIPCalculator**: Tracks income, expenses, and asset accumulation. Prevents zero or negative transaction amounts.
- **Notes & Documents**: Markdown-enabled editors with XSS sanitization for secure journaling and file linking.
- **Shopping**: Manages required purchases. Automatically generates deep-links to Amazon/Flipkart based on the item name. Includes confirmation dialogs before clearing purchased items.
- **Entertainment**: Tracks media consumption (Movies, Books, Games). Enforces minimum bounds for seasons/episodes and persists OTT preferences locally.

### ⚙️ System & AI

- **AiDashboard**: Interacts with the local LLM proxy for bio-analytical insights.
- **CommandPalette**: Global shortcut system (`Ctrl+K`) for rapid navigation.
- **SettingsModal & Databases**: System configuration, theme toggles, and direct raw database access/auditing.

---

## 🛠 Tech Stack & Architecture

- **Frontend Core**: React 18, Vite, React Router, Zustand (State Management)
- **3D Engine**: Three.js, React Three Fiber (R3F), Drei, Postprocessing
- **Styling**: Vanilla CSS with Glassmorphism variables, Lucide React (Icons)
- **Data Visualization**: Recharts, html2canvas (Export)
- **Backend Sync**: Supabase REST API via proxy wrapper (`apiSync`)
- **Optimization**: All 30+ modules are strictly decoupled using `React.lazy()` and `Suspense` to ensure instantaneous initial load times.

## 🔒 Security & Validation Standards

The system employs aggressive client-side validation to ensure data integrity before it reaches the backend proxy:

1. **XSS Sanitization**: Prevented in all text inputs (Notes, Tasks).
2. **Boundary Enforcement**: Numeric inputs are hard-capped (e.g., Max 12h sleep, Min 20kg weight).
3. **Data Loss Prevention**: Destructive actions (Deleting Projects, Clearing Shopping Lists) require explicit confirmation.
4. **Error Boundaries**: The WebGL canvas is isolated. If the 3D renderer crashes, the core UI remains responsive.

## 🗺 Roadmap

- **Phase 1**: Persistence Stabilization & Core Architecture (Completed)
- **Phase 2**: E2E Testing & Component Decoupling (Completed)
- **Phase 3**: Validation, Security Fixes, and UI Polish (Completed)
- **Phase 4**: Supabase Backend Integration (Completed)
- **Phase 5**: Mobile App & Advanced AI Agents (Upcoming)
