// src/lib/payments/PaymentFactory.ts
import { PaymentProvider } from '@/lib/payments/PaymentProvider';
import { StripeProvider } from '@/lib/payments/StripeProvider';
import { RazorpayProvider } from '@/lib/payments/RazorpayProvider';

export class PaymentFactory {
    static getProvider(): PaymentProvider {
        const provider = process.env.OXFIN_PAYMENT_PROVIDER?.toLowerCase();
        switch (provider) {
            case 'razorpay':
                return new RazorpayProvider();
            case 'stripe':
            default:
                return new StripeProvider();
        }
    }
}
