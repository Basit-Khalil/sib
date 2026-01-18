'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';

interface CheckoutFormData {
  customerName: string;
  customerEmail: string;
  serviceCategory: string;
  serviceSubOption: string;
  amount: number;
  description?: string;
}

interface ServiceSubOption {
  label: string;
  price: number;
}

interface ServiceCategory {
  label: string;
  subOptions: Record<string, ServiceSubOption>;
}

interface ServiceOptions {
  [key: string]: ServiceCategory;
}

// Define service categories and sub-options with prices
const SERVICE_OPTIONS: ServiceOptions = {
  'graphic-design': {
    label: 'Graphic Design',
    subOptions: {
      'branding': { label: 'Branding', price: 250 },
      'logo-design': { label: 'Logo Design', price: 100 },
      'package-design': { label: 'Package Design', price: 399 }
    }
  },
  'web-development': {
    label: 'Web Development',
    subOptions: {
      'api-integration': { label: 'API Integration', price: 399 },
      'mob-app-development': { label: 'Mobile App Development', price: 2000 },
      'custom-cms': { label: 'Custom CMS Development', price: 2499 },
      'frontend': { label: 'Frontend Development', price: 999 },
      'backend': { label: 'Backend Solutions', price: 1499 }
    }
  },
  'cyber-security': {
    label: 'Cyber Security',
    subOptions: {
      'network-security': { label: 'Network Security', price: 499 },
      'cloud-security': { label: 'Cloud Security', price: 999 },
      'application-security': { label: 'Application Security', price: 199 }
    }
  },
  'cloud-computing': {
    label: 'Cloud Computing',
    subOptions: {
      'cloud-backup': { label: 'Cloud Backup', price: 199 },
      'cloud-storage': { label: 'Cloud Storage', price: 299 },
      'cloud-hosting': { label: 'Cloud Hosting', price: 499 }
    }
  },
  'digital-marketing': {
    label: 'Digital Marketing',
    subOptions: {
      'seo-services': { label: 'SEO Services', price: 399 },
      'social-media': { label: 'Social Media Marketing', price: 299 },
      'content-marketing': { label: 'Content Marketing', price: 499 }
    }
  }
};

