import React, { useMemo } from 'react';

export default function ContributionGrid({ habits = [] }) {
  const gridData = useMemo(() => {
    const data = [];
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    // Create a map of date string -> count of completed habits
    const counts = {};
    habits.forEach(h => {
      (h.completed_dates || []).forEach(d => {
        counts[d] = (counts[d] || 0) + 1;
      });
    });

    const maxHabits = habits.length || 1;

    // We want roughly the last 90 days. Find the start date.
    let startDate = new Date(today);
    startDate.setDate(today.getDate() - 89); // 90 days including today
    
    // Adjust start date to the Sunday before it to align the grid
    const dayOfWeek = startDate.getDay();
    startDate.setDate(startDate.getDate() - dayOfWeek);

    const totalDays = Math.round((today - startDate) / (1000 * 60 * 60 * 24)) + 1;

    for (let i = 0; i < totalDays; i++) {
      const d = new Date(startDate);
      d.setDate(startDate.getDate() + i);
      const dateStr = d.toISOString().split('T')[0];
      const count = counts[dateStr] || 0;
      
      let intensity = 0;
      if (count > 0) {
        intensity = Math.ceil((count / maxHabits) * 4);
        if (intensity > 4) intensity = 4;
      }

      data.push({
        date: dateStr,
        count,
        intensity
      });
    }

    return data;
  }, [habits]);

  const getColor = (intensity) => {
    // Return CSS custom properties that can adapt to light/dark themes
    if (intensity === 0) return 'var(--bg-elevated)';
    if (intensity === 1) return 'var(--accent-soft)';
    
    // We can simulate opacities of the accent color for 2, 3, 4
    // Using a simple gradient approach or hardcoded values
    if (intensity === 2) return 'color-mix(in srgb, var(--accent) 40%, transparent)';
    if (intensity === 3) return 'color-mix(in srgb, var(--accent) 70%, transparent)';
    return 'var(--accent)';
  }

  return (
    <div className="glass-card" style={{ padding: '1.5rem', marginBottom: '1.5rem', overflowX: 'auto' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: '1rem' }}>
        <div>
          <h3 className="card-title" style={{ margin: 0 }}>Momentum Heatmap</h3>
          <p className="text-secondary" style={{ fontSize: '0.75rem', marginTop: '2px' }}>Last 90 days consistency</p>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '0.65rem', color: 'var(--text-3)' }}>
          <span>Less</span>
          {[0, 1, 2, 3, 4].map(i => (
            <div key={i} style={{ width: '10px', height: '10px', borderRadius: '2px', background: getColor(i) }} />
          ))}
          <span>More</span>
        </div>
      </div>

      <div style={{ 
        display: 'grid', 
        gridTemplateRows: 'repeat(7, 14px)',
        gridAutoFlow: 'column',
        gap: '4px',
        width: 'max-content'
      }}>
        {gridData.map(d => (
          <div 
            key={d.date} 
            style={{
              width: '14px', height: '14px',
              borderRadius: '3px',
              background: getColor(d.intensity),
              transition: 'all 0.2s ease',
              cursor: 'pointer'
            }}
            title={`${d.date}: ${d.count} habits completed`}
            onMouseEnter={(e) => {
              e.currentTarget.style.transform = 'scale(1.2)';
              e.currentTarget.style.boxShadow = '0 0 8px var(--accent-soft)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.transform = 'scale(1)';
              e.currentTarget.style.boxShadow = 'none';
            }}
          />
        ))}
      </div>
    </div>
  );
}
