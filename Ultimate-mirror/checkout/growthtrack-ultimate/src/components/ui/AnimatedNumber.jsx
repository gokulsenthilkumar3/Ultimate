import React, { useState, useEffect } from 'react';

export default function AnimatedNumber({ value, duration = 1000, decimals = 0 }) {
  const [displayValue, setDisplayValue] = useState(0);

  useEffect(() => {
    let startTimestamp = null;
    const initialValue = displayValue;
    const targetValue = value;

    const step = (timestamp) => {
      if (!startTimestamp) startTimestamp = timestamp;
      const progress = Math.min((timestamp - startTimestamp) / duration, 1);
      
      // easeOutExpo
      const ease = progress === 1 ? 1 : 1 - Math.pow(2, -10 * progress);
      const current = initialValue + (targetValue - initialValue) * ease;
      
      setDisplayValue(current);
      
      if (progress < 1) {
        window.requestAnimationFrame(step);
      } else {
        setDisplayValue(targetValue);
      }
    };
    
    window.requestAnimationFrame(step);
  }, [value, duration]);

  return <span>{displayValue.toFixed(decimals)}</span>;
}
