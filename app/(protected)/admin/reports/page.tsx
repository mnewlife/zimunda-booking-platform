import { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { headers } from 'next/headers';
import { auth } from '@/lib/auth';
import prisma from '@/lib/prisma';
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
/*import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  LineChart,
  Line
} from 'recharts';*/
import { 
  DollarSign, 
  TrendingUp, 
  Users, 
  Calendar,
  ShoppingCart,
  Home,
  Activity,
  Package
} from 'lucide-react';
import { formatCurrency } from '@/lib/utils';

export const metadata: Metadata = {
  title: 'Reports & Analytics | Admin Dashboard',
  description: 'View business analytics and reports',
};

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884D8'];

export default async function ReportsPage() {
  const session = await auth.api.getSession({ headers: await headers() });
  
  if (!session?.user || (session.user as any).role !== 'ADMIN') {
    redirect('/login');
  }

  // Get current date and calculate date ranges
  const now = new Date();
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
  const startOfLastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
  const endOfLastMonth = new Date(now.getFullYear(), now.getMonth(), 0);
  const startOfYear = new Date(now.getFullYear(), 0, 1);

  const [overallStats, monthlyRevenue, bookingsByProperty, productSales, userGrowth] = await Promise.all([
    // Overall Statistics
    Promise.all([
      prisma.booking.aggregate({
        _sum: { totalPrice: true },
        _count: true,
      }),
      prisma.order.aggregate({
        _sum: { total: true },
        _count: true,
      }),
      prisma.user.count(),
      prisma.property.count(),
      prisma.activity.count(),
      prisma.product.count(),
    ]),
    
    // Monthly Revenue for the last 6 months
    Promise.all(
      Array.from({ length: 6 }, (_, i) => {
        const monthStart = new Date(now.getFullYear(), now.getMonth() - i, 1);
        const monthEnd = new Date(now.getFullYear(), now.getMonth() - i + 1, 0);
        const monthName = monthStart.toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
        
        return Promise.all([
          prisma.booking.aggregate({
            where: {
              createdAt: {
                gte: monthStart,
                lte: monthEnd,
              },
            },
            _sum: { totalPrice: true },
          }),
          prisma.order.aggregate({
            where: {
              createdAt: {
                gte: monthStart,
                lte: monthEnd,
              },
            },
            _sum: { total: true },
          }),
        ]).then(([bookings, orders]) => ({
          month: monthName,
          bookings: bookings._sum.totalPrice || 0,
          orders: orders._sum.total || 0,
          total: (bookings._sum.totalPrice || 0) + (orders._sum.total || 0),
        }));
      })
    ),
    
    // Bookings by Property
    prisma.property.findMany({
      include: {
        _count: {
          select: {
            bookings: true,
          },
        },
        bookings: {
          select: {
            totalPrice: true,
          },
        },
      },
      orderBy: {
        bookings: {
          _count: 'desc',
        },
      },
      take: 10,
    }),
    
    // Product Sales
    prisma.product.findMany({
      include: {
        orders: {
          select: {
            quantity: true,
            price: true,
          },
        },
      },
      orderBy: {
        orders: {
          _count: 'desc',
        },
      },
      take: 10,
    }),
    
    // User Growth (last 12 months)
    Promise.all(
      Array.from({ length: 12 }, (_, i) => {
        const monthStart = new Date(now.getFullYear(), now.getMonth() - i, 1);
        const monthEnd = new Date(now.getFullYear(), now.getMonth() - i + 1, 0);
        const monthName = monthStart.toLocaleDateString('en-US', { month: 'short' });
        
        return prisma.user.count({
          where: {
            createdAt: {
              gte: monthStart,
              lte: monthEnd,
            },
          },
        }).then(count => ({
          month: monthName,
          users: count,
        }));
      })
    ),
  ]);

  const [bookingStats, orderStats, totalUsers, totalProperties, totalActivities, totalProducts] = overallStats;
  
  const totalBookingRevenue = bookingStats._sum.totalPrice || 0;
  const totalOrderRevenue = orderStats._sum.total || 0;
  const totalRevenue = totalBookingRevenue + totalOrderRevenue;
  const totalBookings = bookingStats._count;
  const totalOrders = orderStats._count;

  // Process data for charts
  const revenueData = monthlyRevenue.reverse();
  const userGrowthData = userGrowth.reverse();
  
  const propertyData = bookingsByProperty.map(property => ({
    name: property.name,
    bookings: property._count.bookings,
    revenue: property.bookings.reduce((sum, booking) => sum + booking.totalPrice, 0),
  }));
  
  const productData = productSales.map(product => {
    const totalQuantity = product.orders.reduce((sum, item) => sum + item.quantity, 0);
    const totalRevenue = product.orders.reduce((sum, item) => sum + (item.price * item.quantity), 0);
    return {
      name: product.name,
      quantity: totalQuantity,
      revenue: totalRevenue,
    };
  }).filter(item => item.quantity > 0);

  return (
    <div className="flex-1 space-y-4 p-4 md:p-8 pt-6">
      <Breadcrumb>
        <BreadcrumbList>
          <BreadcrumbItem>
            <BreadcrumbLink href="/admin">Dashboard</BreadcrumbLink>
          </BreadcrumbItem>
          <BreadcrumbSeparator />
          <BreadcrumbItem>
            <BreadcrumbPage>Reports</BreadcrumbPage>
          </BreadcrumbItem>
        </BreadcrumbList>
      </Breadcrumb>

      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Reports & Analytics</h1>
          <p className="text-muted-foreground">
            Business insights and performance metrics
          </p>
        </div>
      </div>

      {/* Overview Stats */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Revenue</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(totalRevenue)}</div>
            <p className="text-xs text-muted-foreground">
              Bookings + Orders
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
              {formatCurrency(totalBookingRevenue)} revenue
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Orders</CardTitle>
            <ShoppingCart className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalOrders}</div>
            <p className="text-xs text-muted-foreground">
              {formatCurrency(totalOrderRevenue)} revenue
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Users</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalUsers}</div>
            <p className="text-xs text-muted-foreground">
              Registered users
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Business Overview */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Properties</CardTitle>
            <Home className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalProperties}</div>
            <p className="text-xs text-muted-foreground">
              Available properties
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Activities</CardTitle>
            <Activity className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalActivities}</div>
            <p className="text-xs text-muted-foreground">
              Available activities
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Products</CardTitle>
            <Package className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalProducts}</div>
            <p className="text-xs text-muted-foreground">
              Available products
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Avg. Order Value</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {totalOrders > 0 ? formatCurrency(totalOrderRevenue / totalOrders) : '$0'}
            </div>
            <p className="text-xs text-muted-foreground">
              Per order
            </p>
          </CardContent>
        </Card>
      </div>

      {/*<div className="grid gap-6 md:grid-cols-2">*/}
        {/* Revenue Chart */}
        {/*<Card>
          <CardHeader>
            <CardTitle>Revenue Trend (Last 6 Months)</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={revenueData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="month" />
                <YAxis />
                <Tooltip formatter={(value) => formatCurrency(Number(value))} />
                <Bar dataKey="bookings" stackId="a" fill="#8884d8" name="Bookings" />
                <Bar dataKey="orders" stackId="a" fill="#82ca9d" name="Orders" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>*/}

        {/* User Growth Chart */}
        {/*<Card>
          <CardHeader>
            <CardTitle>User Growth (Last 12 Months)</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={userGrowthData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="month" />
                <YAxis />
                <Tooltip />
                <Line type="monotone" dataKey="users" stroke="#8884d8" strokeWidth={2} />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>*/}

      <div className="grid gap-6 md:grid-cols-2">
        {/* Top Properties */}
        <Card>
          <CardHeader>
            <CardTitle>Top Properties by Bookings</CardTitle>
          </CardHeader>
          <CardContent>
            {propertyData.length > 0 ? (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Property</TableHead>
                    <TableHead>Bookings</TableHead>
                    <TableHead>Revenue</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {propertyData.slice(0, 5).map((property, index) => (
                    <TableRow key={index}>
                      <TableCell className="font-medium">{property.name}</TableCell>
                      <TableCell>{property.bookings}</TableCell>
                      <TableCell>{formatCurrency(property.revenue)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            ) : (
              <p className="text-muted-foreground text-center py-4">
                No booking data available.
              </p>
            )}
          </CardContent>
        </Card>

        {/* Top Products */}
        <Card>
          <CardHeader>
            <CardTitle>Top Products by Sales</CardTitle>
          </CardHeader>
          <CardContent>
            {productData.length > 0 ? (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Product</TableHead>
                    <TableHead>Sold</TableHead>
                    <TableHead>Revenue</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {productData.slice(0, 5).map((product, index) => (
                    <TableRow key={index}>
                      <TableCell className="font-medium">{product.name}</TableCell>
                      <TableCell>{product.quantity}</TableCell>
                      <TableCell>{formatCurrency(product.revenue)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            ) : (
              <p className="text-muted-foreground text-center py-4">
                No product sales data available.
              </p>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}