export type SwitchProps = {
  label?: string;
  description?: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
  disabled?: boolean;
};

export default function Switch(props: SwitchProps): React.JSX.Element;
