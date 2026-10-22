import { create } from 'zustand';
import type { ToastItem, ModalState, TreeLayout } from '../types/family';

interface UIState {
  sidebarOpen: boolean;
  activeModal: keyof ModalState | null;
  toasts: ToastItem[];
  treeLayout: TreeLayout;
  
  // Actions
  toggleSidebar: () => void;
  openModal: (modal: keyof ModalState) => void;
  closeModal: () => void;
  addToast: (toast: Omit<ToastItem, 'id'>) => void;
  removeToast: (id: string) => void;
  setTreeLayout: (layout: TreeLayout) => void;
}

export const useUIStore = create<UIState>((set) => ({
  sidebarOpen: true,
  activeModal: null,
  toasts: [],
  treeLayout: 'vertical',

  toggleSidebar: () => set((state) => ({ sidebarOpen: !state.sidebarOpen })),
  
  openModal: (modal) => set({ activeModal: modal }),
  
  closeModal: () => set({ activeModal: null }),
  
  addToast: (toast) => {
    const id = Math.random().toString(36).substring(2, 9);
    set((state) => ({ toasts: [...state.toasts, { ...toast, id }] }));
    
    // Auto-remove after duration
    if (toast.duration !== 0) {
      setTimeout(() => {
        set((state) => ({ toasts: state.toasts.filter((t) => t.id !== id) }));
      }, toast.duration || 3000);
    }
  },
  
  removeToast: (id) => set((state) => ({
    toasts: state.toasts.filter((t) => t.id !== id)
  })),

  setTreeLayout: (layout) => set({ treeLayout: layout }),
}));
