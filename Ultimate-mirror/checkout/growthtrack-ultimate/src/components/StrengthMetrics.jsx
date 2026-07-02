import React from 'react';

export default function StrengthMetrics() {
  const exercises = [
    { name: 'Bench Press', current: 80, goal: 100, unit: 'kg', progress: 80 },
    { name: 'Squat', current: 120, goal: 150, unit: 'kg', progress: 80 },
    { name: 'Deadlift', current: 140, goal: 180, unit: 'kg', progress: 77.8 },
    { name: 'Overhead Press', current: 50, goal: 65, unit: 'kg', progress: 76.9 },
    { name: 'Pull-ups', current: 12, goal: 20, unit: 'reps', progress: 60 },
  ];

  const weeklyProgress = [
    { day: 'Mon', volume: 5200 },
    { day: 'Tue', volume: 0 },
    { day: 'Wed', volume: 6800 },
    { day: 'Thu', volume: 0 },
    { day: 'Fri', volume: 5500 },
    { day: 'Sat', volume: 7200 },
    { day: 'Sun', volume: 0 },
  ];

  return (
    <div className="dashboard-container">
      <header className="dashboard-header">
        <h1 className="dashboard-title">💪 Strength Metrics</h1>
        <p className="dashboard-subtitle">Track your strength training progress and personal records.</p>
      </header>

      <div className="grid-3">
        <div className="card">
          <div className="card__header">
            <h3 className="card__title">Total Volume (Week)</h3>
          </div>
          <div className="card__body">
            <div className="metric-big">24,700kg</div>
            <p className="text-success">+12% from last week</p>
          </div>
        </div>
        <div className="card">
          <div className="card__header">
            <h3 className="card__title">Training Days</h3>
          </div>
          <div className="card__body">
            <div className="metric-big">4/7</div>
            <p>This week</p>
          </div>
        </div>
        <div className="card">
          <div className="card__header">
            <h3 className="card__title">PRs This Month</h3>
          </div>
          <div className="card__body">
            <div className="metric-big">3</div>
            <p>Personal records</p>
          </div>
        </div>
      </div>

      <div className="card">
        <div className="card__header">
          <h3 className="card__title">Exercise Progress</h3>
        </div>
        <div className="card__body">
          <table className="table">
            <thead>
              <tr>
                <th>Exercise</th>
                <th>Current</th>
                <th>Goal</th>
                <th>Progress</th>
              </tr>
            </thead>
            <tbody>
              {exercises.map(ex => (
                <tr key={ex.name}>
                  <td>{ex.name}</td>
                  <td>{ex.current} {ex.unit}</td>
                  <td>{ex.goal} {ex.unit}</td>
                  <td>
                    <div className="progress-bar">
                      <div className="progress-bar__fill" style={{ width: `${ex.progress}%` }} />
                    </div>
                    <span>{ex.progress.toFixed(1)}%</span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div className="card">
        <div className="card__header">
          <h3 className="card__title">Weekly Volume (kg)</h3>
        </div>
        <div className="card__body">
          <div style={{ display: 'flex', gap: '1rem', alignItems: 'flex-end', height: '200px' }}>
            {weeklyProgress.map(d => (
              <div key={d.day} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.5rem' }}>
                <div style={{ height: `${d.volume / 50}px`, width: '100%', background: d.volume > 0 ? 'var(--accent)' : '#333', borderRadius: '4px' }} />
                <span>{d.day}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="grid-2">
        <div className="card">
          <div className="card__header">
            <h3 className="card__title">Recommended Focus</h3>
          </div>
          <div className="card__body">
            <ul>
              <li>Increase pull-up volume (currently at 60% of goal)</li>
              <li>Work on deadlift form for heavier lifts</li>
              <li>Add accessory work for overhead press</li>
            </ul>
          </div>
        </div>
        <div className="card">
          <div className="card__header">
            <h3 className="card__title">Next Milestone</h3>
          </div>
          <div className="card__body">
            <div className="metric-big">100kg</div>
            <p>Bench Press (20kg to go)</p>
            <button className="btn btn--primary" style={{ marginTop: '1rem' }}>Log Workout</button>
          </div>
        </div>
      </div>
    </div>
  );
}
