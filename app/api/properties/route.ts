import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { z } from 'zod';
import { headers } from 'next/headers';

// Validation schema for property creation/update
const propertySchema = z.object({
  name: z.string().min(1, 'Property name is required'),
  slug: z.string().min(1, 'Property slug is required'),
  description: z.string().min(1, 'Description is required'),
  longDescription: z.string().optional(),
  type: z.enum(['lodge', 'cottage', 'villa', 'cabin', 'tent']),
  location: z.string().min(1, 'Location is required'),
  pricePerNight: z.number().positive('Price must be positive'),
  cleaningFee: z.number().min(0).optional(),
  serviceFee: z.number().min(0).optional(),
  maxOccupancy: z.number().int().positive('Max occupancy must be positive'),
  bedrooms: z.number().int().min(0),
  bathrooms: z.number().min(0),
  area: z.number().positive().optional(),
  images: z.array(z.string().url()).min(1, 'At least one image is required'),
  amenities: z.array(z.string()).optional(),
  features: z.array(z.string()).optional(),
  houseRules: z.array(z.string()).optional(),
  checkInTime: z.string().optional(),
  checkOutTime: z.string().optional(),
  cancellationPolicy: z.string().optional(),
  isActive: z.boolean().optional(),
  coordinates: z.object({
    lat: z.number(),
    lng: z.number(),
  }).optional(),
});

