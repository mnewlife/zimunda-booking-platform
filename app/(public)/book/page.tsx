import { Metadata } from 'next';
import { Suspense } from 'react';
import { notFound } from 'next/navigation';
import { prisma } from '@/lib/db';
import { BookingForm } from '@/components/booking/booking-form';
import { Skeleton } from '@/components/ui/skeleton';

export const metadata: Metadata = {
  title: 'Book Your Stay | Zimunda Estate',
  description: 'Complete your booking at Zimunda Estate',
};

interface BookPageProps {
  searchParams: {
    property?: string;
    activity?: string;
    checkIn?: string;
    checkOut?: string;
    guests?: string;
  };
}

async function getProperty(slug: string) {
  const property = await prisma.property.findUnique({
    where: {
      slug,
      status: 'ACTIVE',
    },
    include: {
      images: {
        orderBy: {
          order: 'asc',
        },
        take: 1,
      },
      amenities: {
        include: {
          amenity: true,
        },
      },
      addOns: {
        orderBy: {
          name: 'asc',
        },
      },
      bookings: {
        where: {
          status: {
            in: ['CONFIRMED'],
          },
        },
        select: {
          checkIn: true,
          checkOut: true,
        },
      },
    },
  });

  return property;
}

async function getActivities() {
  const activities = await prisma.activity.findMany({
    where: {
      bookable: true,
    },
    orderBy: {
      name: 'asc',
    },
  });

  return activities;
}

async function getActivity(id: string) {
  const activity = await prisma.activity.findUnique({
    where: {
      id,
      bookable: true,
    },
    include: {
      images: {
        orderBy: {
          order: 'asc',
        },
      },
    },
  });

  return activity;
}

async function getGlobalAddOns() {
  const globalAddOns = await prisma.addOn.findMany({
    where: {
      isGlobal: true,
    },
    orderBy: {
      name: 'asc',
    },
  });

  return globalAddOns;
}

function BookingPageSkeleton() {
  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Left Column */}
          <div className="lg:col-span-2 space-y-6">
            <Skeleton className="h-8 w-64" />
            <div className="space-y-4">
              <Skeleton className="h-32 w-full" />
              <Skeleton className="h-48 w-full" />
              <Skeleton className="h-40 w-full" />
            </div>
          </div>
          
          {/* Right Column */}
          <div className="lg:col-span-1">
            <Skeleton className="h-96 w-full" />
          </div>
        </div>
      </div>
    </div>
  );
}

async function BookingContent({ searchParams }: BookPageProps) {
  return (
    <Suspense fallback={<BookingPageSkeleton />}>
      <BookingPageContent searchParams={searchParams} />
    </Suspense>
  );
}

async function BookingPageContent({ searchParams }: BookPageProps) {
  const awaitedSearchParams = await searchParams;
  const { property: propertySlug, activity: activityId, checkIn, checkOut, guests } = awaitedSearchParams;

  // Check if this is an activity-only booking or property booking
  const isActivityBooking = !!activityId && !propertySlug;
  const isPropertyBooking = !!propertySlug;

  if (!isActivityBooking && !isPropertyBooking) {
    notFound();
  }

  let property = null;
  let activity = null;
  let activities = [];
  let globalAddOns = [];

  if (isActivityBooking) {
    [activity, globalAddOns] = await Promise.all([
      getActivity(activityId!),
      getGlobalAddOns(),
    ]);
    
    if (!activity) {
      notFound();
    }
  } else {
    [property, activities, globalAddOns] = await Promise.all([
      getProperty(propertySlug!),
      getActivities(),
      getGlobalAddOns(),
    ]);
    
    if (!property) {
      notFound();
    }
  }

  // Validate dates and guests
  let checkInDate: Date | undefined;
  let checkOutDate: Date | undefined;
  let guestCount = 1;
  const maxCapacity = isActivityBooking ? activity!.capacity : property!.maxOccupancy;

  try {
    if (checkIn) {
      checkInDate = new Date(checkIn);
      if (isNaN(checkInDate.getTime())) {
        checkInDate = undefined;
      }
    }
    
    if (checkOut) {
      checkOutDate = new Date(checkOut);
      if (isNaN(checkOutDate.getTime())) {
        checkOutDate = undefined;
      }
    }
    
    if (guests) {
      const parsedGuests = parseInt(guests);
      if (!isNaN(parsedGuests) && parsedGuests > 0 && parsedGuests <= maxCapacity) {
        guestCount = parsedGuests;
      }
    }
  } catch (error) {
    console.error('Error parsing booking parameters:', error);
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">
                Complete Your Booking
              </h1>
              <p className="text-gray-600 mt-1">
                {isActivityBooking 
                  ? `You're booking ${activity!.name}` 
                  : `You're booking ${property!.name}`
                }
              </p>
            </div>
            <div className="text-right">
              <p className="text-sm text-gray-500">Secure booking</p>
              <div className="flex items-center space-x-2 mt-1">
                <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                <span className="text-sm text-green-600 font-medium">SSL Protected</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <BookingForm
          property={property ? {
            id: property.id,
            name: property.name,
            slug: property.slug,
            type: property.type,
            basePrice: Number(property.basePrice),
            maxOccupancy: property.maxOccupancy,
            cleaningFee: property.cleaningFee ? Number(property.cleaningFee) : null,
            securityDeposit: property.securityDeposit ? Number(property.securityDeposit) : null,
            checkInTime: property.checkInTime,
            checkOutTime: property.checkOutTime,
            address: property.address,
            images: property.images,
            amenities: property.amenities,
            addOns: property.addOns.map(addOn => ({
              id: addOn.id,
              name: addOn.name,
              description: addOn.description,
              price: Number(addOn.price),
            })),
          } : undefined}
          activities={isActivityBooking && activity ? [{
            id: activity.id,
            name: activity.name,
            type: activity.type,
            description: activity.description,
            duration: activity.duration,
            price: Number(activity.price),
            capacity: activity.capacity,
            requirements: activity.requirements,
          }] : activities.map(activity => ({
            id: activity.id,
            name: activity.name,
            type: activity.type,
            description: activity.description,
            duration: activity.duration,
            price: Number(activity.price),
            capacity: activity.capacity,
            requirements: activity.requirements,
          }))}
          globalAddOns={globalAddOns.map(addOn => ({
            id: addOn.id,
            name: addOn.name,
            description: addOn.description,
            price: Number(addOn.price),
          }))}
          initialBookingData={{
            checkIn: checkInDate,
            checkOut: checkOutDate,
            guests: guestCount,
            ...(isActivityBooking && activity ? { selectedActivities: [activity.id] } : {}),
          }}
          bookedDates={property?.bookings.map(booking => ({
            checkIn: booking.checkIn,
            checkOut: booking.checkOut,
          })) || []}
        />
      </div>
    </div>
  );
}

export default async function BookPage({ searchParams }: BookPageProps) {
  return <BookingContent searchParams={searchParams} />;
}