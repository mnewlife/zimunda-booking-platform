'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { headers } from 'next/headers';
import { auth } from '@/lib/auth';
import prisma from '@/lib/prisma';
import { PropertyType, PropertyStatus } from '@prisma/client';
import { z } from 'zod';

const propertySchema = z.object({
  name: z.string().min(1, 'Property name is required').max(100, 'Name too long'),
  type: z.enum(['COTTAGE', 'CABIN']),
  description: z.string().min(10, 'Description must be at least 10 characters'),
  maxOccupancy: z.number().min(1, 'Must accommodate at least 1 person').max(20, 'Maximum 20 people'),
  basePrice: z.number().min(1, 'Base price must be greater than 0'),
  status: z.enum(['ACTIVE', 'INACTIVE', 'MAINTENANCE']),
  airbnbCalendarUrl: z.string().url('Must be a valid URL').optional().or(z.literal('')),
  location: z.object({
    address: z.string().min(1, 'Address is required'),
    city: z.string().min(1, 'City is required'),
    country: z.string().min(1, 'Country is required'),
    latitude: z.number().optional(),
    longitude: z.number().optional(),
  }),
  policies: z.object({
    checkIn: z.string().min(1, 'Check-in time is required'),
    checkOut: z.string().min(1, 'Check-out time is required'),
    cancellation: z.string().min(1, 'Cancellation policy is required'),
    smoking: z.boolean().default(false),
    pets: z.boolean().default(false),
    parties: z.boolean().default(false),
  }),
  rules: z.array(z.string()).default([]),
  amenityIds: z.array(z.string()).default([]),
  images: z.array(z.object({
    url: z.string().url('Invalid image URL'),
    alt: z.string().optional(),
    caption: z.string().optional(),
  })).default([]),
});

type PropertyInput = z.infer<typeof propertySchema>;

// Helper function to generate slug from name
function generateSlug(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '');
}

// Helper function to ensure unique slug
async function ensureUniqueSlug(baseSlug: string, excludeId?: string): Promise<string> {
  let slug = baseSlug;
  let counter = 1;

  while (true) {
    const existing = await prisma.property.findUnique({
      where: { slug },
      select: { id: true },
    });

    if (!existing || (excludeId && existing.id === excludeId)) {
      return slug;
    }

    slug = `${baseSlug}-${counter}`;
    counter++;
  }
}

export async function createProperty(data: PropertyInput) {
  const session = await auth.api.getSession({
    headers: await headers(),
  });
  
  if (!session?.user || (session.user as any).role !== 'ADMIN') {
    throw new Error('Unauthorized');
  }

  try {
    // Validate input
    const validatedData = propertySchema.parse(data);
    
    // Generate unique slug
    const baseSlug = generateSlug(validatedData.name);
    const slug = await ensureUniqueSlug(baseSlug);

    // Create property with transaction
    const property = await prisma.$transaction(async (tx) => {
      // Create the property
      const newProperty = await tx.property.create({
        data: {
          name: validatedData.name,
          type: validatedData.type as PropertyType,
          slug,
          description: validatedData.description,
          maxOccupancy: validatedData.maxOccupancy,
          basePrice: validatedData.basePrice,
          status: validatedData.status as PropertyStatus,
          airbnbCalendarUrl: validatedData.airbnbCalendarUrl || null,
          location: validatedData.location,
          policies: validatedData.policies,
          rules: validatedData.rules,
        },
      });

      // Create images if provided
      if (validatedData.images.length > 0) {
        await tx.image.createMany({
          data: validatedData.images.map((image, index) => ({
            url: image.url,
            alt: image.alt || '',
            caption: image.caption || '',
            order: index,
            propertyId: newProperty.id,
          })),
        });
      }

      // Create amenity associations if provided
      if (validatedData.amenityIds.length > 0) {
        // First, ensure amenities exist or create them
        for (const amenityId of validatedData.amenityIds) {
          await tx.amenity.upsert({
            where: { id: amenityId },
            update: {},
            create: {
              id: amenityId,
              name: amenityId.charAt(0).toUpperCase() + amenityId.slice(1),
              icon: '🏠',
              isGlobal: true,
            },
          });
        }

        // Create property-amenity associations
        await tx.propertyAmenity.createMany({
          data: validatedData.amenityIds.map((amenityId) => ({
            propertyId: newProperty.id,
            amenityId,
          })),
        });
      }

      return newProperty;
    });

    revalidatePath('/admin/properties');
    revalidatePath('/admin');
    revalidatePath('/properties');
    
    return property;
  } catch (error) {
    console.error('Error creating property:', error);
    throw new Error('Failed to create property');
  }
}

