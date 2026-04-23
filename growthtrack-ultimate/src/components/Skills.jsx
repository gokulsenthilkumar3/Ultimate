import React, { useState } from 'react';
import { SKILLS_METRICS_LIST } from '../data/userData';
import { BookOpen, TrendingUp, Award, Target } from 'lucide-react';
import useLocalStorage from '../hooks/useLocalStorage';

export default function Skills() {
  const [skillLogs, setSkillLogs] = useLocalStorage('gt-skill-logs', {});

  const categories = ['Languages', 'Communication', 'Programming', 'Finance'];

  const groupedSkills = categories.reduce((acc, category) => {
    acc[category] = SKILLS_METRICS_LIST.filter(s => s.category === category);
    return acc;
  }, {});

  const handleSkillUpdate = (skillId, value) => {
    setSkillLogs(prev => ({ ...prev, [skillId]: parseFloat(value) || 0 }));
  };

  const getCategoryProgress = (category) => {
    const skills = groupedSkills[category];
    if (!skills.length) return 0;
    const total = skills.reduce((sum, skill) => sum + (skillLogs[skill.id] || 0), 0);
    return (total / skills.length).toFixed(1);
  };

  return (
    <div style={{ padding: '2rem', maxWidth: '1400px', margin: '0 auto' }}>
      <div style={{ marginBottom: '3rem', textAlign: 'center' }}>
        <div style={{ display: 'inline-flex', alignItems: 'center', gap: '12px', marginBottom: '16px' }}>
          <Award size={40} style={{ color: 'var(--accent)' }} />
          <h1 style={{ margin: 0, fontSize: '2.5rem', fontWeight: 800, color: 'var(--text-1)' }}>Skills Matrix</h1>
        </div>
        <p style={{ color: 'var(--text-2)', maxWidth: '600px', margin: '0 auto' }}>Track your skill development across languages, programming, finance, and more.
        </p>
      </div>

      {/* Category Overview Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '1.5rem', marginBottom: '3rem' }}>
        {categories.map((category) => {
          const progress = getCategoryProgress(category);
          return (
            <div key={category} style={{
              background: 'var(--glass)',
              padding: '1.5rem',
              borderRadius: '16px',
              border: '1px solid var(--border)',
              boxShadow: 'var(--shadow-2)',
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '12px' }}>
                <Target size={24} style={{ color: 'var(--accent)' }} />
                <h3 style={{ margin: 0, fontSize: '1.2rem', color: 'var(--text-1)' }}>{category}</h3>
              </div>
              <div style={{ display: 'flex', alignItems: 'baseline', gap: '8px', marginBottom: '8px' }}>
                <span style={{ fontSize: '2rem', fontWeight: 800, color: 'var(--accent)' }}>{progress}%</span>
                <span style={{ color: 'var(--text-2)', fontSize: '0.9rem' }}>Average</span>
              </div>
              <div style={{ width: '100%', height: '8px', background: 'rgba(255,255,255,0.1)', borderRadius: '4px', overflow: 'hidden' }}>
                <div style={{ width: `${progress}%`, height: '100%', background: 'linear-gradient(90deg, var(--accent), var(--accent-light))', transition: 'width 0.3s ease' }} />
              </div>
              <p style={{ margin: '8px 0 0', fontSize: '0.85rem', color: 'var(--text-2)' }}>
                {groupedSkills[category].length} skills tracked
              </p>
            </div>
          );
        })}
      </div>

      {/* Skills by Category */}
      {categories.map((category) => (
        <div key={category} style={{ marginBottom: '3rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '1.5rem' }}>
            <BookOpen size={28} style={{ color: 'var(--accent)' }} />
            <h2 style={{ margin: 0, fontSize: '1.8rem', fontWeight: 700, color: 'var(--text-1)' }}>{category} Skills</h2>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '1.5rem' }}>
            {groupedSkills[category].map((skill) => {
              const currentLevel = skillLogs[skill.id] || 0;
              return (
                <div key={skill.id} style={{
                  background: 'var(--glass)',
                  padding: '1.5rem',
                  borderRadius: '16px',
                  border: '1px solid var(--border)',
                  boxShadow: 'var(--shadow-1)',
                  transition: 'all 0.3s ease',
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '12px' }}>
                    <span style={{ fontSize: '2rem' }}>{skill.icon}</span>
                    <div style={{ flex: 1 }}>
                      <h4 style={{ margin: 0, color: 'var(--text-1)', fontSize: '1.1rem' }}>{skill.label}</h4>
                      <p style={{ margin: '4px 0 0', fontSize: '0.85rem', color: 'var(--text-2)' }}>{skill.category}</p>
                    </div>
                  </div>

                  <div style={{ marginTop: '16px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                      <label style={{ fontSize: '0.9rem', color: 'var(--text-2)' }}>Proficiency Level</label>
                      <span style={{ fontSize: '1.3rem', fontWeight: 700, color: 'var(--accent)' }}>{currentLevel}%</span>
                    </div>
                    <input
                      type="range"
                      min="0"
                      max="100"
                      step="5"
                      value={currentLevel}
                      onChange={(e) => handleSkillUpdate(skill.id, e.target.value)}
                      style={{
                        width: '100%',
                        height: '8px',
                        background: `linear-gradient(to right, var(--accent) 0%, var(--accent) ${currentLevel}%, rgba(255,255,255,0.1) ${currentLevel}%, rgba(255,255,255,0.1) 100%)`,
                        borderRadius: '4px',
                        outline: 'none',
                        appearance: 'none',
                      }}
                    />
                  </div>

                  {currentLevel >= 80 && (
                    <div style={{ marginTop: '12px', display: 'flex', alignItems: 'center', gap: '8px', padding: '8px', background: 'rgba(34,197,94,0.1)', borderRadius: '8px' }}>
                      <TrendingUp size={16} style={{ color: '#22c55e' }} />
                      <span style={{ fontSize: '0.85rem', color: '#22c55e', fontWeight: 600 }}>Expert Level!</span>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
}
