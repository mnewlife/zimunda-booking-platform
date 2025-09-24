import { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { auth } from '@/lib/auth';
import { headers } from 'next/headers';
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
import { Separator } from '@/components/ui/separator';
import {
  SidebarInset,
  SidebarProvider,
  SidebarTrigger,
} from '@/components/ui/sidebar';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { RevenueChart } from '@/components/charts/revenue-chart';
import { BookingsChart } from '@/components/charts/bookings-chart';
import {
  Calendar,
  Users,
  DollarSign,
  TrendingUp,
  Home,
  Activity,
  CreditCard,
  UserCheck,
  Eye,
  Edit,
  Trash2,
  Plus,
  Download,
  Filter,
  Search,
  MoreHorizontal,
  ArrowUpRight,
  ArrowDownRight,
} from 'lucide-react';
import Link from 'next/link';
import Image from 'next/image';
import { cn } from '@/lib/utils';
import { AdminSidebar } from '@/components/admin-sidebar';
import { prisma } from '@/lib/db';

// Helper function to get status colors
const getStatusColor = (status: string) => {
  if (!status) return 'bg-gray-100 text-gray-800 hover:bg-gray-200';
  switch (status.toLowerCase()) {
    case 'active':
    case 'confirmed':
    case 'available':
      return 'bg-green-100 text-green-800 hover:bg-green-200';
    case 'pending':
    case 'processing':
      return 'bg-yellow-100 text-yellow-800 hover:bg-yellow-200';
    case 'inactive':
    case 'cancelled':
    case 'unavailable':
      return 'bg-red-100 text-red-800 hover:bg-red-200';
    case 'completed':
    case 'paid':
      return 'bg-blue-100 text-blue-800 hover:bg-blue-200';
    default:
      return 'bg-gray-100 text-gray-800 hover:bg-gray-200';
  }
};

export const metadata: Metadata = {
  title: 'Admin Dashboard | Zimunda Estate',
  description: 'Manage properties, bookings, and users',
};

// Real database queries
const getAdminStats = async () => {
  const [totalBookings, totalUsers, totalProperties, totalActivities, revenueData] = await Promise.all([
    prisma.booking.count({
      where: { status: 'CONFIRMED' }
    }),
    prisma.user.count(),
    prisma.property.count(),
    prisma.activity.count(),
    prisma.booking.aggregate({
      _sum: { totalPrice: true },
      where: { 
        paymentStatus: 'COMPLETED',
        createdAt: {
          gte: new Date(new Date().getFullYear(), new Date().getMonth(), 1)
        }
      }
    })
  ]);

  const lastMonthRevenue = await prisma.booking.aggregate({
    _sum: { totalPrice: true },
    where: {
      paymentStatus: 'COMPLETED',
      createdAt: {
        gte: new Date(new Date().getFullYear(), new Date().getMonth() - 1, 1),
        lt: new Date(new Date().getFullYear(), new Date().getMonth(), 1)
      }
    }
  });

  const currentRevenue = revenueData._sum.totalPrice || 0;
  const previousRevenue = lastMonthRevenue._sum.totalPrice || 0;
  const monthlyGrowth = previousRevenue > 0 ? ((currentRevenue - previousRevenue) / previousRevenue) * 100 : 0;

  return {
    totalRevenue: currentRevenue,
    totalBookings,
    totalUsers,
    totalProperties,
    totalActivities,
    monthlyGrowth: Math.round(monthlyGrowth * 10) / 10,
    occupancyRate: 78, // Calculate based on actual data
    averageRating: 4.7, // Calculate based on actual reviews
  };
};

const getRevenueData = async () => {
  return [
    { month: 'Jan', revenue: 4200, bookings: 18 },
    { month: 'Feb', revenue: 3800, bookings: 16 },
    { month: 'Mar', revenue: 5200, bookings: 22 },
    { month: 'Apr', revenue: 4600, bookings: 20 },
    { month: 'May', revenue: 6100, bookings: 26 },
    { month: 'Jun', revenue: 5800, bookings: 24 },
    { month: 'Jul', revenue: 7200, bookings: 30 },
    { month: 'Aug', revenue: 6800, bookings: 28 },
    { month: 'Sep', revenue: 5900, bookings: 25 },
    { month: 'Oct', revenue: 6400, bookings: 27 },
    { month: 'Nov', revenue: 5600, bookings: 23 },
    { month: 'Dec', revenue: 7100, bookings: 29 },
  ];
};

const getBookingsByType = async () => {
  return [
    { name: 'Properties', value: 180, color: '#3B82F6' },
    { name: 'Activities', value: 54, color: '#10B981' },
  ];
};

const getRecentBookings = async () => {
  const bookings = await prisma.booking.findMany({
    take: 10,
    orderBy: { createdAt: 'desc' },
    include: {
      guest: {
        select: {
          name: true,
          email: true
        }
      },
      property: {
        select: {
          name: true
        }
      },
      activities: {
        select: {
          activity: {
            select: {
              name: true
            }
          }
        }
      }
    }
  });

  return bookings.map(booking => ({
    id: booking.id,
    type: booking.type,
    customer: booking.guest.name || 'Unknown',
      email: booking.guest.email,
    property: booking.property?.name || (booking.activities?.[0]?.activity?.name) || 'Unknown',
    checkIn: booking.checkIn?.toISOString().split('T')[0] || null,
    checkOut: booking.checkOut?.toISOString().split('T')[0] || null,
    date: booking.date?.toISOString().split('T')[0] || null,
    guests: booking.guests || 1,
    amount: booking.totalPrice,
    status: booking.status,
    paymentStatus: booking.paymentStatus,
    createdAt: booking.createdAt.toISOString(),
  }));
};

const getProperties = async () => {
  return await prisma.property.findMany({
    include: {
      bookings: {
        where: {
          status: 'CONFIRMED'
        }
      },
      images: {
        take: 1
      }
    }
  });
};

const getUsers = async () => {
  return await prisma.user.findMany({
    include: {
      bookings: {
        where: {
          status: 'CONFIRMED'
        }
      }
    },
    orderBy: {
      createdAt: 'desc'
    },
    take: 20
  });
};



export default async function AdminDashboardPage() {
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  if (!session || session.user.role !== 'ADMIN') {
    redirect('/dashboard');
  }

  const stats = await getAdminStats();
  const revenueData = await getRevenueData();
  const bookingsByType = await getBookingsByType();
  const recentBookings = await getRecentBookings();
  const properties = await getProperties();
  const users = await getUsers();

  const adminUser = {
    name: session.user.name || 'Admin',
    email: session.user.email,
    avatar: session.user.image || undefined,
  };

  return (
      <SidebarInset>
        <header className="flex h-16 shrink-0 items-center gap-2 transition-[width,height] ease-linear group-has-[[data-collapsible=icon]]/sidebar-wrapper:h-12">
          <div className="flex items-center gap-2 px-4">
            <SidebarTrigger className="-ml-1" />
            <Separator orientation="vertical" className="mr-2 h-4" />
            <Breadcrumb>
              <BreadcrumbList>
                <BreadcrumbItem className="hidden md:block">
                  <BreadcrumbLink href="/dashboard">
                    Dashboard
                  </BreadcrumbLink>
                </BreadcrumbItem>
                <BreadcrumbSeparator className="hidden md:block" />
                <BreadcrumbItem>
                  <BreadcrumbPage>Admin</BreadcrumbPage>
                </BreadcrumbItem>
              </BreadcrumbList>
            </Breadcrumb>
          </div>
        </header>
        <div className="flex flex-1 flex-col gap-4 p-4 pt-0">
        {/* Header */}
        <div className="mb-6">
          <h1 className="text-2xl font-bold tracking-tight">
            Dashboard Overview
          </h1>
          <p className="text-muted-foreground">
            Monitor your business performance and manage operations.
          </p>
        </div>

        {/* Key Metrics */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4 mb-6">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                Total Revenue
              </CardTitle>
              <DollarSign className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">${stats.totalRevenue.toLocaleString()}</div>
              <p className="text-xs text-muted-foreground flex items-center">
                {stats.monthlyGrowth >= 0 ? (
                  <ArrowUpRight className="h-3 w-3 mr-1 text-green-600" />
                ) : (
                  <ArrowDownRight className="h-3 w-3 mr-1 text-red-600" />
                )}
                {Math.abs(stats.monthlyGrowth)}% from last month
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                Total Bookings
              </CardTitle>
              <Calendar className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.totalBookings}</div>
              <p className="text-xs text-muted-foreground">
                {stats.occupancyRate}% occupancy rate
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                Total Users
              </CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.totalUsers}</div>
              <p className="text-xs text-muted-foreground">
                Active customers
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                Properties
              </CardTitle>
              <Home className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.totalProperties}</div>
              <p className="text-xs text-muted-foreground">
                {stats.totalActivities} activities
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Charts */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-7 mb-6">
          <Card className="col-span-4">
            <CardHeader>
              <CardTitle>Revenue Overview</CardTitle>
            </CardHeader>
            <CardContent className="pl-2">
              <RevenueChart data={revenueData} />
            </CardContent>
          </Card>

          <Card className="col-span-3">
            <CardHeader>
              <CardTitle>Bookings by Type</CardTitle>
            </CardHeader>
            <CardContent>
              <BookingsChart data={bookingsByType} />
            </CardContent>
          </Card>
        </div>

        {/* Recent Activity & Management */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-7 mb-6">
          <Card className="col-span-4">
            <CardHeader>
              <CardTitle>Recent Bookings</CardTitle>
              <p className="text-sm text-muted-foreground">
                Latest booking activity from your customers.
              </p>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {recentBookings.slice(0, 5).map((booking) => (
                   <div key={booking.id} className="flex items-center space-x-4">
                     <div className="flex-1 space-y-1">
                       <p className="text-sm font-medium leading-none">
                         {booking.customerName}
                       </p>
                       <p className="text-sm text-muted-foreground">
                         {booking.propertyName || booking.activityName}
                       </p>
                     </div>
                     <div className="text-right">
                       <p className="text-sm font-medium">${booking.totalPrice}</p>
                       <p className="text-xs text-muted-foreground">
                         {booking.checkIn ? new Date(booking.checkIn).toLocaleDateString() : 
                          booking.date ? new Date(booking.date).toLocaleDateString() : 'N/A'}
                       </p>
                     </div>
                   </div>
                 ))}
              </div>
            </CardContent>
          </Card>

          <Card className="col-span-3">
            <CardHeader>
              <CardTitle>Quick Actions</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <Button className="w-full justify-start" variant="outline">
                <Plus className="mr-2 h-4 w-4" />
                Add New Property
              </Button>
              <Button className="w-full justify-start" variant="outline">
                <Calendar className="mr-2 h-4 w-4" />
                View All Bookings
              </Button>
              <Button className="w-full justify-start" variant="outline">
                <Users className="mr-2 h-4 w-4" />
                Manage Users
              </Button>
              <Button className="w-full justify-start" variant="outline">
                <Activity className="mr-2 h-4 w-4" />
                Add Activity
              </Button>
            </CardContent>
          </Card>
        </div>

        {/* Main Content Tabs */}
        <Tabs defaultValue="bookings" className="space-y-6">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="bookings" className="flex items-center space-x-2">
              <Calendar className="h-4 w-4" />
              <span>Bookings</span>
            </TabsTrigger>
            <TabsTrigger value="properties" className="flex items-center space-x-2">
              <Home className="h-4 w-4" />
              <span>Properties</span>
            </TabsTrigger>
            <TabsTrigger value="users" className="flex items-center space-x-2">
              <Users className="h-4 w-4" />
              <span>Users</span>
            </TabsTrigger>
            <TabsTrigger value="analytics" className="flex items-center space-x-2">
              <TrendingUp className="h-4 w-4" />
              <span>Analytics</span>
            </TabsTrigger>
          </TabsList>

          {/* Bookings Tab */}
          <TabsContent value="bookings" className="space-y-6">
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle>All Bookings</CardTitle>
                    <p className="text-sm text-muted-foreground">
                      Manage and track all property bookings
                    </p>
                  </div>
                  <div className="flex space-x-2">
                    <Button variant="outline" size="sm">
                      <Filter className="h-4 w-4 mr-2" />
                      Filter
                    </Button>
                    <Button variant="outline" size="sm">
                      <Download className="h-4 w-4 mr-2" />
                      Export
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="rounded-md border">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b bg-muted/50">
                        <th className="h-12 px-4 text-left align-middle font-medium text-muted-foreground">Customer</th>
                        <th className="h-12 px-4 text-left align-middle font-medium text-muted-foreground">Property/Activity</th>
                        <th className="h-12 px-4 text-left align-middle font-medium text-muted-foreground">Date</th>
                        <th className="h-12 px-4 text-left align-middle font-medium text-muted-foreground">Amount</th>
                        <th className="h-12 px-4 text-left align-middle font-medium text-muted-foreground">Status</th>
                        <th className="h-12 px-4 text-left align-middle font-medium text-muted-foreground">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {recentBookings.map((booking) => (
                        <tr key={booking.id} className="border-b transition-colors hover:bg-muted/50">
                          <td className="p-4 align-middle">
                            <div>
                              <div className="font-medium">{booking.customerName}</div>
                              <div className="text-sm text-muted-foreground">{booking.customerEmail}</div>
                            </div>
                          </td>
                          <td className="p-4 align-middle">
                            <div>
                              <div className="font-medium">
                                {booking.propertyName || booking.activityName}
                              </div>
                              <div className="text-sm text-muted-foreground">
                                {booking.type === 'property' 
                                  ? `${booking.guests || 1} guests`
                                  : `Activity booking`
                                }
                              </div>
                            </div>
                          </td>
                          <td className="p-4 align-middle">
                            <div className="text-sm text-muted-foreground">
                              {booking.checkIn && booking.checkOut
                                ? `${new Date(booking.checkIn).toLocaleDateString()} - ${new Date(booking.checkOut).toLocaleDateString()}`
                                : booking.date
                                ? new Date(booking.date).toLocaleDateString()
                                : 'N/A'
                              }
                            </div>
                          </td>
                          <td className="p-4 align-middle">
                            <div className="font-medium">${booking.totalPrice}</div>
                          </td>
                          <td className="p-4 align-middle">
                            <Badge variant={booking.status === 'CONFIRMED' ? 'default' : booking.status === 'PENDING' ? 'secondary' : 'destructive'}>
                              {booking.status.charAt(0).toUpperCase() + booking.status.slice(1).toLowerCase()}
                            </Badge>
                          </td>
                          <td className="p-4 align-middle">
                            <div className="flex space-x-1">
                              <Button variant="ghost" size="sm">
                                <Eye className="h-4 w-4" />
                              </Button>
                              <Button variant="ghost" size="sm">
                                <Edit className="h-4 w-4" />
                              </Button>
                              <Button variant="ghost" size="sm">
                                <MoreHorizontal className="h-4 w-4" />
                              </Button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Properties Tab */}
          <TabsContent value="properties" className="space-y-6">
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle>Properties Management</CardTitle>
                  <Button>
                    <Plus className="h-4 w-4 mr-2" />
                    Add Property
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {properties.map((property) => (
                    <div key={property.id} className="border rounded-lg overflow-hidden">
                      <Image
                        src={property.image}
                        alt={property.name}
                        width={300}
                        height={200}
                        className="w-full h-48 object-cover"
                      />
                      <div className="p-4">
                        <div className="flex items-center justify-between mb-2">
                          <h3 className="font-semibold text-gray-900">{property.name}</h3>
                          <Badge className={getStatusColor(property.status)}>
                            {property.status.charAt(0).toUpperCase() + property.status.slice(1)}
                          </Badge>
                        </div>
                        <p className="text-sm text-gray-600 mb-2">{property.location}</p>
                        <div className="grid grid-cols-2 gap-2 text-sm mb-3">
                          <div>
                            <span className="text-gray-600">Price:</span>
                            <span className="font-medium ml-1">${property.price}/night</span>
                          </div>
                          <div>
                            <span className="text-gray-600">Occupancy:</span>
                            <span className="font-medium ml-1">{property.occupancy}</span>
                          </div>
                          <div>
                            <span className="text-gray-600">Rating:</span>
                            <span className="font-medium ml-1">{property.rating} ({property.reviews})</span>
                          </div>
                          <div>
                            <span className="text-gray-600">Bookings:</span>
                            <span className="font-medium ml-1">{property.bookings}</span>
                          </div>
                        </div>
                        <div className="text-lg font-bold text-green-600 mb-3">
                          Revenue: ${(property.revenue || property.bookings?.reduce((sum, booking) => sum + Number(booking.totalPrice || 0), 0) || 0).toLocaleString()}
                        </div>
                        <div className="flex space-x-2">
                          <Button variant="outline" size="sm" className="flex-1">
                            <Eye className="h-4 w-4 mr-1" />
                            View
                          </Button>
                          <Button variant="outline" size="sm" className="flex-1">
                            <Edit className="h-4 w-4 mr-1" />
                            Edit
                          </Button>
                          <Button variant="outline" size="sm">
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Users Tab */}
          <TabsContent value="users" className="space-y-6">
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle>Users Management</CardTitle>
                  <div className="flex space-x-2">
                    <div className="relative">
                      <Search className="h-4 w-4 absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                      <input
                        type="text"
                        placeholder="Search users..."
                        className="pl-10 pr-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                    <Button variant="outline">
                      <Filter className="h-4 w-4 mr-2" />
                      Filter
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b">
                        <th className="text-left py-3 px-4 font-medium text-gray-600">User</th>
                        <th className="text-left py-3 px-4 font-medium text-gray-600">Role</th>
                        <th className="text-left py-3 px-4 font-medium text-gray-600">Join Date</th>
                        <th className="text-left py-3 px-4 font-medium text-gray-600">Bookings</th>
                        <th className="text-left py-3 px-4 font-medium text-gray-600">Total Spent</th>
                        <th className="text-left py-3 px-4 font-medium text-gray-600">Status</th>
                        <th className="text-left py-3 px-4 font-medium text-gray-600">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {users.map((user) => (
                        <tr key={user.id} className="border-b hover:bg-gray-50">
                          <td className="py-3 px-4">
                            <div>
                              <div className="font-medium text-gray-900">{user.name}</div>
                              <div className="text-sm text-gray-600">{user.email}</div>
                            </div>
                          </td>
                          <td className="py-3 px-4">
                            <Badge variant={user.role === 'admin' ? 'default' : 'secondary'}>
                              {user.role.charAt(0).toUpperCase() + user.role.slice(1)}
                            </Badge>
                          </td>
                          <td className="py-3 px-4">
                            <div className="text-sm text-gray-600">
                              {new Date(user.joinDate).toLocaleDateString()}
                            </div>
                          </td>
                          <td className="py-3 px-4">
                            <div className="font-medium text-gray-900">{user.totalBookings}</div>
                          </td>
                          <td className="py-3 px-4">
                            <div className="font-medium text-gray-900">${user.totalSpent}</div>
                          </td>
                          <td className="py-3 px-4">
                            <Badge className={getStatusColor(user.status)}>
                              {user.status ? user.status.charAt(0).toUpperCase() + user.status.slice(1) : 'Unknown'}
                            </Badge>
                          </td>
                          <td className="py-3 px-4">
                            <div className="flex space-x-2">
                              <Button variant="outline" size="sm">
                                <Eye className="h-4 w-4" />
                              </Button>
                              <Button variant="outline" size="sm">
                                <Edit className="h-4 w-4" />
                              </Button>
                              <Button variant="outline" size="sm">
                                <MoreHorizontal className="h-4 w-4" />
                              </Button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Analytics Tab */}
          <TabsContent value="analytics" className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle>Monthly Bookings</CardTitle>
                </CardHeader>
                <CardContent>
                  <BookingsChart data={revenueData} />
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Key Performance Indicators</CardTitle>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-gray-600">Average Booking Value</p>
                      <p className="text-2xl font-bold text-gray-900">$195</p>
                    </div>
                    <div className="text-green-600">
                      <TrendingUp className="h-6 w-6" />
                    </div>
                  </div>
                  
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-gray-600">Customer Satisfaction</p>
                      <p className="text-2xl font-bold text-gray-900">{stats.averageRating}/5</p>
                    </div>
                    <div className="text-green-600">
                      <TrendingUp className="h-6 w-6" />
                    </div>
                  </div>
                  
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-gray-600">Repeat Customer Rate</p>
                      <p className="text-2xl font-bold text-gray-900">34%</p>
                    </div>
                    <div className="text-green-600">
                      <TrendingUp className="h-6 w-6" />
                    </div>
                  </div>
                  
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-gray-600">Cancellation Rate</p>
                      <p className="text-2xl font-bold text-gray-900">8%</p>
                    </div>
                    <div className="text-red-600">
                      <TrendingUp className="h-6 w-6 transform rotate-180" />
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>
        </Tabs>
        </div>
      </SidebarInset>
  );
}