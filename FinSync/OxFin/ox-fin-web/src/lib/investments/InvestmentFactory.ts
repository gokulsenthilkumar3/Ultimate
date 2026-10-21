// src/lib/investments/InvestmentFactory.ts
import { InvestmentProvider } from '@/lib/investments/InvestmentProvider';
import { ZerodhaKiteProvider } from '@/lib/investments/ZerodhaKiteProvider';
import { GrowwProvider } from '@/lib/investments/GrowwProvider';

export class InvestmentFactory {
    static getProvider(): InvestmentProvider {
        const provider = process.env.OXFIN_INVESTMENT_PROVIDER?.toLowerCase();
        switch (provider) {
            case 'groww':
                return new GrowwProvider();
            case 'zerodha':
            default:
                return new ZerodhaKiteProvider();
        }
    }
}
