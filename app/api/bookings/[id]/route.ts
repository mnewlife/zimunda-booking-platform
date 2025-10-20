import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { auth } from '@/lib/auth';
import { headers } from 'next/headers';
import { BookingStatus, PaymentStatus, PaymentMethod } from '@prisma/client';

interface RouteParams {
  params: {
    id: string;
  };
}

// GET /api/bookings/[id] - Get a specific booking
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const session = await auth.api.getSession({
      headers: await headers(),
    });

    if (!session?.user || (session.user as any).role !== 'ADMIN') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const booking = await prisma.booking.findUnique({
      where: { id: params.id },
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
    });

    if (!booking) {
      return NextResponse.json(
        { error: 'Booking not found' },
        { status: 404 }
      );
    }

    return NextResponse.json(booking);
  } catch (error) {
    console.error('Error fetching booking:', error);
    return NextResponse.json(
      { error: 'Failed to fetch booking' },
      { status: 500 }
    );
  }
}

// PUT /api/bookings/[id] - Update a specific booking
export async function PUT(request: NextRequest, { params }: RouteParams) {
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

    // Check if booking exists
    const existingBooking = await prisma.booking.findUnique({
      where: { id: params.id },
      include: {
        guest: true,
        addOns: true,
        activities: true,
      },
    });

    if (!existingBooking) {
      return NextResponse.json(
        { error: 'Booking not found' },
        { status: 404 }
      );
    }

    // Validate dates if provided
    if (checkIn && checkOut) {
      const checkInDate = new Date(checkIn);
      const checkOutDate = new Date(checkOut);
      
      if (checkInDate >= checkOutDate) {
        return NextResponse.json(
          { error: 'Check-out date must be after check-in date' },
          { status: 400 }
        );
      }
    }

    // Update guest information if provided
    if (guestName || guestEmail || guestPhone) {
      await prisma.user.update({
        where: { id: existingBooking.guestId },
        data: {
          ...(guestName && { name: guestName }),
          ...(guestEmail && { email: guestEmail }),
          ...(guestPhone !== undefined && { phone: guestPhone || null }),
          updatedAt: new Date(),
        },
      });
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

    // Update the booking
    const updatedBooking = await prisma.booking.update({
      where: { id: params.id },
      data: {
        ...(propertyId !== undefined && { propertyId: isEstateBooking ? null : propertyId }),
        ...(isEstateBooking !== undefined && { isEstateBooking }),
        ...(checkIn && { checkIn: new Date(checkIn) }),
        ...(checkOut && { checkOut: new Date(checkOut) }),
        ...(adults !== undefined && { adults: parseInt(adults) }),
        ...(children !== undefined && { children: parseInt(children) }),
        ...(totalPrice !== undefined && { totalPrice: parseFloat(totalPrice) }),
        ...(status && { status: status as BookingStatus }),
        ...(paymentMethod && { paymentMethod: paymentMethod as PaymentMethod }),
        ...(paymentStatus && { paymentStatus: paymentStatus as PaymentStatus }),
        ...(notes !== undefined && { notes: notes || null }),
        updatedAt: new Date(),
      },
    });

    // Update add-ons if provided
    if (selectedAddOns !== undefined) {
      // Remove existing add-ons
      await prisma.bookingAddOn.deleteMany({
        where: { bookingId: params.id },
      });

      // Add new add-ons
      if (selectedAddOns.length > 0) {
        for (const addOn of selectedAddOns) {
          const addOnData = await prisma.addOn.findUnique({
            where: { id: addOn.id },
          });
          
          if (addOnData) {
            await prisma.bookingAddOn.create({
              data: {
                bookingId: params.id,
                addOnId: addOn.id,
                quantity: addOn.quantity,
                price: addOnData.price,
              },
            });
          }
        }
      }
    }

    // Update activities if provided
    if (selectedActivities !== undefined) {
      // Remove existing activities
      await prisma.activityBooking.deleteMany({
        where: { bookingId: params.id },
      });

      // Add new activities
      if (selectedActivities.length > 0) {
        for (const activity of selectedActivities) {
          const activityData = await prisma.activity.findUnique({
            where: { id: activity.id },
          });
          
          if (activityData) {
            await prisma.activityBooking.create({
              data: {
                bookingId: params.id,
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
    }

    // Fetch the complete updated booking
    const completeBooking = await prisma.booking.findUnique({
      where: { id: params.id },
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

    return NextResponse.json(completeBooking);
  } catch (error) {
    console.error('Error updating booking:', error);
    return NextResponse.json(
      { error: 'Failed to update booking' },
      { status: 500 }
    );
  }
}

// DELETE /api/bookings/[id] - Delete a specific booking
export async function DELETE(request: NextRequest, { params }: RouteParams) {
  try {
    const session = await auth.api.getSession({
      headers: await headers(),
    });

    if (!session?.user || (session.user as any).role !== 'ADMIN') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check if booking exists
    const existingBooking = await prisma.booking.findUnique({
      where: { id: params.id },
    });

    if (!existingBooking) {
      return NextResponse.json(
        { error: 'Booking not found' },
        { status: 404 }
      );
    }

    // Delete related records first (due to foreign key constraints)
    await prisma.bookingAddOn.deleteMany({
      where: { bookingId: params.id },
    });

    await prisma.activityBooking.deleteMany({
      where: { bookingId: params.id },
    });

    await prisma.payment.deleteMany({
      where: { bookingId: params.id },
    });

    // Delete the booking
    await prisma.booking.delete({
      where: { id: params.id },
    });

    return NextResponse.json(
      { message: 'Booking deleted successfully' },
      { status: 200 }
    );
  } catch (error) {
    console.error('Error deleting booking:', error);
    return NextResponse.json(
      { error: 'Failed to delete booking' },
      { status: 500 }
    );
  }
}