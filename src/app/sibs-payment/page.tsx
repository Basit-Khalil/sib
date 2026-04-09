'use client';

import { useEffect } from 'react';
import { useSearchParams } from 'next/navigation';

export default function SibsPaymentPage() {
  const searchParams = useSearchParams();
  const formContext = searchParams.get('formContext') || '';
  const transactionId = searchParams.get('transactionId') || '';

  useEffect(() => {
    if (!formContext || !transactionId) return;

    // Create and auto-submit the form
    const form = document.createElement('form');
    form.method = 'POST';
    form.action = 'https://spg.qly.site1.sibs.pt/paymentGateway/checkout';

    const inputFormContext = document.createElement('input');
    inputFormContext.type = 'hidden';
    inputFormContext.name = 'formContext';
    inputFormContext.value = decodeURIComponent(formContext);

    const inputTransactionId = document.createElement('input');
    inputTransactionId.type = 'hidden';
    inputTransactionId.name = 'transactionID';
    inputTransactionId.value = transactionId;

    form.appendChild(inputFormContext);
    form.appendChild(inputTransactionId);

    document.body.appendChild(form);
    form.submit();
  }, [formContext, transactionId]);

  return (
    <div className="min-h-[60vh] flex items-center justify-center">
      <div className="text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
        <h2 className="text-xl font-semibold text-gray-900 mb-2">Redirecting to SIBS...</h2>
        <p className="text-gray-600">Please wait while we securely redirect you to the payment page.</p>
      </div>
    </div>
  );
}