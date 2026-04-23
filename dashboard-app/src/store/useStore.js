import { create } from 'zustand';
import { persist } from 'zustand/middleware';

// Global state store for advanced UX features
const useStore = create(
  persist(
    (set, get) => ({
      // Body part overlay state
      selectedBodyPart: null,
      hoveredBodyPart: null,
      setSelectedBodyPart: (part) => set({ selectedBodyPart: part }),
      setHoveredBodyPart: (part) => set({ hoveredBodyPart: part }),

      // Critical alerts (pulsing indicators)
      criticalAlerts: [],
      addCriticalAlert: (alert) =>
        set((state) => ({
          criticalAlerts: [...state.criticalAlerts, { ...alert, id: Date.now() }],
        })),
      removeCriticalAlert: (id) =>
        set((state) => ({
          criticalAlerts: state.criticalAlerts.filter((a) => a.id !== id),
        })),
      clearCriticalAlerts: () => set({ criticalAlerts: [] }),

      // Transformation timeline state
      transformationMode: '3d', // '2d' | '3d'
      selectedPose: 'current',
      predictiveTimelineDate: null,
      setTransformationMode: (mode) => set({ transformationMode: mode }),
      setSelectedPose: (pose) => set({ selectedPose: pose }),
      setPredictiveTimelineDate: (date) => set({ predictiveTimelineDate: date }),

      // Wearable simulation (aura/ghosting)
      wearableSimulation: {
        enabled: false,
        targetWeight: null,
        ghostOpacity: 0.4,
      },
      toggleWearableSimulation: () =>
        set((state) => ({
          wearableSimulation: {
            ...state.wearableSimulation,
            enabled: !state.wearableSimulation.enabled,
          },
        })),
      setWearableTarget: (weight) =>
        set((state) => ({
          wearableSimulation: {
            ...state.wearableSimulation,
            targetWeight: weight,
          },
        })),

      // Worker processing state
      isProcessingMetrics: false,
      setProcessingMetrics: (processing) => set({ isProcessingMetrics: processing }),

      // PDF export state
      pdfExportProgress: 0,
      setPdfExportProgress: (progress) => set({ pdfExportProgress: progress }),
    }),
    {
      name: 'ultimate-store',
      partialize: (state) => ({
        transformationMode: state.transformationMode,
        wearableSimulation: state.wearableSimulation,
      }),
    }
  )
);

export default useStore;
