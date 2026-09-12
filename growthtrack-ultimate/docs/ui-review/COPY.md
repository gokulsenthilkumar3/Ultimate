# Copy inventory and rewrites

All 316 original frontend message candidates are retained below, including diagnostics and incidental matches. This is not a claim that every candidate is user-visible or rewritten. Server-generated messages and template expressions missed by the candidate matcher remain outside this table. New curated error keys live in src/lib/uiMessages.js.

| File:Line | Old | New / disposition | Status |
|---|---|---|---|
| src/App.jsx:10 | ./components/ErrorBoundary | Retained; requires contextual classification and review | Open / not individually verified |
| src/App.jsx:31 | ./components/ui/LoadingSkeleton | Retained; requires contextual classification and review | Open / not individually verified |
| src/App.jsx:99 | LOADING MODULE | Retained; requires contextual classification and review | Open / not individually verified |
| src/components/About.jsx:21 | Offline | Retained; requires contextual classification and review | Open / not individually verified |
| src/components/About.jsx:47 | Failed to fetch from GitHub | Retained; requires contextual classification and review | Open / not individually verified |
| src/components/About.jsx:274 | Error loading commits: | Retained; requires contextual classification and review | Open / not individually verified |
| src/components/AiDashboard.jsx:154 | API error | Retained; requires contextual classification and review | Open / not individually verified |
| src/components/AiDashboard.jsx:156 | AI request failed. Please try again. | Retained; requires contextual classification and review | Open / not individually verified |
| src/components/AiDashboard.jsx:170 | Failed to copy | Retained; requires contextual classification and review | Open / not individually verified |
| src/components/Analytics.jsx:8 | ../lib/emptyValues | Retained; requires contextual classification and review | Open / not individually verified |
| src/components/Analytics.jsx:374 | No habits tracked yet. | Retained; requires contextual classification and review | Open / not individually verified |
| src/components/Analytics.jsx:394 | No goals tracked yet. | Retained; requires contextual classification and review | Open / not individually verified |
| src/components/AppLauncher.jsx:29 | Browse and manage your saved data. | Retained; requires contextual classification and review | Open / not individually verified |
| src/components/AppLauncher.jsx:138 | app-hub-empty | Retained; requires contextual classification and review | Open / not individually verified |
| src/components/Assessment.jsx:1 | ../lib/emptyValues | Retained; requires contextual classification and review | Open / not individually verified |
| src/components/Assessment.jsx:78 | Assessment saved! | Retained; requires contextual classification and review | Open / not individually verified |
| src/components/Assessment.jsx:82 | Failed to save assessment. | Retained; requires contextual classification and review | Open / not individually verified |
| src/components/Assessment.jsx:102 | saved. | Retained; requires contextual classification and review | Open / not individually verified |
| src/components/Assessment.jsx:221 | No assessments yet. Click "New Assessment" to start. | Retained; requires contextual classification and review | Open / not individually verified |
| src/components/AuthForms.jsx:37 | Authentication failed | Retained; requires contextual classification and review | Open / not individually verified |
| src/components/AuthForms.jsx:46 | Success | Retained; requires contextual classification and review | Open / not individually verified |
| src/components/AuthForms.jsx:46 | Logged in successfully | Retained; requires contextual classification and review | Open / not individually verified |
| src/components/AuthForms.jsx:46 | Account created successfully | Retained; requires contextual classification and review | Open / not individually verified |
| src/components/AuthForms.jsx:46 | success | Retained; requires contextual classification and review | Open / not individually verified |
| src/components/AuthForms.jsx:49 | Error | Retained; requires contextual classification and review | Open / not individually verified |
| src/components/AuthForms.jsx:49 | error | Retained; requires contextual classification and review | Open / not individually verified |
| src/components/Calendar.jsx:5 | ./ui/EmptyState | Retained; requires contextual classification and review | Open / not individually verified |
| src/components/Calendar.jsx:96 | Event could not be saved. Your draft is still here. | Retained; requires contextual classification and review | Open / not individually verified |
| src/components/Calendar.jsx:103 | Event could not be deleted. Try again. | Retained; requires contextual classification and review | Open / not individually verified |
| src/components/ChamberCanvas.jsx:20 | ./TabErrorBoundary | Retained; requires contextual classification and review | Open / not individually verified |
| src/components/Current.jsx:1 | ../lib/emptyValues | Retained; requires contextual classification and review | Open / not individually verified |
| src/components/Current.jsx:72 | Weather fetch failed | Retained; requires contextual classification and review | Open / not individually verified |
| src/components/Current.jsx:167 | Loading weather… | Retained; requires contextual classification and review | Open / not individually verified |
| src/components/Current.jsx:173 | Location required | Retained; requires contextual classification and review | Open / not individually verified |
| src/components/Current.jsx:231 | Loading… | Retained; requires contextual classification and review | Open / not individually verified |
| src/components/DailyCheckIn.jsx:6 | ./ui/SavedIndicator | Retained; requires contextual classification and review | Open / not individually verified |
| src/components/DailyCheckIn.jsx:225 | Your data has been saved. Have a great day! | Retained; requires contextual classification and review | Open / not individually verified |
| src/components/DailyCheckIn.jsx:277 | var(--success) | Retained; requires contextual classification and review | Open / not individually verified |
| src/components/DailyCheckIn.jsx:281 | Saved! | Retained; requires contextual classification and review | Open / not individually verified |
| src/components/Dashboards.jsx:262 | var(--success) | Retained; requires contextual classification and review | Open / not individually verified |
| src/components/Dashboards.jsx:331 | var(--success) | Retained; requires contextual classification and review | Open / not individually verified |
| src/components/Databases.jsx:5 | ./ui/EmptyState | Retained; requires contextual classification and review | Open / not individually verified |
| src/components/Databases.jsx:124 | required | Retained; requires contextual classification and review | Open / not individually verified |
| src/components/Databases.jsx:220 | Empty or invalid CSV | Retained; requires contextual classification and review | Open / not individually verified |
| src/components/Databases.jsx:311 | No rows yet | Retained; requires contextual classification and review | Open / not individually verified |
| src/components/Databases.jsx:378 | Configuration could not be saved. | Retained; requires contextual classification and review | Open / not individually verified |
| src/components/Databases.jsx:420 | No tables yet | Retained; requires contextual classification and review | Open / not individually verified |
| src/components/DeviceSyncModal.jsx:18 | Apple Health data imported successfully | Retained; requires contextual classification and review | Open / not individually verified |
| src/components/DeviceSyncModal.jsx:18 | success | Retained; requires contextual classification and review | Open / not individually verified |
| src/components/DeviceSyncModal.jsx:23 | Sync Failed | Retained; requires contextual classification and review | Open / not individually verified |
| src/components/DeviceSyncModal.jsx:23 | error | Retained; requires contextual classification and review | Open / not individually verified |
| src/components/Documents.jsx:1 | ../lib/emptyValues | Retained; requires contextual classification and review | Open / not individually verified |
| src/components/Documents.jsx:194 | Upload failed | We could not save this file record. Check your connection and try again. | Rewritten |
| src/components/Documents.jsx:207 | Delete failed | Retained; requires contextual classification and review | Open / not individually verified |
| src/components/Documents.jsx:220 | Bulk delete failed | Retained; requires contextual classification and review | Open / not individually verified |
| src/components/Documents.jsx:405 | Your vault is empty | Retained; requires contextual classification and review | Open / not individually verified |
| src/components/Entertainment.jsx:15 | ./ui/EmptyState | Retained; requires contextual classification and review | Open / not individually verified |
| src/components/Entertainment.jsx:20 | var(--success) | Retained; requires contextual classification and review | Open / not individually verified |
| src/components/Entertainment.jsx:229 | Trakt.tv credentials saved! | Retained; requires contextual classification and review | Open / not individually verified |
| src/components/Entertainment.jsx:248 | Trakt API request failed. Check your Client ID and username. | Retained; requires contextual classification and review | Open / not individually verified |
| src/components/Entertainment.jsx:278 | Trakt sync failed. | Retained; requires contextual classification and review | Open / not individually verified |
| src/components/Entertainment.jsx:302 | Title cannot be empty | Retained; requires contextual classification and review | Open / not individually verified |
| src/components/Entertainment.jsx:378 | var(--success) | Retained; requires contextual classification and review | Open / not individually verified |
| src/components/ErrorBoundary.jsx:7 | [GrowthTrack] Component Error: | Retained; requires contextual classification and review | Open / not individually verified |
| src/components/ErrorBoundary.jsx:18 | Try again, or open another page from the navigation. Your saved data has not been changed. | Retained; requires contextual classification and review | Open / not individually verified |
| src/components/finance/AnalyticsTab.tsx:5 | ../ui/EmptyState | Retained; requires contextual classification and review | Open / not individually verified |
| src/components/finance/AnalyticsTab.tsx:76 | Nothing to chart | Retained; requires contextual classification and review | Open / not individually verified |
| src/components/finance/BudgetingTab.tsx:5 | ../ui/EmptyState | Retained; requires contextual classification and review | Open / not individually verified |
| src/components/finance/BudgetingTab.tsx:31 | Category and limit required | Retained; requires contextual classification and review | Open / not individually verified |
| src/components/finance/BudgetingTab.tsx:57 | var(--success) | Retained; requires contextual classification and review | Open / not individually verified |
| src/components/finance/OverviewTab.tsx:5 | ../ui/EmptyState | Retained; requires contextual classification and review | Open / not individually verified |
| src/components/finance/OverviewTab.tsx:34 | No expense data recorded for this month yet. | Retained; requires contextual classification and review | Open / not individually verified |
| src/components/finance/SubscriptionsTab.tsx:5 | ../ui/EmptyState | Retained; requires contextual classification and review | Open / not individually verified |
| src/components/finance/SubscriptionsTab.tsx:24 | Name and cost are required | Retained; requires contextual classification and review | Open / not individually verified |
| src/components/finance/TrendsTab.tsx:5 | ../ui/EmptyState | Retained; requires contextual classification and review | Open / not individually verified |
| src/components/Finance.tsx:9 | ./ui/EmptyState | Retained; requires contextual classification and review | Open / not individually verified |
| src/components/Finance.tsx:152 | var(--success) | Retained; requires contextual classification and review | Open / not individually verified |
| src/components/Finance.tsx:153 | var(--success) | Retained; requires contextual classification and review | Open / not individually verified |
| src/components/Finance.tsx:155 | Invested / Saved | Retained; requires contextual classification and review | Open / not individually verified |
| src/components/Finance.tsx:202 | Delete failed. The transaction was restored. | Retained; requires contextual classification and review | Open / not individually verified |
| src/components/Finance.tsx:232 | CSV import failed | Retained; requires contextual classification and review | Open / not individually verified |
| src/components/Finance.tsx:246 | Axio sync failed. Check the server connection and try again. | Retained; requires contextual classification and review | Open / not individually verified |
| src/components/Finance.tsx:306 | Loading charting module... | Retained; requires contextual classification and review | Open / not individually verified |
| src/components/Finance.tsx:334 | finance-budget-bar-success | Retained; requires contextual classification and review | Open / not individually verified |
| src/components/FloatingPillDock.jsx:84 | mobile-module-menu__empty | Retained; requires contextual classification and review | Open / not individually verified |
| src/components/GoalsDashboard.jsx:12 | ./ui/EmptyState | Retained; requires contextual classification and review | Open / not individually verified |
| src/components/GoalsDashboard.jsx:243 | Failed to log progress. | Retained; requires contextual classification and review | Open / not individually verified |
| src/components/GoalsDashboard.jsx:278 | Deadline cannot be in the past. | Retained; requires contextual classification and review | Open / not individually verified |
| src/components/GoalsDashboard.jsx:297 | Deadline cannot be in the past. | Retained; requires contextual classification and review | Open / not individually verified |
| src/components/GoalsDashboard.jsx:582 | Loading history… | Retained; requires contextual classification and review | Open / not individually verified |
| src/components/HabitsMatrix.jsx:7 | ./ui/EmptyState | Retained; requires contextual classification and review | Open / not individually verified |
| src/components/Header.jsx:37 | Offline | Retained; requires contextual classification and review | Open / not individually verified |
| src/components/HealthExtras.jsx:1 | ../lib/emptyValues | Retained; requires contextual classification and review | Open / not individually verified |
| src/components/HealthExtras.jsx:43 | glass-card health-empty-state | Retained; requires contextual classification and review | Open / not individually verified |
| src/components/HealthExtras.jsx:43 | Add recovery metrics below or connect a health source. Saved values will appear from the local Health table. | Retained; requires contextual classification and review | Open / not individually verified |
| src/components/HealthExtras.jsx:144 | var(--success) | Retained; requires contextual classification and review | Open / not individually verified |
| src/components/HealthExtras.jsx:181 | var(--success) | Retained; requires contextual classification and review | Open / not individually verified |
| src/components/HealthExtras.jsx:243 | var(--success) | Retained; requires contextual classification and review | Open / not individually verified |
| src/components/HealthScoreRing.jsx:35 | var(--success) | Retained; requires contextual classification and review | Open / not individually verified |
| src/components/Helpdesk.jsx:5 | Your workspace is saved locally and, when you are signed in, synchronized with the API database. Restarting the UI or server does not clear your profile, goals, logs, or plans. | Retained; requires contextual classification and review | Open / not individually verified |
| src/components/Helpdesk.jsx:35 | empty-state | Retained; requires contextual classification and review | Open / not individually verified |
| src/components/Helpdesk.jsx:37 | Set one physique target, one weekly goal, and one calendar commitment. Analytics can then forecast progress from real activity instead of empty assumptions. | Retained; requires contextual classification and review | Open / not individually verified |
| src/components/HumanoidViewer.tsx:21 | ./TabErrorBoundary | Retained; requires contextual classification and review | Open / not individually verified |
| src/components/HumanoidViewer.tsx:589 | Timeline snapshot saved. | Retained; requires contextual classification and review | Open / not individually verified |
| src/components/HumanoidViewer.tsx:666 | LOADING MODEL | Retained; requires contextual classification and review | Open / not individually verified |
| src/components/HumanoidViewer.tsx:807 | 3D Engine Error | Retained; requires contextual classification and review | Open / not individually verified |
| src/components/HumanoidViewer.tsx:918 | var(--chamber-success) | Retained; requires contextual classification and review | Open / not individually verified |
| src/components/HumanoidViewer.tsx:1084 | Preview the production expression channels. These controls are saved as shape overrides and never alter measurements. | Retained; requires contextual classification and review | Open / not individually verified |
| src/components/HydrationTracker.jsx:70 | Hydration sync failed | Retained; requires contextual classification and review | Open / not individually verified |
| src/components/HydrationTracker.jsx:205 | Loading logs\u2026 | Retained; requires contextual classification and review | Open / not individually verified |
| src/components/InsightsHub.jsx:108 | hub-loading | Retained; requires contextual classification and review | Open / not individually verified |
| src/components/InsightsHub.jsx:108 | Loading insights… | Retained; requires contextual classification and review | Open / not individually verified |
| src/components/Lifestyle.jsx:55 | No habits yet | Retained; requires contextual classification and review | Open / not individually verified |
| src/components/Lifestyle.jsx:140 | Habit name required | Retained; requires contextual classification and review | Open / not individually verified |
| src/components/Lifestyle.jsx:146 | Failed to add habit | Retained; requires contextual classification and review | Open / not individually verified |
| src/components/Lifestyle.jsx:156 | Delete failed | Retained; requires contextual classification and review | Open / not individually verified |
| src/components/Lifestyle.jsx:169 | Failed to update habit | Retained; requires contextual classification and review | Open / not individually verified |
| src/components/Lifestyle.jsx:250 | No habits yet | Retained; requires contextual classification and review | Open / not individually verified |
| src/components/Logs.jsx:5 | ./ui/EmptyState | Retained; requires contextual classification and review | Open / not individually verified |
| src/components/Logs.jsx:10 | error | Retained; requires contextual classification and review | Open / not individually verified |
| src/components/Logs.jsx:10 | login_success | Retained; requires contextual classification and review | Open / not individually verified |
| src/components/Logs.jsx:10 | login_failed | Retained; requires contextual classification and review | Open / not individually verified |
| src/components/Logs.jsx:28 | success | Retained; requires contextual classification and review | Open / not individually verified |
| src/components/Logs.jsx:28 | saved | Retained; requires contextual classification and review | Open / not individually verified |
| src/components/Logs.jsx:29 | error | Retained; requires contextual classification and review | Open / not individually verified |
| src/components/Logs.jsx:29 | failed | Retained; requires contextual classification and review | Open / not individually verified |
| src/components/Logs.jsx:29 | invalid | Retained; requires contextual classification and review | Open / not individually verified |
| src/components/Logs.jsx:140 | Details required. | Retained; requires contextual classification and review | Open / not individually verified |
| src/components/Logs.jsx:152 | Failed to add log entry. | Retained; requires contextual classification and review | Open / not individually verified |
| src/components/Logs.jsx:264 | No audit logs recorded yet. | Retained; requires contextual classification and review | Open / not individually verified |
| src/components/Maps.jsx:1 | ../lib/emptyValues | Retained; requires contextual classification and review | Open / not individually verified |
| src/components/Maps.jsx:19 | Location saved to the local timeline. | Retained; requires contextual classification and review | Open / not individually verified |
| src/components/Maps.jsx:39 | Location points are saved in your local database. Automatic browser tracking runs while GrowthTrack is open and location permission remains enabled. | Retained; requires contextual classification and review | Open / not individually verified |
| src/components/Maps.jsx:41 | saved point | Retained; requires contextual classification and review | Open / not individually verified |
| src/components/Medical.jsx:12 | ../lib/emptyValues | Retained; requires contextual classification and review | Open / not individually verified |
| src/components/Medical.jsx:265 | Failed to save vital — check your connection. | Retained; requires contextual classification and review | Open / not individually verified |
| src/components/Medical.jsx:270 | Medication name is required. | Retained; requires contextual classification and review | Open / not individually verified |
| src/components/Medical.jsx:271 | Dose / dosage is required (e.g. 1000 IU). | Retained; requires contextual classification and review | Open / not individually verified |
| src/components/Medical.jsx:276 | Failed to save medication. | Retained; requires contextual classification and review | Open / not individually verified |
| src/components/Medical.jsx:301 | Clinical baseline data, required diagnostics, and medication tracking. | Retained; requires contextual classification and review | Open / not individually verified |
| src/components/Medical.jsx:330 | Required Blood Panels | Retained; requires contextual classification and review | Open / not individually verified |
| src/components/Medical.jsx:332 | No required tests listed. Connect an API to populate from your health data. | Retained; requires contextual classification and review | Open / not individually verified |
| src/components/Medical.jsx:414 | No vitals logged yet. | Retained; requires contextual classification and review | Open / not individually verified |
| src/components/Medical.jsx:483 | No medications tracked yet. | Retained; requires contextual classification and review | Open / not individually verified |
| src/components/MetricLogger.jsx:64 | Photo upload error | Retained; requires contextual classification and review | Open / not individually verified |
| src/components/MetricLogger.jsx:106 | Failed to save metrics. | Retained; requires contextual classification and review | Open / not individually verified |
| src/components/MetricLogger.jsx:229 | Uploading… | Retained; requires contextual classification and review | Open / not individually verified |
| src/components/MetricLogger.jsx:267 | Saved! | Retained; requires contextual classification and review | Open / not individually verified |
| src/components/MetricLogger.jsx:269 | Uploading… | Retained; requires contextual classification and review | Open / not individually verified |
| src/components/MindWellness.jsx:211 | Journal entry saved | Retained; requires contextual classification and review | Open / not individually verified |
| src/components/MindWellness.jsx:529 | Check-in saved ✓ | Retained; requires contextual classification and review | Open / not individually verified |
| src/components/MindWellness.jsx:684 | ✓ Check-in Saved — Update | Retained; requires contextual classification and review | Open / not individually verified |
| src/components/morphEngine/SceneEnvironment.jsx:6 | ../ErrorBoundary | Retained; requires contextual classification and review | Open / not individually verified |
| src/components/morphEngine/UberShader.js:103 | precision highp float;    // ── Uniforms ────────────────────────────────────────────────────────────────   uniform vec3  uBaseColor;           // Fitzpatrick base skin color   uniform vec3  uSSSColor;            // Fitzpatrick SSS scatter color   uniform vec3  uSpecColor;           // Specular tint    uniform float uAnatomyDepth;        // 0–100 (100 = full skin)   uniform vec3  uMuscleColor;   uniform vec3  uSkeletonColor;   uniform vec3  uOrgansColor;    uniform float uVascularityIntensity; // 0–1   uniform float uTime;                 // elapsed seconds    // ── Varyings ────────────────────────────────────────────────────────────────   varying vec3  vWorldPosition;   varying vec3  vWorldNormal;   varying vec2  vUv;   varying vec3  vViewDir;   varying float vDepthFade;    // ── Light structure (inline key + fill + rim matching Layer 2) ────────────   struct DirLight {     vec3 direction;     vec3 color;     float intensity;   };    // Mirror of StudioLighting.jsx light positions → directions   const DirLight KEY_LIGHT  = DirLight(normalize(vec3(3.0, -5.0, -3.0)),  vec3(1.00, 0.96, 0.88), 2.2);   const DirLight FILL_LIGHT = DirLight(normalize(vec3(-4.0, -2.0, -2.0)), vec3(0.84, 0.93, 1.00), 0.7);   const DirLight RIM_LIGHT  = DirLight(normalize(vec3(0.0, -1.0, 5.0)),   vec3(0.53, 0.60, 1.00), 1.2);    // ── Beckmann specular (physically-based skin highlight) ───────────────────   float beckmann(float NdH, float roughness) {     float r2  = roughness * roughness;     float NdH2 = NdH * NdH;     return exp((NdH2 - 1.0) / (r2 * NdH2)) / (3.14159 * r2 * NdH2 * NdH2);   }    // ── Kelemen-Szirmay-Kalos SSS approximation ────────────────────────────────   // Simulates light transport under thin translucent skin.   // Based on: https://advances.realtimerendering.com/s2010/   float sssScatter(vec3 N, vec3 L, float scatter) {     // Wrap lighting: allows light to bleed slightly around the terminator     float wrap  = 0.3;     float NdotL = max(0.0, (dot(N, L) + wrap) / (1.0 + wrap));      // Gaussian scatter: simulates multiple scattering depths     float g1    = exp(-NdotL * NdotL / (2.0 * scatter * scatter));     float g2    = exp(-NdotL * NdotL / (2.0 * (scatter * 3.0) * (scatter * 3.0)));     return mix(g1, g2, 0.3) * 0.5;   }    // ── Procedural pore noise (cheap, no texture required) ────────────────────   // Layered fract-sin hash for micro surface variation   float poreNoise(vec2 uv) {     vec2 p   = uv * 120.0;     float n1 = fract(sin(dot(p,           vec2(127.1, 311.7))) * 43758.5453);     float n2 = fract(sin(dot(p * 0.5,     vec2(269.5, 183.3))) * 43758.5453);     float n3 = fract(sin(dot(p * 2.0,     vec2( 92.3, 501.1))) * 43758.5453);     return n1 * 0.5 + n2 * 0.3 + n3 * 0.2;   }    // ── Vascularity vein pattern ───────────────────────────────────────────────   // Worley-cell network simulating subcutaneous vein branching.    float worleyDist(vec3 p, float scale) {     p *= scale;     vec3  ip  = floor(p);     vec3  fp  = fract(p);     float md  = 1.0;     for (int xi = -1; xi <= 1; xi++) {       for (int yi = -1; yi <= 1; yi++) {         for (int zi = -1; zi <= 1; zi++) {           vec3 nb   = vec3(float(xi), float(yi), float(zi));           vec3 rnd  = vec3(fract(sin(dot(ip + nb, vec3(127.1, 311.7, 74.7))) * 43758.5453));           vec3 diff = nb + rnd - fp;           md = min(md, dot(diff, diff));         }       }     }     return sqrt(md);   }    // Fine Worley + wide Worley combined → thin vein lines with larger feed vessels   float veinPattern(vec3 p) {     float d1   = worleyDist(p, 7.0);     float d2   = worleyDist(p * vec3(1.0, 0.45, 1.0), 3.5);     float thin = 1.0 - smoothstep(0.0, 0.10, d1);     float wide = 1.0 - smoothstep(0.0, 0.20, d2);     return clamp(thin * 0.65 + wide * 0.35, 0.0, 1.0);   }     // ── Anatomy depth compositor ───────────────────────────────────────────────   // Blends skin / muscle / skeleton / organs based on uAnatomyDepth.   vec3 anatomyColor(vec3 skinColor) {     float d = uAnatomyDepth;  // 0–100      // Skin zone: 70–100     float skinWeight     = smoothstep(60.0, 80.0, d);      // Muscle zone: 30–70     float muscleWeight   = (1.0 - skinWeight) * smoothstep(20.0, 40.0, d);      // Skeleton zone: 10–30     float skeletonWeight = (1.0 - skinWeight - muscleWeight) * smoothstep(0.0, 20.0, d);      // Organs: remainder (d < 10)     float organsWeight   = 1.0 - skinWeight - muscleWeight - skeletonWeight;      // Skeleton gets a phosphor emissive pulse     float pulse = 0.5 + 0.5 * sin(uTime * 1.8);     vec3 skeletonEmissive = uSkeletonColor * (0.8 + 0.4 * pulse);      vec3 result = vec3(0.0);     result += skinColor      * skinWeight;     result += uMuscleColor   * muscleWeight;     result += skeletonEmissive * skeletonWeight;     result += uOrgansColor   * organsWeight;      return result;   }    void main() {     vec3  N   = normalize(vWorldNormal);     vec3  V   = normalize(vViewDir);      // ── Pore micro-detail ──────────────────────────────────────────────────────     float pore       = poreNoise(vUv);     float roughness  = mix(0.65, 0.85, pore);  // 0.65 (oily) → 0.85 (dry)      // ── Accumulate lighting from 3 studio lights ────────────────────────────     vec3 diffuse  = vec3(0.0);     vec3 specular = vec3(0.0);     vec3 scatter  = vec3(0.0);      DirLight lights[3];     lights[0] = KEY_LIGHT;     lights[1] = FILL_LIGHT;     lights[2] = RIM_LIGHT;      for (int i = 0; i < 3; i++) {       vec3  L    = -lights[i].direction;       vec3  H    = normalize(L + V);       float NdL  = max(0.0, dot(N, L));       float NdH  = max(0.001, dot(N, H));        // Diffuse (Lambert)       diffuse  += lights[i].color * lights[i].intensity * NdL;        // Specular dual-lobe: tight highlight + soft sheen       float sp1  = beckmann(NdH, 0.25);   // tight oily highlight       float sp2  = beckmann(NdH, 0.65);   // wide soft sheen       float sp   = mix(sp1 * 0.6, sp2 * 0.4, pore);       specular += lights[i].color * lights[i].intensity * sp * NdL * 0.04;        // SSS scatter (strongest through ears, fingers, lips — approximated)       float sss  = sssScatter(N, L, 0.35);       scatter  += lights[i].color * lights[i].intensity * sss * 0.4;     }      // ── Ambient occlusion proxy (sky hemisphere) ────────────────────────────     float ao         = 0.5 + 0.5 * dot(N, vec3(0.0, 1.0, 0.0));     vec3  ambient    = vec3(0.04, 0.04, 0.06) * ao;      // ── Compose skin color ──────────────────────────────────────────────────     vec3 skinColor   = uBaseColor  * diffuse                      + uSSSColor   * scatter                      + uSpecColor  * specular                      + uBaseColor  * ambient;      // ── Vascularity overlay ─────────────────────────────────────────────────     if (uVascularityIntensity > 0.0) {       float veins     = veinPattern(vWorldPosition);       vec3  veinColor = vec3(0.30, 0.08, 0.08); // dark venous blue-red       skinColor       = mix(skinColor, veinColor, veins * uVascularityIntensity * 0.55);     }      // ── Anatomy depth composite ──────────────────────────────────────────────     vec3 finalColor  = anatomyColor(skinColor);      // ── Fresnel rim (adds subtle translucency glow at silhouette edges) ──────     float fresnel    = pow(1.0 - max(0.0, dot(N, V)), 3.0);     vec3  rimColor   = mix(uSSSColor, vec3(1.0, 0.85, 0.75), 0.5);     finalColor      += rimColor * fresnel * 0.08;      gl_FragColor     = vec4(finalColor, 1.0);   } | Retained; requires contextual classification and review | Open / not individually verified |
| src/components/morphEngine/useModelLoader.js:179 | [useModelLoader] GLB load failed, using fallback mesh: | Retained; requires contextual classification and review | Open / not individually verified |
| src/components/morphEngine/useModelLoader.js:322 | [useModelLoader] Error processing GLB: | Retained; requires contextual classification and review | Open / not individually verified |
| src/components/Notes.jsx:5 | ./ui/EmptyState | Retained; requires contextual classification and review | Open / not individually verified |
| src/components/Notes.jsx:148 | Note saved successfully | Retained; requires contextual classification and review | Open / not individually verified |
| src/components/Notes.jsx:274 | empty-state | Retained; requires contextual classification and review | Open / not individually verified |
| src/components/Notes.jsx:277 | notes-empty-icon | Retained; requires contextual classification and review | Open / not individually verified |
| src/components/Notes.jsx:307 | w · Auto-saved | Retained; requires contextual classification and review | Open / not individually verified |
| src/components/Nutrition.jsx:267 | Meal name cannot be empty. | Retained; requires contextual classification and review | Open / not individually verified |
| src/components/Nutrition.jsx:281 | Failed to save meal log. | Retained; requires contextual classification and review | Open / not individually verified |
| src/components/Nutrition.jsx:288 | Delete failed. | Retained; requires contextual classification and review | Open / not individually verified |
| src/components/Nutrition.jsx:469 | empty-msg | Retained; requires contextual classification and review | Open / not individually verified |
| src/components/Nutrition.jsx:529 | empty-msg | Retained; requires contextual classification and review | Open / not individually verified |
| src/components/OnboardingWizard.jsx:36 | Name is required. | Retained; requires contextual classification and review | Open / not individually verified |
| src/components/OnboardingWizard.jsx:70 | We could not save your setup. Check your connection and try again. | Retained; requires contextual classification and review | Open / not individually verified |
| src/components/Overview.jsx:396 | Loading weather… | Retained; requires contextual classification and review | Open / not individually verified |
| src/components/Physique.jsx:1 | ../lib/emptyValues | Retained; requires contextual classification and review | Open / not individually verified |
| src/components/Physique.jsx:248 | LOADING 3D MIRROR | Retained; requires contextual classification and review | Open / not individually verified |
| src/components/Physique.jsx:257 | Saved | Retained; requires contextual classification and review | Open / not individually verified |
| src/components/PhysiqueDataPanel.jsx:88 | physique-empty | Retained; requires contextual classification and review | Open / not individually verified |
| src/components/PhysiqueDataPanel.jsx:88 | No journey milestones yet | Retained; requires contextual classification and review | Open / not individually verified |
| src/components/Portfolio.jsx:8 | ./ui/EmptyState | Retained; requires contextual classification and review | Open / not individually verified |
| src/components/Portfolio.jsx:134 | Asset name is required. | Retained; requires contextual classification and review | Open / not individually verified |
| src/components/Portfolio.jsx:346 | No holdings yet. | Retained; requires contextual classification and review | Open / not individually verified |
| src/components/Portfolio.jsx:359 | No holdings yet. | Retained; requires contextual classification and review | Open / not individually verified |
| src/components/PremiumSidebar.jsx:168 | sidebar-search-empty | Retained; requires contextual classification and review | Open / not individually verified |
| src/components/Pricing.jsx:30 | Failed to create checkout session | Retained; requires contextual classification and review | Open / not individually verified |
| src/components/Pricing.jsx:34 | Error connecting to payment provider | Retained; requires contextual classification and review | Open / not individually verified |
| src/components/ProfileEditor.jsx:531 | Crop failed | Retained; requires contextual classification and review | Open / not individually verified |
| src/components/ProfileEditor.jsx:549 | Failed to upload image | Retained; requires contextual classification and review | Open / not individually verified |
| src/components/ProfileEditor.jsx:655 | Current password is required to change password | Retained; requires contextual classification and review | Open / not individually verified |
| src/components/ProfileEditor.jsx:659 | New password is required | Retained; requires contextual classification and review | Open / not individually verified |
| src/components/ProfileEditor.jsx:719 | Profile saved successfully | Retained; requires contextual classification and review | Open / not individually verified |
| src/components/ProfileEditor.jsx:727 | Failed to save profile | Retained; requires contextual classification and review | Open / not individually verified |
| src/components/ProfileEditor.jsx:976 | No social links added yet. | Retained; requires contextual classification and review | Open / not individually verified |
| src/components/ProfileEditor.jsx:1137 | Optional measured values improve the digital twin. Leave anything unknown empty; the model will not invent measurements. | Retained; requires contextual classification and review | Open / not individually verified |
| src/components/Progress.jsx:15 | ../lib/emptyValues | Retained; requires contextual classification and review | Open / not individually verified |
| src/components/Progress.jsx:66 | metric_logs refresh error | Retained; requires contextual classification and review | Open / not individually verified |
| src/components/Progress.jsx:284 | No progress photos yet. | Retained; requires contextual classification and review | Open / not individually verified |
| src/components/Progress.jsx:393 | No progress entries yet. | Retained; requires contextual classification and review | Open / not individually verified |
| src/components/Progress.jsx:429 | No logs yet. | Retained; requires contextual classification and review | Open / not individually verified |
| src/components/Projects.jsx:27 | var(--success) | Retained; requires contextual classification and review | Open / not individually verified |
| src/components/Projects.jsx:107 | GitHub token is invalid or expired. Please reconnect in settings. | Retained; requires contextual classification and review | Open / not individually verified |
| src/components/Projects.jsx:110 | Failed | Retained; requires contextual classification and review | Open / not individually verified |
| src/components/Projects.jsx:118 | Repository name is required | Retained; requires contextual classification and review | Open / not individually verified |
| src/components/Projects.jsx:144 | Failed to save repository | Retained; requires contextual classification and review | Open / not individually verified |
| src/components/Projects.jsx:176 | Failed to delete repository | Retained; requires contextual classification and review | Open / not individually verified |
| src/components/Projects.jsx:180 | Repository deleted successfully | Retained; requires contextual classification and review | Open / not individually verified |
| src/components/Projects.jsx:209 | Project title is required | Retained; requires contextual classification and review | Open / not individually verified |
| src/components/Projects.jsx:440 | var(--success) | Retained; requires contextual classification and review | Open / not individually verified |
| src/components/Projects.jsx:506 | var(--success) | Retained; requires contextual classification and review | Open / not individually verified |
| src/components/Projects.jsx:639 | No projects yet | Retained; requires contextual classification and review | Open / not individually verified |
| src/components/ProtectedRoute.jsx:20 | Loading... | Retained; requires contextual classification and review | Open / not individually verified |
| src/components/ReferralDashboard.jsx:78 | Loading history... | Retained; requires contextual classification and review | Open / not individually verified |
| src/components/ReferralDashboard.jsx:82 | No invites yet. Share your link to get started! | Retained; requires contextual classification and review | Open / not individually verified |
| src/components/ScrollShowcase.jsx:25 | hub-loading | Retained; requires contextual classification and review | Open / not individually verified |
| src/components/SettingsModal.jsx:42 | Offline | Retained; requires contextual classification and review | Open / not individually verified |
| src/components/SettingsModal.jsx:46 | Offline | Retained; requires contextual classification and review | Open / not individually verified |
| src/components/SettingsModal.jsx:50 | Offline | Retained; requires contextual classification and review | Open / not individually verified |
| src/components/SettingsModal.jsx:53 | Offline | Retained; requires contextual classification and review | Open / not individually verified |
| src/components/SettingsModal.jsx:66 | Error | Retained; requires contextual classification and review | Open / not individually verified |
| src/components/SettingsModal.jsx:69 | Offline | Retained; requires contextual classification and review | Open / not individually verified |
| src/components/SettingsModal.jsx:78 | Failed to fetch logs | Retained; requires contextual classification and review | Open / not individually verified |
| src/components/SettingsModal.jsx:274 | Loading logs... | Retained; requires contextual classification and review | Open / not individually verified |
| src/components/SettingsModal.jsx:299 | var(--success) | Retained; requires contextual classification and review | Open / not individually verified |
| src/components/Shopping.jsx:5 | ./ui/EmptyState | Retained; requires contextual classification and review | Open / not individually verified |
| src/components/Shopping.jsx:57 | Item name is required. | Retained; requires contextual classification and review | Open / not individually verified |
| src/components/Shopping.jsx:194 | Nothing here | Retained; requires contextual classification and review | Open / not individually verified |
| src/components/Skills.jsx:5 | ./ui/EmptyState | Retained; requires contextual classification and review | Open / not individually verified |
| src/components/Skills.jsx:149 | Skill name required | Retained; requires contextual classification and review | Open / not individually verified |
| src/components/Skills.jsx:265 | No Skills Yet | Retained; requires contextual classification and review | Open / not individually verified |
| src/components/SleepDashboard.jsx:1 | ../lib/emptyValues | Retained; requires contextual classification and review | Open / not individually verified |
| src/components/SleepDashboard.jsx:112 | Delete failed | Retained; requires contextual classification and review | Open / not individually verified |
| src/components/SleepDashboard.jsx:117 | Date is required | Retained; requires contextual classification and review | Open / not individually verified |
| src/components/SleepDashboard.jsx:120 | Invalid sleep duration | Retained; requires contextual classification and review | Open / not individually verified |
| src/components/SleepDashboard.jsx:127 | Save failed | Retained; requires contextual classification and review | Open / not individually verified |
| src/components/SleepDashboard.jsx:190 | var(--success) | Retained; requires contextual classification and review | Open / not individually verified |
| src/components/SleepDashboard.jsx:214 | No sleep data yet | Retained; requires contextual classification and review | Open / not individually verified |
| src/components/SleepDashboard.jsx:270 | No data yet | Retained; requires contextual classification and review | Open / not individually verified |
| src/components/SleepDashboard.jsx:300 | No data yet | Retained; requires contextual classification and review | Open / not individually verified |
| src/components/SleepDashboard.jsx:380 | No entries yet. Log your first sleep session above. | Retained; requires contextual classification and review | Open / not individually verified |
| src/components/SocialMedia.jsx:1 | ../lib/emptyValues | Retained; requires contextual classification and review | Open / not individually verified |
| src/components/SocialMedia.jsx:185 | Failed to sync social media data. | Retained; requires contextual classification and review | Open / not individually verified |
| src/components/SocialShareModal.jsx:79 | No Avatar generated yet | Retained; requires contextual classification and review | Open / not individually verified |
| src/components/Sprite3DViewer.jsx:171 | ERROR | Retained; requires contextual classification and review | Open / not individually verified |
| src/components/StrengthMetrics.jsx:9 | ./ui/EmptyState | Retained; requires contextual classification and review | Open / not individually verified |
| src/components/StrengthMetrics.jsx:272 | Exercise and weight required | Retained; requires contextual classification and review | Open / not individually verified |
| src/components/TabErrorBoundary.jsx:2 | ./TabErrorBoundary.css | Retained; requires contextual classification and review | Open / not individually verified |
| src/components/TabErrorBoundary.jsx:31 | tab-error-boundary | Retained; requires contextual classification and review | Open / not individually verified |
| src/components/TabErrorBoundary.jsx:32 | tab-error-icon | Retained; requires contextual classification and review | Open / not individually verified |
| src/components/TabErrorBoundary.jsx:33 | tab-error-title | Retained; requires contextual classification and review | Open / not individually verified |
| src/components/TabErrorBoundary.jsx:34 | encountered an error | Retained; requires contextual classification and review | Open / not individually verified |
| src/components/TabErrorBoundary.jsx:36 | tab-error-message | Retained; requires contextual classification and review | Open / not individually verified |
| src/components/TabErrorBoundary.jsx:37 | Unknown error | Try loading this page again. If it still does not open, choose another page from the navigation. | Rewritten |
| src/components/TabErrorBoundary.jsx:39 | tab-error-retry | Retained; requires contextual classification and review | Open / not individually verified |
| src/components/Tasks.tsx:13 | ./ui/EmptyState | Retained; requires contextual classification and review | Open / not individually verified |
| src/components/Tasks.tsx:419 | Task cannot be its own parent. | Retained; requires contextual classification and review | Open / not individually verified |
| src/components/Tasks.tsx:1250 | No completed tasks yet. | Retained; requires contextual classification and review | Open / not individually verified |
| src/components/Timesheet.tsx:6 | ./ui/EmptyState | Retained; requires contextual classification and review | Open / not individually verified |
| src/components/Timesheet.tsx:140 | Manual entry saved | Retained; requires contextual classification and review | Open / not individually verified |
| src/components/Timesheet.tsx:467 | No entries yet. | Retained; requires contextual classification and review | Open / not individually verified |
| src/components/Training.jsx:10 | ./ui/EmptyState | Retained; requires contextual classification and review | Open / not individually verified |
| src/components/Training.jsx:136 | No Schedule Yet | Retained; requires contextual classification and review | Open / not individually verified |
| src/components/Training.jsx:145 | No logged session data yet | Retained; requires contextual classification and review | Open / not individually verified |
| src/components/Training.jsx:569 | No schedule yet | Retained; requires contextual classification and review | Open / not individually verified |
| src/components/Training.jsx:801 | No sessions yet | Retained; requires contextual classification and review | Open / not individually verified |
| src/components/TransformationPredictor.jsx:139 | No metric logs yet | Retained; requires contextual classification and review | Open / not individually verified |
| src/components/ui/EmptyState.jsx:111 | empty-state__icon | Retained; requires contextual classification and review | Open / not individually verified |
| src/components/ui/EmptyState.jsx:115 | empty-state__title | Retained; requires contextual classification and review | Open / not individually verified |
| src/components/ui/EmptyState.jsx:118 | empty-state__desc | Retained; requires contextual classification and review | Open / not individually verified |
| src/components/ui/EmptyState.jsx:123 | empty-state__action btn btn-primary | Retained; requires contextual classification and review | Open / not individually verified |
| src/components/ui/EmptyState.jsx:144 | No tasks yet | Retained; requires contextual classification and review | Open / not individually verified |
| src/components/ui/EmptyState.jsx:162 | Nothing noted yet | Retained; requires contextual classification and review | Open / not individually verified |
| src/components/ui/EmptyState.jsx:174 | Your list is empty | Retained; requires contextual classification and review | Open / not individually verified |
| src/components/ui/EmptyState.jsx:192 | No documents yet | Retained; requires contextual classification and review | Open / not individually verified |
| src/components/ui/SavedIndicator.jsx:20 | Saved | Retained; requires contextual classification and review | Open / not individually verified |
| src/components/ui/SavedIndicator.jsx:57 | var(--success) | Retained; requires contextual classification and review | Open / not individually verified |
| src/components/ui/SelectField.jsx:13 | gt-field__error | Retained; requires contextual classification and review | Open / not individually verified |
| src/components/ui/StunningDatePicker.jsx:127 | calendar-day empty | Retained; requires contextual classification and review | Open / not individually verified |
| src/components/ui/TextField.jsx:13 | gt-field__error | Retained; requires contextual classification and review | Open / not individually verified |
| src/components/WorkspaceHub.jsx:60 | hub-loading | Retained; requires contextual classification and review | Open / not individually verified |
| src/components/WorkspaceHub.jsx:60 | Loading workspace… | Retained; requires contextual classification and review | Open / not individually verified |
| src/hooks/useGeolocation.js:10 | IP Info fetch failed: | Retained; requires contextual classification and review | Open / not individually verified |
| src/hooks/useToast.jsx:46 | success | Retained; requires contextual classification and review | Open / not individually verified |
| src/hooks/useToast.jsx:47 | error | Retained; requires contextual classification and review | Open / not individually verified |
| src/lib/apiClient.js:12 | ApiError | Retained; requires contextual classification and review | Open / not individually verified |
| src/lib/apiClient.js:49 | Invalid server response. | Retained; requires contextual classification and review | Open / not individually verified |
| src/lib/apiClient.js:54 | AbortError | Retained; requires contextual classification and review | Open / not individually verified |
| src/lib/i18n.js:1 | Loading | Retained; requires contextual classification and review | Open / not individually verified |
| src/lib/i18n.js:1 | Try again | Retained; requires contextual classification and review | Open / not individually verified |
| src/lib/logger.ts:10 | error | Retained; requires contextual classification and review | Open / not individually verified |
| src/lib/logger.ts:13 | login_success | Retained; requires contextual classification and review | Open / not individually verified |
| src/lib/logger.ts:13 | login_failed | Retained; requires contextual classification and review | Open / not individually verified |
| src/lib/logger.ts:19 | error | Retained; requires contextual classification and review | Open / not individually verified |
| src/lib/logger.ts:52 | login_success | Retained; requires contextual classification and review | Open / not individually verified |
| src/lib/logger.ts:52 | login_failed | Retained; requires contextual classification and review | Open / not individually verified |
| src/lib/logger.ts:100 | [Logger] Failed to log action: | Retained; requires contextual classification and review | Open / not individually verified |
| src/lib/logger.ts:108 | login_success | Retained; requires contextual classification and review | Open / not individually verified |
| src/lib/logger.ts:108 | login_failed | Retained; requires contextual classification and review | Open / not individually verified |
| src/lib/logger.ts:123 | login_failed | Retained; requires contextual classification and review | Open / not individually verified |
| src/lib/logger.ts:180 | [Logger] Failed to log to session_logs: | Retained; requires contextual classification and review | Open / not individually verified |
| src/lib/logger.ts:201 | error | Retained; requires contextual classification and review | Open / not individually verified |
| src/lib/logger.ts:217 | error | Retained; requires contextual classification and review | Open / not individually verified |
| src/lib/logger.ts:217 | Error occurred | Retained; requires contextual classification and review | Open / not individually verified |
| src/lib/logger.ts:217 | error | Retained; requires contextual classification and review | Open / not individually verified |
| src/lib/rendererQualityGate.js:19 | error | Retained; requires contextual classification and review | Open / not individually verified |
| src/lib/rendererQualityGate.js:50 | All required authored morph targets are present. | Retained; requires contextual classification and review | Open / not individually verified |
| src/lib/rendererQualityGate.js:94 | WebGL context recovery is required. | Retained; requires contextual classification and review | Open / not individually verified |
| src/lib/rendererQualityGate.js:110 | Saved render profile | Retained; requires contextual classification and review | Open / not individually verified |
| src/pages/LoginPage.jsx:22 | Login failed. | We could not sign you in. Check your email and password, then try again. | Rewritten |
| src/pages/LoginPage.jsx:30 | Single-user workspace. New accounts cannot be created from the application. | Retained; requires contextual classification and review | Open / not individually verified |
| src/pages/LoginPage.jsx:34 | notice notice--error | Retained; requires contextual classification and review | Open / not individually verified |
| src/pages/PrivacyPage.jsx:20 | Depending on deployment configuration, the service may use a hosted database, error monitoring, payment processing, and external weather or media APIs. Only the data needed for that feature should be sent. | Retained; requires contextual classification and review | Open / not individually verified |
| src/store/slices/financeSlice.ts:120 | Failed to sync bank data | Retained; requires contextual classification and review | Open / not individually verified |
| src/store/storePatches.js:110 | [updateNote] noteId is required | Retained; requires contextual classification and review | Open / not individually verified |
| src/store/storePatches.js:141 | [updateNote] Request failed: | Retained; requires contextual classification and review | Open / not individually verified |
| src/store/storePatches.js:190 | [togglePinnedTab] Persist failed, reverting: | Retained; requires contextual classification and review | Open / not individually verified |
| src/store/useStore.ts:56 | [useStore] portfolio persistence failed: | Retained; requires contextual classification and review | Open / not individually verified |
| src/store/useStore.ts:248 | [useStore] fetchInitialData error: | Retained; requires contextual classification and review | Open / not individually verified |
| src/store/useStore.ts:367 | offline | Retained; requires contextual classification and review | Open / not individually verified |
| src/utils/apiRetry.js:81 | AbortError | Retained; requires contextual classification and review | Open / not individually verified |
| src/utils/cropImage.js:5 | error | Retained; requires contextual classification and review | Open / not individually verified |
| src/workers/sprite-preloader.worker.js:28 | ERROR | Retained; requires contextual classification and review | Open / not individually verified |