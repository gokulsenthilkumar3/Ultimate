import React, { useState, useRef, useEffect } from 'react';
import {
  LayoutDashboard, FileText, Stethoscope, Shield, Dumbbell,
  Utensils, Heart, CalendarDays, User3d, Moon, Target,
  BarChart3, Scan, ChevronLeft, ChevronRight
} from 'lucide-react';

const NAV_ITEMS = [
  { id: 'overview',   label: 'Overview',   icon: LayoutDashboard, group: 'core' },
  { id: 'body3d',     label: '3D Twin',    icon: Scan,            group: 'core', badge: 'LIVE' },
  { id: 'assessment', label: 'Assessment', icon: FileText,        group: 'core' },
  { id: 'medical',    label: 'Medical',    icon: Stethoscope,     group: 'health' },
  { id: 'physique',   label: 'Physique',   icon: Shield,          group: 'health' },
  { id: 'training',   label: 'Training',   icon: Dumbbell,        group: 'health' },
  { id: 'nutrition',  label: 'Nutrition',  icon: Utensils,        group: 'health' },
  { id: 'lifestyle',  label: 'Lifestyle',  icon: Heart,           group: 'health' },
  { id: 'sleep',      label: 'Sleep',      icon: Moon,            group: 'track', badge: 'NEW' },
  { id: 'goals',      label: 'Goals',      icon: Target,          group: 'track', badge: 'NEW' },
  { id: 'analytics',  label: 'Analytics',  icon: BarChart3,       group: 'track', badge: 'NEW' },
  { id: 'progress',   label: 'Progress',   icon: CalendarDays,    group: 'track' },
];

export default function Navigation({ activeTab, setActiveTab }) {
  const scrollRef = useRef(null);
  const [canScrollLeft, setCanScrollLeft]   = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(true);

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
      {canScrollLeft && (
        <button className="nav-scroll-btn left" onClick={() => scroll(-1)} aria-label="Scroll left">
          <ChevronLeft size={16} />
        </button>
      )}

      <div className="nav-track" ref={scrollRef}>
        {NAV_ITEMS.map((tab) => {
          const Icon     = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`nav-item${isActive ? ' active' : ''}`}
              aria-current={isActive ? 'page' : undefined}
              title={tab.label}
            >
              <span className="nav-icon-wrap">
                <Icon
                  size={18}
                  strokeWidth={isActive ? 2.5 : 1.8}
                  className="nav-icon"
                />
                {tab.badge && (
                  <span className="nav-badge">{tab.badge}</span>
                )}
              </span>
              <span className="nav-label">{tab.label}</span>
              {isActive && <span className="nav-active-bar" />}
            </button>
          );
        })}
      </div>

      {canScrollRight && (
        <button className="nav-scroll-btn right" onClick={() => scroll(1)} aria-label="Scroll right">
          <ChevronRight size={16} />
        </button>
      )}
    </nav>
  );
}
