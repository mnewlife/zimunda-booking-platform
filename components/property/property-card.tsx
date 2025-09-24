'use client';

import { useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  Users, 
  MapPin, 
  Star, 
  ChevronLeft, 
  ChevronRight,
  Wifi,
  Car,
  Coffee,
  Waves
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface PropertyCardProps {
  property: {
    id: string;
    name: string;
    type: string;
    slug: string;
    description: string;
    maxOccupancy: number;
    basePrice: number;
    images: {
      id: string;
      url: string;
      alt: string;
      order: number;
    }[];
    amenities: {
      id: string;
      name: string;
      icon: string;
    }[];
    _count: {
      bookings: number;
    };
  };
}

const amenityIcons: Record<string, any> = {
  wifi: Wifi,
  parking: Car,
  coffee: Coffee,
  pool: Waves,
};

export function PropertyCard({ property }: PropertyCardProps) {
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [imageError, setImageError] = useState(false);

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

  const getAmenityIcon = (iconName: string | null | undefined) => {
    if (!iconName) return Coffee;
    const IconComponent = amenityIcons[iconName.toLowerCase()] || Coffee;
    return IconComponent;
  };

  const mainImage = property.images[currentImageIndex];
  const fallbackImage = '/images/property-placeholder.jpg';

  return (
    <Card className="group hover:shadow-xl transition-all duration-300 overflow-hidden">
      {/* Image Carousel */}
      <div className="relative h-64 overflow-hidden">
        {property.images.length > 0 && !imageError ? (
          <>
            <Image
              src={mainImage?.url || fallbackImage}
              alt={mainImage?.alt || property.name}
              fill
              className="object-cover group-hover:scale-105 transition-transform duration-300"
              onError={() => setImageError(true)}
            />
            
            {/* Image Navigation */}
            {property.images.length > 1 && (
              <>
                <button
                  onClick={prevImage}
                  className="absolute left-2 top-1/2 transform -translate-y-1/2 bg-black/50 text-white p-1 rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                >
                  <ChevronLeft className="h-4 w-4" />
                </button>
                <button
                  onClick={nextImage}
                  className="absolute right-2 top-1/2 transform -translate-y-1/2 bg-black/50 text-white p-1 rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                >
                  <ChevronRight className="h-4 w-4" />
                </button>
                
                {/* Image Indicators */}
                <div className="absolute bottom-2 left-1/2 transform -translate-x-1/2 flex space-x-1">
                  {property.images.map((_, index) => (
                    <button
                      key={index}
                      onClick={() => setCurrentImageIndex(index)}
                      className={cn(
                        "w-2 h-2 rounded-full transition-all",
                        index === currentImageIndex
                          ? "bg-white"
                          : "bg-white/50"
                      )}
                    />
                  ))}
                </div>
              </>
            )}
          </>
        ) : (
          <div className="w-full h-full bg-gray-200 flex items-center justify-center">
            <div className="text-center text-gray-500">
              <MapPin className="h-12 w-12 mx-auto mb-2" />
              <p className="text-sm">No image available</p>
            </div>
          </div>
        )}
        
        {/* Property Type Badge */}
        <div className="absolute top-3 left-3">
          <Badge variant="secondary" className="bg-white/90 text-gray-800">
            {formatPropertyType(property.type)}
          </Badge>
        </div>
        
        {/* Price Badge */}
        <div className="absolute top-3 right-3">
          <Badge className="bg-green-600 text-white">
            ${property.basePrice}/night
          </Badge>
        </div>
      </div>

      <CardContent className="p-6">
        {/* Property Name and Rating */}
        <div className="flex justify-between items-start mb-3">
          <h3 className="text-xl font-semibold text-gray-900 group-hover:text-green-600 transition-colors">
            {property.name}
          </h3>
          {/*<div className="flex items-center space-x-1">
            <Star className="h-4 w-4 fill-yellow-400 text-yellow-400" />
            <span className="text-sm text-gray-600">4.8</span>
          </div>*/}
        </div>

        {/* Description */}
        <p className="text-gray-600 text-sm mb-4 line-clamp-2">
          {property.description}
        </p>

        {/* Occupancy */}
        <div className="flex items-center space-x-2 mb-4">
          <Users className="h-4 w-4 text-gray-500" />
          <span className="text-sm text-gray-600">
            Up to {property.maxOccupancy} guests
          </span>
        </div>

        {/* Amenities */}
        {property.amenities.length > 0 && (
          <div className="mb-4">
            <div className="flex flex-wrap gap-2">
              {property.amenities.slice(0, 4).map((amenity) => {
                const IconComponent = getAmenityIcon(amenity.icon);
                return (
                  <div
                    key={amenity.id}
                    className="flex items-center space-x-1 text-xs text-gray-600 bg-gray-100 px-2 py-1 rounded"
                  >
                    <IconComponent className="h-3 w-3" />
                    <span>{amenity.name}</span>
                  </div>
                );
              })}
              {property.amenities.length > 4 && (
                <div className="text-xs text-gray-500 bg-gray-100 px-2 py-1 rounded">
                  +{property.amenities.length - 4} more
                </div>
              )}
            </div>
          </div>
        )}

        {/* Booking Status */}
        <div className="mb-4">
          {property._count.bookings > 0 ? (
            <Badge variant="outline" className="text-orange-600 border-orange-600">
              {property._count.bookings} active booking{property._count.bookings > 1 ? 's' : ''}
            </Badge>
          ) : (
            <Badge variant="outline" className="text-green-600 border-1 border-green-600">
              Available
            </Badge>
          )}
        </div>

        {/* Action Buttons */}
        <div className="flex space-x-2">
          <Button asChild variant="outline" className="flex-1">
            <Link href={`/properties/${property.slug}`}>
              View Details
            </Link>
          </Button>
          <Button asChild className="flex-1 bg-black hover:bg-gray-700">
            <Link href={`/book?property=${property.slug}`}>
              Book Now
            </Link>
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}