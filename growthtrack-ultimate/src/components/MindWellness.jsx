import React, { useState } from 'react';

export default function MindWellness() {
  const [moodScore, setMoodScore] = useState(7);
  const [stressLevel, setStressLevel] = useState(4);

  const moodData = [
    { day: 'Mon', score: 6 },
    { day: 'Tue', score: 7 },
    { day: 'Wed', score: 5 },
    { day: 'Thu', score: 8 },
    { day: 'Fri', score: 7 },
    { day: 'Sat', score: 9 },
    { day: 'Sun', score: 8 },
  ];

  return (
    <div className="dashboard-container">
      <header className="dashboard-header">
        <h1 className="dashboard-title">🧠 Mind & Wellness</h1>
        <p className="dashboard-subtitle">Track your mental health, stress, and mood.</p>
      </header>

      <div className="grid-3">
        <div className="card">
          <div className="card__header">
            <h3 className="card__title">Mood Score</h3>
          </div>
          <div className="card__body">
            <div className="metric-big">{moodScore}/10</div>
            <input type="range" min="1" max="10" value={moodScore} onChange={e => setMoodScore(+e.target.value)} className="slider" />
          </div>
        </div>
        <div className="card">
          <div className="card__header">
            <h3 className="card__title">Stress Level</h3>
          </div>
          <div className="card__body">
            <div className="metric-big">{stressLevel}/10</div>
            <input type="range" min="1" max="10" value={stressLevel} onChange={e => setStressLevel(+e.target.value)} className="slider" />
          </div>
        </div>
        <div className="card">
          <div className="card__header">
            <h3 className="card__title">Meditation</h3>
          </div>
          <div className="card__body">
            <div className="metric-big">12 min</div>
            <p>Today's session</p>
          </div>
        </div>
      </div>

      <div className="card">
        <div className="card__header">
          <h3 className="card__title">Weekly Mood Trend</h3>
        </div>
        <div className="card__body">
          <div style={{ display: 'flex', gap: '1rem', alignItems: 'flex-end', height: '200px' }}>
            {moodData.map(d => (
              <div key={d.day} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.5rem' }}>
                <div style={{ height: `${d.score * 20}px`, width: '100%', background: 'var(--accent)', borderRadius: '4px' }} />
                <span>{d.day}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="grid-2">
        <div className="card">
          <div className="card__header">
            <h3 className="card__title">Mindfulness Tips</h3>
          </div>
          <div className="card__body">
            <ul>
              <li>Practice deep breathing for 5 minutes daily</li>
              <li>Journal your thoughts before bed</li>
              <li>Take regular breaks during work</li>
              <li>Stay connected with friends and family</li>
            </ul>
          </div>
        </div>
        <div className="card">
          <div className="card__header">
            <h3 className="card__title">Quick Actions</h3>
          </div>
          <div className="card__body" style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
            <button className="btn btn--primary">Start Meditation</button>
            <button className="btn btn--outline">Breathing Exercise</button>
            <button className="btn btn--outline">Gratitude Journal</button>
          </div>
        </div>
      </div>
    </div>
  );
}
