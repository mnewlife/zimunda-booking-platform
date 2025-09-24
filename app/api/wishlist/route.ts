import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { headers } from 'next/headers';
import { z } from 'zod';

// Schema for adding to wishlist
const addToWishlistSchema = z.object({
  productId: z.string().min(1, 'Product ID is required'),
  variantId: z.string().optional(),
});

// Schema for removing from wishlist
const removeFromWishlistSchema = z.object({
  productId: z.string().min(1, 'Product ID is required'),
  variantId: z.string().optional(),
});

// GET /api/wishlist - Get user's wishlist
export async function GET(request: NextRequest) {
  try {
    const session = await auth.api.getSession({ headers: await headers() });
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }

    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '12');
    const offset = (page - 1) * limit;

    // Get wishlist items with product and variant details
    const wishlistItems = await prisma.wishlistItem.findMany({
      where: {
        userId: session.user.id,
      },
      include: {
        product: {
          select: {
            id: true,
            name: true,
            slug: true,
            description: true,
            price: true,
            images: true,
            category: true,
            stockQuantity: true,
            isActive: true,
            isFeatured: true,
            rating: true,
            reviewCount: true,
          },
        },
        variant: {
          select: {
            id: true,
            name: true,
            price: true,
            images: true,
            stockQuantity: true,
            isActive: true,
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
      skip: offset,
      take: limit,
    });

    // Get total count for pagination
    const totalCount = await prisma.wishlistItem.count({
      where: {
        userId: session.user.id,
      },
    });

    // Filter out inactive products/variants and format response
    const activeWishlistItems = wishlistItems
      .filter(item => {
        if (!item.product.isActive) return false;
        if (item.variant && !item.variant.isActive) return false;
        return true;
      })
      .map(item => ({
        id: item.id,
        productId: item.product.id,
        variantId: item.variant?.id,
        addedAt: item.createdAt,
        product: {
          ...item.product,
          currentPrice: item.variant?.price || item.product.price,
          currentStock: item.variant?.stockQuantity ?? item.product.stockQuantity,
          currentImages: item.variant?.images || item.product.images,
          variantName: item.variant?.name,
        },
      }));

    const totalPages = Math.ceil(totalCount / limit);

    return NextResponse.json({
      items: activeWishlistItems,
      pagination: {
        page,
        limit,
        totalCount,
        totalPages,
        hasNext: page < totalPages,
        hasPrev: page > 1,
      },
    });
  } catch (error) {
    console.error('Error fetching wishlist:', error);
    return NextResponse.json(
      { error: 'Failed to fetch wishlist' },
      { status: 500 }
    );
  }
}

// POST /api/wishlist - Add item to wishlist
export async function POST(request: NextRequest) {
  try {
    const session = await auth.api.getSession({ headers: await headers() });
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }

    const body = await request.json();
    const { productId, variantId } = addToWishlistSchema.parse(body);

    // Verify product exists and is active
    const product = await prisma.product.findUnique({
      where: {
        id: productId,
        isActive: true,
      },
    });

    if (!product) {
      return NextResponse.json(
        { error: 'Product not found or inactive' },
        { status: 404 }
      );
    }

    // If variant specified, verify it exists and is active
    if (variantId) {
      const variant = await prisma.productVariant.findUnique({
        where: {
          id: variantId,
          productId,
          isActive: true,
        },
      });

      if (!variant) {
        return NextResponse.json(
          { error: 'Product variant not found or inactive' },
          { status: 404 }
        );
      }
    }

    // Check if item already exists in wishlist
    const existingItem = await prisma.wishlistItem.findFirst({
      where: {
        userId: session.user.id,
        productId,
        variantId: variantId || null,
      },
    });

    if (existingItem) {
      return NextResponse.json(
        { message: 'Item already in wishlist' },
        { status: 400 }
      );
    }

    // Add to wishlist
    const wishlistItem = await prisma.wishlistItem.create({
      data: {
        userId: session.user.id,
        productId,
        variantId: variantId || null,
      },
      include: {
        product: {
          select: {
            name: true,
            slug: true,
            price: true,
            images: true,
          },
        },
        variant: {
          select: {
            name: true,
            price: true,
            images: true,
          },
        },
      },
    });

    return NextResponse.json({
      message: 'Item added to wishlist',
      item: {
        id: wishlistItem.id,
        productId: wishlistItem.productId,
        variantId: wishlistItem.variantId,
        product: wishlistItem.product,
        variant: wishlistItem.variant,
        addedAt: wishlistItem.createdAt,
      },
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid request data', details: error.errors },
        { status: 400 }
      );
    }

    console.error('Error adding to wishlist:', error);
    return NextResponse.json(
      { error: 'Failed to add item to wishlist' },
      { status: 500 }
    );
  }
}

// DELETE /api/wishlist - Remove item from wishlist
export async function DELETE(request: NextRequest) {
  try {
    const session = await auth.api.getSession({ headers: await headers() });
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }

    const body = await request.json();
    const { productId, variantId } = removeFromWishlistSchema.parse(body);

    // Find and remove the wishlist item
    const deletedItem = await prisma.wishlistItem.deleteMany({
      where: {
        userId: session.user.id,
        productId,
        variantId: variantId || null,
      },
    });

    if (deletedItem.count === 0) {
      return NextResponse.json(
        { error: 'Item not found in wishlist' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      message: 'Item removed from wishlist',
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid request data', details: error.errors },
        { status: 400 }
      );
    }

    console.error('Error removing from wishlist:', error);
    return NextResponse.json(
      { error: 'Failed to remove item from wishlist' },
      { status: 500 }
    );
  }
}