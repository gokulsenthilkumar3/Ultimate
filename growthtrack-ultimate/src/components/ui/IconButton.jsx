import React, { forwardRef } from 'react';
import Button from './Button';

/** Icon-only actions always require an accessible label. */
const IconButton = forwardRef(function IconButton({ label, children, className = '', ...props }, ref) {
  return <Button ref={ref} className={`gt-button--icon ${className}`.trim()} aria-label={label} title={label} {...props}>{children}</Button>;
});
export default IconButton;
