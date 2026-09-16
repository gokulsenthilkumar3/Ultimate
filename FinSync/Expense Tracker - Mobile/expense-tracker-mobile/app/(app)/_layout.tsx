import { useEffect } from 'react';
import { Stack } from 'expo-router';
import { initDB } from '../../src/db/index';
import { useExpenseStore } from '../../src/store/expenseStore';
import { useCategoryStore } from '../../src/store/categoryStore';
import { useRecurringStore } from '../../src/store/recurringStore';
import { useBudgetStore } from '../../src/store/budgetStore';
import { requestNotificationPermission } from '../../src/services/notifications';

export default function AppLayout() {
  const loadExpenses   = useExpenseStore((s) => s.loadExpenses);
  const loadCategories = useCategoryStore((s) => s.loadAll);
  const loadRecurring  = useRecurringStore((s) => s.loadAll);
  const loadPending    = useRecurringStore((s) => s.loadPending);
  const loadBudgets    = useBudgetStore((s) => s.loadBudgets);

  useEffect(() => {
    (async () => {
      await initDB();
      await Promise.all([
        loadExpenses(),
        loadCategories(),
        loadRecurring(),
        loadPending(),
        loadBudgets(),
      ]);
      // Request notification permission (no-op if already granted)
      requestNotificationPermission().catch(() => {});
    })();
  }, []);

  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="(tabs)" />
      <Stack.Screen
        name="expenses/add-expense"
        options={{ presentation: 'modal', headerShown: true, title: 'Add Expense' }}
      />
      <Stack.Screen
        name="expenses/add-recurring"
        options={{ presentation: 'modal', headerShown: true, title: 'Add Recurring' }}
      />
      <Stack.Screen
        name="expenses/[id]"
        options={{ presentation: 'modal', headerShown: true, title: 'Expense Detail' }}
      />
    </Stack>
  );
}
