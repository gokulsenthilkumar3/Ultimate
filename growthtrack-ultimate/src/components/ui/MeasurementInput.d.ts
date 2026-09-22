import type { InputHTMLAttributes } from 'react';

export type MeasurementInputProps = Omit<InputHTMLAttributes<HTMLInputElement>, 'value' | 'onChange'> & {
  metricKey: string;
  value: string | number | null | undefined;
  onCommit: (value: string) => void;
};

export default function MeasurementInput(props: MeasurementInputProps): React.JSX.Element;
