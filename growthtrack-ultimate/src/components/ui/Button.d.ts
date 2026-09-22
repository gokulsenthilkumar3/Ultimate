import type { ButtonHTMLAttributes, ReactNode, RefAttributes } from 'react';

export type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: 'primary' | 'secondary' | 'tertiary' | 'ghost' | 'destructive' | string;
  size?: 'sm' | 'md' | 'lg' | string;
  loading?: boolean;
  loadingLabel?: string;
  status?: 'success' | 'error';
  icon?: ReactNode;
};

declare const Button: React.ForwardRefExoticComponent<ButtonProps & RefAttributes<HTMLButtonElement>>;
export default Button;
