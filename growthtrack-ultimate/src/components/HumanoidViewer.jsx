import React, { useState, useRef, useEffect } from 'react';

export default function HumanoidViewer({ user }) {
  const canvasRef = useRef(null);
  const [viewMode, setViewMode] = useState('current'); // 'current' | 'expected' | 'overlay'
  const [rotationY, setRotationY] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [customMetrics, setCustomMetrics] = useState({
    height: user?.metrics?.height || 175,
    weight: user?.metrics?.weight || 75,
    chest: user?.metrics?.chest || 95,
    waist: user?.metrics?.waist || 80,
    shoulders: user?.metrics?.shoulders || 110,
    arms: user?.metrics?.arms || 35,
    thighs: user?.metrics?.thighs || 55,
  });

  const expectedMetrics = {
    height: customMetrics.height,
    weight: customMetrics.weight - 8,
    chest: customMetrics.chest + 5,
    waist: customMetrics.waist - 8,
    shoulders: customMetrics.shoulders + 3,
    arms: customMetrics.arms + 3,
    thighs: customMetrics.thighs + 2,
  };

  // Canvas rendering: draw realistic humanoid model
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    const w = canvas.width;
    const h = canvas.height;

    const drawModel = (metrics, color, alpha = 1) => {
      ctx.save();
      ctx.globalAlpha = alpha;
      ctx.translate(w / 2, h / 2);
      ctx.rotate(rotationY * Math.PI / 180);

      const scale = h / 800;
      const heightPx = metrics.height * scale * 2;
      const headRadius = heightPx * 0.08;
      const torsoH = heightPx * 0.3;
      const legH = heightPx * 0.45;
      const shoulderW = (metrics.shoulders / 100) * w * 0.4;
      const waistW = (metrics.waist / 100) * w * 0.3;
      const chestW = (metrics.chest / 100) * w * 0.35;
      const armW = (metrics.arms / 100) * w * 0.08;

      // Head
      ctx.fillStyle = color;
      ctx.beginPath();
      ctx.arc(0, -heightPx / 2 + headRadius, headRadius, 0, Math.PI * 2);
      ctx.fill();

      // Neck
      ctx.fillRect(-headRadius * 0.3, -heightPx / 2 + headRadius * 2, headRadius * 0.6, headRadius);

      // Torso (trapezoid for realism)
      ctx.beginPath();
      ctx.moveTo(-shoulderW / 2, -heightPx / 2 + headRadius * 3);
      ctx.lineTo(shoulderW / 2, -heightPx / 2 + headRadius * 3);
      ctx.lineTo(chestW / 2, -heightPx / 2 + headRadius * 3 + torsoH * 0.4);
      ctx.lineTo(-chestW / 2, -heightPx / 2 + headRadius * 3 + torsoH * 0.4);
      ctx.closePath();
      ctx.fill();

      // Waist
      ctx.fillRect(-waistW / 2, -heightPx / 2 + headRadius * 3 + torsoH * 0.4, waistW, torsoH * 0.6);

      // Arms
      ctx.fillRect(-shoulderW / 2 - armW, -heightPx / 2 + headRadius * 3, armW, torsoH * 1.3);
      ctx.fillRect(shoulderW / 2, -heightPx / 2 + headRadius * 3, armW, torsoH * 1.3);

      // Legs
      const legW = waistW * 0.4;
      ctx.fillRect(-waistW / 2 + 5, -heightPx / 2 + headRadius * 3 + torsoH, legW, legH);
      ctx.fillRect(waistW / 2 - legW - 5, -heightPx / 2 + headRadius * 3 + torsoH, legW, legH);

      ctx.restore();
    };

    ctx.clearRect(0, 0, w, h);

    if (viewMode === 'current') {
      drawModel(customMetrics, '#4FC3F7');
    } else if (viewMode === 'expected') {
      drawModel(expectedMetrics, '#66BB6A');
    } else {
      drawModel(customMetrics, '#4FC3F7', 0.5);
      drawModel(expectedMetrics, '#66BB6A', 0.5);
    }
  }, [customMetrics, rotationY, viewMode]);

  const handleMouseDown = (e) => {
    setIsDragging(true);
    setDragStart({ x: e.clientX, y: e.clientY });
  };

  const handleMouseMove = (e) => {
    if (!isDragging) return;
    const dx = e.clientX - dragStart.x;
    setRotationY(prev => prev + dx * 0.5);
    setDragStart({ x: e.clientX, y: e.clientY });
  };

  const handleMouseUp = () => setIsDragging(false);

  return (
    <div className="dashboard-container">
      <header className="dashboard-header">
        <h1 className="dashboard-title">
          🧍 3D Humanoid Model
          <span className="badge badge--accent">BETA</span>
        </h1>
        <p className="dashboard-subtitle">Customize your body metrics and visualize current vs goal physique in real-time.</p>
      </header>

      <div className="grid-2">
        {/* Left: Canvas */}
        <div className="card">
          <div className="card__header">
            <h3 className="card__title">3D Model View</h3>
            <div className="btn-group">
              <button className={`btn btn--sm ${viewMode === 'current' ? 'btn--primary' : 'btn--outline'}`} onClick={() => setViewMode('current')}>Current</button>
              <button className={`btn btn--sm ${viewMode === 'expected' ? 'btn--primary' : 'btn--outline'}`} onClick={() => setViewMode('expected')}>Expected</button>
              <button className={`btn btn--sm ${viewMode === 'overlay' ? 'btn--primary' : 'btn--outline'}`} onClick={() => setViewMode('overlay')}>Overlay</button>
            </div>
          </div>
          <div className="card__body" style={{ position: 'relative' }}>
            <canvas
              ref={canvasRef}
              width={600}
              height={700}
              style={{ width: '100%', height: 'auto', cursor: isDragging ? 'grabbing' : 'grab', background: 'var(--bg-surface)' }}
              onMouseDown={handleMouseDown}
              onMouseMove={handleMouseMove}
              onMouseUp={handleMouseUp}
              onMouseLeave={handleMouseUp}
            />
            <p style={{ textAlign: 'center', marginTop: '0.5rem', fontSize: '0.85rem', color: 'var(--text-muted)' }}>Drag to rotate</p>
          </div>
        </div>

        {/* Right: Metrics input */}
        <div className="card">
          <div className="card__header">
            <h3 className="card__title">Body Metrics</h3>
          </div>
          <div className="card__body">
            <div className="form-group">
              <label>Height (cm)</label>
              <input type="number" className="input" value={customMetrics.height} onChange={e => setCustomMetrics(m => ({ ...m, height: +e.target.value }))} />
            </div>
            <div className="form-group">
              <label>Weight (kg)</label>
              <input type="number" className="input" value={customMetrics.weight} onChange={e => setCustomMetrics(m => ({ ...m, weight: +e.target.value }))} />
            </div>
            <div className="form-group">
              <label>Chest (cm)</label>
              <input type="number" className="input" value={customMetrics.chest} onChange={e => setCustomMetrics(m => ({ ...m, chest: +e.target.value }))} />
            </div>
            <div className="form-group">
              <label>Waist (cm)</label>
              <input type="number" className="input" value={customMetrics.waist} onChange={e => setCustomMetrics(m => ({ ...m, waist: +e.target.value }))} />
            </div>
            <div className="form-group">
              <label>Shoulders (cm)</label>
              <input type="number" className="input" value={customMetrics.shoulders} onChange={e => setCustomMetrics(m => ({ ...m, shoulders: +e.target.value }))} />
            </div>
            <div className="form-group">
              <label>Arms (cm)</label>
              <input type="number" className="input" value={customMetrics.arms} onChange={e => setCustomMetrics(m => ({ ...m, arms: +e.target.value }))} />
            </div>
            <div className="form-group">
              <label>Thighs (cm)</label>
              <input type="number" className="input" value={customMetrics.thighs} onChange={e => setCustomMetrics(m => ({ ...m, thighs: +e.target.value }))} />
            </div>
          </div>
        </div>
      </div>

      <div className="card">
        <div className="card__header">
          <h3 className="card__title">Metrics Comparison</h3>
        </div>
        <div className="card__body">
          <table className="table">
            <thead>
              <tr>
                <th>Metric</th>
                <th>Current</th>
                <th>Expected</th>
                <th>Diff</th>
              </tr>
            </thead>
            <tbody>
              {Object.keys(customMetrics).map(key => (
                <tr key={key}>
                  <td>{key.charAt(0).toUpperCase() + key.slice(1)}</td>
                  <td>{customMetrics[key]}</td>
                  <td>{expectedMetrics[key]}</td>
                  <td className={expectedMetrics[key] > customMetrics[key] ? 'text-success' : 'text-danger'}>
                    {(expectedMetrics[key] - customMetrics[key] > 0 ? '+' : '') + (expectedMetrics[key] - customMetrics[key])}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
