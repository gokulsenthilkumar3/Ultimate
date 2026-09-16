import { create } from 'zustand';
import {
  getExpensesWithDetails, addExpense as dbAdd,
  updateExpense as dbUpdate, deleteExpense as dbDelete,
  getExpensesByDateRange,
  getBudgets,
  ExpenseWithDetails, ExpenseInsert,
} from '../db/queries';
import { currentMonth } from '../utils/date';
import {
  sendBudgetWarningNotification,
  sendBudgetExceededNotification,
} from '../services/notifications';

interface ExpenseStore {
  expenses: ExpenseWithDetails[];
  loading: boolean;

  loadExpenses: () => Promise<void>;
  loadByRange: (start: string, end: string) => Promise<ExpenseWithDetails[]>;
  addExpense: (expense: ExpenseInsert) => Promise<number>;
  updateExpense: (id: number, fields: Partial<ExpenseInsert>) => Promise<void>;
  deleteExpense: (id: number) => Promise<void>;
}

async function checkBudgetAlerts(month: string) {
  try {
    const budgets = await getBudgets(month);
    for (const b of budgets) {
      if (b.amount <= 0) continue;
      const pct = Math.round((b.spent / b.amount) * 100);
      const label = b.category_name ?? 'Monthly';
      if (pct >= 100) {
        await sendBudgetExceededNotification(b.id, label);
      } else if (pct >= b.alert_pct) {
        await sendBudgetWarningNotification(b.id, label, pct);
      }
    }
  } catch (_) { /* non-critical */ }
}

export const useExpenseStore = create<ExpenseStore>((set) => ({
  expenses: [],
  loading: false,

  loadExpenses: async () => {
    set({ loading: true });
    const expenses = await getExpensesWithDetails();
    set({ expenses, loading: false });
  },

  loadByRange: async (start, end) => {
    return getExpensesByDateRange(start, end);
  },

  addExpense: async (expense) => {
    const id = await dbAdd(expense);
    const expenses = await getExpensesWithDetails();
    set({ expenses });
    // Check budget thresholds after adding
    const month = expense.date.substring(0, 7);
    checkBudgetAlerts(month);
    return id;
  },

  updateExpense: async (id, fields) => {
    await dbUpdate(id, fields);
    const expenses = await getExpensesWithDetails();
    set({ expenses });
    // Check budget thresholds after updating
    const month = (fields.date ?? currentMonth()).substring(0, 7);
    checkBudgetAlerts(month);
  },

  deleteExpense: async (id) => {
    await dbDelete(id);
    const expenses = await getExpensesWithDetails();
    set({ expenses });
  },
}));

