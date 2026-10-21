import React, { createContext, useContext, useState, useEffect } from 'react';
import {
  Transaction,
  BudgetConfig,
  Wallet,
  InvestmentAsset,
  BillItem,
  ForexPair,
  UserProfile,
  RegionalPreferences,
} from '../types';

export const REGIONAL_OPTIONS: RegionalPreferences[] = [
  { locale: 'en-IN', currency: 'INR', symbol: '₹', timeZone: 'Asia/Kolkata' },
  { locale: 'en-US', currency: 'USD', symbol: '$', timeZone: 'America/New_York' },
  { locale: 'en-GB', currency: 'GBP', symbol: '£', timeZone: 'Europe/London' },
  { locale: 'de-DE', currency: 'EUR', symbol: '€', timeZone: 'Europe/Berlin' },
  { locale: 'ja-JP', currency: 'JPY', symbol: '¥', timeZone: 'Asia/Tokyo' },
];

const INITIAL_TRANSACTIONS: Transaction[] = [
  { id: 'tx-1', description: 'Tech Salary Direct Credit', category: 'Income', amount: 75000, type: 'income', date: 'Oct 01, 2026', created_at: '2026-10-01T09:00:00Z', icon: '💵', status: 'completed' },
  { id: 'tx-2', description: 'Grocery Superstore', category: 'Food', amount: -3200, type: 'expense', date: 'Oct 18, 2026', created_at: '2026-10-18T14:30:00Z', icon: '🛒', status: 'completed' },
  { id: 'tx-3', description: 'Amazon Electronics & Office', category: 'Shopping', amount: -4850, type: 'expense', date: 'Oct 19, 2026', created_at: '2026-10-19T11:15:00Z', icon: '📦', status: 'completed' },
  { id: 'tx-4', description: 'Electricity Board Power Bill', category: 'Utilities', amount: -1840, type: 'bill', date: 'Oct 20, 2026', created_at: '2026-10-20T10:00:00Z', icon: '⚡', status: 'completed' },
  { id: 'tx-5', description: 'Netflix 4K Ultra Subscription', category: 'Entertainment', amount: -649, type: 'bill', date: 'Oct 20, 2026', created_at: '2026-10-20T08:30:00Z', icon: '🎬', status: 'completed' },
  { id: 'tx-6', description: 'Nifty 50 Index Fund SIP', category: 'Investment', amount: -10000, type: 'investment', date: 'Oct 15, 2026', created_at: '2026-10-15T09:00:00Z', icon: '📊', status: 'completed' },
  { id: 'tx-7', description: 'Coffee House & Bakery', category: 'Food', amount: -450, type: 'expense', date: 'Today, 10:15 AM', created_at: '2026-10-21T04:45:00Z', icon: '☕', status: 'completed' },
];

const INITIAL_WALLETS: Wallet[] = [
  { id: 'w-full', name: 'Ox Wallet (Full)', type: 'full', balance: 142500, currency: 'INR', isLocked: false, apy: 6.5 },
  { id: 'w-lite', name: 'Wallet Lite', type: 'lite', balance: 8400, currency: 'INR', isLocked: false, pinFreeEnabled: true, dailyLimit: 12000 },
];

const INITIAL_INVESTMENTS: InvestmentAsset[] = [
  { id: 'inv-1', name: 'Nifty 50 Index Fund', ticker: 'NIFTY50', category: 'Mutual Funds', invested: 45000, shares: 15.2, currentPrice: 3200, dayChange: 0.85, icon: '📊', sparkline: 'M 0,25 Q 15,10 30,20 T 60,5 T 90,15 T 120,3' },
  { id: 'inv-2', name: 'Bitcoin ETF', ticker: 'BTC', category: 'Crypto', invested: 18000, shares: 0.0035, currentPrice: 5600000, dayChange: 2.41, icon: '🪙', sparkline: 'M 0,30 Q 15,40 30,15 T 60,25 T 90,8 T 120,1' },
  { id: 'inv-3', name: 'Reliance Industries', ticker: 'RELIANCE', category: 'Stocks', invested: 24000, shares: 8.5, currentPrice: 2950, dayChange: -0.45, icon: '📈', sparkline: 'M 0,5 Q 15,15 30,8 T 60,35 T 90,20 T 120,38' },
  { id: 'inv-4', name: 'Sovereign Gold Bond', ticker: 'SGB', category: 'Gold', invested: 12000, shares: 2, currentPrice: 6500, dayChange: 0.12, icon: '🌟', sparkline: 'M 0,20 Q 15,18 30,22 T 60,19 T 90,21 T 120,18' },
];

