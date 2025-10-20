import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import prisma from '@/lib/prisma';
import { headers } from 'next/headers';
import { z } from 'zod';

// Schema for adding items to cart
const addToCartSchema = z.object({
  productId: z.string().min(1, 'Product ID is required'),
  variantId: z.string().optional(),
  quantity: z.number().int().min(1, 'Quantity must be at least 1').max(10, 'Maximum quantity is 10'),
});

// Schema for updating cart items
const updateCartSchema = z.object({
  itemId: z.string().min(1, 'Item ID is required'),
  quantity: z.number().int().min(1, 'Quantity must be at least 1').max(10, 'Maximum quantity is 10'),
});

// Schema for removing cart items
const removeFromCartSchema = z.object({
  itemId: z.string().min(1, 'Item ID is required'),
});

// GET /api/cart - Get user's cart items
export async function GET(request: NextRequest) {
  try {
    const session = await auth.api.getSession({
      headers: await headers(),
    });
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }

    const cartItems = await prisma.cartItem.findMany({
      where: {
        userId: session.user.id,
      },
      include: {
        product: {
          select: {
            id: true,
            name: true,
            price: true,
            images: true,
            category: true,
            inventory: true,
          },
        },
        variant: {
          select: {
            id: true,
            name: true,
            price: true,
            inventory: true,
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    return NextResponse.json({
      items: cartItems,
      count: cartItems.length,
    });
  } catch (error) {
    console.error('Error fetching cart:', error);
    return NextResponse.json(
      { error: 'Failed to fetch cart items' },
      { status: 500 }
    );
  }
}

// POST /api/cart - Add item to cart
export async function POST(request: NextRequest) {
  try {
    const session = await auth.api.getSession({
      headers: await headers(),
    });
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }

    const body = await request.json();
    const { productId, variantId, quantity } = addToCartSchema.parse(body);

    // Verify product exists
    const product = await prisma.product.findUnique({
      where: {
        id: productId,
      },
      include: {
        variants: true,
      },
    });

    if (!product) {
      return NextResponse.json(
        { error: 'Product not found or inactive' },
        { status: 404 }
      );
    }

    // If variant is specified, verify it exists and is active
    let variant = null;
    if (variantId) {
      variant = product.variants.find(v => v.id === variantId);
      if (!variant) {
        return NextResponse.json(
          { error: 'Product variant not found or inactive' },
          { status: 404 }
        );
      }
    }

    // Check inventory
    const availableInventory = variant ? variant.inventory : product.inventory;
    if (availableInventory < quantity) {
      return NextResponse.json(
        { 
          error: 'Insufficient inventory',
          available: availableInventory,
        },
        { status: 400 }
      );
    }

    // Check if item already exists in cart
    const existingCartItem = await prisma.cartItem.findFirst({
      where: {
        userId: session.user.id,
        productId,
        variantId: variantId || null,
      },
    });

    if (existingCartItem) {
      // Update quantity if item already exists
      const newQuantity = existingCartItem.quantity + quantity;
      
      if (newQuantity > availableInventory) {
        return NextResponse.json(
          { 
            error: 'Total quantity exceeds available inventory',
            available: availableInventory,
            currentInCart: existingCartItem.quantity,
          },
          { status: 400 }
        );
      }

      if (newQuantity > 10) {
        return NextResponse.json(
          { error: 'Maximum quantity per item is 10' },
          { status: 400 }
        );
      }

      const updatedCartItem = await prisma.cartItem.update({
        where: {
          id: existingCartItem.id,
        },
        data: {
          quantity: newQuantity,
        },
        include: {
          product: {
            select: {
              id: true,
              name: true,
              price: true,
              images: true,
              category: true,
              inventory: true,
            },
          },
          variant: {
            select: {
              id: true,
              name: true,
              price: true,
              inventory: true,
            },
          },
        },
      });

      return NextResponse.json({
        message: 'Cart item updated successfully',
        item: updatedCartItem,
      });
    } else {
      // Create new cart item
      const cartItem = await prisma.cartItem.create({
        data: {
          userId: session.user.id,
          productId,
          variantId: variantId || null,
          quantity,
        },
        include: {
          product: {
            select: {
              id: true,
              name: true,
              price: true,
              images: true,
              category: true,
              inventory: true,
            },
          },
          variant: {
            select: {
              id: true,
              name: true,
              price: true,
              inventory: true,
            },
          },
        },
      });

      return NextResponse.json({
        message: 'Item added to cart successfully',
        item: cartItem,
      }, { status: 201 });
    }
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid request data', details: error.errors },
        { status: 400 }
      );
    }

    console.error('Error adding to cart:', error);
    return NextResponse.json(
      { error: 'Failed to add item to cart' },
      { status: 500 }
    );
  }
}

// PUT /api/cart - Update cart item quantity
export async function PUT(request: NextRequest) {
  try {
    const session = await auth.api.getSession({
      headers: await headers(),
    });
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }

    const body = await request.json();
    const { itemId, quantity } = updateCartSchema.parse(body);

    // Find cart item and verify ownership
    const cartItem = await prisma.cartItem.findFirst({
      where: {
        id: itemId,
        userId: session.user.id,
      },
      include: {
        product: {
          select: {
            inventory: true,
          },
        },
        variant: {
          select: {
            inventory: true,
          },
        },
      },
    });

    if (!cartItem) {
      return NextResponse.json(
        { error: 'Cart item not found' },
        { status: 404 }
      );
    }

    // Check inventory
    const availableInventory = cartItem.variant 
      ? cartItem.variant.inventory 
      : cartItem.product.inventory;

    if (quantity > availableInventory) {
      return NextResponse.json(
        { 
          error: 'Insufficient inventory',
          available: availableInventory,
        },
        { status: 400 }
      );
    }

    // Update cart item
    const updatedCartItem = await prisma.cartItem.update({
      where: {
        id: itemId,
      },
      data: {
        quantity,
      },
      include: {
        product: {
          select: {
            id: true,
            name: true,
            price: true,
            images: true,
            category: true,
            inventory: true,
          },
        },
        variant: {
          select: {
            id: true,
            name: true,
            price: true,
            inventory: true,
          },
        },
      },
    });

    return NextResponse.json({
      message: 'Cart item updated successfully',
      item: updatedCartItem,
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid request data', details: error.errors },
        { status: 400 }
      );
    }

    console.error('Error updating cart item:', error);
    return NextResponse.json(
      { error: 'Failed to update cart item' },
      { status: 500 }
    );
  }
}

// DELETE /api/cart - Remove item from cart
export async function DELETE(request: NextRequest) {
  try {
    const session = await auth.api.getSession({
      headers: await headers(),
    });
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }

    const body = await request.json();
    const { itemId } = removeFromCartSchema.parse(body);

    // Verify cart item exists and belongs to user
    const cartItem = await prisma.cartItem.findFirst({
      where: {
        id: itemId,
        userId: session.user.id,
      },
    });

    if (!cartItem) {
      return NextResponse.json(
        { error: 'Cart item not found' },
        { status: 404 }
      );
    }

    // Delete cart item
    await prisma.cartItem.delete({
      where: {
        id: itemId,
      },
    });

    return NextResponse.json({
      message: 'Item removed from cart successfully',
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid request data', details: error.errors },
        { status: 400 }
      );
    }

    console.error('Error removing cart item:', error);
    return NextResponse.json(
      { error: 'Failed to remove cart item' },
      { status: 500 }
    );
  }
}