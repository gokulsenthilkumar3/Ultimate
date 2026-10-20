/**
 * GrowthTrack Ultimate — Animation Panel
 * AnimationPanel.jsx
 *
 * A sleek, floating control panel for selecting and controlling the avatar's
 * animation preset. Shows a grid of action cards and playback controls.
 *
 * Usage:
 *   <AnimationPanel />  — renders a fixed panel inside the 3D viewer overlay
 */

import React, { useState } from 'react';
import use3DStore from '../../store/use3DStore';
import { ANIMATION_PRESETS } from '../morphEngine/animationPresets';
import './AnimationPanel.css';

// ─────────────────────────────────────────────────────────────────────────────
// SPEED LABELS
// ─────────────────────────────────────────────────────────────────────────────
const SPEED_STEPS = [0.25, 0.5, 0.75, 1.0, 1.25, 1.5, 2.0, 3.0];

function speedLabel(speed) {
  if (speed === 1) return '1×';
  return `${speed}×`;
}

// ─────────────────────────────────────────────────────────────────────────────
// ANIMATION PANEL
// ─────────────────────────────────────────────────────────────────────────────
export default function AnimationPanel({inline=false}) {
  const [open, setOpen] = useState(false);

  const animationId  = use3DStore((s) => s.animationState.animationId);
  const playing      = use3DStore((s) => s.animationState.playing);
  const speed        = use3DStore((s) => s.animationState.speed);
  const setAnimation  = use3DStore((s) => s.setAnimation);
  const toggleAnimation = use3DStore((s) => s.toggleAnimation);
  const setAnimationSpeed = use3DStore((s) => s.setAnimationSpeed);

  const activePreset = ANIMATION_PRESETS.find((p) => p.id === animationId);

  const handleSelect = (id) => {
    setAnimation(id, { playing: true, speed });
  };

  const handleSpeedStep = (direction) => {
    const idx = SPEED_STEPS.indexOf(speed);
    const next = SPEED_STEPS[Math.max(0, Math.min(SPEED_STEPS.length - 1, idx + direction))];
    setAnimationSpeed(next);
  };

  return (
    <div className={`anim-panel ${open ? 'anim-panel--open' : ''}${inline?' anim-panel--inline':''}`}>
      {/* Floating trigger button */}
      <button
        className="anim-panel__trigger"
        onClick={() => setOpen((v) => !v)}
        title={open ? 'Close Animation Panel' : 'Open Animation Panel'}
        aria-expanded={open}
        aria-label="Pose and motion controls"
        id="anim-panel-toggle"
      >
        <span className="anim-panel__trigger-icon">
          {activePreset?.icon || '🧍'}
        </span>
        <span className="anim-panel__trigger-label">
          {activePreset?.label || 'Pose'}
        </span>
        <span className={`anim-panel__trigger-chevron ${open ? 'anim-panel__trigger-chevron--up' : ''}`}>
          ▾
        </span>
      </button>

      {/* Panel dropdown */}
      {open && (
        <div className="anim-panel__dropdown" role="region" aria-label="Animation controls">
          <div className="anim-panel__header">
            <span className="anim-panel__title">Pose & Animation</span>
            <button
              className="anim-panel__close"
              onClick={() => setOpen(false)}
              aria-label="Close"
            >✕</button>
          </div>

          {/* Preset grid */}
          <div className="anim-panel__grid">
            {ANIMATION_PRESETS.map((preset) => (
              <button
                key={preset.id}
                className={`anim-panel__card ${animationId === preset.id ? 'anim-panel__card--active' : ''}`}
                onClick={() => handleSelect(preset.id)}
                title={preset.label}
                aria-label={preset.label}
                aria-pressed={animationId===preset.id}
                id={`anim-card-${preset.id}`}
              >
                <span className="anim-panel__card-icon">{preset.icon}</span>
                <span className="anim-panel__card-label">{preset.label}</span>
                {preset.loop && (
                  <span className="anim-panel__card-badge">LOOP</span>
                )}
              </button>
            ))}
          </div>

          {/* Playback controls (only shown for looping animations) */}
          {activePreset?.loop && (
            <div className="anim-panel__controls">
              <div className="anim-panel__controls-row">
                {/* Play/Pause */}
                <button
                  className={`anim-panel__play-btn ${playing ? 'anim-panel__play-btn--playing' : ''}`}
                  onClick={toggleAnimation}
                  id="anim-play-pause"
                  title={playing ? 'Pause animation' : 'Play animation'}
                  aria-label={playing ? 'Pause animation' : 'Play animation'}
                >
                  {playing ? '⏸' : '▶'}
                </button>

                {/* Speed control */}
                <div className="anim-panel__speed">
                  <button
                    className="anim-panel__speed-step"
                    onClick={() => handleSpeedStep(-1)}
                    disabled={speed <= SPEED_STEPS[0]}
                    title="Slower"
                    id="anim-speed-down"
                  >−</button>
                  <span className="anim-panel__speed-label">{speedLabel(speed)}</span>
                  <button
                    className="anim-panel__speed-step"
                    onClick={() => handleSpeedStep(1)}
                    disabled={speed >= SPEED_STEPS[SPEED_STEPS.length - 1]}
                    title="Faster"
                    id="anim-speed-up"
                  >+</button>
                </div>
              </div>

              {/* Speed slider */}
              <input
                type="range"
                className="anim-panel__speed-slider"
                min={0}
                max={SPEED_STEPS.length - 1}
                step={1}
                value={SPEED_STEPS.indexOf(speed) === -1 ? 3 : SPEED_STEPS.indexOf(speed)}
                onChange={(e) => setAnimationSpeed(SPEED_STEPS[Number(e.target.value)])}
                id="anim-speed-slider"
                aria-label="Animation speed"
              />
              <div className="anim-panel__speed-range-labels">
                <span>Slow</span>
                <span>Fast</span>
              </div>
            </div>
          )}

          <div className="anim-panel__hint">
            Click a pose to apply it to your avatar
          </div>
        </div>
      )}
    </div>
  );
}
