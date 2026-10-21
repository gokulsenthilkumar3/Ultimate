import type { ChangeEvent, InputHTMLAttributes, ReactElement } from 'react';
export interface SearchFieldProps extends Omit<InputHTMLAttributes<HTMLInputElement>, 'value' | 'onChange' | 'type'> {
  label?: string; value: string; onChange: (value: string, event?: ChangeEvent<HTMLInputElement>) => void;
  onClear?: (value: string) => void; resultCount?: number;
}
export default function SearchField(props: SearchFieldProps): ReactElement;
