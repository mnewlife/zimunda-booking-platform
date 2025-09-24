import { Suspense } from 'react';
import { Metadata } from 'next';
import { CheckoutContent } from '@/components/checkout/checkout-content';
import { CheckoutSkeleton } from '@/components/checkout/checkout-skeleton';
import { Breadcrumb } from '@/components/ui/breadcrumb';

export const metadata: Metadata = {
  title: 'Checkout - Zimunda Estate',
  description: 'Complete your purchase at Zimunda Estate',
};

const breadcrumbItems = [
  { label: 'Home', href: '/' },
  { label: 'Shop', href: '/shop' },
  { label: 'Cart', href: '/cart' },
  { label: 'Checkout', href: '/checkout' },
];

export default function CheckoutPage() {
  return (
    <div className="min-h-screen bg-gray-50">
      {/* Breadcrumb */}
      <div className="bg-white border-b">
        <div className="container mx-auto px-4 py-4">
          <Breadcrumb items={breadcrumbItems} />
        </div>
      </div>

      {/* Page Header */}
      <div className="bg-white border-b">
        <div className="container mx-auto px-4 py-8">
          <div className="max-w-4xl mx-auto">
            <h1 className="text-3xl font-bold text-gray-900 mb-2">
              Checkout
            </h1>
            <p className="text-gray-600">
              Review your order and complete your purchase
            </p>
          </div>
        </div>
      </div>

      {/* Checkout Content */}
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-4xl mx-auto">
          <Suspense fallback={<CheckoutSkeleton />}>
            <CheckoutContent />
          </Suspense>
        </div>
      </div>
    </div>
  );
}