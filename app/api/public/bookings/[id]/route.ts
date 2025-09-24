import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/prisma'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params

    if (!id) {
      return NextResponse.json(
        { error: 'Booking ID is required' },
        { status: 400 }
      )
    }

    // Fetch booking with all related data
    const booking = await prisma.booking.findUnique({
      where: { id },
      include: {
        property: {
          select: {
            id: true,
            name: true,
            type: true,
            location: true
          }
        },
        guest: {
          select: {
            id: true,
            name: true,
            email: true,
            phone: true
          }
        },
        addOns: {
          include: {
            addOn: {
              select: {
                name: true,
                description: true
              }
            }
          }
        },
        activities: {
          include: {
            activity: {
              select: {
                name: true,
                type: true
              }
            }
          }
        }
      }
    })

    if (!booking) {
      return NextResponse.json(
        { error: 'Booking not found' },
        { status: 404 }
      )
    }

    // Format the response
    const formattedBooking = {
      id: booking.id,
      property: booking.property ? {
        name: booking.property.name,
        type: booking.property.type,
        location: booking.property.location
      } : null,
      guest: {
        name: booking.guest.name,
        email: booking.guest.email,
        phone: booking.guest.phone
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
          description: addOn.addOn.description
        },
        quantity: addOn.quantity,
        price: Number(addOn.price)
      })),
      activities: booking.activities.map(activity => ({
        activity: {
          name: activity.activity.name,
          type: activity.activity.type
        },
        date: activity.date.toISOString(),
        time: activity.time,
        participants: activity.participants,
        totalPrice: Number(activity.totalPrice)
      })),
      createdAt: booking.createdAt.toISOString()
    }

    return NextResponse.json(formattedBooking)
  } catch (error) {
    console.error('Error fetching booking:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}