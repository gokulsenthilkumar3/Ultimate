import React, { useEffect } from 'react';
import { X, CheckCircle, AlertCircle, Info, AlertTriangle } from 'lucide-react';
import { useUIStore } from '../../store/uiStore';

const icons = {
  success: <CheckCircle size={18} className="text-emerald-500" />,
  error:   <AlertCircle  size={18} className="text-red-500" />,
  info:    <Info         size={18} className="text-blue-500" />,
  warning: <AlertTriangle size={18} className="text-yellow-500" />,
};

export const ToastContainer: React.FC = () => {
  const { toasts, removeToast } = useUIStore();

  return (
    <div className="fixed bottom-4 right-4 z-50 space-y-2" role="region" aria-label="Notifications" aria-live="polite">
      {toasts.map((toast) => (
        <Toast key={toast.id} toast={toast} onRemove={removeToast} />
      ))}
    </div>
  );
};

const Toast: React.FC<{ toast: any; onRemove: (id: string) => void }> = ({ toast, onRemove }) => {
  useEffect(() => {
    const timer = setTimeout(() => onRemove(toast.id), 4000);
    return () => clearTimeout(timer);
  }, [toast.id, onRemove]);

  return (
    <div className="flex items-center space-x-3 bg-white border border-gray-200 rounded-xl shadow-lg px-4 py-3 min-w-[280px] max-w-sm animate-slide-in">
      {icons[toast.type as keyof typeof icons]}
      <p className="flex-1 text-sm text-gray-700">{toast.message}</p>
      <button
        onClick={() => onRemove(toast.id)}
        aria-label="Dismiss notification"
        className="text-gray-400 hover:text-gray-600 transition-colors p-1"
      >
        <X size={16} />
      </button>
    </div>
  );
};
