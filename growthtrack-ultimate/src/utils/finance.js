/**
 * utils/finance.js — Pure utility functions for financial calculations.
 * Kept separate so they can be unit-tested independently of React.
 */

/** Format a number as Indian Rupee string */
export const fmtINR = (n) => '₹' + Number(n).toLocaleString('en-IN');

/** Sum all transactions of a given type */
export const sumByType = (transactions, type) =>
  transactions
    .filter((t) => t.type === type)
    .reduce((s, t) => s + t.amount, 0);

/** Calculate balance = income - expenses - investments */
export const calcBalance = (transactions) => {
  const income      = sumByType(transactions, 'Income');
  const expenses    = sumByType(transactions, 'Expense');
  const investments = sumByType(transactions, 'Investment');
  return income - expenses - investments;
};

/** Build chart data array, filtering out zero-value segments */
export const buildChartData = (transactions) => [
  { name: 'Income',      value: sumByType(transactions, 'Income') },
  { name: 'Expenses',    value: sumByType(transactions, 'Expense') },
  { name: 'Investments', value: sumByType(transactions, 'Investment') },
].filter((d) => d.value > 0);
