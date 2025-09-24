import { Suspense } from 'react';
import { Metadata } from 'next/metadata';
import { notFound } from 'next/navigation';
import { auth } from '@/lib/auth';
import prisma from '@/lib/prisma';
import { headers } from 'next/headers';
import { OrderDetails } from '@/components/orders/order-details';
import { OrderSkeleton } from '@/components/orders/order-skeleton';
import { Breadcrumb } from '@/components/ui/breadcrumb';

interface OrderPageProps {
  params: {
    id: string;
  };
}

export async function generateMetadata({ params }: OrderPageProps): Promise<Metadata> {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session?.user?.id) {
    return {
      title: 'Order Not Found - Zimunda Estate',
    };
  }

  const order = await prisma.order.findFirst({
    where: {
      id: params.id,
      userId: session.user.id,
    },
    select: {
      orderNumber: true,
      status: true,
    },
  });

  if (!order) {
    return {
      title: 'Order Not Found - Zimunda Estate',
    };
  }

  return {
    title: `Order ${order.orderNumber} - Zimunda Estate`,
    description: `View details for order ${order.orderNumber}`,
  };
}

async function getOrder(orderId: string, userId: string) {
  const order = await prisma.order.findFirst({
    where: {
      id: orderId,
      userId,
    },
    include: {
      items: {
        include: {
          product: {
            select: {
              id: true,
              name: true,
              slug: true,
              images: true,
              category: true,
            },
          },
          variant: {
            select: {
              id: true,
              name: true,
              images: true,
            },
          },
        },
      },
      bookings: {
        include: {
          property: {
            select: {
              id: true,
              name: true,
              slug: true,
              images: true,
              location: true,
            },
          },
        },
      },
      activityBookings: {
        include: {
          activity: {
            select: {
              id: true,
              name: true,
              slug: true,
              images: true,
              location: true,
              duration: true,
            },
          },
        },
      },
    },
  });

  return order;
}

export default async function OrderPage({ params }: OrderPageProps) {
  const session = await auth.api.getSession({ headers: await headers() });
  
  if (!session?.user?.id) {
    notFound();
  }

  const order = await getOrder(params.id, session.user.id);
  
  if (!order) {
    notFound();
  }

  const breadcrumbItems = [
    { label: 'Home', href: '/' },
    { label: 'Dashboard', href: '/dashboard' },
    { label: 'Orders', href: '/dashboard?tab=bookings' },
    { label: order.orderNumber, href: `/orders/${order.id}` },
  ];

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
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-3xl font-bold text-gray-900 mb-2">
                  Order {order.orderNumber}
                </h1>
                <p className="text-gray-600">
                  Placed on {new Date(order.createdAt).toLocaleDateString('en-US', {
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric',
                  })}
                </p>
              </div>
              <div className="text-right">
                <div className="text-2xl font-bold text-gray-900">
                  ${order.total.toFixed(2)}
                </div>
                <div className="text-sm text-gray-500">
                  {order.type === 'product' ? 'Product Order' : 
                   order.type === 'property' ? 'Property Booking' : 
                   'Activity Booking'}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Order Content */}
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-4xl mx-auto">
          <Suspense fallback={<OrderSkeleton />}>
            <OrderDetails order={order} />
          </Suspense>
        </div>
      </div>
    </div>
  );
}