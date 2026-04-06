import crypto from 'crypto';
import {
  SibsPaymentRequest,
  SibsPaymentResponse,
  SibsPaymentStatusResponse,
} from '@/types/payment';

type CreatePaymentInput = {
  amount: number;
  currency: string;
  customerName: string;
  customerEmail: string;
  orderReference: string;
  description: string;
  paymentMethod?: 'MBWAY' | 'REFERENCE' | 'CARD';
  paymentType?: 'AUTH' | 'PURS';
  channel?: string;
  redirectUrl?: string;
};

export function initSibsClient() {
  const baseUrl =
    process.env.SIBS_API_URL || 'https://spg.qly.site1.sibs.pt/api/v2';
  const clientId = process.env.SIBS_CLIENT_ID;
  const clientSecret = process.env.SIBS_CLIENT_SECRET; // This IS the Bearer token
  const terminalId = process.env.SIBS_TERMINAL_ID;

  if (!clientId) throw new Error('SIBS_CLIENT_ID missing');
  if (!clientSecret) throw new Error('SIBS_CLIENT_SECRET missing');
  if (!terminalId) throw new Error('SIBS_TERMINAL_ID missing');

  async function request<T>(
    path: string,
    options: RequestInit
  ): Promise<T> {
    const res = await fetch(`${baseUrl}${path}`, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${clientSecret}`,
        'X-IBM-Client-Id': clientId!,
        ...options.headers,
      },
    });

    if (!res.ok) {
      const text = await res.text();
      throw new Error(`SIBS API error (${res.status}): ${text}`);
    }

    return res.json() as Promise<T>;
  }

  return {
    // =========================
    // CREATE PAYMENT (Checkout)
    // =========================
    async createPayment(input: CreatePaymentInput): Promise<SibsPaymentResponse> {
      const terminalIdNum = parseInt(terminalId, 10);

      const paymentMethods = input.paymentMethod
        ? [input.paymentMethod]
        : ['CARD', 'MBWAY'];

      const payload: SibsPaymentRequest = {
        merchant: {
          terminalId: terminalIdNum,
          channel: input.channel || 'web',
          merchantTransactionId: input.orderReference,
        },
        transaction: {
          transactionTimestamp: new Date().toISOString(),
          description: input.description || `Order ${input.orderReference}`,
          moto: false,
          paymentType: input.paymentType || 'PURS',
          paymentMethod: paymentMethods,
          amount: {
            value: input.amount,
            currency: input.currency || 'EUR',
          },
        },
        customer: {
          customerInfo: {
            customerEmail: input.customerEmail,
          },
        },
      };

      const data = await request<SibsPaymentResponse>(
        '/payments',
        {
          method: 'POST',
          body: JSON.stringify(payload),
        }
      );

      if (!data.formContext) {
        throw new Error(
          'No formContext received from SIBS. Full response: ' +
            JSON.stringify(data)
        );
      }

      return data;
    },

    // =========================
    // CHECK PAYMENT STATUS
    // =========================
    async checkPaymentStatus(transactionId: string): Promise<SibsPaymentStatusResponse> {
      const data = await request<SibsPaymentStatusResponse>(
        `/payments/${transactionId}/status`,
        {
          method: 'GET',
        }
      );

      return data;
    },

    // =========================
    // VERIFY WEBHOOK SIGNATURE
    // =========================
    verifyWebhookSignature(
      payload: string,
      signature: string,
      timestamp?: string
    ): boolean {
      const webhookSecret = process.env.SIBS_WEBHOOK_SECRET;

      if (!webhookSecret) {
        console.warn(
          '[SIBS_WEBHOOK_VERIFICATION] SIBS_WEBHOOK_SECRET not set — skipping signature verification'
        );
        return true;
      }

      if (!signature) {
        console.error(
          '[SIBS_WEBHOOK_VERIFICATION] No signature provided in webhook'
        );
        return false;
      }

      const signedPayload = timestamp
        ? `${timestamp}.${payload}`
        : payload;

      const expectedSignature = crypto
        .createHmac('sha256', webhookSecret)
        .update(signedPayload)
        .digest('hex');

      const isValid = crypto.timingSafeEqual(
        Buffer.from(expectedSignature),
        Buffer.from(signature)
      );

      if (!isValid) {
        console.error(
          '[SIBS_WEBHOOK_VERIFICATION] Signature verification failed. ' +
          `Expected: ${expectedSignature}, Received: ${signature}`
        );
      } else {
        console.log(
          '[SIBS_WEBHOOK_VERIFICATION] Signature verified successfully'
        );
      }

      return isValid;
    },
  };
}
