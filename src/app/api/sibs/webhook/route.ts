import { NextRequest } from 'next/server';
import { initSibsClient } from '@/lib/sibs';
import { SibsWebhookEvent } from '@/types/payment';
import { 
  findPaymentByMerchantId, 
  findPaymentBySibsTransactionId,
  updatePaymentStatus,
  PaymentStatus 
} from '@/lib/payment-store';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * SIBS Webhook Handler
 *
 * This endpoint receives payment status notifications from SIBS.
 * SIBS will send webhook events when payment status changes.
 *
 * Expected webhook payload:
 * {
 *   transactionID: string,
 *   merchantTransactionId: string,
 *   status: string,
 *   amount: { value: number, currency: string },
 *   paymentMethod: string,
 *   timestamp: string
 * }
 */
export async function POST(request: NextRequest) {
  try {
    const rawBody = await request.text();
    const signature = request.headers.get('x-sibs-signature') || '';
    const timestamp = request.headers.get('x-sibs-timestamp') || '';

    const sibsClient = initSibsClient();

    // Verify webhook signature
    const isValid = sibsClient.verifyWebhookSignature(rawBody, signature, timestamp);
    if (!isValid) {
      console.error('[SIBS_WEBHOOK_ERROR] Invalid webhook signature');
      return Response.json({ error: 'Invalid signature' }, { status: 401 });
    }

    let webhookEvent: SibsWebhookEvent;
    try {
      webhookEvent = JSON.parse(rawBody);
    } catch (parseError) {
      console.error('[SIBS_WEBHOOK_ERROR] Failed to parse webhook payload:', parseError);
      return Response.json({ error: 'Invalid payload format' }, { status: 400 });
    }

    console.log('[SIBS_WEBHOOK] Received webhook event:', webhookEvent);

    // Extract data from webhook event
    const { transactionID, merchantTransactionId, status, amount, paymentMethod } = webhookEvent;

    // Find the payment record by merchant transaction ID or SIBS transaction ID
    let paymentRecord = merchantTransactionId 
      ? findPaymentByMerchantId(merchantTransactionId)
      : findPaymentBySibsTransactionId(transactionID);

    if (!paymentRecord) {
      console.warn(
        `[SIBS_WEBHOOK] Payment record not found for: ` +
        `merchantId=${merchantTransactionId}, sibsTx=${transactionID}`
      );
      // Still return 200 to avoid SIBS retries for unknown payments
      return Response.json({
        success: true,
        message: 'Webhook received but payment not found',
        transactionId: transactionID,
      });
    }

    // Create webhook event record
    const webhookEventRecord = {
      status,
      timestamp: timestamp || new Date().toISOString(),
      rawPayload: webhookEvent,
    };

    // Map SIBS status to internal payment status
    const statusMap: Record<string, PaymentStatus> = {
      'COMPLETED': 'COMPLETED',
      'SUCCESS': 'SUCCESS',
      'PENDING': 'PENDING',
      'FAILED': 'FAILED',
      'DECLINED': 'DECLINED',
      'IN_PROCESSING': 'IN_PROCESSING',
    };

    const internalStatus = statusMap[status] || status;

    // Update payment status in store
    const updatedRecord = updatePaymentStatus(
      paymentRecord.merchantTransactionId,
      internalStatus,
      webhookEventRecord
    );

    if (!updatedRecord) {
      throw new Error('Failed to update payment record');
    }

    // Handle different payment statuses with business logic
    switch (status) {
      case 'COMPLETED':
      case 'SUCCESS':
        console.log(
          `[SIBS_WEBHOOK] Payment completed - Transaction: ${transactionID}, ` +
          `Merchant Ref: ${merchantTransactionId}, Amount: ${amount.value} ${amount.currency}`
        );
        await handlePaymentCompleted(webhookEvent, updatedRecord);
        break;

      case 'PENDING':
        console.log(
          `[SIBS_WEBHOOK] Payment pending - Transaction: ${transactionID}, ` +
          `Merchant Ref: ${merchantTransactionId}`
        );
        // No additional action needed for pending status
        break;

      case 'FAILED':
      case 'DECLINED':
        console.log(
          `[SIBS_WEBHOOK] Payment failed - Transaction: ${transactionID}, ` +
          `Merchant Ref: ${merchantTransactionId}`
        );
        await handlePaymentFailed(webhookEvent, updatedRecord);
        break;

      case 'IN_PROCESSING':
        console.log(
          `[SIBS_WEBHOOK] Payment in processing - Transaction: ${transactionID}, ` +
          `Merchant Ref: ${merchantTransactionId}`
        );
        // No additional action needed for processing status
        break;

      default:
        console.log(
          `[SIBS_WEBHOOK] Unknown payment status: ${status} - Transaction: ${transactionID}`
        );
    }

    // Return 200 to acknowledge receipt
    return Response.json({
      success: true,
      message: 'Webhook received',
      transactionId: transactionID,
    });
  } catch (error: any) {
    console.error('[SIBS_WEBHOOK_ERROR]', error);
    return Response.json(
      { error: 'Webhook processing failed', message: error?.message || 'Unexpected error' },
      { status: 500 }
    );
  }
}

/**
 * Handle completed payment
 */
async function handlePaymentCompleted(event: SibsWebhookEvent, record: any) {
  console.log(
    `[SIBS_FULFILLMENT] Processing completed payment: ${record.merchantTransactionId}`
  );
  
  // TODO: Implement business logic here:
  // - Send confirmation email to customer
  // - Update order fulfillment status
  // - Trigger service provisioning
  // - Send Slack/notification alerts
  // - Generate invoice/receipt
  
  console.log(
    `[SIBS_FULFILLMENT] Completed payment processed: ${record.merchantTransactionId}, ` +
    `Amount: ${event.amount.value} ${event.amount.currency}`
  );
}

/**
 * Handle failed payment
 */
async function handlePaymentFailed(event: SibsWebhookEvent, record: any) {
  console.log(
    `[SIBS_NOTIFICATION] Processing failed payment: ${record.merchantTransactionId}`
  );
  
  // TODO: Implement business logic here:
  // - Send failure notification email to customer
  // - Update order status in external systems
  // - Log for analytics/reporting
  
  console.log(
    `[SIBS_NOTIFICATION] Failed payment processed: ${record.merchantTransactionId}`
  );
}

// Handle GET requests for webhook endpoint verification
export async function GET(request: NextRequest) {
  // SIBS may send a GET request to verify the webhook endpoint
  console.log('[SIBS_WEBHOOK] GET request received - endpoint is active');
  return Response.json({ status: 'active' });
}
