'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Calendar } from '@/components/ui/calendar';
import { AvailabilityCalendar } from './AvailabilityCalendar';
import { 
  ChevronLeft, 
  ChevronRight, 
  CreditCard, 
  Users, 
  Calendar as CalendarIcon,
  MapPin,
  Phone,
  Mail,
  CheckCircle,
  AlertCircle,
  Loader2
} from 'lucide-react';
import { formatCurrency, cn } from '@/lib/utils';
import { differenceInDays, addDays, isBefore, isEqual } from 'date-fns';
import Image from 'next/image';

const bookingSchema = z.object({
  firstName: z.string().min(2, 'First name must be at least 2 characters'),
  lastName: z.string().min(2, 'Last name must be at least 2 characters'),
  email: z.string().email('Please enter a valid email address'),
  phone: z.string().min(10, 'Please enter a valid phone number'),
  specialRequests: z.string().optional(),
  paymentMethod: z.enum(['bank_transfer', 'stripe'], {
    required_error: 'Please select a payment method',
  }),
  agreeToTerms: z.boolean().refine(val => val === true, {
    message: 'You must agree to the terms and conditions',
  }),
});

type BookingFormData = z.infer<typeof bookingSchema>;

interface BookingWizardProps {
  property: {
    id: string;
    name: string;
    slug: string;
    type: string;
    basePrice: number;
    maxOccupancy: number;
    cleaningFee: number | null;
    securityDeposit: number | null;
    checkInTime: string;
    checkOutTime: string;
    address: string;
    images: {
      id: string;
      url: string;
      alt: string;
    }[];
    amenities: {
      id: string;
      name: string;
      icon: string;
    }[];
  };
  initialBookingData: {
    checkIn?: Date;
    checkOut?: Date;
    guests: number;
  };
  bookedDates: {
    checkIn: Date;
    checkOut: Date;
  }[];
}

const steps = [
  { id: 1, name: 'Dates & Guests', description: 'Select your stay details' },
  { id: 2, name: 'Guest Details', description: 'Enter your information' },
  { id: 3, name: 'Payment', description: 'Choose payment method' },
  { id: 4, name: 'Confirmation', description: 'Review and confirm' },
];

