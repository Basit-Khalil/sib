import { NextRequest } from 'next/server';
import { initRevolutClient } from '@/lib/revolut';
import crypto from 'crypto';
import { PaymentOrderResponse } from '@/types/payment';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

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
}

export async function POST(request: NextRequest) {
  try {
    const body: CreateOrderBody = await request.json();

    // Customer validation
    if (!body.customerName?.trim()) return Response.json({ error: 'Customer name is required' }, { status: 400 });
    if (!body.customerEmail?.trim()) return Response.json({ error: 'Customer email is required' }, { status: 400 });
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(body.customerEmail)) {
      return Response.json({ error: 'Invalid email format' }, { status: 400 });
    }

    // Service validation
    const serviceId = `${body.serviceCategory}-${body.serviceSubOption}`;
    const price = SERVICE_PRICES[serviceId];
    if (!price) return Response.json({ error: 'Invalid or unsupported service selected' }, { status: 400 });

    const amountInCents = Math.round(price * 100);

    const revolutClient = initRevolutClient();

    const orderResult: PaymentOrderResponse = await revolutClient.createOrder({
      amount: amountInCents,
      currency: 'USD',
      customerName: body.customerName,
      customerEmail: body.customerEmail,
      orderReference: `order_${crypto.randomUUID()}`,
      description: body.description || `Service: ${serviceId}`,
    });

    if (!orderResult.checkoutUrl) {
      console.error('[REVOLUT_CREATE_ORDER_ERROR] Missing checkout URL', orderResult);
      return Response.json({ error: 'No checkout URL received from payment provider' }, { status: 500 });
    }

    return Response.json({
      success: true,
      checkoutUrl: orderResult.checkoutUrl,
      orderId: orderResult.id,
      status: orderResult.status,
    });
  } catch (error: any) {
    console.error('[REVOLUT_CREATE_ORDER_ERROR]', error);
    return Response.json({ error: 'Failed to create payment order', message: error?.message || 'Unexpected error' }, { status: 500 });
  }
}
