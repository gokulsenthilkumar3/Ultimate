import React, { forwardRef } from 'react';
import { LoaderCircle, Check, AlertCircle } from 'lucide-react';

/** One accessible button contract used by new and migrated surfaces. */
const Button = forwardRef(function Button({ children, variant = 'primary', size = 'md', loading = false, loadingLabel = 'Working…', status, icon, disabled, className = '', type = 'button', ...props }, ref) {
  const StatusIcon = status === 'success' ? Check : status === 'error' ? AlertCircle : null;
  return <button {...props} ref={ref} type={type} className={`gt-button gt-button--${variant} gt-button--${size} ${className}`.trim()} disabled={disabled || loading} aria-busy={loading || undefined} data-status={status}>
    {loading ? <LoaderCircle className="gt-button__spinner" size={16} aria-hidden="true" /> : StatusIcon ? <StatusIcon size={16} aria-hidden="true" /> : icon && <span className="gt-button__icon" aria-hidden="true">{icon}</span>}
    <span>{loading ? loadingLabel : children}</span>
  </button>;
});
export default Button;
