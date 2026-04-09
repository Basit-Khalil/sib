'use client';

import { useEffect, useRef, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';

interface FormContextData {
  PaymentMethod: string[];
  TransactionSignature: string;
  Amount: { Amount: number; Currency: string };
  Merchant: { MerchantTransaction: { Description: string } };
  [key: string]: any;
}

export default function SibsPaymentForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const formContextRaw = searchParams.get('formContext');
  const iframeRef = useRef<HTMLIFrameElement>(null);
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

  useEffect(() => {
    if (!formContextRaw || !iframeRef.current) return;

    const iframe = iframeRef.current;
    const handleLoad = () => {
      const doc = iframe.contentDocument || iframe.contentWindow?.document;
      if (!doc) return;

      doc.open();
      doc.write('<html><body></body></html>');
      doc.close();

      const form = doc.createElement('form');
      form.method = 'POST';
      form.action = 'https://spg.qly.site1.sibs.pt/paymentGateway/checkout';

      const input = doc.createElement('input');
      input.type = 'hidden';
      input.name = 'formContext';
      input.value = decodeURIComponent(formContextRaw);

      form.appendChild(input);
      doc.body.appendChild(form);
      form.submit();
    };

    iframe.addEventListener('load', handleLoad);
    return () => iframe.removeEventListener('load', handleLoad);
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
    <div className="max-w-3xl mx-auto">
      <div className="text-center mb-6">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">SIBS Payment</h1>
        <p className="text-lg text-gray-600">
          {formContext?.Merchant?.MerchantTransaction?.Description || 'Payment'}
        </p>
        <p className="text-2xl font-bold text-gray-900 mt-2">
          €{formContext?.Amount?.Amount}
        </p>
      </div>

      <div className="bg-white rounded-lg shadow-md overflow-hidden">
        <iframe
          ref={iframeRef}
          width="100%"
          height="600"
          style={{ border: 'none' }}
          title="SIBS Payment"
        />
      </div>

      <div className="mt-4 text-center text-sm text-gray-500">
        <p>Your payment is securely processed by SIBS.</p>
        <div className="mt-4 flex justify-center space-x-6">
          <div className="flex items-center">
            <svg className="w-5 h-5 text-green-500 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
            </svg>
            <span>Secure Processing</span>
          </div>
        </div>
      </div>
    </div>
  );
}