export function BookingWizard({ property, initialBookingData, bookedDates }: BookingWizardProps) {
  const router = useRouter();
  const [currentStep, setCurrentStep] = useState(1);
  const [isLoading, setIsLoading] = useState(false);
  const [bookingData, setBookingData] = useState({
    checkIn: initialBookingData.checkIn,
    checkOut: initialBookingData.checkOut,
    guests: initialBookingData.guests,
  });

  const form = useForm<BookingFormData>({
    resolver: zodResolver(bookingSchema),
    defaultValues: {
      firstName: '',
      lastName: '',
      email: '',
      phone: '',
      specialRequests: '',
      paymentMethod: 'bank_transfer',
      agreeToTerms: false,
    },
  });

  // Calculate disabled dates
  const disabledDates = bookedDates.flatMap(booking => {
    const dates = [];
    let currentDate = new Date(booking.checkIn);
    while (currentDate <= booking.checkOut) {
      dates.push(new Date(currentDate));
      currentDate = addDays(currentDate, 1);
    }
    return dates;
  });

  // Calculate pricing
  const calculatePricing = () => {
    if (!bookingData.checkIn || !bookingData.checkOut) return null;

    const nights = differenceInDays(bookingData.checkOut, bookingData.checkIn);
    if (nights <= 0) return null;

    const subtotal = nights * property.basePrice;
    const cleaningFee = property.cleaningFee || 0;
    const serviceFee = Math.round(subtotal * 0.12);
    const taxes = Math.round((subtotal + serviceFee) * 0.14);
    const total = subtotal + cleaningFee + serviceFee + taxes;

    return {
      nights,
      subtotal,
      cleaningFee,
      serviceFee,
      taxes,
      total,
    };
  };

  const pricing = calculatePricing();

  // Handle date selection
  const handleDateSelect = (date: Date | undefined, type: 'checkIn' | 'checkOut') => {
    if (!date) return;

    setBookingData(prev => ({
      ...prev,
      [type]: date,
    }));
  };

  // Check if date is disabled
  const isDateDisabled = (date: Date) => {
    if (isBefore(date, new Date())) return true;
    return disabledDates.some(disabledDate => isEqual(date, disabledDate));
  };

  // Handle form submission
  const onSubmit = async (data: BookingFormData) => {
    if (!bookingData.checkIn || !bookingData.checkOut || !pricing) return;

    setIsLoading(true);

    try {
      const bookingPayload = {
        propertyId: property.id,
        checkIn: bookingData.checkIn.toISOString(),
        checkOut: bookingData.checkOut.toISOString(),
        guests: bookingData.guests,
        totalAmount: pricing.total,
        paymentMethod: data.paymentMethod,
        guestDetails: {
          firstName: data.firstName,
          lastName: data.lastName,
          email: data.email,
          phone: data.phone,
          specialRequests: data.specialRequests,
        },
      };

      const response = await fetch('/api/public/bookings', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(bookingPayload),
      });

      if (!response.ok) {
        throw new Error('Failed to create booking');
      }

      const booking = await response.json();
      
      // Redirect to confirmation page
      router.push(`/booking-confirmation?booking=${booking.id}`);
    } catch (error) {
      console.error('Booking error:', error);
      // Handle error (show toast, etc.)
    } finally {
      setIsLoading(false);
    }
  };

  const canProceed = () => {
    switch (currentStep) {
      case 1:
        return bookingData.checkIn && bookingData.checkOut && pricing;
      case 2:
        return form.formState.isValid;
      case 3:
        return form.watch('paymentMethod') && form.watch('agreeToTerms');
      default:
        return false;
    }
  };

  const nextStep = () => {
    if (currentStep < steps.length) {
      setCurrentStep(currentStep + 1);
    }
  };

  const prevStep = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
    }
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
      {/* Left Column - Booking Form */}
      <div className="lg:col-span-2">
        {/* Progress Steps */}
        <div className="mb-8">
          <div className="flex items-center justify-between">
            {steps.map((step, index) => (
              <div key={step.id} className="flex items-center">
                <div className={cn(
                  "flex items-center justify-center w-8 h-8 rounded-full border-2 text-sm font-medium",
                  currentStep >= step.id
                    ? "bg-green-600 border-green-600 text-white"
                    : "border-gray-300 text-gray-500"
                )}>
                  {currentStep > step.id ? (
                    <CheckCircle className="h-4 w-4" />
                  ) : (
                    step.id
                  )}
                </div>
                {index < steps.length - 1 && (
                  <div className={cn(
                    "w-full h-0.5 mx-4",
                    currentStep > step.id ? "bg-green-600" : "bg-gray-300"
                  )} />
                )}
              </div>
            ))}
          </div>
          <div className="mt-4">
            <h2 className="text-xl font-semibold">{steps[currentStep - 1].name}</h2>
            <p className="text-gray-600">{steps[currentStep - 1].description}</p>
          </div>
        </div>

        {/* Step Content */}
        <Card>
          <CardContent className="p-6">
            {/* Step 1: Dates & Guests */}
            {currentStep === 1 && (
              <div className="space-y-6">
                <div>
                  <h3 className="text-lg font-medium mb-4">Select your dates</h3>
                  <AvailabilityCalendar
                    propertyId={property.id}
                    basePrice={property.basePrice}
                    minimumStay={property.minimumStay || 1}
                    selectedCheckIn={bookingData.checkIn}
                    selectedCheckOut={bookingData.checkOut}
                    onDateRangeSelect={(checkIn, checkOut) => {
                      setBookingData(prev => ({
                        ...prev,
                        checkIn,
                        checkOut
                      }));
                    }}
                    className="w-full"
                  />
                </div>

                <div>
                  <Label htmlFor="guests">Number of Guests</Label>
                  <Select
                    value={bookingData.guests.toString()}
                    onValueChange={(value) => setBookingData(prev => ({ ...prev, guests: parseInt(value) }))}
                  >
                    <SelectTrigger className="w-full">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {Array.from({ length: property.maxOccupancy }, (_, i) => i + 1).map((num) => (
                        <SelectItem key={num} value={num.toString()}>
                          {num} guest{num !== 1 ? 's' : ''}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            )}

            {/* Step 2: Guest Details */}
            {currentStep === 2 && (
              <div className="space-y-4">
                <h3 className="text-lg font-medium mb-4">Guest Information</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="firstName">First Name</Label>
                    <Input
                      id="firstName"
                      {...form.register('firstName')}
                      className={form.formState.errors.firstName ? 'border-red-500' : ''}
                    />
                    {form.formState.errors.firstName && (
                      <p className="text-red-500 text-sm mt-1">
                        {form.formState.errors.firstName.message}
                      </p>
                    )}
                  </div>
                  <div>
                    <Label htmlFor="lastName">Last Name</Label>
                    <Input
                      id="lastName"
                      {...form.register('lastName')}
                      className={form.formState.errors.lastName ? 'border-red-500' : ''}
                    />
                    {form.formState.errors.lastName && (
                      <p className="text-red-500 text-sm mt-1">
                        {form.formState.errors.lastName.message}
                      </p>
                    )}
                  </div>
                </div>
                
                <div>
                  <Label htmlFor="email">Email Address</Label>
                  <Input
                    id="email"
                    type="email"
                    {...form.register('email')}
                    className={form.formState.errors.email ? 'border-red-500' : ''}
                  />
                  {form.formState.errors.email && (
                    <p className="text-red-500 text-sm mt-1">
                      {form.formState.errors.email.message}
                    </p>
                  )}
                </div>
                
                <div>
                  <Label htmlFor="phone">Phone Number</Label>
                  <Input
                    id="phone"
                    type="tel"
                    {...form.register('phone')}
                    className={form.formState.errors.phone ? 'border-red-500' : ''}
                  />
                  {form.formState.errors.phone && (
                    <p className="text-red-500 text-sm mt-1">
                      {form.formState.errors.phone.message}
                    </p>
                  )}
                </div>
                
                <div>
                  <Label htmlFor="specialRequests">Special Requests (Optional)</Label>
                  <Textarea
                    id="specialRequests"
                    {...form.register('specialRequests')}
                    placeholder="Any special requests or requirements..."
                  />
                </div>
              </div>
            )}

            {/* Step 3: Payment */}
            {currentStep === 3 && (
              <div className="space-y-6">
                <h3 className="text-lg font-medium mb-4">Payment Method</h3>
                
                <div className="space-y-3">
                  
                  <div className="flex items-center space-x-2">
                    <input
                      type="radio"
                      id="bank_transfer"
                      value="bank_transfer"
                      {...form.register('paymentMethod')}
                      className="w-4 h-4 text-green-600"
                    />
                    <Label htmlFor="bank_transfer" className="flex items-center space-x-2 cursor-pointer">
                      <Mail className="h-4 w-4" />
                      <span>Bank Transfer</span>
                    </Label>
                  </div>
                </div>

                <div className="flex items-start space-x-2">
                  <Checkbox
                    id="agreeToTerms"
                    checked={form.watch('agreeToTerms')}
                    onCheckedChange={(checked) => form.setValue('agreeToTerms', checked as boolean)}
                  />
                  <Label htmlFor="agreeToTerms" className="text-sm cursor-pointer">
                    I agree to the{' '}
                    <a href="/terms" className="text-green-600 hover:underline">
                      Terms and Conditions
                    </a>{' '}
                    and{' '}
                    <a href="/privacy" className="text-green-600 hover:underline">
                      Privacy Policy
                    </a>
                  </Label>
                </div>
                {form.formState.errors.agreeToTerms && (
                  <p className="text-red-500 text-sm">
                    {form.formState.errors.agreeToTerms.message}
                  </p>
                )}
              </div>
            )}

            {/* Step 4: Confirmation */}
            {currentStep === 4 && (
              <div className="space-y-6">
                <h3 className="text-lg font-medium mb-4">Review Your Booking</h3>
                
                <div className="bg-gray-50 rounded-lg p-4 space-y-3">
                  <div className="flex justify-between">
                    <span className="text-gray-600">Dates:</span>
                    <span className="font-medium">
                      {bookingData.checkIn?.toLocaleDateString()} - {bookingData.checkOut?.toLocaleDateString()}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Guests:</span>
                    <span className="font-medium">{bookingData.guests}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Guest:</span>
                    <span className="font-medium">
                      {form.watch('firstName')} {form.watch('lastName')}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Payment:</span>
                    <span className="font-medium capitalize">
                      {form.watch('paymentMethod')?.replace('_', ' ')}
                    </span>
                  </div>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Navigation Buttons */}
        <div className="flex justify-between mt-6">
          <Button
            variant="outline"
            onClick={prevStep}
            disabled={currentStep === 1}
          >
            <ChevronLeft className="h-4 w-4 mr-2" />
            Previous
          </Button>
          
          {currentStep < steps.length ? (
            <Button
              onClick={nextStep}
              disabled={!canProceed()}
              className="bg-green-600 hover:bg-green-700"
            >
              Next
              <ChevronRight className="h-4 w-4 ml-2" />
            </Button>
          ) : (
            <Button
              onClick={form.handleSubmit(onSubmit)}
              disabled={!canProceed() || isLoading}
              className="bg-green-600 hover:bg-green-700"
            >
              {isLoading ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Processing...
                </>
              ) : (
                'Complete Booking'
              )}
            </Button>
          )}
        </div>
      </div>

      {/* Right Column - Booking Summary */}
      <div className="lg:col-span-1">
        <Card className="sticky top-8">
          <CardHeader>
            <CardTitle>Booking Summary</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Property Info */}
            <div className="flex space-x-3">
              {property.images.length > 0 && (
                <div className="relative w-16 h-16 rounded-lg overflow-hidden flex-shrink-0">
                  <Image
                    src={property.images[0].url}
                    alt={property.name}
                    fill
                    className="object-cover"
                  />
                </div>
              )}
              <div className="flex-1">
                <h4 className="font-medium">{property.name}</h4>
                <p className="text-sm text-gray-600">{property.address}</p>
                <Badge variant="secondary" className="mt-1">
                  {property.type.charAt(0).toUpperCase() + property.type.slice(1).toLowerCase()}
                </Badge>
              </div>
            </div>

            <Separator />

            {/* Booking Details */}
            {bookingData.checkIn && bookingData.checkOut && (
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">Check-in:</span>
                  <span>{bookingData.checkIn.toLocaleDateString()}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">Check-out:</span>
                  <span>{bookingData.checkOut.toLocaleDateString()}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">Guests:</span>
                  <span>{bookingData.guests}</span>
                </div>
              </div>
            )}

            {/* Pricing */}
            {pricing && (
              <>
                <Separator />
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span>{formatCurrency(property.basePrice)} × {pricing.nights} night{pricing.nights !== 1 ? 's' : ''}</span>
                    <span>{formatCurrency(pricing.subtotal)}</span>
                  </div>
                  {pricing.cleaningFee > 0 && (
                    <div className="flex justify-between text-sm">
                      <span>Cleaning fee</span>
                      <span>{formatCurrency(pricing.cleaningFee)}</span>
                    </div>
                  )}
                  <div className="flex justify-between text-sm">
                    <span>Service fee</span>
                    <span>{formatCurrency(pricing.serviceFee)}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span>Taxes</span>
                    <span>{formatCurrency(pricing.taxes)}</span>
                  </div>
                  <Separator />
                  <div className="flex justify-between font-semibold">
                    <span>Total</span>
                    <span>{formatCurrency(pricing.total)}</span>
                  </div>
                </div>
              </>
            )}

            {/* Security Deposit */}
            {property.securityDeposit && (
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                <div className="flex items-start space-x-2">
                  <AlertCircle className="h-4 w-4 text-blue-600 mt-0.5 flex-shrink-0" />
                  <div className="text-sm text-blue-800">
                    <p className="font-medium">Security Deposit</p>
                    <p>A refundable deposit of {formatCurrency(property.securityDeposit)} will be charged separately.</p>
                  </div>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}