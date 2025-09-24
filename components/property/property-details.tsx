'use client';

import { Badge } from '@/components/ui/badge';
//import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { 
  Users, 
  Bed, 
  Bath, 
  Home, 
  MapPin, 
  //Star,
  //Calendar,
  //Clock,
  Wifi,
  Car,
  Coffee,
  Utensils,
  Tv,
  Wind,
  Shield,
  CheckCircle
} from 'lucide-react';
//import { formatCurrency } from '@/lib/utils';

interface PropertyDetailsProps {
  property: {
    id: string;
    name: string;
    type: string;
    description: string;
    maxOccupancy: number;
    bedrooms: number;
    bathrooms: number;
    area: number | null;
    basePrice: number;
    cleaningFee: number | null;
    securityDeposit: number | null;
    checkInTime: string;
    checkOutTime: string;
    location: {
      address: string;
      coordinates: { lat: number, lng: number };
      directions: string;
    };
    policies: {
        cancellation: string;
        deposit: string;
        cleaning: string;
        damage: string;
    };
    rules: string[];
    cancellationPolicy: string;
    createdAt: Date;
    reviews?: {
      id: string;
      rating: number;
    }[];
  };
}

const propertyTypeIcons = {
  cottage: Home,
  cabin: Home,
  villa: Home,
  lodge: Home,
};

const featureIcons: Record<string, any> = {
  wifi: Wifi,
  parking: Car,
  kitchen: Utensils,
  tv: Tv,
  'air conditioning': Wind,
  'coffee maker': Coffee,
  'security system': Shield,
};

export function PropertyDetails({ property }: PropertyDetailsProps) {
  const PropertyIcon = propertyTypeIcons[property.type.toLowerCase() as keyof typeof propertyTypeIcons] || Home;
  
  // Calculate average rating
  const averageRating = property.reviews && property.reviews.length > 0
    ? property.reviews.reduce((sum, review) => sum + review.rating, 0) / property.reviews.length
    : 0;

  const formatPropertyType = (type: string) => {
    return type.charAt(0).toUpperCase() + type.slice(1).toLowerCase();
  };

  const getFeatureIcon = (feature: string) => {
    const lowerFeature = feature.toLowerCase();
    return featureIcons[lowerFeature] || CheckCircle;
  };

  return (
    <div className="space-y-6">
      {/* Property Header */}
      <div>
        <div className="flex items-center space-x-3 mb-4">
          <PropertyIcon className="h-6 w-6 text-green-600" />
          <Badge variant="secondary">
            {formatPropertyType(property.type)}
          </Badge>
          {/*{property.reviews && property.reviews.length > 0 && (
            <div className="flex items-center space-x-1">
              <Star className="h-4 w-4 fill-yellow-400 text-yellow-400" />
              <span className="font-medium">{averageRating.toFixed(1)}</span>
              <span className="text-gray-500">({property.reviews.length} reviews)</span>
            </div>
          )}*/}
        </div>
        
        <h1 className="text-3xl font-bold text-gray-900 mb-2">
          {property.name}
        </h1>
        
        <div className="flex items-center text-gray-600 mb-4">
          <MapPin className="h-4 w-4 mr-1" />
          <span>{property.location.address}</span>
        </div>

        <div className="flex items-center space-x-6 text-sm text-gray-600">
          <div className="flex items-center space-x-1">
            <Users className="h-4 w-4" />
            <span>{property.maxOccupancy} guests</span>
          </div>
          <div className="flex items-center space-x-1">
            <Bed className="h-4 w-4" />
            <span>{property.bedrooms} bedroom{property.bedrooms !== 1 ? 's' : ''}</span>
          </div>
          <div className="flex items-center space-x-1">
            <Bath className="h-4 w-4" />
            <span>{property.bathrooms} bathroom{property.bathrooms !== 1 ? 's' : ''}</span>
          </div>
          {property.area && (
            <div className="flex items-center space-x-1">
              <Home className="h-4 w-4" />
              <span>{property.area} m²</span>
            </div>
          )}
        </div>
      </div>

      <Separator />

      {/* Description */}
      <div>
        <h2 className="text-xl font-semibold mb-3">About this property</h2>
        <div className="prose prose-gray max-w-none">
          <p className="text-gray-700 leading-relaxed whitespace-pre-line">
            {property.description}
          </p>
        </div>
      </div>

      {/* Features */}
      {/*{property.features && property.features.length > 0 && (
        <>
          <Separator />
          <div>
            <h2 className="text-xl font-semibold mb-4">Property Features</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {property.features.map((feature, index) => {
                const FeatureIcon = getFeatureIcon(feature);
                return (
                  <div key={index} className="flex items-center space-x-3 p-3 bg-gray-50 rounded-lg">
                    <FeatureIcon className="h-5 w-5 text-green-600 flex-shrink-0" />
                    <span className="text-gray-700">{feature}</span>
                  </div>
                );
              })}
            </div>
          </div>
        </>
      )}*/}

      {/* Check-in/Check-out & Pricing */}
      {/*<Separator />
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
      
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Clock className="h-5 w-5" />
              <span>Check-in & Check-out</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex justify-between">
              <span className="text-gray-600">Check-in:</span>
              <span className="font-medium">{property.checkInTime}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Check-out:</span>
              <span className="font-medium">{property.checkOutTime}</span>
            </div>
          </CardContent>
        </Card>

        
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Calendar className="h-5 w-5" />
              <span>Pricing</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex justify-between">
              <span className="text-gray-600">Base price:</span>
              <span className="font-medium">{formatCurrency(property.basePrice)}/night</span>
            </div>
            {property.cleaningFee && (
              <div className="flex justify-between">
                <span className="text-gray-600">Cleaning fee:</span>
                <span className="font-medium">{formatCurrency(property.cleaningFee)}</span>
              </div>
            )}
            {property.securityDeposit && (
              <div className="flex justify-between">
                <span className="text-gray-600">Security deposit:</span>
                <span className="font-medium">{formatCurrency(property.securityDeposit)}</span>
              </div>
            )}
          </CardContent>
        </Card>
      </div>*/}

      {/* House Rules */}
      {property.rules && property.rules.length > 0 && (
        <>
          <Separator />
          <div>
            <h2 className="text-xl font-semibold mb-4">House Rules</h2>
            <div className="bg-green-50 border border-green-200 rounded-lg p-4">
              <ul className="space-y-2">
                {property.rules.map((rule, index) => (
                  <li key={index} className="flex items-start space-x-2">
                    <CheckCircle className="h-4 w-4 text-green-600 mt-0.5 flex-shrink-0" />
                    <span className="text-gray-800">{rule}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </>
      )}

      {/* Policies */}
      <Separator />
      <div className='grid grid-cols-2 gap-2'>
        <h2 className="text-xl font-semibold mb-3 col-span-2">Policies</h2>
        
        {property.policies.deposit && (
          <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
            <p className="text-gray-800">
              <strong>Deposit Policy:</strong><br /> {property.policies.deposit}
            </p>
          </div>
        )}

        {property.policies.cleaning && (
          <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
            <p className="text-gray-800">
              <strong>Cleaning Policy:</strong><br /> {property.policies.cleaning}
            </p>
          </div>
        )}

        {property.policies.damage && (
          <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
            <p className="text-gray-800">
              <strong>Damage Policy:</strong><br /> {property.policies.damage}
            </p>
          </div>
        )}

        {property.policies.cancellation && (
          <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
            <p className="text-gray-800">
              <strong>Cancellation Policy:</strong><br /> {property.policies.cancellation}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}