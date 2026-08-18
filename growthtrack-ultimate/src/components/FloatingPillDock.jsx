import React, { useEffect, useRef, useState } from 'react';
import gsap from 'gsap';
import { GROUPS, TAB_GROUP_MAP } from './BottomNavBar';

export default function FloatingPillDock({ activeTab, onTabChange }) {
  const activeGroup = TAB_GROUP_MAP[activeTab] || 'command';
  const dockRef = useRef(null);
  const itemsRef = useRef([]);
  const [isVisible, setIsVisible] = useState(true);
  const lastScrollY = useRef(0);

  // Auto-hide on scroll logic
  useEffect(() => {
    const handleScroll = () => {
      const currentScrollY = window.scrollY;
      
      if (currentScrollY > lastScrollY.current && currentScrollY > 50) {
        // Scrolling down
        if (isVisible) setIsVisible(false);
      } else {
        // Scrolling up
        if (!isVisible) setIsVisible(true);
      }
      
      lastScrollY.current = currentScrollY;
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, [isVisible]);

  // Animate dock visibility
  useEffect(() => {
    if (dockRef.current) {
      gsap.to(dockRef.current, {
        y: isVisible ? 0 : 150,
        opacity: isVisible ? 1 : 0,
        duration: 0.5,
        ease: 'power3.out'
      });
    }
  }, [isVisible]);

  // Animate items on active state change
  useEffect(() => {
    itemsRef.current.forEach((el, index) => {
      if (!el) return;
      const isActive = GROUPS[index].id === activeGroup;
      const label = el.querySelector('.pill-dock-label');
      const icon = el.querySelector('.pill-dock-icon');
      
      if (isActive) {
        gsap.to(el, { flex: 2, padding: '0 20px', background: 'var(--nav-highlight)', duration: 0.5, ease: 'elastic.out(1, 0.5)' });
        gsap.to(icon, { scale: 1.1, color: 'var(--accent-color)', duration: 0.3 });
        if (label) gsap.to(label, { width: 'auto', opacity: 1, marginLeft: 8, duration: 0.4, ease: 'power2.out' });
      } else {
        gsap.to(el, { flex: 1, padding: '0 12px', background: 'transparent', duration: 0.4, ease: 'power2.out' });
        gsap.to(icon, { scale: 1, color: 'var(--text-3)', duration: 0.3 });
        if (label) gsap.to(label, { width: 0, opacity: 0, marginLeft: 0, duration: 0.3, ease: 'power2.inOut' });
      }
    });
  }, [activeGroup]);

  return (
    <div className="floating-pill-dock-container" ref={dockRef}>
      <nav className="floating-pill-dock">
        {GROUPS.map((group, index) => {
          const isActive = activeGroup === group.id;
          const Icon = group.icon;
          return (
            <button
              key={group.id}
              ref={el => itemsRef.current[index] = el}
              className={`pill-dock-item ${isActive ? 'active' : ''}`}
              onClick={() => onTabChange(group.firstTab)}
              aria-label={group.label}
            >
              <Icon className="pill-dock-icon" size={24} strokeWidth={isActive ? 2.5 : 2} />
              <span className="pill-dock-label">{group.label}</span>
            </button>
          );
        })}
      </nav>
    </div>
  );
}
