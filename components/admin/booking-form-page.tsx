'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import * as z from 'zod';
import { format } from 'date-fns';
import { CalendarIcon, Loader2, Plus, X } from 'lucide-react';
import { toast } from 'sonner';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { SearchableSelect, SearchableSelectOption } from '@/components/ui/searchable-select';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { cn } from '@/lib/utils';

// Form schema
const bookingFormSchema = z.object({
  // Guest Information
  guestName: z.string().min(2, 'Guest name must be at least 2 characters'),
  guestEmail: z.string().email('Please enter a valid email address'),
  guestPhone: z.string().optional(),
  
  // Booking Details
  propertyId: z.string().optional(),
  isEstateBooking: z.boolean().default(false),
  checkIn: z.date({
    required_error: 'Check-in date is required',
  }),
  checkOut: z.date({
    required_error: 'Check-out date is required',
  }),
  adults: z.number().min(1, 'At least 1 adult is required'),
  children: z.number().min(0, 'Children count cannot be negative'),
  
  // Payment Information
  paymentMethod: z.enum(['CASH', 'BANK_TRANSFER', 'STRIPE']),
  paymentStatus: z.enum(['PENDING', 'PROCESSING', 'COMPLETED', 'FAILED', 'REFUNDED']),
  status: z.enum(['PENDING', 'CONFIRMED', 'CANCELLED', 'COMPLETED']),
  
  // Additional Information
  notes: z.string().optional(),
  
  // Add-ons and Activities
  selectedAddOns: z.array(z.object({
    id: z.string(),
    quantity: z.number().min(1),
  })).default([]),
  selectedActivities: z.array(z.object({
    id: z.string(),
    date: z.date(),
    time: z.string(),
    participants: z.number().min(1),
  })).default([]),
});

type BookingFormValues = z.infer<typeof bookingFormSchema>;

interface Property {
  id: string;
  name: string;
  type: string;
  basePrice: number;
}

interface AddOn {
  id: string;
  name: string;
  description: string;
  price: number;
}

interface Activity {
  id: string;
  name: string;
  type: string;
  description: string;
  price: number;
  duration: number;
  capacity: number;
}

interface User {
  id: string;
  name: string;
  email: string;
  phone?: string;
}

interface BookingFormPageProps {
  booking?: any; // For edit mode
}

const defaultValues: Partial<BookingFormValues> = {
  adults: 1,
  children: 0,
  isEstateBooking: false,
  paymentMethod: 'CASH',
  paymentStatus: 'PENDING',
  status: 'PENDING',
  selectedAddOns: [],
  selectedActivities: [],
};

