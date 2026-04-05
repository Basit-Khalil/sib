import fs from 'fs';
import path from 'path';

export type PaymentStatus = 
  | 'INITIATED'
  | 'PENDING'
  | 'IN_PROCESSING'
  | 'COMPLETED'
  | 'SUCCESS'
  | 'FAILED'
  | 'DECLINED'
  | 'CANCELLED';

export interface PaymentRecord {
  id: string;
  merchantTransactionId: string;
  sibsTransactionId: string | null;
  amount: number;
  currency: string;
  status: PaymentStatus;
  customerName: string;
  customerEmail: string;
  paymentMethod: string;
  description: string;
  formContext?: string;
  createdAt: string;
  updatedAt: string;
  webhookEvents: WebhookEvent[];
}

export interface WebhookEvent {
  status: string;
  timestamp: string;
  rawPayload: any;
}

const PAYMENTS_FILE = path.join(process.cwd(), 'data', 'payments.json');

// Ensure data directory exists
function ensureDataDir() {
  const dataDir = path.dirname(PAYMENTS_FILE);
  if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true });
  }
}

// Read all payments
function readPayments(): PaymentRecord[] {
  ensureDataDir();
  
  if (!fs.existsSync(PAYMENTS_FILE)) {
    return [];
  }
  
  const data = fs.readFileSync(PAYMENTS_FILE, 'utf-8');
  
  if (!data.trim()) {
    return [];
  }
  
  return JSON.parse(data);
}

// Write all payments
function writePayments(payments: PaymentRecord[]) {
  try {
    ensureDataDir();
    fs.writeFileSync(PAYMENTS_FILE, JSON.stringify(payments, null, 2), 'utf-8');
  } catch (err: any) {
    // EROFS on Vercel/serverless — log instead
    if (err.code === 'EROFS') {
      console.warn('[PAYMENT_STORE] File system read-only — payment records logged only');
    } else {
      throw err;
    }
  }
}

/**
 * Create a new payment record
 */
export function createPayment(record: Omit<PaymentRecord, 'id' | 'createdAt' | 'updatedAt' | 'webhookEvents'>): PaymentRecord {
  const payments = readPayments();
  
  const newRecord: PaymentRecord = {
    ...record,
    id: `pay_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    webhookEvents: [],
  };
  
  payments.push(newRecord);
  writePayments(payments);
  
  console.log(`[PAYMENT_STORE] Created payment record: ${newRecord.id} (${newRecord.merchantTransactionId})`);
  
  return newRecord;
}

/**
 * Find payment by merchant transaction ID
 */
export function findPaymentByMerchantId(merchantId: string): PaymentRecord | undefined {
  const payments = readPayments();
  return payments.find(p => p.merchantTransactionId === merchantId);
}

/**
 * Find payment by SIBS transaction ID
 */
export function findPaymentBySibsTransactionId(sibsTransactionId: string): PaymentRecord | undefined {
  const payments = readPayments();
  return payments.find(p => p.sibsTransactionId === sibsTransactionId);
}

/**
 * Update payment status and record webhook event
 */
export function updatePaymentStatus(
  merchantTransactionId: string,
  status: PaymentStatus,
  webhookEvent: WebhookEvent
): PaymentRecord | null {
  const payments = readPayments();
  const index = payments.findIndex(p => p.merchantTransactionId === merchantTransactionId);
  
  if (index === -1) {
    console.error(
      `[PAYMENT_STORE] Payment not found for merchant ID: ${merchantTransactionId}`
    );
    return null;
  }
  
  payments[index].status = status;
  payments[index].updatedAt = new Date().toISOString();
  payments[index].webhookEvents.push(webhookEvent);
  
  writePayments(payments);
  
  console.log(
    `[PAYMENT_STORE] Updated payment ${merchantTransactionId} to status: ${status}`
  );
  
  return payments[index];
}

/**
 * Update payment with SIBS transaction ID
 */
export function linkSibsTransaction(
  merchantTransactionId: string,
  sibsTransactionId: string,
  formContext: string
): PaymentRecord | null {
  const payments = readPayments();
  const index = payments.findIndex(p => p.merchantTransactionId === merchantTransactionId);
  
  if (index === -1) {
    console.error(
      `[PAYMENT_STORE] Payment not found for merchant ID: ${merchantTransactionId}`
    );
    return null;
  }
  
  payments[index].sibsTransactionId = sibsTransactionId;
  payments[index].formContext = formContext;
  payments[index].updatedAt = new Date().toISOString();
  
  writePayments(payments);
  
  console.log(
    `[PAYMENT_STORE] Linked SIBS transaction ${sibsTransactionId} to ${merchantTransactionId}`
  );
  
  return payments[index];
}

/**
 * Get all payments (for admin/debug purposes)
 */
export function getAllPayments(): PaymentRecord[] {
  return readPayments();
}
