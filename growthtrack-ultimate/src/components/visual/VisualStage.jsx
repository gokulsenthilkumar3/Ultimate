import React, { useEffect, useRef } from 'react';

const SCENE_TONES = Object.freeze({
  overview: ['#6d5dfc', '#22d3ee', '#f59e0b'],
  finance: ['#10b981', '#38bdf8', '#fbbf24'],
  insights: ['#8b5cf6', '#22d3ee', '#ec4899'],
  wellness: ['#14b8a6', '#60a5fa', '#a3e635'],
  workspace: ['#6366f1', '#38bdf8', '#f472b6'],
  life: ['#f97316', '#ec4899', '#8b5cf6'],
  hub: ['#64748b', '#22d3ee', '#6366f1'],
  avatar: ['#06b6d4', '#8b5cf6', '#f59e0b'],
  agent: ['#8b5cf6', '#ec4899', '#22d3ee'],
});

/** Lightweight cinematic background used by ordinary workspaces.
 * It deliberately avoids reading domain records so private values never leak
 * into decorative canvas output. Immersive modules retain their own WebGL.
 */
export default function VisualStage({ scene = 'overview', intensity = 'ambient', reducedMotion = false, fallback = null }) {
  const canvasRef = useRef(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || reducedMotion || intensity === 'ambient') return undefined;
    const context = canvas.getContext('2d', { alpha: true });
    if (!context) return undefined;
    let animationFrame;
    let disposed = false;
    const particles = Array.from({ length: intensity === 'immersive' ? 42 : 24 }, (_, index) => ({
      x: ((index * 47) % 101) / 100,
      y: ((index * 73) % 97) / 100,
      radius: 0.6 + (index % 4) * 0.35,
      speed: 0.000025 + (index % 5) * 0.000008,
    }));
    const resize = () => {
      const bounds = canvas.getBoundingClientRect();
      const ratio = Math.min(window.devicePixelRatio || 1, 2);
      canvas.width = Math.max(1, Math.floor(bounds.width * ratio));
      canvas.height = Math.max(1, Math.floor(bounds.height * ratio));
      context.setTransform(ratio, 0, 0, ratio, 0, 0);
    };
    const draw = (time) => {
      if (disposed) return;
      const { width, height } = canvas.getBoundingClientRect();
      context.clearRect(0, 0, width, height);
      context.fillStyle = 'rgba(255,255,255,.32)';
      for (const particle of particles) {
        const y = (particle.y + time * particle.speed) % 1;
        context.beginPath();
        context.arc(particle.x * width, y * height, particle.radius, 0, Math.PI * 2);
        context.fill();
      }
      animationFrame = requestAnimationFrame(draw);
    };
    const onVisibility = () => {
      cancelAnimationFrame(animationFrame);
      if (!document.hidden) animationFrame = requestAnimationFrame(draw);
    };
    resize();
    window.addEventListener('resize', resize);
    document.addEventListener('visibilitychange', onVisibility);
    animationFrame = requestAnimationFrame(draw);
    return () => {
      disposed = true;
      cancelAnimationFrame(animationFrame);
      window.removeEventListener('resize', resize);
      document.removeEventListener('visibilitychange', onVisibility);
    };
  }, [intensity, reducedMotion]);

  const tones = SCENE_TONES[scene] || SCENE_TONES.overview;
  return (
    <div className="v3-visual-stage" data-scene={scene} data-intensity={intensity} aria-hidden="true"
      style={{ '--scene-a': tones[0], '--scene-b': tones[1], '--scene-c': tones[2] }}>
      <div className="v3-visual-stage__aurora" />
      <div className="v3-visual-stage__grid" />
      <canvas ref={canvasRef} className="v3-visual-stage__particles" />
      <div className="v3-visual-stage__grain" />
      {fallback}
    </div>
  );
}

