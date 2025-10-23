'use client';

import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { 
  CalendarIcon, 
  UserIcon, 
  MailIcon, 
  DollarSignIcon, 
  UsersIcon, 
  MapPinIcon,
  ExternalLinkIcon,
  PhoneIcon,
  InfoIcon
} from 'lucide-react';
import dayjs from 'dayjs';

interface BookingData {
  id: string;
  checkIn: string;
  checkOut: string;
  status: string;
  totalPrice: number;
  adults: number;
  children: number;
  guest: {
    name: string;
    email: string;
  };
  property?: {
    name: string;
  } | null;
  source?: string;
  metadata?: {
    reservationUrl?: string;
    phoneNumber?: string;
    originalSummary?: string;
    description?: string;
  };
}

interface BookingDetailsDialogProps {
  booking: BookingData | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function BookingDetailsDialog({ booking, open, onOpenChange }: BookingDetailsDialogProps) {
  if (!booking) return null;

  const isAirbnb = booking.source === 'airbnb';
  const checkInDate = dayjs(booking.checkIn);
  const checkOutDate = dayjs(booking.checkOut);
  const duration = checkOutDate.diff(checkInDate, 'day');

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(amount);
  };

  const getStatusColor = (status: string) => {
    switch (status.toLowerCase()) {
      case 'confirmed':
        return 'bg-green-100 text-green-800 border-green-200';
      case 'pending':
        return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'cancelled':
        return 'bg-red-100 text-red-800 border-red-200';
      case 'completed':
        return 'bg-blue-100 text-blue-800 border-blue-200';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <CalendarIcon className="h-5 w-5" />
            Booking Details
            {isAirbnb && (
              <Badge variant="outline" className="bg-orange-50 text-orange-700 border-orange-200">
                Airbnb
              </Badge>
            )}
          </DialogTitle>
          <DialogDescription>
            Complete information for booking #{booking.id}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* Guest Information */}
          <div className="space-y-3">
            <h3 className="text-lg font-semibold flex items-center gap-2">
              <UserIcon className="h-4 w-4" />
              Guest Information
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="flex items-center gap-2">
                <UserIcon className="h-4 w-4 text-muted-foreground" />
                <span className="font-medium">Name:</span>
                <span>{booking.guest.name}</span>
              </div>
              <div className="flex items-center gap-2">
                <MailIcon className="h-4 w-4 text-muted-foreground" />
                <span className="font-medium">Email:</span>
                <span className="text-sm">{booking.guest.email}</span>
              </div>
            </div>
          </div>

          <Separator />

          {/* Booking Details */}
          <div className="space-y-3">
            <h3 className="text-lg font-semibold flex items-center gap-2">
              <CalendarIcon className="h-4 w-4" />
              Booking Details
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <CalendarIcon className="h-4 w-4 text-muted-foreground" />
                  <span className="font-medium">Check-in:</span>
                  <span>{checkInDate.format('MMMM D, YYYY')}</span>
                </div>
                <div className="flex items-center gap-2">
                  <CalendarIcon className="h-4 w-4 text-muted-foreground" />
                  <span className="font-medium">Check-out:</span>
                  <span>{checkOutDate.format('MMMM D, YYYY')}</span>
                </div>
                <div className="flex items-center gap-2">
                  <InfoIcon className="h-4 w-4 text-muted-foreground" />
                  <span className="font-medium">Duration:</span>
                  <span>{duration} night{duration !== 1 ? 's' : ''}</span>
                </div>
              </div>
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <UsersIcon className="h-4 w-4 text-muted-foreground" />
                  <span className="font-medium">Adults:</span>
                  <span>{booking.adults}</span>
                </div>
                <div className="flex items-center gap-2">
                  <UsersIcon className="h-4 w-4 text-muted-foreground" />
                  <span className="font-medium">Children:</span>
                  <span>{booking.children}</span>
                </div>
                <div className="flex items-center gap-2">
                  <UsersIcon className="h-4 w-4 text-muted-foreground" />
                  <span className="font-medium">Total Guests:</span>
                  <span>{booking.adults + booking.children}</span>
                </div>
              </div>
            </div>
          </div>

          <Separator />

          {/* Property & Financial Information */}
          <div className="space-y-3">
            <h3 className="text-lg font-semibold flex items-center gap-2">
              <MapPinIcon className="h-4 w-4" />
              Property & Financial
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <MapPinIcon className="h-4 w-4 text-muted-foreground" />
                  <span className="font-medium">Property:</span>
                  <span>{booking.property?.name || 'Activity Only'}</span>
                </div>
                <div className="flex items-center gap-2">
                  <InfoIcon className="h-4 w-4 text-muted-foreground" />
                  <span className="font-medium">Source:</span>
                  <Badge variant="outline" className={isAirbnb ? 'bg-orange-50 text-orange-700' : 'bg-blue-50 text-blue-700'}>
                    {isAirbnb ? 'Airbnb' : 'Local'}
                  </Badge>
                </div>
              </div>
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <DollarSignIcon className="h-4 w-4 text-muted-foreground" />
                  <span className="font-medium">Total Price:</span>
                  <span className="font-semibold">
                    {booking.totalPrice > 0 ? formatCurrency(booking.totalPrice) : 'N/A'}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <InfoIcon className="h-4 w-4 text-muted-foreground" />
                  <span className="font-medium">Status:</span>
                  <Badge className={getStatusColor(booking.status)}>
                    {booking.status}
                  </Badge>
                </div>
              </div>
            </div>
          </div>

          {/* Airbnb Specific Information */}
          {isAirbnb && booking.metadata && (
            <>
              <Separator />
              <div className="space-y-3">
                <h3 className="text-lg font-semibold flex items-center gap-2">
                  <ExternalLinkIcon className="h-4 w-4" />
                  Airbnb Information
                </h3>
                <div className="space-y-2">
                  {booking.metadata.originalSummary && (
                    <div className="flex items-center gap-2">
                      <InfoIcon className="h-4 w-4 text-muted-foreground" />
                      <span className="font-medium">Original Summary:</span>
                      <span>{booking.metadata.originalSummary}</span>
                    </div>
                  )}
                  {booking.metadata.phoneNumber && (
                    <div className="flex items-center gap-2">
                      <PhoneIcon className="h-4 w-4 text-muted-foreground" />
                      <span className="font-medium">Phone (Last 4 digits):</span>
                      <span>****{booking.metadata.phoneNumber}</span>
                    </div>
                  )}
                  {booking.metadata.reservationUrl && (
                    <div className="flex items-center gap-2">
                      <ExternalLinkIcon className="h-4 w-4 text-muted-foreground" />
                      <span className="font-medium">Reservation URL:</span>
                      <a 
                        href={booking.metadata.reservationUrl} 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="text-blue-600 hover:text-blue-800 underline text-sm break-all"
                      >
                        View on Airbnb
                      </a>
                    </div>
                  )}
                  {booking.metadata.description && (
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <InfoIcon className="h-4 w-4 text-muted-foreground" />
                        <span className="font-medium">Description:</span>
                      </div>
                      <div className="bg-gray-50 p-3 rounded-md text-sm whitespace-pre-wrap">
                        {booking.metadata.description}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </>
          )}

          {/* Booking ID */}
          <Separator />
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <InfoIcon className="h-4 w-4" />
              <span className="font-medium">Booking ID:</span>
              <span className="font-mono">{booking.id}</span>
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button onClick={() => onOpenChange(false)} className="w-full">
            OK
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}