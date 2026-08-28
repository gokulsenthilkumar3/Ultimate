import React, { Suspense, lazy } from 'react';
import { Activity, MousePointer2, ScanLine, Sparkles } from 'lucide-react';

const HumanoidViewer = lazy(() => import('./HumanoidViewer'));
const FEATURES = [
  { icon: MousePointer2, label: 'Explore', detail: 'Drag to orbit · scroll to zoom' },
  { icon: ScanLine, label: 'Inspect', detail: 'Select a body region to focus' },
  { icon: Activity, label: 'Compare', detail: 'Move between now, goal and timeline' },
];

export default function ScrollShowcase() {
  return (
    <section className="physique-lab physique-lab--cinematic" aria-labelledby="physique-lab-title">
      <header className="physique-lab__intro">
        <div>
          <span className="physique-lab__eyebrow"><Sparkles size={13} /> Digital twin / physique lab</span>
          <h2 id="physique-lab-title">Your progress, rendered in motion.</h2>
          <p>Explore the current body, compare the destination, and inspect change without leaving the scene.</p>
        </div>
        <div className="physique-lab__status" aria-label="3D renderer status">
          <span className="physique-lab__live-dot" aria-hidden="true" /> Live / realtime CG
        </div>
      </header>
      <div className="physique-lab__stage">
        <Suspense fallback={<div className="hub-loading"><div className="spin-ring" /> Preparing your digital twin…</div>}>
          <HumanoidViewer />
        </Suspense>
      </div>
      <div className="physique-lab__guide" aria-label="3D controls guide">
        {FEATURES.map(({ icon, label, detail }) => (
          <div className="physique-lab__guide-item" key={label}>
            {React.createElement(icon, { size: 16, 'aria-hidden': true })}
            <span><strong>{label}</strong>{detail}</span>
          </div>
        ))}
      </div>
    </section>
  );
}
