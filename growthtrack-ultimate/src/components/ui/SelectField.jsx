import React, { forwardRef, useId } from 'react';

const SelectField = forwardRef(function SelectField({ label, hint, error, success, options = [], required = false, id: providedId, 'aria-describedby': externalDescription, ...props }, ref) {
  const generatedId = useId();
  const id = providedId || generatedId;
  const successId = success && !error ? `${id}-success` : undefined;
  const describedBy = [externalDescription, hint && `${id}-hint`, error && `${id}-error`, successId].filter(Boolean).join(' ') || undefined;
  return <div className="gt-field">
    <label htmlFor={id}>{label}{required && <span aria-hidden="true"> *</span>}</label>
    {hint && <p id={`${id}-hint`} className="gt-field__hint">{hint}</p>}
    <select {...props} ref={ref} id={id} required={required} aria-required={required || undefined} aria-invalid={Boolean(error) || props['aria-invalid']} aria-describedby={describedBy}>
      {options.map(option => <option key={option.value} value={option.value} disabled={option.disabled}>{option.label}</option>)}
    </select>
    {error && <p id={`${id}-error`} className="gt-field__error" role="alert">{error}</p>}
    {successId && <p id={successId} className="gt-field__success" role="status">{success}</p>}
  </div>;
});
export default SelectField;
