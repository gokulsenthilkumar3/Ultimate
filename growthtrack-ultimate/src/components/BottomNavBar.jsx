import React from 'react';
import { LayoutDashboard, Shield, Heart, Wallet, FileText } from 'lucide-react';

// Tab → group mapping (single source of truth)
const TAB_GROUP_MAP = {
  overview: 'command', dashboards: 'command', logs: 'command',
  settings: 'command', apps: 'command', current: 'command', about: 'command',
  humanoid: 'physiology', physique: 'physiology', training: 'physiology',
  nutrition: 'physiology', assessment: 'physiology', medical: 'physiology',
  strength: 'physiology', hydration: 'physiology',
  sleep: 'lifestyle', lifestyle: 'lifestyle', goals: 'lifestyle',
  progress: 'lifestyle', health: 'lifestyle', mind: 'lifestyle',
  skills: 'lifestyle', analytics: 'lifestyle', forecast: 'lifestyle',
  tasks: 'operations', finance: 'operations', timesheet: 'operations',
  projects: 'operations', shopping: 'operations', calendar: 'operations',
  sip: 'operations',
  entertainment: 'library', notes: 'library', documents: 'library',
  databases: 'library', portfolio: 'library', social: 'library',
  ai: 'library', maps: 'library',
};

const GROUPS = [
  { id: 'command',    label: 'Command',    icon: LayoutDashboard, firstTab: 'overview' },
  { id: 'physiology', label: 'Physiology', icon: Shield,          firstTab: 'humanoid' },
  { id: 'lifestyle',  label: 'Lifestyle',  icon: Heart,           firstTab: 'sleep'    },
  { id: 'operations', label: 'Operations', icon: Wallet,          firstTab: 'tasks'    },
  { id: 'library',    label: 'Library',    icon: FileText,        firstTab: 'entertainment' },
];

export default function BottomNavBar({ activeTab, onTabChange }) {
  const activeGroup = TAB_GROUP_MAP[activeTab] || 'command';

  return (
    <nav className="mobile-bottom-nav" role="tablist" aria-label="Section navigation">
      {GROUPS.map((group) => (
        <button
          key={group.id}
          role="tab"
          aria-selected={activeGroup === group.id}
          aria-label={`${group.label} section`}
          className={`bottom-nav-item ${activeGroup === group.id ? 'active' : ''}`}
          onClick={() => onTabChange(group.firstTab)}
        >
          <group.icon size={20} aria-hidden="true" />
          <span className="bottom-nav-label">{group.label}</span>
        </button>
      ))}
    </nav>
  );
}
