'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
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
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { toast } from 'sonner';
import { Loader2 } from 'lucide-react';

const amenitySchema = z.object({
  name: z.string().min(1, 'Name is required').max(100, 'Name must be less than 100 characters'),
  description: z.string().optional(),
  category: z.string().min(1, 'Category is required'),
  icon: z.string().optional(),
  isActive: z.boolean().default(true),
});

type AmenityFormData = z.infer<typeof amenitySchema>;

interface AmenityFormProps {
  amenity?: {
    id: string;
    name: string;
    description: string | null;
    category: string;
    icon: string | null;
    isActive: boolean;
  };
}

const AMENITY_CATEGORIES = [
  'BASIC',
  'ENTERTAINMENT',
  'KITCHEN',
  'BATHROOM',
  'OUTDOOR',
  'WELLNESS',
  'BUSINESS',
  'FAMILY',
  'ACCESSIBILITY',
  'SAFETY',
  'OTHER',
];

const COMMON_ICONS = [
  { value: '🏊', label: 'Swimming Pool' },
  { value: '🅿️', label: 'Parking' },
  { value: '📶', label: 'WiFi' },
  { value: '❄️', label: 'Air Conditioning' },
  { value: '🔥', label: 'Heating' },
  { value: '📺', label: 'TV' },
  { value: '🍳', label: 'Kitchen' },
  { value: '🧺', label: 'Laundry' },
  { value: '🏋️', label: 'Gym' },
  { value: '🌿', label: 'Garden' },
  { value: '🔒', label: 'Security' },
  { value: '🐕', label: 'Pet Friendly' },
  { value: '♿', label: 'Accessible' },
  { value: '🚗', label: 'Car Rental' },
  { value: '🍽️', label: 'Restaurant' },
  { value: '☕', label: 'Coffee' },
  { value: '🛁', label: 'Bathtub' },
  { value: '🚿', label: 'Shower' },
  { value: '🧴', label: 'Toiletries' },
  { value: '🔌', label: 'Power Outlets' },
];

export function AmenityForm({ amenity }: AmenityFormProps) {
  const [isLoading, setIsLoading] = useState(false);
  const router = useRouter();
  const isEditing = !!amenity;

  const form = useForm<AmenityFormData>({
    resolver: zodResolver(amenitySchema),
    defaultValues: {
      name: amenity?.name || '',
      description: amenity?.description || '',
      category: amenity?.category || '',
      icon: amenity?.icon || '',
      isActive: amenity?.isActive ?? true,
    },
  });

  const onSubmit = async (data: AmenityFormData) => {
    setIsLoading(true);
    try {
      const url = isEditing ? `/api/amenities/${amenity.id}` : '/api/amenities';
      const method = isEditing ? 'PUT' : 'POST';
      
      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(data),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Something went wrong');
      }

      toast.success(
        isEditing ? 'Amenity updated successfully!' : 'Amenity created successfully!'
      );
      
      router.push('/admin/amenities');
      router.refresh();
    } catch (error) {
      console.error('Error saving amenity:', error);
      toast.error(
        error instanceof Error ? error.message : 'Failed to save amenity'
      );
    } finally {
      setIsLoading(false);
    }
  };

  const formatCategoryName = (category: string) => {
    return category
      .split('_')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
      .join(' ');
  };

  return (
    <Card className="max-w-2xl">
      <CardHeader>
        <CardTitle>
          {isEditing ? 'Edit Amenity' : 'Create New Amenity'}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            <div className="grid gap-4 md:grid-cols-2">
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Name *</FormLabel>
                    <FormControl>
                      <Input
                        placeholder="e.g., Swimming Pool"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <FormField
                control={form.control}
                name="category"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Category *</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select category" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {AMENITY_CATEGORIES.map((category) => (
                          <SelectItem key={category} value={category}>
                            {formatCategoryName(category)}
                          </SelectItem>
                        ))}
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
                      placeholder="Describe the amenity..."
                      className="min-h-[100px]"
                      {...field}
                    />
                  </FormControl>
                  <FormDescription>
                    Provide details about this amenity
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid gap-4 md:grid-cols-2">
              <FormField
                control={form.control}
                name="icon"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Icon</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select an icon" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="">No icon</SelectItem>
                        {COMMON_ICONS.map((icon) => (
                          <SelectItem key={icon.value} value={icon.value}>
                            <div className="flex items-center gap-2">
                              <span>{icon.value}</span>
                              <span>{icon.label}</span>
                            </div>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormDescription>
                      Choose an emoji icon for this amenity
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="isActive"
                render={({ field }) => (
                  <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                    <div className="space-y-0.5">
                      <FormLabel className="text-base">Active Status</FormLabel>
                      <FormDescription>
                        Make this amenity available for properties
                      </FormDescription>
                    </div>
                    <FormControl>
                      <Switch
                        checked={field.value}
                        onCheckedChange={field.onChange}
                      />
                    </FormControl>
                  </FormItem>
                )}
              />
            </div>

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
                {isEditing ? 'Update Amenity' : 'Create Amenity'}
              </Button>
            </div>
          </form>
        </Form>
      </CardContent>
    </Card>
  );
}