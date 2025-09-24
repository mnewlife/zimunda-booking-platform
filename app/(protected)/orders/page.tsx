import { Suspense } from 'react';
import { Metadata } from 'next';
import { OrdersList } from '@/components/orders/orders-list';
import { OrdersListSkeleton } from '@/components/orders/orders-list-skeleton';
import { Breadcrumb, BreadcrumbItem, BreadcrumbLink, BreadcrumbList, BreadcrumbPage, BreadcrumbSeparator } from '@/components/ui/breadcrumb';

export const metadata: Metadata = {
  title: 'My Orders | Zimunda Estate',
  description: 'View and manage your orders, bookings, and purchases.',
};

export default function OrdersPage() {
  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Breadcrumb */}
        <Breadcrumb className="mb-6">
          <BreadcrumbList>
            <BreadcrumbItem>
              <BreadcrumbLink href="/">Home</BreadcrumbLink>
            </BreadcrumbItem>
            <BreadcrumbSeparator />
            <BreadcrumbItem>
              <BreadcrumbPage>My Orders</BreadcrumbPage>
            </BreadcrumbItem>
          </BreadcrumbList>
        </Breadcrumb>

        {/* Page Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">My Orders</h1>
          <p className="mt-2 text-gray-600">
            Track and manage your orders, bookings, and purchases.
          </p>
        </div>

        {/* Orders List */}
        <Suspense fallback={<OrdersListSkeleton />}>
          <OrdersList />
        </Suspense>
      </div>
    </div>
  );
}