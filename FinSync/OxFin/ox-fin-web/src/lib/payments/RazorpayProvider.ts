// src/lib/payments/RazorpayProvider.ts
import Razorpay from 'razorpay';
import { PaymentProvider } from '@/lib/payments/PaymentProvider';

export class RazorpayProvider implements PaymentProvider {
    private _client: any | null = null;

    private get client(): any {
        if (!this._client) {
            this._client = new Razorpay({
                key_id: process.env.OXFIN_RAZORPAY_KEY_ID || 'dummy_id',
                key_secret: process.env.OXFIN_RAZORPAY_KEY_SECRET || 'dummy_secret',
            });
        }
        return this._client;
    }

    async initiatePayment(amount: number, currency: string, metadata: Record<string, any> = {}): Promise<any> {
        const options = {
            amount: Math.round(amount * 100), // in smallest currency unit
            currency,
            receipt: metadata.receipt || `rcpt_${Date.now()}`,
            notes: metadata,
        };
        const order = await this.client.orders.create(options);
        return { orderId: order.id, amount: order.amount, currency: order.currency };
    }

    async verifyPayment(referenceId: string): Promise<any> {
        // Razorpay verification typically done via webhook; placeholder fetch
        const payment = await this.client.payments.fetch(referenceId);
        return payment;
    }

    async refundPayment(paymentId: string, amount?: number): Promise<any> {
        const params: any = {};
        if (amount) params.amount = Math.round(amount * 100);
        const refund = await this.client.payments.refund(paymentId, params);
        return refund;
    }
}

