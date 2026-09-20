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
export default function PageHeader({ accent, icon, title, subtitle, actions, status, headingLevel = 1 }) {
  const Heading = headingLevel === 2 ? 'h2' : 'h1';
  return (
    <div className="page-header-block" data-has-actions={Boolean(actions)}>
      <div>
        <p className="label-caps page-header-block__accent">{accent}</p>
        <Heading className="text-display page-header-block__title">
          {icon && <span className="page-header-block__icon">{icon}</span>}
          {title}
        </Heading>
        {subtitle && (
          <p className="page-header-block__subtitle">{subtitle}</p>
        )}
      </div>
      {actions && (
        <div className="page-header-block__actions">
          {actions}
        </div>
      )}
      {status && <div className="page-header-block__status">{status}</div>}
    </div>
  );
}
