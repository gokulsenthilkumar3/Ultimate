/** Format a number as Indian currency string */
export function formatINR(amount: number): string {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    minimumFractionDigits: 2,
  }).format(amount);
}

/** Format without symbol, just number with commas */
export function formatAmount(amount: number): string {
  return new Intl.NumberFormat('en-IN', { minimumFractionDigits: 2 }).format(amount);
}
