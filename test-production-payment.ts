/**
 * Test script for production Revolut payment flow
 *
 * To use this script with production credentials:
 *
 * 1. Update your .env file with production credentials:
 *    ```
 *    # Revolut Business API Configuration
 *    REVOLUT_ACCESS_TOKEN=your_production_access_token_here
 *    REVOLUT_WEBHOOK_SECRET=your_production_webhook_secret_here
 *    REVOLUT_API_BASE_URL=https://b2b.revolut.com/api/1.0
 *    REVOLUT_ENV=production
 *    ```
 *
 * 2. Run the test:
 *    ```bash
 *    npx tsx test-production-payment.ts
 *    ```
 *
 * ⚠️  WARNING: This will create REAL charges on your customers' cards when using production credentials.
 *    Only test with real payment methods when you're ready for live transactions.
 */


import { initRevolutClient } from './src/lib/revolut';

const apiKey = process.env.REVOLUT_API_KEY;


async function testProductionPayment() {
  console.log('Testing production Revolut payment flow...\n');

  // Validate environment
  if (!process.env.REVOLUT_ACCESS_TOKEN) {
    console.error('❌ ERROR: REVOLUT_ACCESS_TOKEN environment variable is not set');
    console.log('Please update your .env file with production credentials');
    return;
  }

  if (!process.env.REVOLUT_WEBHOOK_SECRET) {
    console.warn('⚠️  WARNING: REVOLUT_WEBHOOK_SECRET is not set. Webhook verification will not work properly.');
  }

  if (process.env.REVOLUT_ENV !== 'production') {
    console.warn('⚠️  WARNING: REVOLUT_ENV is not set to "production". Please verify your environment.');
  }

  console.log(`Using API URL: ${process.env.REVOLUT_API_BASE_URL || 'https://b2b.revolut.com/api/1.0'}`);
  console.log(`Environment: ${process.env.REVOLUT_ENV || 'not set'}`);
  console.log('');

  try {
    // Initialize the Revolut client
    const client = initRevolutClient();
    console.log('✅ Revolut client initialized successfully\n');

    // Test data for a small payment (to minimize risk during testing)
    const testData = {
      amount: 1.00, // $1.00 USD - use small amounts for initial testing
      currency: 'USD',
      customerName: 'Test Customer',
      customerEmail: 'test@example.com',
      serviceId: 'test-service',
      orderReference: `test-order-${Date.now()}`,
      description: 'Test payment for production environment'
    };

    console.log('Preparing to create a test order...');
    console.log('⚠️  This will create a REAL payment request if using production credentials!');
    console.log('');

    // Wait for user confirmation before proceeding with production test
    console.log('Press Ctrl+C to abort, or wait 5 seconds to proceed with PRODUCTION test...');
    await new Promise(resolve => setTimeout(resolve, 5000));

    // Attempt to create a payment order
    const result = await client.createOrder(testData);

    console.log('✅ Payment order created successfully!');
    console.log('Order ID:', result.id);
    console.log('Status:', result.status);
    console.log('Checkout URL:', result.checkoutUrl);
    console.log('');
    console.log('Next steps:');
    console.log('1. Visit the checkout URL to complete the payment (if testing locally)');
    console.log('2. Monitor your Revolut Business dashboard for the transaction');
    console.log('3. Check your webhook endpoint for status updates');
    console.log('');
    console.log('Remember: This was a REAL payment request using PRODUCTION credentials.');
    console.log('Make sure to handle the payment appropriately.');

  } catch (error: any) {
    console.error('❌ Error during payment test:', error.message);

    if (error.message.includes('401') || error.message.includes('Unauthorized')) {
      console.log('\nThis error typically indicates:');
      console.log('- Invalid REVOLUT_ACCESS_TOKEN');
      console.log('- Insufficient permissions on the access token');
      console.log('- Wrong environment (sandbox vs production)');
    }
  }
}

async function showConfiguration() {
  console.log('Current Revolut Configuration:');
  console.log('===============================');
  console.log(`REVOLUT_API_BASE_URL: ${process.env.REVOLUT_API_BASE_URL}`);
  console.log(`REVOLUT_ENV: ${process.env.REVOLUT_ENV}`);
  console.log(`REVOLUT_ACCESS_TOKEN set: ${!!process.env.REVOLUT_ACCESS_TOKEN}`);
  console.log(`REVOLUT_WEBHOOK_SECRET set: ${!!process.env.REVOLUT_WEBHOOK_SECRET}`);
  console.log('');
}

async function main() {
  await showConfiguration();
  await testProductionPayment();
}

// Run the test
main().catch(console.error);