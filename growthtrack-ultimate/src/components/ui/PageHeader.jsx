import React from 'react';

/**
 * PageHeader — consistent page-level header used across all dashboard modules.
 *
 * @param {string} accent  - Small caps accent label (e.g., "Finance")
 * @param {React.ReactNode} icon - Lucide icon element
 * @param {string} title   - Main heading text
 * @param {string} [subtitle] - Optional subtitle / description
 */
export default function PageHeader({ accent, icon, title, subtitle }) {
  return (
    <div className="page-header-block">
      <p className="label-caps page-header-block__accent">{accent}</p>
      <h2 className="text-display page-header-block__title">
        {icon && <span className="page-header-block__icon">{icon}</span>}
        {title}
      </h2>
      {subtitle && (
        <p className="page-header-block__subtitle">{subtitle}</p>
      )}
    </div>
  );
}
