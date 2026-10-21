// src/lib/payments/PaymentProvider.ts
export interface PaymentProvider {
    /**
     * Initiates a payment and returns a payment intent or URL.
     */
    initiatePayment(amount: number, currency: string, metadata?: Record<string, any>): Promise<any>;

    /**
     * Verifies a payment using provider‑specific data.
     */
    verifyPayment(referenceId: string): Promise<any>;

    /**
     * Refunds a payment.
     */
    refundPayment(paymentId: string, amount?: number): Promise<any>;
}
