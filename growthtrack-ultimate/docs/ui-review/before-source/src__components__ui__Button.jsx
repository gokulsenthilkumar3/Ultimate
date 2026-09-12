import React from 'react';
import { LoaderCircle } from 'lucide-react';

/** One accessible button contract used by new and migrated surfaces. */
export default function Button({ children, variant = 'primary', size = 'md', loading = false, icon, disabled, className = '', type = 'button', ...props }) {
  return <button type={type} className={`gt-button gt-button--${variant} gt-button--${size} ${className}`.trim()} disabled={disabled || loading} aria-busy={loading || undefined} {...props}>
    {loading ? <LoaderCircle className="gt-button__spinner" size={16} aria-hidden="true" /> : icon}
    <span>{loading ? 'Working…' : children}</span>
  </button>;
}
