import { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import prisma from '@/lib/prisma';
import Link from 'next/link';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
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
import { CreditCard, DollarSign, TrendingUp, AlertCircle } from 'lucide-react';
import { formatCurrency } from '@/lib/utils';

export const metadata: Metadata = {
  title: 'Payments Management | Admin Dashboard',
  description: 'View and manage all payment transactions',
};

export default async function PaymentsPage() {
  const session = await getServerSession(authOptions);
  
  if (!session?.user) {
    redirect('/login');
  }

  if (session.user.role !== 'ADMIN' && session.user.role !== 'MANAGER') {
    redirect('/dashboard');
  }

  const [payments, stats] = await Promise.all([
    prisma.payment.findMany({
      include: {
        booking: {
          include: {
            property: {
              select: {
                name: true,
              },
            },
            user: {
              select: {
                name: true,
                email: true,
              },
            },
          },
        },
        order: {
          include: {
            user: {
              select: {
                name: true,
                email: true,
              },
            },
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    }),
    Promise.all([
      prisma.payment.count(),
      prisma.payment.aggregate({
        _sum: {
          amount: true,
        },
      }),
      prisma.payment.count({
        where: {
          status: 'PENDING',
        },
      }),
      prisma.payment.count({
        where: {
          status: 'FAILED',
        },
      }),
    ]),
  ]);

  const totalPayments = stats[0];
  const totalAmount = stats[1]._sum.amount || 0;
  const pendingPayments = stats[2];
  const failedPayments = stats[3];

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

  const getPaymentMethodBadge = (method: string) => {
    switch (method) {
      case 'CREDIT_CARD':
        return 'default';
      case 'DEBIT_CARD':
        return 'default';
      case 'PAYPAL':
        return 'secondary';
      case 'BANK_TRANSFER':
        return 'outline';
      case 'CASH':
        return 'secondary';
      case 'STRIPE':
        return 'default';
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
            <BreadcrumbPage>Payments</BreadcrumbPage>
          </BreadcrumbItem>
        </BreadcrumbList>
      </Breadcrumb>

      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Payments Management</h1>
          <p className="text-muted-foreground">
            View and manage all payment transactions
          </p>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Payments</CardTitle>
            <CreditCard className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalPayments}</div>
            <p className="text-xs text-muted-foreground">
              All payment transactions
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Amount</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(totalAmount)}</div>
            <p className="text-xs text-muted-foreground">
              Total processed amount
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pending Payments</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{pendingPayments}</div>
            <p className="text-xs text-muted-foreground">
              Awaiting processing
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Failed Payments</CardTitle>
            <AlertCircle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{failedPayments}</div>
            <p className="text-xs text-muted-foreground">
              Requires attention
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Payments Table */}
      <Card>
        <CardHeader>
          <CardTitle>All Payments</CardTitle>
        </CardHeader>
        <CardContent>
          {payments.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Transaction ID</TableHead>
                  <TableHead>Customer</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Reference</TableHead>
                  <TableHead>Amount</TableHead>
                  <TableHead>Method</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Date</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {payments.map((payment) => {
                  const customer = payment.booking?.user || payment.order?.user;
                  const reference = payment.booking 
                    ? { type: 'Booking', name: payment.booking.property.name, id: payment.booking.id }
                    : payment.order 
                    ? { type: 'Order', name: `Order #${payment.order.id.slice(0, 8)}`, id: payment.order.id }
                    : { type: 'Unknown', name: 'N/A', id: null };
                  
                  return (
                    <TableRow key={payment.id}>
                      <TableCell className="font-mono text-sm">
                        {payment.transactionId || payment.id.slice(0, 8)}
                      </TableCell>
                      <TableCell>
                        {customer ? (
                          <div>
                            <div className="font-medium">{customer.name || 'No name'}</div>
                            <div className="text-sm text-muted-foreground">{customer.email}</div>
                          </div>
                        ) : (
                          <span className="text-muted-foreground">Unknown</span>
                        )}
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline">{reference.type}</Badge>
                      </TableCell>
                      <TableCell>
                        {reference.id ? (
                          <Link 
                            href={`/admin/${reference.type.toLowerCase()}s/${reference.id}`}
                            className="text-blue-600 hover:underline"
                          >
                            {reference.name}
                          </Link>
                        ) : (
                          <span className="text-muted-foreground">{reference.name}</span>
                        )}
                      </TableCell>
                      <TableCell>
                        <div className="font-medium">{formatCurrency(payment.amount)}</div>
                        <div className="text-xs text-muted-foreground">
                          {payment.currency}
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant={getPaymentMethodBadge(payment.method)}>
                          {payment.method.replace('_', ' ')}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Badge variant={getPaymentStatusBadge(payment.status)}>
                          {payment.status}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="text-sm">
                          {new Date(payment.createdAt).toLocaleDateString()}
                        </div>
                        <div className="text-xs text-muted-foreground">
                          {new Date(payment.createdAt).toLocaleTimeString()}
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          ) : (
            <div className="text-center py-8">
              <CreditCard className="mx-auto h-12 w-12 text-muted-foreground" />
              <h3 className="mt-2 text-sm font-semibold text-muted-foreground">No payments found</h3>
              <p className="mt-1 text-sm text-muted-foreground">
                Payment transactions will appear here when customers make payments.
              </p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}