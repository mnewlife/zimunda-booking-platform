import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

interface RouteParams {
  params: {
    id: string;
  };
}

// GET /api/public/bookings/[id] - Get a specific booking (public endpoint)
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
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
            location: true,
          },
        },
        addOns: {
          include: {
            addOn: {
              select: {
                id: true,
                name: true,
                description: true,
                price: true,
              },
            },
          },
        },
        activities: {
          include: {
            activity: {
              select: {
                id: true,
                name: true,
                type: true,
                description: true,
                price: true,
              },
            },
          },
        },
        payments: {
          select: {
            id: true,
            amount: true,
            currency: true,
            method: true,
            status: true,
            createdAt: true,
          },
        },
      },
    });

    if (!booking) {
      return NextResponse.json(
        { error: 'Booking not found' },
        { status: 404 }
      );
    }

    // Transform the booking data to match the expected format
    const transformedBooking = {
      id: booking.id,
      property: booking.property ? {
        name: booking.property.name,
        type: booking.property.type,
        location: booking.property.location,
      } : undefined,
      guest: {
        name: booking.guest.name,
        email: booking.guest.email,
        phone: booking.guest.phone,
      },
      checkIn: booking.checkIn.toISOString(),
      checkOut: booking.checkOut.toISOString(),
      adults: booking.adults,
      children: booking.children,
      totalPrice: Number(booking.totalPrice),
      status: booking.status,
      paymentMethod: booking.paymentMethod,
      paymentStatus: booking.paymentStatus,
      addOns: booking.addOns.map(addOn => ({
        addOn: {
          name: addOn.addOn.name,
          description: addOn.addOn.description,
        },
        quantity: addOn.quantity,
        price: Number(addOn.price),
      })),
      activities: booking.activities.map(activity => ({
        activity: {
          name: activity.activity.name,
          type: activity.activity.type,
        },
        date: activity.date.toISOString(),
        time: activity.time,
        participants: activity.participants,
        totalPrice: Number(activity.totalPrice),
      })),
      createdAt: booking.createdAt.toISOString(),
    };

    return NextResponse.json(transformedBooking);
  } catch (error) {
    console.error('Error fetching booking:', error);
    return NextResponse.json(
      { error: 'Failed to fetch booking' },
      { status: 500 }
    );
  }
}