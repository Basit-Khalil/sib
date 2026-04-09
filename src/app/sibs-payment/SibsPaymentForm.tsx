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

function SibsPaymentContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const formContextRaw = searchParams.get('formContext');
  const [formContext, setFormContext] = useState<FormContextData | null>(null);
  const [retryLoading, setRetryLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!formContextRaw) return;
    try {
      const decoded = JSON.parse(atob(formContextRaw));
      setFormContext(decoded);
    } catch {
      setError('Invalid payment data.');
    }
  }, [formContextRaw]);

  // Redirect to SIBS hosted checkout page
  useEffect(() => {
    if (!formContextRaw) return;

    const form = document.createElement('form');
    form.method = 'POST';
    form.action = 'https://spg.qly.site1.sibs.pt/paymentGateway/checkout';
    form.style.display = 'none';

    const input = document.createElement('input');
    input.type = 'hidden';
    input.name = 'formContext';
    input.value = decodeURIComponent(formContextRaw);

    form.appendChild(input);
    document.body.appendChild(form);
    form.submit();
  }, [formContextRaw]);

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
        setError(data.error || 'Failed to create new payment.');
      }
    } catch (err: any) {
      setError('Failed to retry: ' + err.message);
    } finally {
      setRetryLoading(false);
    }
  };

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

  return (
    <div className="min-h-[60vh] flex items-center justify-center">
      <div className="text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
        <h2 className="text-xl font-semibold text-gray-900 mb-2">Redirecting to SIBS...</h2>
        <p className="text-gray-600">Please wait while we redirect to our secure payment page.</p>
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
        </div>
      </div>
    }>
      <SibsPaymentContent />
    </Suspense>
  );
}
