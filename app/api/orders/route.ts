import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { headers } from 'next/headers';
import { z } from 'zod';

// Schema for creating orders
const createOrderSchema = z.object({
  type: z.enum(['product', 'property', 'activity']),
  items: z.array(z.object({
    productId: z.string().optional(),
    variantId: z.string().optional(),
    propertyId: z.string().optional(),
    activityId: z.string().optional(),
    quantity: z.number().min(1),
    price: z.number().min(0),
    checkIn: z.string().optional(),
    checkOut: z.string().optional(),
    participants: z.number().optional(),
    activityDate: z.string().optional(),
  })),
  shippingAddress: z.object({
    firstName: z.string().min(1),
    lastName: z.string().min(1),
    email: z.string().email(),
    phone: z.string().min(1),
    address: z.string().min(1),
    city: z.string().min(1),
    state: z.string().optional(),
    zipCode: z.string().min(1),
    country: z.string().min(1),
  }),
  billingAddress: z.object({
    firstName: z.string().min(1),
    lastName: z.string().min(1),
    email: z.string().email(),
    phone: z.string().min(1),
    address: z.string().min(1),
    city: z.string().min(1),
    state: z.string().optional(),
    zipCode: z.string().min(1),
    country: z.string().min(1),
  }),
  paymentMethod: z.enum(['card', 'paynow', 'bank_transfer']),
  paymentDetails: z.object({
    cardNumber: z.string().optional(),
    expiryDate: z.string().optional(),
    cvv: z.string().optional(),
    cardName: z.string().optional(),
    paynowNumber: z.string().optional(),
    bankDetails: z.object({
      accountName: z.string().optional(),
      accountNumber: z.string().optional(),
      bankName: z.string().optional(),
      branchCode: z.string().optional(),
    }).optional(),
  }),
  notes: z.string().optional(),
});

// Helper function to generate order number
function generateOrderNumber(): string {
  const timestamp = Date.now().toString();
  const random = Math.random().toString(36).substring(2, 8).toUpperCase();
  return `ZE${timestamp.slice(-6)}${random}`;
}

// Helper function to calculate totals
function calculateOrderTotals(items: any[], type: string) {
  const subtotal = items.reduce((total, item) => total + (item.price * item.quantity), 0);
  
  // Different tax rates for different types
  const taxRate = type === 'product' ? 0.15 : 0.10; // 15% for products, 10% for services
  const tax = Math.round((subtotal * taxRate) * 100) / 100;
  
  // Shipping only applies to products
  const shipping = type === 'product' && subtotal < 50 ? 5.99 : 0;
  
  const total = subtotal + tax + shipping;
  
  return {
    subtotal: Math.round(subtotal * 100) / 100,
    tax: tax,
    shipping: Math.round(shipping * 100) / 100,
    total: Math.round(total * 100) / 100,
  };
}

