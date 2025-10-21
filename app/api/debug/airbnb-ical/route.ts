import { NextRequest, NextResponse } from "next/server";
import * as ical from "node-ical";

// Airbnb calendar URLs
const AIRBNB_CALENDAR_URLS = [
  "https://www.airbnb.com/calendar/ical/32857814.ics?s=230f8192e33a01a2f483c2ca647bdb45&locale=en",
  "https://www.airbnb.com/calendar/ical/947788635220468104.ics?s=829c87bb0f27d1c35d57fd2ef99a0d15&locale=en"
];

export async function GET(request: NextRequest) {
  try {
    const debugData = {
      calendars: [] as any[],
      summary: {
        totalCalendars: AIRBNB_CALENDAR_URLS.length,
        totalEvents: 0,
        fetchedAt: new Date().toISOString()
      }
    };

    // Fetch and parse each Airbnb calendar
    for (let i = 0; i < AIRBNB_CALENDAR_URLS.length; i++) {
      const url = AIRBNB_CALENDAR_URLS[i];
      const calendarData = {
        calendarIndex: i + 1,
        url: url,
        propertyId: url.match(/\/(\d+)\.ics/)?.[1] || `unknown-${i + 1}`,
        rawIcalData: "",
        parsedEvents: [] as any[],
        calendarProperties: {} as any,
        eventCount: 0,
        error: null as string | null
      };

      try {
        console.log(`Fetching Airbnb calendar ${i + 1}:`, url);
        
        // Fetch the iCal data
        const response = await fetch(url, {
          headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
          }
        });
        
        if (!response.ok) {
          calendarData.error = `HTTP ${response.status}: ${response.statusText}`;
          debugData.calendars.push(calendarData);
          continue;
        }
        
        const icalData = await response.text();
        calendarData.rawIcalData = icalData;
        
        console.log(`Received iCal data for calendar ${i + 1}, length:`, icalData.length);
        
        // Parse the iCal data
        const events = ical.parseICS(icalData);
        
        // Separate calendar properties from events
        Object.entries(events).forEach(([key, value]: [string, any]) => {
          if (value.type === 'VCALENDAR') {
            calendarData.calendarProperties = {
              ...calendarData.calendarProperties,
              [key]: {
                type: value.type,
                prodid: value.prodid,
                version: value.version,
                calscale: value.calscale,
                method: value.method,
                'x-wr-calname': value['x-wr-calname'],
                'x-wr-caldesc': value['x-wr-caldesc'],
                'x-wr-timezone': value['x-wr-timezone'],
                ...Object.fromEntries(
                  Object.entries(value).filter(([k, v]) => 
                    k.startsWith('x-') || ['prodid', 'version', 'calscale', 'method'].includes(k)
                  )
                )
              }
            };
          } else if (value.type === 'VEVENT') {
            const eventData = {
              uid: value.uid,
              type: value.type,
              summary: value.summary,
              description: value.description,
              start: value.start ? {
                date: value.start.toISOString(),
                timezone: value.start.tz || null
              } : null,
              end: value.end ? {
                date: value.end.toISOString(),
                timezone: value.end.tz || null
              } : null,
              created: value.created ? value.created.toISOString() : null,
              lastmodified: value.lastmodified ? value.lastmodified.toISOString() : null,
              dtstamp: value.dtstamp ? value.dtstamp.toISOString() : null,
              status: value.status,
              transp: value.transp,
              sequence: value.sequence,
              location: value.location,
              organizer: value.organizer,
              attendee: value.attendee,
              rrule: value.rrule,
              exdate: value.exdate,
              // Include any custom properties
              customProperties: Object.fromEntries(
                Object.entries(value).filter(([k, v]) => 
                  k.startsWith('x-') || !['uid', 'type', 'summary', 'description', 'start', 'end', 
                    'created', 'lastmodified', 'dtstamp', 'status', 'transp', 'sequence', 
                    'location', 'organizer', 'attendee', 'rrule', 'exdate'].includes(k)
                )
              ),
              // Raw event object for complete inspection
              rawEvent: value
            };
            
            calendarData.parsedEvents.push(eventData);
          } else {
            // Handle other types (VTIMEZONE, etc.)
            calendarData.calendarProperties[`${value.type}_${key}`] = value;
          }
        });
        
        calendarData.eventCount = calendarData.parsedEvents.length;
        debugData.summary.totalEvents += calendarData.eventCount;
        
        console.log(`Processed ${calendarData.eventCount} events from calendar ${i + 1}`);
        
      } catch (error) {
        console.error(`Error processing calendar ${i + 1}:`, error);
        calendarData.error = error instanceof Error ? error.message : String(error);
      }
      
      debugData.calendars.push(calendarData);
    }

    console.log(`Debug endpoint: Total events found across all calendars: ${debugData.summary.totalEvents}`);
    
    return NextResponse.json(debugData, {
      headers: {
        'Content-Type': 'application/json',
      },
    });
    
  } catch (error) {
    console.error("Error in debug endpoint:", error);
    return NextResponse.json(
      { 
        error: "Internal server error",
        details: error instanceof Error ? error.message : String(error),
        timestamp: new Date().toISOString()
      },
      { status: 500 }
    );
  }
}