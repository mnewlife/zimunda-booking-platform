import { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { auth } from '@/lib/auth';
import { headers } from 'next/headers';
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
  Star,
  Eye,
  Download,
  MessageSquare,
  Settings,
  User,
  Bell,
  Heart,
  History,
} from 'lucide-react';
import Link from 'next/link';
import Image from 'next/image';
import { cn } from '@/lib/utils';
import { Header } from '@/components/navigation/header';

export const metadata: Metadata = {
  title: 'Dashboard | Zimunda Estate',
  description: 'Manage your bookings and account settings',
};

// Mock data - replace with actual database queries
const getUserBookings = async (userId: string) => {
  return [
    {
      id: '1',
      type: 'property',
      property: {
        name: 'Luxury Safari Lodge',
        image: '/images/properties/lodge-1.jpg',
        location: 'Zimunda Game Reserve',
      },
      checkIn: '2024-02-15',
      checkOut: '2024-02-18',
      guests: 4,
      totalAmount: 1200,
      status: 'confirmed',
      bookingReference: 'ZIM-001',
      paymentStatus: 'paid',
    },
    {
      id: '2',
      type: 'activity',
      activity: {
        name: 'Sunrise Wildlife Safari',
        image: '/images/activities/safari-1.jpg',
        duration: 4,
      },
      date: '2024-02-16',
      participants: 2,
      totalAmount: 170,
      status: 'confirmed',
      bookingReference: 'ZIM-002',
      paymentStatus: 'paid',
    },
    {
      id: '3',
      type: 'property',
      property: {
        name: 'Riverside Cottage',
        image: '/images/properties/cottage-1.jpg',
        location: 'Zimunda Valley',
      },
      checkIn: '2024-03-10',
      checkOut: '2024-03-13',
      guests: 2,
      totalAmount: 800,
      status: 'pending',
      bookingReference: 'ZIM-003',
      paymentStatus: 'pending',
    },
  ];
};

const getUserFavorites = async (userId: string) => {
  return [
    {
      id: '1',
      type: 'property',
      name: 'Mountain View Villa',
      image: '/images/properties/villa-1.jpg',
      price: 250,
      rating: 4.8,
      location: 'Zimunda Hills',
    },
    {
      id: '2',
      type: 'activity',
      name: 'Photography Workshop',
      image: '/images/activities/photo-1.jpg',
      price: 95,
      rating: 4.9,
      duration: 3,
    },
  ];
};

const getBookingStatusColor = (status: string) => {
  switch (status) {
    case 'confirmed':
      return 'bg-green-100 text-green-800';
    case 'pending':
      return 'bg-yellow-100 text-yellow-800';
    case 'cancelled':
      return 'bg-red-100 text-red-800';
    default:
      return 'bg-gray-100 text-gray-800';
  }
};

const getPaymentStatusColor = (status: string) => {
  switch (status) {
    case 'paid':
      return 'bg-green-100 text-green-800';
    case 'pending':
      return 'bg-yellow-100 text-yellow-800';
    case 'failed':
      return 'bg-red-100 text-red-800';
    default:
      return 'bg-gray-100 text-gray-800';
  }
};

