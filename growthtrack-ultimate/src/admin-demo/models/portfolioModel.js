import { STOCKS } from '../fixtures';
const amount = value => Number(String(value).replace(/[^\d.]/g, ''));
export const SAMPLE_HOLDINGS = Object.freeze(STOCKS.map(([symbol, name, price, change, value, sector]) => {
  const unitPrice = amount(price), quantity = Math.round(amount(value) / unitPrice);
  return { id: symbol, name, symbol, price: unitPrice, change, quantity, value: Math.round(quantity * unitPrice * 100) / 100, sector };
}));
export const SAMPLE_PORTFOLIO_VALUE = Math.round(SAMPLE_HOLDINGS.reduce((sum, row) => sum + row.value, 0) * 100) / 100;
export const SAMPLE_PORTFOLIO_COST = 308000;
