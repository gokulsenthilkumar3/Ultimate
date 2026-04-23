import React, { useState, useRef, useEffect } from 'react';
import {
  LayoutDashboard, FileText, Shield, Dumbbell,
  Utensils, Moon, Target, CalendarDays, Scan,
  ChevronLeft, ChevronRight, Heart, Brain
} from 'lucide-react';

const ICON_MAP = {
  overview:   LayoutDashboard,
  humanoid:   Scan,
  assessment: FileText,
  physique:   Shield,
  training:   Dumbbell,
  nutrition:  Utensils,
  sleep:      Moon,
  lifestyle:  Heart,
  progress:   CalendarDays,
  goals:      Target,
};

const PALETTES = [
  { id: 'gold',   color: '#f59e0b' },
  { id: 'ocean',  color: '#0ea5e9' },
  { id: 'mint',   color: '#10b981' },
  { id: 'violet', color: '#8b5cf6' },
  { id: 'rose',   color: '#f43f5e' },
];

export default function Navigation({ activeTab, setActiveTab, navItems, palette, theme }) {
  const scrollRef = useRef(null);
  const [canScrollLeft,  setCanScrollLeft]  = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(true);

  // Resolve accent color directly so it always works in both light and dark mode
  const accentColor = PALETTES.find(p => p.id === palette)?.color || '#f59e0b';

  const updateScrollState = () => {
    const el = scrollRef.current;
    if (!el) return;
    setCanScrollLeft(el.scrollLeft > 4);
    setCanScrollRight(el.scrollLeft < el.scrollWidth - el.clientWidth - 4);
  };

  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    el.addEventListener('scroll', updateScrollState, { passive: true });
    updateScrollState();
    return () => el.removeEventListener('scroll', updateScrollState);
  }, []);

  // Auto-scroll active tab into view
  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    const active = el.querySelector('.nav-item.active');
    if (active) {
      active.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' });
    }
  }, [activeTab]);

  const scroll = (dir) => {
    if (!scrollRef.current) return;
    scrollRef.current.scrollBy({ left: dir * 200, behavior: 'smooth' });
  };

  return (
    <nav className="nav-container" role="navigation" aria-label="Main navigation">
      <div className="nav-track" ref={scrollRef}>
        {navItems.map((tab) => {
          const Icon     = ICON_MAP[tab.id] || LayoutDashboard;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`nav-item${isActive ? ' active' : ''}`}
              aria-current={isActive ? 'page' : undefined}
              style={isActive ? {
                background: accentColor,
                color: '#ffffff',
                borderRadius: '12px',
              } : {}}
            >
              <span className="nav-icon-wrap">
                <Icon
                  size={18}
                  strokeWidth={isActive ? 2.5 : 1.8}
                  className="nav-icon"
                  style={isActive ? { color: '#ffffff' } : {}}
                />
                {tab.badge && (
                  <span className="nav-badge">{tab.badge}</span>
                )}
              </span>
              <span className="nav-label" style={isActive ? { color: '#ffffff' } : {}}>{tab.label}</span>
            </button>
          );
        })}
      </div>
    </nav>
  );
}
