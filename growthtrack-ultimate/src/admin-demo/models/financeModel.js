export const money = (value, decimals = 2) => `${value < 0 ? '(' : ''}₹ ${Math.abs(value).toLocaleString('en-IN', { minimumFractionDigits: decimals, maximumFractionDigits: decimals })}${value < 0 ? ')' : ''}`;
export const TRANSACTIONS = Object.freeze([
  { id: 'salary', title: 'Monthly salary', category: 'Income', amount: 85000, direction: 'Income', date: '2026-10-28' },
  { id: 'groceries', title: 'Weekly groceries', category: 'Food & essentials', amount: 2140, direction: 'Expense', date: '2026-10-28' },
  { id: 'electricity', title: 'Electricity', category: 'Utilities', amount: 1280, direction: 'Expense', date: '2026-10-27' },
  { id: 'cafe', title: 'Cafe visit', category: 'Food & leisure', amount: 340, direction: 'Expense', date: '2026-10-26' },
  { id: 'rent', title: 'Monthly rent', category: 'Home', amount: 18000, direction: 'Expense', date: '2026-10-05' },
  { id: 'travel', title: 'Travel pass', category: 'Transport', amount: 2400, direction: 'Expense', date: '2026-10-04' },
  { id: 'insurance', title: 'Insurance', category: 'Protection', amount: 4200, direction: 'Expense', date: '2026-10-03' },
  { id: 'subscriptions', title: 'Monthly subscriptions', category: 'Subscriptions', amount: 2247, direction: 'Expense', date: '2026-10-02' },
  { id: 'personal', title: 'Personal purchases', category: 'Personal', amount: 5773, direction: 'Expense', date: '2026-10-01' },
]);
export const BUDGETS = Object.freeze([
  { id: 'home', title: 'Home & essentials', limit: 25000, spent: 18000 },
  { id: 'food', title: 'Food & groceries', limit: 10000, spent: 6400 },
  { id: 'travel', title: 'Travel & transport', limit: 5000, spent: 2400 },
  { id: 'personal', title: 'Personal & leisure', limit: 5000, spent: 1800 },
]);
export const SUBSCRIPTIONS = Object.freeze([
  { id: 'music', title: 'Music subscription', amount: 119, date: '2026-11-05', status: 'Active' },
  { id: 'cloud', title: 'Cloud storage', amount: 130, date: '2026-11-09', status: 'Active' },
  { id: 'learning', title: 'Learning platform', amount: 1998, date: '2026-11-13', status: 'Active' },
  { id: 'old-magazine', title: 'Previous magazine plan', amount: 99, date: '2026-09-01', status: 'Archived' },
]);
export const SHOPPING = Object.freeze([
  { id: 'lamp', title: 'Desk lamp', category: 'Home office', amount: 2400, status: 'Planned' },
  { id: 'shoes', title: 'Running shoes', category: 'Personal', amount: 4200, status: 'Purchased' },
  { id: 'groceries', title: 'Groceries', category: 'Essentials', amount: 1800, status: 'Planned' },
]);
export function financeTotals(rows) {
  const income = rows.filter(row => row.direction === 'Income').reduce((sum, row) => sum + row.amount, 0);
  const expenses = rows.filter(row => row.direction === 'Expense').reduce((sum, row) => sum + row.amount, 0);
  return { income, expenses, balance: income - expenses, savingsRate: income ? (income - expenses) / income * 100 : null };
}