export async function updateProperty(propertyId: string, data: PropertyInput) {
  const session = await auth.api.getSession({
    headers: await headers(),
  });
  
  if (!session?.user || (session.user as any).role !== 'ADMIN') {
    throw new Error('Unauthorized');
  }

  try {
    // Validate input
    const validatedData = propertySchema.parse(data);
    
    // Check if property exists
    const existingProperty = await prisma.property.findUnique({
      where: { id: propertyId },
      select: { id: true, name: true, slug: true },
    });

    if (!existingProperty) {
      throw new Error('Property not found');
    }

    // Generate unique slug if name changed
    let slug = existingProperty.slug;
    if (validatedData.name !== existingProperty.name) {
      const baseSlug = generateSlug(validatedData.name);
      slug = await ensureUniqueSlug(baseSlug, propertyId);
    }

    // Update property with transaction
    const property = await prisma.$transaction(async (tx) => {
      // Update the property
      const updatedProperty = await tx.property.update({
        where: { id: propertyId },
        data: {
          name: validatedData.name,
          type: validatedData.type as PropertyType,
          slug,
          description: validatedData.description,
          maxOccupancy: validatedData.maxOccupancy,
          basePrice: validatedData.basePrice,
          status: validatedData.status as PropertyStatus,
          airbnbCalendarUrl: validatedData.airbnbCalendarUrl || null,
          location: validatedData.location,
          policies: validatedData.policies,
          rules: validatedData.rules,
        },
      });

      // Delete existing images and create new ones
      await tx.image.deleteMany({
        where: { propertyId },
      });

      if (validatedData.images.length > 0) {
        await tx.image.createMany({
          data: validatedData.images.map((image, index) => ({
            url: image.url,
            alt: image.alt || '',
            caption: image.caption || '',
            order: index,
            propertyId,
          })),
        });
      }

      // Delete existing amenity associations and create new ones
      await tx.propertyAmenity.deleteMany({
        where: { propertyId },
      });

      if (validatedData.amenityIds.length > 0) {
        // Ensure amenities exist
        for (const amenityId of validatedData.amenityIds) {
          await tx.amenity.upsert({
            where: { id: amenityId },
            update: {},
            create: {
              id: amenityId,
              name: amenityId.charAt(0).toUpperCase() + amenityId.slice(1),
              icon: '🏠',
              isGlobal: true,
            },
          });
        }

        // Create new property-amenity associations
        await tx.propertyAmenity.createMany({
          data: validatedData.amenityIds.map((amenityId) => ({
            propertyId,
            amenityId,
          })),
        });
      }

      return updatedProperty;
    });

    revalidatePath('/admin/properties');
    revalidatePath('/admin');
    revalidatePath('/properties');
    revalidatePath(`/properties/${slug}`);
    
    return property;
  } catch (error) {
    console.error('Error updating property:', error);
    throw new Error('Failed to update property');
  }
}

export async function deleteProperty(propertyId: string) {
  const session = await auth.api.getSession({
    headers: await headers(),
  });
  
  if (!session?.user || (session.user as any).role !== 'ADMIN') {
    throw new Error('Unauthorized');
  }

  try {
    // Check if property exists
    const existingProperty = await prisma.property.findUnique({
      where: { id: propertyId },
      select: { 
        id: true, 
        name: true,
        _count: {
          select: {
            bookings: {
              where: {
                status: { in: ['PENDING', 'CONFIRMED'] },
              },
            },
          },
        },
      },
    });

    if (!existingProperty) {
      throw new Error('Property not found');
    }

    // Check for active bookings
    if (existingProperty._count.bookings > 0) {
      throw new Error('Cannot delete property with active bookings');
    }

    // Delete property and all related data (cascade will handle most relations)
    await prisma.property.delete({
      where: { id: propertyId },
    });

    revalidatePath('/admin/properties');
    revalidatePath('/admin');
    revalidatePath('/properties');
    
    return { success: true };
  } catch (error) {
    console.error('Error deleting property:', error);
    if (error instanceof Error) {
      throw error;
    }
    throw new Error('Failed to delete property');
  }
}

export async function togglePropertyStatus(propertyId: string, status: PropertyStatus) {
  const session = await auth.api.getSession({
    headers: await headers(),
  });
  
  if (!session?.user || (session.user as any).role !== 'ADMIN') {
    throw new Error('Unauthorized');
  }

  try {
    const property = await prisma.property.update({
      where: { id: propertyId },
      data: { status },
      select: { id: true, name: true, status: true },
    });

    revalidatePath('/admin/properties');
    revalidatePath('/admin');
    revalidatePath('/properties');
    
    return property;
  } catch (error) {
    console.error('Error updating property status:', error);
    throw new Error('Failed to update property status');
  }
}

export async function duplicateProperty(propertyId: string) {
  const session = await auth.api.getSession({
    headers: await headers(),
  });
  
  if (!session?.user || (session.user as any).role !== 'ADMIN') {
    throw new Error('Unauthorized');
  }

  try {
    // Get the original property with all related data
    const originalProperty = await prisma.property.findUnique({
      where: { id: propertyId },
      include: {
        images: true,
        amenities: {
          include: {
            amenity: true,
          },
        },
      },
    });

    if (!originalProperty) {
      throw new Error('Property not found');
    }

    // Generate unique slug for the duplicate
    const baseSlug = generateSlug(`${originalProperty.name} Copy`);
    const slug = await ensureUniqueSlug(baseSlug);

    // Create duplicate property
    const duplicateProperty = await prisma.$transaction(async (tx) => {
      // Create the duplicate property
      const newProperty = await tx.property.create({
        data: {
          name: `${originalProperty.name} (Copy)`,
          type: originalProperty.type,
          slug,
          description: originalProperty.description,
          maxOccupancy: originalProperty.maxOccupancy,
          basePrice: originalProperty.basePrice,
          status: 'INACTIVE', // Set as inactive by default
          location: originalProperty.location,
          policies: originalProperty.policies,
          rules: originalProperty.rules,
        },
      });

      // Duplicate images
      if (originalProperty.images.length > 0) {
        await tx.image.createMany({
          data: originalProperty.images.map((image) => ({
            url: image.url,
            alt: image.alt,
            caption: image.caption,
            order: image.order,
            propertyId: newProperty.id,
          })),
        });
      }

      // Duplicate amenity associations
      if (originalProperty.amenities.length > 0) {
        await tx.propertyAmenity.createMany({
          data: originalProperty.amenities.map((amenity) => ({
            propertyId: newProperty.id,
            amenityId: amenity.amenityId,
          })),
        });
      }

      return newProperty;
    });

    revalidatePath('/admin/properties');
    revalidatePath('/admin');
    
    return duplicateProperty;
  } catch (error) {
    console.error('Error duplicating property:', error);
    throw new Error('Failed to duplicate property');
  }
}