import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { paymentService } from '@/lib/payment-service';
import { z } from 'zod';
import { BookingStatus, PaymentStatus, PaymentMethod } from '@prisma/client';

// Helper function to map payment method strings to Prisma enum values
function mapPaymentMethod(paymentMethod: string): PaymentMethod {
  const methodMap: Record<string, PaymentMethod> = {
    'cash': PaymentMethod.CASH,
    'bank_transfer': PaymentMethod.BANK_TRANSFER,
    'paynow': PaymentMethod.PAYNOW,
    'card': PaymentMethod.PAYNOW, // Map card to PAYNOW for now
    'CASH': PaymentMethod.CASH,
    'BANK_TRANSFER': PaymentMethod.BANK_TRANSFER,
    'PAYNOW': PaymentMethod.PAYNOW,
  };
  
  return methodMap[paymentMethod] || PaymentMethod.CASH;
}

// Validation schema for public activity booking creation
const publicActivityBookingSchema = z.object({
  activityId: z.string().min(1, 'Activity ID is required'),
  date: z.string().datetime('Invalid date format'),
  time: z.string().min(1, 'Time is required'),
  participants: z.number().int().positive('Participants must be positive'),
  guestDetails: z.object({
    firstName: z.string().min(1, 'First name is required'),
    lastName: z.string().min(1, 'Last name is required'),
    email: z.string().email('Invalid email format'),
    phone: z.string().min(1, 'Phone number is required'),
    specialRequests: z.string().optional(),
  }),
  paymentMethod: z.enum(['cash', 'paynow', 'bank_transfer']),
  paymentDetails: z.object({
    paynowPhone: z.string().optional(),
    bankReference: z.string().optional(),
  }).optional(),
});

// POST /api/public/activity-bookings - Create a new activity booking (public endpoint)
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const validatedData = publicActivityBookingSchema.parse(body);

    // Get activity details and check if it's bookable
    const activity = await prisma.activity.findUnique({
      where: { id: validatedData.activityId },
    });

    if (!activity || !activity.bookable) {
      return NextResponse.json(
        { error: 'Activity not found or not bookable' },
        { status: 404 }
      );
    }

    // Validate participant count
    if (
      validatedData.participants > activity.maxParticipants
    ) {
      return NextResponse.json(
        {
          error: `Maximum ${activity.maxParticipants} participants allowed`,
        },
        { status: 400 }
      );
    }

    // Check availability for the selected date and time
    const bookingDate = new Date(validatedData.date);
    const existingBookings = await prisma.activityBooking.findMany({
      where: {
        activityId: validatedData.activityId,
        date: bookingDate,
        time: validatedData.time,
        status: { in: ['CONFIRMED', 'PENDING'] },
      },
      select: {
        participants: true,
      },
    });

    const totalBookedParticipants = existingBookings.reduce(
      (sum, booking) => sum + booking.participants,
      0
    );

    const availableSpots = activity.maxParticipants - totalBookedParticipants;

    if (validatedData.participants > availableSpots) {
      return NextResponse.json(
        {
          error: `Only ${availableSpots} spots available for this date and time`,
        },
        { status: 409 }
      );
    }

    // Calculate total amount
    const totalAmount = activity.price * validatedData.participants;

    // Execute all booking operations in a transaction
    const completeBooking = await prisma.$transaction(async (tx) => {
      // Check if guest exists by email
      let guestUser = await tx.user.findUnique({
        where: { email: validatedData.guestDetails.email },
      });
      
      if (!guestUser) {
        // Create new guest user
        guestUser = await tx.user.create({
          data: {
            id: `guest_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
            name: `${validatedData.guestDetails.firstName} ${validatedData.guestDetails.lastName}`,
            email: validatedData.guestDetails.email,
            phone: validatedData.guestDetails.phone || null,
            emailVerified: false,
            role: 'GUEST',
            createdAt: new Date(),
            updatedAt: new Date(),
          },
        });
      }

      // Create the main booking record
      const booking = await tx.booking.create({
        data: {
          guestId: guestUser.id,
          propertyId: null, // Activity-only booking
          isActivityOnlyBooking: true, // This is an activity-only booking
          checkIn: bookingDate,
          checkOut: bookingDate, // Same day for activities
          adults: validatedData.participants,
          children: 0,
          totalPrice: totalAmount,
          status: 'PENDING' as BookingStatus,
          paymentMethod: mapPaymentMethod(validatedData.paymentMethod),
          paymentStatus: 'PENDING' as PaymentStatus,
          notes: validatedData.guestDetails.specialRequests || null,
        },
      });

      // Create the activity booking linked to the main booking
      const activityBooking = await tx.activityBooking.create({
        data: {
          bookingId: booking.id,
          activityId: validatedData.activityId,
          date: bookingDate,
          time: validatedData.time,
          participants: validatedData.participants,
          totalPrice: totalAmount,
          status: 'PENDING',
        },
      });

      // Return the complete booking with relations
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
          activities: {
            include: {
              activity: {
                select: {
                  id: true,
                  name: true,
                  slug: true,
                  type: true,
                  location: true,
                  duration: true,
                  difficulty: true,
                  images: true,
                },
              },
            },
          },
        },
      });
    });

    // Handle payment processing based on method
    if (validatedData.paymentMethod === 'paynow') {
      // For PayNow, we'll mark as pending and provide QR code
      return NextResponse.json({
        success: true,
        booking: completeBooking,
        paymentMethod: 'paynow',
        qrCode: `paynow://pay?amount=${totalAmount}&ref=${completeBooking.id}`,
        message: 'Booking created successfully. Please complete payment via PayNow.',
      });
    } else if (validatedData.paymentMethod === 'bank_transfer') {
      // For bank transfer, provide bank details
      return NextResponse.json({
        success: true,
        booking: completeBooking,
        paymentMethod: 'bank_transfer',
        bankDetails: {
          bankName: 'DBS Bank',
          accountNumber: '123-456789-0',
          accountName: 'Zimunda Estate Pte Ltd',
          reference: completeBooking.id,
        },
        message: 'Booking created successfully. Please complete payment via bank transfer.',
      });
    } else if (validatedData.paymentMethod === 'cash') {
      // For cash payments
      return NextResponse.json({
        success: true,
        booking: completeBooking,
        paymentMethod: 'cash',
        message: 'Booking created successfully. Payment will be collected on-site.',
      });
    } else {
      // For other payment methods
      return NextResponse.json({
        success: true,
        booking: completeBooking,
        paymentMethod: validatedData.paymentMethod,
        message: 'Booking created successfully.',
      });
    }
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Validation error', details: error.errors },
        { status: 400 }
      );
    }

    console.error('Error creating public activity booking:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}