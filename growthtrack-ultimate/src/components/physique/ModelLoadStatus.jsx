import React from 'react';
import { useProgress } from '@react-three/drei';

export default function ModelLoadStatus({ ready }) {
  const { active, progress, loaded, total } = useProgress();
  if (ready) return null;
  const downloading = active && Number.isFinite(progress) && progress > 0 && progress < 100;
  return <div className="avatar-model-loading" role="status" aria-live="polite">
    <span className="avatar-model-loading__symbol" aria-hidden="true">3D</span>
    <strong>{active ? 'Loading your model' : 'Preparing the 3D view'}</strong>
    <progress aria-label="3D model loading" {...(downloading ? { value: progress, max: 100 } : {})} />
    <span>{active && total > 1 ? `${loaded} of ${total} model resources loaded` : 'The camera controls will be ready as soon as the model appears.'}</span>
  </div>;
}
