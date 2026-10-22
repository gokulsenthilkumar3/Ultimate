import { useEffect, useMemo } from 'react';
import { createSpaceSkyMaterial } from './spaceSkyMaterial';

// Rendered once inside the studio environment capture. The neutral softboxes
// remain the primary light; this adds only a faint reflection of the chosen sky.
export default function SpaceSky({ preset }) {
  const material = useMemo(() => createSpaceSkyMaterial(preset, 0.12), [preset]);
  useEffect(() => () => material.dispose(), [material]);
  return <mesh material={material} scale={50}>
    <boxGeometry args={[2, 2, 2]} />
  </mesh>;
}
