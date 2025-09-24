import { Metadata } from 'next';
import { redirect, notFound } from 'next/navigation';
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
import { SidebarTrigger } from '@/components/ui/sidebar';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Edit,
  Calendar,
  Clock,
  Users,
  DollarSign,
  Activity,
  CheckCircle,
  AlertCircle,
} from 'lucide-react';
import Link from 'next/link';
import { prisma } from '@/lib/db';
import { ActivityType } from '@prisma/client';

export const metadata: Metadata = {
  title: 'Activity Details | Zimunda Estate Admin',
  description: 'View activity details and bookings',
};

interface ActivityDetailsPageProps {
  params: {
    id: string;
  };
}

// Helper function to get activity type colors
const getActivityTypeColor = (type: ActivityType) => {
  switch (type) {
    case 'COFFEE_TOUR':
      return 'bg-amber-100 text-amber-800 hover:bg-amber-200';
    case 'POOL_BOOKING':
      return 'bg-blue-100 text-blue-800 hover:bg-blue-200';
    case 'HIKING':
      return 'bg-green-100 text-green-800 hover:bg-green-200';
    case 'BIRD_WATCHING':
      return 'bg-purple-100 text-purple-800 hover:bg-purple-200';
    case 'MASSAGE':
      return 'bg-pink-100 text-pink-800 hover:bg-pink-200';
    case 'OTHER':
      return 'bg-gray-100 text-gray-800 hover:bg-gray-200';
    default:
      return 'bg-gray-100 text-gray-800 hover:bg-gray-200';
  }
};

const getActivity = async (id: string) => {
  const activity = await prisma.activity.findUnique({
    where: { id },
    include: {
      bookings: {
        include: {
          booking: {
            include: {
              guest: {
                select: {
                  name: true,
                  email: true
                }
              }
            }
          }
        },
        orderBy: {
          createdAt: 'desc'
        }
      },
      _count: {
        select: {
          bookings: true
        }
      }
    }
  });

  if (!activity) {
    notFound();
  }

  return activity;
};

const getActivityStats = async (id: string) => {
  const [totalBookings, confirmedBookings, totalRevenue, upcomingBookings] = await Promise.all([
    prisma.activityBooking.count({
      where: { activityId: id }
    }),
    prisma.activityBooking.count({
      where: { 
        activityId: id,
        status: 'CONFIRMED'
      }
    }),
    prisma.activityBooking.aggregate({
      _sum: {
        totalPrice: true
      },
      where: {
        activityId: id,
        status: 'CONFIRMED'
      }
    }),
    prisma.activityBooking.count({
      where: {
        activityId: id,
        status: 'CONFIRMED',
        date: {
          gte: new Date()
        }
      }
    })
  ]);

  return {
    totalBookings,
    confirmedBookings,
    totalRevenue: totalRevenue._sum.totalPrice || 0,
    upcomingBookings
  };
};