const INITIAL_BILLS: BillItem[] = [
  { id: 'b-1', name: 'Airtel Fiber Broadband', category: 'Utilities', amount: 999, dueDate: '2026-10-25', autoPay: true, icon: '🌐', status: 'Upcoming' },
  { id: 'b-2', name: 'Electricity (State Grid)', category: 'Utilities', amount: 1840, dueDate: '2026-10-28', autoPay: false, icon: '⚡', status: 'Upcoming' },
  { id: 'b-3', name: 'Netflix Premium', category: 'Entertainment', amount: 649, dueDate: '2026-11-02', autoPay: true, icon: '🎬', status: 'Auto-pay' },
  { id: 'b-4', name: 'Health Insurance Premium', category: 'Insurance', amount: 3500, dueDate: '2026-11-10', autoPay: false, icon: '🛡️', status: 'Upcoming' },
];

const INITIAL_FOREX_PAIRS: ForexPair[] = [
  { pair: 'EUR/USD', base: 'EUR', quote: 'USD', rate: 1.0842, change: 0.0028, changePercent: 0.26, signal: 'Buy', confidence: 78, rsi: 58.4, macd: 0.0014, sentiment: 'Bullish', sparkline: [1.081, 1.0825, 1.0818, 1.0832, 1.0842] },
  { pair: 'GBP/USD', base: 'GBP', quote: 'USD', rate: 1.2985, change: -0.0019, changePercent: -0.15, signal: 'Neutral', confidence: 64, rsi: 51.2, macd: -0.0003, sentiment: 'Neutral', sparkline: [1.301, 1.3005, 1.299, 1.2995, 1.2985] },
  { pair: 'USD/JPY', base: 'USD', quote: 'JPY', rate: 152.45, change: 0.65, changePercent: 0.43, signal: 'Strong Buy', confidence: 85, rsi: 67.8, macd: 0.42, sentiment: 'Bullish', sparkline: [151.2, 151.6, 152.1, 152.3, 152.45] },
  { pair: 'USD/INR', base: 'USD', quote: 'INR', rate: 84.12, change: 0.04, changePercent: 0.05, signal: 'Buy', confidence: 72, rsi: 54.1, macd: 0.08, sentiment: 'Bullish', sparkline: [84.05, 84.08, 84.1, 84.09, 84.12] },
  { pair: 'AUD/USD', base: 'AUD', quote: 'USD', rate: 0.6580, change: -0.0032, changePercent: -0.48, signal: 'Sell', confidence: 70, rsi: 42.6, macd: -0.0021, sentiment: 'Bearish', sparkline: [0.662, 0.661, 0.6595, 0.66, 0.658] },
];

