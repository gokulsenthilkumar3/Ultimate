export type ToastOptions = { kind?: string; action?: { label: string; onClick: () => void }; [key: string]: unknown };
export type ToastDispatcher = {
  (message: string, type?: string, duration?: number, options?: ToastOptions): number;
  success(message: string, duration?: number, options?: ToastOptions): number;
  error(message: string, duration?: number, options?: ToastOptions): number;
  warning(message: string, duration?: number, options?: ToastOptions): number;
  info(message: string, duration?: number, options?: ToastOptions): number;
  crud(message: string, action?: string, duration?: number, options?: ToastOptions): number;
  notify(message: string, options?: ToastOptions): number;
};

export function useToast(): ToastDispatcher;
export function ToastProvider(props: { children: React.ReactNode }): React.JSX.Element;
