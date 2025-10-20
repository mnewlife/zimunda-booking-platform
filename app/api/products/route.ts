import { NextRequest, NextResponse } from 'next/server';
import { headers } from 'next/headers';
import { z } from 'zod';
import { auth } from '@/lib/auth';
import prisma from '@/lib/prisma';

// Product validation schema
const productSchema = z.object({
  name: z.string().min(1, 'Product name is required'),
  category: z.enum(['COFFEE', 'MERCHANDISE', 'FOOD', 'BEVERAGES']),
  description: z.string().min(1, 'Description is required'),
  price: z.number().positive('Price must be positive'),
  inventory: z.number().int().min(0, 'Inventory cannot be negative'),
  images: z.array(z.object({
    url: z.string().url(),
    alt: z.string().optional(),
    caption: z.string().optional(),
    order: z.number().int().default(0),
  })).optional(),
});

// GET /api/products - Fetch products with filtering and pagination
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const category = searchParams.get('category');
    const search = searchParams.get('search');
    const limit = parseInt(searchParams.get('limit') || '12');
    const offset = parseInt(searchParams.get('offset') || '0');
    const sortBy = searchParams.get('sortBy') || 'createdAt';
    const sortOrder = searchParams.get('sortOrder') || 'desc';
    const inStock = searchParams.get('inStock') === 'true';

    // Build where clause
    const where: any = {};

    if (category && category !== 'all') {
      where.category = category;
    }

    if (search) {
      where.OR = [
        {
          name: {
            contains: search,
            mode: 'insensitive',
          },
        },
        {
          description: {
            contains: search,
            mode: 'insensitive',
          },
        },
      ];
    }

    if (inStock) {
      where.inventory = {
        gt: 0,
      };
    }

    // Build order by clause
    const orderBy: any = {};
    if (sortBy === 'price') {
      orderBy.price = sortOrder;
    } else if (sortBy === 'name') {
      orderBy.name = sortOrder;
    } else if (sortBy === 'inventory') {
      orderBy.inventory = sortOrder;
    } else {
      orderBy.createdAt = sortOrder;
    }

    // Fetch products
    const products = await prisma.product.findMany({
      where,
      orderBy,
      take: limit,
      skip: offset,
      include: {
        images: {
          orderBy: {
            order: 'asc',
          },
        },
        variants: {
          orderBy: {
            createdAt: 'asc',
          },
        },
        _count: {
          select: {
            orders: true,
          },
        },
      },
    });

    // Get total count for pagination
    const total = await prisma.product.count({ where });

    return NextResponse.json({
      products,
      pagination: {
        total,
        limit,
        offset,
        hasMore: offset + limit < total,
      },
      filters: {
        category,
        search,
        sortBy,
        sortOrder,
        inStock,
      },
    });
  } catch (error) {
    console.error('Error fetching products:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// POST /api/products - Create a new product (admin only)
export async function POST(request: NextRequest) {
  try {
    const session = await auth.api.getSession({
      headers: await headers(),
    });

    if (!session || !['ADMIN', 'MANAGER'].includes(session.user.role)) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const body = await request.json();
    const validatedData = productSchema.parse(body);

    // Check if product name is unique
    const existingProduct = await prisma.product.findUnique({
      where: { name: validatedData.name },
    });

    if (existingProduct) {
      return NextResponse.json(
        { error: 'Product name already exists' },
        { status: 409 }
      );
    }

    // Create product with images
    const product = await prisma.product.create({
      data: {
        name: validatedData.name,
        category: validatedData.category,
        description: validatedData.description,
        price: validatedData.price,
        inventory: validatedData.inventory,
        images: validatedData.images ? {
          create: validatedData.images,
        } : undefined,
      },
      include: {
        images: true,
        variants: true,
      },
    });

    return NextResponse.json({ product }, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Validation error', details: error.errors },
        { status: 400 }
      );
    }

    console.error('Error creating product:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// PUT /api/products - Update a product (admin only)
export async function PUT(request: NextRequest) {
  try {
    const session = await auth.api.getSession({
      headers: await headers(),
    });

    if (!session || !['ADMIN', 'MANAGER'].includes(session.user.role)) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const body = await request.json();
    const { id, ...updateData } = body;

    if (!id) {
      return NextResponse.json(
        { error: 'Product ID is required' },
        { status: 400 }
      );
    }

    const validatedData = productSchema.partial().parse(updateData);

    // Check if product exists
    const existingProduct = await prisma.product.findUnique({
      where: { id },
    });

    if (!existingProduct) {
      return NextResponse.json(
        { error: 'Product not found' },
        { status: 404 }
      );
    }

    // Update product
    const product = await prisma.product.update({
      where: { id },
      data: validatedData,
      include: {
        images: true,
        variants: true,
      },
    });

    return NextResponse.json({ product });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Validation error', details: error.errors },
        { status: 400 }
      );
    }

    console.error('Error updating product:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// DELETE /api/products - Delete a product (admin only)
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
        { error: 'Product ID is required' },
        { status: 400 }
      );
    }

    // Check if product exists
    const existingProduct = await prisma.product.findUnique({
      where: { id },
    });

    if (!existingProduct) {
      return NextResponse.json(
        { error: 'Product not found' },
        { status: 404 }
      );
    }

    // Delete product (cascade will handle related records)
    await prisma.product.delete({
      where: { id },
    });

    return NextResponse.json({ message: 'Product deleted successfully' });
  } catch (error) {
    console.error('Error deleting product:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}