// GET /api/properties - Get all properties with filtering
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    
    // Parse query parameters
    const type = searchParams.get('type');
    const minPrice = searchParams.get('minPrice');
    const maxPrice = searchParams.get('maxPrice');
    const guests = searchParams.get('guests');
    const amenities = searchParams.get('amenities')?.split(',').filter(Boolean);
    const location = searchParams.get('location');
    const checkIn = searchParams.get('checkIn');
    const checkOut = searchParams.get('checkOut');
    const limit = parseInt(searchParams.get('limit') || '12');
    const offset = parseInt(searchParams.get('offset') || '0');
    const sortBy = searchParams.get('sortBy') || 'createdAt';
    const sortOrder = searchParams.get('sortOrder') || 'desc';
    const featured = searchParams.get('featured') === 'true';
    const status = searchParams.get('status') || 'ACTIVE';

    // Build where clause
    const where: any = {
      status: status !== 'all' ? status : undefined,
    };

    // Remove undefined values
    Object.keys(where).forEach(key => where[key] === undefined && delete where[key]);

    if (type && type !== 'all') {
      where.type = type;
    }

    if (minPrice || maxPrice) {
      where.pricePerNight = {};
      if (minPrice) where.pricePerNight.gte = parseFloat(minPrice);
      if (maxPrice) where.pricePerNight.lte = parseFloat(maxPrice);
    }

    if (guests) {
      where.maxOccupancy = {
        gte: parseInt(guests),
      };
    }

    if (amenities && amenities.length > 0) {
      where.amenities = {
        hasEvery: amenities,
      };
    }

    if (location) {
      where.location = {
        contains: location,
        mode: 'insensitive',
      };
    }

    if (featured) {
      where.isFeatured = true;
    }

    // Check availability if dates are provided
    if (checkIn && checkOut) {
      const checkInDate = new Date(checkIn);
      const checkOutDate = new Date(checkOut);
      
      // Find properties that don't have conflicting bookings
      const unavailablePropertyIds = await prisma.booking.findMany({
        where: {
          status: { in: ['CONFIRMED', 'PENDING'] },
          OR: [
            {
              checkIn: {
                lte: checkOutDate,
              },
              checkOut: {
                gte: checkInDate,
              },
            },
          ],
        },
        select: {
          propertyId: true,
        },
      }).then(bookings => 
        bookings
          .map(b => b.propertyId)
          .filter((id): id is string => id !== null)
      );

      if (unavailablePropertyIds.length > 0) {
        where.id = {
          notIn: unavailablePropertyIds,
        };
      }
    }

    // Build order by clause
    const orderBy: any = {};
    if (sortBy === 'price') {
      orderBy.pricePerNight = sortOrder;
    } else if (sortBy === 'name') {
      orderBy.name = sortOrder;
    } else {
      orderBy.createdAt = sortOrder;
    }

    // Fetch properties
    const properties = await prisma.property.findMany({
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
    const total = await prisma.property.count({ where });

    // Calculate availability status for each property
    const propertiesWithAvailability = properties.map(property => ({
      ...property,
      isAvailable: checkIn && checkOut ? true : undefined, // Already filtered above
      totalBookings: property._count.bookings,
    }));

    return NextResponse.json({
      properties: propertiesWithAvailability,
      pagination: {
        total,
        limit,
        offset,
        hasMore: offset + limit < total,
      },
      filters: {
        type,
        minPrice,
        maxPrice,
        guests,
        amenities,
        location,
        checkIn,
        checkOut,
        sortBy,
        sortOrder,
        featured,
      },
    });
  } catch (error) {
    console.error('Error fetching properties:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// POST /api/properties - Create a new property (admin only)
export async function POST(request: NextRequest) {
  try {
    const session = await auth.api.getSession({
      headers: await headers(),
    });

    if (!session || session.user.role !== 'admin') {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const body = await request.json();
    const validatedData = propertySchema.parse(body);

    // Check if slug is unique
    const existingProperty = await prisma.property.findUnique({
      where: { slug: validatedData.slug },
    });

    if (existingProperty) {
      return NextResponse.json(
        { error: 'Property slug already exists' },
        { status: 409 }
      );
    }

    // Create property
    const property = await prisma.property.create({
      data: {
        ...validatedData,
        status: validatedData.status || 'ACTIVE',
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    });

    return NextResponse.json({ property }, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Validation error', details: error.errors },
        { status: 400 }
      );
    }

    console.error('Error creating property:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// PUT /api/properties - Update property (admin only)
export async function PUT(request: NextRequest) {
  try {
    const session = await auth.api.getSession({
      headers: await headers(),
    });

    if (!session || session.user.role !== 'admin') {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const body = await request.json();
    const { id, ...updateData } = body;

    if (!id) {
      return NextResponse.json(
        { error: 'Property ID is required' },
        { status: 400 }
      );
    }

    // Validate update data (partial)
    const partialSchema = propertySchema.partial();
    const validatedData = partialSchema.parse(updateData);

    // Check if property exists
    const existingProperty = await prisma.property.findUnique({
      where: { id },
    });

    if (!existingProperty) {
      return NextResponse.json(
        { error: 'Property not found' },
        { status: 404 }
      );
    }

    // Check if slug is unique (if being updated)
    if (validatedData.slug && validatedData.slug !== existingProperty.slug) {
      const slugExists = await prisma.property.findUnique({
        where: { slug: validatedData.slug },
      });

      if (slugExists) {
        return NextResponse.json(
          { error: 'Property slug already exists' },
          { status: 409 }
        );
      }
    }

    // Update property
    const property = await prisma.property.update({
      where: { id },
      data: {
        ...validatedData,
        updatedAt: new Date(),
      },
    });

    return NextResponse.json({ property });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Validation error', details: error.errors },
        { status: 400 }
      );
    }

    console.error('Error updating property:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// DELETE /api/properties - Delete property (admin only)
export async function DELETE(request: NextRequest) {
  try {
    const session = await auth.api.getSession({
      headers: await headers(),
    });

    if (!session || session.user.role !== 'admin') {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json(
        { error: 'Property ID is required' },
        { status: 400 }
      );
    }

    // Check if property exists
    const existingProperty = await prisma.property.findUnique({
      where: { id },
      include: {
        _count: {
          select: {
            bookings: {
              where: {
                status: { in: ['confirmed', 'pending'] },
              },
            },
          },
        },
      },
    });

    if (!existingProperty) {
      return NextResponse.json(
        { error: 'Property not found' },
        { status: 404 }
      );
    }

    // Check if property has active bookings
    if (existingProperty._count.bookings > 0) {
      return NextResponse.json(
        { error: 'Cannot delete property with active bookings' },
        { status: 409 }
      );
    }

    // Soft delete by setting isActive to false
    const property = await prisma.property.update({
      where: { id },
      data: {
        isActive: false,
        updatedAt: new Date(),
      },
    });

    return NextResponse.json({ 
      message: 'Property deactivated successfully',
      property 
    });
  } catch (error) {
    console.error('Error deleting property:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}