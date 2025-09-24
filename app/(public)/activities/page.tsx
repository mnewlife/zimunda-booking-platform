import { Metadata } from 'next';
import { prisma } from '@/lib/db';
import { ActivityCard } from '@/components/activity/activity-card';
import { ActivityFilters } from '@/components/activity/activity-filters';
import { Suspense } from 'react';
import { Skeleton } from '@/components/ui/skeleton';

export const metadata: Metadata = {
  title: 'Activities | Zimunda Estate',
  description: 'Discover exciting activities and experiences at Zimunda Estate in the beautiful Vumba mountains',
};

interface SearchParams {
  type?: string;
  duration?: string;
  difficulty?: string;
  minPrice?: string;
  maxPrice?: string;
}

interface ActivitiesPageProps {
  searchParams: Promise<SearchParams>;
}

async function getActivities(searchParams: SearchParams) {
  const where: any = {};

  // Filter by activity type
  if (searchParams.type && searchParams.type !== 'all') {
    where.type = searchParams.type.toUpperCase();
  }

  // Filter by duration
  if (searchParams.duration) {
    const durationHours = parseInt(searchParams.duration);
    where.duration = {
      lte: durationHours,
    };
  }

  // Filter by price range
  if (searchParams.minPrice || searchParams.maxPrice) {
    where.price = {};
    if (searchParams.minPrice) {
      where.price.gte = parseFloat(searchParams.minPrice);
    }
    if (searchParams.maxPrice) {
      where.price.lte = parseFloat(searchParams.maxPrice);
    }
  }

  const activities = await prisma.activity.findMany({
    where,
    select: {
      id: true,
      name: true,
      type: true,
      slug: true,
      description: true,
      duration: true,
      maxParticipants: true,
      price: true,
      difficulty: true,
      location: true,
      bookable: true,
      images: {
        select: {
          id: true,
          url: true,
          alt: true,
          order: true,
        },
      },
      _count: {
        select: {
          bookings: {
            where: {
              status: 'CONFIRMED',
              date: {
                gte: new Date(),
              },
            },
          },
        },
      },
    },
    orderBy: {
      createdAt: 'desc',
    },
  });

  // Convert Decimal prices to numbers for client components
  return activities.map(activity => ({
    ...activity,
    price: Number(activity.price),
  }));
}

function ActivityCardSkeleton() {
  return (
    <div className="bg-white rounded-lg shadow-md overflow-hidden">
      <Skeleton className="h-64 w-full" />
      <div className="p-6 space-y-4">
        <Skeleton className="h-6 w-3/4" />
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-4 w-2/3" />
        <div className="flex justify-between items-center">
          <Skeleton className="h-6 w-24" />
          <Skeleton className="h-10 w-32" />
        </div>
      </div>
    </div>
  );
}

function ActivitiesGrid({ searchParams }: { searchParams: SearchParams }) {
  return (
    <Suspense
      fallback={
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {Array.from({ length: 6 }).map((_, i) => (
            <ActivityCardSkeleton key={i} />
          ))}
        </div>
      }
    >
      <ActivitiesContent searchParams={searchParams} />
    </Suspense>
  );
}

async function ActivitiesContent({ searchParams }: { searchParams: SearchParams }) {
  const activities = await getActivities(searchParams);

  return (
    <>
      <ActivityFilters />
      
      {activities.length === 0 ? (
        <div className="text-center py-12">
          <h3 className="text-lg font-semibold text-gray-900 mb-2">
            No activities found
          </h3>
          <p className="text-gray-600">
            Try adjusting your filters to see more results.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {activities.map((activity) => (
            <ActivityCard key={activity.id} activity={activity} />
          ))}
        </div>
      )}
    </>
  );
}

export default async function ActivitiesPage({ searchParams }: ActivitiesPageProps) {
  const resolvedSearchParams = await searchParams;
  
  return (
    <div className="min-h-screen bg-gray-50">
      {/* Hero Section */}
      <div className="bg-gradient-to-r from-blue-600 to-green-600 text-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
          <div className="text-center">
            <h1 className="text-4xl font-bold mb-4">
              Activities & Experiences
            </h1>
            <p className="text-xl text-blue-100 max-w-2xl mx-auto">
              Immerse yourself in the natural beauty and adventure of the Vumba mountains with our curated activities
            </p>
          </div>
        </div>
      </div>

      {/* Activities Section */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <ActivitiesGrid searchParams={resolvedSearchParams} />
      </div>
    </div>
  );
}