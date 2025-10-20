'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Star,
  Users,
  Bed,
  Bath,
  MapPin,
  ChevronLeft,
  ChevronRight,
  Heart,
  Share2
} from 'lucide-react';
import { formatCurrency } from '@/lib/utils';

interface Property {
  id: string;
  name: string;
  slug: string;
  type: string;
  basePrice: number;
  maxOccupancy: number;
  bedrooms: number;
  bathrooms: number;
  address: string;
  images: {
    id: string;
    url: string;
    alt?: string;
  }[];
  amenities: {
    id: string;
    name: string;
  }[];
}

interface SimilarPropertiesProps {
  currentPropertyId: string;
  propertyType?: string;
  maxOccupancy?: number;
  priceRange?: {
    min: number;
    max: number;
  };
  limit?: number;
}

function PropertyCardSkeleton() {
  return (
    <Card className="overflow-hidden">
      <Skeleton className="h-48 w-full" />
      <CardContent className="p-4">
        <Skeleton className="h-4 w-3/4 mb-2" />
        <Skeleton className="h-3 w-1/2 mb-3" />
        <div className="flex justify-between items-center">
          <Skeleton className="h-4 w-20" />
          <Skeleton className="h-8 w-24" />
        </div>
      </CardContent>
    </Card>
  );
}

