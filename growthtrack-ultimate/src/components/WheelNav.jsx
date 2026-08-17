import React, { useState, useRef, useEffect } from 'react';
import { Menu, X } from 'lucide-react';
import gsap from 'gsap';
import { GROUPS, TAB_GROUP_MAP } from './BottomNavBar';
import '../index.css';

export default function WheelNav({ activeTab, onTabChange }) {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef(null);
  const itemsRef = useRef([]);

  const activeGroup = TAB_GROUP_MAP[activeTab] || 'command';

  const toggleWheel = () => {
    setIsOpen(!isOpen);
  };

  useEffect(() => {
    if (isOpen) {
      // Animate items out into a quarter circle (arc from top to left)
      // We have 5 items, we want to space them evenly from 0 degrees (top) to 90 degrees (left)
      // Math: angle = i * (90 / 4) degrees
      itemsRef.current.forEach((el, index) => {
        if (!el) return;
        const angle = index * (90 / (GROUPS.length - 1)); 
        const radian = (angle * Math.PI) / 180;
        const radius = 100; // Distance from center button
        
        // Negative X for going left, negative Y for going up
        const x = -radius * Math.sin(radian);
        const y = -radius * Math.cos(radian);

        gsap.to(el, {
          x,
          y,
          scale: 1,
          opacity: 1,
          duration: 0.5,
          ease: 'back.out(1.5)',
          delay: index * 0.05
        });
      });
    } else {
      // Animate items back to center
      itemsRef.current.forEach((el, index) => {
        if (!el) return;
        gsap.to(el, {
          x: 0,
          y: 0,
          scale: 0,
          opacity: 0,
          duration: 0.3,
          ease: 'power2.in',
          delay: (GROUPS.length - 1 - index) * 0.03
        });
      });
    }
  }, [isOpen]);

  const handleSelect = (tab) => {
    onTabChange(tab);
    setIsOpen(false);
  };

  return (
    <div className="wheel-nav-container" ref={containerRef}>
      {GROUPS.map((group, index) => {
        const Icon = group.icon;
        const isActive = activeGroup === group.id;
        return (
          <button
            key={group.id}
            ref={(el) => (itemsRef.current[index] = el)}
            className={`wheel-nav-item ${isActive ? 'active' : ''}`}
            onClick={() => handleSelect(group.firstTab)}
            title={group.label}
          >
            <Icon size={20} />
          </button>
        );
      })}
      
      <button 
        className={`wheel-nav-toggle ${isOpen ? 'open' : ''}`} 
        onClick={toggleWheel}
      >
        <div className="toggle-icon-wrapper">
          {isOpen ? <X size={24} /> : <Menu size={24} />}
        </div>
      </button>
    </div>
  );
}