interface AppContextType {
  activeTab: string;
  setActiveTab: (tab: string) => void;
  transactions: Transaction[];
  wallets: Wallet[];
  budget: BudgetConfig;
  investments: InvestmentAsset[];
  bills: BillItem[];
  forexPairs: ForexPair[];
  profile: UserProfile;
  preferences: RegionalPreferences;
  addTransaction: (tx: Omit<Transaction, 'id' | 'created_at'>) => void;
  deleteTransaction: (id: string) => void;
  updateBudget: (income: number, rule: BudgetConfig['rule']) => void;
  transferFunds: (fromWalletId: string, toTarget: string, amount: number, note: string) => boolean;
  toggleWalletLock: (walletId: string) => void;
  togglePinFree: (walletId: string) => void;
  addBill: (bill: Omit<BillItem, 'id'>) => void;
  payBill: (billId: string) => void;
  deleteBill: (billId: string) => void;
  tradeAsset: (assetId: string, action: 'buy' | 'sell', shares: number) => void;
  updatePreferences: (pref: RegionalPreferences) => void;
  updateProfile: (profile: Partial<UserProfile>) => void;
  formatMoney: (amount: number) => string;
  formatDate: (dateStr: string) => string;
  isTransferModalOpen: boolean;
  setIsTransferModalOpen: (open: boolean) => void;
  isAddTransactionOpen: boolean;
  setIsAddTransactionOpen: (open: boolean) => void;
  isAddBillOpen: boolean;
  setIsAddBillOpen: (open: boolean) => void;
}

const AppContext = createContext<AppContextType | null>(null);

