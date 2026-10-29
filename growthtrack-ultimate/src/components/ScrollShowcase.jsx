import React from 'react';
import HumanoidViewer from './HumanoidViewer';
import '../styles/chamber-entry.css';

export default function ScrollShowcase() {
  return (
    <section className="physique-lab physique-lab--comparison" aria-label="Body tracking and comparison">
      <div className="physique-lab__stage">
        <HumanoidViewer />
      </div>
      <p className="avatar-gesture-help">Drag to rotate · Scroll or pinch to zoom · Double-click the model to fit the whole body.</p>
    </section>
  );
}
