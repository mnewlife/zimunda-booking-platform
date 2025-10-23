import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import prisma from "@/lib/prisma";
import * as ical from "node-ical";

interface AirbnbBooking {
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
  property: {
    name: string;
  };
  source: string;
}

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

    const allBookings: AirbnbBooking[] = [];

    // Fetch properties with Airbnb calendar URLs from database
    const propertiesWithAirbnb = await prisma.property.findMany({
      where: {
        airbnbCalendarUrl: {
          not: null,
          not: ""
        }
      },
      select: {
        id: true,
        name: true,
        airbnbCalendarUrl: true
      }
    });

    console.log(`Found ${propertiesWithAirbnb.length} properties with Airbnb calendar URLs`);

    // Fetch and parse each Airbnb calendar
    for (let i = 0; i < propertiesWithAirbnb.length; i++) {
      const property = propertiesWithAirbnb[i];
      const url = property.airbnbCalendarUrl!;
      
      try {
        console.log(`Fetching Airbnb calendar for property "${property.name}":`, url);
        
        // Fetch the iCal data
        const response = await fetch(url, {
          headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
          }
        });
        
        if (!response.ok) {
          console.error(`Failed to fetch calendar for property "${property.name}":`, response.status, response.statusText);
          continue;
        }
        
        const icalData = await response.text();
        console.log(`Received iCal data for property "${property.name}", length:`, icalData.length);
        
        // Parse the iCal data
        const events = ical.parseICS(icalData);
        
        // Convert events to booking format
        Object.values(events).forEach((event: any) => {
          if (event.type === 'VEVENT' && event.start && event.end) {
            // Extract information from the event
            const summary = event.summary || "Airbnb Event";
            const description = event.description || "";
            
            // Extract phone number from description if available
            const phoneMatch = description.match(/Phone Number \(Last 4 Digits\): (\d+)/);
            const phoneNumber = phoneMatch ? phoneMatch[1] : null;
            
            // Extract reservation URL from description if available
            const urlMatch = description.match(/Reservation URL: (https?:\/\/[^\s\\]+)/);
            const reservationUrl = urlMatch ? urlMatch[1] : null;
            
            // Use the actual event summary as the guest name
            const guestName = summary;
            
            // Use a generic email for Airbnb events
            const guestEmail = "airbnb@example.com";
            
            // All Airbnb events are considered confirmed bookings/blocks
            const status = "CONFIRMED";
            
            const booking: AirbnbBooking = {
              id: `airbnb-${property.id}-${event.uid || Date.now()}`,
              checkIn: event.start.toISOString(),
              checkOut: event.end.toISOString(),
              status: status,
              totalPrice: 0, // Price not available in iCal
              adults: 1, // Default values since not available in iCal
              children: 0,
              guest: {
                name: guestName,
                email: guestEmail,
              },
              property: {
                name: property.name,
              },
              source: "airbnb"
            };
            
            // Add additional metadata if available
            if (reservationUrl || phoneNumber || description) {
              (booking as any).metadata = {
                reservationUrl,
                phoneNumber,
                originalSummary: summary,
                description: description
              };
            }
            
            allBookings.push(booking);
            
            console.log(`Added Airbnb event: ${summary} for property "${property.name}" from ${event.start.toISOString()} to ${event.end.toISOString()}`);
          }
        });
        
        console.log(`Processed ${Object.keys(events).length} events from property "${property.name}"`);
        
      } catch (error) {
        console.error(`Error processing calendar for property "${property.name}":`, error);
        // Continue with other calendars even if one fails
      }
    }

    console.log(`Total Airbnb bookings found: ${allBookings.length}`);
    
    // Sort bookings by check-in date
    allBookings.sort((a, b) => new Date(a.checkIn).getTime() - new Date(b.checkIn).getTime());

    return NextResponse.json(allBookings);
    
  } catch (error) {
    console.error("Error fetching Airbnb calendar data:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}