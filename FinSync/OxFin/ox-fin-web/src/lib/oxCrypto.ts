// Ox Crypto Conversion Utilities
export const OX_CRYPTO_RATE = 90; // 1 ரூ = $90 USD
export const BUY_FEE_PERCENT = 1; // 1% fee on USD → ரூ
export const TRANSFER_FEE_PERCENT = 1; // 1% on international transfers
export const REPO_RATE = 6.5; // Regional repo rate for interest calculation

// Convert USD to Ox Crypto (ரூ)
export const usdToOx = (usd: number): { ox: number; fee: number; total: number } => {
    const fee = (usd * BUY_FEE_PERCENT) / 100;
    const totalUsd = usd + fee;
    const ox = usd / OX_CRYPTO_RATE;
    return { ox, fee, total: totalUsd };
};

// Convert Ox Crypto (ரூ) to USD
export const oxToUsd = (ox: number): number => {
    return ox * OX_CRYPTO_RATE;
};

// Calculate international transfer fee
export const calculateTransferFee = (amount: number): { fee: number; total: number } => {
    const fee = (amount * TRANSFER_FEE_PERCENT) / 100;
    return { fee, total: amount + fee };
};

// Calculate daily interest for Ox Wallet (Full)
export const calculateDailyInterest = (balance: number): number => {
    const annualRate = REPO_RATE / 100;
    return (balance * annualRate) / 365;
};

// Mock Gold Price API (in real app, this would fetch from an API)
export const getGoldPricePerGram = async (): Promise<number> => {
    // Simulating API call
    return new Promise((resolve) => {
        setTimeout(() => {
            // Mock price: $65 per gram (realistic as of 2026)
            resolve(65.00);
        }, 500);
    });
};

// Calculate Wallet Lite daily limit based on gold price
export const calculateWalletLiteLimit = async (): Promise<number> => {
    const goldPrice = await getGoldPricePerGram();
    return goldPrice;
};

// Format currency with proper symbols
export const formatOxCurrency = (amount: number): string => {
    return `ரூ ${amount.toFixed(4)}`;
};

export const formatUSD = (amount: number): string => {
    return `$${amount.toFixed(2)}`;
};
