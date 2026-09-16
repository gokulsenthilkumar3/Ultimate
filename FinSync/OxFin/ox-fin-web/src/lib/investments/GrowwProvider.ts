// src/lib/investments/GrowwProvider.ts
import { InvestmentProvider } from '@/lib/investments/InvestmentProvider';
import axios from 'axios';

export class GrowwProvider implements InvestmentProvider {
    private apiKey = process.env.OXFIN_GROWW_API_KEY!;
    private baseUrl = 'https://api.groww.in/v1'; // hypothetical endpoint

    private async request(method: 'GET' | 'POST', endpoint: string, data?: any) {
        const url = `${this.baseUrl}${endpoint}`;
        const headers = { Authorization: `Bearer ${this.apiKey}` };
        const response = await axios({ method, url, headers, data });
        return response.data;
    }

    async placeOrder(symbol: string, quantity: number, side: 'buy' | 'sell', price?: number) {
        const order = { symbol, quantity, side, price };
        return this.request('POST', '/orders', order);
    }

    async getPortfolio() {
        return this.request('GET', '/portfolio');
    }

    async getMarketData(symbol: string) {
        return this.request('GET', `/marketdata/${symbol}`);
    }
}
