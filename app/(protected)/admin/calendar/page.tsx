import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { CalendarScheduler } from "@/components/admin/calendar-scheduler";
import { Metadata } from "next";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";
import { Separator } from "@/components/ui/separator";
import {
  SidebarInset,
  SidebarTrigger,
} from "@/components/ui/sidebar";

export const metadata: Metadata = {
  title: "Calendar - Admin Dashboard",
  description: "View and manage property bookings in calendar format",
};

interface BookingData {
  id: string;
  checkIn: string;
  checkOut: string;
  status: string;
  totalPrice: number;
  adults: number;
  children: number;
  guest: {
    name: string;
    email: string;
  };
  property?: {
    name: string;
  } | null;
  source?: string;
}

export default async function CalendarPage() {
  // Get session
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  if (!session?.user || (session.user as any).role !== 'ADMIN') {
    redirect('/login');
  }

  // Fetch local bookings from database
  const localBookings = await prisma.booking.findMany({
    include: {
      guest: true,
      property: true,
    },
    orderBy: {
      checkIn: "asc",
    },
  });

  // Transform local bookings to the format expected by the component
  const transformedLocalBookings: BookingData[] = localBookings.map((booking) => ({
    id: booking.id,
    checkIn: booking.checkIn.toISOString(),
    checkOut: booking.checkOut.toISOString(),
    status: booking.status,
    totalPrice: Number(booking.totalPrice),
    adults: booking.adults,
    children: booking.children,
    guest: {
      name: booking.guest.name,
      email: booking.guest.email,
    },
    property: booking.property
      ? {
          name: booking.property.name,
        }
      : null,
    source: "local",
  }));

  // Fetch Airbnb bookings
  let airbnbBookings: BookingData[] = [];
  try {
    const airbnbResponse = await fetch(`${process.env.NEXTAUTH_URL || 'http://localhost:3000'}/api/admin/airbnb-calendar`, {
      headers: {
        'Cookie': await headers().then(h => h.get('cookie') || ''),
      },
    });
    
    if (airbnbResponse.ok) {
      airbnbBookings = await airbnbResponse.json();
    } else {
      console.error('Failed to fetch Airbnb bookings:', airbnbResponse.status);
    }
  } catch (error) {
    console.error('Error fetching Airbnb bookings:', error);
  }

  // Combine local and Airbnb bookings
  const allBookings = [...transformedLocalBookings, ...airbnbBookings].sort(
    (a, b) => new Date(a.checkIn).getTime() - new Date(b.checkIn).getTime()
  );

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
              <BreadcrumbItem>
                <BreadcrumbPage>Calendar</BreadcrumbPage>
              </BreadcrumbItem>
            </BreadcrumbList>
          </Breadcrumb>
        </div>
      </header>

      <div className="flex flex-1 flex-col gap-4 p-4 pt-0">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Calendar Management</h1>
            <p className="text-muted-foreground">
              View and manage property bookings in calendar format
            </p>
          </div>
        </div>
        
        <CalendarScheduler initialBookings={allBookings} />
      </div>
    </SidebarInset>
  );
}