import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import prisma from '@/lib/prisma';
import { ActivityType } from '@prisma/client';
import { z } from 'zod';
import { headers } from 'next/headers';

// Validation schema for activity creation/update
const activitySchema = z.object({
  name: z.string().min(1, 'Activity name is required'),
  type: z.nativeEnum(ActivityType),
  description: z.string().min(10, 'Description must be at least 10 characters'),
  duration: z.number().int().positive('Duration must be positive'),
  price: z.number().min(0, 'Price must be non-negative'),
  capacity: z.number().int().positive('Capacity must be positive'),
  maxParticipants: z.number().int().positive('Max participants must be positive'),
  location: z.string().min(1, 'Location is required'),
  bookable: z.boolean().default(true),
  requirements: z.array(z.string()).optional(),
  availability: z.object({
    days: z.array(z.string()),
    timeSlots: z.array(z.object({
      start: z.string(),
      end: z.string()
    }))
  }).optional(),
});

// Helper function to generate slug from name
function generateSlug(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '');
}

// GET /api/activities - Get all activities with filtering
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    
    // Parse query parameters
    const type = searchParams.get('type');
    const minPrice = searchParams.get('minPrice');
    const maxPrice = searchParams.get('maxPrice');
    const duration = searchParams.get('duration');
    const location = searchParams.get('location');
    const date = searchParams.get('date');
    const participants = searchParams.get('participants');
    const limit = parseInt(searchParams.get('limit') || '12');
    const offset = parseInt(searchParams.get('offset') || '0');
    const sortBy = searchParams.get('sortBy') || 'createdAt';
    const sortOrder = searchParams.get('sortOrder') || 'desc';
    const featured = searchParams.get('featured') === 'true';
    // Build where clause
    const where: any = {};

    if (type && type !== 'all') {
      where.type = type;
    }

    if (minPrice || maxPrice) {
      where.price = {};
      if (minPrice) where.price.gte = parseFloat(minPrice);
      if (maxPrice) where.price.lte = parseFloat(maxPrice);
    }

    if (duration) {
      const durationNum = parseFloat(duration);
      where.duration = {
        lte: durationNum,
      };
    }

    if (participants) {
      const participantCount = parseInt(participants);
      where.capacity = {
        gte: participantCount,
      };
    }

    // Remove location and featured filters as they don't exist in the model

    // Check availability if date is provided
    if (date && participants) {
      const activityDate = new Date(date);
      const participantCount = parseInt(participants);
      
      // Find activities that don't have conflicting bookings or have enough capacity
      const unavailableActivityIds = await prisma.activityBooking.findMany({
        where: {
          date: activityDate,
          status: { in: ['CONFIRMED', 'PENDING'] },
        },
        select: {
          activityId: true,
          participants: true,
        },
      }).then(bookings => {
        const activityCapacity: { [key: string]: number } = {};
        
        bookings.forEach(booking => {
          if (booking.activityId) {
            activityCapacity[booking.activityId] = 
              (activityCapacity[booking.activityId] || 0) + booking.participants;
          }
        });
        
        return Object.keys(activityCapacity);
      });

      if (unavailableActivityIds.length > 0) {
        // We'll check capacity in the final result filtering
        // For now, we don't exclude any activities from the query
      }
    }

    // Build order by clause
    const orderBy: any = {};
    if (sortBy === 'price') {
      orderBy.price = sortOrder;
    } else if (sortBy === 'name') {
      orderBy.name = sortOrder;
    } else if (sortBy === 'duration') {
      orderBy.duration = sortOrder;
    } else {
      orderBy.createdAt = sortOrder;
    }

    // Fetch activities
    const activities = await prisma.activity.findMany({
      where,
      orderBy,
      take: limit,
      skip: offset,
      include: {
        _count: {
          select: {
            bookings: {
              where: {
                status: 'CONFIRMED',
              },
            },
          },
        },
      },
    });

    // Get total count for pagination
    const total = await prisma.activity.count({ where });

    // Calculate availability status for each activity
    let activitiesWithAvailability = activities;
    
    if (date && participants) {
      const activityDate = new Date(date);
      const participantCount = parseInt(participants);
      
      // Get current bookings for the date
      const dateBookings = await prisma.activityBooking.findMany({
        where: {
          date: activityDate,
          status: { in: ['CONFIRMED', 'PENDING'] },
          activityId: { in: activities.map(a => a.id) },
        },
        select: {
          activityId: true,
          participants: true,
        },
      });
      
      const activityCapacity: { [key: string]: number } = {};
      dateBookings.forEach(booking => {
        if (booking.activityId) {
          activityCapacity[booking.activityId] = 
            (activityCapacity[booking.activityId] || 0) + booking.participants;
        }
      });
      
      activitiesWithAvailability = activities.map(activity => {
        const bookedParticipants = activityCapacity[activity.id] || 0;
        const availableSpots = activity.capacity - bookedParticipants;
        
        return {
          ...activity,
          isAvailable: availableSpots >= participantCount,
          availableSpots,
          totalBookings: activity._count.bookings,
        };
      }).filter(activity => activity.isAvailable);
    } else {
      activitiesWithAvailability = activities.map(activity => ({
        ...activity,
        isAvailable: undefined,
        availableSpots: activity.capacity,
        totalBookings: activity._count.bookings,
      }));
    }

    return NextResponse.json({
      activities: activitiesWithAvailability,
      pagination: {
        total: activitiesWithAvailability.length,
        limit,
        offset,
        hasMore: offset + limit < activitiesWithAvailability.length,
      },
      filters: {
        type,
        minPrice,
        maxPrice,
        duration,
        location,
        date,
        participants,
        sortBy,
        sortOrder,
        featured,
      },
    });
  } catch (error) {
    console.error('Error fetching activities:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// POST /api/activities - Create a new activity (admin only)
export async function POST(request: NextRequest) {
  try {
    const session = await auth.api.getSession({
      headers: await headers(),
    });

    if (!session || session.user.role !== 'ADMIN') {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const body = await request.json();
    console.log('Received body:', JSON.stringify(body, null, 2));
    
    const validatedData = activitySchema.parse(body);
    console.log('Validation successful:', JSON.stringify(validatedData, null, 2));

    // Generate unique slug
    let baseSlug = generateSlug(validatedData.name);
    let slug = baseSlug;
    let counter = 1;

    // Ensure slug is unique
    while (await prisma.activity.findUnique({ where: { slug } })) {
      slug = `${baseSlug}-${counter}`;
      counter++;
    }

    // Check if name is unique
    const existingActivity = await prisma.activity.findUnique({
      where: { name: validatedData.name },
    });

    if (existingActivity) {
      return NextResponse.json(
        { error: 'Activity name already exists' },
        { status: 409 }
      );
    }

    // Create activity
    const activity = await prisma.activity.create({
      data: {
        ...validatedData,
        slug,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    });

    return NextResponse.json({ activity }, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Validation error', details: error.errors },
        { status: 400 }
      );
    }

    console.error('Error creating activity:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// PUT /api/activities - Update activity (admin only)
export async function PUT(request: NextRequest) {
  try {
    const session = await auth.api.getSession({
      headers: await headers(),
    });

    if (!session || session.user.role !== 'ADMIN') {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const body = await request.json();
    const { id, ...updateData } = body;

    if (!id) {
      return NextResponse.json(
        { error: 'Activity ID is required' },
        { status: 400 }
      );
    }

    // Validate update data (partial)
    const partialSchema = activitySchema.partial();
    const validatedData = partialSchema.parse(updateData);

    // Check if activity exists
    const existingActivity = await prisma.activity.findUnique({
      where: { id },
    });

    if (!existingActivity) {
      return NextResponse.json(
        { error: 'Activity not found' },
        { status: 404 }
      );
    }

    // Check if name is unique (if being updated)
    if (validatedData.name && validatedData.name !== existingActivity.name) {
      const nameExists = await prisma.activity.findUnique({
        where: { name: validatedData.name },
      });

      if (nameExists) {
        return NextResponse.json(
          { error: 'Activity name already exists' },
          { status: 409 }
        );
      }
    }

    // Update activity
    const activity = await prisma.activity.update({
      where: { id },
      data: {
        ...validatedData,
        updatedAt: new Date(),
      },
    });

    return NextResponse.json({ activity });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Validation error', details: error.errors },
        { status: 400 }
      );
    }

    console.error('Error updating activity:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// DELETE /api/activities - Delete activity (admin only)
export async function DELETE(request: NextRequest) {
  try {
    const session = await auth.api.getSession({
      headers: await headers(),
    });

    if (!session || session.user.role !== 'ADMIN') {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json(
        { error: 'Activity ID is required' },
        { status: 400 }
      );
    }

    // Check if activity exists
    const existingActivity = await prisma.activity.findUnique({
      where: { id },
      include: {
        _count: {
          select: {
            bookings: {
              where: {
                status: { in: ['CONFIRMED', 'PENDING'] },
              },
            },
          },
        },
      },
    });

    if (!existingActivity) {
      return NextResponse.json(
        { error: 'Activity not found' },
        { status: 404 }
      );
    }

    // Check if activity has active bookings
    if (existingActivity._count.bookings > 0) {
      return NextResponse.json(
        { error: 'Cannot delete activity with active bookings' },
        { status: 409 }
      );
    }

    // Delete the activity
    await prisma.activity.delete({
      where: { id },
    });

    return NextResponse.json({ 
      message: 'Activity deleted successfully'
    });
  } catch (error) {
    console.error('Error deleting activity:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}