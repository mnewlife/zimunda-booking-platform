import { Metadata } from 'next';
import { redirect, notFound } from 'next/navigation';
import { headers } from 'next/headers';
import { auth } from '@/lib/auth';
import { AdminSidebar } from '@/components/admin-sidebar';
import { SidebarProvider, SidebarInset, SidebarTrigger } from '@/components/ui/sidebar';
import { Separator } from '@/components/ui/separator';
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from '@/components/ui/breadcrumb';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Calendar,
  Users,
  DollarSign,
  MapPin,
  Phone,
  Mail,
  Clock,
  CreditCard,
  FileText,
  Edit,
  Trash2,
  Download,
  CheckCircle,
  XCircle,
  AlertCircle,
} from 'lucide-react';
import Link from 'next/link';
import prisma from '@/lib/prisma';
import { BookingStatus, PaymentStatus, PaymentMethod } from '@prisma/client';
import { format } from 'date-fns';

export const metadata: Metadata = {
  title: 'View Booking | Admin Dashboard',
  description: 'View booking details',
};

interface ViewBookingPageProps {
  params: {
    id: string;
  };
}

const getBooking = async (id: string) => {
  try {
    const booking = await prisma.booking.findUnique({
      where: { id },
      include: {
        guest: {
          select: {
            id: true,
            name: true,
            email: true,
            phone: true,
          },
        },
        property: {
          select: {
            id: true,
            name: true,
            type: true,
            slug: true,
            basePrice: true,
            description: true,
            maxOccupancy: true,
          },
        },
        addOns: {
          include: {
            addOn: true,
          },
        },
        activities: {
          include: {
            activity: true,
          },
        },
        payments: {
          orderBy: {
            createdAt: 'desc',
          },
        },
      },
    });

    if (!booking) {
      return null;
    }

    return {
      ...booking,
      totalPrice: Number(booking.totalPrice),
      property: booking.property ? {
        ...booking.property,
        basePrice: Number(booking.property.basePrice),
      } : null,
      addOns: booking.addOns.map(addOn => ({
        ...addOn,
        price: Number(addOn.price),
        addOn: {
          ...addOn.addOn,
          price: Number(addOn.addOn.price),
        },
      })),
      activities: booking.activities.map(activity => ({
        ...activity,
        totalPrice: Number(activity.totalPrice),
        activity: {
          ...activity.activity,
          price: Number(activity.activity.price),
        },
      })),
      payments: booking.payments.map(payment => ({
        ...payment,
        amount: Number(payment.amount),
      })),
    };
  } catch (error) {
    console.error('Error fetching booking:', error);
    return null;
  }
};

const getStatusColor = (status: BookingStatus) => {
  switch (status) {
    case 'CONFIRMED':
      return 'bg-green-100 text-green-800';
    case 'PENDING':
      return 'bg-yellow-100 text-yellow-800';
    case 'CANCELLED':
      return 'bg-red-100 text-red-800';
    case 'COMPLETED':
      return 'bg-blue-100 text-blue-800';
    default:
      return 'bg-gray-100 text-gray-800';
  }
};

const getPaymentStatusColor = (status: PaymentStatus) => {
  switch (status) {
    case 'COMPLETED':
      return 'bg-green-100 text-green-800';
    case 'PENDING':
      return 'bg-yellow-100 text-yellow-800';
    case 'PROCESSING':
      return 'bg-blue-100 text-blue-800';
    case 'FAILED':
      return 'bg-red-100 text-red-800';
    case 'REFUNDED':
      return 'bg-purple-100 text-purple-800';
    default:
      return 'bg-gray-100 text-gray-800';
  }
};

const getPaymentMethodColor = (method: PaymentMethod) => {
  switch (method) {
    case 'CASH':
      return 'bg-green-100 text-green-800';
    case 'BANK_TRANSFER':
      return 'bg-blue-100 text-blue-800';
    case 'STRIPE':
      return 'bg-purple-100 text-purple-800';
    default:
      return 'bg-gray-100 text-gray-800';
  }
};

const getStatusIcon = (status: BookingStatus) => {
  switch (status) {
    case 'CONFIRMED':
      return <CheckCircle className="h-4 w-4" />;
    case 'PENDING':
      return <AlertCircle className="h-4 w-4" />;
    case 'CANCELLED':
      return <XCircle className="h-4 w-4" />;
    case 'COMPLETED':
      return <CheckCircle className="h-4 w-4" />;
    default:
      return <AlertCircle className="h-4 w-4" />;
  }
};

