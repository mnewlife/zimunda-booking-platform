'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
  MapPin,
  Navigation,
  Car,
  Plane,
  Train,
  ExternalLink
} from 'lucide-react';

interface PropertyLocationProps {
  property: {
    name: string;
    location: {
      address?: string;
      coordinates?: {
        lat: number;
        lng: number;
      };
      directions?: string;
    };
  };
}

export function PropertyLocation({ property }: PropertyLocationProps) {
  const fullAddress = property.location?.address || 'Address not available';

  const handleGetDirections = () => {
    const encodedAddress = encodeURIComponent(fullAddress);
    const googleMapsUrl = `https://www.google.com/maps/search/?api=1&query=${encodedAddress}`;
    window.open(googleMapsUrl, '_blank');
  };

  const handleOpenInMaps = () => {
    if (property.location?.coordinates) {
      const { lat, lng } = property.location.coordinates;
      const googleMapsUrl = `https://www.google.com/maps/@${lat},${lng},15z`;
      window.open(googleMapsUrl, '_blank');
    } else {
      handleGetDirections();
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center space-x-2">
          <MapPin className="h-5 w-5 text-green-600" />
          <span>Location</span>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Address */}
        <div>
          <h3 className="font-medium text-gray-900 mb-2">Address</h3>
          <p className="text-gray-700">{fullAddress}</p>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-wrap gap-3">
          <Button
            variant="outline"
            size="sm"
            onClick={handleGetDirections}
            className="flex items-center space-x-2"
          >
            <Navigation className="h-4 w-4" />
            <span>Get Directions</span>
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={handleOpenInMaps}
            className="flex items-center space-x-2"
          >
            <ExternalLink className="h-4 w-4" />
            <span>Open in Maps</span>
          </Button>
        </div>

        {/* Directions */}
        {property.location?.directions && (
          <div>
            <h3 className="font-medium text-gray-900 mb-2 flex items-center space-x-2">
              <Car className="h-4 w-4" />
              <span>Getting There</span>
            </h3>
            <div className="bg-gray-50 rounded-lg border p-4">
              <p className="text-sm text-gray-700 whitespace-pre-line">
                {property.location.directions}
              </p>
            </div>
          </div>
        )}

        {/* Nearby Attractions - Placeholder for future implementation */}
        <div>
          <h3 className="font-medium text-gray-900 mb-3">Nearby Attractions</h3>
          <div className="space-y-2">
            <div className="flex items-center space-x-2 text-sm text-gray-700">
              <MapPin className="h-3 w-3 text-gray-400 flex-shrink-0" />
              <span>Coffee Plantation Tours</span>
            </div>
            <div className="flex items-center space-x-2 text-sm text-gray-700">
              <MapPin className="h-3 w-3 text-gray-400 flex-shrink-0" />
              <span>Vumba Botanical Gardens</span>
            </div>
            <div className="flex items-center space-x-2 text-sm text-gray-700">
              <MapPin className="h-3 w-3 text-gray-400 flex-shrink-0" />
              <span>Mountain Hiking Trails</span>
            </div>
          </div>
        </div>

        {/* Transportation Options */}
        <div>
          <h3 className="font-medium text-gray-900 mb-3">Transportation</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="flex items-center space-x-3 border p-3 bg-gray-50 rounded-lg">
              <Car className="h-5 w-5 text-blue-600" />
              <div>
                <p className="text-sm font-medium">By Car</p>
                <p className="text-xs text-gray-500">Parking available</p>
              </div>
            </div>
            <div className="flex items-center space-x-3 p-3 border bg-gray-50 rounded-lg">
              <Plane className="h-5 w-5 text-green-600" />
              <div>
                <p className="text-sm font-medium">By Air</p>
                <p className="text-xs text-gray-500">Nearest airport</p>
              </div>
            </div>
            <div className="flex items-center space-x-3 p-3 border bg-gray-50 rounded-lg">
              <Train className="h-5 w-5 text-purple-600" />
              <div>
                <p className="text-sm font-medium">Public Transit</p>
                <p className="text-xs text-gray-500">Available options</p>
              </div>
            </div>
          </div>
        </div>

        {/* Map Placeholder */}
        {/*<div className="bg-gray-100 rounded-lg h-64 flex items-center justify-center">
          <div className="text-center">
            <MapPin className="h-12 w-12 text-gray-400 mx-auto mb-2" />
            <p className="text-gray-500 text-sm">Interactive map coming soon</p>
            <Button
              variant="link"
              size="sm"
              onClick={handleOpenInMaps}
              className="mt-2"
            >
              View on Google Maps
            </Button>
          </div>
        </div>*/}
      </CardContent>
    </Card>
  );
}