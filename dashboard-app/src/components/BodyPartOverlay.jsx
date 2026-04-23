import React, { useState, useEffect } from 'react';
import { gsap } from 'gsap';
import useStore from '../store/useStore';
import './BodyPartOverlay.css';

/**
 * BodyPartOverlay - Spatial UI contextual overlay for body parts
 * Displays quick-access metrics and actions when hovering/clicking body parts
 */
const BodyPartOverlay = ({ bodyPart, position }) => {
  const { selectedBodyPart, setSelectedBodyPart, addCriticalAlert } = useStore();
  const [metrics, setMetrics] = useState(null);
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    if (bodyPart) {
      setIsVisible(true);
      // Fetch metrics for this body part
      fetchBodyPartMetrics(bodyPart);
      
      // GSAP animation for entrance
      gsap.fromTo(
        '.overlay-card',
        { opacity: 0, y: -20, scale: 0.9 },
        { opacity: 1, y: 0, scale: 1, duration: 0.3, ease: 'back.out(1.7)' }
      );
    } else {
      setIsVisible(false);
    }
  }, [bodyPart]);

  const fetchBodyPartMetrics = (part) => {
    // Simulate fetching metrics
    const mockMetrics = {
      chest: { circumference: '102cm', target: '105cm', progress: 85, status: 'good' },
      biceps: { circumference: '38cm', target: '40cm', progress: 95, status: 'critical' },
      waist: { circumference: '85cm', target: '80cm', progress: 50, status: 'warning' },
      thighs: { circumference: '58cm', target: '60cm', progress: 90, status: 'good' },
    };
    setMetrics(mockMetrics[part] || null);
  };

  const handleQuickLog = () => {
    alert(`Quick log for ${bodyPart}`);
  };

  const handleSetGoal = () => {
    alert(`Set goal for ${bodyPart}`);
  };

  if (!isVisible || !metrics) return null;

  return (
    <div
      className="body-part-overlay overlay-card"
      style={{
        position: 'absolute',
        left: `${position.x}px`,
        top: `${position.y}px`,
        zIndex: 1000,
      }}
    >
      <div className="overlay-header">
        <h3>{bodyPart.toUpperCase()}</h3>
        <button
          className="close-btn"
          onClick={() => setSelectedBodyPart(null)}
        >
          ×
        </button>
      </div>

      <div className="overlay-content">
        <div className="metric-row">
          <span className="label">Current:</span>
          <span className="value">{metrics.circumference}</span>
        </div>
        <div className="metric-row">
          <span className="label">Target:</span>
          <span className="value">{metrics.target}</span>
        </div>

        <div className="progress-bar-container">
          <div
            className={`progress-bar progress-${metrics.status}`}
            style={{ width: `${metrics.progress}%` }}
          />
        </div>
        <span className="progress-text">{metrics.progress}% to goal</span>

        {metrics.status === 'critical' && (
          <div className="alert-badge pulse-alert">⚠ Needs attention</div>
        )}
      </div>

      <div className="overlay-actions">
        <button className="action-btn" onClick={handleQuickLog}>
          📝 Quick Log
        </button>
        <button className="action-btn" onClick={handleSetGoal}>
          🎯 Set Goal
        </button>
      </div>
    </div>
  );
};

export default BodyPartOverlay;
