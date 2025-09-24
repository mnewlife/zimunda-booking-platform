'use client';

import { useState, useMemo, useCallback, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { AvailabilityCalendar } from '../booking/AvailabilityCalendar';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import { 
  Users, 
  Star,
  AlertCircle,
  CreditCard,
  Loader2
} from 'lucide-react';
import { formatCurrency } from '@/lib/utils';
import { addDays, differenceInDays } from 'date-fns';
import { toast } from 'sonner';
import { PricingSettings, SettingsResponse, SETTING_KEYS, parseSettingValue } from '@/shared/types/settings';

// Default fallback values
const DEFAULT_PRICING_CONFIG: PricingSettings = {
  serviceFeeRate: 0.10,
  taxRate: 0.15,
  defaultRating: 4.5,
  currency: 'USD',
  minimumStay: 1,
};

// Custom hook to fetch pricing settings
function usePricingSettings() {
  const [settings, setSettings] = useState<PricingSettings>(DEFAULT_PRICING_CONFIG);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchSettings = async () => {
      try {
        const keys = [
          SETTING_KEYS.SERVICE_FEE_RATE,
          SETTING_KEYS.TAX_RATE,
          SETTING_KEYS.DEFAULT_RATING,
          SETTING_KEYS.CURRENCY,
          SETTING_KEYS.MINIMUM_STAY
        ];
        
        const response = await fetch(`/api/settings?keys=${keys.join(',')}`);
        const data: SettingsResponse = await response.json();
        
        if (data.success) {
          setSettings({
            serviceFeeRate: parseSettingValue(
              data.data[SETTING_KEYS.SERVICE_FEE_RATE]?.value ?? String(DEFAULT_PRICING_CONFIG.serviceFeeRate),
              data.data[SETTING_KEYS.SERVICE_FEE_RATE]?.dataType ?? 'number'
            ),
            taxRate: parseSettingValue(
              data.data[SETTING_KEYS.TAX_RATE]?.value ?? String(DEFAULT_PRICING_CONFIG.taxRate),
              data.data[SETTING_KEYS.TAX_RATE]?.dataType ?? 'number'
            ),
            defaultRating: parseSettingValue(
              data.data[SETTING_KEYS.DEFAULT_RATING]?.value ?? String(DEFAULT_PRICING_CONFIG.defaultRating),
              data.data[SETTING_KEYS.DEFAULT_RATING]?.dataType ?? 'number'
            ),
            currency: parseSettingValue(
              data.data[SETTING_KEYS.CURRENCY]?.value ?? DEFAULT_PRICING_CONFIG.currency,
              data.data[SETTING_KEYS.CURRENCY]?.dataType ?? 'string'
            ),
            minimumStay: parseSettingValue(
              data.data[SETTING_KEYS.MINIMUM_STAY]?.value ?? String(DEFAULT_PRICING_CONFIG.minimumStay),
              data.data[SETTING_KEYS.MINIMUM_STAY]?.dataType ?? 'number'
            ),
          });
        } else {
          console.warn('Failed to fetch pricing settings, using defaults');
        }
      } catch (error) {
        console.error('Error fetching pricing settings:', error);
        setError('Failed to load pricing configuration');
      } finally {
        setLoading(false);
      }
    };

    fetchSettings();
  }, []);

  return { settings, loading, error };
}

interface PropertyBookingProps {
  property: {
    id: string;
    name: string;
    slug: string;
    basePrice: number;
    maxOccupancy: number;
    minimumStay?: number;
    cleaningFee: number | null;
    securityDeposit: number | null;
    rating?: number;
  };
}

interface PricingBreakdown {
  nights: number;
  subtotal: number;
  cleaningFee: number;
  serviceFee: number;
  taxes: number;
  total: number;
}

