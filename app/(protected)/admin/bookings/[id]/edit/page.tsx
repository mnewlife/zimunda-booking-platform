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
import { BookingFormPage } from '@/components/admin/booking-form-page';
import prisma from '@/lib/prisma';

export const metadata: Metadata = {
  title: 'Edit Booking | Admin Dashboard',
  description: 'Edit booking details',
};

interface EditBookingPageProps {
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
        payments: true,
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

export default async function EditBookingPage({ params }: EditBookingPageProps) {
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
                  <BreadcrumbPage>Edit Booking</BreadcrumbPage>
                </BreadcrumbItem>
              </BreadcrumbList>
            </Breadcrumb>
          </div>
        </header>

        <div className="flex flex-1 flex-col gap-4 p-4 pt-0">
          <div className="mb-6">
            <h1 className="text-3xl font-bold tracking-tight">Edit Booking</h1>
            <p className="text-muted-foreground">
              Update booking details for {booking.guest.name}
            </p>
          </div>
          
          <BookingFormPage booking={booking} />
        </div>
      </SidebarInset>
  );
}