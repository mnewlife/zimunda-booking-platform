import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import prisma from '@/lib/prisma';
import { headers } from 'next/headers';
import { z } from 'zod';

// Constants for calculations
const TAX_RATE = 0.15;
const FREE_SHIPPING_THRESHOLD = 50;
const STANDARD_SHIPPING_RATE = 5.99;

// Schema for applying promo code
const applyPromoSchema = z.object({
  code: z.string().min(1, 'Promo code is required').toUpperCase(),
});

// Helper function to calculate cart summary
async function calculateCartSummary(userId: string, promoCodeId?: string) {
  // Get cart items
  const cartItems = await prisma.cartItem.findMany({
    where: {
      userId,
    },
    include: {
      product: {
        select: {
          price: true,
          isActive: true,
        },
      },
      variant: {
        select: {
          price: true,
          isActive: true,
        },
      },
    },
  });

  // Filter active items
  const activeCartItems = cartItems.filter(item => {
    if (!item.product.isActive) return false;
    if (item.variant && !item.variant.isActive) return false;
    return true;
  });

  // Calculate subtotal
  const subtotal = activeCartItems.reduce((total, item) => {
    const price = item.variant?.price || item.product.price;
    return total + (price * item.quantity);
  }, 0);

  // Calculate discount
  let discount = 0;
  let appliedPromo = null;

  if (promoCodeId) {
    const promo = await prisma.promoCode.findUnique({
      where: { id: promoCodeId },
    });

    if (promo && promo.isActive && (!promo.expiresAt || new Date() < promo.expiresAt)) {
      if (!promo.minimumAmount || subtotal >= promo.minimumAmount) {
        if (promo.discountType === 'percentage') {
          discount = subtotal * (promo.discountValue / 100);
          if (promo.maximumDiscount) {
            discount = Math.min(discount, promo.maximumDiscount);
          }
        } else if (promo.discountType === 'fixed') {
          discount = Math.min(promo.discountValue, subtotal);
        }
        appliedPromo = promo.code;
      }
    }
  }

  // Calculate shipping
  const discountedSubtotal = subtotal - discount;
  const shipping = discountedSubtotal >= FREE_SHIPPING_THRESHOLD ? 0 : STANDARD_SHIPPING_RATE;

  // Calculate tax
  const tax = Math.round((discountedSubtotal * TAX_RATE) * 100) / 100;

  // Calculate total
  const total = discountedSubtotal + shipping + tax;

  return {
    subtotal: Math.round(subtotal * 100) / 100,
    discount: Math.round(discount * 100) / 100,
    shipping: Math.round(shipping * 100) / 100,
    tax: Math.round(tax * 100) / 100,
    total: Math.round(total * 100) / 100,
    itemCount: activeCartItems.length,
    totalQuantity: activeCartItems.reduce((sum, item) => sum + item.quantity, 0),
    freeShippingThreshold: FREE_SHIPPING_THRESHOLD,
    appliedPromo,
  };
}

// POST /api/cart/promo - Apply promo code
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
    const { code } = applyPromoSchema.parse(body);

    // Find promo code
    const promoCode = await prisma.promoCode.findUnique({
      where: {
        code,
        isActive: true,
      },
    });

    if (!promoCode) {
      return NextResponse.json(
        { message: 'Invalid or expired promo code' },
        { status: 400 }
      );
    }

    // Check if promo code is expired
    if (promoCode.expiresAt && new Date() > promoCode.expiresAt) {
      return NextResponse.json(
        { message: 'This promo code has expired' },
        { status: 400 }
      );
    }

    // Check usage limit
    if (promoCode.usageLimit) {
      const usageCount = await prisma.userPromoCode.count({
        where: {
          promoCodeId: promoCode.id,
        },
      });

      if (usageCount >= promoCode.usageLimit) {
        return NextResponse.json(
          { message: 'This promo code has reached its usage limit' },
          { status: 400 }
        );
      }
    }

    // Check if user has already used this promo code
    const existingUsage = await prisma.userPromoCode.findFirst({
      where: {
        userId: session.user.id,
        promoCodeId: promoCode.id,
      },
    });

    if (existingUsage) {
      return NextResponse.json(
        { message: 'You have already used this promo code' },
        { status: 400 }
      );
    }

    // Calculate cart summary to check minimum amount
    const cartSummary = await calculateCartSummary(session.user.id);
    
    if (promoCode.minimumAmount && cartSummary.subtotal < promoCode.minimumAmount) {
      return NextResponse.json(
        { 
          message: `Minimum order amount of $${promoCode.minimumAmount} required for this promo code`,
          minimumAmount: promoCode.minimumAmount,
          currentAmount: cartSummary.subtotal,
        },
        { status: 400 }
      );
    }

    // Remove any existing active promo codes for this user
    await prisma.userPromoCode.updateMany({
      where: {
        userId: session.user.id,
        isActive: true,
      },
      data: {
        isActive: false,
      },
    });

    // Apply the new promo code
    await prisma.userPromoCode.create({
      data: {
        userId: session.user.id,
        promoCodeId: promoCode.id,
        isActive: true,
      },
    });

    // Calculate new summary with promo code applied
    const newSummary = await calculateCartSummary(session.user.id, promoCode.id);

    return NextResponse.json({
      message: 'Promo code applied successfully',
      summary: newSummary,
      discount: newSummary.discount,
      promoCode: {
        code: promoCode.code,
        discountType: promoCode.discountType,
        discountValue: promoCode.discountValue,
      },
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid request data', details: error.errors },
        { status: 400 }
      );
    }

    console.error('Error applying promo code:', error);
    return NextResponse.json(
      { error: 'Failed to apply promo code' },
      { status: 500 }
    );
  }
}

// DELETE /api/cart/promo - Remove promo code
export async function DELETE(request: NextRequest) {
  try {
    const session = await auth.api.getSession({ headers: await headers() });
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }

    // Deactivate all active promo codes for this user
    await prisma.userPromoCode.updateMany({
      where: {
        userId: session.user.id,
        isActive: true,
      },
      data: {
        isActive: false,
      },
    });

    // Calculate new summary without promo code
    const newSummary = await calculateCartSummary(session.user.id);

    return NextResponse.json({
      message: 'Promo code removed successfully',
      summary: newSummary,
    });
  } catch (error) {
    console.error('Error removing promo code:', error);
    return NextResponse.json(
      { error: 'Failed to remove promo code' },
      { status: 500 }
    );
  }
}