'use client';

import { useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  Clock, 
  Users, 
  Star, 
  ChevronLeft, 
  ChevronRight,
  MapPin,
  Calendar,
  TrendingUp,
  Mountain,
  Camera,
  Binoculars
} from 'lucide-react';
import { cn, formatCurrency } from '@/lib/utils';

interface ActivityCardProps {
  activity: {
    id: string;
    name: string;
    type: string;
    slug: string;
    description: string;
    duration: number;
    maxParticipants: number;
    price: number;
    location: string;
    bookable: boolean;
    images: {
      id: string;
      url: string;
      alt: string;
      order: number;
    }[];
    _count: {
      bookings: number;
    };
  };
}

const activityTypeIcons: Record<string, any> = {
  hiking: Mountain,
  wildlife: Binoculars,
  photography: Camera,
  adventure: TrendingUp,
};

export function ActivityCard({ activity }: ActivityCardProps) {
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [imageError, setImageError] = useState(false);

  const nextImage = () => {
    setCurrentImageIndex((prev) => 
      prev === activity.images.length - 1 ? 0 : prev + 1
    );
  };

  const prevImage = () => {
    setCurrentImageIndex((prev) => 
      prev === 0 ? activity.images.length - 1 : prev - 1
    );
  };

  const formatActivityType = (type: string) => {
    return type.charAt(0).toUpperCase() + type.slice(1).toLowerCase();
  };

  const formatDuration = (duration: number) => {
    if (duration < 1) {
      return `${Math.round(duration * 60)} min`;
    } else if (duration === 1) {
      return '1 hour';
    } else if (duration < 24) {
      return `${duration} hours`;
    } else {
      const days = Math.floor(duration / 24);
      const hours = duration % 24;
      return `${days} day${days > 1 ? 's' : ''}${hours > 0 ? ` ${hours}h` : ''}`;
    }
  };

  const getActivityIcon = (type: string) => {
    return activityTypeIcons[type.toLowerCase()] || Mountain;
  };

  const mainImage = activity.images?.[currentImageIndex];
  const fallbackImage = '/images/activity-placeholder.jpg';
  const ActivityIcon = getActivityIcon(activity.type);

  return (
    <Card className="group hover:shadow-xl transition-all duration-300 overflow-hidden">
      {/* Image Carousel */}
      <div className="relative h-64 overflow-hidden">
        {activity.images && activity.images.length > 0 && !imageError ? (
          <>
            <Image
              src={mainImage?.url || fallbackImage}
              alt={mainImage?.alt || activity.name}
              fill
              className="object-cover group-hover:scale-105 transition-transform duration-300"
              onError={() => setImageError(true)}
            />
            
            {/* Image Navigation */}
            {activity.images && activity.images.length > 1 && (
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
                  {activity.images?.map((_, index) => (
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
              <ActivityIcon className="h-12 w-12 mx-auto mb-2" />
              <p className="text-sm">No image available</p>
            </div>
          </div>
        )}
        
        {/* Activity Type Badge */}
        <div className="absolute top-3 left-3">
          <Badge variant="secondary" className="bg-white/90 text-gray-800 flex items-center space-x-1">
            <ActivityIcon className="h-3 w-3" />
            <span>{formatActivityType(activity.type)}</span>
          </Badge>
        </div>
        
        {/* Price Badge */}
        <div className="absolute top-3 right-3">
          <Badge className="bg-blue-600 text-white">
            {formatCurrency(activity.price)}/person
          </Badge>
        </div>
        
        {/* Capacity Badge */}
        <div className="absolute bottom-3 left-3">
          <Badge variant="outline" className="bg-white/90 text-gray-800">
            Up to {activity.maxParticipants} people
          </Badge>
        </div>
      </div>

      <CardContent className="p-6">
        {/* Activity Name and Rating */}
        <div className="flex justify-between items-start mb-3">
          <h3 className="text-xl font-semibold text-gray-900 group-hover:text-blue-600 transition-colors">
            {activity.name}
          </h3>
          <div className="flex items-center space-x-1">
            <Star className="h-4 w-4 fill-yellow-400 text-yellow-400" />
            <span className="text-sm text-gray-600">4.7</span>
          </div>
        </div>

        {/* Description */}
        <p className="text-gray-600 text-sm mb-4 line-clamp-2">
          {activity.description}
        </p>

        {/* Activity Details */}
        <div className="space-y-2 mb-4">
          <div className="flex items-center space-x-2 text-sm text-gray-600">
            <Clock className="h-4 w-4" />
            <span>{formatDuration(activity.duration)}</span>
          </div>
          
          <div className="flex items-center space-x-2 text-sm text-gray-600">
            <Users className="h-4 w-4" />
            <span>Up to {activity.maxParticipants} participants</span>
          </div>
        </div>

        {/* Availability Status */}
        <div className="mb-4">
          {activity._count.bookings > 0 ? (
            <div className="flex items-center space-x-2">
              <Badge variant="outline" className="text-orange-600 border-orange-200">
                <Calendar className="h-3 w-3 mr-1" />
                {activity._count.bookings} upcoming booking{activity._count.bookings > 1 ? 's' : ''}
              </Badge>
            </div>
          ) : (
            <Badge variant="outline" className="text-green-600 border-green-200">
              <Calendar className="h-3 w-3 mr-1" />
              Available
            </Badge>
          )}
        </div>

        {/* Action Buttons */}
        <div className="flex space-x-2">
          <Button asChild variant="outline" className="flex-1">
            <Link href={`/activities/${activity.id}`}>
              Learn More
            </Link>
          </Button>
          {activity.bookable ? (
            <Button 
              className="flex-1 bg-green-600 hover:bg-green-700 text-white"
              onClick={() => window.location.href = `/book?activity=${activity.id}`}
            >
              Book Now
            </Button>
          ) : (
            <Button disabled className="flex-1 bg-gray-400 text-gray-600 cursor-not-allowed">
              Not Available
            </Button>
          )}
        </div>

        {/* Popular Activity Indicator */}
        {activity._count.bookings >= 5 && (
          <div className="mt-3 flex items-center justify-center">
            <Badge variant="secondary" className="bg-yellow-100 text-yellow-800 border-yellow-200">
              <TrendingUp className="h-3 w-3 mr-1" />
              Popular Activity
            </Badge>
          </div>
        )}
      </CardContent>
    </Card>
  );
}