export const AppProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [activeTab, setActiveTab] = useState<string>('dashboard');
  const [isTransferModalOpen, setIsTransferModalOpen] = useState(false);
  const [isAddTransactionOpen, setIsAddTransactionOpen] = useState(false);
  const [isAddBillOpen, setIsAddBillOpen] = useState(false);

  // Preferences
  const [preferences, setPreferences] = useState<RegionalPreferences>(() => {
    try {
      const saved = localStorage.getItem('finsync_preferences');
      return saved ? JSON.parse(saved) : REGIONAL_OPTIONS[0];
    } catch {
      return REGIONAL_OPTIONS[0];
    }
  });

  // Profile
  const [profile, setProfile] = useState<UserProfile>(() => {
    const ownerName = (import.meta.env.VITE_OWNER_NAME as string) || 'Gokul';
    const ownerEmail = (import.meta.env.VITE_OWNER_EMAIL as string) || 'admin@example.com';
    const initials = ownerName.slice(0, 2).toUpperCase();

    try {
      const saved = localStorage.getItem('finsync_profile');
      return saved ? JSON.parse(saved) : {
        name: ownerName,
        email: ownerEmail,
        phone: '+91 98765 43210',
        initials: initials,
        plan: 'FinSync Pro',
        twoFactorEnabled: false,
        biometricsEnabled: true,
        emailNotifs: true,
        pushNotifs: true,
      };
    } catch {
      return {
        name: ownerName,
        email: ownerEmail,
        phone: '+91 98765 43210',
        initials: initials,
        plan: 'FinSync Pro',
        twoFactorEnabled: false,
        biometricsEnabled: true,
        emailNotifs: true,
        pushNotifs: true,
      };
    }
  });

  // Wallets
  const [wallets, setWallets] = useState<Wallet[]>(() => {
    try {
      const saved = localStorage.getItem('finsync_wallets');
      return saved ? JSON.parse(saved) : INITIAL_WALLETS;
    } catch {
      return INITIAL_WALLETS;
    }
  });

  // Transactions
  const [transactions, setTransactions] = useState<Transaction[]>(() => {
    try {
      const saved = localStorage.getItem('finsync_transactions');
      return saved ? JSON.parse(saved) : INITIAL_TRANSACTIONS;
    } catch {
      return INITIAL_TRANSACTIONS;
    }
  });

  // Budget
  const [budget, setBudget] = useState<BudgetConfig>(() => {
    try {
      const saved = localStorage.getItem('finsync_budget');
      if (saved) return JSON.parse(saved);
    } catch {}
    const income = 75000;
    return {
      income,
      rule: '50/30/20',
      needs: Math.round(income * 0.5),
      wants: Math.round(income * 0.3),
      savings: Math.round(income * 0.2),
    };
  });

  // Investments
  const [investments, setInvestments] = useState<InvestmentAsset[]>(() => {
    try {
      const saved = localStorage.getItem('finsync_investments');
      return saved ? JSON.parse(saved) : INITIAL_INVESTMENTS;
    } catch {
      return INITIAL_INVESTMENTS;
    }
  });

  // Bills
  const [bills, setBills] = useState<BillItem[]>(() => {
    try {
      const saved = localStorage.getItem('finsync_bills');
      return saved ? JSON.parse(saved) : INITIAL_BILLS;
    } catch {
      return INITIAL_BILLS;
    }
  });

  // Forex
  const [forexPairs] = useState<ForexPair[]>(INITIAL_FOREX_PAIRS);

  // Sync to local storage
  useEffect(() => {
    try {
      localStorage.setItem('finsync_preferences', JSON.stringify(preferences));
      localStorage.setItem('finsync_profile', JSON.stringify(profile));
      localStorage.setItem('finsync_wallets', JSON.stringify(wallets));
      localStorage.setItem('finsync_transactions', JSON.stringify(transactions));
      localStorage.setItem('finsync_budget', JSON.stringify(budget));
      localStorage.setItem('finsync_investments', JSON.stringify(investments));
      localStorage.setItem('finsync_bills', JSON.stringify(bills));
    } catch {}
  }, [preferences, profile, wallets, transactions, budget, investments, bills]);

  const formatMoney = (amount: number): string => {
    const val = Math.abs(amount);
    return `${preferences.symbol}${val.toLocaleString(preferences.locale, {
      minimumFractionDigits: 0,
      maximumFractionDigits: 2,
    })}`;
  };

  const formatDate = (dateStr: string): string => {
    try {
      const d = new Date(dateStr);
      if (isNaN(d.getTime())) return dateStr;
      return d.toLocaleDateString(preferences.locale, {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
      });
    } catch {
      return dateStr;
    }
  };

  const addTransaction = (tx: Omit<Transaction, 'id' | 'created_at'>) => {
    const newTx: Transaction = {
      ...tx,
      id: `tx-${Date.now()}`,
      created_at: new Date().toISOString(),
    };
    setTransactions((prev) => [newTx, ...prev]);

    // Update wallet balance
    if (wallets.length > 0) {
      setWallets((prev) =>
        prev.map((w, i) => {
          if (i === 0) {
            return { ...w, balance: Math.max(0, w.balance + tx.amount) };
          }
          return w;
        })
      );
    }
  };

  const deleteTransaction = (id: string) => {
    setTransactions((prev) => prev.filter((t) => t.id !== id));
  };

  const updateBudget = (income: number, rule: BudgetConfig['rule']) => {
    const parts = rule.split('/').map(Number);
    const n = parts[0] || 50;
    const w = parts[1] || 30;
    const s = parts[2] || 20;

    setBudget({
      income,
      rule,
      needs: Math.round(income * (n / 100)),
      wants: Math.round(income * (w / 100)),
      savings: Math.round(income * (s / 100)),
    });
  };

  const transferFunds = (fromWalletId: string, toTarget: string, amount: number, note: string): boolean => {
    const sourceWallet = wallets.find((w) => w.id === fromWalletId);
    if (!sourceWallet || sourceWallet.isLocked || sourceWallet.balance < amount) {
      return false;
    }

    // Check if target is another wallet
    const targetWallet = wallets.find((w) => w.id === toTarget);

    setWallets((prev) =>
      prev.map((w) => {
        if (w.id === fromWalletId) {
          return { ...w, balance: w.balance - amount };
        }
        if (targetWallet && w.id === toTarget) {
          return { ...w, balance: w.balance + amount };
        }
        return w;
      })
    );

    // Record transaction
    const desc = targetWallet
      ? `Transfer to ${targetWallet.name}`
      : `Transfer to ${toTarget}${note ? ` (${note})` : ''}`;

    addTransaction({
      description: desc,
      category: 'Transfer',
      amount: -amount,
      type: 'transfer',
      date: 'Today',
      icon: '💸',
      status: 'completed',
    });

    return true;
  };

  const toggleWalletLock = (walletId: string) => {
    setWallets((prev) =>
      prev.map((w) => (w.id === walletId ? { ...w, isLocked: !w.isLocked } : w))
    );
  };

  const togglePinFree = (walletId: string) => {
    setWallets((prev) =>
      prev.map((w) =>
        w.id === walletId ? { ...w, pinFreeEnabled: !w.pinFreeEnabled } : w
      )
    );
  };

  const addBill = (bill: Omit<BillItem, 'id'>) => {
    const newBill: BillItem = {
      ...bill,
      id: `bill-${Date.now()}`,
    };
    setBills((prev) => [...prev, newBill]);
  };

  const payBill = (billId: string) => {
    const bill = bills.find((b) => b.id === billId);
    if (!bill) return;

    // Deduct from primary wallet
    if (wallets[0] && wallets[0].balance >= bill.amount) {
      setWallets((prev) =>
        prev.map((w, i) => (i === 0 ? { ...w, balance: w.balance - bill.amount } : w))
      );
      setBills((prev) =>
        prev.map((b) => (b.id === billId ? { ...b, status: 'Paid' } : b))
      );
      addTransaction({
        description: `Bill Paid: ${bill.name}`,
        category: bill.category,
        amount: -bill.amount,
        type: 'bill',
        date: 'Today',
        icon: bill.icon || '🧾',
        status: 'completed',
      });
    }
  };

  const deleteBill = (billId: string) => {
    setBills((prev) => prev.filter((b) => b.id !== billId));
  };

  const tradeAsset = (assetId: string, action: 'buy' | 'sell', shares: number) => {
    const asset = investments.find((i) => i.id === assetId);
    if (!asset || shares <= 0) return;

    const totalCost = shares * asset.currentPrice;

    if (action === 'buy') {
      if (wallets[0].balance < totalCost) return;
      setWallets((prev) =>
        prev.map((w, i) => (i === 0 ? { ...w, balance: w.balance - totalCost } : w))
      );
      setInvestments((prev) =>
        prev.map((item) =>
          item.id === assetId
            ? {
                ...item,
                shares: Number((item.shares + shares).toFixed(4)),
                invested: Math.round(item.invested + totalCost),
              }
            : item
        )
      );
      addTransaction({
        description: `Bought ${shares} ${asset.ticker}`,
        category: 'Investment',
        amount: -totalCost,
        type: 'investment',
        date: 'Today',
        icon: asset.icon,
        status: 'completed',
      });
    } else {
      if (asset.shares < shares) return;
      setWallets((prev) =>
        prev.map((w, i) => (i === 0 ? { ...w, balance: w.balance + totalCost } : w))
      );
      setInvestments((prev) =>
        prev.map((item) =>
          item.id === assetId
            ? {
                ...item,
                shares: Number(Math.max(0, item.shares - shares).toFixed(4)),
                invested: Math.round(Math.max(0, item.invested - totalCost)),
              }
            : item
        )
      );
      addTransaction({
        description: `Sold ${shares} ${asset.ticker}`,
        category: 'Investment',
        amount: totalCost,
        type: 'income',
        date: 'Today',
        icon: asset.icon,
        status: 'completed',
      });
    }
  };

  const updatePreferences = (pref: RegionalPreferences) => {
    setPreferences(pref);
  };

  const updateProfile = (partial: Partial<UserProfile>) => {
    setProfile((prev) => ({ ...prev, ...partial }));
  };

  return (
    <AppContext.Provider
      value={{
        activeTab,
        setActiveTab,
        transactions,
        wallets,
        budget,
        investments,
        bills,
        forexPairs,
        profile,
        preferences,
        addTransaction,
        deleteTransaction,
        updateBudget,
        transferFunds,
        toggleWalletLock,
        togglePinFree,
        addBill,
        payBill,
        deleteBill,
        tradeAsset,
        updatePreferences,
        updateProfile,
        formatMoney,
        formatDate,
        isTransferModalOpen,
        setIsTransferModalOpen,
        isAddTransactionOpen,
        setIsAddTransactionOpen,
        isAddBillOpen,
        setIsAddBillOpen,
      }}
    >
      {children}
    </AppContext.Provider>
  );
};

export const useApp = () => {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error('useApp must be used within an AppProvider');
  }
  return context;
};
