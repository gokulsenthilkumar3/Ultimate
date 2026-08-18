import React, { useRef, useEffect } from 'react';
import gsap from 'gsap';
import { Sparkles, Shield, Heart, Wallet, FileText, Settings, Bell } from 'lucide-react';
import { GROUPS, TAB_GROUP_MAP } from './BottomNavBar';

export default function PremiumSidebar({ activeTab, setActiveTab, user, onOpenSettings }) {
  const activeGroup = TAB_GROUP_MAP[activeTab] || 'command';
  const indicatorRef = useRef(null);
  const itemsRef = useRef([]);

  // Animate the magic indicator
  useEffect(() => {
    const activeIndex = GROUPS.findIndex(g => g.id === activeGroup);
    if (activeIndex !== -1 && itemsRef.current[activeIndex] && indicatorRef.current) {
      const activeItem = itemsRef.current[activeIndex];
      const { offsetTop, offsetHeight } = activeItem;
      
      gsap.to(indicatorRef.current, {
        y: offsetTop,
        height: offsetHeight,
        duration: 0.5,
        ease: 'power3.out'
      });
    }
  }, [activeGroup]);

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

      <nav className="premium-sidebar-nav">
        <div className="magic-indicator" ref={indicatorRef} />
        {GROUPS.map((group, index) => {
          const isActive = activeGroup === group.id;
          const Icon = group.icon;
          return (
            <button
              key={group.id}
              ref={el => itemsRef.current[index] = el}
              className={`premium-sidebar-item ${isActive ? 'active' : ''}`}
              onClick={() => setActiveTab(group.firstTab)}
              aria-label={group.label}
            >
              <Icon className="premium-sidebar-icon" size={20} strokeWidth={isActive ? 2.5 : 2} />
              <span className="premium-sidebar-label">{group.label}</span>
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
