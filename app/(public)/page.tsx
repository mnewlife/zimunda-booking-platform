import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { MapPin, Users, Star, Coffee, Mountain, TreePine, Wifi, Car, Waves, UtensilsCrossed } from "lucide-react";
import Link from "next/link";
import Image from "next/image";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function getProperties() {
  try {
    const properties = await prisma.property.findMany({
      where: {
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
      },
      orderBy: {
        createdAt: 'desc',
      },
    });
    return properties;
  } catch (error) {
    console.error('Error fetching properties:', error);
    return [];
  }
}

async function getActivities() {
  try {
    const activities = await prisma.activity.findMany({
      orderBy: {
        createdAt: 'desc',
      },
      take: 4,
    });
    return activities;
  } catch (error) {
    console.error('Error fetching activities:', error);
    return [];
  }
}

const amenityIcons: Record<string, any> = {
  wifi: Wifi,
  car: Car,
  waves: Waves,
  'utensils-crossed': UtensilsCrossed,
  mountain: Mountain,
  'tree-pine': TreePine,
};

export default async function HomePage() {
  const [properties, activities] = await Promise.all([
    getProperties(),
    getActivities(),
  ]);

  return (
    <div className="min-h-screen">
      {/* Hero Section */}
      <section className="relative h-screen flex items-center justify-center bg-gradient-to-br from-gray-900 via-gray-800 to-gray-600">
        <div className="absolute inset-0 bg-black/40" />
        <div className="relative z-10 text-center text-white px-4 max-w-4xl mx-auto">
          <h1 className="text-5xl md:text-7xl font-bold mb-6">
            Zimunda Estate
          </h1>
          <p className="text-xl md:text-2xl mb-8 text-gray-100">
            Your Mountain Retreat in the Heart of Vumba
          </p>
          <p className="text-lg mb-12 text-gray-200 max-w-2xl mx-auto">
            Escape to luxury cottages and cabins nestled in the pristine Vumba Mountains. 
            Experience breathtaking views, coffee farm tours, and unforgettable moments in nature.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Button asChild size="lg" className="bg-gray-600 ring-2 ring-white hover:bg-gray-700 text-white">
              <Link href="/properties">Explore Properties</Link>
            </Button>
            <Button asChild variant="outline" size="lg" className="border-white text-black hover:bg-white hover:text-gray-900 ring-2 ring-white hover:ring-gray-300">
              <Link href="/activities">Discover Activities</Link>
            </Button>
          </div>
        </div>
      </section>

      {/* Properties Section */}
      <section id="properties" className="py-20 px-4 bg-white">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold text-gray-900 mb-4">
              Our Properties
            </h2>
            <p className="text-xl text-gray-600 max-w-2xl mx-auto">
              Choose from our collection of luxury cottages and cozy cabins, 
              each offering unique experiences and stunning mountain views.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {properties.map((property) => {
              const mainImage = property.images[0];
              return (
                <Card key={property.id} className="overflow-hidden hover:shadow-lg transition-shadow">
                  <div className="relative h-64">
                    {mainImage ? (
                      <Image
                        src={mainImage.url}
                        alt={mainImage.alt || property.name}
                        fill
                        className="object-cover"
                      />
                    ) : (
                      <div className="w-full h-full bg-gradient-to-br from-green-400 to-green-600 flex items-center justify-center">
                        <Mountain className="h-16 w-16 text-white" />
                      </div>
                    )}
                    <Badge className="absolute top-4 left-4 bg-green-600">
                      {property.type.replace('_', ' ')}
                    </Badge>
                  </div>
                  <CardHeader>
                    <CardTitle className="flex items-center justify-between">
                      {property.name}
                      <span className="text-lg font-semibold text-green-600">
                        ${property.basePrice.toString()}/night
                      </span>
                    </CardTitle>
                    <CardDescription className="flex items-center gap-2 text-sm">
                      <Users className="h-4 w-4" />
                      Up to {property.maxOccupancy} guests
                      <MapPin className="h-4 w-4 ml-2" />
                      Vumba Mountains
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <p className="text-gray-600 mb-4 line-clamp-3">
                      {property.description}
                    </p>
                    
                    {/* Amenities */}
                    <div className="flex flex-wrap gap-2 mb-4">
                      {property.amenities.slice(0, 4).map((amenity) => {
                        const IconComponent = amenityIcons[amenity.amenity.icon] || Mountain;
                        return (
                          <Badge key={amenity.id} variant="secondary" className="text-xs">
                            <IconComponent className="h-3 w-3 mr-1" />
                            {amenity.amenity.name}
                          </Badge>
                        );
                      })}
                      {property.amenities.length > 4 && (
                        <Badge variant="secondary" className="text-xs">
                          +{property.amenities.length - 4} more
                        </Badge>
                      )}
                    </div>

                    <Button asChild className="w-full bg-black hover:bg-gray-700">
                      <Link href={`/properties/${property.slug}`}>
                        View Details & Book
                      </Link>
                    </Button>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </div>
      </section>

      {/* Activities Section */}
      <section id="activities" className="py-20 px-4 bg-gray-50">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold text-gray-900 mb-4">
              Mountain Activities
            </h2>
            <p className="text-xl text-gray-600 max-w-2xl mx-auto">
              Enhance your stay with our curated selection of activities. 
              From coffee farm tours to nature hikes, create memories that last a lifetime.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {activities.map((activity) => (
              <Card key={activity.id} className="hover:shadow-lg transition-shadow">
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <Coffee className="h-8 w-8 text-green-600" />
                    <Badge variant="outline">
                      ${activity.price.toString()}
                    </Badge>
                  </div>
                  <CardTitle className="text-lg">{activity.name}</CardTitle>
                  <CardDescription>
                    {Math.floor(activity.duration / 60)}h {activity.duration % 60}m • Up to {activity.capacity} people
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-gray-600 mb-4 line-clamp-3">
                    {activity.description}
                  </p>
                  <Button variant="outline" size="sm" className="w-full hover:bg-black hover:text-white">
                    Learn More
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>

          <div className="text-center mt-12">
            <Button asChild size="lg" className="bg-black hover:bg-gray-700">
              <Link href="/activities">
                View All Activities
              </Link>
            </Button>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-20 px-4 bg-white">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold text-gray-900 mb-4">
              Why Choose Zimunda Estate?
            </h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="text-center">
              <div className="bg-green-100 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
                <Mountain className="h-8 w-8 text-green-600" />
              </div>
              <h3 className="text-xl font-semibold mb-2">Stunning Location</h3>
              <p className="text-gray-600">
                Nestled in the pristine Vumba Mountains with breathtaking views and fresh mountain air.
              </p>
            </div>

            <div className="text-center">
              <div className="bg-green-100 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
                <Coffee className="h-8 w-8 text-green-600" />
              </div>
              <h3 className="text-xl font-semibold mb-2">Coffee Farm Experience</h3>
              <p className="text-gray-600">
                Learn about coffee cultivation and enjoy fresh, locally grown coffee from our own plantation.
              </p>
            </div>

            <div className="text-center">
              <div className="bg-green-100 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
                <Star className="h-8 w-8 text-green-600" />
              </div>
              <h3 className="text-xl font-semibold mb-2">Luxury Comfort</h3>
              <p className="text-gray-600">
                Modern amenities and thoughtful touches ensure your stay is comfortable and memorable.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 px-4 bg-gray-800 text-white">
        <div className="max-w-4xl mx-auto text-center">
          <h2 className="text-4xl font-bold mb-4">
            Ready for Your Mountain Escape?
          </h2>
          <p className="text-xl mb-8 text-gray-100">
            Book your stay today and discover the magic of the Vumba Mountains.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Button asChild size="lg" className="bg-white ring-2 ring-white text-gray-800 hover:bg-gray-100">
              <Link href="/properties">
                Book Now
              </Link>
            </Button>
            <Button asChild variant="outline" size="lg" className="border-white text-white hover:bg-white hover:text-gray-800 ring-2 ring-white bg-gray-800">
              <Link href="/contact">
                Contact Us
              </Link>
            </Button>
          </div>
        </div>
      </section>
    </div>
  );
}
