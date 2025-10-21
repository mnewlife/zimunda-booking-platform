"use client";

import { useState, useCallback, useEffect } from "react";
import { Scheduler } from "@bitnoi.se/react-scheduler";
import "@bitnoi.se/react-scheduler/dist/style.css";
import dayjs from "dayjs";
import isBetween from "dayjs/plugin/isBetween";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { CalendarIcon, RefreshCwIcon } from "lucide-react";
import { toast } from "sonner";

dayjs.extend(isBetween);

interface BookingData {
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
  property?: {
    name: string;
  } | null;
  source?: string;
}

interface SchedulerData {
  id: string;
  label: {
    icon: string;
    title: string;
    subtitle: string;
  };
  data: Array<{
    id: string;
    startDate: Date;
    endDate: Date;
    occupancy: number;
    title: string;
    subtitle: string;
    description: string;
    bgColor: string;
  }>;
}

interface CalendarSchedulerProps {
  initialBookings: BookingData[];
}

export function CalendarScheduler({ initialBookings }: CalendarSchedulerProps) {
  const [bookings, setBookings] = useState<BookingData[]>(initialBookings);
  const [isLoading, setIsLoading] = useState(false);
  const [filterButtonState, setFilterButtonState] = useState(0);
  const [range, setRange] = useState({
    startDate: dayjs().startOf("month").toDate(),
    endDate: dayjs().endOf("month").toDate(),
  });

  const fetchBookings = useCallback(async () => {
    setIsLoading(true);
    try {
      // Fetch local bookings
      const localResponse = await fetch("/api/admin/bookings");
      if (!localResponse.ok) throw new Error("Failed to fetch local bookings");
      const localData = await localResponse.json();
      
      // Fetch Airbnb bookings
      let airbnbData: BookingData[] = [];
      try {
        const airbnbResponse = await fetch("/api/admin/airbnb-calendar");
        if (airbnbResponse.ok) {
          airbnbData = await airbnbResponse.json();
        } else {
          console.warn("Failed to fetch Airbnb bookings:", airbnbResponse.status);
        }
      } catch (airbnbError) {
        console.warn("Error fetching Airbnb bookings:", airbnbError);
      }
      
      // Combine and sort all bookings
      const allBookings = [...localData, ...airbnbData].sort(
        (a, b) => new Date(a.checkIn).getTime() - new Date(b.checkIn).getTime()
      );
      
      setBookings(allBookings);
      toast.success(`Loaded ${localData.length} local and ${airbnbData.length} Airbnb bookings`);
    } catch (error) {
      console.error("Error fetching bookings:", error);
      toast.error("Failed to load bookings");
    } finally {
      setIsLoading(false);
    }
  }, []);

  const handleRangeChange = useCallback((newRange: { startDate: Date; endDate: Date }) => {
    setRange(newRange);
  }, []);

  // Transform booking data to scheduler format
  const transformBookingsToSchedulerData = useCallback((): SchedulerData[] => {
    const propertyGroups = new Map<string, BookingData[]>();
    
    // Group bookings by property and source
    bookings.forEach((booking) => {
      const isAirbnb = booking.source === "airbnb";
      const propertyName = booking.property?.name || "Activity Only";
      const propertyKey = isAirbnb ? `${propertyName} (Airbnb)` : propertyName;
      
      if (!propertyGroups.has(propertyKey)) {
        propertyGroups.set(propertyKey, []);
      }
      propertyGroups.get(propertyKey)!.push(booking);
    });

    // Convert to scheduler data format
    return Array.from(propertyGroups.entries()).map(([propertyName, propertyBookings]) => ({
      id: propertyName.toLowerCase().replace(/\s+/g, "-"),
      label: {
        icon: "https://picsum.photos/24",
        title: propertyName,
        subtitle: `${propertyBookings.length} booking${propertyBookings.length !== 1 ? "s" : ""}`,
      },
      data: propertyBookings.map((booking) => {
        const isAirbnb = booking.source === "airbnb";
        return {
          id: booking.id,
          startDate: new Date(booking.checkIn),
          endDate: new Date(booking.checkOut),
          occupancy: dayjs(booking.checkOut).diff(dayjs(booking.checkIn), "hour"),
          title: `${booking.guest.name} (${booking.adults + booking.children} guests)${isAirbnb ? ' - Airbnb' : ''}`,
          subtitle: isAirbnb ? 'Airbnb Booking' : `$${booking.totalPrice}`,
          description: `Status: ${booking.status} | Email: ${booking.guest.email} | Source: ${isAirbnb ? 'Airbnb' : 'Local'}`,
          bgColor: isAirbnb ? getAirbnbColor() : getStatusColor(booking.status),
        };
      }),
    }));
  }, [bookings]);

  // Filter bookings based on date range
  const filteredSchedulerData = transformBookingsToSchedulerData().map((property) => ({
    ...property,
    data: property.data.filter(
      (booking) =>
        dayjs(booking.startDate).isBetween(range.startDate, range.endDate) ||
        dayjs(booking.endDate).isBetween(range.startDate, range.endDate) ||
        (dayjs(booking.startDate).isBefore(range.startDate, "day") &&
          dayjs(booking.endDate).isAfter(range.endDate, "day"))
    ),
  }));

  const handleTileClick = (clickedResource: any) => {
    console.log("Booking clicked:", clickedResource);
    toast.info(`Booking: ${clickedResource.title}`);
  };

  const handleItemClick = (item: any) => {
    console.log("Property clicked:", item);
    toast.info(`Property: ${item.label.title}`);
  };

  return (
    <div className="space-y-6">

      {/* Stats Cards */}
      {/*<div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Bookings</CardTitle>
            <CalendarIcon className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{bookings.length}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Confirmed</CardTitle>
            <Badge variant="default" className="h-4 w-4 p-0" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {bookings.filter((b) => b.status === "CONFIRMED").length}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pending</CardTitle>
            <Badge variant="secondary" className="h-4 w-4 p-0" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {bookings.filter((b) => b.status === "PENDING").length}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Revenue</CardTitle>
            <Badge variant="outline" className="h-4 w-4 p-0" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              ${bookings.reduce((sum, b) => sum + Number(b.totalPrice), 0).toLocaleString()}
            </div>
          </CardContent>
        </Card>
      </div>*/}

      {/* Scheduler */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <CalendarIcon className="h-5 w-5" />
              Booking Schedule
            </CardTitle>
            <Button
              variant="outline"
              size="sm"
              onClick={fetchBookings}
              disabled={isLoading}
            >
              <RefreshCwIcon className="h-4 w-4 mr-2" />
              Refresh
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="relative h-[600px]">
            <Scheduler
              data={filteredSchedulerData}
              isLoading={isLoading}
              onRangeChange={handleRangeChange}
              onTileClick={handleTileClick}
              onItemClick={handleItemClick}
              onFilterData={() => {
                setFilterButtonState(1);
                toast.info("Filters applied");
              }}
              onClearFilterData={() => {
                setFilterButtonState(0);
                toast.info("Filters cleared");
              }}
              config={{
                zoom: 0, // Week view
                filterButtonState,
                maxRecordsPerPage: 50,
                lang: "en",
                showTooltip: true,
                showThemeToggle: false,
                defaultTheme: "light",
              }}
            />
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

// Helper function to get status colors
function getStatusColor(status: string): string {
  switch (status) {
    case "CONFIRMED":
      return "rgb(34, 197, 94)"; // green
    case "PENDING":
      return "rgb(251, 191, 36)"; // yellow
    case "CANCELLED":
      return "rgb(239, 68, 68)"; // red
    case "COMPLETED":
      return "rgb(59, 130, 246)"; // blue
    default:
      return "rgb(156, 163, 175)"; // gray
  }
}

// Helper function to get Airbnb color
function getAirbnbColor(): string {
  return "rgb(255, 90, 95)"; // Airbnb brand color (coral/pink)
}