import { PaymentFactory } from '../PaymentFactory';
import { StripeProvider } from '../StripeProvider';
import { RazorpayProvider } from '../RazorpayProvider';

describe('PaymentFactory', () => {
    const originalEnv = process.env;

    beforeEach(() => {
        jest.resetModules();
        process.env = { ...originalEnv };
    });

    afterAll(() => {
        process.env = originalEnv;
    });

    it('should return StripeProvider by default', () => {
        delete process.env.OXFIN_PAYMENT_PROVIDER;
        const provider = PaymentFactory.getProvider();
        expect(provider).toBeInstanceOf(StripeProvider);
    });

    it('should return RazorpayProvider when OXFIN_PAYMENT_PROVIDER is razorpay', () => {
        process.env.OXFIN_PAYMENT_PROVIDER = 'razorpay';
        const provider = PaymentFactory.getProvider();
        expect(provider).toBeInstanceOf(RazorpayProvider);
    });

    it('should return StripeProvider when OXFIN_PAYMENT_PROVIDER is stripe', () => {
        process.env.OXFIN_PAYMENT_PROVIDER = 'stripe';
        const provider = PaymentFactory.getProvider();
        expect(provider).toBeInstanceOf(StripeProvider);
    });

    it('should be case-insensitive for provider name', () => {
        process.env.OXFIN_PAYMENT_PROVIDER = 'RAZORPAY';
        const provider = PaymentFactory.getProvider();
        expect(provider).toBeInstanceOf(RazorpayProvider);
    });
});
