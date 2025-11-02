'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import * as z from 'zod';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { X, Plus, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { ActivityType } from '@prisma/client';

const activityFormSchema = z.object({
  name: z.string().min(1, 'Activity name is required').max(100, 'Name too long'),
  type: z.nativeEnum(ActivityType),
  description: z.string().min(10, 'Description must be at least 10 characters'),
  duration: z.number().min(15, 'Duration must be at least 15 minutes').max(1440, 'Duration cannot exceed 24 hours'),
  price: z.number().min(0, 'Price must be positive'),
  capacity: z.number().min(1, 'Capacity must be at least 1').max(100, 'Capacity cannot exceed 100'),
  maxParticipants: z.number().min(1, 'Max participants must be at least 1').max(100, 'Max participants cannot exceed 100'),
  location: z.string().min(1, 'Location is required').max(200, 'Location too long'),
  bookable: z.boolean(),
  requirements: z.array(z.string()).optional(),
  availability: z.object({
    days: z.array(z.string()),
    timeSlots: z.array(z.object({
      start: z.string(),
      end: z.string()
    }))
  })
});

type ActivityFormValues = z.infer<typeof activityFormSchema>;

interface ActivityFormProps {
  initialData?: Partial<ActivityFormValues> & { id?: string; bookable?: boolean };
  isEditing?: boolean;
}

const ACTIVITY_TYPES = [
  { value: 'COFFEE_TOUR', label: 'Coffee Tour' },
  { value: 'POOL_BOOKING', label: 'Pool Booking' },
  { value: 'HIKING', label: 'Hiking' },
  { value: 'BIRD_WATCHING', label: 'Bird Watching' },
  { value: 'MASSAGE', label: 'Massage' },
  { value: 'OTHER', label: 'Other' },
];

const DAYS_OF_WEEK = [
  'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'
];

