import React from 'react';
import { TABS } from '../data/userData';

export default function Navigation({ activeTab, setActiveTab }) {
  return (
    <nav className="nav-container">
      <div className="nav-grid">
        {TABS.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`nav-item ${activeTab === tab.id ? 'active' : ''}`}
          >
            <span style={{ fontSize: '1rem' }}>{tab.icon}</span>
            {tab.label}
          </button>
        ))}
      </div>
    </nav>
  );
}
