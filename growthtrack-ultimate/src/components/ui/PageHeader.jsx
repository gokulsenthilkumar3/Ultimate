import React from 'react';

/**
 * PageHeader — consistent page-level header used across all dashboard modules.
 *
 * @param {string} accent  - Small caps accent label (e.g., "Finance")
 * @param {React.ReactNode} icon - Lucide icon element
 * @param {string} title   - Main heading text
 * @param {string} [subtitle] - Optional subtitle / description
 * @param {React.ReactNode} [actions] - Optional right-aligned action buttons
 */
export default function PageHeader({ accent, icon, title, subtitle, actions }) {
  return (
    <div className="page-header-block" style={actions ? { display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', flexWrap: 'wrap', gap: '1rem' } : {}}>
      <div>
        <p className="label-caps page-header-block__accent">{accent}</p>
        <h2 className="text-display page-header-block__title">
          {icon && <span className="page-header-block__icon">{icon}</span>}
          {title}
        </h2>
        {subtitle && (
          <p className="page-header-block__subtitle">{subtitle}</p>
        )}
      </div>
      {actions && (
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexShrink: 0 }}>
          {actions}
        </div>
      )}
    </div>
  );
}
