

export interface PaymentOrderRequest {
  amount: number;           // Amount in minor units (cents)
  currency?: string;        // Currency code (USD by default)
  customerName: string;     // Customer full name
  customerEmail: string;    // Customer email
  orderReference: string;   // Unique order reference
  description?: string;     // Optional description of the payment
}


// Response types

export interface PaymentOrderResponse {
  id: string;             // Revolut order ID
  status: string;         // Order status (e.g., 'created', 'pending')
  checkoutUrl: string;    // ✅ Correct property name
  createdAt?: string;     // Optional timestamp from Revolut
}



// Webhook event types

export interface RevolutWebhookEvent {
 id: string;              
  type: string;            
  created_at: string;       
  data: {
    id: string;            
    type: string;           
    state: string;         
    currency: string;       
    amount: number;         
    merchant_order_reference?: string;  
    metadata?: Record<string, string>;  
  };
}


// Internal payment record for DB tracking

export interface PaymentRecord {
  id: string;                     // Internal payment record ID
  revolutOrderId: string;         // Revolut order ID
  status: 'PENDING' | 'COMPLETED' | 'FAILED'; // Payment status
  amount: number;                 // Amount in major units
  currency: string;               // Currency code
  customerEmail: string;          // Customer email
  serviceId: string;              // Service identifier (from backend mapping)
  orderReference: string;         // Unique merchant order reference
  createdAt: string;              // When record was created
  updatedAt: string;              // Last updated timestamp
  metadata?: Record<string, string>; // Optional additional metadata
}

// Revolut API response type

export interface RevolutOrderApiResponse {
  id: string;
  state: string;
  checkout_url: string;
  created_at?: string;
}

// ========================
// SIBS Payment Types
// ========================

// SIBS API request types

export interface SibsPaymentRequest {
  merchant: {
    terminalId: number;
    channel: string;
    merchantTransactionId: string;
  };
  transaction: {
    transactionTimestamp: string;
    description: string;
    moto: boolean;
    paymentType: 'AUTH' | 'PURS';
    paymentMethod: string[];
    amount: {
      value: number;
      currency: string;
    };
    paymentReference?: {
      initialDatetime: string;
      finalDatetime: string;
      maxAmount: {
        value: number;
        currency: string;
      };
      minAmount: {
        value: number;
        currency: string;
      };
      entity: string;
    };
  };
  customer: {
    customerInfo: {
      customerEmail: string;
      shippingAddress?: {
        street1: string;
        street2?: string;
        city: string;
        postcode: string;
        country: string;
      };
      billingAddress?: {
        street1: string;
        street2?: string;
        city: string;
        postcode: string;
        country: string;
      };
    };
  };
}

export interface SibsAddress {
  street: string;
  city: string;
  postalCode: string;
  country: string;
}

// SIBS API response types

export interface SibsPaymentResponse {
  returnStatus: {
    statusCode: 'Success' | 'Partial' | 'Declined' | 'InProcessing' | 'Pending' | 'Timeout' | 'Error';
    statusMsg: string;
  };
  paymentMethodList?: Array<{
    paymentMethod: string;
    paymentType: string;
  }>;
  merchant: {
    terminalId: number;
  };
  amount: {
    value: number;
    currency: string;
  };
  formContext: string;
  transactionID: string;
  mandate?: {
    mandateAvailable: boolean;
    termsAndConditions: string;
  };
}

// SIBS authentication response

export interface SibsAuthResponse {
  access_token: string;
  token_type: string;
  expires_in: number;
  scope?: string;
}

// SIBS payment status check response

export interface SibsPaymentStatusResponse {
  returnStatus: {
    statusCode: string;
    statusMsg: string;
  };
  transactionID: string;
  status: string;
  amount?: {
    value: number;
    currency: string;
  };
}

// SIBS webhook event types

export interface SibsWebhookEvent {
  transactionID: string;
  merchantTransactionId: string;
  status: string;
  amount: {
    value: number;
    currency: string;
  };
  paymentMethod: string;
  timestamp: string;
}

// Internal SIBS payment record for DB tracking

export interface SibsPaymentRecord {
  id: string;
  sibsTransactionId: string;
  merchantTransactionId: string;
  status: 'PENDING' | 'COMPLETED' | 'FAILED' | 'IN_PROCESSING';
  amount: number;
  currency: string;
  customerEmail: string;
  serviceId: string;
  formContext: string;
  createdAt: string;
  updatedAt: string;
  metadata?: Record<string, string>;
}

