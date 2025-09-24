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
import { AvailabilityCalendar } from './AvailabilityCalendar';
import { 
  CreditCard, 
  Users, 
  MapPin,
  Phone,
  Mail,
  AlertCircle,
  Loader2
} from 'lucide-react';
import { formatCurrency } from '@/lib/utils';
import { differenceInDays } from 'date-fns';
import Image from 'next/image';

const bookingSchema = z.object({
  checkIn: z.date().optional(),
  checkOut: z.date().optional(),
  guests: z.number().min(1, 'At least 1 guest is required'),
  firstName: z.string().min(2, 'First name must be at least 2 characters'),
  lastName: z.string().min(2, 'Last name must be at least 2 characters'),
  email: z.string().email('Please enter a valid email address'),
  phone: z.string().min(10, 'Please enter a valid phone number'),
  specialRequests: z.string().optional(),
  selectedAddOns: z.array(z.object({
    id: z.string(),
    quantity: z.number().min(1),
  })).optional(),
  selectedActivities: z.array(z.object({
    id: z.string(),
    date: z.date(),
    time: z.string(),
    participants: z.number().min(1),
  })).optional(),
  paymentMethod: z.enum(['card', 'paynow', 'bank_transfer'], {
    required_error: 'Please select a payment method',
  }),
  agreeToTerms: z.boolean().refine(val => val === true, {
    message: 'You must agree to the terms and conditions',
  }),
  isActivityBooking: z.boolean().optional(),
}).refine((data) => {
  // Only validate dates for property bookings
  if (!data.isActivityBooking && data.checkIn && data.checkOut) {
    return data.checkOut > data.checkIn;
  }
  return true;
}, {
  message: 'Check-out date must be after check-in date',
  path: ['checkOut'],
}).refine((data) => {
  // Require dates for property bookings
  if (!data.isActivityBooking) {
    return data.checkIn && data.checkOut;
  }
  return true;
}, {
  message: 'Please select check-in and check-out dates',
  path: ['checkIn'],
});

type BookingFormData = z.infer<typeof bookingSchema>;

interface BookingFormProps {
  property?: {
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
    addOns: {
      id: string;
      name: string;
      description: string;
      price: number;
    }[];
  };
  activities: {
    id: string;
    name: string;
    type: string;
    description: string;
    duration: number;
    price: number;
    capacity: number;
    requirements: string[];
  }[];
  globalAddOns: {
    id: string;
    name: string;
    description: string;
    price: number;
  }[];
  initialBookingData: {
    checkIn?: Date;
    checkOut?: Date;
    guests: number;
    selectedActivities?: string[];
  };
  bookedDates: {
    checkIn: Date;
    checkOut: Date;
  }[];
}

