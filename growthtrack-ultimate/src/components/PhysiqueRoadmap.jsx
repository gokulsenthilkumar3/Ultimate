import React from 'react';
import { Target, Activity, Dumbbell, ArrowRight } from 'lucide-react';

export default function PhysiqueRoadmap({ targets, user }) {
  const getRatio = () => {
    if (user?.shoulders && user?.waist) {
      return (user.shoulders / user.waist).toFixed(2);
    }
    return '1.31'; // Fallback to provided ratio
  };

  return (
    <div style={{ marginTop: '2.5rem', display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', borderBottom: '1px solid var(--border)', paddingBottom: '1rem' }}>
        <Target size={24} color="var(--accent)" />
        <h2 style={{ fontSize: '1.25rem', fontWeight: 800, margin: 0, fontFamily: 'var(--font-display)' }}>
          "Greek God" Transformation Roadmap
        </h2>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem' }}>
        
        {/* Roadmap Left: Nutrition & Split */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          
          <div style={{ background: 'var(--bg-elevated)', borderRadius: '12px', padding: '1.5rem', border: '1px solid var(--border)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1rem' }}>
              <Activity size={18} color="#34d399" />
              <h3 style={{ fontSize: '0.9rem', fontWeight: 800, margin: 0, textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--text-1)' }}>
                Mission: Lean Bulk
              </h3>
            </div>
            
            <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: '10px' }}>
              <li style={{ fontSize: '0.85rem', color: 'var(--text-2)' }}>
                <strong style={{ color: 'var(--text-1)' }}>Surplus:</strong> +300-500 Calories/day (~0.25-0.5kg week)
              </li>
              <li style={{ fontSize: '0.85rem', color: 'var(--text-2)' }}>
                <strong style={{ color: 'var(--text-1)' }}>Protein:</strong> 115 - 140g Daily (1.8-2.2g per kg)
              </li>
              <li style={{ fontSize: '0.85rem', color: 'var(--text-2)' }}>
                <strong style={{ color: 'var(--text-1)' }}>Timeline:</strong> 12 - 18 months for dramatic transformation.
              </li>
              <li style={{ fontSize: '0.85rem', color: 'var(--text-2)' }}>
                <strong style={{ color: 'var(--text-1)' }}>Primary Focus:</strong> Upper back, shoulders, chest to create V-taper.
              </li>
            </ul>
          </div>

          <div style={{ background: 'var(--bg-elevated)', borderRadius: '12px', padding: '1.5rem', border: '1px solid var(--border)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1rem' }}>
              <Dumbbell size={18} color="#f43f5e" />
              <h3 style={{ fontSize: '0.9rem', fontWeight: 800, margin: 0, textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--text-1)' }}>
                Push / Pull / Legs Split
              </h3>
            </div>
            
            <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '0.75rem' }}>
              <div style={{ background: 'var(--bg-surface)', padding: '0.75rem', borderRadius: '8px', borderLeft: '3px solid #3b82f6' }}>
                <strong style={{ display: 'block', fontSize: '0.8rem', color: 'var(--text-1)', marginBottom: '4px' }}>Push (Chest, Shoulders, Triceps)</strong>
                <span style={{ fontSize: '0.75rem', color: 'var(--text-3)' }}>BB/DB Overhead Press (Priority #1), DB Lateral Raises, Bench Press.</span>
              </div>
              <div style={{ background: 'var(--bg-surface)', padding: '0.75rem', borderRadius: '8px', borderLeft: '3px solid #8b5cf6' }}>
                <strong style={{ display: 'block', fontSize: '0.8rem', color: 'var(--text-1)', marginBottom: '4px' }}>Pull (Back, Rear Delts, Biceps)</strong>
                <span style={{ fontSize: '0.75rem', color: 'var(--text-3)' }}>Pull-ups/Pulldowns, Bent-over Rows, Face Pulls, BB Curls.</span>
              </div>
              <div style={{ background: 'var(--bg-surface)', padding: '0.75rem', borderRadius: '8px', borderLeft: '3px solid #10b981' }}>
                <strong style={{ display: 'block', fontSize: '0.8rem', color: 'var(--text-1)', marginBottom: '4px' }}>Legs (Quads, Hams, Calves, Abs)</strong>
                <span style={{ fontSize: '0.75rem', color: 'var(--text-3)' }}>Squats, Deadlifts (Non-negotiable).</span>
              </div>
            </div>
          </div>

        </div>

        {/* Roadmap Right: Measurements */}
        <div style={{ background: 'var(--bg-elevated)', borderRadius: '12px', padding: '1.5rem', border: '1px solid var(--border)', display: 'flex', flexDirection: 'column' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.5rem' }}>
             <h3 style={{ fontSize: '0.9rem', fontWeight: 800, margin: 0, textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--text-1)' }}>
              Target Analysis
            </h3>
            <div style={{ background: 'rgba(251, 191, 36, 0.1)', color: '#fbbf24', padding: '4px 10px', borderRadius: '99px', fontSize: '0.7rem', fontWeight: 700 }}>
              S:W Ratio: {getRatio()} 
              <ArrowRight size={10} style={{ margin: '0 4px', display: 'inline' }} /> 
              1.6+
            </div>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            {targets.map((t, idx) => (
              <div key={idx} style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr 2.5fr', gap: '0.5rem', alignItems: 'center', paddingBottom: '0.75rem', borderBottom: idx < targets.length - 1 ? '1px solid var(--border)' : 'none' }}>
                <span style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-1)' }}>{t.label}</span>
                <span style={{ fontSize: '0.85rem', color: 'var(--text-3)' }}>{t.current}</span>
                <span style={{ fontSize: '0.85rem', color: 'var(--accent)', fontWeight: 700 }}>{t.target}</span>
                <div style={{ flex: 1, height: '4px', background: 'var(--border)', borderRadius: '99px', overflow: 'hidden' }}>
                  <div style={{ height: '100%', width: `${t.progress}%`, background: 'var(--accent)', borderRadius: '99px' }} />
                </div>
              </div>
            ))}
          </div>
          
        </div>

      </div>
    </div>
  );
}
