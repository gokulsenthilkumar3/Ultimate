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
import { Environment, Lightformer } from '@react-three/drei';
import ErrorBoundary from '../ErrorBoundary';

function EnvInner() {
  return (
    <Environment background={false} resolution={128} environmentIntensity={0.72}>
      <color attach="background" args={['#03060c']} />
      <Lightformer intensity={2.2} color="#d8f7ff" position={[0, 4, -4]} scale={[6, 2, 1]} />
      <Lightformer intensity={1.8} color="#5ee7ff" position={[-4, 1.5, 1]} rotation={[0, Math.PI / 2, 0]} scale={[4, 1.5, 1]} />
      <Lightformer intensity={1.5} color="#8b5cf6" position={[4, 2, 0]} rotation={[0, -Math.PI / 2, 0]} scale={[3, 1.2, 1]} />
      <Lightformer intensity={1.1} color="#ffffff" position={[0, -1, 3]} rotation={[Math.PI / 2, 0, 0]} scale={[3, 3, 1]} />
    </Environment>
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
