import React, { forwardRef, useId } from 'react';

const SelectField = forwardRef(function SelectField({ label, hint, error, options = [], required = false, id: providedId, ...props }, ref) {
  const generatedId = useId();
  const id = providedId || generatedId;
  const describedBy = [hint && `${id}-hint`, error && `${id}-error`].filter(Boolean).join(' ') || undefined;
  return <div className="gt-field">
    <label htmlFor={id}>{label}{required && <span aria-hidden="true"> *</span>}</label>
    {hint && <p id={`${id}-hint`} className="gt-field__hint">{hint}</p>}
    <select ref={ref} id={id} required={required} aria-required={required || undefined} aria-invalid={Boolean(error)} aria-describedby={describedBy} {...props}>
      {options.map(option => <option key={option.value} value={option.value} disabled={option.disabled}>{option.label}</option>)}
    </select>
    {error && <p id={`${id}-error`} className="gt-field__error" role="alert">{error}</p>}
  </div>;
});
export default SelectField;
