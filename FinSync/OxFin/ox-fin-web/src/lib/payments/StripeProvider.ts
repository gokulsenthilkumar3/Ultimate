// src/lib/payments/StripeProvider.ts
import Stripe from 'stripe';
import { PaymentProvider } from '@/lib/payments/PaymentProvider';

export class StripeProvider implements PaymentProvider {
    private _client: Stripe | null = null;

    private get client(): Stripe {
        if (!this._client) {
            this._client = new Stripe(process.env.OXFIN_STRIPE_SECRET_KEY || 'dummy_key', {
                apiVersion: '2025-12-15.clover' as any,
            });
        }
        return this._client;
    }

    async initiatePayment(amount: number, currency: string, metadata: Record<string, any> = {}): Promise<any> {
        const paymentIntent = await this.client.paymentIntents.create({
            amount: Math.round(amount * 100), // amount in smallest currency unit
            currency,
            metadata,
        });
        return { clientSecret: paymentIntent.client_secret, id: paymentIntent.id };
    }

    async verifyPayment(referenceId: string): Promise<any> {
        const paymentIntent = await this.client.paymentIntents.retrieve(referenceId);
        return paymentIntent;
    }

    async refundPayment(paymentId: string, amount?: number): Promise<any> {
        const params: Stripe.RefundCreateParams = { payment_intent: paymentId };
        if (amount) params.amount = Math.round(amount * 100);
        const refund = await this.client.refunds.create(params);
        return refund;
    }
}

