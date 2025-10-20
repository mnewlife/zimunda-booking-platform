import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { BookingStatus, PaymentStatus, PaymentMethod } from '@prisma/client';

// Helper function to map payment method strings to Prisma enum values
function mapPaymentMethod(paymentMethod: string): PaymentMethod {
  const methodMap: Record<string, PaymentMethod> = {
    'cash': PaymentMethod.CASH,
    'bank_transfer': PaymentMethod.BANK_TRANSFER,
    'CASH': PaymentMethod.CASH,
    'BANK_TRANSFER': PaymentMethod.BANK_TRANSFER,
  };
  
  return methodMap[paymentMethod] || PaymentMethod.CASH; // Default to CASH if invalid
}

// POST /api/public/bookings - Create a new booking (public endpoint)
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      propertyId,
      checkIn,
      checkOut,
      guests,
      totalAmount,
      paymentMethod,
      guestDetails,
      addOns,
      activities,
    } = body;

    // Validate required fields
    if (!guestDetails?.firstName || !guestDetails?.lastName || !guestDetails?.email || !checkIn || !checkOut || !guests) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    // Validate dates
    const checkInDate = new Date(checkIn);
    const checkOutDate = new Date(checkOut);
    
    if (checkInDate >= checkOutDate) {
      return NextResponse.json(
        { error: 'Check-out date must be after check-in date' },
        { status: 400 }
      );
    }

    // Validate property if provided
    if (propertyId) {
      const property = await prisma.property.findUnique({
        where: { id: propertyId },
      });
      
      if (!property) {
        return NextResponse.json(
          { error: 'Property not found' },
          { status: 404 }
        );
      }
    }

    // Execute all booking operations in a transaction
    const completeBooking = await prisma.$transaction(async (tx) => {
      // Check if guest exists by email
      let guestUser = await tx.user.findUnique({
        where: { email: guestDetails.email },
      });
      
      if (!guestUser) {
        // Create new guest user
        guestUser = await tx.user.create({
          data: {
            id: `guest_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
            name: `${guestDetails.firstName} ${guestDetails.lastName}`,
            email: guestDetails.email,
            phone: guestDetails.phone || null,
            emailVerified: false,
            role: 'GUEST',
            createdAt: new Date(),
            updatedAt: new Date(),
          },
        });
      }

      // Create the booking
      const booking = await tx.booking.create({
        data: {
          guestId: guestUser.id,
          propertyId: propertyId || null,
          isEstateBooking: !propertyId,
          checkIn: checkInDate,
          checkOut: checkOutDate,
          adults: parseInt(guests.toString()),
          children: 0, // Default to 0 for public bookings
          totalPrice: parseFloat(totalAmount?.toString() || '0'),
          status: 'PENDING' as BookingStatus,
          paymentMethod: mapPaymentMethod(paymentMethod || 'cash'),
          paymentStatus: 'PENDING' as PaymentStatus,
          notes: guestDetails.specialRequests || null,
        },
      });

      // Add selected add-ons
      if (addOns && addOns.length > 0) {
        for (const addOn of addOns) {
          const addOnData = await tx.addOn.findUnique({
            where: { id: addOn.addOnId },
          });
          
          if (addOnData && addOn.quantity > 0) {
            await tx.bookingAddOn.create({
              data: {
                bookingId: booking.id,
                addOnId: addOn.addOnId,
                quantity: addOn.quantity,
                price: addOn.price || addOnData.price,
              },
            });
          }
        }
      }

      // Add selected activities
      if (activities && activities.length > 0) {
        for (const activity of activities) {
          const activityData = await tx.activity.findUnique({
            where: { id: activity.activityId },
          });
          
          if (activityData) {
            // Check if this activity slot is already booked
            const existingBooking = await tx.activityBooking.findFirst({
              where: {
                activityId: activity.activityId,
                date: new Date(activity.date),
                time: activity.time,
              },
            });

            if (existingBooking) {
              throw new Error(`Activity "${activityData.name}" is already booked for ${activity.date} at ${activity.time}. Please select a different time slot.`);
            }

            await tx.activityBooking.create({
              data: {
                bookingId: booking.id,
                activityId: activity.activityId,
                date: new Date(activity.date),
                time: activity.time,
                participants: activity.participants,
                totalPrice: activity.totalPrice || (activityData.price * activity.participants),
                status: 'PENDING',
              },
            });
          }
        }
      }

      // Fetch the complete booking with all relations
      return await tx.booking.findUnique({
        where: { id: booking.id },
        include: {
          guest: {
            select: {
              id: true,
              name: true,
              email: true,
              phone: true,
            },
          },
          property: {
            select: {
              id: true,
              name: true,
              type: true,
              slug: true,
            },
          },
          addOns: {
            include: {
              addOn: true,
            },
          },
          activities: {
            include: {
              activity: true,
            },
          },
          payments: true,
        },
      });
    });

    return NextResponse.json(completeBooking, { status: 201 });
  } catch (error) {
    console.error('Error creating public booking:', error);
    
    // Handle specific transaction errors
    if (error instanceof Error) {
      // Handle our custom activity booking conflict errors
      if (error.message.includes('already booked for')) {
        return NextResponse.json(
          { error: error.message },
          { status: 409 }
        );
      }
      if (error.message.includes('Unique constraint')) {
        return NextResponse.json(
          { error: 'Booking conflict detected. Please try again.' },
          { status: 409 }
        );
      }
      if (error.message.includes('Foreign key constraint')) {
        return NextResponse.json(
          { error: 'Invalid reference data provided.' },
          { status: 400 }
        );
      }
    }
    
    return NextResponse.json(
      { error: 'Failed to create booking' },
      { status: 500 }
    );
  }
}