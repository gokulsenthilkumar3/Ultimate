import React, { Component, lazy, Suspense, useState } from 'react';
import { probeWebGL } from '../lib/webglCapability';
import use3DStore from '../store/use3DStore';

const ChamberCanvas = lazy(() => import('./ChamberCanvas'));
const Sprite3DViewer = lazy(() => import('./Sprite3DViewer'));

class RendererBoundary extends Component {
  state = { failed: false };
  static getDerivedStateFromError() { return { failed: true }; }
  render() { return this.state.failed ? this.props.fallback : this.props.children; }
}

export default function PhysiqueRenderer() {
  const [supported, setSupported] = useState(() => probeWebGL());
  const [attempt, setAttempt] = useState(0);
  const status = use3DStore(state => state.rendererQualityTelemetry.status);
  const retry = () => {
    const available = probeWebGL();
    setSupported(available);
    if (available) {
      use3DStore.getState().setRendererQualityTelemetry({ status: 'pending', contextLost: false });
      setAttempt(value => value + 1);
    }
  };
  const fallback = <div style={{ height: '100%', position: 'relative' }}>
    <Sprite3DViewer />
    <div role="status" style={{ position: 'absolute', bottom: 16, left: 16, right: 16, padding: 16, borderRadius: 16, background: 'var(--gt-surface, #fff)', color: 'var(--gt-text, #111)' }}>
      <p>2D view is active because 3D rendering is unavailable.</p>
      <button type="button" className="gt-button gt-button--secondary" onClick={retry}>Retry 3D</button>
    </div>
  </div>;
  return <Suspense fallback={<p role="status">Preparing physique view…</p>}>
    {!supported || status === 'context-lost' ? fallback :
      <RendererBoundary key={attempt} fallback={fallback}><ChamberCanvas /></RendererBoundary>}
  </Suspense>;
}
