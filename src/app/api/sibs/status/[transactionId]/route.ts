import { NextRequest } from 'next/server';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * GET /api/sibs/status/[transactionId]
 * Checks the payment status from SIBS
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { transactionId: string } }
) {
  try {
    const { transactionId } = params;

    const sibsApiUrl = process.env.SIBS_API_URL || 'https://spg.qly.site1.sibs.pt/api/v2';
    const clientId = process.env.SIBS_CLIENT_ID;
    const clientSecret = process.env.SIBS_CLIENT_SECRET;

    if (!clientId || !clientSecret) {
      return Response.json({ error: 'SIBS credentials not configured' }, { status: 500 });
    }

    const res = await fetch(
      `${sibsApiUrl}/payments/${transactionId}/status`,
      {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${clientSecret}`,
          'X-IBM-Client-Id': clientId,
        },
      }
    );

    const data = await res.json();
    console.log('[SIBS_STATUS_CHECK]', data);

    if (!res.ok) {
      return Response.json(
        { error: 'SIBS API error', details: data },
        { status: res.status }
      );
    }

    return Response.json(data);
  } catch (error: any) {
    console.error('[SIBS_STATUS_ERROR]', error);
    return Response.json(
      { error: 'Failed to check payment status', message: error?.message || 'Unknown error' },
      { status: 500 }
    );
  }
}
