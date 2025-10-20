import { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { prisma } from '@/lib/db';
import { PropertyGallery } from '@/components/property/property-gallery';
import { PropertyDetails } from '@/components/property/property-details';
import { PropertyBooking } from '@/components/property/property-booking';
import { PropertyAmenities } from '@/components/property/property-amenities';
import { PropertyLocation } from '@/components/property/property-location';
import { SimilarProperties } from '@/components/property/similar-properties';
import { Breadcrumb, BreadcrumbItem, BreadcrumbLink, BreadcrumbList, BreadcrumbPage, BreadcrumbSeparator } from '@/components/ui/breadcrumb';
import Link from 'next/link';

interface PropertyPageProps {
  params: Promise<{
    slug: string;
  }>;
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
      },
      amenities: {
        include: {
          amenity: true,
        },
        orderBy: {
          amenity: {
            name: 'asc',
          },
        },
      },
      bookings: {
        where: {
          status: {
            in: ['CONFIRMED', 'COMPLETED'],
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

async function getSimilarProperties(currentPropertyId: string, propertyType: string) {
  const properties = await prisma.property.findMany({
    where: {
      id: {
        not: currentPropertyId,
      },
      type: propertyType,
      status: 'ACTIVE',
    },
    include: {
      images: {
        orderBy: {
          order: 'asc',
        },
        take: 1,
      },
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
    take: 3,
    orderBy: {
      createdAt: 'desc',
    },
  });

  return properties;
}

export async function generateMetadata({ params }: PropertyPageProps): Promise<Metadata> {
  const resolvedParams = await params;
  const property = await getProperty(resolvedParams.slug);

  if (!property) {
    return {
      title: 'Property Not Found | Zimunda Estate',
    };
  }

  return {
    title: `${property.name} | Zimunda Estate`,
    description: property.description,
    openGraph: {
      title: property.name,
      description: property.description,
      images: property.images.length > 0 ? [property.images[0].url] : [],
    },
  };
}

export default async function PropertyPage({ params }: PropertyPageProps) {
  const resolvedParams = await params;
  const property = await getProperty(resolvedParams.slug);

  if (!property) {
    notFound();
  }

  const similarProperties = await getSimilarProperties(property.id, property.type);

  /*const breadcrumbItems = [
    { label: 'Home', href: '/' },
    { label: 'Properties', href: '/properties' },
    { label: property.name, href: `/properties/${property.slug}` },
  ];*/

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Breadcrumb */}
      <div className="bg-white border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          {/*<Breadcrumb items={breadcrumbItems} className="text-black" />*/}
          <Breadcrumb>
            <BreadcrumbList>
              <BreadcrumbItem>
                <BreadcrumbLink asChild>
                  <Link href="/">Home</Link>
                </BreadcrumbLink>
              </BreadcrumbItem>
              <BreadcrumbSeparator />
              <BreadcrumbItem>
                <BreadcrumbLink asChild>
                  <Link href="/properties">Properties</Link>
                </BreadcrumbLink>
              </BreadcrumbItem>
              <BreadcrumbSeparator />
              <BreadcrumbItem>
                <BreadcrumbPage>{property.name}</BreadcrumbPage>
              </BreadcrumbItem>
            </BreadcrumbList>
          </Breadcrumb>
        </div>
      </div>

      {/* Property Gallery */}
      <PropertyGallery images={property.images} propertyName={property.name} />

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Left Column - Property Details */}
          <div className="lg:col-span-2 space-y-8">
            <PropertyDetails property={{
              ...property,
              basePrice: Number(property.basePrice)
            }} />
            <PropertyAmenities amenities={property.amenities} />
            <PropertyLocation 
              property={{
                name: property.name,
                location: property.location
              }}
            />

          </div>

          {/* Right Column - Booking Widget */}
          <div className="lg:col-span-1">
            <div className="sticky top-8">
              <PropertyBooking 
                property={{
                  id: property.id,
                  name: property.name,
                  slug: property.slug,
                  basePrice: Number(property.basePrice),
                  maxOccupancy: property.maxOccupancy,
                  cleaningFee: property.cleaningFee ? Number(property.cleaningFee) : undefined,
                  securityDeposit: property.securityDeposit ? Number(property.securityDeposit) : undefined,
                }}
                bookedDates={property.bookings.map(booking => ({
                  checkIn: booking.checkIn,
                  checkOut: booking.checkOut,
                }))}
              />
            </div>
          </div>
        </div>

        {/* Similar Properties */}
        {similarProperties.length > 0 && (
          <div className="mt-16">
            <SimilarProperties 
              properties={similarProperties.map(prop => ({
                ...prop,
                basePrice: Number(prop.basePrice)
              }))}
              currentPropertyType={property.type}
            />
          </div>
        )}
      </div>
    </div>
  );
}