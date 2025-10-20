import { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { auth } from '@/lib/auth';
import { headers } from 'next/headers';
import prisma from '@/lib/prisma';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Calendar,
  MapPin,
  Users,
  Clock,
  CreditCard,
  Eye,
  Download,
  MessageSquare,
  Settings,
  User,
  Bell,
  History,
} from 'lucide-react';
import Link from 'next/link';
import Image from 'next/image';
import { Header } from '@/components/navigation/header';

export const metadata: Metadata = {
  title: 'Dashboard | Zimunda Estate',
  description: 'Manage your bookings and account settings',
};

// Real database query to get user bookings
const getUserBookings = async (userId: string) => {
  try {
    const bookings = await prisma.booking.findMany({
      where: {
        guestId: userId,
      },
      include: {
        property: {
          include: {
            images: {
              take: 1,
              orderBy: {
                order: 'asc',
              },
            },
          },
        },
        activities: {
          include: {
            activity: {
              include: {
                images: {
                  take: 1,
                  orderBy: {
                    order: 'asc',
                  },
                },
              },
            },
          },
        },
        addOns: {
          include: {
            addOn: true,
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    return bookings;
  } catch (error) {
    console.error('Error fetching user bookings:', error);
    return [];
  }
};

// Real database query to get user booking stats
const getUserBookingStats = async (userId: string) => {
  try {
    const [totalBookings, confirmedBookings, pendingBookings] = await Promise.all([
      prisma.booking.count({
        where: { guestId: userId },
      }),
      prisma.booking.count({
        where: { 
          guestId: userId,
          status: 'CONFIRMED',
        },
      }),
      prisma.booking.count({
        where: { 
          guestId: userId,
          status: 'PENDING',
        },
      }),
    ]);

    return {
      total: totalBookings,
      confirmed: confirmedBookings,
      pending: pendingBookings,
    };
  } catch (error) {
    console.error('Error fetching booking stats:', error);
    return {
      total: 0,
      confirmed: 0,
      pending: 0,
    };
  }
};

const getBookingStatusColor = (status: string) => {
  switch (status.toLowerCase()) {
    case 'confirmed':
      return 'bg-green-100 text-green-800 border-green-200';
    case 'pending':
      return 'bg-yellow-100 text-yellow-800 border-yellow-200';
    case 'cancelled':
      return 'bg-red-100 text-red-800 border-red-200';
    default:
      return 'bg-gray-100 text-gray-800 border-gray-200';
  }
};

const getPaymentStatusColor = (status: string) => {
  switch (status.toLowerCase()) {
    case 'paid':
      return 'bg-green-100 text-green-800 border-green-200';
    case 'pending':
      return 'bg-yellow-100 text-yellow-800 border-yellow-200';
    case 'failed':
      return 'bg-red-100 text-red-800 border-red-200';
    default:
      return 'bg-gray-100 text-gray-800 border-gray-200';
  }
};

const formatCurrency = (amount: number) => {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
  }).format(amount);
};

const formatDate = (date: Date) => {
  return new Intl.DateTimeFormat('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  }).format(new Date(date));
};

export default async function DashboardPage() {
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  if (!session) {
    redirect('/login');
  }

  const userId = session.user.id;
  
  // Fetch real data from database
  const [bookings, bookingStats] = await Promise.all([
    getUserBookings(userId),
    getUserBookingStats(userId),
  ]);

  return (
    <div className="min-h-screen bg-gray-50">
      <Header />
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">
            Welcome back, {session.user.name || 'Guest'}!
          </h1>
          <p className="text-gray-600 mt-2">
            Manage your bookings and account settings
          </p>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center space-x-3">
                <div className="p-2 bg-blue-100 rounded-lg">
                  <Calendar className="h-6 w-6 text-blue-600" />
                </div>
                <div>
                  <p className="text-sm text-gray-600">Total Bookings</p>
                  <p className="text-2xl font-bold text-gray-900">{bookingStats.total}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center space-x-3">
                <div className="p-2 bg-green-100 rounded-lg">
                  <CreditCard className="h-6 w-6 text-green-600" />
                </div>
                <div>
                  <p className="text-sm text-gray-600">Confirmed</p>
                  <p className="text-2xl font-bold text-gray-900">{bookingStats.confirmed}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center space-x-3">
                <div className="p-2 bg-orange-100 rounded-lg">
                  <History className="h-6 w-6 text-orange-600" />
                </div>
                <div>
                  <p className="text-sm text-gray-600">Pending</p>
                  <p className="text-2xl font-bold text-gray-900">{bookingStats.pending}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Main Content */}
        <Tabs defaultValue="bookings" className="space-y-6">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="bookings" className="flex items-center space-x-2">
              <Calendar className="h-4 w-4" />
              <span>My Bookings</span>
            </TabsTrigger>
            <TabsTrigger value="profile" className="flex items-center space-x-2">
              <User className="h-4 w-4" />
              <span>Profile</span>
            </TabsTrigger>
            <TabsTrigger value="settings" className="flex items-center space-x-2">
              <Settings className="h-4 w-4" />
              <span>Settings</span>
            </TabsTrigger>
          </TabsList>

          {/* Bookings Tab */}
          <TabsContent value="bookings" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>My Bookings</CardTitle>
              </CardHeader>
              <CardContent>
                {bookings.length === 0 ? (
                  <div className="text-center py-8">
                    <Calendar className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                    <h3 className="text-lg font-medium text-gray-900 mb-2">
                      No bookings yet
                    </h3>
                    <p className="text-gray-600 mb-4">
                      Start exploring our properties and activities to make your first booking.
                    </p>
                    <div className="space-x-4">
                      <Button asChild>
                        <Link href="/properties">Browse Properties</Link>
                      </Button>
                      <Button variant="outline" asChild>
                        <Link href="/activities">View Activities</Link>
                      </Button>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {bookings.map((booking) => (
                      <div
                        key={booking.id}
                        className="border rounded-lg p-6 hover:shadow-md transition-shadow"
                      >
                        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
                          <div className="flex items-start space-x-4">
                            {booking.property && (
                              <Image
                                src={booking.property.images[0]?.url || '/images/placeholder.jpg'}
                                alt={booking.property.name}
                                width={80}
                                height={60}
                                className="w-20 h-15 object-cover rounded"
                              />
                            )}
                            <div className="flex-1">
                              <h3 className="font-semibold text-gray-900 mb-1">
                                {booking.property?.name || 'Activity Booking'}
                              </h3>
                              
                              <div className="flex items-center space-x-4 text-sm text-gray-600 mb-2">
                                {booking.property && (
                                  <>
                                    <div className="flex items-center space-x-1">
                                      <Calendar className="h-4 w-4" />
                                      <span>
                                        {formatDate(booking.checkIn)} - {formatDate(booking.checkOut)}
                                      </span>
                                    </div>
                                    <div className="flex items-center space-x-1">
                                      <Users className="h-4 w-4" />
                                      <span>{booking.adults + booking.children} guests</span>
                                    </div>
                                  </>
                                )}
                                {booking.activities.length > 0 && (
                                  <div className="flex items-center space-x-1">
                                    <Clock className="h-4 w-4" />
                                    <span>{booking.activities.length} activities</span>
                                  </div>
                                )}
                              </div>
                              
                              <div className="flex items-center space-x-2">
                                <Badge className={getBookingStatusColor(booking.status)}>
                                  {booking.status.charAt(0).toUpperCase() + booking.status.slice(1).toLowerCase()}
                                </Badge>
                                <Badge className={getPaymentStatusColor(booking.paymentStatus)}>
                                  {booking.paymentStatus.charAt(0).toUpperCase() + booking.paymentStatus.slice(1).toLowerCase()}
                                </Badge>
                              </div>
                            </div>
                          </div>
                          
                          <div className="flex flex-col lg:items-end space-y-2">
                            <div className="text-lg font-bold text-gray-900">
                              {formatCurrency(Number(booking.totalPrice))}
                            </div>
                            <div className="text-sm text-gray-600">
                              Ref: {booking.id.slice(-8).toUpperCase()}
                            </div>
                            <div className="flex space-x-2">
                              <Button variant="outline" size="sm">
                                <Eye className="h-4 w-4 mr-1" />
                                View
                              </Button>
                              <Button variant="outline" size="sm">
                                <Download className="h-4 w-4 mr-1" />
                                Receipt
                              </Button>
                              {booking.status === 'CONFIRMED' && (
                                <Button variant="outline" size="sm">
                                  <MessageSquare className="h-4 w-4 mr-1" />
                                  Review
                                </Button>
                              )}
                            </div>
                          </div>
                        </div>
                        
                        {/* Show activities if any */}
                        {booking.activities.length > 0 && (
                          <div className="mt-4 pt-4 border-t">
                            <h4 className="font-medium text-gray-900 mb-2">Included Activities:</h4>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                              {booking.activities.map((activityBooking) => (
                                <div key={activityBooking.id} className="text-sm text-gray-600">
                                  • {activityBooking.activity.name} - {formatDate(activityBooking.date)} at {activityBooking.time}
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                        
                        {/* Show add-ons if any */}
                        {booking.addOns.length > 0 && (
                          <div className="mt-4 pt-4 border-t">
                            <h4 className="font-medium text-gray-900 mb-2">Add-ons:</h4>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                              {booking.addOns.map((addOn) => (
                                <div key={addOn.id} className="text-sm text-gray-600">
                                  • {addOn.addOn.name} (x{addOn.quantity}) - {formatCurrency(Number(addOn.price))}
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Profile Tab */}
          <TabsContent value="profile" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Profile Information</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-6">
                  <div className="flex items-center space-x-6">
                    <div className="w-20 h-20 bg-blue-100 rounded-full flex items-center justify-center">
                      <User className="h-10 w-10 text-blue-600" />
                    </div>
                    <div>
                      <h3 className="text-xl font-semibold text-gray-900">
                        {session.user.name || 'Guest User'}
                      </h3>
                      <p className="text-gray-600">{session.user.email}</p>
                      <Button variant="outline" size="sm" className="mt-2">
                        Change Photo
                      </Button>
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Full Name
                      </label>
                      <input
                        type="text"
                        defaultValue={session.user.name || ''}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Email Address
                      </label>
                      <input
                        type="email"
                        defaultValue={session.user.email || ''}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Phone Number
                      </label>
                      <input
                        type="tel"
                        placeholder="+1 (555) 123-4567"
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Country
                      </label>
                      <select className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white">
                        <option value="">Select Country</option>
                        <option value="US">United States</option>
                        <option value="CA">Canada</option>
                        <option value="UK">United Kingdom</option>
                        <option value="ZW">Zimbabwe</option>
                      </select>
                    </div>
                  </div>
                  
                  <div className="flex justify-end space-x-4">
                    <Button variant="outline">Cancel</Button>
                    <Button>Save Changes</Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Settings Tab */}
          <TabsContent value="settings" className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center space-x-2">
                    <Bell className="h-5 w-5" />
                    <span>Notifications</span>
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="font-medium text-gray-900">Email Notifications</h4>
                      <p className="text-sm text-gray-600">Receive booking confirmations and updates</p>
                    </div>
                    <input type="checkbox" defaultChecked className="rounded" />
                  </div>
                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="font-medium text-gray-900">SMS Notifications</h4>
                      <p className="text-sm text-gray-600">Get text messages for important updates</p>
                    </div>
                    <input type="checkbox" className="rounded" />
                  </div>
                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="font-medium text-gray-900">Marketing Emails</h4>
                      <p className="text-sm text-gray-600">Receive special offers and promotions</p>
                    </div>
                    <input type="checkbox" defaultChecked className="rounded" />
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center space-x-2">
                    <Settings className="h-5 w-5" />
                    <span>Account Settings</span>
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <Button variant="outline" className="w-full justify-start">
                    Change Password
                  </Button>
                  <Button variant="outline" className="w-full justify-start">
                    Download My Data
                  </Button>
                  <Button variant="outline" className="w-full justify-start text-red-600 hover:text-red-700">
                    Delete Account
                  </Button>
                </CardContent>
              </Card>
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}