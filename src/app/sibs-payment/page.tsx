'use client';

import { useEffect, useState, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';

interface FormContextData {
  PaymentMethod: string[];
  TransactionSignature: string;
  Amount: { Amount: number; Currency: string };
  Merchant: { MerchantTransaction: { Description: string } };
  [key: string]: any;
}

function SibsPaymentForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const formContextRaw = searchParams.get('formContext');
  const transactionId = searchParams.get('transactionId');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [formContext, setFormContext] = useState<FormContextData | null>(null);
  const [retryLoading, setRetryLoading] = useState(false);

  useEffect(() => {
    if (!formContextRaw || !transactionId) {
      setError('Missing payment data. Please try again.');
      setLoading(false);
      return;
    }

    try {
      const decoded = JSON.parse(atob(formContextRaw));
      setFormContext(decoded);
      setLoading(false);
    } catch {
      setError('Invalid payment data. Please try again.');
      setLoading(false);
    }
  }, [formContextRaw, transactionId]);

  const handleProceedToPayment = () => {
    const form = document.createElement('form');
    form.method = 'POST';
    form.action = 'https://spg.qly.site1.sibs.pt/api/v2/payments';
    const input = document.createElement('input');
    input.type = 'hidden';
    input.name = 'formContext';
    input.value = formContextRaw!;
    form.appendChild(input);
    document.body.appendChild(form);
    form.submit();
  };

  const handleRetry = async () => {
    setRetryLoading(true);
    setError(null);
    try {
      const description = formContext?.Merchant?.MerchantTransaction?.Description || '';
      const email = formContext?.customerInfo?.customerEmail || '';
      const name = formContext?.customerInfo?.customerName || 'Customer';

      const serviceParts = description.replace('Service: ', '').split('-');
      const category = serviceParts[0] || 'web-development';
      const subOption = serviceParts.slice(1).join('-') || 'api-integration';

      const res = await fetch('/api/sibs/create-order', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          customerName: name,
          customerEmail: email || 'customer@example.com',
          serviceCategory: category,
          serviceSubOption: subOption,
          description: description || 'Retry payment',
        }),
      });

      const data = await res.json();

      if (data.formContext && data.transactionId) {
        window.location.href = `/sibs-payment?formContext=${encodeURIComponent(data.formContext)}&transactionId=${data.transactionId}`;
      } else {
        setError(data.error || 'Failed to create new payment. Please try again.');
      }
    } catch (err: any) {
      setError('Failed to retry payment: ' + err.message);
    } finally {
      setRetryLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <h2 className="text-xl font-semibold text-gray-900 mb-2">Loading Payment...</h2>
          <p className="text-gray-600">Please wait...</p>
        </div>
      </div>
    );
  }

  if (error && !formContext) {
    return (
      <div className="max-w-md mx-auto mt-12">
        <div className="bg-red-50 border border-red-200 rounded-lg p-6 text-center">
          <h3 className="text-lg font-medium text-red-800 mb-2">Payment Error</h3>
          <p className="text-sm text-red-700 mb-4">{error}</p>
          <button onClick={handleRetry} disabled={retryLoading} className="px-6 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50">
            {retryLoading ? 'Creating New Transaction...' : 'Back to Checkout'}
          </button>
        </div>
      </div>
    );
  }

  const methods = formContext?.PaymentMethod || [];

  return (
    <div className="max-w-2xl mx-auto">
      <div className="text-center mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">SIBS Payment</h1>
        <p className="text-lg text-gray-600">
          {formContext?.Merchant?.MerchantTransaction?.Description || 'Payment'}
        </p>
        <p className="text-2xl font-bold text-gray-900 mt-2">
          €{formContext?.Amount?.Amount}
        </p>
      </div>

      <div className="bg-white rounded-lg shadow-md p-6 text-center">
        <h2 className="text-xl font-semibold mb-4">Available Payment Methods</h2>

        <div className="flex gap-3 justify-center mb-6">
          {methods.map((m: string) => (
            <div key={m} className="px-4 py-2 bg-gray-100 rounded-md text-sm font-medium text-gray-700">
              {m === 'MBWAY' ? 'MB WAY' : m}
            </div>
          ))}
        </div>

        <p className="text-gray-600 mb-6">
          Click below to proceed to the secure SIBS payment page where you can select your preferred payment method.
        </p>

        <button
          onClick={handleProceedToPayment}
          className="w-full px-8 py-4 bg-blue-600 text-white text-lg font-medium rounded-md hover:bg-blue-700 transition-colors"
        >
          Proceed to Secure Payment →
        </button>

        <p className="text-xs text-gray-500 mt-4">
          You will be redirected to SIBS to complete your payment.
        </p>
      </div>

      <div className="mt-8 text-center text-sm text-gray-500">
        <p>Your payment is securely processed by SIBS. We do not store any payment information.</p>
        <div className="mt-4 flex justify-center space-x-6">
          <div className="flex items-center">
            <svg className="w-5 h-5 text-green-500 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
            </svg>
            <span>Secure Processing</span>
          </div>
          <div className="flex items-center">
            <svg className="w-5 h-5 text-green-500 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
            </svg>
            <span>PCI DSS Compliant</span>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function SibsPaymentPage() {
  return (
    <Suspense fallback={
      <div className="min-h-[60vh] flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <h2 className="text-xl font-semibold text-gray-900 mb-2">Loading Payment...</h2>
          <p className="text-gray-600">Please wait...</p>
        </div>
      </div>
    }>
      <SibsPaymentForm />
    </Suspense>
  );
}
