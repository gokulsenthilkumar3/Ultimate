import { create } from 'zustand';
import {
  getCategories, getPaymentModes,
  addCategory as dbAddCategory,
  updateCategory as dbUpdateCategory,
  deleteCategory as dbDeleteCategory,
  addPaymentMode as dbAddPaymentMode,
  deletePaymentMode as dbDeletePaymentMode,
  Category, PaymentMode,
} from '../db/queries';

interface CategoryStore {
  categories: Category[];
  paymentModes: PaymentMode[];
  loading: boolean;

  loadAll: () => Promise<void>;
  addCategory: (name: string, icon: string | null, color: string | null, parentId: number | null) => Promise<void>;
  editCategory: (id: number, name: string, icon: string | null, color: string | null) => Promise<void>;
  deleteCategory: (id: number) => Promise<void>;
  addPaymentMode: (name: string) => Promise<void>;
  deletePaymentMode: (id: number) => Promise<void>;
}

export const useCategoryStore = create<CategoryStore>((set) => ({
  categories: [],
  paymentModes: [],
  loading: false,

  loadAll: async () => {
    set({ loading: true });
    const [categories, paymentModes] = await Promise.all([
      getCategories(),
      getPaymentModes(),
    ]);
    set({ categories, paymentModes, loading: false });
  },

  addCategory: async (name, icon, color, parentId) => {
    await dbAddCategory(name, icon, color, parentId);
    const categories = await getCategories();
    set({ categories });
  },

  editCategory: async (id, name, icon, color) => {
    await dbUpdateCategory(id, name, icon, color);
    const categories = await getCategories();
    set({ categories });
  },

  deleteCategory: async (id) => {
    await dbDeleteCategory(id);
    const categories = await getCategories();
    set({ categories });
  },

  addPaymentMode: async (name) => {
    await dbAddPaymentMode(name);
    const paymentModes = await getPaymentModes();
    set({ paymentModes });
  },

  deletePaymentMode: async (id) => {
    await dbDeletePaymentMode(id);
    const paymentModes = await getPaymentModes();
    set({ paymentModes });
  },
}));
