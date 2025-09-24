'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  Wifi,
  Car,
  Coffee,
  Waves,
  Utensils,
  Tv,
  Wind,
  Shield,
  Home,
  CheckCircle
} from 'lucide-react';

interface PropertyAmenitiesProps {
  amenities: {
    amenity: {
      id: string;
      name: string;
      icon: string;
      description?: string;
    };
    id: string;
    name: string;
    icon: string;
    description?: string;
  }[];
}

const amenityIcons: Record<string, any> = {
  wifi: Wifi,
  parking: Car,
  coffee: Coffee,
  pool: Waves,
  kitchen: Utensils,
  tv: Tv,
  'air conditioning': Wind,
  'coffee maker': Coffee,
  'security system': Shield,
  fireplace: Home,
  'hot tub': Waves,
  'mountain view': Home,
  'bbq/braai': Utensils,
  restaurant: Utensils,
};

function getAmenityIcon(iconName: string | null | undefined) {
  if (!iconName) return CheckCircle;
  const IconComponent = amenityIcons[iconName.toLowerCase()] || CheckCircle;
  return IconComponent;
}

export function PropertyAmenities({ amenities }: PropertyAmenitiesProps) {
  if (!amenities || amenities.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Amenities</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-gray-500">No amenities listed for this property.</p>
        </CardContent>
      </Card>
    );
  }

  //console.log("amenities: ", amenities);

  return (
    <Card>
      <CardHeader>
        <CardTitle>Amenities</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {amenities.map((amenity) => {
            const IconComponent = getAmenityIcon(amenity.amenity.icon);
            return (
              <div
                key={amenity.amenity.id}
                className="flex items-center space-x-3 p-3 bg-gray-50 border rounded-lg hover:bg-gray-100 transition-colors"
              >
                <div className="flex-shrink-0">
                  <IconComponent className="h-5 w-5 text-green-600" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-900 truncate">
                    {amenity.amenity.name}
                  </p>
                  {amenity.amenity.description && (
                    <p className="text-xs text-gray-500 truncate">
                      {amenity.amenity.description}
                    </p>
                  )}
                </div>
              </div>
            );
          })}
        </div>
        
        {/* Summary badges */}
        <div className="mt-6 pt-4 border-t">
          <div className="flex flex-wrap gap-2">
            {amenities.slice(0, 6).map((amenity) => (
              <Badge key={amenity.amenity.id} variant="secondary" className="text-xs">
                {amenity.amenity.name}
              </Badge>
            ))}
            {amenities.length > 6 && (
              <Badge variant="outline" className="text-xs">
                +{amenities.length - 6} more
              </Badge>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}