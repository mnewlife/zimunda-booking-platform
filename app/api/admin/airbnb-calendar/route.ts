import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import * as ical from "node-ical";

// Airbnb calendar URLs
const AIRBNB_CALENDAR_URLS = [
  "https://www.airbnb.com/calendar/ical/32857814.ics?s=230f8192e33a01a2f483c2ca647bdb45&locale=en",
  "https://www.airbnb.com/calendar/ical/947788635220468104.ics?s=829c87bb0f27d1c35d57fd2ef99a0d15&locale=en"
];

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

    // Fetch and parse each Airbnb calendar
    for (let i = 0; i < AIRBNB_CALENDAR_URLS.length; i++) {
      const url = AIRBNB_CALENDAR_URLS[i];
      
      try {
        console.log(`Fetching Airbnb calendar ${i + 1}:`, url);
        
        // Fetch the iCal data
        const response = await fetch(url, {
          headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
          }
        });
        
        if (!response.ok) {
          console.error(`Failed to fetch calendar ${i + 1}:`, response.status, response.statusText);
          continue;
        }
        
        const icalData = await response.text();
        console.log(`Received iCal data for calendar ${i + 1}, length:`, icalData.length);
        
        // Parse the iCal data
        const events = ical.parseICS(icalData);
        
        // Extract property ID from URL for naming
        const propertyIdMatch = url.match(/\/(\d+)\.ics/);
        const propertyId = propertyIdMatch ? propertyIdMatch[1] : `property-${i + 1}`;
        
        // Convert events to booking format
        Object.values(events).forEach((event: any) => {
          if (event.type === 'VEVENT' && event.start && event.end) {
            // Skip if it's not a booking (some calendars have availability blocks)
            if (event.summary && event.summary.toLowerCase().includes('available')) {
              return;
            }
            
            const booking: AirbnbBooking = {
              id: `airbnb-${propertyId}-${event.uid || Date.now()}`,
              checkIn: event.start.toISOString(),
              checkOut: event.end.toISOString(),
              status: "CONFIRMED", // Airbnb bookings are typically confirmed
              totalPrice: 0, // Price not available in iCal
              adults: 1, // Default values since not available in iCal
              children: 0,
              guest: {
                name: event.summary || "Airbnb Guest",
                email: "airbnb-guest@example.com", // Placeholder email
              },
              property: {
                name: `Airbnb Property ${propertyId}`,
              },
              source: "airbnb"
            };
            
            allBookings.push(booking);
          }
        });
        
        console.log(`Processed ${Object.keys(events).length} events from calendar ${i + 1}`);
        
      } catch (error) {
        console.error(`Error processing calendar ${i + 1}:`, error);
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