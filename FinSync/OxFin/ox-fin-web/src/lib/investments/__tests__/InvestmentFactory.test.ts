import { InvestmentFactory } from '../InvestmentFactory';
import { ZerodhaKiteProvider } from '../ZerodhaKiteProvider';
import { GrowwProvider } from '../GrowwProvider';

describe('InvestmentFactory', () => {
    const originalEnv = process.env;

    beforeEach(() => {
        jest.resetModules();
        process.env = { ...originalEnv };
    });

    afterAll(() => {
        process.env = originalEnv;
    });

    it('should return ZerodhaKiteProvider by default', () => {
        delete process.env.OXFIN_INVESTMENT_PROVIDER;
        const provider = InvestmentFactory.getProvider();
        expect(provider).toBeInstanceOf(ZerodhaKiteProvider);
    });

    it('should return GrowwProvider when OXFIN_INVESTMENT_PROVIDER is groww', () => {
        process.env.OXFIN_INVESTMENT_PROVIDER = 'groww';
        const provider = InvestmentFactory.getProvider();
        expect(provider).toBeInstanceOf(GrowwProvider);
    });

    it('should return ZerodhaKiteProvider when OXFIN_INVESTMENT_PROVIDER is zerodha', () => {
        process.env.OXFIN_INVESTMENT_PROVIDER = 'zerodha';
        const provider = InvestmentFactory.getProvider();
        expect(provider).toBeInstanceOf(ZerodhaKiteProvider);
    });

    it('should be case-insensitive for provider name', () => {
        process.env.OXFIN_INVESTMENT_PROVIDER = 'GROWW';
        const provider = InvestmentFactory.getProvider();
        expect(provider).toBeInstanceOf(GrowwProvider);
    });
});
