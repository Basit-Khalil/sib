/**
 * Test script for production SIBS payment flow
 *
 * To use this script with production credentials:
 *
 * 1. Ensure your .env.local file has the following SIBS configuration:
 *    ```
 *    # SIBS Payment Gateway Configuration
 *    SIBS_TOKEN_URL=https://qly.site1.sso.sys.sibs.pt/auth/realms/QLY.MERC.PORT1/protocol/openid-connect/token
 *    SIBS_API_URL=https://spg.qly.site1.sibs.pt/api/v2
 *    SIBS_CLIENT_ID=your_client_id
 *    SIBS_CLIENT_SECRET=your_client_secret
 *    SIBS_ENTITY_ID=your_entity_id
 *    SIBS_TERMINAL_ID=your_terminal_id
 *    ```
 *
 * 2. Run the test:
 *    ```bash
 *    npx tsx test-sibs-payment.ts
 *    ```
 *
 * ⚠️  WARNING: This will create REAL payment requests when using production credentials.
 *    Only test when you're ready for live transactions.
 */

import { initSibsClient } from './src/lib/sibs';

async function testSibsPayment() {
  console.log('Testing SIBS payment flow...\n');

  // Validate environment
  if (!process.env.SIBS_CLIENT_ID) {
    console.error('❌ ERROR: SIBS_CLIENT_ID environment variable is not set');
    console.log('Please update your .env.local file with SIBS credentials');
    return;
  }

  if (!process.env.SIBS_CLIENT_SECRET) {
    console.error('❌ ERROR: SIBS_CLIENT_SECRET environment variable is not set');
    return;
  }

  if (!process.env.SIBS_ENTITY_ID) {
    console.error('❌ ERROR: SIBS_ENTITY_ID environment variable is not set');
    return;
  }

  if (!process.env.SIBS_TERMINAL_ID) {
    console.error('❌ ERROR: SIBS_TERMINAL_ID environment variable is not set');
    return;
  }

  console.log(`Using API URL: ${process.env.SIBS_API_URL || 'https://spg.qly.site1.sibs.pt/api/v2'}`);
  console.log(`Token URL: ${process.env.SIBS_TOKEN_URL || 'default'}`);
  console.log(`Entity ID: ${process.env.SIBS_ENTITY_ID}`);
  console.log(`Terminal ID: ${process.env.SIBS_TERMINAL_ID}`);
  console.log('');

  try {
    // Initialize the SIBS client
    const client = initSibsClient();
    console.log('✅ SIBS client initialized successfully\n');

    // Test data for a payment
    const testData = {
      amount: 10.00, // €10.00 EUR - use small amounts for initial testing
      currency: 'EUR',
      customerName: 'Test Customer',
      customerEmail: 'test@example.com',
      orderReference: `test-order-${Date.now()}`,
      description: 'Test payment for SIBS integration',
      paymentMethod: 'MBWAY' as const,
      paymentType: 'PURS' as const,
      channel: 'EC',
    };

    console.log('Preparing to create a test payment...');
    console.log('⚠️  This will create a REAL payment request if using production credentials!');
    console.log('');

    // Wait for user confirmation before proceeding with production test
    console.log('Press Ctrl+C to abort, or wait 5 seconds to proceed with payment test...');
    await new Promise(resolve => setTimeout(resolve, 5000));

    // Attempt to create a payment
    const result = await client.createPayment(testData);

    console.log('✅ Payment created successfully!');
    console.log('Transaction ID:', result.transactionID);
    console.log('Status:', result.returnStatus.statusCode);
    console.log('Status Message:', result.returnStatus.statusMsg);
    console.log('Amount:', result.amount.value, result.amount.currency);
    console.log('Form Context:', result.formContext.substring(0, 100) + '...');
    console.log('');
    console.log('Next steps:');
    console.log('1. Use the formContext to initialize the SIBS payment form on the frontend');
    console.log('2. Monitor your SIBS dashboard for the transaction');
    console.log('3. Check your webhook endpoint for status updates');
    console.log('');

    // Test checking payment status
    console.log('Testing payment status check...');
    const statusResult = await client.checkPaymentStatus(result.transactionID);
    console.log('✅ Payment status retrieved:', statusResult.returnStatus.statusCode);

  } catch (error: any) {
    console.error('❌ Error during payment test:', error.message);

    if (error.message.includes('401') || error.message.includes('Unauthorized')) {
      console.log('\nThis error typically indicates:');
      console.log('- Invalid SIBS_CLIENT_ID or SIBS_CLIENT_SECRET');
      console.log('- Token endpoint URL is incorrect');
      console.log('- OAuth2 credentials have expired');
    } else if (error.message.includes('403') || error.message.includes('Forbidden')) {
      console.log('\nThis error typically indicates:');
      console.log('- Insufficient permissions on the client credentials');
      console.log('- Entity ID or Terminal ID is incorrect');
    } else if (error.message.includes('400')) {
      console.log('\nThis error typically indicates:');
      console.log('- Invalid request payload');
      console.log('- Missing required fields');
      console.log('- Incorrect data format');
    }
  }
}

async function showConfiguration() {
  console.log('Current SIBS Configuration:');
  console.log('===========================');
  console.log(`SIBS_API_URL: ${process.env.SIBS_API_URL || 'not set'}`);
  console.log(`SIBS_TOKEN_URL: ${process.env.SIBS_TOKEN_URL || 'not set'}`);
  console.log(`SIBS_CLIENT_ID set: ${!!process.env.SIBS_CLIENT_ID}`);
  console.log(`SIBS_CLIENT_SECRET set: ${!!process.env.SIBS_CLIENT_SECRET}`);
  console.log(`SIBS_ENTITY_ID: ${process.env.SIBS_ENTITY_ID || 'not set'}`);
  console.log(`SIBS_TERMINAL_ID: ${process.env.SIBS_TERMINAL_ID || 'not set'}`);
  console.log('');
}

async function main() {
  await showConfiguration();
  await testSibsPayment();
}

// Run the test
main().catch(console.error);