export function ActivityForm({ initialData, isEditing = false }: ActivityFormProps) {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [requirements, setRequirements] = useState<string[]>(initialData?.requirements || []);
  const [newRequirement, setNewRequirement] = useState('');
  const [selectedDays, setSelectedDays] = useState<string[]>(initialData?.availability?.days || []);
  const [timeSlots, setTimeSlots] = useState(initialData?.availability?.timeSlots || [{ start: '09:00', end: '17:00' }]);

  const form = useForm<ActivityFormValues>({
    resolver: zodResolver(activityFormSchema),
    defaultValues: {
      name: initialData?.name || '',
      type: initialData?.type || 'OTHER',
      description: initialData?.description || '',
      duration: initialData?.duration || 60,
      price: initialData?.price || 0,
      capacity: initialData?.capacity || 10,
      maxParticipants: (initialData as any)?.maxParticipants || 10,
      location: (initialData as any)?.location || '',
      bookable: initialData?.bookable ?? true,
      requirements: requirements,
      availability: {
        days: selectedDays,
        timeSlots: timeSlots
      }
    },
  });

  const addRequirement = () => {
    if (newRequirement.trim() && !requirements.includes(newRequirement.trim())) {
      const updatedRequirements = [...requirements, newRequirement.trim()];
      setRequirements(updatedRequirements);
      form.setValue('requirements', updatedRequirements);
      setNewRequirement('');
    }
  };

  const removeRequirement = (requirement: string) => {
    const updatedRequirements = requirements.filter(r => r !== requirement);
    setRequirements(updatedRequirements);
    form.setValue('requirements', updatedRequirements);
  };

  const toggleDay = (day: string) => {
    const updatedDays = selectedDays.includes(day)
      ? selectedDays.filter(d => d !== day)
      : [...selectedDays, day];
    setSelectedDays(updatedDays);
    form.setValue('availability.days', updatedDays);
  };

  const addTimeSlot = () => {
    const newTimeSlots = [...timeSlots, { start: '09:00', end: '17:00' }];
    setTimeSlots(newTimeSlots);
    form.setValue('availability.timeSlots', newTimeSlots);
  };

  const removeTimeSlot = (index: number) => {
    const newTimeSlots = timeSlots.filter((_, i) => i !== index);
    setTimeSlots(newTimeSlots);
    form.setValue('availability.timeSlots', newTimeSlots);
  };

  const updateTimeSlot = (index: number, field: 'start' | 'end', value: string) => {
    const newTimeSlots = timeSlots.map((slot, i) => 
      i === index ? { ...slot, [field]: value } : slot
    );
    setTimeSlots(newTimeSlots);
    form.setValue('availability.timeSlots', newTimeSlots);
  };

  const onSubmit = async (data: ActivityFormValues) => {
    setIsLoading(true);
    try {
      const url = isEditing ? `/api/activities/${initialData?.id}` : '/api/activities';
      const method = isEditing ? 'PUT' : 'POST';
      
      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ...data,
          requirements,
          availability: {
            days: selectedDays,
            timeSlots
          }
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to save activity');
      }

      toast.success(isEditing ? 'Activity updated successfully' : 'Activity created successfully');
      router.push('/admin/activities');
      router.refresh();
    } catch (error) {
      console.error('Error saving activity:', error);
      toast.error('Failed to save activity. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        <div className="grid gap-6 md:grid-cols-2">
          {/* Basic Information */}
          <Card>
            <CardHeader>
              <CardTitle>Basic Information</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Activity Name</FormLabel>
                    <FormControl>
                      <Input placeholder="e.g., Coffee Farm Tour" className="bg-white" {...field} />
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
                    <FormLabel>Activity Type</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger className="bg-white">
                          <SelectValue placeholder="Select activity type" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {ACTIVITY_TYPES.map((type) => (
                          <SelectItem key={type.value} value={type.value}>
                            {type.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="description"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Description</FormLabel>
                    <FormControl>
                      <Textarea
                        placeholder="Describe the activity experience..."
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

          {/* Pricing & Capacity */}
          <Card>
            <CardHeader>
              <CardTitle>Pricing & Capacity</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <FormField
                control={form.control}
                name="duration"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Duration (minutes)</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        placeholder="60"
                        className="bg-white"
                        {...field}
                        onChange={(e) => field.onChange(parseInt(e.target.value) || 0)}
                      />
                    </FormControl>
                    <FormDescription>
                      Duration in minutes (e.g., 60 for 1 hour)
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="price"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Price ($)</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        step="0.01"
                        placeholder="25.00"
                        className="bg-white"
                        {...field}
                        onChange={(e) => field.onChange(parseFloat(e.target.value) || 0)}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="capacity"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Maximum Capacity</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        placeholder="10"
                        className="bg-white"
                        {...field}
                        onChange={(e) => field.onChange(parseInt(e.target.value) || 0)}
                      />
                    </FormControl>
                    <FormDescription>
                      Maximum number of participants
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="maxParticipants"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Max Participants per Booking</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        placeholder="10"
                        className="bg-white"
                        {...field}
                        onChange={(e) => field.onChange(parseInt(e.target.value) || 0)}
                      />
                    </FormControl>
                    <FormDescription>
                      Maximum participants allowed per single booking
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="location"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Location</FormLabel>
                    <FormControl>
                      <Input
                        placeholder="e.g., Coffee Farm, Main Lodge"
                        className="bg-white"
                        {...field}
                      />
                    </FormControl>
                    <FormDescription>
                      Where this activity takes place
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="bookable"
                render={({ field }) => (
                  <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                    <div className="space-y-0.5">
                      <FormLabel className="text-base">
                        Allow Booking
                      </FormLabel>
                      <FormDescription>
                        Enable customers to book this activity online
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
            </CardContent>
          </Card>
        </div>

        {/* Requirements */}
        <Card>
          <CardHeader>
            <CardTitle>Requirements</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex gap-2">
              <Input
                placeholder="Add a requirement (e.g., Comfortable walking shoes)"
                value={newRequirement}
                className="bg-white"
                onChange={(e) => setNewRequirement(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), addRequirement())}
              />
              <Button type="button" onClick={addRequirement} variant="outline">
                <Plus className="h-4 w-4" />
              </Button>
            </div>
            <div className="flex flex-wrap gap-2">
              {requirements.map((requirement, index) => (
                <Badge key={index} variant="secondary" className="flex items-center gap-1">
                  {requirement}
                  <X
                    className="h-3 w-3 cursor-pointer"
                    onClick={() => removeRequirement(requirement)}
                  />
                </Badge>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Availability */}
        <Card>
          <CardHeader>
            <CardTitle>Availability</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <FormLabel>Available Days</FormLabel>
              <div className="flex flex-wrap gap-2 mt-2">
                {DAYS_OF_WEEK.map((day) => (
                  <Badge
                    key={day}
                    variant={selectedDays.includes(day) ? "default" : "outline"}
                    className="cursor-pointer"
                    onClick={() => toggleDay(day)}
                  >
                    {day}
                  </Badge>
                ))}
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between mb-2">
                <FormLabel>Time Slots</FormLabel>
                <Button type="button" onClick={addTimeSlot} variant="outline" size="sm">
                  <Plus className="h-4 w-4 mr-1" />
                  Add Slot
                </Button>
              </div>
              <div className="space-y-2">
                {timeSlots.map((slot, index) => (
                  <div key={index} className="flex items-center gap-2">
                    <Input
                      type="time"
                      value={slot.start}
                      className="bg-white"
                      onChange={(e) => updateTimeSlot(index, 'start', e.target.value)}
                    />
                    <span>to</span>
                    <Input
                      type="time"
                      value={slot.end}
                      className="bg-white"
                      onChange={(e) => updateTimeSlot(index, 'end', e.target.value)}
                    />
                    {timeSlots.length > 1 && (
                      <Button
                        type="button"
                        onClick={() => removeTimeSlot(index)}
                        variant="outline"
                        size="sm"
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Submit Buttons */}
        <div className="flex items-center justify-end space-x-2">
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
            {isEditing ? 'Update Activity' : 'Create Activity'}
          </Button>
        </div>
      </form>
    </Form>
  );
}