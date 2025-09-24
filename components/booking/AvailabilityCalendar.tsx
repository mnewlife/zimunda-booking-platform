'use client';

import { useState, useEffect } from 'react';
import { Calendar } from '@/components/ui/calendar';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { CalendarIcon, DollarSign, Info } from 'lucide-react';
import { cn, formatCurrency } from '@/lib/utils';
import { addDays, differenceInDays, isBefore, isAfter, isEqual, format } from 'date-fns';

interface AvailabilityData {
  date: string;
  available: boolean;
  price: number;
  reason?: string; // For blocked dates
}

interface AvailabilityCalendarProps {
  propertyId?: string;
  activityId?: string;
  basePrice: number;
  minimumStay?: number;
  onDateRangeSelect?: (checkIn: Date | null, checkOut: Date | null) => void;
  selectedCheckIn?: Date | null;
  selectedCheckOut?: Date | null;
  className?: string;
}

export function AvailabilityCalendar({
  propertyId,
  activityId,
  basePrice,
  minimumStay = 1,
  onDateRangeSelect,
  selectedCheckIn,
  selectedCheckOut,
  className
}: AvailabilityCalendarProps) {
  const [availability, setAvailability] = useState<AvailabilityData[]>([]);
  const [loading, setLoading] = useState(false);
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [selectingCheckOut, setSelectingCheckOut] = useState(false);

  // Fetch availability data for the current month
  const fetchAvailability = async (month: Date) => {
    if (!propertyId && !activityId) return;
    
    setLoading(true);
    try {
      const startDate = new Date(month.getFullYear(), month.getMonth(), 1);
      const endDate = new Date(month.getFullYear(), month.getMonth() + 1, 0);
      
      const params = new URLSearchParams({
        startDate: startDate.toISOString(),
        endDate: endDate.toISOString(),
        ...(propertyId && { propertyId }),
        ...(activityId && { activityId })
      });

      const response = await fetch(`/api/availability?${params}`);
      if (response.ok) {
        const data = await response.json();
        setAvailability(data.availability || []);
      }
    } catch (error) {
      console.error('Failed to fetch availability:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAvailability(currentMonth);
  }, [currentMonth, propertyId, activityId]);

  // Get availability for a specific date
  const getDateAvailability = (date: Date): AvailabilityData | null => {
    const dateStr = format(date, 'yyyy-MM-dd');
    return availability.find(a => a.date === dateStr) || null;
  };

  // Check if date is disabled
  const isDateDisabled = (date: Date): boolean => {
    if (isBefore(date, new Date())) return true;
    
    const dateAvailability = getDateAvailability(date);
    if (dateAvailability && !dateAvailability.available) return true;
    
    return false;
  };

  // Handle date selection
  const handleDateSelect = (date: Date | undefined) => {
    if (!date || isDateDisabled(date)) return;

    if (!selectedCheckIn || selectingCheckOut) {
      // Selecting check-in date or check-out date
      if (!selectedCheckIn) {
        onDateRangeSelect?.(date, null);
        setSelectingCheckOut(true);
      } else {
        // Selecting check-out date
        if (isBefore(date, selectedCheckIn)) {
          // If selected date is before check-in, make it the new check-in
          onDateRangeSelect?.(date, null);
          setSelectingCheckOut(true);
        } else {
          // Check minimum stay requirement
          const nights = differenceInDays(date, selectedCheckIn);
          if (nights < minimumStay) {
            // Auto-adjust to minimum stay
            const adjustedCheckOut = addDays(selectedCheckIn, minimumStay);
            onDateRangeSelect?.(selectedCheckIn, adjustedCheckOut);
          } else {
            onDateRangeSelect?.(selectedCheckIn, date);
          }
          setSelectingCheckOut(false);
        }
      }
    } else {
      // Reset selection
      onDateRangeSelect?.(date, null);
      setSelectingCheckOut(true);
    }
  };

  // Get date styling based on availability
  const getDateClassName = (date: Date): string => {
    const dateAvailability = getDateAvailability(date);
    const isSelected = selectedCheckIn && isEqual(date, selectedCheckIn);
    const isInRange = selectedCheckIn && selectedCheckOut && 
      isAfter(date, selectedCheckIn) && isBefore(date, selectedCheckOut);
    const isCheckOut = selectedCheckOut && isEqual(date, selectedCheckOut);

    if (isSelected || isCheckOut) {
      return 'bg-green-600 text-white hover:bg-green-700';
    }
    
    if (isInRange) {
      return 'bg-green-100 text-green-800';
    }

    if (isDateDisabled(date)) {
      return 'bg-gray-200 text-gray-400 cursor-not-allowed';
    }

    if (dateAvailability) {
      if (dateAvailability.available) {
        return 'bg-green-50 text-green-700 hover:bg-green-100 border-green-200';
      } else {
        return 'bg-red-50 text-red-700 border-red-200';
      }
    }

    return 'hover:bg-gray-50';
  };

  // Calculate total price for selected range
  const calculateTotalPrice = (): number => {
    if (!selectedCheckIn || !selectedCheckOut) return 0;
    
    const nights = differenceInDays(selectedCheckOut, selectedCheckIn);
    let total = 0;
    
    for (let i = 0; i < nights; i++) {
      const currentDate = addDays(selectedCheckIn, i);
      const dateAvailability = getDateAvailability(currentDate);
      total += dateAvailability?.price || basePrice;
    }
    
    return total;
  };

  const totalPrice = calculateTotalPrice();
  const nights = selectedCheckIn && selectedCheckOut ? 
    differenceInDays(selectedCheckOut, selectedCheckIn) : 0;

  return (
    <Card className={cn('w-full p-0 border-none shadow-none', className)}>
      <CardHeader>
        <CardTitle className="flex items-center space-x-2">
          <CalendarIcon className="h-5 w-5" />
          <span>Select Dates</span>
        </CardTitle>
        {minimumStay > 1 && (
          <p className="text-sm text-gray-600">
            Minimum stay: {minimumStay} night{minimumStay > 1 ? 's' : ''}
          </p>
        )}
      </CardHeader>
      
      <CardContent className="space-y-4">
        {/* Calendar */}
        <div className="relative">
          {loading && (
            <div className="absolute inset-0 bg-white/50 flex items-center justify-center z-10">
              <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-green-600"></div>
            </div>
          )}
          
          <Calendar
            mode="single"
            selected={selectedCheckIn || undefined}
            onSelect={handleDateSelect}
            disabled={isDateDisabled}
            onMonthChange={setCurrentMonth}
            className="rounded-md border bg-white [[data-slot=card-content]_&]:bg-white [[data-slot=popover-content]_&]:bg-white"
            modifiers={{
              available: (date) => {
                const dateAvailability = getDateAvailability(date);
                return dateAvailability?.available || false;
              },
              booked: (date) => {
                const dateAvailability = getDateAvailability(date);
                return dateAvailability ? !dateAvailability.available : false;
              },
              selected_range: (date) => {
                if (!selectedCheckIn || !selectedCheckOut) return false;
                return isAfter(date, selectedCheckIn) && isBefore(date, selectedCheckOut);
              }
            }}
            modifiersClassNames={{
              available: 'bg-white text-green-700',
              booked: 'bg-red-500 text-red-700 line-through',
              selected_range: 'bg-green-100 text-green-800'
            }}
          />
        </div>

        {/* Legend */}
        <div className="flex flex-wrap gap-4 text-xs">
          <div className="flex items-center space-x-1">
            <div className="w-3 h-3 bg-white border border-gray-800 rounded"></div>
            <span>Available</span>
          </div>
          <div className="flex items-center space-x-1">
            <div className="w-3 h-3 bg-red-50 border border-red-200 rounded"></div>
            <span>Booked</span>
          </div>
          <div className="flex items-center space-x-1">
            <div className="w-3 h-3 bg-gray-200 rounded"></div>
            <span>Blocked</span>
          </div>
          <div className="flex items-center space-x-1">
            <div className="w-3 h-3 bg-green-600 rounded"></div>
            <span>Selected</span>
          </div>
        </div>

        {/* Selected dates summary */}
        {selectedCheckIn && (
          <div className="bg-gray-50 p-4 rounded-lg space-y-2">
            <div className="flex justify-between items-center">
              <span className="font-medium">Check-in:</span>
              <span>{format(selectedCheckIn, 'MMM dd, yyyy')}</span>
            </div>
            
            {selectedCheckOut && (
              <>
                <div className="flex justify-between items-center">
                  <span className="font-medium">Check-out:</span>
                  <span>{format(selectedCheckOut, 'MMM dd, yyyy')}</span>
                </div>
                
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-600">
                    Selected: {nights} night{nights > 1 ? 's' : ''}
                  </span>
                  {/*<span className="font-bold text-green-600">
                    {formatCurrency(totalPrice)}
                  </span>*/}
                </div>
                
                {/*<div className="text-sm text-gray-600">
                  Average: {formatCurrency(totalPrice / nights)} per night
                </div>*/}
              </>
            )}
            
            {!selectedCheckOut && selectingCheckOut && (
              <div className="text-sm text-gray-600 flex items-center space-x-1">
                <Info className="h-4 w-4" />
                <span>Select check-out date</span>
              </div>
            )}
          </div>
        )}

        {/* Clear selection button */}
        {selectedCheckIn && (
          <Button 
            variant="outline" 
            size="sm" 
            onClick={() => {
              onDateRangeSelect?.(null, null);
              setSelectingCheckOut(false);
            }}
            className="w-full"
          >
            Clear Selection
          </Button>
        )}
      </CardContent>
    </Card>
  );
}