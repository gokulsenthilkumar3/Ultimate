import React from 'react';
import { NUTRITION } from '../data/userData';
import { Utensils, Clock } from 'lucide-react';

export default function Nutrition() {
  return (
    <div className="fade-in">
      <div className="section-head">
        <h2 className="text-display" style={{ fontSize: '2rem' }}>Fueling Strategy</h2>
        <p className="text-secondary">Hypertrophy-focused nutrition for Phase 1 Lean Bulk.</p>
      </div>

      <div className="dashboard-grid">
         <div className="glass-card" style={{ gridColumn: 'span 2', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div style={{ display: 'flex', gap: '3rem' }}>
               <div>
                  <p className="label-caps">Daily Calories</p>
                  <p className="text-display gradient-text" style={{ fontSize: '2rem' }}>{NUTRITION.calories}</p>
               </div>
               <div>
                  <p className="label-caps">Protein Target</p>
                  <p className="text-display" style={{ fontSize: '2rem', color: 'var(--accent-green)' }}>{NUTRITION.protein}</p>
               </div>
            </div>
            <div className="btn-ghost" style={{ display: 'flex', gap: '8px' }}>
               <Clock size={16} /> Track Meal
            </div>
         </div>

         {NUTRITION.meals.map((meal, idx) => (
           <div key={idx} className="glass-card">
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1rem' }}>
                 <span style={{ fontSize: '1.5rem' }}>{meal.icon}</span>
                 <div>
                    <h4 style={{ fontWeight: 800 }}>{meal.name}</h4>
                    <p style={{ fontSize: '0.7rem', color: 'var(--accent-primary)', fontWeight: 700 }}>{meal.time}</p>
                 </div>
              </div>
              <ul style={{ listStyle: 'none', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                 {meal.items.map((item, i) => (
                   <li key={i} style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', display: 'flex', gap: '8px' }}>
                     <span style={{ color: 'var(--accent-primary)' }}>•</span> {item}
                   </li>
                 ))}
              </ul>
           </div>
         ))}
      </div>
    </div>
  );
}