export default async function ViewBookingPage({ params }: ViewBookingPageProps) {
  const session = await auth.api.getSession({
    headers: await headers(),
  });
  
  if (!session?.user || (session.user as any).role !== 'ADMIN') {
    redirect('/login');
  }

  const booking = await getBooking(params.id);
  
  if (!booking) {
    notFound();
  }

  const checkInDate = new Date(booking.checkIn);
  const checkOutDate = new Date(booking.checkOut);
  const nights = Math.ceil((checkOutDate.getTime() - checkInDate.getTime()) / (1000 * 60 * 60 * 24));
  const totalGuests = booking.adults + booking.children;

  return (
      <SidebarInset>
        <header className="flex h-16 shrink-0 items-center gap-2 transition-[width,height] ease-linear group-has-[[data-collapsible=icon]]/sidebar-wrapper:h-12">
          <div className="flex items-center gap-2 px-4">
            <SidebarTrigger className="-ml-1" />
            <Separator orientation="vertical" className="mr-2 h-4" />
            <Breadcrumb>
              <BreadcrumbList>
                <BreadcrumbItem className="hidden md:block">
                  <BreadcrumbLink href="/admin">
                    Admin Dashboard
                  </BreadcrumbLink>
                </BreadcrumbItem>
                <BreadcrumbSeparator className="hidden md:block" />
                <BreadcrumbItem className="hidden md:block">
                  <BreadcrumbLink href="/admin/bookings">
                    Bookings
                  </BreadcrumbLink>
                </BreadcrumbItem>
                <BreadcrumbSeparator className="hidden md:block" />
                <BreadcrumbItem>
                  <BreadcrumbPage>View Booking</BreadcrumbPage>
                </BreadcrumbItem>
              </BreadcrumbList>
            </Breadcrumb>
          </div>
        </header>

        <div className="flex flex-1 flex-col gap-4 p-4 pt-0">
          {/* Header */}
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold tracking-tight">Booking Details</h1>
              <p className="text-muted-foreground">
                Booking for {booking.guest.name} • {format(checkInDate, 'MMM dd, yyyy')} - {format(checkOutDate, 'MMM dd, yyyy')}
              </p>
            </div>
            <div className="flex items-center gap-2">
              <Button variant="outline" asChild>
                <Link href={`/admin/bookings/${booking.id}/edit`}>
                  <Edit className="h-4 w-4 mr-2" />
                  Edit Booking
                </Link>
              </Button>
              <Button variant="outline">
                <Download className="h-4 w-4 mr-2" />
                Export
              </Button>
            </div>
          </div>

          {/* Status and Quick Info */}
          <div className="grid gap-4 md:grid-cols-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Status</CardTitle>
                {getStatusIcon(booking.status)}
              </CardHeader>
              <CardContent>
                <Badge className={getStatusColor(booking.status)}>
                  {booking.status}
                </Badge>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Amount</CardTitle>
                <DollarSign className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">${booking.totalPrice.toLocaleString()}</div>
                <p className="text-xs text-muted-foreground">
                  {nights} night{nights !== 1 ? 's' : ''}
                </p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Guests</CardTitle>
                <Users className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{totalGuests}</div>
                <p className="text-xs text-muted-foreground">
                  {booking.adults} adults, {booking.children} children
                </p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Payment Status</CardTitle>
                <CreditCard className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <Badge className={getPaymentStatusColor(booking.paymentStatus)}>
                  {booking.paymentStatus}
                </Badge>
                <p className="text-xs text-muted-foreground mt-1">
                  {booking.paymentMethod}
                </p>
              </CardContent>
            </Card>
          </div>

          <div className="grid gap-6 md:grid-cols-2">
            {/* Guest Information */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Users className="h-5 w-5" />
                  Guest Information
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Name</label>
                  <p className="text-lg font-semibold">{booking.guest.name}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Email</label>
                  <div className="flex items-center gap-2">
                    <Mail className="h-4 w-4 text-muted-foreground" />
                    <p>{booking.guest.email}</p>
                  </div>
                </div>
                {booking.guest.phone && (
                  <div>
                    <label className="text-sm font-medium text-muted-foreground">Phone</label>
                    <div className="flex items-center gap-2">
                      <Phone className="h-4 w-4 text-muted-foreground" />
                      <p>{booking.guest.phone}</p>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Booking Details */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Calendar className="h-5 w-5" />
                  Booking Details
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Check-in</label>
                  <p className="text-lg">{format(checkInDate, 'EEEE, MMMM dd, yyyy')}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Check-out</label>
                  <p className="text-lg">{format(checkOutDate, 'EEEE, MMMM dd, yyyy')}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Duration</label>
                  <p className="text-lg">{nights} night{nights !== 1 ? 's' : ''}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Booking Type</label>
                  <p className="text-lg">
                    {booking.isEstateBooking ? 'Estate Booking' : 
                     booking.isActivityOnlyBooking ? 'Activity Only' : 
                     'Property Booking'}
                  </p>
                </div>
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Created</label>
                  <p>{format(new Date(booking.createdAt), 'MMM dd, yyyy HH:mm')}</p>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Property Information */}
          {booking.property && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <MapPin className="h-5 w-5" />
                  Property Information
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid gap-4 md:grid-cols-3">
                  <div>
                    <label className="text-sm font-medium text-muted-foreground">Property Name</label>
                    <p className="text-lg font-semibold">{booking.property.name}</p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-muted-foreground">Type</label>
                    <p className="text-lg">{booking.property.type}</p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-muted-foreground">Base Price</label>
                    <p className="text-lg">${booking.property.basePrice.toLocaleString()}/night</p>
                  </div>
                </div>
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Max Occupancy</label>
                  <p>{booking.property.maxOccupancy} guests</p>
                </div>
                {booking.property.description && (
                  <div>
                    <label className="text-sm font-medium text-muted-foreground">Description</label>
                    <p className="text-sm text-muted-foreground">{booking.property.description}</p>
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {/* Add-ons */}
          {booking.addOns.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle>Add-ons</CardTitle>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Add-on</TableHead>
                      <TableHead>Description</TableHead>
                      <TableHead>Quantity</TableHead>
                      <TableHead>Unit Price</TableHead>
                      <TableHead>Total</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {booking.addOns.map((addOn) => (
                      <TableRow key={addOn.id}>
                        <TableCell className="font-medium">{addOn.addOn.name}</TableCell>
                        <TableCell>{addOn.addOn.description}</TableCell>
                        <TableCell>{addOn.quantity}</TableCell>
                        <TableCell>${addOn.addOn.price.toLocaleString()}</TableCell>
                        <TableCell>${addOn.price.toLocaleString()}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          )}

          {/* Activities */}
          {booking.activities.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle>Activities</CardTitle>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Activity</TableHead>
                      <TableHead>Date & Time</TableHead>
                      <TableHead>Participants</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Total Price</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {booking.activities.map((activity) => (
                      <TableRow key={activity.id}>
                        <TableCell className="font-medium">{activity.activity.name}</TableCell>
                        <TableCell>
                          <div>
                            <div>{format(new Date(activity.date), 'MMM dd, yyyy')}</div>
                            <div className="text-sm text-muted-foreground">{activity.time}</div>
                          </div>
                        </TableCell>
                        <TableCell>{activity.participants}</TableCell>
                        <TableCell>
                          <Badge className={getStatusColor(activity.status)}>
                            {activity.status}
                          </Badge>
                        </TableCell>
                        <TableCell>${activity.totalPrice.toLocaleString()}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          )}

          {/* Payment History */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <CreditCard className="h-5 w-5" />
                Payment History
              </CardTitle>
            </CardHeader>
            <CardContent>
              {booking.payments.length > 0 ? (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Date</TableHead>
                      <TableHead>Amount</TableHead>
                      <TableHead>Method</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Reference</TableHead>
                      <TableHead>Notes</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {booking.payments.map((payment) => (
                      <TableRow key={payment.id}>
                        <TableCell>
                          {format(new Date(payment.createdAt), 'MMM dd, yyyy HH:mm')}
                        </TableCell>
                        <TableCell className="font-medium">
                          ${payment.amount.toLocaleString()} {payment.currency}
                        </TableCell>
                        <TableCell>
                          <Badge className={getPaymentMethodColor(payment.method)}>
                            {payment.method}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <Badge className={getPaymentStatusColor(payment.status)}>
                            {payment.status}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground">
                          {payment.externalReference || payment.stripePaymentIntentId || '-'}
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground">
                          {payment.notes || '-'}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              ) : (
                <div className="text-center py-8">
                  <CreditCard className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                  <h3 className="text-lg font-semibold">No payments recorded</h3>
                  <p className="text-muted-foreground">
                    No payment transactions have been recorded for this booking yet.
                  </p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Notes */}
          {booking.notes && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <FileText className="h-5 w-5" />
                  Notes
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="whitespace-pre-wrap">{booking.notes}</p>
              </CardContent>
            </Card>
          )}
        </div>
      </SidebarInset>
  );
}