export function BookingFormPage({ booking }: BookingFormPageProps) {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [properties, setProperties] = useState<Property[]>([]);
  const [addOns, setAddOns] = useState<AddOn[]>([]);
  const [activities, setActivities] = useState<Activity[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [selectedGuest, setSelectedGuest] = useState<User | null>(null);
  const [totalPrice, setTotalPrice] = useState(0);

  const form = useForm<BookingFormValues>({
    resolver: zodResolver(bookingFormSchema),
    defaultValues: booking ? {
      guestName: booking.guest.name,
      guestEmail: booking.guest.email,
      guestPhone: booking.guest.phone || '',
      propertyId: booking.property?.id || '',
      isEstateBooking: booking.isEstateBooking,
      checkIn: new Date(booking.checkIn),
      checkOut: new Date(booking.checkOut),
      adults: booking.adults,
      children: booking.children,
      paymentMethod: booking.paymentMethod,
      paymentStatus: booking.paymentStatus,
      status: booking.status,
      notes: booking.notes || '',
      selectedAddOns: booking.addOns.map((addOn: any) => ({
        id: addOn.addOnId,
        quantity: addOn.quantity,
      })),
      selectedActivities: booking.activities.map((activity: any) => ({
        id: activity.activityId,
        date: new Date(activity.date),
        time: activity.time,
        participants: activity.participants,
      })),
    } : defaultValues,
  });

  // Fetch data on component mount
  useEffect(() => {
    const fetchData = async () => {
      try {
        const [propertiesRes, addOnsRes, activitiesRes, usersRes] = await Promise.all([
          fetch('/api/properties'),
          fetch('/api/addons'),
          fetch('/api/activities'),
          fetch('/api/users'),
        ]);

        if (propertiesRes.ok) {
          const propertiesData = await propertiesRes.json();
          setProperties(Array.isArray(propertiesData) ? propertiesData : propertiesData.properties || []);
        }

        if (addOnsRes.ok) {
          const addOnsData = await addOnsRes.json();
          setAddOns(Array.isArray(addOnsData) ? addOnsData : addOnsData.addOns || []);
        }

        if (activitiesRes.ok) {
          const activitiesData = await activitiesRes.json();
          setActivities(Array.isArray(activitiesData) ? activitiesData : activitiesData.activities || []);
        }

        if (usersRes.ok) {
          const usersData = await usersRes.json();
          const usersArray = Array.isArray(usersData) ? usersData : usersData.users || [];
          setUsers(usersArray);
          
          // Auto-select guest if editing booking
          if (booking && booking.guest) {
            const existingGuest = usersArray.find((user: User) => user.id === booking.guest.id);
            if (existingGuest) {
              setSelectedGuest(existingGuest);
            }
          }
        }
      } catch (error) {
        console.error('Error fetching data:', error);
        toast.error('Failed to load form data');
      }
    };

    fetchData();
  }, [booking]);

  // Calculate total price
  useEffect(() => {
    const calculateTotal = () => {
      let total = 0;
      
      // Base property price calculation
      const propertyId = form.watch('propertyId');
      const checkIn = form.watch('checkIn');
      const checkOut = form.watch('checkOut');
      const isEstateBooking = form.watch('isEstateBooking');
      
      if (!isEstateBooking && propertyId && checkIn && checkOut) {
        const property = properties.find(p => p.id === propertyId);
        if (property) {
          const nights = Math.ceil((checkOut.getTime() - checkIn.getTime()) / (1000 * 60 * 60 * 24));
          total += property.basePrice * nights;
        }
      }
      
      // Add-ons price
      const selectedAddOns = form.watch('selectedAddOns');
      selectedAddOns.forEach(selectedAddOn => {
        const addOn = addOns.find(a => a.id === selectedAddOn.id);
        if (addOn) {
          total += addOn.price * selectedAddOn.quantity;
        }
      });
      
      // Activities price
      const selectedActivities = form.watch('selectedActivities');
      selectedActivities.forEach(selectedActivity => {
        const activity = activities.find(a => a.id === selectedActivity.id);
        if (activity) {
          total += activity.price * selectedActivity.participants;
        }
      });
      
      setTotalPrice(total);
    };
    
    calculateTotal();
  }, [form.watch(), properties, addOns, activities]);

  const onSubmit = async (values: BookingFormValues) => {
    setIsLoading(true);
    
    try {
      const bookingData = {
        ...values,
        totalPrice,
        guestId: selectedGuest?.id,
      };
      
      const url = booking ? `/api/bookings/${booking.id}` : '/api/bookings';
      const method = booking ? 'PUT' : 'POST';
      
      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(bookingData),
      });
      
      if (!response.ok) {
        throw new Error('Failed to save booking');
      }
      
      toast.success(booking ? 'Booking updated successfully!' : 'Booking created successfully!');
      router.push('/admin/bookings');
    } catch (error) {
      console.error('Error saving booking:', error);
      toast.error('Failed to save booking. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const addAddOn = (addOnId: string) => {
    const currentAddOns = form.getValues('selectedAddOns');
    const existingAddOn = currentAddOns.find(a => a.id === addOnId);
    
    if (existingAddOn) {
      // Increase quantity
      const updatedAddOns = currentAddOns.map(a => 
        a.id === addOnId ? { ...a, quantity: a.quantity + 1 } : a
      );
      form.setValue('selectedAddOns', updatedAddOns);
    } else {
      // Add new add-on
      form.setValue('selectedAddOns', [...currentAddOns, { id: addOnId, quantity: 1 }]);
    }
  };

  const removeAddOn = (addOnId: string) => {
    const currentAddOns = form.getValues('selectedAddOns');
    const updatedAddOns = currentAddOns.filter(a => a.id !== addOnId);
    form.setValue('selectedAddOns', updatedAddOns);
  };

  const addActivity = (activityId: string) => {
    const currentActivities = form.getValues('selectedActivities');
    form.setValue('selectedActivities', [
      ...currentActivities,
      {
        id: activityId,
        date: new Date(),
        time: '09:00',
        participants: 1,
      }
    ]);
  };

  const removeActivity = (index: number) => {
    const currentActivities = form.getValues('selectedActivities');
    const updatedActivities = currentActivities.filter((_, i) => i !== index);
    form.setValue('selectedActivities', updatedActivities);
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        <div className="grid gap-6 lg:grid-cols-2">
          {/* Guest Information */}
          <Card>
            <CardHeader>
              <CardTitle>Guest Information</CardTitle>
              <CardDescription>
                Enter the guest details for this booking
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>Select Existing Guest (Optional)</Label>
                <SearchableSelect
                  options={users.map((user): SearchableSelectOption => ({
                    value: user.id,
                    label: `${user.name} (${user.email})`,
                    searchTerms: [user.name, user.email, user.phone || ''].filter(Boolean)
                  }))}
                  value={selectedGuest?.id || ''}
                  onValueChange={(value) => {
                    const user = users.find(u => u.id === value);
                    if (user) {
                      setSelectedGuest(user);
                      form.setValue('guestName', user.name);
                      form.setValue('guestEmail', user.email);
                      form.setValue('guestPhone', user.phone || '');
                    } else {
                      setSelectedGuest(null);
                      form.setValue('guestName', '');
                      form.setValue('guestEmail', '');
                      form.setValue('guestPhone', '');
                    }
                  }}
                  placeholder="Search existing guests..."
                  searchPlaceholder="Search by name, email, or phone..."
                  emptyMessage="No guests found."
                />
              </div>
              
              <FormField
                control={form.control}
                name="guestName"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Guest Name</FormLabel>
                    <FormControl>
                      <Input placeholder="Enter guest name" className="bg-white" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <FormField
                control={form.control}
                name="guestEmail"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Email Address</FormLabel>
                    <FormControl>
                      <Input type="email" placeholder="Enter email address" className="bg-white" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <FormField
                control={form.control}
                name="guestPhone"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Phone Number (Optional)</FormLabel>
                    <FormControl>
                      <Input placeholder="Enter phone number" className="bg-white" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </CardContent>
          </Card>

          {/* Booking Details */}
          <Card>
            <CardHeader>
              <CardTitle>Booking Details</CardTitle>
              <CardDescription>
                Configure the booking dates and property
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <FormField
                control={form.control}
                name="isEstateBooking"
                render={({ field }) => (
                  <FormItem className="flex flex-row items-start space-x-3 space-y-0">
                    <FormControl>
                      <Checkbox
                        checked={field.value}
                        onCheckedChange={field.onChange}
                      />
                    </FormControl>
                    <div className="space-y-1 leading-none">
                      <FormLabel>
                        Estate Booking (No specific property)
                      </FormLabel>
                      <FormDescription>
                        Check this for general estate bookings without a specific property
                      </FormDescription>
                    </div>
                  </FormItem>
                )}
              />
              
              {!form.watch('isEstateBooking') && (
                <FormField
                  control={form.control}
                  name="propertyId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Property</FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl>
                          <SelectTrigger className="bg-white">
                            <SelectValue placeholder="Select a property" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {properties.map((property) => (
                            <SelectItem key={property.id} value={property.id}>
                              {property.name} - ${property.basePrice}/night
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              )}
              
              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="checkIn"
                  render={({ field }) => (
                    <FormItem className="flex flex-col">
                      <FormLabel>Check-in Date</FormLabel>
                      <Popover>
                        <PopoverTrigger asChild>
                          <FormControl>
                            <Button
                              variant={"outline"}
                              className={cn(
                                "w-full pl-3 text-left font-normal",
                                !field.value && "text-muted-foreground"
                              )}
                            >
                              {field.value ? (
                                format(field.value, "PPP")
                              ) : (
                                <span>Pick a date</span>
                              )}
                              <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                            </Button>
                          </FormControl>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0" align="start">
                          <Calendar
                            mode="single"
                            selected={field.value}
                            onSelect={field.onChange}
                            disabled={(date) => date < new Date()}
                            initialFocus
                          />
                        </PopoverContent>
                      </Popover>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <FormField
                  control={form.control}
                  name="checkOut"
                  render={({ field }) => (
                    <FormItem className="flex flex-col">
                      <FormLabel>Check-out Date</FormLabel>
                      <Popover>
                        <PopoverTrigger asChild>
                          <FormControl>
                            <Button
                              variant={"outline"}
                              className={cn(
                                "w-full pl-3 text-left font-normal",
                                !field.value && "text-muted-foreground"
                              )}
                            >
                              {field.value ? (
                                format(field.value, "PPP")
                              ) : (
                                <span>Pick a date</span>
                              )}
                              <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                            </Button>
                          </FormControl>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0" align="start">
                          <Calendar
                            mode="single"
                            selected={field.value}
                            onSelect={field.onChange}
                            disabled={(date) => date <= (form.getValues('checkIn') || new Date())}
                            initialFocus
                          />
                        </PopoverContent>
                      </Popover>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="adults"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Adults</FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          min="1"
                          className="bg-white"
                          {...field}
                          onChange={(e) => field.onChange(parseInt(e.target.value) || 1)}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <FormField
                  control={form.control}
                  name="children"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Children</FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          min="0"
                          className="bg-white"
                          {...field}
                          onChange={(e) => field.onChange(parseInt(e.target.value) || 0)}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Add-ons Section */}
        <Card>
          <CardHeader>
            <CardTitle>Add-ons</CardTitle>
            <CardDescription>
              Select additional services for this booking
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {addOns.map((addOn) => {
                  const selectedAddOn = form.watch('selectedAddOns').find(a => a.id === addOn.id);
                  return (
                    <div key={addOn.id} className="border rounded-lg p-4">
                      <div className="flex justify-between items-start mb-2">
                        <h4 className="font-medium">{addOn.name}</h4>
                        <span className="text-sm font-medium">${addOn.price}</span>
                      </div>
                      <p className="text-sm text-muted-foreground mb-3">{addOn.description}</p>
                      {selectedAddOn ? (
                        <div className="flex items-center gap-2">
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={() => {
                              if (selectedAddOn.quantity > 1) {
                                const currentAddOns = form.getValues('selectedAddOns');
                                const updatedAddOns = currentAddOns.map(a => 
                                  a.id === addOn.id ? { ...a, quantity: a.quantity - 1 } : a
                                );
                                form.setValue('selectedAddOns', updatedAddOns);
                              } else {
                                removeAddOn(addOn.id);
                              }
                            }}
                          >
                            -
                          </Button>
                          <span className="text-sm font-medium">{selectedAddOn.quantity}</span>
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={() => addAddOn(addOn.id)}
                          >
                            +
                          </Button>
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={() => removeAddOn(addOn.id)}
                          >
                            <X className="h-4 w-4" />
                          </Button>
                        </div>
                      ) : (
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => addAddOn(addOn.id)}
                        >
                          <Plus className="h-4 w-4 mr-2" />
                          Add
                        </Button>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Payment & Status */}
        <div className="grid gap-6 lg:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle>Payment Information</CardTitle>
              <CardDescription>
                Configure payment method and status
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <FormField
                control={form.control}
                name="paymentMethod"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Payment Method</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger className="bg-white">
                          <SelectValue placeholder="Select payment method" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="CASH">Cash</SelectItem>
                        <SelectItem value="BANK_TRANSFER">Bank Transfer</SelectItem>
                        <SelectItem value="STRIPE">Stripe</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <FormField
                control={form.control}
                name="paymentStatus"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Payment Status</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger className="bg-white">
                          <SelectValue placeholder="Select payment status" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="PENDING">Pending</SelectItem>
                        <SelectItem value="PROCESSING">Processing</SelectItem>
                        <SelectItem value="COMPLETED">Completed</SelectItem>
                        <SelectItem value="FAILED">Failed</SelectItem>
                        <SelectItem value="REFUNDED">Refunded</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <FormField
                control={form.control}
                name="status"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Booking Status</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger className="bg-white">
                          <SelectValue placeholder="Select booking status" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="PENDING">Pending</SelectItem>
                        <SelectItem value="CONFIRMED">Confirmed</SelectItem>
                        <SelectItem value="CANCELLED">Cancelled</SelectItem>
                        <SelectItem value="COMPLETED">Completed</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </CardContent>
          </Card>

          {/* Summary */}
          <Card>
            <CardHeader>
              <CardTitle>Booking Summary</CardTitle>
              <CardDescription>
                Review the total cost and details
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span>Base Price:</span>
                  <span>${(totalPrice - form.watch('selectedAddOns').reduce((sum, addOn) => {
                    const addOnData = addOns.find(a => a.id === addOn.id);
                    return sum + (addOnData ? addOnData.price * addOn.quantity : 0);
                  }, 0) - form.watch('selectedActivities').reduce((sum, activity) => {
                    const activityData = activities.find(a => a.id === activity.id);
                    return sum + (activityData ? activityData.price * activity.participants : 0);
                  }, 0)).toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span>Add-ons:</span>
                  <span>${form.watch('selectedAddOns').reduce((sum, addOn) => {
                    const addOnData = addOns.find(a => a.id === addOn.id);
                    return sum + (addOnData ? addOnData.price * addOn.quantity : 0);
                  }, 0).toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span>Activities:</span>
                  <span>${form.watch('selectedActivities').reduce((sum, activity) => {
                    const activityData = activities.find(a => a.id === activity.id);
                    return sum + (activityData ? activityData.price * activity.participants : 0);
                  }, 0).toFixed(2)}</span>
                </div>
                <div className="border-t pt-2">
                  <div className="flex justify-between font-medium">
                    <span>Total:</span>
                    <span>${totalPrice.toFixed(2)}</span>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Notes */}
        <Card>
          <CardHeader>
            <CardTitle>Additional Notes</CardTitle>
            <CardDescription>
              Add any special requests or notes for this booking
            </CardDescription>
          </CardHeader>
          <CardContent>
            <FormField
              control={form.control}
              name="notes"
              render={({ field }) => (
                <FormItem>
                  <FormControl>
                    <Textarea
                      placeholder="Enter any special requests or notes..."
                      className="min-h-[100px] bg-white"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </CardContent>
        </Card>

        {/* Form Actions */}
        <div className="flex gap-4">
          <Button
            type="button"
            variant="outline"
            onClick={() => router.back()}
            disabled={isLoading}
          >
            Cancel
          </Button>
          <Button type="submit" disabled={isLoading}>
            {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {booking ? 'Update Booking' : 'Create Booking'}
          </Button>
        </div>
      </form>
    </Form>
  );
}