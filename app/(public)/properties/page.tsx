import { Metadata } from 'next';
import prisma from '@/lib/prisma';
import { PropertyCard } from '@/components/property/property-card';
import { PropertyFilters } from '@/components/property/property-filters';
import { Suspense } from 'react';
import { Skeleton } from '@/components/ui/skeleton';

export const metadata: Metadata = {
  title: 'Properties | Zimunda Estate',
  description: 'Discover our beautiful cottages and cabins in the heart of Vumba, Zimbabwe',
};

interface SearchParams {
  type?: string;
  minPrice?: string;
  maxPrice?: string;
  occupancy?: string;
  amenities?: string;
}

interface PropertiesPageProps {
  searchParams: Promise<SearchParams>;
}

async function getProperties(searchParams: SearchParams) {
  const where: any = {
    status: 'ACTIVE',
  };

  // Filter by property type
  if (searchParams.type && searchParams.type !== 'all') {
    where.type = searchParams.type.toUpperCase();
  }

  // Filter by price range
  if (searchParams.minPrice || searchParams.maxPrice) {
    where.basePrice = {};
    if (searchParams.minPrice) {
      where.basePrice.gte = parseFloat(searchParams.minPrice);
    }
    if (searchParams.maxPrice) {
      where.basePrice.lte = parseFloat(searchParams.maxPrice);
    }
  }

  // Filter by occupancy
  if (searchParams.occupancy) {
    where.maxOccupancy = {
      gte: parseInt(searchParams.occupancy),
    };
  }

  // Filter by amenities
  if (searchParams.amenities) {
    const amenityIds = searchParams.amenities.split(',');
    where.amenities = {
      some: {
        id: {
          in: amenityIds,
        },
      },
    };
  }

  const properties = await prisma.property.findMany({
    where,
    include: {
      images: {
        orderBy: {
          order: 'asc',
        },
      },
      amenities: true,
      _count: {
        select: {
          bookings: {
            where: {
              status: 'CONFIRMED',
              checkOut: {
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

  // Convert Decimal to number for client components
  return properties.map(property => ({
    ...property,
    basePrice: Number(property.basePrice),
  }));
}

async function getAmenities() {
  return await prisma.amenity.findMany({
    orderBy: {
      name: 'asc',
    },
  });
}

function PropertyCardSkeleton() {
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

function PropertiesGrid({ searchParams }: { searchParams: SearchParams }) {
  return (
    <Suspense
      fallback={
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {Array.from({ length: 6 }).map((_, i) => (
            <PropertyCardSkeleton key={i} />
          ))}
        </div>
      }
    >
      <PropertiesContent searchParams={searchParams} />
    </Suspense>
  );
}

async function PropertiesContent({ searchParams }: { searchParams: SearchParams }) {
  const [properties, amenities] = await Promise.all([
    getProperties(searchParams),
    getAmenities(),
  ]);

  return (
    <>
      <PropertyFilters amenities={amenities} />
      
      {properties.length === 0 ? (
        <div className="text-center py-12">
          <h3 className="text-lg font-semibold text-gray-900 mb-2">
            No properties found
          </h3>
          <p className="text-gray-600">
            Try adjusting your filters to see more results.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {properties.map((property) => (
            <PropertyCard key={property.id} property={property} />
          ))}
        </div>
      )}
    </>
  );
}

export default async function PropertiesPage({ searchParams }: PropertiesPageProps) {
  const resolvedSearchParams = await searchParams;
  return (
    <div className="min-h-screen bg-gray-50">
      {/* Hero Section */}
      <div className="bg-gradient-to-r from-gray-700 to-green-600 text-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
          <div className="text-center">
            <h1 className="text-4xl font-bold mb-4">
              Our Properties
            </h1>
            <p className="text-xl text-green-100 max-w-2xl mx-auto">
              Discover our collection of beautiful cottages and cabins nestled in the scenic Vumba mountains
            </p>
          </div>
        </div>
      </div>

      {/* Properties Section */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <PropertiesGrid searchParams={resolvedSearchParams} />
      </div>
    </div>
  );
}