// POST /api/orders - Create new order
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
    const orderData = createOrderSchema.parse(body);

    // Validate items based on order type
    for (const item of orderData.items) {
      if (orderData.type === 'product') {
        if (!item.productId) {
          return NextResponse.json(
            { error: 'Product ID is required for product orders' },
            { status: 400 }
          );
        }
        
        // Verify product exists and is active
        const product = await prisma.product.findUnique({
          where: { id: item.productId, isActive: true },
          include: {
            variants: item.variantId ? {
              where: { id: item.variantId, isActive: true }
            } : false,
          },
        });
        
        if (!product) {
          return NextResponse.json(
            { error: 'Product not found or inactive' },
            { status: 404 }
          );
        }
        
        if (item.variantId) {
          const variant = product.variants?.find(v => v.id === item.variantId);
          if (!variant) {
            return NextResponse.json(
              { error: 'Product variant not found or inactive' },
              { status: 404 }
            );
          }
          
          // Check variant stock
          if (variant.stockQuantity !== null && item.quantity > variant.stockQuantity) {
            return NextResponse.json(
              { error: `Insufficient stock for ${product.name} (${variant.name})` },
              { status: 400 }
            );
          }
        } else {
          // Check product stock
          if (product.stockQuantity !== null && item.quantity > product.stockQuantity) {
            return NextResponse.json(
              { error: `Insufficient stock for ${product.name}` },
              { status: 400 }
            );
          }
        }
      } else if (orderData.type === 'property') {
        if (!item.propertyId || !item.checkIn || !item.checkOut) {
          return NextResponse.json(
            { error: 'Property ID, check-in, and check-out dates are required for property bookings' },
            { status: 400 }
          );
        }
        
        // Verify property exists and is active
        const property = await prisma.property.findUnique({
          where: { id: item.propertyId, isActive: true },
        });
        
        if (!property) {
          return NextResponse.json(
            { error: 'Property not found or inactive' },
            { status: 404 }
          );
        }
        
        // Check availability (simplified - you might want more complex logic)
        const checkIn = new Date(item.checkIn);
        const checkOut = new Date(item.checkOut);
        
        const conflictingBooking = await prisma.booking.findFirst({
          where: {
            propertyId: item.propertyId,
            status: { in: ['confirmed', 'pending'] },
            OR: [
              {
                checkIn: { lte: checkIn },
                checkOut: { gt: checkIn },
              },
              {
                checkIn: { lt: checkOut },
                checkOut: { gte: checkOut },
              },
              {
                checkIn: { gte: checkIn },
                checkOut: { lte: checkOut },
              },
            ],
          },
        });
        
        if (conflictingBooking) {
          return NextResponse.json(
            { error: 'Property is not available for the selected dates' },
            { status: 400 }
          );
        }
      } else if (orderData.type === 'activity') {
        if (!item.activityId || !item.activityDate || !item.participants) {
          return NextResponse.json(
            { error: 'Activity ID, date, and participants are required for activity bookings' },
            { status: 400 }
          );
        }
        
        // Verify activity exists and is active
        const activity = await prisma.activity.findUnique({
          where: { id: item.activityId, isActive: true },
        });
        
        if (!activity) {
          return NextResponse.json(
            { error: 'Activity not found or inactive' },
            { status: 404 }
          );
        }
        
        // Check participant limits
        if (item.participants < activity.minParticipants || item.participants > activity.maxParticipants) {
          return NextResponse.json(
            { error: `Activity requires ${activity.minParticipants}-${activity.maxParticipants} participants` },
            { status: 400 }
          );
        }
      }
    }

    // Calculate totals
    const totals = calculateOrderTotals(orderData.items, orderData.type);
    
    // Generate order number
    const orderNumber = generateOrderNumber();
    
    // Create order in database
    const order = await prisma.$transaction(async (tx) => {
      // Create the order
      const newOrder = await tx.order.create({
        data: {
          orderNumber,
          userId: session.user.id,
          type: orderData.type,
          status: orderData.paymentMethod === 'bank_transfer' ? 'pending_payment' : 'pending',
          subtotal: totals.subtotal,
          tax: totals.tax,
          shipping: totals.shipping,
          total: totals.total,
          paymentMethod: orderData.paymentMethod,
          paymentStatus: orderData.paymentMethod === 'bank_transfer' ? 'pending' : 'processing',
          shippingAddress: orderData.shippingAddress,
          billingAddress: orderData.billingAddress,
          notes: orderData.notes,
        },
      });
      
      // Create order items and related bookings
      for (const item of orderData.items) {
        if (orderData.type === 'product') {
          // Create order item
          await tx.orderItem.create({
            data: {
              orderId: newOrder.id,
              productId: item.productId!,
              variantId: item.variantId,
              quantity: item.quantity,
              price: item.price,
            },
          });
          
          // Update stock
          if (item.variantId) {
            await tx.productVariant.update({
              where: { id: item.variantId },
              data: {
                stockQuantity: {
                  decrement: item.quantity,
                },
              },
            });
          } else {
            await tx.product.update({
              where: { id: item.productId! },
              data: {
                stockQuantity: {
                  decrement: item.quantity,
                },
              },
            });
          }
        } else if (orderData.type === 'property') {
          // Create booking
          await tx.booking.create({
            data: {
              orderId: newOrder.id,
              userId: session.user.id,
              propertyId: item.propertyId!,
              checkIn: new Date(item.checkIn!),
              checkOut: new Date(item.checkOut!),
              guests: item.quantity,
              totalAmount: item.price * item.quantity,
              status: 'pending',
              paymentMethod: orderData.paymentMethod,
              paymentStatus: orderData.paymentMethod === 'bank_transfer' ? 'pending' : 'processing',
            },
          });
        } else if (orderData.type === 'activity') {
          // Create activity booking
          await tx.activityBooking.create({
            data: {
              orderId: newOrder.id,
              userId: session.user.id,
              activityId: item.activityId!,
              activityDate: new Date(item.activityDate!),
              participants: item.participants!,
              totalAmount: item.price * item.quantity,
              status: 'pending',
              paymentMethod: orderData.paymentMethod,
              paymentStatus: orderData.paymentMethod === 'bank_transfer' ? 'pending' : 'processing',
            },
          });
        }
      }
      
      // Clear cart for product orders
      if (orderData.type === 'product') {
        await tx.cartItem.deleteMany({
          where: {
            userId: session.user.id,
          },
        });
      }
      
      return newOrder;
    });
    
    // TODO: Process payment based on payment method
    // For now, we'll simulate payment processing
    
    return NextResponse.json({
      message: 'Order created successfully',
      order: {
        id: order.id,
        orderNumber: order.orderNumber,
        status: order.status,
        total: order.total,
        paymentMethod: order.paymentMethod,
      },
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid request data', details: error.errors },
        { status: 400 }
      );
    }

    console.error('Error creating order:', error);
    return NextResponse.json(
      { error: 'Failed to create order' },
      { status: 500 }
    );
  }
}

// GET /api/orders - Get user's orders
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
    const limit = parseInt(searchParams.get('limit') || '10');
    const status = searchParams.get('status');
    const type = searchParams.get('type');
    const offset = (page - 1) * limit;

    // Build where clause
    const where: any = {
      userId: session.user.id,
    };

    if (status) {
      where.status = status;
    }

    if (type) {
      where.type = type;
    }

    // Get orders with related data
    const orders = await prisma.order.findMany({
      where,
      include: {
        items: {
          include: {
            product: {
              select: {
                name: true,
                images: true,
              },
            },
            variant: {
              select: {
                name: true,
                images: true,
              },
            },
          },
        },
        bookings: {
          include: {
            property: {
              select: {
                name: true,
                images: true,
              },
            },
          },
        },
        activityBookings: {
          include: {
            activity: {
              select: {
                name: true,
                images: true,
              },
            },
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
    const totalCount = await prisma.order.count({ where });
    const totalPages = Math.ceil(totalCount / limit);

    return NextResponse.json({
      orders,
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
    console.error('Error fetching orders:', error);
    return NextResponse.json(
      { error: 'Failed to fetch orders' },
      { status: 500 }
    );
  }
}