function SimilarPropertyCard({ property }: { property: Property }) {
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [imageError, setImageError] = useState(false);
  const [isLiked, setIsLiked] = useState(false);

  const nextImage = () => {
    setCurrentImageIndex((prev) => 
      prev === property.images.length - 1 ? 0 : prev + 1
    );
  };

  const prevImage = () => {
    setCurrentImageIndex((prev) => 
      prev === 0 ? property.images.length - 1 : prev - 1
    );
  };

  const formatPropertyType = (type: string) => {
    return type.charAt(0).toUpperCase() + type.slice(1).toLowerCase();
  };

  return (
    <Card className="overflow-hidden group hover:shadow-lg transition-shadow duration-300">
      <div className="relative">
        {/* Image Carousel */}
        <div className="relative h-48 bg-gray-200">
          {property.images.length > 0 && !imageError ? (
            <>
              <Image
                src={property.images[currentImageIndex]?.url || '/placeholder-property.jpg'}
                alt={property.images[currentImageIndex]?.alt || property.name}
                fill
                className="object-cover transition-transform duration-300 group-hover:scale-105"
                onError={() => setImageError(true)}
              />
              
              {/* Image Navigation */}
              {property.images.length > 1 && (
                <>
                  <button
                    onClick={prevImage}
                    className="absolute left-2 top-1/2 -translate-y-1/2 bg-white/80 hover:bg-white rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity"
                  >
                    <ChevronLeft className="h-4 w-4" />
                  </button>
                  <button
                    onClick={nextImage}
                    className="absolute right-2 top-1/2 -translate-y-1/2 bg-white/80 hover:bg-white rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity"
                  >
                    <ChevronRight className="h-4 w-4" />
                  </button>
                  
                  {/* Image Indicators */}
                  <div className="absolute bottom-2 left-1/2 -translate-x-1/2 flex space-x-1">
                    {property.images.map((_, index) => (
                      <div
                        key={index}
                        className={`w-1.5 h-1.5 rounded-full transition-colors ${
                          index === currentImageIndex ? 'bg-white' : 'bg-white/50'
                        }`}
                      />
                    ))}
                  </div>
                </>
              )}
            </>
          ) : (
            <div className="flex items-center justify-center h-full bg-gray-100">
              <div className="text-center">
                <div className="w-16 h-16 bg-gray-200 rounded-lg mx-auto mb-2" />
                <p className="text-sm text-gray-500">No image available</p>
              </div>
            </div>
          )}
        </div>

        {/* Action Buttons */}
        <div className="absolute top-2 right-2 flex space-x-1">
          <button
            onClick={() => setIsLiked(!isLiked)}
            className="bg-white/80 hover:bg-white rounded-full p-1.5 transition-colors"
          >
            <Heart className={`h-4 w-4 ${isLiked ? 'fill-red-500 text-red-500' : 'text-gray-600'}`} />
          </button>
          <button className="bg-white/80 hover:bg-white rounded-full p-1.5 transition-colors">
            <Share2 className="h-4 w-4 text-gray-600" />
          </button>
        </div>

        {/* Property Type Badge */}
        <div className="absolute top-2 left-2">
          <Badge variant="secondary" className="bg-white/90 text-gray-800">
            {formatPropertyType(property.type)}
          </Badge>
        </div>
      </div>

      <CardContent className="p-4">
        {/* Property Info */}
        <div className="mb-3">
          <h3 className="font-semibold text-gray-900 mb-1 line-clamp-1">
            {property.name}
          </h3>
          <div className="flex items-center text-sm text-gray-600 mb-2">
            <MapPin className="h-3 w-3 mr-1" />
            <span className="line-clamp-1">{property.address}</span>
          </div>
          

        </div>

        {/* Property Details */}
        <div className="flex items-center space-x-4 text-sm text-gray-600 mb-3">
          <div className="flex items-center space-x-1">
            <Users className="h-3 w-3" />
            <span>{property.maxOccupancy}</span>
          </div>
          <div className="flex items-center space-x-1">
            <Bed className="h-3 w-3" />
            <span>{property.bedrooms}</span>
          </div>
          <div className="flex items-center space-x-1">
            <Bath className="h-3 w-3" />
            <span>{property.bathrooms}</span>
          </div>
        </div>

        {/* Amenities Preview */}
        {property.amenities.length > 0 && (
          <div className="mb-3">
            <div className="flex flex-wrap gap-1">
              {property.amenities.slice(0, 2).map((amenity) => (
                <Badge key={amenity.id} variant="outline" className="text-xs">
                  {amenity.name}
                </Badge>
              ))}
              {property.amenities.length > 2 && (
                <Badge variant="outline" className="text-xs">
                  +{property.amenities.length - 2}
                </Badge>
              )}
            </div>
          </div>
        )}

        {/* Price and Actions */}
        <div className="flex items-center justify-between">
          <div>
            <span className="text-lg font-bold text-gray-900">
              {formatCurrency(property.basePrice)}
            </span>
            <span className="text-sm text-gray-500">/night</span>
          </div>
          <Button asChild size="sm" className="bg-green-600 hover:bg-green-700">
            <Link href={`/properties/${property.slug}`}>
              View Details
            </Link>
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

export function SimilarProperties({
  currentPropertyId,
  propertyType,
  maxOccupancy,
  priceRange,
  limit = 6
}: SimilarPropertiesProps) {
  const [properties, setProperties] = useState<Property[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchSimilarProperties = async () => {
      try {
        setLoading(true);
        const params = new URLSearchParams({
          exclude: currentPropertyId,
          limit: limit.toString(),
        });

        if (propertyType) {
          params.append('type', propertyType);
        }
        if (maxOccupancy) {
          params.append('maxOccupancy', maxOccupancy.toString());
        }
        if (priceRange) {
          params.append('minPrice', priceRange.min.toString());
          params.append('maxPrice', priceRange.max.toString());
        }

        const response = await fetch(`/api/properties/similar?${params}`);
        if (!response.ok) {
          throw new Error('Failed to fetch similar properties');
        }

        const data = await response.json();
        setProperties(data.properties || []);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'An error occurred');
      } finally {
        setLoading(false);
      }
    };

    fetchSimilarProperties();
  }, [currentPropertyId, propertyType, maxOccupancy, priceRange, limit]);

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Similar Properties</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {Array.from({ length: 3 }).map((_, index) => (
              <PropertyCardSkeleton key={index} />
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Similar Properties</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8">
            <p className="text-gray-500">Unable to load similar properties.</p>
            <Button
              variant="outline"
              size="sm"
              onClick={() => window.location.reload()}
              className="mt-2"
            >
              Try Again
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (properties.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Similar Properties</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8">
            <p className="text-gray-500">No similar properties found.</p>
            <Button asChild variant="outline" size="sm" className="mt-2">
              <Link href="/properties">
                Browse All Properties
              </Link>
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <span>Similar Properties</span>
          <Button asChild variant="outline" size="sm">
            <Link href="/properties">
              View All
            </Link>
          </Button>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {properties.map((property) => (
            <SimilarPropertyCard key={property.id} property={property} />
          ))}
        </div>
      </CardContent>
    </Card>
  );
}