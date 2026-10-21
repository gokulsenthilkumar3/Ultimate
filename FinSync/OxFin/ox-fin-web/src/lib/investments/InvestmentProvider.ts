// src/lib/investments/InvestmentProvider.ts
export interface InvestmentProvider {
    /**
     * Places an order (buy/sell) for a given asset.
     */
    placeOrder(symbol: string, quantity: number, side: 'buy' | 'sell', price?: number): Promise<any>;

    /**
     * Retrieves the user's portfolio.
     */
    getPortfolio(): Promise<any>;

    /**
     * Fetches market data for a symbol.
     */
    getMarketData(symbol: string): Promise<any>;
}
