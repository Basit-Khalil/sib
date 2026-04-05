import { NextRequest } from 'next/server';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

interface CardRequestBody {
  transactionId: string;
  transactionSignature: string;
  cardInfo: {
    PAN: string;
    secureCode: string;
    validationDate: string;
    cardholderName: string;
    createToken: boolean;
  };
}

/**
 * POST /api/sibs/card
 * Processes a CARD payment via SIBS Server-to-Server
 */
export async function POST(request: NextRequest) {
  try {
    const body: CardRequestBody = await request.json();
    const { transactionId, transactionSignature, cardInfo } = body;

    if (!transactionId) {
      return Response.json({ error: 'transactionId is required' }, { status: 400 });
    }
    if (!transactionSignature) {
      return Response.json({ error: 'transactionSignature is required' }, { status: 400 });
    }
    if (!cardInfo?.PAN) {
      return Response.json({ error: 'cardInfo.PAN is required' }, { status: 400 });
    }
    if (!cardInfo?.secureCode) {
      return Response.json({ error: 'cardInfo.secureCode is required' }, { status: 400 });
    }
    if (!cardInfo?.validationDate) {
      return Response.json({ error: 'cardInfo.validationDate is required' }, { status: 400 });
    }
    if (!cardInfo?.cardholderName) {
      return Response.json({ error: 'cardInfo.cardholderName is required' }, { status: 400 });
    }

    const sibsApiUrl = process.env.SIBS_API_URL || 'https://spg.qly.site1.sibs.pt/api/v2';
    const clientId = process.env.SIBS_CLIENT_ID;

    if (!clientId) {
      return Response.json({ error: 'SIBS_CLIENT_ID not configured' }, { status: 500 });
    }

    const res = await fetch(
      `${sibsApiUrl}/payments/${transactionId}/card/purchase`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Digest ${transactionSignature}`,
          'X-IBM-Client-Id': clientId,
        },
        body: JSON.stringify({ cardInfo }),
      }
    );

    const data = await res.json();
    console.log('[SIBS_CARD_RESPONSE]', JSON.stringify(data, null, 2));

    if (!res.ok) {
      return Response.json(
        { error: 'SIBS API error', details: data },
        { status: res.status }
      );
    }

    return Response.json(data);
  } catch (error: any) {
    console.error('[SIBS_CARD_ERROR]', error);
    return Response.json(
      { error: 'Failed to process card payment', message: error?.message || 'Unknown error' },
      { status: 500 }
    );
  }
}
