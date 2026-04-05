import { NextRequest } from 'next/server';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

interface MbwayRequestBody {
  transactionId: string;
  transactionSignature: string;
  customerPhone: string;
}

/**
 * POST /api/sibs/mbway
 * Processes an MBWAY payment by sending the phone number to SIBS
 */
export async function POST(request: NextRequest) {
  try {
    const body: MbwayRequestBody = await request.json();
    const { transactionId, transactionSignature, customerPhone } = body;

    if (!transactionId) {
      return Response.json({ error: 'transactionId is required' }, { status: 400 });
    }
    if (!transactionSignature) {
      return Response.json({ error: 'transactionSignature is required' }, { status: 400 });
    }
    if (!customerPhone) {
      return Response.json({ error: 'customerPhone is required' }, { status: 400 });
    }

    if (!customerPhone.match(/^351#\d{9}$/)) {
      return Response.json(
        { error: 'Phone must be in format: 351#912345678' },
        { status: 400 }
      );
    }

    const sibsApiUrl = process.env.SIBS_API_URL || 'https://spg.qly.site1.sibs.pt/api/v2';
    const clientId = process.env.SIBS_CLIENT_ID;

    if (!clientId) {
      return Response.json({ error: 'SIBS_CLIENT_ID not configured' }, { status: 500 });
    }

    const res = await fetch(
      `${sibsApiUrl}/payments/${transactionId}/mbway-id/purchase`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Digest ${transactionSignature}`,
          'X-IBM-Client-Id': clientId,
        },
        body: JSON.stringify({ customerPhone }),
      }
    );

    const data = await res.json();
    console.log('[SIBS_MBWAY_RESPONSE]', JSON.stringify(data, null, 2));

    if (!res.ok) {
      return Response.json(
        {
          error: 'SIBS API error',
          details: data,
        },
        { status: res.status }
      );
    }

    return Response.json(data);
  } catch (error: any) {
    console.error('[SIBS_MBWAY_ERROR]', error);
    return Response.json(
      { error: 'Failed to process MBWAY payment', message: error?.message || 'Unknown error' },
      { status: 500 }
    );
  }
}
