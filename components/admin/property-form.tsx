'use client';

import React, { useState, useTransition, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import * as z from 'zod';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Separator } from '@/components/ui/separator';
import { toast } from 'sonner';
import { Loader2, Plus, X, Upload, MapPin } from 'lucide-react';
import { PropertyType, PropertyStatus } from '@prisma/client';
import { createProperty, updateProperty } from '@/lib/actions/property-actions';
import prisma from '@/lib/prisma';

// Fetch amenities function
async function getAmenities() {
  return await prisma.amenity.findMany({
    orderBy: {
      name: 'asc',
    },
  });
}

const propertyFormSchema = z.object({
  name: z.string().min(1, 'Property name is required').max(100, 'Name too long'),
  type: z.enum(['COTTAGE', 'CABIN']),
  description: z.string().min(10, 'Description must be at least 10 characters'),
  maxOccupancy: z.number().min(1, 'Must accommodate at least 1 person').max(20, 'Maximum 20 people'),
  basePrice: z.number().min(1, 'Base price must be greater than 0'),
  status: z.enum(['ACTIVE', 'INACTIVE', 'MAINTENANCE']),
  location: z.object({
    address: z.string().min(1, 'Address is required'),
    city: z.string().min(1, 'City is required'),
    country: z.string().min(1, 'Country is required'),
    latitude: z.number().optional(),
    longitude: z.number().optional(),
  }),
  policies: z.object({
    checkIn: z.string().min(1, 'Check-in time is required'),
    checkOut: z.string().min(1, 'Check-out time is required'),
    cancellation: z.string().min(1, 'Cancellation policy is required'),
    smoking: z.boolean().default(false),
    pets: z.boolean().default(false),
    parties: z.boolean().default(false),
  }),
  rules: z.array(z.string()).default([]),
  amenityIds: z.array(z.string()).default([]),
  images: z.array(z.object({
    url: z.string().url('Invalid image URL'),
    alt: z.string().optional(),
    caption: z.string().optional(),
  })).default([]),
});

type PropertyFormValues = z.infer<typeof propertyFormSchema>;

