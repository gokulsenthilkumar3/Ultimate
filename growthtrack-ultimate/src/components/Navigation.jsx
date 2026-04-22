import React from 'react';
import { LayoutDashboard, FileText, Stethoscope, Accessibility, Shield, Dumbbell, Utensils, Heart, CalendarDays } from 'lucide-react';

const navItems = [
  { id: 'overview', label: 'Overview', icon: LayoutDashboard },
  { id: 'assessment', label: 'Assessment', icon: FileText },
  { id: 'medical', label: 'Medical', icon: Stethoscope },
  { id: 'body3d', label: '3D Engine', icon: Accessibility },
  { id: 'physique', label: 'Physique', icon: Shield },
  { id: 'training', label: 'Training', icon: Dumbbell },
  { id: 'nutrition', label: 'Nutrition', icon: Utensils },
  { id: 'lifestyle', label: 'Lifestyle', icon: Heart },
  { id: 'progress', label: 'Progress', icon: CalendarDays },
];

export default function Navigation({ activeTab, setActiveTab }) {
  return (
    <nav className="nav-container">
      <div className="nav-grid">
        {navItems.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`nav-item ${isActive ? 'active' : ''}`}
            >
              <Icon size={16} strokeWidth={isActive ? 2.5 : 2} color={isActive ? 'var(--bg-base)' : 'var(--accent)'} />
              <span style={{ fontWeight: isActive ? 700 : 500, letterSpacing: '0.02em' }}>{tab.label}</span>
            </button>
          );
        })}
      </div>
    </nav>
  );
}
