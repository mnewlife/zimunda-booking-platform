import { Metadata } from 'next';
import { redirect, notFound } from 'next/navigation';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import prisma from '@/lib/prisma';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
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
import { Edit, DollarSign, Users, TrendingUp, Calendar } from 'lucide-react';
import Link from 'next/link';
import { formatCurrency } from '@/lib/utils';

export const metadata: Metadata = {
  title: 'Add-on Details | Admin Dashboard',
  description: 'View add-on details and statistics',
};

interface AddonDetailsPageProps {
  params: {
    id: string;
  };
}

export default async function AddonDetailsPage({ params }: AddonDetailsPageProps) {
  const session = await getServerSession(authOptions);
  
  if (!session?.user) {
    redirect('/login');
  }

  if (session.user.role !== 'ADMIN' && session.user.role !== 'MANAGER') {
    redirect('/dashboard');
  }

  const [addon, recentBookings, stats] = await Promise.all([
    prisma.addon.findUnique({
      where: {
        id: params.id,
      },
      include: {
        bookingAddons: {
          include: {
            booking: {
              include: {
                user: {
                  select: {
                    name: true,
                    email: true,
                  },
                },
                property: {
                  select: {
                    name: true,
                  },
                },
              },
            },
          },
          orderBy: {
            createdAt: 'desc',
          },
          take: 10,
        },
      },
    }),
    prisma.bookingAddon.findMany({
      where: {
        addonId: params.id,
      },
      include: {
        booking: {
          include: {
            user: {
              select: {
                name: true,
                email: true,
              },
            },
            property: {
              select: {
                name: true,
              },
            },
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
      take: 10,
    }),
    prisma.bookingAddon.aggregate({
      where: {
        addonId: params.id,
      },
      _sum: {
        quantity: true,
        price: true,
      },
      _count: true,
    }),
  ]);

  if (!addon) {
    notFound();
  }

  const totalQuantity = stats._sum.quantity || 0;
  const totalRevenue = stats._sum.price || 0;
  const totalBookings = stats._count;
  const averagePrice = totalBookings > 0 ? totalRevenue / totalBookings : 0;

  const formatCategoryName = (category: string) => {
    return category
      .split('_')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
      .join(' ');
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
            <BreadcrumbLink href="/admin/addons">Add-ons</BreadcrumbLink>
          </BreadcrumbItem>
          <BreadcrumbSeparator />
          <BreadcrumbItem>
            <BreadcrumbPage>{addon.name}</BreadcrumbPage>
          </BreadcrumbItem>
        </BreadcrumbList>
      </Breadcrumb>

      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">{addon.name}</h1>
          <p className="text-muted-foreground">
            Add-on details and booking statistics
          </p>
        </div>
        <Button asChild>
          <Link href={`/admin/addons/${addon.id}/edit`}>
            <Edit className="mr-2 h-4 w-4" />
            Edit Add-on
          </Link>
        </Button>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Revenue</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(totalRevenue)}</div>
            <p className="text-xs text-muted-foreground">
              From {totalBookings} bookings
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Quantity</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalQuantity}</div>
            <p className="text-xs text-muted-foreground">
              Units booked
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Average Price</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(averagePrice)}</div>
            <p className="text-xs text-muted-foreground">
              Per booking
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Bookings</CardTitle>
            <Calendar className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalBookings}</div>
            <p className="text-xs text-muted-foreground">
              Times booked
            </p>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        {/* Add-on Details */}
        <Card>
          <CardHeader>
            <CardTitle>Add-on Information</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <label className="text-sm font-medium text-muted-foreground">Name</label>
              <p className="text-sm">{addon.name}</p>
            </div>
            
            <div>
              <label className="text-sm font-medium text-muted-foreground">Category</label>
              <div className="mt-1">
                <Badge variant="outline">{formatCategoryName(addon.category)}</Badge>
              </div>
            </div>
            
            <div>
              <label className="text-sm font-medium text-muted-foreground">Price</label>
              <p className="text-sm">{formatCurrency(addon.price)}</p>
            </div>
            
            <div>
              <label className="text-sm font-medium text-muted-foreground">Status</label>
              <div className="mt-1">
                <Badge variant={addon.isActive ? 'default' : 'secondary'}>
                  {addon.isActive ? 'Active' : 'Inactive'}
                </Badge>
              </div>
            </div>
            
            {addon.description && (
              <div>
                <label className="text-sm font-medium text-muted-foreground">Description</label>
                <p className="text-sm mt-1">{addon.description}</p>
              </div>
            )}
            
            <div>
              <label className="text-sm font-medium text-muted-foreground">Created</label>
              <p className="text-sm">{new Date(addon.createdAt).toLocaleDateString()}</p>
            </div>
            
            <div>
              <label className="text-sm font-medium text-muted-foreground">Last Updated</label>
              <p className="text-sm">{new Date(addon.updatedAt).toLocaleDateString()}</p>
            </div>
          </CardContent>
        </Card>

        {/* Recent Bookings */}
        <Card>
          <CardHeader>
            <CardTitle>Recent Bookings</CardTitle>
          </CardHeader>
          <CardContent>
            {recentBookings.length > 0 ? (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Guest</TableHead>
                    <TableHead>Property</TableHead>
                    <TableHead>Qty</TableHead>
                    <TableHead>Price</TableHead>
                    <TableHead>Date</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {recentBookings.map((bookingAddon) => (
                    <TableRow key={bookingAddon.id}>
                      <TableCell>
                        <div>
                          <div className="font-medium">
                            {bookingAddon.booking.user.name}
                          </div>
                          <div className="text-sm text-muted-foreground">
                            {bookingAddon.booking.user.email}
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>{bookingAddon.booking.property.name}</TableCell>
                      <TableCell>{bookingAddon.quantity}</TableCell>
                      <TableCell>{formatCurrency(bookingAddon.price)}</TableCell>
                      <TableCell>
                        {new Date(bookingAddon.createdAt).toLocaleDateString()}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            ) : (
              <p className="text-muted-foreground text-center py-4">
                No bookings yet for this add-on.
              </p>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}