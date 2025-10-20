import Stripe from 'stripe';
import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY as string, {
  apiVersion: '2024-12-18.acacia',
});

export async function POST(request: NextRequest) {
  try {
    const { bookingId, orderId, items } = await request.json();

    // Validate that either bookingId or orderId is provided
    if (!bookingId && !orderId) {
      return NextResponse.json(
        { error: 'Either bookingId or orderId is required' },
        { status: 400 }
      );
    }

    let booking = null;
    let order = null;
    let totalAmount = 0;
    let customerEmail = '';
    let customerName = '';
    let description = '';

    // Handle booking payments
    if (bookingId) {
      booking = await prisma.booking.findUnique({
        where: { id: bookingId },
        include: {
          guest: true,
          property: true,
          addOns: {
            include: { addOn: true }
          },
          activities: {
            include: { activity: true }
          }
        }
      });

      if (!booking) {
        return NextResponse.json(
          { error: 'Booking not found' },
          { status: 404 }
        );
      }

      totalAmount = Number(booking.totalPrice) * 100; // Convert to cents
      customerEmail = booking.guest.email;
      customerName = booking.guest.name;
      description = booking.property 
        ? `Booking for ${booking.property.name}` 
        : 'Activity Booking';
    }

    // Handle order payments
    if (orderId) {
      order = await prisma.order.findUnique({
        where: { id: orderId },
        include: {
          customer: true,
          items: {
            include: { product: true, variant: true }
          }
        }
      });

      if (!order) {
        return NextResponse.json(
          { error: 'Order not found' },
          { status: 404 }
        );
      }

      totalAmount = Number(order.total) * 100; // Convert to cents
      customerEmail = order.customer.email;
      customerName = order.customer.name;
      description = `Order #${order.id}`;
    }

    // Create line items for Stripe
    let lineItems = [];

    if (items && items.length > 0) {
      // Use provided items (for demo or custom items)
      lineItems = items.map((item: any) => ({
        price_data: {
          currency: 'usd',
          product_data: { name: item.name },
          unit_amount: item.price,
        },
        quantity: item.quantity,
      }));
    } else if (booking) {
      // Create line items from booking data
      lineItems = [
        {
          price_data: {
            currency: 'usd',
            product_data: { 
              name: description,
              description: `Check-in: ${booking.checkIn.toDateString()}, Check-out: ${booking.checkOut.toDateString()}, Guests: ${booking.adults + booking.children}`
            },
            unit_amount: totalAmount,
          },
          quantity: 1,
        }
      ];
    } else if (order) {
      // Create line items from order data
      lineItems = order.items.map(item => ({
        price_data: {
          currency: 'usd',
          product_data: { 
            name: item.product.name,
            description: item.variant?.name || undefined
          },
          unit_amount: Number(item.price) * 100,
        },
        quantity: item.quantity,
      }));
    }

    // Create Stripe checkout session
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      line_items: lineItems,
      mode: 'payment',
      customer_email: customerEmail,
      metadata: {
        bookingId: bookingId || '',
        orderId: orderId || '',
        customerName,
      },
      success_url: `${process.env.NEXT_PUBLIC_APP_URL}/payment-status?status=success&session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${process.env.NEXT_PUBLIC_APP_URL}/payment-status?status=cancelled`,
    });

    // Create payment record in database
    await prisma.payment.create({
      data: {
        bookingId: bookingId || null,
        orderId: orderId || null,
        amount: totalAmount / 100, // Convert back to dollars
        currency: 'USD',
        method: 'STRIPE',
        status: 'PENDING',
        stripeSessionId: session.id,
        notes: `Stripe checkout session created for ${description}`,
      }
    });

    return NextResponse.json({ url: session.url, sessionId: session.id });
  } catch (err) {
    console.error('Error creating checkout session:', err);
    return NextResponse.json(
      { error: 'Error creating checkout session' },
      { status: 500 }
    );
  }
}