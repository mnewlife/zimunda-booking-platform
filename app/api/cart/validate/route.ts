import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import prisma from '@/lib/prisma';
import { headers } from 'next/headers';

// POST /api/cart/validate - Validate cart before checkout
export async function POST(request: NextRequest) {
  try {
    const session = await auth.api.getSession({ headers: await headers() });
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }

    // Get cart items with product and variant details
    const cartItems = await prisma.cartItem.findMany({
      where: {
        userId: session.user.id,
      },
      include: {
        product: {
          select: {
            id: true,
            name: true,
            slug: true,
            price: true,
            stockQuantity: true,
            isActive: true,
            maxQuantityPerOrder: true,
          },
        },
        variant: {
          select: {
            id: true,
            name: true,
            price: true,
            stockQuantity: true,
            isActive: true,
          },
        },
      },
    });

    if (cartItems.length === 0) {
      return NextResponse.json(
        { 
          valid: false,
          error: 'Your cart is empty',
          issues: []
        },
        { status: 400 }
      );
    }

    const issues = [];
    const validItems = [];
    const itemsToRemove = [];

    // Validate each cart item
    for (const item of cartItems) {
      const product = item.product;
      const variant = item.variant;
      
      // Check if product is active
      if (!product.isActive) {
        issues.push({
          type: 'product_inactive',
          message: `${product.name} is no longer available`,
          itemId: item.id,
          productName: product.name,
        });
        itemsToRemove.push(item.id);
        continue;
      }

      // Check if variant is active (if variant exists)
      if (variant && !variant.isActive) {
        issues.push({
          type: 'variant_inactive',
          message: `${product.name} (${variant.name}) is no longer available`,
          itemId: item.id,
          productName: product.name,
          variantName: variant.name,
        });
        itemsToRemove.push(item.id);
        continue;
      }

      // Check stock availability
      const availableStock = variant?.stockQuantity ?? product.stockQuantity;
      if (availableStock !== null && item.quantity > availableStock) {
        if (availableStock === 0) {
          issues.push({
            type: 'out_of_stock',
            message: `${product.name}${variant ? ` (${variant.name})` : ''} is out of stock`,
            itemId: item.id,
            productName: product.name,
            variantName: variant?.name,
            requestedQuantity: item.quantity,
            availableQuantity: availableStock,
          });
          itemsToRemove.push(item.id);
          continue;
        } else {
          issues.push({
            type: 'insufficient_stock',
            message: `Only ${availableStock} ${availableStock === 1 ? 'item' : 'items'} available for ${product.name}${variant ? ` (${variant.name})` : ''}`,
            itemId: item.id,
            productName: product.name,
            variantName: variant?.name,
            requestedQuantity: item.quantity,
            availableQuantity: availableStock,
            suggestedAction: 'reduce_quantity',
          });
          // Don't remove, but suggest quantity reduction
        }
      }

      // Check maximum quantity per order
      if (product.maxQuantityPerOrder && item.quantity > product.maxQuantityPerOrder) {
        issues.push({
          type: 'max_quantity_exceeded',
          message: `Maximum ${product.maxQuantityPerOrder} ${product.maxQuantityPerOrder === 1 ? 'item' : 'items'} allowed per order for ${product.name}`,
          itemId: item.id,
          productName: product.name,
          requestedQuantity: item.quantity,
          maxQuantity: product.maxQuantityPerOrder,
          suggestedAction: 'reduce_quantity',
        });
      }

      // If no critical issues, add to valid items
      if (!itemsToRemove.includes(item.id)) {
        validItems.push({
          id: item.id,
          productId: product.id,
          variantId: variant?.id,
          quantity: item.quantity,
          price: variant?.price ?? product.price,
          name: product.name,
          variantName: variant?.name,
        });
      }
    }

    // Remove invalid items from cart
    if (itemsToRemove.length > 0) {
      await prisma.cartItem.deleteMany({
        where: {
          id: {
            in: itemsToRemove,
          },
          userId: session.user.id,
        },
      });
    }

    // Check if cart is valid for checkout
    const isValid = validItems.length > 0 && !issues.some(issue => 
      ['product_inactive', 'variant_inactive', 'out_of_stock'].includes(issue.type)
    );

    // Calculate totals for valid items
    let subtotal = 0;
    if (validItems.length > 0) {
      subtotal = validItems.reduce((total, item) => {
        return total + (item.price * item.quantity);
      }, 0);
    }

    const response = {
      valid: isValid,
      itemCount: validItems.length,
      subtotal: Math.round(subtotal * 100) / 100,
      issues,
      validItems,
      removedItems: itemsToRemove.length,
    };

    if (!isValid && issues.length > 0) {
      return NextResponse.json(response, { status: 400 });
    }

    return NextResponse.json(response);
  } catch (error) {
    console.error('Error validating cart:', error);
    return NextResponse.json(
      { 
        valid: false,
        error: 'Failed to validate cart',
        issues: []
      },
      { status: 500 }
    );
  }
}