export function BookingForm({ property, activities, globalAddOns, initialBookingData, bookedDates }: BookingFormProps) {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [selectedDates, setSelectedDates] = useState({
    checkIn: initialBookingData.checkIn,
    checkOut: initialBookingData.checkOut,
  });
  const [selectedAddOns, setSelectedAddOns] = useState<{[key: string]: number}>({});
  const [selectedActivities, setSelectedActivities] = useState<{
    id: string;
    date: Date;
    time: string;
    participants: number;
  }[]>([]);

  // Check if this is an activity-only booking
  const isActivityBooking = !property && activities.length > 0;
  
  // Combine property add-ons with global add-ons
  const allAddOns = [...(property?.addOns || []), ...globalAddOns];
  
  // Initialize selected activities for activity-only bookings
  useEffect(() => {
    if (isActivityBooking && initialBookingData.selectedActivities) {
      const initialActivities = initialBookingData.selectedActivities.map(activityId => ({
        id: activityId,
        date: initialBookingData.checkIn || new Date(),
        time: '09:00',
        participants: initialBookingData.guests,
      }));
      setSelectedActivities(initialActivities);
    }
  }, [isActivityBooking, initialBookingData]);

  const form = useForm<BookingFormData>({
    resolver: zodResolver(bookingSchema),
    defaultValues: {
      checkIn: initialBookingData.checkIn,
      checkOut: initialBookingData.checkOut,
      guests: initialBookingData.guests,
      firstName: '',
      lastName: '',
      email: '',
      phone: '',
      specialRequests: '',
      selectedAddOns: [],
      selectedActivities: [],
      paymentMethod: 'card',
      agreeToTerms: false,
      isActivityBooking,
    },
  });

  // Calculate pricing
  const calculatePricing = () => {
    if (isActivityBooking) {
      // For activity-only bookings, we don't need check-in/out dates
      // Calculate activities total
      const activitiesTotal = selectedActivities.reduce((total, activity) => {
        const activityData = activities.find(a => a.id === activity.id);
        return total + (activityData ? activityData.price * activity.participants : 0);
      }, 0);
      
      // Calculate add-ons total
      const addOnsTotal = Object.entries(selectedAddOns).reduce((total, [addOnId, quantity]) => {
        const addOn = allAddOns.find(a => a.id === addOnId);
        return total + (addOn ? addOn.price * quantity : 0);
      }, 0);
      
      const serviceFee = Math.round((activitiesTotal + addOnsTotal) * 0.12);
      const taxes = Math.round((activitiesTotal + addOnsTotal + serviceFee) * 0.14);
      const total = activitiesTotal + addOnsTotal + serviceFee + taxes;

      return {
        nights: 0,
        subtotal: 0,
        addOnsTotal,
        activitiesTotal,
        cleaningFee: 0,
        serviceFee,
        taxes,
        total,
      };
    }
    
    // Property booking logic
    const checkIn = form.watch('checkIn') || selectedDates.checkIn;
    const checkOut = form.watch('checkOut') || selectedDates.checkOut;
    
    if (!checkIn || !checkOut || !property) return null;

    const nights = differenceInDays(checkOut, checkIn);
    if (nights <= 0) return null;

    const subtotal = nights * property.basePrice;
    
    // Calculate add-ons total
    const addOnsTotal = Object.entries(selectedAddOns).reduce((total, [addOnId, quantity]) => {
      const addOn = allAddOns.find(a => a.id === addOnId);
      return total + (addOn ? addOn.price * quantity : 0);
    }, 0);
    
    // Calculate activities total
    const activitiesTotal = selectedActivities.reduce((total, activity) => {
      const activityData = activities.find(a => a.id === activity.id);
      return total + (activityData ? activityData.price * activity.participants : 0);
    }, 0);
    
    const cleaningFee = property.cleaningFee || 0;
    const serviceFee = Math.round((subtotal + addOnsTotal + activitiesTotal) * 0.12);
    const taxes = Math.round((subtotal + addOnsTotal + activitiesTotal + serviceFee) * 0.14);
    const total = subtotal + addOnsTotal + activitiesTotal + cleaningFee + serviceFee + taxes;

    return {
      nights,
      subtotal,
      addOnsTotal,
      activitiesTotal,
      cleaningFee,
      serviceFee,
      taxes,
      total,
    };
  };

  const pricing = calculatePricing();

  // Handle date selection from calendar
  const handleDateRangeSelect = (checkIn: Date | null, checkOut: Date | null) => {
    if (checkIn) {
      setSelectedDates(prev => ({ ...prev, checkIn }));
      form.setValue('checkIn', checkIn);
    }
    if (checkOut) {
      setSelectedDates(prev => ({ ...prev, checkOut }));
      form.setValue('checkOut', checkOut);
    }
  };

  // Handle form submission
  const onSubmit = async (data: BookingFormData) => {
    if (!pricing && !isActivityBooking) return;

    setIsLoading(true);

    try {
      if (isActivityBooking) {
        // Activity-only booking payload
        const activityBookingPayload = {
          activityId: selectedActivities[0]?.id,
          date: selectedActivities[0]?.date.toISOString(),
          time: selectedActivities[0]?.time,
          participants: selectedActivities[0]?.participants || data.guests,
          guestDetails: {
            firstName: data.firstName,
            lastName: data.lastName,
            email: data.email,
            phone: data.phone,
            specialRequests: data.specialRequests,
          },
          totalAmount: pricing?.total || 0,
          paymentMethod: data.paymentMethod,
          addOns: Object.entries(selectedAddOns).map(([addOnId, quantity]) => ({
            addOnId,
            quantity,
            price: allAddOns.find(a => a.id === addOnId)?.price || 0,
          })).filter(addOn => addOn.quantity > 0),
        };

        const response = await fetch('/api/public/activity-bookings', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(activityBookingPayload),
        });

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.message || 'Failed to create activity booking');
        }

        const result = await response.json();
        
        // Redirect to payment or confirmation page
        if (data.paymentMethod === 'card') {
          router.push(`/payment?booking=${result.booking.id}`);
        } else {
          router.push(`/booking-confirmation?booking=${result.booking.id}`);
        }
      } else {
        // Property booking payload
        const bookingPayload = {
          propertyId: property!.id,
          checkIn: data.checkIn!.toISOString(),
          checkOut: data.checkOut!.toISOString(),
          guests: data.guests,
          totalAmount: pricing!.total,
          paymentMethod: data.paymentMethod,
          guestDetails: {
            firstName: data.firstName,
            lastName: data.lastName,
            email: data.email,
            phone: data.phone,
            specialRequests: data.specialRequests,
          },
          addOns: Object.entries(selectedAddOns).map(([addOnId, quantity]) => ({
            addOnId,
            quantity,
            price: allAddOns.find(a => a.id === addOnId)?.price || 0,
          })).filter(addOn => addOn.quantity > 0),
          activities: selectedActivities.map(activity => ({
            activityId: activity.id,
            date: activity.date.toISOString(),
            time: activity.time,
            participants: activity.participants,
            totalPrice: (activities.find(a => a.id === activity.id)?.price || 0) * activity.participants,
          })),
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
        
        // Redirect to payment or confirmation page
        if (data.paymentMethod === 'card') {
          router.push(`/payment?booking=${booking.id}`);
        } else {
          router.push(`/booking-confirmation?booking=${booking.id}`);
        }
      }
    } catch (error) {
      console.error('Booking error:', error);
      // Handle error (show toast, etc.)
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
      {/* Left Column - Booking Form */}
      <div className="lg:col-span-2">
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
          {/* Dates & Guests Section */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Users className="h-5 w-5" />
                <span>{isActivityBooking ? 'Participants' : 'Dates & Guests'}</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              {!isActivityBooking && (
                <div>
                  <Label className="text-base font-medium mb-4 block">Select your dates</Label>
                  <AvailabilityCalendar
                    propertyId={property!.id}
                    basePrice={property!.basePrice}
                    minimumStay={1}
                    selectedCheckIn={selectedDates.checkIn}
                    selectedCheckOut={selectedDates.checkOut}
                    onDateRangeSelect={handleDateRangeSelect}
                    className="w-full"
                  />
                  {form.formState.errors.checkIn && (
                    <p className="text-red-500 text-sm mt-2">
                      {form.formState.errors.checkIn.message}
                    </p>
                  )}
                  {form.formState.errors.checkOut && (
                    <p className="text-red-500 text-sm mt-2">
                      {form.formState.errors.checkOut.message}
                    </p>
                  )}
                </div>
              )}

              <div>
                <Label htmlFor="guests" className="text-base font-medium">
                  {isActivityBooking ? 'Number of Participants' : 'Number of Guests'}
                </Label>
                <Select
                  value={form.watch('guests')?.toString()}
                  onValueChange={(value) => form.setValue('guests', parseInt(value))}
                >
                  <SelectTrigger className="w-full mt-2">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {Array.from({ 
                      length: isActivityBooking 
                        ? (activities.find(a => a.id === selectedActivities[0]?.id)?.maxParticipants || 10)
                        : property!.maxOccupancy 
                    }, (_, i) => i + 1).map((num) => (
                      <SelectItem key={num} value={num.toString()}>
                        {num} {isActivityBooking ? 'participant' : 'guest'}{num !== 1 ? 's' : ''}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
          </Card>

          {/* Guest Details Section */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Mail className="h-5 w-5" />
                <span>Guest Information</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="firstName">First Name</Label>
                  <Input
                    id="firstName"
                    {...form.register('firstName')}
                    className={form.formState.errors.firstName ? 'border-red-500 bg-white' : 'bg-white'}
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
                    className={form.formState.errors.lastName ? 'border-red-500 bg-white' : 'bg-white'}
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
                  className={form.formState.errors.email ? 'border-red-500 bg-white' : 'bg-white'}
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
                  className={form.formState.errors.phone ? 'border-red-500 bg-white' : 'bg-white'}
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
                  className='bg-white'
                  {...form.register('specialRequests')}
                  placeholder="Any special requests or requirements..."
                />
              </div>
            </CardContent>
          </Card>

          {/* Add-ons Section */}
          {allAddOns.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <CreditCard className="h-5 w-5" />
                  <span>Add-ons & Extras</span>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {allAddOns.map((addOn) => (
                    <div key={addOn.id} className="border bg-white rounded-lg p-4 space-y-3">
                      <div className="flex justify-between items-start">
                        <div className="flex-1">
                          <h4 className="font-medium">{addOn.name}</h4>
                          <p className="text-sm text-gray-600 mt-1">{addOn.description}</p>
                          <p className="text-lg font-semibold text-green-600 mt-2">
                            {formatCurrency(addOn.price)}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center space-x-3">
                        <Label htmlFor={`addon-${addOn.id}`} className="text-sm font-medium">
                          Quantity:
                        </Label>
                        <Select
                          value={selectedAddOns[addOn.id]?.toString() || '0'}
                          onValueChange={(value) => {
                            const quantity = parseInt(value);
                            setSelectedAddOns(prev => {
                              const updated = { ...prev };
                              if (quantity === 0) {
                                delete updated[addOn.id];
                              } else {
                                updated[addOn.id] = quantity;
                              }
                              return updated;
                            });
                          }}
                        >
                          <SelectTrigger className="w-20">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {Array.from({ length: 6 }, (_, i) => (
                              <SelectItem key={i} value={i.toString()}>
                                {i}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Activities Section */}
          {activities.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <Users className="h-5 w-5" />
                  <span>Activities & Experiences</span>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 gap-4">
                  {activities.map((activity) => (
                    <div key={activity.id} className="border rounded-lg bg-white p-4 space-y-3">
                      <div className="flex justify-between items-start">
                        <div className="flex-1">
                          <div className="flex items-center space-x-2">
                            <h4 className="font-medium">{activity.name}</h4>
                            <Badge variant="outline">{activity.type.replace('_', ' ')}</Badge>
                          </div>
                          <p className="text-sm text-gray-600 mt-1">{activity.description}</p>
                          <div className="flex items-center space-x-4 mt-2 text-sm text-gray-500">
                            <span>Duration: {activity.duration} minutes</span>
                            <span>Capacity: {activity.capacity} people</span>
                          </div>
                          <p className="text-lg font-semibold text-green-600 mt-2">
                            {formatCurrency(activity.price)} per person
                          </p>
                          {activity.requirements.length > 0 && (
                            <div className="mt-2">
                              <p className="text-xs text-gray-500">Requirements:</p>
                              <ul className="text-xs text-gray-600 list-disc list-inside">
                                {activity.requirements.map((req, index) => (
                                  <li key={index}>{req}</li>
                                ))}
                              </ul>
                            </div>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center space-x-2">
                        <Checkbox
                          id={`activity-${activity.id}`}
                          checked={selectedActivities.some(a => a.id === activity.id)}
                          className='ring-1'
                          onCheckedChange={(checked) => {
                            if (checked) {
                              // Add activity with default values
                              const checkIn = form.watch('checkIn') || selectedDates.checkIn;
                              if (checkIn) {
                                setSelectedActivities(prev => [...prev, {
                                  id: activity.id,
                                  date: checkIn,
                                  time: '09:00',
                                  participants: 1,
                                }]);
                              }
                            } else {
                              // Remove activity
                              setSelectedActivities(prev => prev.filter(a => a.id !== activity.id));
                            }
                          }}
                        />
                        <Label htmlFor={`activity-${activity.id}`} className="text-sm font-medium cursor-pointer">
                          Add to booking
                        </Label>
                      </div>
                      {selectedActivities.some(a => a.id === activity.id) && (
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 pt-3 border-t">
                          <div>
                            <Label className="text-xs">Date</Label>
                            <Input
                              type="date"
                              value={selectedActivities.find(a => a.id === activity.id)?.date.toISOString().split('T')[0] || ''}
                              min={selectedDates.checkIn ? selectedDates.checkIn.toISOString().split('T')[0] : ''}
                              max={selectedDates.checkOut ? selectedDates.checkOut.toISOString().split('T')[0] : ''}
                              disabled={!selectedDates.checkIn || !selectedDates.checkOut}
                              onChange={(e) => {
                                const newDate = new Date(e.target.value);
                                setSelectedActivities(prev => prev.map(a => 
                                  a.id === activity.id ? { ...a, date: newDate } : a
                                ));
                              }}
                              className="mt-1"
                            />
                          </div>
                          <div>
                            <Label className="text-xs">Time</Label>
                            <Select
                              value={selectedActivities.find(a => a.id === activity.id)?.time || '09:00'}
                              onValueChange={(value) => {
                                setSelectedActivities(prev => prev.map(a => 
                                  a.id === activity.id ? { ...a, time: value } : a
                                ));
                              }}
                            >
                              <SelectTrigger className="mt-1">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="09:00">9:00 AM</SelectItem>
                                <SelectItem value="11:00">11:00 AM</SelectItem>
                                <SelectItem value="14:00">2:00 PM</SelectItem>
                                <SelectItem value="16:00">4:00 PM</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                          <div>
                            <Label className="text-xs">Participants</Label>
                            <Select
                              value={selectedActivities.find(a => a.id === activity.id)?.participants.toString() || '1'}
                              onValueChange={(value) => {
                                setSelectedActivities(prev => prev.map(a => 
                                  a.id === activity.id ? { ...a, participants: parseInt(value) } : a
                                ));
                              }}
                            >
                              <SelectTrigger className="mt-1">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                {Array.from({ length: Math.min(activity.capacity, form.watch('guests') || 1) }, (_, i) => i + 1).map((num) => (
                                  <SelectItem key={num} value={num.toString()}>
                                    {num}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Payment Section */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <CreditCard className="h-5 w-5" />
                <span>Payment Method</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-3">
                <div className="flex items-center space-x-2">
                  <input
                    type="radio"
                    id="card"
                    value="card"
                    {...form.register('paymentMethod')}
                    className="w-4 h-4 text-green-600"
                  />
                  <Label htmlFor="card" className="flex items-center space-x-2 cursor-pointer">
                    <CreditCard className="h-4 w-4" />
                    <span>Credit/Debit Card</span>
                  </Label>
                </div>
                
                <div className="flex items-center space-x-2">
                  <input
                    type="radio"
                    id="paynow"
                    value="paynow"
                    {...form.register('paymentMethod')}
                    className="w-4 h-4 text-green-600"
                  />
                  <Label htmlFor="paynow" className="flex items-center space-x-2 cursor-pointer">
                    <Phone className="h-4 w-4" />
                    <span>Paynow (Mobile Money)</span>
                  </Label>
                </div>
                
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
              {form.formState.errors.paymentMethod && (
                <p className="text-red-500 text-sm">
                  {form.formState.errors.paymentMethod.message}
                </p>
              )}

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
            </CardContent>
          </Card>

          {/* Submit Button */}
          <div className="flex justify-end">
            <Button
              type="submit"
              disabled={!pricing || isLoading}
              className="bg-green-600 hover:bg-green-700 px-8 py-3 text-lg"
              size="lg"
            >
              {isLoading ? (
                <>
                  <Loader2 className="h-5 w-5 mr-2 animate-spin" />
                  Processing...
                </>
              ) : (
                `Complete Booking - ${pricing ? formatCurrency(pricing.total) : ''}`
              )}
            </Button>
          </div>
        </form>
      </div>

      {/* Right Column - Booking Summary */}
      <div className="lg:col-span-1">
        <Card className="sticky top-8">
          <CardHeader>
            <CardTitle>Booking Summary</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Property Info */}
            {property && (
              <div className="flex space-x-3">
                {property.images && property.images.length > 0 && (
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
                  <p className="text-sm text-gray-600 flex items-center">
                    <MapPin className="h-3 w-3 mr-1" />
                    {property.address}
                  </p>
                  <Badge variant="secondary" className="mt-1">
                    {property.type.charAt(0).toUpperCase() + property.type.slice(1).toLowerCase()}
                  </Badge>
                </div>
              </div>
            )}

            <Separator />

            {/* Booking Details */}
            {(selectedDates.checkIn || selectedDates.checkOut) && (
              <div className="space-y-2">
                {selectedDates.checkIn && (
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">Check-in:</span>
                    <span>{selectedDates.checkIn.toLocaleDateString()}</span>
                  </div>
                )}
                {selectedDates.checkOut && (
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">Check-out:</span>
                    <span>{selectedDates.checkOut.toLocaleDateString()}</span>
                  </div>
                )}
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">Guests:</span>
                  <span>{form.watch('guests') || initialBookingData.guests}</span>
                </div>
              </div>
            )}

            {/* Pricing */}
            {pricing && (
              <>
                <Separator />
                <div className="space-y-2">
                  {/* Only show property pricing for property bookings, not activity bookings */}
                  {!isActivityBooking && (
                    <div className="flex justify-between text-sm">
                      <span>{property ? formatCurrency(property.basePrice) : 'N/A'} × {pricing.nights} night{pricing.nights !== 1 ? 's' : ''}</span>
                      <span>{formatCurrency(pricing.subtotal)}</span>
                    </div>
                  )}
                  
                  {/* Add-ons breakdown */}
                  {Object.entries(selectedAddOns).map(([addOnId, quantity]) => {
                    const addOn = allAddOns.find(a => a.id === addOnId);
                    if (!addOn || quantity === 0) return null;
                    return (
                      <div key={addOnId} className="flex justify-between text-sm">
                        <span>{addOn.name} × {quantity}</span>
                        <span>{formatCurrency(addOn.price * quantity)}</span>
                      </div>
                    );
                  })}
                  
                  {/* Activities breakdown */}
                  {selectedActivities.map((activity) => {
                    const activityData = activities.find(a => a.id === activity.id);
                    if (!activityData) return null;
                    return (
                      <div key={`${activity.id}-${activity.date.toISOString()}`} className="flex justify-between text-sm">
                        <span>{activityData.name} × {activity.participants}</span>
                        <span>{formatCurrency(activityData.price * activity.participants)}</span>
                      </div>
                    );
                  })}
                  
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
                  <div className="flex justify-between font-semibold text-lg">
                    <span>Total</span>
                    <span>{formatCurrency(pricing.total)}</span>
                  </div>
                </div>
              </>
            )}

            {/* Security Deposit */}
            {property && property.securityDeposit && (
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