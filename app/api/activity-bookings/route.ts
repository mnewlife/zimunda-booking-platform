import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { z } from 'zod';
import { headers } from 'next/headers';

// Validation schema for activity booking creation
const activityBookingSchema = z.object({
  activityId: z.string().min(1, 'Activity ID is required'),
  date: z.string().datetime('Invalid date format'),
  participants: z.number().int().positive('Participants must be positive'),
  guestDetails: z.object({
    firstName: z.string().min(1, 'First name is required'),
    lastName: z.string().min(1, 'Last name is required'),
    email: z.string().email('Invalid email format'),
    phone: z.string().min(1, 'Phone number is required'),
    specialRequests: z.string().optional(),
  }),
  paymentMethod: z.enum(['cash', 'bank_transfer']),
  paymentDetails: z.object({
    bankReference: z.string().optional(),
  }).optional(),
});

// Validation schema for booking status update
const updateBookingSchema = z.object({
  status: z.enum(['pending', 'confirmed', 'cancelled', 'completed']),
  cancellationReason: z.string().optional(),
});

// GET /api/activity-bookings - Get user's activity bookings
export async function GET(request: NextRequest) {
  try {
    const session = await auth.api.getSession({
      headers: await headers(),
    });

    if (!session) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status');
    const limit = parseInt(searchParams.get('limit') || '10');
    const offset = parseInt(searchParams.get('offset') || '0');
    const sortBy = searchParams.get('sortBy') || 'createdAt';
    const sortOrder = searchParams.get('sortOrder') || 'desc';

    // Build where clause
    const where: any = {
      userId: session.user.id,
    };

    if (status && status !== 'all') {
      where.status = status;
    }

    // Build order by clause
    const orderBy: any = {};
    if (sortBy === 'date') {
      orderBy.date = sortOrder;
    } else if (sortBy === 'totalAmount') {
      orderBy.totalAmount = sortOrder;
    } else {
      orderBy.createdAt = sortOrder;
    }

    // Fetch bookings
    const bookings = await prisma.activityBooking.findMany({
      where,
      orderBy,
      take: limit,
      skip: offset,
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
            cancellationPolicy: true,
          },
        },
        user: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
    });

    // Get total count for pagination
    const total = await prisma.activityBooking.count({ where });

    return NextResponse.json({
      bookings,
      pagination: {
        total,
        limit,
        offset,
        hasMore: offset + limit < total,
      },
    });
  } catch (error) {
    console.error('Error fetching activity bookings:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// POST /api/activity-bookings - Create a new activity booking
export async function POST(request: NextRequest) {
  try {
    const session = await auth.api.getSession({
      headers: await headers(),
    });

    if (!session) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const body = await request.json();
    const validatedData = activityBookingSchema.parse(body);

    // Get activity details
    const activity = await prisma.activity.findUnique({
      where: { id: validatedData.activityId },
    });

    if (!activity || !activity.isActive) {
      return NextResponse.json(
        { error: 'Activity not found or not available' },
        { status: 404 }
      );
    }

    // Validate participant count
    if (
      validatedData.participants < activity.minParticipants ||
      validatedData.participants > activity.maxParticipants
    ) {
      return NextResponse.json(
        {
          error: `Participants must be between ${activity.minParticipants} and ${activity.maxParticipants}`,
        },
        { status: 400 }
      );
    }

    // Check availability for the selected date
    const bookingDate = new Date(validatedData.date);
    const existingBookings = await prisma.activityBooking.findMany({
      where: {
        activityId: validatedData.activityId,
        date: bookingDate,
        status: { in: ['confirmed', 'pending'] },
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
          error: `Only ${availableSpots} spots available for this date`,
        },
        { status: 409 }
      );
    }

    // Calculate total amount
    const subtotal = activity.price * validatedData.participants;
    const serviceFee = Math.round(subtotal * 0.05); // 5% service fee
    const totalAmount = subtotal + serviceFee;

    // Generate booking reference
    const bookingReference = `ACT-${Date.now()}-${Math.random().toString(36).substr(2, 9).toUpperCase()}`;

    // Create booking
    const booking = await prisma.activityBooking.create({
      data: {
        bookingReference,
        userId: session.user.id,
        activityId: validatedData.activityId,
        date: bookingDate,
        participants: validatedData.participants,
        guestDetails: validatedData.guestDetails,
        subtotal,
        serviceFee,
        totalAmount,
        paymentMethod: validatedData.paymentMethod,
        status: 'pending',
        createdAt: new Date(),
        updatedAt: new Date(),
      },
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
    });

    // Process payment based on method
    let paymentResult = null;
    let paymentStatus = 'pending';

    try {
      switch (validatedData.paymentMethod) {
        case 'bank_transfer':
          paymentResult = {
            success: true,
            message: 'Bank transfer instructions sent',
            bankDetails: {
              accountName: 'Zimunda Estate',
              accountNumber: '1234567890',
              bankName: 'Example Bank',
              reference: bookingReference,
            },
          };
          paymentStatus = 'pending';
          break;

        default:
          throw new Error('Invalid payment method');
      }

      // Update booking with payment information
      const updatedBooking = await prisma.activityBooking.update({
        where: { id: booking.id },
        data: {
          paymentStatus,
          paymentReference: paymentResult.transactionId || paymentResult.pollUrl,
          status: paymentStatus === 'completed' ? 'confirmed' : 'pending',
          updatedAt: new Date(),
        },
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
      });

      return NextResponse.json(
        {
          booking: updatedBooking,
          payment: paymentResult,
        },
        { status: 201 }
      );
    } catch (paymentError) {
      console.error('Payment processing error:', paymentError);
      
      // Update booking status to failed
      await prisma.activityBooking.update({
        where: { id: booking.id },
        data: {
          status: 'cancelled',
          paymentStatus: 'failed',
          cancellationReason: `Payment failed: ${paymentError instanceof Error ? paymentError.message : 'Unknown error'}`,
          updatedAt: new Date(),
        },
      });

      return NextResponse.json(
        {
          error: 'Payment processing failed',
          details: paymentError instanceof Error ? paymentError.message : 'Unknown error',
        },
        { status: 400 }
      );
    }
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Validation error', details: error.errors },
        { status: 400 }
      );
    }

    console.error('Error creating activity booking:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// PUT /api/activity-bookings - Update booking status
export async function PUT(request: NextRequest) {
  try {
    const session = await auth.api.getSession({
      headers: await headers(),
    });

    if (!session) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const body = await request.json();
    const { id, ...updateData } = body;

    if (!id) {
      return NextResponse.json(
        { error: 'Booking ID is required' },
        { status: 400 }
      );
    }

    const validatedData = updateBookingSchema.parse(updateData);

    // Check if booking exists and user has permission
    const existingBooking = await prisma.activityBooking.findUnique({
      where: { id },
      include: {
        activity: true,
      },
    });

    if (!existingBooking) {
      return NextResponse.json(
        { error: 'Booking not found' },
        { status: 404 }
      );
    }

    // Check permissions
    const isOwner = existingBooking.userId === session.user.id;
    const isAdmin = session.user.role === 'admin';

    if (!isOwner && !isAdmin) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 403 }
      );
    }

    // Validate status transitions
    const currentStatus = existingBooking.status;
    const newStatus = validatedData.status;

    // Users can only cancel their own bookings
    if (isOwner && !isAdmin && newStatus !== 'cancelled') {
      return NextResponse.json(
        { error: 'Users can only cancel their bookings' },
        { status: 403 }
      );
    }

    // Check if cancellation is allowed (e.g., not too close to the activity date)
    if (newStatus === 'cancelled') {
      const activityDate = new Date(existingBooking.date);
      const now = new Date();
      const hoursUntilActivity = (activityDate.getTime() - now.getTime()) / (1000 * 60 * 60);

      // Allow cancellation up to 24 hours before the activity (admin can override)
      if (hoursUntilActivity < 24 && !isAdmin) {
        return NextResponse.json(
          { error: 'Cancellation not allowed within 24 hours of the activity' },
          { status: 409 }
        );
      }
    }

    // Update booking
    const updatedBooking = await prisma.activityBooking.update({
      where: { id },
      data: {
        status: newStatus,
        cancellationReason: validatedData.cancellationReason,
        updatedAt: new Date(),
      },
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
        user: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
    });

    return NextResponse.json({ booking: updatedBooking });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Validation error', details: error.errors },
        { status: 400 }
      );
    }

    console.error('Error updating activity booking:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}