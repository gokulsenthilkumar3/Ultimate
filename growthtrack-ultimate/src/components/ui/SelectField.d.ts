import type { SelectHTMLAttributes, RefAttributes } from 'react';

export type SelectOption = { value: string | number; label: string; disabled?: boolean };
export type SelectFieldProps = SelectHTMLAttributes<HTMLSelectElement> & {
  label: string;
  hint?: string;
  error?: string;
  success?: string;
  options?: SelectOption[];
};

declare const SelectField: React.ForwardRefExoticComponent<SelectFieldProps & RefAttributes<HTMLSelectElement>>;
export default SelectField;
