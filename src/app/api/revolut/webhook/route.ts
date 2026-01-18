/* import { NextRequest, NextResponse } from 'next/server';
import { initRevolutClient } from '@/lib/revolut';
import { RevolutWebhookEvent } from '@/types/payment';
import { validateRevolutConfig } from '@/config/revolut';

// POST /api/revolut/webhook
export async function POST(request: NextRequest) {
  try {
    // Validate configuration
    validateRevolutConfig();

    // Get the raw payload and headers
    const payload = await request.text();
    const signature = request.headers.get('X-Revolut-Signature') || '';
    const timestamp = request.headers.get('X-Revolut-Timestamp') || '';

    // Verify webhook signature for security
    const revolutClient = initRevolutClient();
    const isValidSignature = await revolutClient.verifyWebhookSignature(payload, signature, timestamp);

    if (!isValidSignature) {
      console.error('Invalid webhook signature');
      return NextResponse.json(
        { error: 'Invalid signature' },
        { status: 401 }
      );
    }

    // Parse the webhook event
    let event: RevolutWebhookEvent;
    try {
      event = JSON.parse(payload) as RevolutWebhookEvent;
    } catch (parseError) {
      console.error('Failed to parse webhook payload:', parseError);
      return NextResponse.json(
        { error: 'Invalid payload format' },
        { status: 400 }
      );
    }

    // Log the received webhook event
    console.log(`Received webhook event: ${event.type} for order ${event.data.id}`);

    // Process different event types
    switch (event.type) {
      case 'order.completed':
        await handleOrderCompleted(event);
        break;
      case 'order.failed':
        await handleOrderFailed(event);
        break;
      case 'order.cancelled':
        await handleOrderCancelled(event);
        break;
      case 'order.refund.completed':
        await handleRefundCompleted(event);
        break;
      default:
        console.log(`Unhandled event type: ${event.type}`);
        // Still return 200 for unhandled events to avoid retries
        break;
    }

    // Return 200 to acknowledge receipt
    return NextResponse.json({ received: true, eventId: event.id });
  } catch (error: any) {
    console.error('Error processing webhook:', error);

    return NextResponse.json(
      {
        error: 'Failed to process webhook',
        message: error.message || 'Unknown error occurred'
      },
      { status: 500 }
    );
  }
}

// Handler for completed orders
async function handleOrderCompleted(event: RevolutWebhookEvent) {
  console.log(`Processing completed order: ${event.data.id}`);

  // In a real implementation, you would:
  // 1. Update your database to mark the payment as completed
  // 2. Trigger any post-payment actions (e.g., fulfill order, send confirmation email)
  // 3. Log the successful transaction

  try {
    // Example: Update payment status in your database
    // await updatePaymentStatus(event.data.id, 'COMPLETED');

    // Example: Send confirmation email
    // await sendPaymentConfirmation(event.data.metadata?.customer_email, event.data.id);

    console.log(`Successfully processed completed order: ${event.data.id}`);
  } catch (error) {
    console.error(`Error processing completed order ${event.data.id}:`, error);
    // In a real implementation, you might want to queue this for retry
    throw error;
  }
}

// Handler for failed orders
async function handleOrderFailed(event: RevolutWebhookEvent) {
  console.log(`Processing failed order: ${event.data.id}`);

  // In a real implementation, you would:
  // 1. Update your database to mark the payment as failed
  // 2. Possibly notify the customer about the failure
  // 3. Log the failed transaction

  try {
    // Example: Update payment status in your database
    // await updatePaymentStatus(event.data.id, 'FAILED');

    // Example: Send failure notification
    // await sendPaymentFailureNotification(event.data.metadata?.customer_email, event.data.id);

    console.log(`Successfully processed failed order: ${event.data.id}`);
  } catch (error) {
    console.error(`Error processing failed order ${event.data.id}:`, error);
    // In a real implementation, you might want to queue this for retry
    throw error;
  }
}

// Handler for cancelled orders
async function handleOrderCancelled(event: RevolutWebhookEvent) {
  console.log(`Processing cancelled order: ${event.data.id}`);

  try {
    // Example: Update payment status in your database
    // await updatePaymentStatus(event.data.id, 'CANCELLED');

    console.log(`Successfully processed cancelled order: ${event.data.id}`);
  } catch (error) {
    console.error(`Error processing cancelled order ${event.data.id}:`, error);
    throw error;
  }
}

// Handler for completed refunds
async function handleRefundCompleted(event: RevolutWebhookEvent) {
  console.log(`Processing completed refund: ${event.data.id}`);

  try {
    // Example: Update payment status to reflect refund
    // await updatePaymentRefundStatus(event.data.id, 'REFUNDED');

    console.log(`Successfully processed completed refund: ${event.data.id}`);
  } catch (error) {
    console.error(`Error processing completed refund ${event.data.id}:`, error);
    throw error;
  }
}

// Export a GET method for webhook verification (if needed by Revolut)
export async function GET() {
  // Some webhook systems require a GET endpoint for verification
  // This is typically done during webhook endpoint setup
  return NextResponse.json({ message: 'Webhook endpoint is active' });
}*/

import { NextRequest, NextResponse } from 'next/server';

export async function POST(req: NextRequest) {
  // Your webhook logic
  return NextResponse.json({ status: 'ok' });
}

// Optional if GET is needed
export async function GET(req: NextRequest) {
  return NextResponse.json({ message: 'Webhook endpoint' });
}
