import { Suspense } from 'react';
import SibsPaymentForm from './SibsPaymentForm';

export const dynamic = 'force-dynamic';

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
      <SibsPaymentForm />
    </Suspense>
  );
}
