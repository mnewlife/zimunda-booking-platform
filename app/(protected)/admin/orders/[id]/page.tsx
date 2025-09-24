import { Metadata } from 'next';
import { notFound, redirect } from 'next/navigation';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from '@/components/ui/breadcrumb';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Edit, Package, User, MapPin, CreditCard } from 'lucide-react';
import { formatCurrency } from '@/lib/utils';

export const metadata: Metadata = {
  title: 'Order Details | Admin Dashboard',
  description: 'View order details and information',
};

interface OrderPageProps {
  params: {
    id: string;
  };
}

export default async function OrderPage({ params }: OrderPageProps) {
  const session = await getServerSession(authOptions);
  
  if (!session?.user) {
    redirect('/auth/signin');
  }

  if (session.user.role !== 'ADMIN' && session.user.role !== 'MANAGER') {
    redirect('/dashboard');
  }

  const order = await prisma.order.findUnique({
    where: {
      id: params.id,
    },
    include: {
      user: true,
      items: {
        include: {
          product: {
            include: {
              images: {
                take: 1,
                orderBy: {
                  order: 'asc',
                },
              },
            },
          },
          variant: true,
        },
      },
      payments: {
        orderBy: {
          createdAt: 'desc',
        },
      },
    },
  });

  if (!order) {
    notFound();
  }

  const getOrderStatusBadge = (status: string) => {
    switch (status) {
      case 'COMPLETED':
        return 'default';
      case 'PENDING':
        return 'secondary';
      case 'PROCESSING':
        return 'default';
      case 'SHIPPED':
        return 'default';
      case 'CANCELLED':
        return 'destructive';
      default:
        return 'secondary';
    }
  };

  const getPaymentStatusBadge = (status: string) => {
    switch (status) {
      case 'PAID':
        return 'default';
      case 'PENDING':
        return 'secondary';
      case 'FAILED':
        return 'destructive';
      case 'REFUNDED':
        return 'outline';
      default:
        return 'secondary';
    }
  };

  return (
    <div className="flex-1 space-y-4 p-4 md:p-8 pt-6">
      <Breadcrumb>
        <BreadcrumbList>
          <BreadcrumbItem>
            <BreadcrumbLink href="/admin">Dashboard</BreadcrumbLink>
          </BreadcrumbItem>
          <BreadcrumbSeparator />
          <BreadcrumbItem>
            <BreadcrumbLink href="/admin/orders">Orders</BreadcrumbLink>
          </BreadcrumbItem>
          <BreadcrumbSeparator />
          <BreadcrumbItem>
            <BreadcrumbPage>Order #{order.id.slice(0, 8)}</BreadcrumbPage>
          </BreadcrumbItem>
        </BreadcrumbList>
      </Breadcrumb>

      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">
            Order #{order.id.slice(0, 8)}
          </h1>
          <p className="text-muted-foreground">
            Order details and transaction information
          </p>
        </div>
        <div className="flex items-center space-x-2">
          <Badge variant={getOrderStatusBadge(order.status)} className="text-sm">
            {order.status}
          </Badge>
          <Badge variant={getPaymentStatusBadge(order.paymentStatus)} className="text-sm">
            {order.paymentStatus}
          </Badge>
        </div>
      </div>

      <div className="grid gap-6 md:grid-cols-3">
        {/* Order Summary */}
        <div className="md:col-span-2 space-y-6">
          {/* Order Items */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <Package className="mr-2 h-5 w-5" />
                Order Items
              </CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Product</TableHead>
                    <TableHead>Variant</TableHead>
                    <TableHead>Quantity</TableHead>
                    <TableHead>Price</TableHead>
                    <TableHead className="text-right">Total</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {order.items.map((item) => (
                    <TableRow key={item.id}>
                      <TableCell>
                        <div className="flex items-center space-x-3">
                          {item.product.images[0] && (
                            <div className="h-10 w-10 rounded-md bg-gray-100 flex-shrink-0">
                              <img
                                src={item.product.images[0].url}
                                alt={item.product.name}
                                className="h-10 w-10 rounded-md object-cover"
                              />
                            </div>
                          )}
                          <div>
                            <Link 
                              href={`/admin/products/${item.product.id}`}
                              className="font-medium text-blue-600 hover:underline"
                            >
                              {item.product.name}
                            </Link>
                            <div className="text-sm text-muted-foreground">
                              {item.product.category}
                            </div>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        {item.variant ? (
                          <div>
                            <div className="font-medium">{item.variant.name}</div>
                            <div className="text-sm text-muted-foreground">
                              SKU: {item.variant.sku}
                            </div>
                          </div>
                        ) : (
                          <span className="text-muted-foreground">Base Product</span>
                        )}
                      </TableCell>
                      <TableCell>{item.quantity}</TableCell>
                      <TableCell>{formatCurrency(item.price)}</TableCell>
                      <TableCell className="text-right font-medium">
                        {formatCurrency(item.price * item.quantity)}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
              
              <Separator className="my-4" />
              
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span>Subtotal</span>
                  <span>{formatCurrency(order.subtotal)}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span>Tax</span>
                  <span>{formatCurrency(order.total - order.subtotal)}</span>
                </div>
                <Separator />
                <div className="flex justify-between font-medium text-lg">
                  <span>Total</span>
                  <span>{formatCurrency(order.total)}</span>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Payment Information */}
          {order.payments.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <CreditCard className="mr-2 h-5 w-5" />
                  Payment History
                </CardTitle>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Date</TableHead>
                      <TableHead>Method</TableHead>
                      <TableHead>Amount</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Transaction ID</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {order.payments.map((payment) => (
                      <TableRow key={payment.id}>
                        <TableCell>
                          {new Date(payment.createdAt).toLocaleDateString()}
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline">{payment.method}</Badge>
                        </TableCell>
                        <TableCell>{formatCurrency(payment.amount)}</TableCell>
                        <TableCell>
                          <Badge variant={getPaymentStatusBadge(payment.status)}>
                            {payment.status}
                          </Badge>
                        </TableCell>
                        <TableCell className="font-mono text-sm">
                          {payment.transactionId || 'N/A'}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Order Details Sidebar */}
        <div className="space-y-6">
          {/* Customer Information */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <User className="mr-2 h-5 w-5" />
                Customer
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center space-x-3">
                <div className="h-10 w-10 rounded-full bg-gradient-to-r from-blue-500 to-purple-600 flex items-center justify-center text-white text-sm font-medium">
                  {order.user.name?.charAt(0).toUpperCase() || order.user.email.charAt(0).toUpperCase()}
                </div>
                <div>
                  <div className="font-medium">{order.user.name || 'No name'}</div>
                  <div className="text-sm text-muted-foreground">{order.user.email}</div>
                </div>
              </div>
              
              <div className="space-y-2 text-sm">
                <div>
                  <span className="font-medium">Role:</span>
                  <Badge variant="outline" className="ml-2">{order.user.role}</Badge>
                </div>
                <div>
                  <span className="font-medium">Member since:</span>
                  <span className="ml-2">
                    {new Date(order.user.createdAt).toLocaleDateString()}
                  </span>
                </div>
                {order.user.phone && (
                  <div>
                    <span className="font-medium">Phone:</span>
                    <span className="ml-2">{order.user.phone}</span>
                  </div>
                )}
              </div>
              
              <Button variant="outline" size="sm" asChild className="w-full">
                <Link href={`/admin/users/${order.user.id}`}>
                  View Customer Profile
                </Link>
              </Button>
            </CardContent>
          </Card>

          {/* Shipping Information */}
          {order.shippingAddress && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <MapPin className="mr-2 h-5 w-5" />
                  Shipping Address
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-sm whitespace-pre-line">
                  {order.shippingAddress}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Order Information */}
          <Card>
            <CardHeader>
              <CardTitle>Order Information</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm">
              <div>
                <span className="font-medium">Order ID:</span>
                <div className="font-mono text-xs mt-1 p-2 bg-gray-100 rounded">
                  {order.id}
                </div>
              </div>
              <div>
                <span className="font-medium">Order Date:</span>
                <div className="mt-1">
                  {new Date(order.createdAt).toLocaleDateString('en-US', {
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit'
                  })}
                </div>
              </div>
              <div>
                <span className="font-medium">Last Updated:</span>
                <div className="mt-1">
                  {new Date(order.updatedAt).toLocaleDateString('en-US', {
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit'
                  })}
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}