export default function CheckoutForm() {
  const router = useRouter();
  const [formData, setFormData] = useState<CheckoutFormData>({
    customerName: '',
    customerEmail: '',
    serviceCategory: '',
    serviceSubOption: '',
    amount: 0,
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Update amount when service category or sub-option changes
  useEffect(() => {
    if (formData.serviceCategory && formData.serviceSubOption) {
      const category = SERVICE_OPTIONS[formData.serviceCategory as keyof typeof SERVICE_OPTIONS];
      if (category) {
        const subOptionKey = formData.serviceSubOption as keyof typeof category.subOptions;
        if (category.subOptions[subOptionKey]) {
          const price = category.subOptions[subOptionKey].price;
          setFormData(prev => ({
            ...prev,
            amount: price
          }));
        }
      }
    }
  }, [formData.serviceCategory, formData.serviceSubOption]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;

    if (name === 'serviceCategory') {
      // When category changes, reset sub-option and amount
      setFormData(prev => ({
        ...prev,
        serviceCategory: value,
        serviceSubOption: '',
        amount: 0
      }));
    } else if (name === 'serviceSubOption') {
      // When sub-option changes, update the amount automatically
      setFormData(prev => ({
        ...prev,
        serviceSubOption: value,
        // Amount will be updated by useEffect
      }));
    } else if (name === 'amount') {
      // Allow manual amount override
      setFormData(prev => ({
        ...prev,
        [name]: parseFloat(value) || 0
      }));
    } else {
      setFormData(prev => ({
        ...prev,
        [name]: value
      }));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      // Validate form data
      if (!formData.customerName.trim()) {
        throw new Error('Customer name is required');
      }
      if (!formData.customerEmail.trim()) {
        throw new Error('Customer email is required');
      }
      if (!formData.serviceCategory.trim()) {
        throw new Error('Service category is required');
      }
      if (!formData.serviceSubOption.trim()) {
        throw new Error('Service sub-option is required');
      }
      if (formData.amount <= 0) {
        throw new Error('Amount must be greater than 0');
      }

      // Prepare the order data
      const orderData = {
        ...formData,
        orderReference: `order_${Date.now()}`, // Generate unique reference
        currency: 'USD', // Default currency
        serviceId: formData.serviceSubOption // Use the sub-option as service ID
      };

      // Call the backend API to create the payment order
      const response = await fetch('/api/revolut/create-order', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(orderData),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Failed to create payment order');
      }

      if (result.checkoutUrl) {
        // Redirect to Revolut checkout page
        window.location.href = result.checkoutUrl;
      } else {
        throw new Error('No checkout URL received from payment provider');
      }
    } catch (err: any) {
      console.error('Checkout error:', err);
      setError(err.message || 'An error occurred during checkout');
    } finally {
      setLoading(false);
    }
  };

  // Get current sub-options based on selected category
  const currentSubOptions: Record<string, ServiceSubOption> = formData.serviceCategory
    ? SERVICE_OPTIONS[formData.serviceCategory as keyof typeof SERVICE_OPTIONS]?.subOptions || {}
    : {};

  return (
    <>
      {error && (
        <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg">
          <div className="flex">
            <div className="flex-shrink-0">
              <svg className="h-5 w-5 text-red-400" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
              </svg>
            </div>
            <div className="ml-3">
              <h3 className="text-sm font-medium text-red-800">Error</h3>
              <div className="mt-2 text-sm text-red-700">
                <p>{error}</p>
              </div>
            </div>
          </div>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
        <div>
          <label htmlFor="customerName" className="block text-sm font-medium text-gray-700 mb-1">
            Full Name *
          </label>
          <input
            type="text"
            id="customerName"
            name="customerName"
            value={formData.customerName}
            onChange={handleChange}
            required
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            placeholder="John Doe"
          />
        </div>

        <div>
          <label htmlFor="customerEmail" className="block text-sm font-medium text-gray-700 mb-1">
            Email Address *
          </label>
          <input
            type="email"
            id="customerEmail"
            name="customerEmail"
            value={formData.customerEmail}
            onChange={handleChange}
            required
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            placeholder="john@example.com"
          />
        </div>

        <div>
          <label htmlFor="serviceCategory" className="block text-sm font-medium text-gray-700 mb-1">
            Service Category *
          </label>
          <select
            id="serviceCategory"
            name="serviceCategory"
            value={formData.serviceCategory}
            onChange={handleChange}
            required
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            <option value="">Select a service category</option>
            {Object.entries(SERVICE_OPTIONS).map(([key, value]) => {
              const typedValue = value as ServiceCategory;
              return (
                <option key={key} value={key}>{typedValue.label}</option>
              );
            })}
          </select>
        </div>

        {formData.serviceCategory && (
          <div>
            <label htmlFor="serviceSubOption" className="block text-sm font-medium text-gray-700 mb-1">
              Service Sub-Option *
            </label>
            <select
              id="serviceSubOption"
              name="serviceSubOption"
              value={formData.serviceSubOption}
              onChange={handleChange}
              required
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="">Select a service option</option>
              {Object.entries(currentSubOptions).map(([key, value]) => {
                const typedValue = value as ServiceSubOption;
                return (
                  <option key={key} value={key}>{typedValue.label} (${typedValue.price})</option>
                );
              })}
            </select>
          </div>
        )}

        <div>
          <label htmlFor="amount" className="block text-sm font-medium text-gray-700 mb-1">
            Amount ($USD) *
          </label>
          <div className="relative mt-1 rounded-md shadow-sm">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <span className="text-gray-500 sm:text-sm">$</span>
            </div>
            <input
    type="number"
  id="amount"
  value={formData.amount || ''}
  readOnly
  className="w-full px-3 py-2 pl-7 border border-gray-300 rounded-md bg-gray-100 cursor-not-allowed"
/>

          </div>
          <p className="mt-1 text-sm text-gray-500">
            Amount will be automatically filled based on your service selection.
          </p>
        </div>

        <div>
          <label htmlFor="description" className="block text-sm font-medium text-gray-700 mb-1">
            Description (Optional)
          </label>
          <input
            type="text"
            id="description"
            name="description"
            value={formData.description || ''}
            onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            placeholder="Payment description"
          />
        </div>

        <div className="pt-4">
          <button
            type="submit"
            disabled={loading}
            className={`w-full py-3 px-6 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-md transition duration-200 ease-in-out transform hover:scale-[1.02] text-center inline-block ${
              loading ? 'opacity-75 cursor-not-allowed' : ''
            }`}
          >
            {loading ? (
              <span className="flex items-center justify-center">
                <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                Processing...
              </span>
            ) : (
              <span className="flex items-center justify-center">
                <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"></path>
                </svg>
                Pay Securely with Revolut
              </span>
            )}
          </button>
        </div>
      </form>
    </>
  );
}