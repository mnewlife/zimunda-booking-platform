import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { format, eachDayOfInterval, parseISO } from 'date-fns';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');
    const propertyId = searchParams.get('propertyId');
    const activityId = searchParams.get('activityId');

    if (!startDate || !endDate) {
      return NextResponse.json(
        { error: 'Start date and end date are required' },
        { status: 400 }
      );
    }

    if (!propertyId && !activityId) {
      return NextResponse.json(
        { error: 'Either propertyId or activityId is required' },
        { status: 400 }
      );
    }

    const start = parseISO(startDate);
    const end = parseISO(endDate);
    
    // Generate all dates in the range
    const dateRange = eachDayOfInterval({ start, end });
    
    let availability = [];

    if (propertyId) {
      // Check property availability
      const property = await prisma.property.findUnique({
        where: { id: propertyId },
        select: { basePrice: true, status: true }
      });

      if (!property || property.status !== 'ACTIVE') {
        return NextResponse.json(
          { error: 'Property not found or inactive' },
          { status: 404 }
        );
      }

      // Get all bookings for this property in the date range
      const bookings = await prisma.booking.findMany({
        where: {
          propertyId,
          status: { in: ['CONFIRMED', 'PENDING'] },
          OR: [
            {
              checkIn: { lte: end },
              checkOut: { gt: start }
            }
          ]
        },
        select: {
          checkIn: true,
          checkOut: true,
          status: true
        }
      });

      // Get blocked dates for this property
      const blockedDates = await prisma.blockedDate.findMany({
        where: {
          propertyId,
          date: {
            gte: start,
            lte: end
          }
        },
        select: {
          date: true,
          reason: true
        }
      });

      // Get custom pricing for this property
      const customPricing = await prisma.customPricing.findMany({
        where: {
          propertyId,
          date: {
            gte: start,
            lte: end
          }
        },
        select: {
          date: true,
          price: true
        }
      });

      // Build availability array
      availability = dateRange.map(date => {
        const dateStr = format(date, 'yyyy-MM-dd');
        
        // Check if date is blocked
        const blockedDate = blockedDates.find(bd => 
          format(bd.date, 'yyyy-MM-dd') === dateStr
        );
        
        if (blockedDate) {
          return {
            date: dateStr,
            available: false,
            price: property.basePrice,
            reason: blockedDate.reason || 'Blocked'
          };
        }

        // Check if date is booked
        const isBooked = bookings.some(booking => {
          if (!booking.checkIn || !booking.checkOut) return false;
          const checkIn = new Date(booking.checkIn);
          const checkOut = new Date(booking.checkOut);
          return date >= checkIn && date < checkOut;
        });

        if (isBooked) {
          return {
            date: dateStr,
            available: false,
            price: property.basePrice,
            reason: 'Booked'
          };
        }

        // Get custom price or use base price
        const customPrice = customPricing.find(cp => 
          format(cp.date, 'yyyy-MM-dd') === dateStr
        );
        
        return {
          date: dateStr,
          available: true,
          price: customPrice?.price || property.basePrice
        };
      });

    } else if (activityId) {
      // Check activity availability
      const activity = await prisma.activity.findUnique({
        where: { id: activityId },
        select: { 
          price: true, 
          status: true, 
          maxParticipants: true,
          minParticipants: true
        }
      });

      if (!activity || activity.status !== 'ACTIVE') {
        return NextResponse.json(
          { error: 'Activity not found or inactive' },
          { status: 404 }
        );
      }

      // Get all bookings for this activity in the date range
      const activityBookings = await prisma.activityBooking.findMany({
        where: {
          activityId,
          date: {
            gte: start,
            lte: end
          },
          status: { in: ['CONFIRMED', 'PENDING'] }
        },
        select: {
          date: true,
          participants: true,
          status: true
        }
      });

      // Get blocked dates for this activity
      const blockedDates = await prisma.blockedDate.findMany({
        where: {
          activityId,
          date: {
            gte: start,
            lte: end
          }
        },
        select: {
          date: true,
          reason: true
        }
      });

      // Build availability array
      availability = dateRange.map(date => {
        const dateStr = format(date, 'yyyy-MM-dd');
        
        // Check if date is blocked
        const blockedDate = blockedDates.find(bd => 
          format(bd.date, 'yyyy-MM-dd') === dateStr
        );
        
        if (blockedDate) {
          return {
            date: dateStr,
            available: false,
            price: activity.price,
            reason: blockedDate.reason || 'Blocked'
          };
        }

        // Calculate remaining capacity
        const dayBookings = activityBookings.filter(booking => 
          format(booking.date, 'yyyy-MM-dd') === dateStr
        );
        
        const totalParticipants = dayBookings.reduce(
          (sum, booking) => sum + booking.participants, 
          0
        );
        
        const remainingCapacity = activity.maxParticipants - totalParticipants;
        const isAvailable = remainingCapacity >= activity.minParticipants;

        return {
          date: dateStr,
          available: isAvailable,
          price: activity.price,
          remainingCapacity,
          reason: !isAvailable ? 'Fully booked' : undefined
        };
      });
    }

    return NextResponse.json({
      availability,
      dateRange: {
        start: format(start, 'yyyy-MM-dd'),
        end: format(end, 'yyyy-MM-dd')
      }
    });

  } catch (error) {
    console.error('Availability check error:', error);
    return NextResponse.json(
      { error: 'Failed to check availability' },
      { status: 500 }
    );
  }
}