interface PropertyFormProps {
  children: React.ReactNode;
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

export function PropertyForm({ children, property }: PropertyFormProps) {
  const [open, setOpen] = useState(false);
  const [isPending, startTransition] = useTransition();
  const [newRule, setNewRule] = useState('');
  const [newImage, setNewImage] = useState({ url: '', alt: '', caption: '' });
  const [amenities, setAmenities] = useState<any[]>([]);
  const [loadingAmenities, setLoadingAmenities] = useState(true);
  const router = useRouter();

  const form = useForm<PropertyFormValues>({
    resolver: zodResolver(propertyFormSchema),
    defaultValues: property ? {
      name: property.name,
      type: property.type,
      description: property.description,
      maxOccupancy: property.maxOccupancy,
      basePrice: property.basePrice.toNumber(),
      status: property.status,
      location: property.location,
      policies: {
        // Provide default values for missing checkIn/checkOut fields
        checkIn: property.policies?.checkIn || '15:00',
        checkOut: property.policies?.checkOut || '11:00',
        cancellation: property.policies?.cancellation || 'Free cancellation up to 24 hours before check-in',
        smoking: property.policies?.smoking || false,
        pets: property.policies?.pets || false,
        parties: property.policies?.parties || false,
      },
      rules: property.rules || [],
      amenityIds: property.amenities?.map((a: any) => a.amenityId) || [],
      images: property.images?.map((img: any) => ({
        url: img.url,
        alt: img.alt || '',
        caption: img.caption || '',
      })) || [],
    } : defaultValues,
  });

  // Fetch amenities on component mount
  useEffect(() => {
    async function fetchAmenities() {
      try {
        const response = await fetch('/api/amenities');
        if (response.ok) {
          const data = await response.json();
          setAmenities(data);
        }
      } catch (error) {
        console.error('Failed to fetch amenities:', error);
      } finally {
        setLoadingAmenities(false);
      }
    }
    fetchAmenities();
  }, []);

  const onSubmit = async (data: PropertyFormValues) => {
    startTransition(async () => {
      try {
        if (property) {
          await updateProperty(property.id, data);
          toast.success('Property updated successfully!');
        } else {
          await createProperty(data);
          toast.success('Property created successfully!');
        }
        setOpen(false);
        form.reset();
        router.refresh();
      } catch (error) {
        console.error('Error saving property:', error);
        toast.error('Failed to save property. Please try again.');
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

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {children}
      </DialogTrigger>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {property ? 'Edit Property' : 'Add New Property'}
          </DialogTitle>
          <DialogDescription>
            {property ? 'Update property details and settings.' : 'Create a new property listing with all necessary details.'}
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            <Tabs defaultValue="basic" className="w-full">
              <TabsList className="grid w-full grid-cols-5">
                <TabsTrigger value="basic">Basic Info</TabsTrigger>
                <TabsTrigger value="location">Location</TabsTrigger>
                <TabsTrigger value="amenities">Amenities</TabsTrigger>
                <TabsTrigger value="policies">Policies</TabsTrigger>
                <TabsTrigger value="images">Images</TabsTrigger>
              </TabsList>

              <TabsContent value="basic" className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="name"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Property Name</FormLabel>
                        <FormControl>
                          <Input className="bg-white" placeholder="Beautiful Cottage" {...field} />
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
                              <SelectValue placeholder="Select type" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="COTTAGE">Cottage</SelectItem>
                            <SelectItem value="CABIN">Cabin</SelectItem>
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
                        placeholder="Describe the property, its features, and what makes it special..."
                        className="bg-white min-h-[100px]"
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
                            min="1"
                            max="20"
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
                        <FormLabel>Base Price (USD/night)</FormLabel>
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
              </TabsContent>

              <TabsContent value="location" className="space-y-4">
                <FormField
                  control={form.control}
                  name="location.address"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Address</FormLabel>
                      <FormControl>
                        <Input className="bg-white" placeholder="123 Main Street" {...field} />
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
                          <Input className="bg-white" placeholder="Harare" {...field} />
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
                          <Input className="bg-white" placeholder="Zimbabwe" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="location.latitude"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Latitude (Optional)</FormLabel>
                        <FormControl>
                          <Input
                            className="bg-white"
                            type="number"
                            step="any"
                            placeholder="-17.8252"
                            {...field}
                            onChange={(e) => field.onChange(e.target.value ? parseFloat(e.target.value) : undefined)}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="location.longitude"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Longitude (Optional)</FormLabel>
                        <FormControl>
                          <Input
                            className="bg-white"
                            type="number"
                            step="any"
                            placeholder="31.0335"
                            {...field}
                            onChange={(e) => field.onChange(e.target.value ? parseFloat(e.target.value) : undefined)}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
              </TabsContent>

              <TabsContent value="amenities" className="space-y-4">
                <FormField
                  control={form.control}
                  name="amenityIds"
                  render={() => (
                    <FormItem>
                      <FormLabel>Select Amenities</FormLabel>
                      {loadingAmenities ? (
                        <div className="flex items-center justify-center p-4">
                          <Loader2 className="h-6 w-6 animate-spin" />
                          <span className="ml-2">Loading amenities...</span>
                        </div>
                      ) : (
                        <div className="grid grid-cols-3 gap-3">
                          {(amenities.length > 0 ? amenities : availableAmenities).map((amenity) => (
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
                                              )
                                        }}
                                      />
                                    </FormControl>
                                    <FormLabel className="text-sm font-normal">
                                      {amenity.icon || '📋'} {amenity.name}
                                    </FormLabel>
                                  </FormItem>
                                )
                              }}
                            />
                          ))}
                        </div>
                      )}
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </TabsContent>

              <TabsContent value="policies" className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="policies.checkIn"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Check-in Time</FormLabel>
                        <FormControl>
                          <Input 
                            type="time" 
                            step="1" 
                            className="bg-white appearance-none [&::-webkit-calendar-picker-indicator]:hidden [&::-webkit-calendar-picker-indicator]:appearance-none" 
                            placeholder="15:00" 
                            {...field} 
                          />
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
                          <Input 
                            type="time" 
                            step="1" 
                            className="bg-white appearance-none [&::-webkit-calendar-picker-indicator]:hidden [&::-webkit-calendar-picker-indicator]:appearance-none" 
                            placeholder="11:00" 
                            {...field} 
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <FormField
                  control={form.control}
                  name="policies.cancellation"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Cancellation Policy</FormLabel>
                      <FormControl>
                        <Textarea
                          className="bg-white"
                          placeholder="Free cancellation up to 24 hours before check-in"
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <div className="space-y-3">
                  <Label>Property Policies</Label>
                  <div className="grid grid-cols-3 gap-4">
                    <FormField
                      control={form.control}
                      name="policies.smoking"
                      render={({ field }) => (
                        <FormItem className="flex flex-row items-center space-x-3 space-y-0">
                          <FormControl>
                            <Checkbox
                              className="bg-white"
                              checked={field.value}
                              onCheckedChange={field.onChange}
                            />
                          </FormControl>
                          <FormLabel>Smoking Allowed</FormLabel>
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="policies.pets"
                      render={({ field }) => (
                        <FormItem className="flex flex-row items-center space-x-3 space-y-0">
                          <FormControl>
                            <Checkbox
                              className="bg-white"
                              checked={field.value}
                              onCheckedChange={field.onChange}
                            />
                          </FormControl>
                          <FormLabel>Pets Allowed</FormLabel>
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="policies.parties"
                      render={({ field }) => (
                        <FormItem className="flex flex-row items-center space-x-3 space-y-0">
                          <FormControl>
                            <Checkbox
                              className="bg-white"
                              checked={field.value}
                              onCheckedChange={field.onChange}
                            />
                          </FormControl>
                          <FormLabel>Parties/Events Allowed</FormLabel>
                        </FormItem>
                      )}
                    />
                  </div>
                </div>

                <Separator />

                <div className="space-y-3">
                  <Label>Property Rules</Label>
                  <div className="space-y-2">
                    {form.watch('rules').map((rule, index) => (
                      <div key={index} className="flex items-center gap-2">
                        <Badge variant="secondary" className="flex-1 justify-start">
                          {rule}
                        </Badge>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => removeRule(index)}
                        >
                          <X className="h-3 w-3" />
                        </Button>
                      </div>
                    ))}
                  </div>
                  <div className="flex gap-2">
                    <Input
                      className="bg-white"
                      placeholder="Add a custom rule"
                      value={newRule}
                      onChange={(e) => setNewRule(e.target.value)}
                      onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), addRule())}
                    />
                    <Button type="button" onClick={addRule}>
                      <Plus className="h-4 w-4" />
                    </Button>
                  </div>
                  <div className="space-y-2">
                    <Label className="text-sm text-muted-foreground">Common Rules (click to add):</Label>
                    <div className="flex flex-wrap gap-2">
                      {commonRules.map((rule, index) => (
                        <Button
                          key={index}
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => addCommonRule(rule)}
                          disabled={form.watch('rules').includes(rule)}
                        >
                          {rule}
                        </Button>
                      ))}
                    </div>
                  </div>
                </div>
              </TabsContent>

              <TabsContent value="images" className="space-y-4">
                <div className="space-y-3">
                  <Label>Property Images</Label>
                  <div className="grid grid-cols-2 gap-4">
                    {form.watch('images').map((image, index) => (
                      <Card key={index}>
                        <CardContent className="p-4">
                          <div className="space-y-2">
                            <div className="flex items-center justify-between">
                              <Label className="text-sm font-medium">Image {index + 1}</Label>
                              <Button
                                type="button"
                                variant="ghost"
                                size="sm"
                                onClick={() => removeImage(index)}
                              >
                                <X className="h-3 w-3" />
                              </Button>
                            </div>
                            <div className="text-sm text-muted-foreground break-all">
                              {image.url}
                            </div>
                            {image.alt && (
                              <div className="text-sm">
                                <span className="font-medium">Alt:</span> {image.alt}
                              </div>
                            )}
                            {image.caption && (
                              <div className="text-sm">
                                <span className="font-medium">Caption:</span> {image.caption}
                              </div>
                            )}
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-sm">Add New Image</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-3">
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
              </TabsContent>
            </Tabs>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={isPending}>
                {isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                {property ? 'Update Property' : 'Create Property'}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}