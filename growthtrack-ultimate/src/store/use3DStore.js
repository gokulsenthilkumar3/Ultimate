import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { subscribeWithSelector } from 'zustand/middleware';
import { USER, BODY_PARTS } from '../data/userData';

/**
 * use3DStore — Dedicated Zustand store for the Mirror Chamber 3D page.
 * 
 * Separated from the main useStore to prevent React UI re-renders from
 * triggering Canvas re-renders and vice versa. Uses subscribeWithSelector
 * for granular subscription to 3D-specific slices.
 */

// ── Current measurements from USER
const CURRENT_METRICS = {
  height: USER.height || 182,
  weight: USER.weight || 63,
  bodyFat: USER.bodyFat || 22,
  chest: BODY_PARTS?.metrics?.chest || 95,
  shoulders: BODY_PARTS?.metrics?.shoulders || 110,
  waist: BODY_PARTS?.metrics?.waist || 80,
  arms: BODY_PARTS?.metrics?.arms || 35,
  thighs: BODY_PARTS?.metrics?.thighs || 55,
  neck: BODY_PARTS?.metrics?.neck || 38,
  calves: BODY_PARTS?.metrics?.calves || 37,
  hips: BODY_PARTS?.metrics?.hips || 95,
  dLength: 5.9,  // inches
  dGirth: 4.0,   // inches
};

// ── Goal metrics (Dec 2026)
const GOAL_METRICS = {
  height: 182,
  weight: 82,
  bodyFat: 10,
  chest: 109,     // 43" target
  shoulders: 125,
  waist: 75,      // 29.5"
  arms: 42,       // 16.5"
  thighs: 62,
  neck: 42,
  calves: 42,
  hips: 100,
  dLength: 7.9,
  dGirth: 5.25,
};

// ── Milestones for the Ambition Path
const MILESTONES = [
  { month: 0,  label: 'Start — 63kg',           weight: 63, bodyFat: 22, achieved: true },
  { month: 3,  label: 'Visible abs forming',    weight: 67, bodyFat: 18, achieved: false },
  { month: 6,  label: '70kg — Lean mass',       weight: 70, bodyFat: 16, achieved: false },
  { month: 9,  label: 'Bench 80kg',             weight: 73, bodyFat: 14, achieved: false },
  { month: 12, label: '75kg — Half way',        weight: 75, bodyFat: 13, achieved: false },
  { month: 15, label: 'Vascularity emerging',   weight: 78, bodyFat: 12, achieved: false },
  { month: 20, label: '82kg — GREEK GOD',       weight: 82, bodyFat: 10, achieved: false },
];

// ── Timeline snapshots (progress history)
const INITIAL_SNAPSHOTS = [
  { id: 1, date: '2026-04-01', label: 'Week 1', metrics: { ...CURRENT_METRICS } },
];

