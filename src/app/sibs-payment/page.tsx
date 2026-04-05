'use client';

import { useEffect, useState, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';

function SibsPaymentForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const formContextRaw = searchParams.get('formContext');
  const transactionId = searchParams.get('transactionId');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [phone, setPhone] = useState('');
  const [cardNumber, setCardNumber] = useState('');
  const [cardExpiry, setCardExpiry] = useState('');
  const [cardCvv, setCardCvv] = useState('');
  const [cardName, setCardName] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [paymentStatus, setPaymentStatus] = useState<string>('');
  const [pollingInterval, setPollingInterval] = useState<NodeJS.Timeout | null>(null);
  const [formContext, setFormContext] = useState<any>(null);
  const [activeMethod, setActiveMethod] = useState<string>('');

  useEffect(() => {
    if (!formContextRaw || !transactionId) {
      setError('Missing payment data. Please try again.');
      setLoading(false);
      return;
    }

    try {
      // formContext is base64-encoded JSON, Next.js already URL-decoded it
      const decoded = JSON.parse(atob(formContextRaw));
      setFormContext(decoded);
      setPaymentStatus('awaiting_payment');

      // Auto-select first available payment method
      const methods = decoded.PaymentMethod || [];
      if (methods.length > 0) {
        setActiveMethod(methods[0]);
      }
      setLoading(false);
    } catch {
      setError('Invalid payment data. Please try again.');
      setLoading(false);
    }
  }, [formContextRaw, transactionId]);

  const handleMbwaySubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!phone.match(/^351#\d{9}$/)) {
      setError('Phone must be in format: 351#912345678');
      return;
    }
    setError(null);
    setSubmitting(true);

    try {
      const res = await fetch('/api/sibs/mbway', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          transactionId,
          transactionSignature: formContext.TransactionSignature,
          customerPhone: phone,
        }),
      });

      const data = await res.json();
      console.log('[MBWAY_RESPONSE]', data);

      if (data.returnStatus?.statusCode === '000') {
        const status = data.paymentStatus || 'processing';
        setPaymentStatus(status);

        // Handle immediate decline/timeout
        if (status === 'Declined' || status === 'Failed') {
          if (pollingInterval) clearInterval(pollingInterval);
          const desc = data.returnStatus?.statusDescription || '';
          setError(`Payment ${status.toLowerCase()}: ${desc}`);
        } else {
          // Start polling for status
          const interval = setInterval(() => checkStatus(transactionId), 3000);
          setPollingInterval(interval);
        }
      } else {
        setError(data.returnStatus?.statusMsg || data.error || 'Payment failed');
      }
    } catch (err: any) {
      setError('Failed to process MBWAY payment: ' + err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const handleCardSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!cardNumber || !cardExpiry || !cardCvv || !cardName) {
      setError('All card fields are required');
      return;
    }
    setError(null);
    setSubmitting(true);

    // Convert MM/YY to ISO format
    const [month, year] = cardExpiry.split('/');
    const validationDate = `20${year}-${month.padStart(2, '0')}-01T00:00:00.000Z`;

    try {
      const res = await fetch('/api/sibs/card', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          transactionId,
          transactionSignature: formContext.TransactionSignature,
          cardInfo: {
            PAN: cardNumber.replace(/\s/g, ''),
            secureCode: cardCvv,
            validationDate,
            cardholderName: cardName,
            createToken: false,
          },
        }),
      });

      const data = await res.json();
      console.log('[CARD_RESPONSE]', data);

      if (data.returnStatus?.statusCode === '000') {
        const status = data.paymentStatus || 'processing';
        setPaymentStatus(status);

        // Handle immediate decline/timeout
        if (status === 'Declined' || status === 'Failed') {
          if (pollingInterval) clearInterval(pollingInterval);
          const desc = data.returnStatus?.statusDescription || '';
          setError(`Payment ${status.toLowerCase()}: ${desc}`);
        } else {
          // Start polling for status
          const interval = setInterval(() => checkStatus(transactionId), 3000);
          setPollingInterval(interval);
        }
      } else {
        setError(data.returnStatus?.statusMsg || data.error || 'Payment failed');
      }
    } catch (err: any) {
      setError('Failed to process card payment: ' + err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const checkStatus = async (txId: string) => {
    try {
      const res = await fetch(`/api/sibs/status/${txId}`);
      const data = await res.json();
      console.log('[STATUS_CHECK]', data);

      if (data.paymentStatus === 'Success' || data.paymentStatus === 'Authorized') {
        if (pollingInterval) clearInterval(pollingInterval);
        setPaymentStatus('completed');
        router.push('/success');
      } else if (data.paymentStatus === 'Failed' || data.paymentStatus === 'Declined') {
        if (pollingInterval) clearInterval(pollingInterval);
        setPaymentStatus('failed');
        router.push('/failure');
      } else {
        setPaymentStatus(data.paymentStatus || 'processing');
      }
    } catch (err) {
      console.error('[STATUS_ERROR]', err);
    }
  };

  useEffect(() => {
    return () => {
      if (pollingInterval) clearInterval(pollingInterval);
    };
  }, [pollingInterval]);

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
          <button onClick={() => router.push('/checkout')} className="px-6 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700">
            Back to Checkout
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
          Transaction ID: {transactionId}
        </p>
        <p className="text-sm text-gray-500 mt-2">
          Amount: {formContext?.Amount?.Amount} {formContext?.Amount?.Currency}
        </p>
      </div>

      {/* Payment Method Tabs */}
      {paymentStatus === 'awaiting_payment' && methods.length > 1 && (
        <div className="flex gap-2 mb-6">
          {methods.map((m: string) => (
            <button
              key={m}
              onClick={() => setActiveMethod(m)}
              className={`flex-1 px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                activeMethod === m
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              {m}
            </button>
          ))}
        </div>
      )}

      {/* MBWAY Payment */}
      {activeMethod === 'MBWAY' && paymentStatus === 'awaiting_payment' && (
        <div className="bg-white rounded-lg shadow-md p-6">
          <h2 className="text-xl font-semibold mb-4">MB WAY Payment</h2>
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-4">
            <p className="text-sm text-yellow-800">
              <strong>Sandbox:</strong> Use <code className="bg-yellow-100 px-1 rounded">351#910000000</code> for auto-success.
            </p>
          </div>
          <form onSubmit={handleMbwaySubmit}>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Enter your MB WAY phone number:
            </label>
            <input
              type="text"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="351#910000000"
              className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
              required
            />
            <p className="text-xs text-gray-500 mt-1">Format: 351#[9-digit phone number]</p>
            <button
              type="submit"
              disabled={submitting}
              className="mt-4 w-full px-6 py-3 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50"
            >
              {submitting ? 'Processing...' : 'Pay with MB WAY'}
            </button>
          </form>
        </div>
      )}

      {/* Card Payment */}
      {activeMethod === 'CARD' && paymentStatus === 'awaiting_payment' && (
        <div className="bg-white rounded-lg shadow-md p-6">
          <h2 className="text-xl font-semibold mb-4">Card Payment</h2>
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-4">
            <p className="text-sm text-yellow-800">
              <strong>Sandbox Test Card:</strong><br />
              Number: <code className="bg-yellow-100 px-1 rounded">5309770050051882</code><br />
              Expiry: <code className="bg-yellow-100 px-1 rounded">02/27</code><br />
              CVV: <code className="bg-yellow-100 px-1 rounded">205</code><br />
              <br />
              <strong className="text-red-600">⚠️ Card not enabled:</strong> If you see "No agreement found", your SIBS account doesn't have card processing enabled. Contact SIBS to enable it.
            </p>
          </div>
          <form onSubmit={handleCardSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Card Number</label>
              <input
                type="text"
                value={cardNumber}
                onChange={(e) => setCardNumber(e.target.value)}
                placeholder="5236410030000927"
                className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                required
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Expiry (MM/YY)</label>
                <input
                  type="text"
                  value={cardExpiry}
                  onChange={(e) => setCardExpiry(e.target.value)}
                  placeholder="12/28"
                  className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">CVV</label>
                <input
                  type="text"
                  value={cardCvv}
                  onChange={(e) => setCardCvv(e.target.value)}
                  placeholder="776"
                  className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                  required
                />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Cardholder Name</label>
              <input
                type="text"
                value={cardName}
                onChange={(e) => setCardName(e.target.value)}
                placeholder="John Doe"
                className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                required
              />
            </div>
            <button
              type="submit"
              disabled={submitting}
              className="w-full px-6 py-3 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50"
            >
              {submitting ? 'Processing...' : 'Pay Now'}
            </button>
          </form>
        </div>
      )}

      {/* REFERENCE Payment */}
      {activeMethod === 'REFERENCE' && paymentStatus === 'awaiting_payment' && (
        <div className="bg-white rounded-lg shadow-md p-6 text-center">
          <h2 className="text-xl font-semibold mb-4">Multibanco Reference</h2>
          <p className="text-gray-600">
            Reference payment requires generating entity + reference numbers.
            Contact SIBS for the generate-reference endpoint configuration.
          </p>
        </div>
      )}

      {/* Processing/Polling */}
      {(paymentStatus === 'processing' || paymentStatus === 'Timeout') && (
        <div className="bg-white rounded-lg shadow-md p-6 text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <h2 className="text-xl font-semibold mb-2">Waiting for MB WAY Confirmation</h2>
          <p className="text-gray-600 mb-4">
            A payment request was sent to your phone.
          </p>
          <div className="bg-blue-50 rounded-lg p-4 text-left">
            <p className="text-sm text-blue-800 font-medium mb-2">Next steps:</p>
            <ol className="text-sm text-blue-700 space-y-1 list-decimal list-inside">
              <li>Open the <strong>MB WAY app</strong> on your phone</li>
              <li>Accept the payment request</li>
              <li>You'll be redirected automatically</li>
            </ol>
          </div>
          <p className="text-xs text-gray-400 mt-4">
            Checking status every 3 seconds...
          </p>
        </div>
      )}

      {/* Completed */}
      {paymentStatus === 'completed' && (
        <div className="bg-green-50 border border-green-200 rounded-lg p-6 text-center">
          <h2 className="text-xl font-semibold text-green-800 mb-2">Payment Successful!</h2>
          <p className="text-green-700">Redirecting to confirmation...</p>
        </div>
      )}

      {/* Failed */}
      {paymentStatus === 'failed' && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-6 text-center">
          <h2 className="text-xl font-semibold text-red-800 mb-2">Payment Failed</h2>
          <p className="text-red-700">Redirecting...</p>
        </div>
      )}

      {/* Error with retry */}
      {error && paymentStatus !== 'failed' && paymentStatus !== 'completed' && (
        <div className="mt-6 bg-red-50 border border-red-200 rounded-lg p-6 text-center">
          <h3 className="text-lg font-medium text-red-800 mb-2">Payment Error</h3>
          <p className="text-sm text-red-700 mb-4">{error}</p>
          <button
            onClick={() => { setError(null); setPaymentStatus('awaiting_payment'); }}
            className="px-6 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
          >
            Try Again
          </button>
        </div>
      )}
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
