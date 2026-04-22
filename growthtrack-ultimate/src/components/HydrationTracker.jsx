import React, { useState } from 'react';

export default function HydrationTracker() {
  const [waterIntake, setWaterIntake] = useState(1800);
  const dailyGoal = 3000;
  const percentage = Math.min((waterIntake / dailyGoal) * 100, 100);

  const addWater = (amount) => {
    setWaterIntake(prev => Math.min(prev + amount, dailyGoal));
  };

  return (
    <div className="dashboard-container">
      <header className="dashboard-header">
        <h1 className="dashboard-title">💧 Hydration Tracker</h1>
        <p className="dashboard-subtitle">Monitor daily water intake and stay hydrated.</p>
      </header>

      <div className="grid-3">
        <div className="card">
          <div className="card__header">
            <h3 className="card__title">Today's Intake</h3>
          </div>
          <div className="card__body">
            <div className="metric-big">{waterIntake}ml</div>
            <p>of {dailyGoal}ml goal</p>
            <div className="progress-bar" style={{ marginTop: '1rem' }}>
              <div className="progress-bar__fill" style={{ width: `${percentage}%` }} />
            </div>
          </div>
        </div>
        <div className="card">
          <div className="card__header">
            <h3 className="card__title">Completion</h3>
          </div>
          <div className="card__body">
            <div className="metric-big">{percentage.toFixed(0)}%</div>
            <p>{dailyGoal - waterIntake > 0 ? `${dailyGoal - waterIntake}ml remaining` : 'Goal achieved!'}</p>
          </div>
        </div>
        <div className="card">
          <div className="card__header">
            <h3 className="card__title">Last Drink</h3>
          </div>
          <div className="card__body">
            <div className="metric-big">15 min</div>
            <p>ago</p>
          </div>
        </div>
      </div>

      <div className="card">
        <div className="card__header">
          <h3 className="card__title">Quick Add</h3>
        </div>
        <div className="card__body" style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
          <button className="btn btn--primary" onClick={() => addWater(250)}>+ 250ml (Glass)</button>
          <button className="btn btn--primary" onClick={() => addWater(500)}>+ 500ml (Bottle)</button>
          <button className="btn btn--primary" onClick={() => addWater(750)}>+ 750ml (Large Bottle)</button>
          <button className="btn btn--outline" onClick={() => setWaterIntake(0)}>Reset</button>
        </div>
      </div>

      <div className="grid-2">
        <div className="card">
          <div className="card__header">
            <h3 className="card__title">Hydration Tips</h3>
          </div>
          <div className="card__body">
            <ul>
              <li>Drink water first thing in the morning</li>
              <li>Carry a reusable water bottle</li>
              <li>Set hourly reminders to drink water</li>
              <li>Drink before, during, and after exercise</li>
            </ul>
          </div>
        </div>
        <div className="card">
          <div className="card__header">
            <h3 className="card__title">Weekly Average</h3>
          </div>
          <div className="card__body">
            <div className="metric-big">2400ml</div>
            <p>per day (last 7 days)</p>
          </div>
        </div>
      </div>
    </div>
  );
}
