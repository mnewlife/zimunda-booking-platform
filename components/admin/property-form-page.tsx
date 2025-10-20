'use client';

import React, { useState, useTransition, useEffect, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import * as z from 'zod';
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { toast } from 'sonner';
import { Loader2, Plus, X, Upload, MapPin, ArrowLeft } from 'lucide-react';
import { PropertyType, PropertyStatus } from '@prisma/client';
import { createProperty, updateProperty } from '@/lib/actions/property-actions';
import Link from 'next/link';

const propertyFormSchema = z.object({
  name: z.string().min(1, 'Property name is required'),
  type: z.nativeEnum(PropertyType),
  description: z.string().min(10, 'Description must be at least 10 characters'),
  maxOccupancy: z.number().min(1, 'Max occupancy must be at least 1'),
  basePrice: z.number().min(1, 'Base price must be at least $1'),
  status: z.nativeEnum(PropertyStatus),
  location: z.object({
    address: z.string().min(1, 'Address is required'),
    city: z.string().min(1, 'City is required'),
    country: z.string().min(1, 'Country is required'),
  }),
  policies: z.object({
    checkIn: z.string().min(1, 'Check-in time is required'),
    checkOut: z.string().min(1, 'Check-out time is required'),
    cancellation: z.string().min(1, 'Cancellation policy is required'),
    smoking: z.boolean(),
    pets: z.boolean(),
    parties: z.boolean(),
  }),
  rules: z.array(z.string()),
  amenityIds: z.array(z.string()),
  addOns: z.array(z.object({
    name: z.string().min(1, 'Add-on name is required'),
    description: z.string().min(1, 'Add-on description is required'),
    price: z.number().min(0, 'Price must be 0 or greater'),
  })),
  activityIds: z.array(z.string()),
  images: z.array(z.object({
    url: z.string().url('Must be a valid URL'),
    alt: z.string().optional(),
    caption: z.string().optional(),
  })),
});

type PropertyFormValues = z.infer<typeof propertyFormSchema>;

interface PropertyFormPageProps {
  property?: any;
}

const defaultValues: Partial<PropertyFormValues> = {
  name: '',
  type: 'COTTAGE',
  description: '',
  maxOccupancy: 2,
  basePrice: 100,
  status: 'ACTIVE',
  location: {
    address: '',
    city: '',
    country: 'Zimbabwe',
  },
  policies: {
    checkIn: '15:00',
    checkOut: '11:00',
    cancellation: 'Free cancellation up to 24 hours before check-in',
    smoking: false,
    pets: false,
    parties: false,
  },
  rules: [],
  amenityIds: [],
  addOns: [],
  activityIds: [],
  images: [],
};

const availableAmenities = [
  { id: 'wifi', name: 'WiFi', icon: '📶' },
  { id: 'parking', name: 'Free Parking', icon: '🚗' },
  { id: 'kitchen', name: 'Kitchen', icon: '🍳' },
  { id: 'pool', name: 'Swimming Pool', icon: '🏊' },
  { id: 'gym', name: 'Gym', icon: '💪' },
  { id: 'spa', name: 'Spa', icon: '🧘' },
  { id: 'restaurant', name: 'Restaurant', icon: '🍽️' },
  { id: 'bar', name: 'Bar', icon: '🍸' },
  { id: 'laundry', name: 'Laundry', icon: '👕' },
  { id: 'ac', name: 'Air Conditioning', icon: '❄️' },
  { id: 'heating', name: 'Heating', icon: '🔥' },
  { id: 'tv', name: 'TV', icon: '📺' },
  { id: 'balcony', name: 'Balcony', icon: '🏞️' },
  { id: 'garden', name: 'Garden', icon: '🌿' },
  { id: 'fireplace', name: 'Fireplace', icon: '🔥' },
];

const availableActivities = [
  { id: 'safari', name: 'Safari Tour', icon: '🦁' },
  { id: 'fishing', name: 'Fishing', icon: '🎣' },
  { id: 'hiking', name: 'Hiking', icon: '🥾' },
  { id: 'boating', name: 'Boat Rides', icon: '🚤' },
  { id: 'birdwatching', name: 'Bird Watching', icon: '🦅' },
  { id: 'photography', name: 'Photography Tours', icon: '📸' },
  { id: 'cultural', name: 'Cultural Tours', icon: '🏛️' },
  { id: 'horseback', name: 'Horseback Riding', icon: '🐎' },
  { id: 'cycling', name: 'Cycling', icon: '🚴' },
  { id: 'canoeing', name: 'Canoeing', icon: '🛶' },
];

const commonRules = [
  'No smoking inside the property',
  'No pets allowed',
  'No parties or events',
  'Quiet hours: 10 PM - 8 AM',
  'Maximum occupancy must be respected',
  'Check-in after 3 PM, check-out before 11 AM',
  'Guests are responsible for any damages',
  'No unregistered guests allowed',
];

export function PropertyFormPage({ property }: PropertyFormPageProps) {
  const [isPending, startTransition] = useTransition();
  const [newRule, setNewRule] = useState('');
  const [newImage, setNewImage] = useState({ url: '', alt: '', caption: '' });
  const [newAddOn, setNewAddOn] = useState({ name: '', description: '', price: 0 });
  const [amenities, setAmenities] = useState<any[]>([]);
  const [activities, setActivities] = useState<any[]>([]);
  const [existingAddOns, setExistingAddOns] = useState<any[]>([]);
  const [loadingAmenities, setLoadingAmenities] = useState(true);
  const [loadingActivities, setLoadingActivities] = useState(true);
  const [loadingAddOns, setLoadingAddOns] = useState(true);
  const router = useRouter();

  const form = useForm<PropertyFormValues>({
    resolver: zodResolver(propertyFormSchema),
    defaultValues: property ? {
      name: property.name,
      type: property.type,
      description: property.description,
      maxOccupancy: property.maxOccupancy,
      basePrice: Number(property.basePrice.toString()),
      status: property.status,
      location: property.location,
      policies: property.policies,
      rules: property.rules || [],
      amenityIds: property.amenities?.map((a: any) => a.amenityId) || [],
      addOns: property.addOns?.map((addon: any) => ({
        name: addon.name,
        description: addon.description,
        price: addon.price,
      })) || [],
      activityIds: property.activities?.map((a: any) => a.activityId) || [],
      images: property.images?.map((img: any) => ({
        url: img.url,
        alt: img.alt || '',
        caption: img.caption || '',
      })) || [],
    } : defaultValues,
  });

  // Fetch amenities and activities on component mount
  useEffect(() => {
    const fetchAmenities = async () => {
      try {
        const response = await fetch('/api/amenities');
        if (response.ok) {
          const data = await response.json();
          setAmenities(data);
        } else {
          // Fallback to static amenities if API fails
          setAmenities(availableAmenities);
        }
      } catch (error) {
        console.error('Failed to fetch amenities:', error);
        // Fallback to static amenities
        setAmenities(availableAmenities);
      } finally {
        setLoadingAmenities(false);
      }
    };

    const fetchActivities = async () => {
      try {
        const response = await fetch('/api/activities');
        if (response.ok) {
          const data = await response.json();
          // The API returns an object with activities array, not a direct array
          setActivities(data.activities || []);
        } else {
          // Fallback to static activities if API fails
          setActivities(availableActivities);
        }
      } catch (error) {
        console.error('Failed to fetch activities:', error);
        // Fallback to static activities
        setActivities(availableActivities);
      } finally {
        setLoadingActivities(false);
      }
    };

    const fetchAddOns = async () => {
      try {
        const response = await fetch('/api/addons');
        if (response.ok) {
          const data = await response.json();
          // Remove any potential duplicates based on id
          const uniqueAddOns = data.filter((addon: any, index: number, self: any[]) => 
            index === self.findIndex((a) => a.id === addon.id)
          );
          setExistingAddOns(uniqueAddOns);
        }
      } catch (error) {
        console.error('Failed to fetch add-ons:', error);
      } finally {
        setLoadingAddOns(false);
      }
    };

    fetchAmenities();
    fetchActivities();
    fetchAddOns();
  }, []);

  const onSubmit = async (values: PropertyFormValues) => {
    startTransition(async () => {
      try {
        if (property) {
          await updateProperty(property.id, values);
          toast.success('Property updated successfully!');
        } else {
          await createProperty(values);
          toast.success('Property created successfully!');
        }
        router.push('/admin/properties');
        router.refresh();
      } catch (error) {
        console.error('Error saving property:', error);
        toast.error(property ? 'Failed to update property' : 'Failed to create property');
      }
    });
  };

  const addRule = () => {
    if (newRule.trim()) {
      const currentRules = form.getValues('rules');
      form.setValue('rules', [...currentRules, newRule.trim()]);
      setNewRule('');
    }
  };

  const removeRule = (index: number) => {
    const currentRules = form.getValues('rules');
    form.setValue('rules', currentRules.filter((_, i) => i !== index));
  };

  const addCommonRule = (rule: string) => {
    const currentRules = form.getValues('rules');
    if (!currentRules.includes(rule)) {
      form.setValue('rules', [...currentRules, rule]);
    }
  };

  const addImage = () => {
    if (newImage.url.trim()) {
      const currentImages = form.getValues('images');
      form.setValue('images', [...currentImages, newImage]);
      setNewImage({ url: '', alt: '', caption: '' });
    }
  };

  const removeImage = (index: number) => {
    const currentImages = form.getValues('images');
    form.setValue('images', currentImages.filter((_, i) => i !== index));
  };

  const addAddOn = () => {
    if (newAddOn.name.trim() && newAddOn.description.trim()) {
      const currentAddOns = form.getValues('addOns');
      form.setValue('addOns', [...currentAddOns, newAddOn]);
      setNewAddOn({ name: '', description: '', price: 0 });
    }
  };

  const removeAddOn = (index: number) => {
    const currentAddOns = form.getValues('addOns');
    form.setValue('addOns', currentAddOns.filter((_, i) => i !== index));
  };

  const addExistingAddOn = (existingAddOn: any) => {
    const currentAddOns = form.getValues('addOns');
    const isAlreadyAdded = currentAddOns.some(addon => 
      addon.name === existingAddOn.name && 
      addon.description === existingAddOn.description
    );
    
    if (!isAlreadyAdded) {
      const newAddOn = {
        name: existingAddOn.name,
        description: existingAddOn.description,
        price: Number(existingAddOn.price)
      };
      form.setValue('addOns', [...currentAddOns, newAddOn]);
    }
  };

  // Memoize available add-ons to prevent duplicates and optimize rendering
  const availableAddOnsForDropdown = useMemo(() => {
    const currentAddOns = form.watch('addOns');
    return existingAddOns.filter(addOn => {
      const isAlreadyAdded = currentAddOns.some(existing => 
        existing.name === addOn.name && 
        existing.description === addOn.description
      );
      return !isAlreadyAdded;
    });
  }, [existingAddOns, form.watch('addOns')]);

  return (
    <div className="w-full mx-auto">
      <div className="mb-6">
        <Button variant="outline" asChild>
          <Link href="/admin/properties">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Properties
          </Link>
        </Button>
      </div>

      <Card>
        <CardContent className="p-6">
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
              {/* Basic Information Section */}
              <div className="space-y-6">
                <div>
                  <h2 className="text-xl font-semibold mb-2">Basic Information</h2>
                  <p className="text-sm text-muted-foreground mb-4">
                    Enter the basic details about your property
                  </p>
                </div>
                  <div className="grid grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="name"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Property Name</FormLabel>
                          <FormControl>
                            <Input className="bg-white" placeholder="Enter property name" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="type"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Property Type</FormLabel>
                          <Select onValueChange={field.onChange} defaultValue={field.value}>
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder="Select property type" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              <SelectItem value="COTTAGE">Cottage</SelectItem>
                              <SelectItem value="VILLA">Villa</SelectItem>
                              <SelectItem value="APARTMENT">Apartment</SelectItem>
                              <SelectItem value="HOUSE">House</SelectItem>
                              <SelectItem value="STUDIO">Studio</SelectItem>
                              <SelectItem value="PENTHOUSE">Penthouse</SelectItem>
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  <FormField
                    control={form.control}
                    name="description"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Description</FormLabel>
                        <FormControl>
                          <Textarea
                            className="bg-white min-h-[100px]"
                            placeholder="Describe the property..."
                            {...field}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <div className="grid grid-cols-3 gap-4">
                    <FormField
                      control={form.control}
                      name="maxOccupancy"
                      render={({ field }) => (
                        <FormItem>
                      <FormLabel>Max Occupancy</FormLabel>
                      <FormControl>
                        <Input
                          className="bg-white"
                          type="number"
                          placeholder="4"
                          {...field}
                          onChange={(e) => field.onChange(parseInt(e.target.value))}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="basePrice"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Base Price (per night)</FormLabel>
                          <FormControl>
                            <Input
                              className="bg-white"
                              type="number"
                              min="1"
                              step="0.01"
                              {...field}
                              onChange={(e) => field.onChange(parseFloat(e.target.value))}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="status"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Status</FormLabel>
                          <Select onValueChange={field.onChange} defaultValue={field.value}>
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder="Select status" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              <SelectItem value="ACTIVE">Active</SelectItem>
                              <SelectItem value="INACTIVE">Inactive</SelectItem>
                              <SelectItem value="MAINTENANCE">Maintenance</SelectItem>
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
              </div>

              <Separator />

              {/* Location Section */}
              <div className="space-y-6">
                <div>
                  <h2 className="text-xl font-semibold mb-2">Location</h2>
                  <p className="text-sm text-muted-foreground mb-4">
                    Specify where your property is located
                  </p>
                </div>
                  <FormField
                    control={form.control}
                    name="location.address"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Address</FormLabel>
                        <FormControl>
                          <Input className="bg-white" placeholder="Enter full address" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <div className="grid grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="location.city"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>City</FormLabel>
                          <FormControl>
                            <Input className="bg-white" placeholder="Enter city" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="location.country"
                      render={({ field }) => (
                        <FormItem>
                      <FormLabel>Country</FormLabel>
                      <FormControl>
                        <Input className="bg-white" placeholder="United States" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                      )}
                    />
                  </div>
              </div>

              <Separator />

              {/* Amenities Section */}
              <div className="space-y-6">
                <div>
                  <h2 className="text-xl font-semibold mb-2">Amenities</h2>
                  <p className="text-sm text-muted-foreground mb-4">
                    Select all amenities available at this property
                  </p>
                </div>
                  <div>
                    {loadingAmenities ? (
                      <div className="flex items-center justify-center py-8">
                        <Loader2 className="h-6 w-6 animate-spin" />
                        <span className="ml-2">Loading amenities...</span>
                      </div>
                    ) : (
                      <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                        {amenities.map((amenity) => (
                          <FormField
                            key={amenity.id}
                            control={form.control}
                            name="amenityIds"
                            render={({ field }) => {
                              return (
                                <FormItem
                                  key={amenity.id}
                                  className="flex flex-row items-start space-x-3 space-y-0"
                                >
                                  <FormControl>
                                    <Checkbox
                                      className="bg-white"
                                      checked={field.value?.includes(amenity.id)}
                                      onCheckedChange={(checked) => {
                                        return checked
                                          ? field.onChange([...field.value, amenity.id])
                                          : field.onChange(
                                              field.value?.filter(
                                                (value) => value !== amenity.id
                                              )
                                            );
                                      }}
                                    />
                                  </FormControl>
                                  <div className="space-y-1 leading-none">
                                    <FormLabel className="flex items-center gap-2">
                                      <span>{amenity.icon}</span>
                                      {amenity.name}
                                    </FormLabel>
                                  </div>
                                </FormItem>
                              );
                            }}
                          />
                        ))}
                      </div>
                    )}
                  </div>
              </div>

              <Separator />

              {/* Add-ons Section */}
              <div className="space-y-6">
                <div>
                  <h2 className="text-xl font-semibold mb-2">Add-ons</h2>
                  <p className="text-sm text-muted-foreground mb-4">
                    Add optional services and extras for this property
                  </p>
                </div>
                <div className="space-y-4">
                  {/* Current Add-ons */}
                  {form.watch('addOns').length > 0 && (
                    <div className="space-y-2">
                      <h3 className="text-lg font-medium">Current Add-ons</h3>
                      <div className="space-y-2">
                        {form.watch('addOns').map((addOn, index) => (
                          <div key={index} className="flex items-center justify-between p-3 border rounded-lg">
                            <div className="flex-1">
                              <div className="font-medium">{addOn.name}</div>
                              <div className="text-sm text-muted-foreground">{addOn.description}</div>
                              <div className="text-sm font-medium">${addOn.price}</div>
                            </div>
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              onClick={() => removeAddOn(index)}
                            >
                              <X className="h-4 w-4" />
                            </Button>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Select Existing Add-ons */}
                  <div className="space-y-4">
                    <h3 className="text-lg font-medium">Select from Existing Add-ons</h3>
                    {loadingAddOns ? (
                      <div className="flex items-center justify-center p-4">
                        <Loader2 className="h-6 w-6 animate-spin" />
                        <span className="ml-2">Loading add-ons...</span>
                      </div>
                    ) : existingAddOns.length > 0 ? (
                      <div className="space-y-4">
                        <div className="flex gap-4">
                          <div className="flex-1">
                            <Label htmlFor="existing-addon-select">Choose an existing add-on</Label>
                            <Select onValueChange={(value) => {
                              const selectedAddOn = existingAddOns.find(addon => addon.id === value);
                              if (selectedAddOn) {
                                addExistingAddOn(selectedAddOn);
                              }
                            }}>
                              <SelectTrigger id="existing-addon-select">
                                <SelectValue placeholder="Select an add-on to add..." />
                              </SelectTrigger>
                              <SelectContent>
                                {availableAddOnsForDropdown.map((addOn) => (
                                  <SelectItem key={`addon-${addOn.id}`} value={addOn.id}>
                                    <div className="flex flex-col">
                                      <span className="font-medium">{addOn.name}</span>
                                      <span className="text-sm text-muted-foreground">
                                        {addOn.description} - ${Number(addOn.price)}
                                      </span>
                                    </div>
                                  </SelectItem>
                                ))}
                                {availableAddOnsForDropdown.length === 0 && existingAddOns.length > 0 && (
                                  <SelectItem value="no-more" disabled>
                                    All add-ons have been added
                                  </SelectItem>
                                )}
                              </SelectContent>
                            </Select>
                          </div>
                        </div>
                      </div>
                    ) : (
                      <p className="text-sm text-muted-foreground">No existing add-ons available.</p>
                    )}
                  </div>

                  {/* Add New Add-on */}
                  <div className="space-y-4">
                    <h3 className="text-lg font-medium">Create New Add-on</h3>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div>
                        <Label htmlFor="addon-name">Name</Label>
                        <Input
                          className="bg-white"
                          id="addon-name"
                          placeholder="e.g., Airport Transfer"
                          value={newAddOn.name}
                          onChange={(e) => setNewAddOn({ ...newAddOn, name: e.target.value })}
                        />
                      </div>
                      <div>
                        <Label htmlFor="addon-description">Description</Label>
                        <Input
                          className="bg-white"
                          id="addon-description"
                          placeholder="e.g., Round trip airport transfer"
                          value={newAddOn.description}
                          onChange={(e) => setNewAddOn({ ...newAddOn, description: e.target.value })}
                        />
                      </div>
                      <div>
                        <Label htmlFor="addon-price">Price ($)</Label>
                        <Input
                          className="bg-white"
                          id="addon-price"
                          type="number"
                          min="0"
                          step="0.01"
                          placeholder="0.00"
                          value={newAddOn.price}
                          onChange={(e) => setNewAddOn({ ...newAddOn, price: parseFloat(e.target.value) || 0 })}
                        />
                      </div>
                    </div>
                    <Button type="button" onClick={addAddOn} className="w-full">
                      <Plus className="h-4 w-4 mr-2" />
                      Add Add-on
                    </Button>
                  </div>
                </div>
              </div>

              <Separator />

              {/* Activities Section */}
              <div className="space-y-6">
                <div>
                  <h2 className="text-xl font-semibold mb-2">Activities</h2>
                  <p className="text-sm text-muted-foreground mb-4">
                    Select activities available at or near this property
                  </p>
                </div>
                <div>
                  {loadingActivities ? (
                    <div className="flex items-center justify-center py-8">
                      <Loader2 className="h-6 w-6 animate-spin" />
                      <span className="ml-2">Loading activities...</span>
                    </div>
                  ) : (
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                      {Array.isArray(activities) && activities.map((activity) => (
                        <FormField
                          key={activity.id}
                          control={form.control}
                          name="activityIds"
                          render={({ field }) => {
                            return (
                              <FormItem
                                key={activity.id}
                                className="flex flex-row items-start space-x-3 space-y-0"
                              >
                                <FormControl>
                                  <Checkbox
                                    className="bg-white"
                                    checked={field.value?.includes(activity.id)}
                                    onCheckedChange={(checked) => {
                                      return checked
                                        ? field.onChange([...field.value, activity.id])
                                        : field.onChange(
                                            field.value?.filter(
                                              (value) => value !== activity.id
                                            )
                                          );
                                    }}
                                  />
                                </FormControl>
                                <div className="space-y-1 leading-none">
                                  <FormLabel className="flex items-center gap-2">
                                    <span>{activity.icon}</span>
                                    {activity.name}
                                  </FormLabel>
                                </div>
                              </FormItem>
                            );
                          }}
                        />
                      ))}
                    </div>
                  )}
                </div>
              </div>

              <Separator />

              {/* Policies & Rules Section */}
              <div className="space-y-6">
                <div>
                  <h2 className="text-xl font-semibold mb-2">Policies & Rules</h2>
                  <p className="text-sm text-muted-foreground mb-4">
                    Set check-in/out times, policies, and house rules
                  </p>
                </div>
                  <div className="space-y-4">
                    <h3 className="text-lg font-medium">Check-in/Check-out</h3>
                    <div className="grid grid-cols-2 gap-4">
                      <FormField
                        control={form.control}
                        name="policies.checkIn"
                        render={({ field }) => (
                          <FormItem>
                      <FormLabel>Check-in Time</FormLabel>
                      <FormControl>
                        <Input className="bg-white" placeholder="15:00" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                        )}
                      />
                      <FormField
                        control={form.control}
                        name="policies.checkOut"
                        render={({ field }) => (
                          <FormItem>
                      <FormLabel>Check-out Time</FormLabel>
                      <FormControl>
                        <Input className="bg-white" placeholder="11:00" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                        )}
                      />
                    </div>
                  </div>

                  <Separator />

                  <div className="space-y-4">
                    <h3 className="text-lg font-medium">Cancellation Policy</h3>
                    <FormField
                      control={form.control}
                      name="policies.cancellation"
                      render={({ field }) => (
                        <FormItem>
                          <FormControl>
                            <Textarea
                              className="bg-white"
                              placeholder="Describe the cancellation policy..."
                              {...field}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  <Separator />

                  <div className="space-y-4">
                    <h3 className="text-lg font-medium">Property Policies</h3>
                    <div className="space-y-3">
                      <FormField
                        control={form.control}
                        name="policies.smoking"
                        render={({ field }) => (
                          <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                            <div className="space-y-0.5">
                              <FormLabel className="text-base">Smoking Allowed</FormLabel>
                              <FormDescription>
                                Allow smoking inside the property
                              </FormDescription>
                            </div>
                            <FormControl>
                              <Checkbox
                                className="bg-white"
                                checked={field.value}
                                onCheckedChange={field.onChange}
                              />
                            </FormControl>
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={form.control}
                        name="policies.pets"
                        render={({ field }) => (
                          <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                            <div className="space-y-0.5">
                              <FormLabel className="text-base">Pets Allowed</FormLabel>
                              <FormDescription>
                                Allow pets in the property
                              </FormDescription>
                            </div>
                            <FormControl>
                              <Checkbox
                                className="bg-white"
                                checked={field.value}
                                onCheckedChange={field.onChange}
                              />
                            </FormControl>
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={form.control}
                        name="policies.parties"
                        render={({ field }) => (
                          <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                            <div className="space-y-0.5">
                              <FormLabel className="text-base">Parties/Events Allowed</FormLabel>
                              <FormDescription>
                                Allow parties and events at the property
                              </FormDescription>
                            </div>
                            <FormControl>
                              <Checkbox
                                className="bg-white"
                                checked={field.value}
                                onCheckedChange={field.onChange}
                              />
                            </FormControl>
                          </FormItem>
                        )}
                      />
                    </div>
                  </div>

                  <Separator />

                  <div className="space-y-4">
                    <h3 className="text-lg font-medium">House Rules</h3>
                    <div className="space-y-4">
                      <div className="flex gap-2">
                        <Input
                          className="bg-white"
                          placeholder="Add a custom rule..."
                          value={newRule}
                          onChange={(e) => setNewRule(e.target.value)}
                          onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), addRule())}
                        />
                        <Button type="button" onClick={addRule} disabled={!newRule.trim()}>
                          <Plus className="h-4 w-4" />
                        </Button>
                      </div>

                      <div>
                        <Label className="text-sm font-medium">Common Rules</Label>
                        <div className="mt-2 flex flex-wrap gap-2">
                          {commonRules.map((rule, index) => (
                            <Badge
                              key={index}
                              variant="outline"
                              className="cursor-pointer hover:bg-primary hover:text-primary-foreground"
                              onClick={() => addCommonRule(rule)}
                            >
                              <Plus className="h-3 w-3 mr-1" />
                              {rule}
                            </Badge>
                          ))}
                        </div>
                      </div>

                      <div className="space-y-2">
                        <Label className="text-sm font-medium">Current Rules</Label>
                        {form.watch('rules').map((rule, index) => (
                          <div key={index} className="flex items-center justify-between p-3 border rounded-lg">
                            <span className="text-sm">{rule}</span>
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              onClick={() => removeRule(index)}
                            >
                              <X className="h-4 w-4" />
                            </Button>
                          </div>
                        ))}
                        {form.watch('rules').length === 0 && (
                          <p className="text-sm text-muted-foreground">No rules added yet.</p>
                        )}
                      </div>
                    </div>
                  </div>
              </div>

              <Separator />

              {/* Images Section */}
              <div className="space-y-6">
                <div>
                  <h2 className="text-xl font-semibold mb-2">Property Images</h2>
                  <p className="text-sm text-muted-foreground mb-4">
                    Add photos to showcase your property
                  </p>
                </div>
                  <div className="space-y-4">
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                      {form.watch('images').map((image, index) => (
                        <div key={index} className="relative border rounded-lg overflow-hidden">
                          <img
                            src={image.url}
                            alt={image.alt || `Property image ${index + 1}`}
                            className="w-full h-48 object-cover"
                          />
                          <div className="absolute top-2 right-2">
                            <Button
                              type="button"
                              variant="destructive"
                              size="sm"
                              onClick={() => removeImage(index)}
                            >
                              <X className="h-4 w-4" />
                            </Button>
                          </div>
                          {image.caption && (
                            <div className="p-2 bg-black/50 text-white text-sm">
                              {image.caption}
                            </div>
                          )}
                        </div>
                      ))}
                    </div>

                    <Card>
                      <CardHeader>
                        <CardTitle className="text-base">Add New Image</CardTitle>
                      </CardHeader>
                      <CardContent className="space-y-4">
                        <Input
                          className="bg-white"
                          placeholder="Image URL"
                          value={newImage.url}
                          onChange={(e) => setNewImage({ ...newImage, url: e.target.value })}
                        />
                        <Input
                          className="bg-white"
                          placeholder="Alt text (optional)"
                          value={newImage.alt}
                          onChange={(e) => setNewImage({ ...newImage, alt: e.target.value })}
                        />
                        <Input
                          className="bg-white"
                          placeholder="Caption (optional)"
                          value={newImage.caption}
                          onChange={(e) => setNewImage({ ...newImage, caption: e.target.value })}
                        />
                        <Button type="button" onClick={addImage} disabled={!newImage.url.trim()}>
                          <Upload className="h-4 w-4 mr-2" />
                          Add Image
                        </Button>
                      </CardContent>
                    </Card>
                  </div>
              </div>

              <div className="flex justify-end gap-4 pt-6 border-t">
                <Button type="button" variant="outline" asChild>
                  <Link href="/admin/properties">Cancel</Link>
                </Button>
                <Button type="submit" disabled={isPending}>
                  {isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                  {property ? 'Update Property' : 'Create Property'}
                </Button>
              </div>
            </form>
          </Form>
        </CardContent>
      </Card>
    </div>
  );
}