import { Metadata } from 'next';
import { redirect } from 'next/navigation';
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
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Plus, MoreHorizontal, Eye, Edit, Trash2, Package, DollarSign, TrendingUp, Users } from 'lucide-react';
import Link from 'next/link';
import { formatCurrency } from '@/lib/utils';

export const metadata: Metadata = {
  title: 'Add-ons Management | Admin Dashboard',
  description: 'Manage booking add-ons and extras',
};

export default async function AddonsPage() {
  const session = await getServerSession(authOptions);
  
  if (!session?.user) {
    redirect('/login');
  }

  if (session.user.role !== 'ADMIN' && session.user.role !== 'MANAGER') {
    redirect('/dashboard');
  }

  const [addons, stats] = await Promise.all([
    prisma.addon.findMany({
      include: {
        _count: {
          select: {
            bookingAddons: true,
          },
        },
        bookingAddons: {
          select: {
            quantity: true,
            price: true,
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    }),
    Promise.all([
      prisma.addon.count(),
      prisma.addon.count({
        where: {
          isActive: true,
        },
      }),
      prisma.bookingAddon.aggregate({
        _sum: {
          price: true,
          quantity: true,
        },
      }),
      prisma.bookingAddon.groupBy({
        by: ['addonId'],
        _sum: {
          quantity: true,
        },
        orderBy: {
          _sum: {
            quantity: 'desc',
          },
        },
        take: 1,
      }),
    ]),
  ]);

  const [totalAddons, activeAddons, addonStats, topAddon] = stats;
  const totalRevenue = addonStats._sum.price || 0;
  const totalBookings = addonStats._sum.quantity || 0;

  // Calculate revenue for each addon
  const addonsWithRevenue = addons.map(addon => {
    const revenue = addon.bookingAddons.reduce((sum, booking) => {
      return sum + (booking.price * booking.quantity);
    }, 0);
    const totalUsed = addon.bookingAddons.reduce((sum, booking) => {
      return sum + booking.quantity;
    }, 0);
    return {
      ...addon,
      revenue,
      totalUsed,
    };
  });

  return (
    <div className="flex-1 space-y-4 p-4 md:p-8 pt-6">
      <Breadcrumb>
        <BreadcrumbList>
          <BreadcrumbItem>
            <BreadcrumbLink href="/admin">Dashboard</BreadcrumbLink>
          </BreadcrumbItem>
          <BreadcrumbSeparator />
          <BreadcrumbItem>
            <BreadcrumbPage>Add-ons</BreadcrumbPage>
          </BreadcrumbItem>
        </BreadcrumbList>
      </Breadcrumb>

      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Add-ons Management</h1>
          <p className="text-muted-foreground">
            Manage booking add-ons and extras
          </p>
        </div>
        <Button asChild>
          <Link href="/admin/addons/add">
            <Plus className="mr-2 h-4 w-4" />
            Add New Add-on
          </Link>
        </Button>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Add-ons</CardTitle>
            <Package className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalAddons}</div>
            <p className="text-xs text-muted-foreground">
              {activeAddons} active
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Revenue</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(totalRevenue)}</div>
            <p className="text-xs text-muted-foreground">
              From add-on sales
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Bookings</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalBookings}</div>
            <p className="text-xs text-muted-foreground">
              Add-on bookings
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Avg. Price</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {totalBookings > 0 ? formatCurrency(totalRevenue / totalBookings) : '$0'}
            </div>
            <p className="text-xs text-muted-foreground">
              Per booking
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Add-ons Table */}
      <Card>
        <CardHeader>
          <CardTitle>All Add-ons</CardTitle>
        </CardHeader>
        <CardContent>
          {addonsWithRevenue.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Category</TableHead>
                  <TableHead>Price</TableHead>
                  <TableHead>Times Used</TableHead>
                  <TableHead>Revenue</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Created</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {addonsWithRevenue.map((addon) => (
                  <TableRow key={addon.id}>
                    <TableCell>
                      <div>
                        <div className="font-medium">{addon.name}</div>
                        {addon.description && (
                          <div className="text-sm text-muted-foreground truncate max-w-[200px]">
                            {addon.description}
                          </div>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline">{addon.category}</Badge>
                    </TableCell>
                    <TableCell>{formatCurrency(addon.price)}</TableCell>
                    <TableCell>{addon.totalUsed}</TableCell>
                    <TableCell>{formatCurrency(addon.revenue)}</TableCell>
                    <TableCell>
                      <Badge variant={addon.isActive ? 'default' : 'secondary'}>
                        {addon.isActive ? 'Active' : 'Inactive'}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {new Date(addon.createdAt).toLocaleDateString()}
                    </TableCell>
                    <TableCell className="text-right">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" className="h-8 w-8 p-0">
                            <span className="sr-only">Open menu</span>
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem asChild>
                            <Link href={`/admin/addons/${addon.id}`}>
                              <Eye className="mr-2 h-4 w-4" />
                              View
                            </Link>
                          </DropdownMenuItem>
                          <DropdownMenuItem asChild>
                            <Link href={`/admin/addons/${addon.id}/edit`}>
                              <Edit className="mr-2 h-4 w-4" />
                              Edit
                            </Link>
                          </DropdownMenuItem>
                          <DropdownMenuItem className="text-red-600">
                            <Trash2 className="mr-2 h-4 w-4" />
                            Delete
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : (
            <div className="text-center py-8">
              <Package className="mx-auto h-12 w-12 text-muted-foreground" />
              <h3 className="mt-2 text-sm font-semibold text-gray-900">No add-ons</h3>
              <p className="mt-1 text-sm text-muted-foreground">
                Get started by creating a new add-on.
              </p>
              <div className="mt-6">
                <Button asChild>
                  <Link href="/admin/addons/add">
                    <Plus className="mr-2 h-4 w-4" />
                    Add New Add-on
                  </Link>
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}