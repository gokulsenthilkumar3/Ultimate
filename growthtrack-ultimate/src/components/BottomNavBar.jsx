import React from 'react';
import { LayoutDashboard, Shield, Heart, Wallet, FileText } from 'lucide-react';

const GROUPS = [
  { id: 'command', label: 'Command', icon: LayoutDashboard, firstTab: 'overview' },
  { id: 'physiology', label: 'Physiology', icon: Shield, firstTab: 'humanoid' },
  { id: 'lifestyle', label: 'Lifestyle', icon: Heart, firstTab: 'sleep' },
  { id: 'operations', label: 'Operations', icon: Wallet, firstTab: 'tasks' },
  { id: 'library', label: 'Library', icon: FileText, firstTab: 'entertainment' },
];

export default function BottomNavBar({ activeTab, onTabChange }) {
  // Determine which group is active based on the activeTab
  // This is a bit simplified, ideally we'd map all tabs to groups
  const getActiveGroup = () => {
    if (['overview', 'dashboards', 'logs', 'settings', 'apps', 'current'].includes(activeTab)) return 'command';
    if (['humanoid', 'physique', 'training', 'nutrition', 'assessment', 'medical', 'strength', 'hydration'].includes(activeTab)) return 'physiology';
    if (['sleep', 'lifestyle', 'goals', 'progress', 'health', 'mind', 'skills', 'analytics'].includes(activeTab)) return 'lifestyle';
    if (['tasks', 'finance', 'timesheet', 'projects', 'shopping', 'calendar'].includes(activeTab)) return 'operations';
    if (['entertainment', 'notes', 'documents', 'databases', 'portfolio', 'social', 'ai', 'maps'].includes(activeTab)) return 'library';
    return 'command';
  };

  const activeGroup = getActiveGroup();

  return (
    <nav className="mobile-bottom-nav">
      {GROUPS.map((group) => (
        <button
          key={group.id}
          className={`bottom-nav-item ${activeGroup === group.id ? 'active' : ''}`}
          onClick={() => onTabChange(group.firstTab)}
        >
          <group.icon size={20} />
          <span className="bottom-nav-label">{group.label}</span>
        </button>
      ))}
    </nav>
  );
}
