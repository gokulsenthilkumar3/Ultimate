// OxFin Type Definitions

export interface WalletBalance {
    type: 'full' | 'lite';
    balance: number;
    currency: 'INR' | 'OX';
    interestRate?: number;
    dailyLimit?: number;
}

export interface Transaction {
    id: string;
    type: 'credit' | 'debit';
    amount: number;
    currency: string;
    description: string;
    category: string;
    timestamp: Date;
    status: 'pending' | 'completed' | 'failed';
}

export interface Investment {
    id: string;
    name: string;
    type: 'stocks' | 'mf' | 'fd' | 'etf' | 'bonds';
    currentValue: number;
    investedAmount: number;
    returnPercent: number;
    units?: number;
}

export interface Bill {
    id: string;
    billerName: string;
    amount: number;
    dueDate: Date;
    category: 'electricity' | 'water' | 'telecom' | 'tax' | 'other';
    status: 'pending' | 'paid' | 'overdue';
    autoPayEnabled: boolean;
}

export interface OxCryptoData {
    currentRate: number; // 1 Ox = X CHF
    buyRate: number; // 101 CHF for 100 Ox
    balance: number;
    totalInvested: number;
}

export interface UserProfile {
    id: string;
    name: string;
    email: string;
    phone: string;
    kycStatus: 'pending' | 'verified' | 'rejected';
    accountType: 'individual' | 'business' | 'family';
}
