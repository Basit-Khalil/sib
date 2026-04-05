import { NextRequest } from 'next/server';
import { initSibsClient } from '@/lib/sibs';
import { SibsPaymentResponse } from '@/types/payment';
import { createPayment } from '@/lib/payment-store';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

// Service prices mapping (same as Revolut for consistency)
const SERVICE_PRICES: Record<string, number> = {
  'web-development-api-integration': 399,
  'web-development-mob-app-development': 2000,
  'web-development-custom-cms': 2499,
  'web-development-frontend': 999,
  'web-development-backend': 1499,
  'graphic-design-branding': 250,
  'graphic-design-logo-design': 100,
  'graphic-design-package-design': 399,
  'cyber-security-network-security': 499,
  'cyber-security-cloud-security': 999,
  'cyber-security-application-security': 199,
  'cloud-computing-cloud-backup': 199,
  'cloud-computing-cloud-storage': 299,
  'cloud-computing-cloud-hosting': 499,
  'digital-marketing-seo-services': 399,
  'digital-marketing-social-media': 299,
  'digital-marketing-content-marketing': 499,
};

interface CreateOrderBody {
  customerName: string;
  customerEmail: string;
  serviceCategory: string;
  serviceSubOption: string;
  description?: string;
  paymentMethod?: 'MBWAY' | 'REFERENCE' | 'CARD';
}

export async function POST(request: NextRequest) {
  try {
    const body: CreateOrderBody = await request.json();

    // Customer validation
    if (!body.customerName?.trim()) {
      return Response.json(
        { error: 'Customer name is required' },
        { status: 400 }
      );
    }
    if (!body.customerEmail?.trim()) {
      return Response.json(
        { error: 'Customer email is required' },
        { status: 400 }
      );
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(body.customerEmail)) {
      return Response.json({ error: 'Invalid email format' }, { status: 400 });
    }

    // Service validation
    const serviceId = `${body.serviceCategory}-${body.serviceSubOption}`;
    const price = SERVICE_PRICES[serviceId];
    if (!price) {
      return Response.json(
        { error: 'Invalid or unsupported service selected' },
        { status: 400 }
      );
    }

    // Generate unique order reference (max 35 chars for SIBS)
    const orderReference = `ORD-${Date.now().toString(36)}-${Math.random().toString(36).substring(2, 8)}`;
    const description = body.description || `Service: ${serviceId}`;
    // Don't restrict payment methods — let SIBS return all available methods

    // Create initial payment record
    const paymentRecord = createPayment({
      merchantTransactionId: orderReference,
      sibsTransactionId: null,
      amount: price,
      currency: 'EUR',
      status: 'INITIATED',
      customerName: body.customerName,
      customerEmail: body.customerEmail,
      paymentMethod: 'CARD', // Default method (will be updated after SIBS response)
      description,
    });

    // Initialize SIBS client
    const sibsClient = initSibsClient();

    // Create payment with SIBS (no paymentMethod restriction → SIBS returns all available)
    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000';
    const paymentResult: SibsPaymentResponse = await sibsClient.createPayment({
      amount: price,
      currency: 'EUR',
      customerName: body.customerName,
      customerEmail: body.customerEmail,
      orderReference,
      description,
      paymentType: 'PURS',
      channel: 'web',
      redirectUrl: `${baseUrl}/sibs-payment?transactionId=PENDING`,
    });

    if (!paymentResult.formContext) {
      console.error('[SIBS_CREATE_ORDER_ERROR] Missing formContext', paymentResult);
      return Response.json(
        { error: 'No formContext received from payment provider' },
        { status: 500 }
      );
    }

    // Link SIBS transaction ID to our payment record
    const { linkSibsTransaction } = await import('@/lib/payment-store');
    linkSibsTransaction(
      orderReference,
      paymentResult.transactionID,
      paymentResult.formContext
    );

    return Response.json({
      success: true,
      formContext: paymentResult.formContext,
      transactionId: paymentResult.transactionID,
      status: paymentResult.returnStatus.statusCode,
      amount: paymentResult.amount,
      paymentMethods: paymentResult.paymentMethodList,
    });
  } catch (error: any) {
    console.error('[SIBS_CREATE_ORDER_ERROR]', error);
    return Response.json(
      {
        error: 'Failed to create payment order',
        message: error?.message || 'Unexpected error',
      },
      { status: 500 }
    );
  }
}
