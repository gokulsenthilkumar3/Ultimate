import React, { useRef, useEffect, useMemo } from 'react';
import gsap from 'gsap';
import { Settings, Bell } from 'lucide-react';
import { TAB_GROUP_MAP } from './BottomNavBar';
import { GLOBAL_MODULES } from '../constants/modules';

export default function PremiumSidebar({ activeTab, setActiveTab, user, onOpenSettings }) {
  const indicatorRef = useRef(null);
  const itemsRef = useRef({});

  // Flat list of all tabs ordered by business logic
  const allTabs = [
    // Primary / Daily Focus
    'overview', 'current', 'tasks', 'habits', 'progress', 'goals',
    // Work / Operations
    'projects', 'calendar', 'timesheet', 'finance', 'sip', 'shopping',
    // Body / Health
    'humanoid', 'physique', 'assessment', 'training', 'strength',
    'nutrition', 'hydration', 'sleep', 'medical', 'health', 'mind', 'lifestyle',
    // Knowledge / Library
    'notes', 'documents', 'databases', 'logs', 'skills', 'portfolio',
    // Tools / Extras
    'dashboards', 'analytics', 'forecast', 'ai', 'maps', 'entertainment', 'social', 'apps',
    // System
    'settings', 'about'
  ];

  // Animate the magic indicator
  useEffect(() => {
    const activeItem = itemsRef.current[activeTab];
    if (activeItem && indicatorRef.current) {
      const { offsetTop, offsetHeight } = activeItem;
      gsap.to(indicatorRef.current, {
        y: offsetTop,
        height: offsetHeight,
        duration: 0.5,
        ease: 'power3.out'
      });
    }
  }, [activeTab]);

  return (
    <aside className="premium-sidebar">
      <div className="premium-sidebar-header">
        <div className="premium-sidebar-user">
          <div className="premium-sidebar-avatar">
            {user?.name?.[0]?.toUpperCase() ?? 'U'}
          </div>
          <div className="premium-sidebar-user-info">
            <span className="premium-sidebar-name">{user?.name ?? 'Athlete'}</span>
            <span className="premium-sidebar-plan">{user?.plan ?? 'Ultimate Plan'}</span>
          </div>
        </div>
      </div>

      <nav className="premium-sidebar-nav" style={{ overflowY: 'auto', paddingRight: '4px' }}>
        <div className="magic-indicator" ref={indicatorRef} />
        {allTabs.map((tabId) => {
          const isActive = activeTab === tabId;
          return (
            <button
              key={tabId}
              ref={el => itemsRef.current[tabId] = el}
              className={`premium-sidebar-item ${isActive ? 'active' : ''}`}
              onClick={() => setActiveTab(tabId)}
              style={{ padding: '10px 12px' }}
            >
              <span className="premium-sidebar-label">{GLOBAL_MODULES[tabId] || tabId}</span>
            </button>
          );
        })}
      </nav>

      <div className="premium-sidebar-footer">
        <button className="premium-sidebar-action" onClick={() => setActiveTab('notifications')}>
          <Bell size={18} />
          <span>Updates</span>
        </button>
        <button className="premium-sidebar-action" onClick={onOpenSettings}>
          <Settings size={18} />
          <span>Settings</span>
        </button>
      </div>
    </aside>
  );
}