const use3DStore = create(
  subscribeWithSelector(
    persist(
      (set, get) => ({
        // ── Model State
        currentMetrics: CURRENT_METRICS,
        goalMetrics: GOAL_METRICS,
        
        // ── View Mode: SOLO | DUAL | SPLIT | GHOST | DELTA | TIMELINE
        viewMode: 'DUAL',
        
        // ── Render Mode: WEBGL | SPRITE
        renderMode: 'WEBGL',
        
        // ── Camera
        cameraPreset: 'FRONT',
        autoRotate: true,
        isZoomed: false,
        
        // ── Wardrobe: gym | casual | formal | swimwear | underwear | anatomical
        wardrobe: 'gym',
        
        // ── Anatomy
        anatomyDepth: 100, // 100 = skin, 0 = organs
        
        // ── Body part selection
        selectedPart: null,
        
        // ── Morphs (manual overrides)
        morphOverrides: {
          shoulders: 1.0,
          chest: 1.0,
          waist: 1.0,
          arms: 1.0,
        },
        
        // ── VFX Toggles
        heatmapMode: false,
        vascularityMode: false,
        deltaMode: false,
        auraMode: true,
        
        // ── Comparison
        splitPos: 50,
        
        // ── Quality: HIGH | MED | LOW
        quality: 'HIGH',
        
        // ── Ambition Path
        milestones: MILESTONES,
        
        // ── Timeline
        snapshots: INITIAL_SNAPSHOTS,
        timelinePos: 100, // 0-100, current position on timeline
        
        // ── Stress bio-feedback
        stressLevel: 0,

        // ──────────────────── ACTIONS ────────────────────

        setViewMode: (viewMode) => set({ viewMode }),
        setRenderMode: (renderMode) => set({ renderMode }),
        setCameraPreset: (cameraPreset) => set({ cameraPreset, autoRotate: false }),
        setAutoRotate: (autoRotate) => set({ autoRotate }),
        setIsZoomed: (isZoomed) => set({ isZoomed }),
        setWardrobe: (wardrobe) => set({ wardrobe }),
        setAnatomyDepth: (anatomyDepth) => set({ anatomyDepth }),
        setSelectedPart: (selectedPart) => set({ selectedPart }),
        setHeatmapMode: (heatmapMode) => set({ heatmapMode }),
        setVascularityMode: (vascularityMode) => set({ vascularityMode }),
        setDeltaMode: (deltaMode) => set({ deltaMode }),
        setAuraMode: (auraMode) => set({ auraMode }),
        setSplitPos: (splitPos) => set({ splitPos }),
        setQuality: (quality) => set({ quality }),
        setStressLevel: (stressLevel) => set({ stressLevel }),
        setTimelinePos: (timelinePos) => set({ timelinePos }),

        updateCurrentMetric: (key, value) =>
          set((s) => ({ currentMetrics: { ...s.currentMetrics, [key]: value } })),

        updateGoalMetric: (key, value) =>
          set((s) => ({ goalMetrics: { ...s.goalMetrics, [key]: value } })),

        setMorphOverride: (key, value) =>
          set((s) => ({ morphOverrides: { ...s.morphOverrides, [key]: value } })),

        /** Sync morph overrides from current metrics */
        syncMorphsFromMetrics: () => {
          const { currentMetrics } = get();
          const lerp = (a, b, t) => a + (b - a) * Math.max(0, Math.min(1, t));
          set({
            morphOverrides: {
              chest:     lerp(0.85, 1.3, (currentMetrics.weight - 45) / 85),
              shoulders: lerp(0.9,  1.4, (currentMetrics.height - 150) / 60),
              waist:     lerp(0.7,  1.5, (currentMetrics.bodyFat - 5) / 35),
              arms:      lerp(0.85, 1.3, (currentMetrics.weight - 45) / 85),
            },
          });
        },

        /** Save current state as a timeline snapshot */
        saveSnapshot: () => {
          const { currentMetrics, snapshots } = get();
          const snap = {
            id: Date.now(),
            date: new Date().toISOString().split('T')[0],
            label: `Snap ${snapshots.length + 1}`,
            metrics: { ...currentMetrics },
          };
          set({ snapshots: [...snapshots, snap] });
        },

        /** Delete a snapshot */
        deleteSnapshot: (id) =>
          set((s) => ({ snapshots: s.snapshots.filter((sn) => sn.id !== id) })),

        /** Get interpolated metrics for a timeline position */
        getTimelineMetrics: () => {
          const { timelinePos, currentMetrics, goalMetrics } = get();
          const t = timelinePos / 100;
          const result = {};
          for (const key of Object.keys(currentMetrics)) {
            const c = currentMetrics[key];
            const g = goalMetrics[key];
            result[key] = c + (g - c) * t;
          }
          return result;
        },

        /** Compute delta between current and goal */
        getDeltas: () => {
          const { currentMetrics, goalMetrics } = get();
          const deltas = {};
          for (const key of Object.keys(currentMetrics)) {
            deltas[key] = {
              current: currentMetrics[key],
              goal: goalMetrics[key],
              delta: goalMetrics[key] - currentMetrics[key],
              pct: currentMetrics[key] > 0
                ? (((goalMetrics[key] - currentMetrics[key]) / currentMetrics[key]) * 100).toFixed(1)
                : 0,
            };
          }
          return deltas;
        },
      }),
      {
        name: 'growthtrack-3d-v1',
        storage: createJSONStorage(() => localStorage),
        partialize: (state) => ({
          // Only persist these fields — not transient UI state
          currentMetrics: state.currentMetrics,
          goalMetrics: state.goalMetrics,
          snapshots: state.snapshots,
          milestones: state.milestones,
          quality: state.quality,
          wardrobe: state.wardrobe,
        }),
      }
    )
  )
);

// ── Granular selectors
export const select3DViewMode = (s) => s.viewMode;
export const select3DRenderMode = (s) => s.renderMode;
export const select3DCamera = (s) => s.cameraPreset;
export const select3DAutoRotate = (s) => s.autoRotate;
export const select3DWardrobe = (s) => s.wardrobe;
export const select3DAnatomyDepth = (s) => s.anatomyDepth;
export const select3DSelectedPart = (s) => s.selectedPart;
export const select3DMorphOverrides = (s) => s.morphOverrides;
export const select3DCurrentMetrics = (s) => s.currentMetrics;
export const select3DGoalMetrics = (s) => s.goalMetrics;
export const select3DQuality = (s) => s.quality;
export const select3DSnapshots = (s) => s.snapshots;
export const select3DMilestones = (s) => s.milestones;
export const select3DVFX = (s) => ({
  heatmapMode: s.heatmapMode,
  vascularityMode: s.vascularityMode,
  deltaMode: s.deltaMode,
  auraMode: s.auraMode,
});

export default use3DStore;
