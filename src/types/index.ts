export interface RegionalPreferences {
  locale: string;
  currency: string;
  symbol: string;
  timeZone: string;
}

export interface Transaction {
  id: string;
  description: string;
  category: string;
  amount: number; // positive = credit/income, negative = debit/expense
  type: 'income' | 'expense' | 'transfer' | 'bill' | 'investment';
  date: string;
  created_at: string;
  icon?: string;
  status: 'completed' | 'pending';
  currency?: string;
}

export interface BudgetConfig {
  income: number;
  rule: '50/30/20' | '70/20/10' | '40/40/20' | '60/20/20';
  needs: number;
  wants: number;
  savings: number;
}

export interface Wallet {
  id: string;
  name: string;
  type: 'full' | 'lite';
  balance: number;
  currency: string;
  isLocked: boolean;
  pinFreeEnabled?: boolean;
  dailyLimit?: number;
  apy?: number;
}

export interface InvestmentAsset {
  id: string;
  name: string;
  ticker: string;
  category: 'Stocks' | 'Crypto' | 'Mutual Funds' | 'Gold';
  invested: number;
  shares: number;
  currentPrice: number;
  dayChange: number;
  icon: string;
  sparkline: string;
}

export interface BillItem {
  id: string;
  name: string;
  category: string;
  amount: number;
  dueDate: string;
  autoPay: boolean;
  icon: string;
  status: 'Upcoming' | 'Auto-pay' | 'Paid';
}

export interface ForexPair {
  pair: string;
  base: string;
  quote: string;
  rate: number;
  change: number;
  changePercent: number;
  signal: 'Strong Buy' | 'Buy' | 'Neutral' | 'Sell' | 'Strong Sell';
  confidence: number;
  rsi: number;
  macd: number;
  sentiment: 'Bullish' | 'Neutral' | 'Bearish';
  sparkline: number[];
}

export interface UserProfile {
  name: string;
  email: string;
  phone: string;
  initials: string;
  plan: string;
  twoFactorEnabled: boolean;
  biometricsEnabled: boolean;
  emailNotifs: boolean;
  pushNotifs: boolean;
}
