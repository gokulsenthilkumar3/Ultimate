import React, { useState } from 'react';
import './EditableMetric.css';

/**
 * EditableMetric - Reusable editable input component
 * Makes all metrics throughout the app editable and persistent
 */
const EditableMetric = ({
  label,
  value,
  onChange,
  unit = '',
  type = 'number',
  min,
  max,
  step = '0.1',
  placeholder = 'Enter value',
  className = '',
}) => {
  const [isEditing, setIsEditing] = useState(false);
  const [tempValue, setTempValue] = useState(value);

  const handleClick = () => {
    setIsEditing(true);
    setTempValue(value);
  };

  const handleBlur = () => {
    setIsEditing(false);
    if (tempValue !== value) {
      onChange(tempValue);
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter') {
      handleBlur();
    } else if (e.key === 'Escape') {
      setTempValue(value);
      setIsEditing(false);
    }
  };

  return (
    <div className={`editable-metric ${className}`}>
      {label && <label className="metric-label">{label}</label>}
      <div className="metric-input-container">
        {isEditing ? (
          <input
            type={type}
            value={tempValue}
            onChange={(e) => setTempValue(e.target.value)}
            onBlur={handleBlur}
            onKeyDown={handleKeyDown}
            placeholder={placeholder}
            min={min}
            max={max}
            step={step}
            className="metric-input editing"
            autoFocus
          />
        ) : (
          <div className="metric-display" onClick={handleClick}>
            <span className="metric-value">
              {value || placeholder}
            </span>
            {unit && <span className="metric-unit">{unit}</span>}
            <span className="edit-icon">✏️</span>
          </div>
        )}
      </div>
    </div>
  );
};

export default EditableMetric;