export default async function ActivityDetailsPage({ params }: ActivityDetailsPageProps) {
  const session = await auth.api.getSession({
    headers: await headers()
  });

  if (!session?.user) {
    redirect('/login');
  }

  if (session.user.role !== 'ADMIN' && session.user.role !== 'MANAGER') {
    redirect('/dashboard');
  }

  const [activity, stats] = await Promise.all([
    getActivity(params.id),
    getActivityStats(params.id)
  ]);

  // Parse the availability JSON
  const availability = typeof activity.availability === 'object' && activity.availability !== null
    ? activity.availability as { days: string[], timeSlots: { start: string, end: string }[] }
    : { days: [], timeSlots: [] };

  return (
    <div className="flex-1 space-y-4 p-4 md:p-8 pt-6">
      <div className="flex items-center gap-4">
        <SidebarTrigger className="-ml-1" />
        <Separator orientation="vertical" className="mr-2 h-4" />
        <Breadcrumb>
          <BreadcrumbList>
            <BreadcrumbItem className="hidden md:block">
              <BreadcrumbLink href="/admin">
                Dashboard
              </BreadcrumbLink>
            </BreadcrumbItem>
            <BreadcrumbSeparator className="hidden md:block" />
            <BreadcrumbItem>
              <BreadcrumbLink href="/admin/activities">
                Activities
              </BreadcrumbLink>
            </BreadcrumbItem>
            <BreadcrumbSeparator className="hidden md:block" />
            <BreadcrumbItem>
              <BreadcrumbPage>{activity.name}</BreadcrumbPage>
            </BreadcrumbItem>
          </BreadcrumbList>
        </Breadcrumb>
      </div>

      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">{activity.name}</h2>
          <p className="text-muted-foreground">
            Activity details and booking information
          </p>
        </div>
        <Button asChild>
          <Link href={`/admin/activities/${activity.id}/edit`}>
            <Edit className="mr-2 h-4 w-4" />
            Edit Activity
          </Link>
        </Button>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-4">
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
              All time bookings
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Confirmed Bookings
            </CardTitle>
            <CheckCircle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.confirmedBookings}</div>
            <p className="text-xs text-muted-foreground">
              Confirmed reservations
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Total Revenue
            </CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">${stats.totalRevenue.toFixed(2)}</div>
            <p className="text-xs text-muted-foreground">
              From confirmed bookings
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Upcoming Bookings
            </CardTitle>
            <AlertCircle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.upcomingBookings}</div>
            <p className="text-xs text-muted-foreground">
              Future reservations
            </p>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        {/* Activity Details */}
        <Card>
          <CardHeader>
            <CardTitle>Activity Details</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium text-muted-foreground">Type</label>
                <div className="mt-1">
                  <Badge
                    variant="secondary"
                    className={getActivityTypeColor(activity.type)}
                  >
                    {activity.type.replace('_', ' ')}
                  </Badge>
                </div>
              </div>
              <div>
                <label className="text-sm font-medium text-muted-foreground">Duration</label>
                <div className="mt-1 flex items-center">
                  <Clock className="mr-1 h-4 w-4" />
                  {Math.floor(activity.duration / 60)}h {activity.duration % 60}m
                </div>
              </div>
              <div>
                <label className="text-sm font-medium text-muted-foreground">Price</label>
                <div className="mt-1 flex items-center">
                  <DollarSign className="mr-1 h-4 w-4" />
                  ${activity.price.toFixed(2)}
                </div>
              </div>
              <div>
                <label className="text-sm font-medium text-muted-foreground">Capacity</label>
                <div className="mt-1 flex items-center">
                  <Users className="mr-1 h-4 w-4" />
                  {activity.capacity} people
                </div>
              </div>
            </div>
            
            <div>
              <label className="text-sm font-medium text-muted-foreground">Description</label>
              <p className="mt-1 text-sm">{activity.description}</p>
            </div>

            {activity.requirements && activity.requirements.length > 0 && (
              <div>
                <label className="text-sm font-medium text-muted-foreground">Requirements</label>
                <div className="mt-1 flex flex-wrap gap-1">
                  {activity.requirements.map((requirement, index) => (
                    <Badge key={index} variant="outline">
                      {requirement}
                    </Badge>
                  ))}
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Availability */}
        <Card>
          <CardHeader>
            <CardTitle>Availability</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <label className="text-sm font-medium text-muted-foreground">Available Days</label>
              <div className="mt-1 flex flex-wrap gap-1">
                {availability.days && availability.days.length > 0 ? (
                  availability.days.map((day, index) => (
                    <Badge key={index} variant="secondary">
                      {day}
                    </Badge>
                  ))
                ) : (
                  <span className="text-sm text-muted-foreground">No days specified</span>
                )}
              </div>
            </div>

            <div>
              <label className="text-sm font-medium text-muted-foreground">Time Slots</label>
              <div className="mt-1 space-y-1">
                {availability.timeSlots && availability.timeSlots.length > 0 ? (
                  availability.timeSlots.map((slot, index) => (
                    <div key={index} className="text-sm">
                      {slot.start} - {slot.end}
                    </div>
                  ))
                ) : (
                  <span className="text-sm text-muted-foreground">No time slots specified</span>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Recent Bookings */}
      <Card>
        <CardHeader>
          <CardTitle>Recent Bookings</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Guest</TableHead>
                <TableHead>Date</TableHead>
                <TableHead>Time</TableHead>
                <TableHead>Participants</TableHead>
                <TableHead>Amount</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Booked On</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {activity.bookings.length > 0 ? (
                activity.bookings.map((booking) => (
                  <TableRow key={booking.id}>
                    <TableCell>
                      <div>
                        <div className="font-medium">{booking.booking.guest.name}</div>
                        <div className="text-sm text-muted-foreground">{booking.booking.guest.email}</div>
                      </div>
                    </TableCell>
                    <TableCell>{booking.date.toLocaleDateString()}</TableCell>
                    <TableCell>{booking.time}</TableCell>
                    <TableCell>{booking.participants}</TableCell>
                    <TableCell>${booking.totalPrice.toFixed(2)}</TableCell>
                    <TableCell>
                      <Badge
                        variant={booking.status === 'CONFIRMED' ? 'default' : 'secondary'}
                        className={
                          booking.status === 'CONFIRMED'
                            ? 'bg-green-100 text-green-800'
                            : booking.status === 'PENDING'
                            ? 'bg-yellow-100 text-yellow-800'
                            : 'bg-red-100 text-red-800'
                        }
                      >
                        {booking.status}
                      </Badge>
                    </TableCell>
                    <TableCell>{booking.createdAt.toLocaleDateString()}</TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={7} className="text-center text-muted-foreground">
                    No bookings found
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}