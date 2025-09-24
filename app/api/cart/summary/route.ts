import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { headers } from 'next/headers';

// Constants for calculations
const TAX_RATE = 0.15; // 15% tax rate
const FREE_SHIPPING_THRESHOLD = 50; // Free shipping over $50
const STANDARD_SHIPPING_RATE = 5.99;

// GET /api/cart/summary - Get cart summary with totals
export async function GET(request: NextRequest) {
  try {
    const session = await auth.api.getSession({ headers: await headers() });
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }

    // Get cart items
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
            isActive: true,
          },
        },
        variant: {
          select: {
            id: true,
            name: true,
            price: true,
            isActive: true,
          },
        },
      },
    });

    // Filter out inactive products/variants
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

    // Get applied promo code discount
    let discount = 0;
    const userPromo = await prisma.userPromoCode.findFirst({
      where: {
        userId: session.user.id,
        isActive: true,
      },
      include: {
        promoCode: {
          select: {
            code: true,
            discountType: true,
            discountValue: true,
            minimumAmount: true,
            maximumDiscount: true,
            isActive: true,
            expiresAt: true,
          },
        },
      },
    });

    if (userPromo?.promoCode && userPromo.promoCode.isActive) {
      const promo = userPromo.promoCode;
      
      // Check if promo is still valid
      if (!promo.expiresAt || new Date() < promo.expiresAt) {
        // Check minimum amount requirement
        if (!promo.minimumAmount || subtotal >= promo.minimumAmount) {
          if (promo.discountType === 'percentage') {
            discount = subtotal * (promo.discountValue / 100);
            if (promo.maximumDiscount) {
              discount = Math.min(discount, promo.maximumDiscount);
            }
          } else if (promo.discountType === 'fixed') {
            discount = Math.min(promo.discountValue, subtotal);
          }
        }
      } else {
        // Promo code expired, deactivate it
        await prisma.userPromoCode.update({
          where: {
            id: userPromo.id,
          },
          data: {
            isActive: false,
          },
        });
      }
    }

    // Calculate shipping
    const discountedSubtotal = subtotal - discount;
    const shipping = discountedSubtotal >= FREE_SHIPPING_THRESHOLD ? 0 : STANDARD_SHIPPING_RATE;

    // Calculate tax (on subtotal after discount, before shipping)
    const tax = Math.round((discountedSubtotal * TAX_RATE) * 100) / 100;

    // Calculate total
    const total = discountedSubtotal + shipping + tax;

    const summary = {
      subtotal: Math.round(subtotal * 100) / 100,
      discount: Math.round(discount * 100) / 100,
      shipping: Math.round(shipping * 100) / 100,
      tax: Math.round(tax * 100) / 100,
      total: Math.round(total * 100) / 100,
      itemCount: activeCartItems.length,
      totalQuantity: activeCartItems.reduce((sum, item) => sum + item.quantity, 0),
      freeShippingThreshold: FREE_SHIPPING_THRESHOLD,
      appliedPromo: userPromo?.promoCode?.code || null,
    };

    return NextResponse.json(summary);
  } catch (error) {
    console.error('Error calculating cart summary:', error);
    return NextResponse.json(
      { error: 'Failed to calculate cart summary' },
      { status: 500 }
    );
  }
}