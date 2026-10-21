/**
 * utils/finance.js — Pure utility functions for financial calculations.
 * Kept separate so they can be unit-tested independently of React.
 */

import { formatCurrency } from './userFormatters';
import { financeMinor, totalMoney } from './financeModel';

/** Format money using the signed-in user's Profile → Formatting & Culture. */
export const fmtINR = (n, user) => formatCurrency(n, user);

/** Sum all transactions of a given type */
export const sumByType = (transactions, type) =>
  totalMoney(transactions
    .filter((t) => t.type === type)
    .map((t) => t.amount));

/** Calculate balance = income - expenses - investments */
export const calcBalance = (transactions) => {
  const income      = sumByType(transactions, 'Income');
  const expenses    = sumByType(transactions, 'Expense');
  const investments = sumByType(transactions, 'Investment');
  return (financeMinor(income) - financeMinor(expenses) - financeMinor(investments)) / 100;
};

/** Build chart data array, filtering out zero-value segments */
export const buildChartData = (transactions) => [
  { name: 'Income',      value: sumByType(transactions, 'Income') },
  { name: 'Expenses',    value: sumByType(transactions, 'Expense') },
  { name: 'Investments', value: sumByType(transactions, 'Investment') },
].filter((d) => d.value > 0);
