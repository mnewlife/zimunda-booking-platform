import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { auth } from '@/lib/auth';
import { headers } from 'next/headers';
import { BookingStatus, PaymentStatus, PaymentMethod } from '@prisma/client';

// GET /api/bookings - Get all bookings
export async function GET(request: NextRequest) {
  try {
    const session = await auth.api.getSession({
      headers: await headers(),
    });

    if (!session?.user || (session.user as any).role !== 'ADMIN') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status');
    const propertyId = searchParams.get('propertyId');
    const guestId = searchParams.get('guestId');
    const limit = parseInt(searchParams.get('limit') || '50');
    const offset = parseInt(searchParams.get('offset') || '0');

    const where: any = {};
    
    if (status) {
      where.status = status as BookingStatus;
    }
    
    if (propertyId) {
      where.propertyId = propertyId;
    }
    
    if (guestId) {
      where.guestId = guestId;
    }

    const bookings = await prisma.booking.findMany({
      where,
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
            basePrice: true,
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
      orderBy: {
        createdAt: 'desc',
      },
      take: limit,
      skip: offset,
    });

    const total = await prisma.booking.count({ where });

    return NextResponse.json({
      bookings,
      total,
      limit,
      offset,
    });
  } catch (error) {
    console.error('Error fetching bookings:', error);
    return NextResponse.json(
      { error: 'Failed to fetch bookings' },
      { status: 500 }
    );
  }
}

// POST /api/bookings - Create a new booking
export async function POST(request: NextRequest) {
  try {
    const session = await auth.api.getSession({
      headers: await headers(),
    });

    if (!session?.user || (session.user as any).role !== 'ADMIN') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const {
      guestName,
      guestEmail,
      guestPhone,
      guestId,
      propertyId,
      isEstateBooking,
      checkIn,
      checkOut,
      adults,
      children,
      paymentMethod,
      paymentStatus,
      status,
      notes,
      selectedAddOns,
      selectedActivities,
      totalPrice,
    } = body;

    // Validate required fields
    if (!guestName || !guestEmail || !checkIn || !checkOut || !adults) {
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

    // Handle guest creation or selection
    let finalGuestId = guestId;
    
    if (!finalGuestId) {
      // Check if guest exists by email
      const existingGuest = await prisma.user.findUnique({
        where: { email: guestEmail },
      });
      
      if (existingGuest) {
        finalGuestId = existingGuest.id;
      } else {
        // Create new guest
        const newGuest = await prisma.user.create({
          data: {
            id: `guest_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
            name: guestName,
            email: guestEmail,
            phone: guestPhone || null,
            emailVerified: false,
            role: 'GUEST',
            createdAt: new Date(),
            updatedAt: new Date(),
          },
        });
        finalGuestId = newGuest.id;
      }
    }

    // Validate property if not estate booking
    if (!isEstateBooking && propertyId) {
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

    // Create the booking
    const booking = await prisma.booking.create({
      data: {
        guestId: finalGuestId,
        propertyId: isEstateBooking ? null : propertyId,
        isEstateBooking: isEstateBooking || false,
        checkIn: checkInDate,
        checkOut: checkOutDate,
        adults: parseInt(adults),
        children: parseInt(children) || 0,
        totalPrice: parseFloat(totalPrice) || 0,
        status: status as BookingStatus || 'PENDING',
        paymentMethod: paymentMethod as PaymentMethod || 'PENDING',
        paymentStatus: paymentStatus as PaymentStatus || 'PENDING',
        notes: notes || null,
      },
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
      },
    });

    // Add selected add-ons
    if (selectedAddOns && selectedAddOns.length > 0) {
      for (const addOn of selectedAddOns) {
        const addOnData = await prisma.addOn.findUnique({
          where: { id: addOn.id },
        });
        
        if (addOnData) {
          await prisma.bookingAddOn.create({
            data: {
              bookingId: booking.id,
              addOnId: addOn.id,
              quantity: addOn.quantity,
              price: addOnData.price,
            },
          });
        }
      }
    }

    // Add selected activities
    if (selectedActivities && selectedActivities.length > 0) {
      for (const activity of selectedActivities) {
        const activityData = await prisma.activity.findUnique({
          where: { id: activity.id },
        });
        
        if (activityData) {
          await prisma.activityBooking.create({
            data: {
              bookingId: booking.id,
              activityId: activity.id,
              date: new Date(activity.date),
              time: activity.time,
              participants: activity.participants,
              totalPrice: activityData.price * activity.participants,
              status: 'PENDING',
            },
          });
        }
      }
    }

    // Fetch the complete booking with all relations
    const completeBooking = await prisma.booking.findUnique({
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

    return NextResponse.json(completeBooking, { status: 201 });
  } catch (error) {
    console.error('Error creating booking:', error);
    return NextResponse.json(
      { error: 'Failed to create booking' },
      { status: 500 }
    );
  }
}