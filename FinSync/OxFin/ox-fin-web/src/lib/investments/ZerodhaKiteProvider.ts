// src/lib/investments/ZerodhaKiteProvider.ts
import { InvestmentProvider } from '@/lib/investments/InvestmentProvider';
import axios from 'axios';

export class ZerodhaKiteProvider implements InvestmentProvider {
    private apiKey = process.env.OXFIN_KITE_API_KEY!;
    private accessToken = process.env.OXFIN_KITE_ACCESS_TOKEN!;
    private baseUrl = 'https://api.kite.trade';

    private async request(method: 'GET' | 'POST', endpoint: string, data?: any) {
        const url = `${this.baseUrl}${endpoint}`;
        const headers = { Authorization: `token ${this.apiKey}:${this.accessToken}` };
        const response = await axios({ method, url, headers, data });
        return response.data;
    }

    async placeOrder(symbol: string, quantity: number, side: 'buy' | 'sell', price?: number) {
        const order = {
            tradingsymbol: symbol,
            quantity,
            transaction_type: side,
            order_type: price ? 'LIMIT' : 'MARKET',
            price,
        };
        return this.request('POST', '/orders', order);
    }

    async getPortfolio() {
        return this.request('GET', '/portfolio');
    }

    async getMarketData(symbol: string) {
        return this.request('GET', `/quote/${symbol}`);
    }
}