export function PropertyBooking({ property }: PropertyBookingProps) {
  const router = useRouter();
  const [checkIn, setCheckIn] = useState<Date | null>(null);
  const [checkOut, setCheckOut] = useState<Date | null>(null);
  const [guests, setGuests] = useState(1);
  const [isLoading, setIsLoading] = useState(false);
  const { settings: pricingSettings, loading: settingsLoading, error: settingsError } = usePricingSettings();
  const [error, setError] = useState<string | null>(null);

  // Note: Disabled dates are now handled by the AvailabilityCalendar component
  // which fetches and manages booked dates internally

  // Memoize pricing calculation for performance
  const pricing = useMemo((): PricingBreakdown | null => {
    if (!checkIn || !checkOut) return null;

    const nights = differenceInDays(checkOut, checkIn);
    if (nights <= 0) return null;

    const subtotal = nights * Number(property.basePrice);
    const cleaningFee = Number(property.cleaningFee || 0);
    const serviceFee = Math.round(subtotal * pricingSettings.serviceFeeRate);
    const taxes = Math.round((subtotal + serviceFee) * pricingSettings.taxRate);
    const total = subtotal + cleaningFee + serviceFee + taxes;

    return {
      nights,
      subtotal,
      cleaningFee,
      serviceFee,
      taxes,
      total,
    };
  }, [checkIn, checkOut, property.basePrice, property.cleaningFee, pricingSettings.serviceFeeRate, pricingSettings.taxRate]);

  // Validate guest count
  const validateGuestCount = useCallback((guestCount: number): boolean => {
    if (guestCount < 1) {
      setError('At least 1 guest is required');
      return false;
    }
    if (guestCount > property.maxOccupancy) {
      setError(`Maximum ${property.maxOccupancy} guests allowed`);
      return false;
    }
    setError(null);
    return true;
  }, [property.maxOccupancy]);

  // Handle guest count change with validation
  const handleGuestChange = useCallback((value: string) => {
    const guestCount = parseInt(value);
    if (validateGuestCount(guestCount)) {
      setGuests(guestCount);
    }
  }, [validateGuestCount]);

  // Handle booking with proper error handling
  const handleBooking = useCallback(async () => {
    if (!checkIn || !checkOut || !pricing) {
      toast.error('Please select check-in and check-out dates');
      return;
    }

    if (!validateGuestCount(guests)) {
      return;
    }

    // Check minimum stay requirement
    const minimumStay = property.minimumStay || 1;
    if (pricing.nights < minimumStay) {
      toast.error(`Minimum stay is ${minimumStay} night${minimumStay > 1 ? 's' : ''}`);
      return;
    }

    setIsLoading(true);
    setError(null);
    
    try {
      // Create booking URL with parameters
      const bookingParams = new URLSearchParams({
        property: property.slug,
        checkIn: checkIn.toISOString(),
        checkOut: checkOut.toISOString(),
        guests: guests.toString(),
      });

      router.push(`/book?${bookingParams.toString()}`);
    } catch (error) {
      console.error('Booking error:', error);
      const errorMessage = error instanceof Error ? error.message : 'Failed to proceed with booking';
      setError(errorMessage);
      toast.error(errorMessage);
    } finally {
      setIsLoading(false);
    }
  }, [checkIn, checkOut, pricing, guests, property.slug, property.minimumStay, router, validateGuestCount]);

  const canBook = checkIn && checkOut && pricing && pricing.nights > 0 && !error && !settingsLoading;
  const propertyRating = property.rating || pricingSettings.defaultRating;

  // Show error if settings failed to load
  if (settingsError) {
    toast.error(settingsError);
  }

  return (
    <Card className="sticky top-8">
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <span className="text-2xl font-bold" aria-label={`Price per night: ${formatCurrency(property.basePrice)}`}>
              {formatCurrency(property.basePrice)}
            </span>
            <span className="text-gray-600">/ night</span>
          </div>
          {/*<div className="flex items-center space-x-1" aria-label={`Property rating: ${propertyRating} out of 5 stars`}>
            <Star className="h-4 w-4 fill-yellow-400 text-yellow-400" aria-hidden="true" />
            <span className="text-sm font-medium">{propertyRating}</span>
          </div>*/}
        </CardTitle>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Error Display */}
        {error && (
          <div className="flex items-center gap-2 p-3 text-sm text-red-600 bg-red-50 border border-red-200 rounded-md" role="alert" aria-live="polite">
            <AlertCircle className="h-4 w-4 flex-shrink-0" aria-hidden="true" />
            <span>{error}</span>
          </div>
        )}

        {/* Date Selection */}
        <div className="space-y-2">
          <div id="date-selection" role="group" aria-label="Check-in and check-out date selection">
            <AvailabilityCalendar
              propertyId={property.id}
              basePrice={property.basePrice}
              minimumStay={property.minimumStay || 1}
              selectedCheckIn={checkIn}
              selectedCheckOut={checkOut}
              onDateRangeSelect={(newCheckIn, newCheckOut) => {
                setCheckIn(newCheckIn);
                setCheckOut(newCheckOut);
              }}
              className="w-full"
            />
          </div>
        </div>

        {/* Guest Selection */}
        <div className="space-y-2">
          <Label htmlFor="guests">Guests</Label>
          <Select 
            value={guests.toString()} 
            onValueChange={handleGuestChange}
            aria-label="Select number of guests"
          >
            <SelectTrigger id="guests" aria-describedby="guest-limit">
              <SelectValue>
                <div className="flex items-center space-x-2">
                  <Users className="h-4 w-4" aria-hidden="true" />
                  <span>{guests} guest{guests !== 1 ? 's' : ''}</span>
                </div>
              </SelectValue>
            </SelectTrigger>
            <SelectContent>
              {Array.from({ length: property.maxOccupancy }, (_, i) => i + 1).map((num) => (
                <SelectItem key={num} value={num.toString()}>
                  {num} guest{num !== 1 ? 's' : ''}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <p id="guest-limit" className="text-xs text-gray-500">
            Maximum {property.maxOccupancy} guests
          </p>
        </div>

        {/* Pricing Breakdown */}
        {pricing && (
          <>
            <Separator />
            <div className="space-y-3">
              <h4 className="font-medium">Price breakdown</h4>
              
              <div className="space-y-2 text-sm" role="region" aria-label="Pricing breakdown">
                <div className="flex justify-between">
                  <span>{formatCurrency(property.basePrice)} × {pricing.nights} night{pricing.nights !== 1 ? 's' : ''}</span>
                  <span>{formatCurrency(pricing.subtotal)}</span>
                </div>
                
                {pricing.cleaningFee > 0 && (
                  <div className="flex justify-between">
                    <span>Cleaning fee</span>
                    <span>{formatCurrency(pricing.cleaningFee)}</span>
                  </div>
                )}
                
                <div className="flex justify-between">
                  <span>Service fee ({Math.round(pricingSettings.serviceFeeRate * 100)}%)</span>
                  <span>{formatCurrency(pricing.serviceFee)}</span>
                </div>
                
                <div className="flex justify-between">
                  <span>Taxes ({Math.round(pricingSettings.taxRate * 100)}%)</span>
                  <span>{formatCurrency(pricing.taxes)}</span>
                </div>
              </div>
              
              <Separator />
              
              <div className="flex justify-between font-semibold" aria-label={`Total cost: ${formatCurrency(pricing.total)}`}>
                <span>Total</span>
                <span>{formatCurrency(pricing.total)}</span>
              </div>
            </div>
          </>
        )}

        {/* Security Deposit Info */}
        {property.securityDeposit && (
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
            <div className="flex items-start space-x-2">
              <AlertCircle className="h-4 w-4 text-blue-600 mt-0.5 flex-shrink-0" />
              <div className="text-sm text-blue-800">
                <p className="font-medium">Security Deposit</p>
                <p>A refundable security deposit of {formatCurrency(property.securityDeposit)} will be charged separately.</p>
              </div>
            </div>
          </div>
        )}

        {/* Booking Button */}
        <Button 
          className="w-full bg-green-600 hover:bg-green-700" 
          size="lg"
          onClick={handleBooking}
          disabled={!canBook || isLoading || settingsLoading}
          aria-label={pricing ? `Book property for ${formatCurrency(pricing.total)}` : 'Select dates to book property'}
        >
          {(isLoading || settingsLoading) ? (
            <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden="true" />
          ) : (
            <CreditCard className="mr-2 h-4 w-4" aria-hidden="true" />
          )}
          <span>
            {settingsLoading ? 'Loading...' : isLoading ? 'Processing...' : canBook ? 'Reserve Now' : 'Select dates'}
          </span>
        </Button>

        {/* Additional Information */}
        <div className="text-xs text-gray-500 text-center space-y-1">
          {property.minimumStay && property.minimumStay > 1 && (
            <p>Minimum stay: {property.minimumStay} nights</p>
          )}
          <p>You won't be charged yet. Review your booking details on the next page.</p>
        </div>
      </CardContent>
    </Card>
  );
}