/**
 * SceneEnvironment.jsx
 *
 * Provides Image-Based Lighting (IBL) for the Mirror Chamber via drei's
 * <Environment> component. Uses `preset="studio"` which loads a pre-baked
 * RGBE .hdr texture — safe in three.js 0.184 + drei 9.92+.
 *
 * `background={false}` keeps the custom ChamberFloor/fog intact.
 * `environmentIntensity` is clamped at 0.6 to avoid blowing out skin tones.
 */

import React from 'react';
import { Environment } from '@react-three/drei';
import ErrorBoundary from '../ErrorBoundary';

function EnvInner() {
  return (
    <Environment
      preset="studio"
      background={false}
      environmentIntensity={0.6}
    />
  );
}

/**
 * Wrapped in its own ErrorBoundary so a drei version mismatch never
 * crashes the entire 3D canvas — it just falls back to ambient-only lighting.
 */
export default function SceneEnvironment() {
  return (
    <ErrorBoundary fallback={null}>
      <EnvInner />
    </ErrorBoundary>
  );
}