export default async function DashboardPage() {
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  if (!session) {
    redirect('/login');
  }

  const bookings = await getUserBookings(session.user.id);
  const favorites = await getUserFavorites(session.user.id);

  const upcomingBookings = bookings.filter(booking => {
    const checkInDate = booking.type === 'property' ? new Date(booking.checkIn!) : new Date(booking.date!);
    return checkInDate > new Date() && booking.status === 'confirmed';
  });

  const totalSpent = bookings
    .filter(booking => booking.paymentStatus === 'paid')
    .reduce((sum, booking) => sum + booking.totalAmount, 0);

  return (
    <div className="min-h-screen bg-gray-50">
      <Header />
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            Welcome back, {session.user.name || 'Guest'}!
          </h1>
          <p className="text-gray-600">
            Manage your bookings, view your favorites, and update your profile.
          </p>
        </div>

        {/* Quick Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center space-x-3">
                <div className="p-2 bg-blue-100 rounded-lg">
                  <Calendar className="h-6 w-6 text-blue-600" />
                </div>
                <div>
                  <p className="text-sm text-gray-600">Upcoming Bookings</p>
                  <p className="text-2xl font-bold text-gray-900">{upcomingBookings.length}</p>
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
                  <p className="text-sm text-gray-600">Total Spent</p>
                  <p className="text-2xl font-bold text-gray-900">${totalSpent}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center space-x-3">
                <div className="p-2 bg-purple-100 rounded-lg">
                  <Heart className="h-6 w-6 text-purple-600" />
                </div>
                <div>
                  <p className="text-sm text-gray-600">Favorites</p>
                  <p className="text-2xl font-bold text-gray-900">{favorites.length}</p>
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
                  <p className="text-sm text-gray-600">Total Bookings</p>
                  <p className="text-2xl font-bold text-gray-900">{bookings.length}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Main Content */}
        <Tabs defaultValue="bookings" className="space-y-6">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="bookings" className="flex items-center space-x-2">
              <Calendar className="h-4 w-4" />
              <span>My Bookings</span>
            </TabsTrigger>
            <TabsTrigger value="favorites" className="flex items-center space-x-2">
              <Heart className="h-4 w-4" />
              <span>Favorites</span>
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
                            <Image
                              src={
                                booking.type === 'property'
                                  ? booking.property!.image
                                  : booking.activity!.image
                              }
                              alt={
                                booking.type === 'property'
                                  ? booking.property!.name
                                  : booking.activity!.name
                              }
                              width={80}
                              height={60}
                              className="w-20 h-15 object-cover rounded"
                            />
                            <div className="flex-1">
                              <h3 className="font-semibold text-gray-900 mb-1">
                                {booking.type === 'property'
                                  ? booking.property!.name
                                  : booking.activity!.name}
                              </h3>
                              
                              <div className="flex items-center space-x-4 text-sm text-gray-600 mb-2">
                                {booking.type === 'property' ? (
                                  <>
                                    <div className="flex items-center space-x-1">
                                      <MapPin className="h-4 w-4" />
                                      <span>{booking.property!.location}</span>
                                    </div>
                                    <div className="flex items-center space-x-1">
                                      <Calendar className="h-4 w-4" />
                                      <span>
                                        {new Date(booking.checkIn!).toLocaleDateString()} - {new Date(booking.checkOut!).toLocaleDateString()}
                                      </span>
                                    </div>
                                    <div className="flex items-center space-x-1">
                                      <Users className="h-4 w-4" />
                                      <span>{booking.guests} guests</span>
                                    </div>
                                  </>
                                ) : (
                                  <>
                                    <div className="flex items-center space-x-1">
                                      <Calendar className="h-4 w-4" />
                                      <span>{new Date(booking.date!).toLocaleDateString()}</span>
                                    </div>
                                    <div className="flex items-center space-x-1">
                                      <Clock className="h-4 w-4" />
                                      <span>{booking.activity!.duration} hours</span>
                                    </div>
                                    <div className="flex items-center space-x-1">
                                      <Users className="h-4 w-4" />
                                      <span>{booking.participants} participants</span>
                                    </div>
                                  </>
                                )}
                              </div>
                              
                              <div className="flex items-center space-x-2">
                                <Badge className={getBookingStatusColor(booking.status)}>
                                  {booking.status.charAt(0).toUpperCase() + booking.status.slice(1)}
                                </Badge>
                                <Badge className={getPaymentStatusColor(booking.paymentStatus)}>
                                  {booking.paymentStatus.charAt(0).toUpperCase() + booking.paymentStatus.slice(1)}
                                </Badge>
                              </div>
                            </div>
                          </div>
                          
                          <div className="flex flex-col lg:items-end space-y-2">
                            <div className="text-lg font-bold text-gray-900">
                              ${booking.totalAmount}
                            </div>
                            <div className="text-sm text-gray-600">
                              Ref: {booking.bookingReference}
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
                              {booking.status === 'confirmed' && (
                                <Button variant="outline" size="sm">
                                  <MessageSquare className="h-4 w-4 mr-1" />
                                  Review
                                </Button>
                              )}
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Favorites Tab */}
          <TabsContent value="favorites" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>My Favorites</CardTitle>
              </CardHeader>
              <CardContent>
                {favorites.length === 0 ? (
                  <div className="text-center py-8">
                    <Heart className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                    <h3 className="text-lg font-medium text-gray-900 mb-2">
                      No favorites yet
                    </h3>
                    <p className="text-gray-600 mb-4">
                      Save properties and activities you love to easily find them later.
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
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {favorites.map((favorite) => (
                      <div key={favorite.id} className="border rounded-lg overflow-hidden hover:shadow-md transition-shadow">
                        <Image
                          src={favorite.image}
                          alt={favorite.name}
                          width={300}
                          height={200}
                          className="w-full h-48 object-cover"
                        />
                        <div className="p-4">
                          <h3 className="font-semibold text-gray-900 mb-2">
                            {favorite.name}
                          </h3>
                          <div className="flex items-center justify-between mb-3">
                            <div className="flex items-center space-x-1">
                              <Star className="h-4 w-4 fill-yellow-400 text-yellow-400" />
                              <span className="text-sm text-gray-600">{favorite.rating}</span>
                            </div>
                            <div className="text-lg font-bold text-blue-600">
                              ${favorite.price}
                              {favorite.type === 'activity' && (
                                <span className="text-sm text-gray-600 ml-1">/ person</span>
                              )}
                            </div>
                          </div>
                          {favorite.type === 'property' ? (
                            <div className="flex items-center space-x-1 text-sm text-gray-600 mb-3">
                              <MapPin className="h-4 w-4" />
                              <span>{favorite.location}</span>
                            </div>
                          ) : (
                            <div className="flex items-center space-x-1 text-sm text-gray-600 mb-3">
                              <Clock className="h-4 w-4" />
                              <span>{favorite.duration} hours</span>
                            </div>
                          )}
                          <div className="flex space-x-2">
                            <Button className="flex-1" size="sm">
                              Book Now
                            </Button>
                            <Button variant="outline" size="sm">
                              <Heart className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>
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
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Email Address
                      </label>
                      <input
                        type="email"
                        defaultValue={session.user.email || ''}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Phone Number
                      </label>
                      <input
                        type="tel"
                        placeholder="+1 (555) 123-4567"
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Country
                      </label>
                      <select className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500">
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