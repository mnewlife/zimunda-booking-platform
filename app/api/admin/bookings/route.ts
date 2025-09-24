import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import prisma from "@/lib/prisma";

export async function GET(request: NextRequest) {
  try {
    // Check authentication and admin role
    const session = await auth.api.getSession({ headers: request.headers });
    
    if (!session?.user || session.user.role !== "ADMIN") {
      return NextResponse.json(
        { error: "Unauthorized. Admin access required." },
        { status: 401 }
      );
    }

    // Fetch all bookings with related data
    const bookings = await prisma.booking.findMany({
      include: {
        guest: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
        property: {
          select: {
            id: true,
            name: true,
            type: true,
          },
        },
      },
      orderBy: {
        checkIn: "asc",
      },
    });

    // Transform the data to match the expected format
    const transformedBookings = bookings.map((booking) => ({
      id: booking.id,
      checkIn: booking.checkIn,
      checkOut: booking.checkOut,
      guest: {
        name: booking.guest.name || "Unknown Guest",
        email: booking.guest.email,
      },
      property: booking.property ? {
        name: booking.property.name,
      } : null,
      status: booking.status,
      totalPrice: Number(booking.totalPrice),
      adults: booking.adults,
      children: booking.children,
    }));

    return NextResponse.json(transformedBookings);
  } catch (error) {
    console.error("Error fetching bookings:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}