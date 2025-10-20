import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import Stripe from 'stripe';

if (!process.env.STRIPE_SECRET_KEY) {
  throw new Error('STRIPE_SECRET_KEY is not defined in environment variables');
}

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
  apiVersion: '2024-12-18.acacia',
});

export async function POST(request: NextRequest) {
  try {
    const { sessionId } = await request.json();

    if (!sessionId) {
      return NextResponse.json(
        { error: 'Session ID is required' },
        { status: 400 }
      );
    }

    // Retrieve the session from Stripe to verify it's completed
    const session = await stripe.checkout.sessions.retrieve(sessionId);

    if (!session) {
      return NextResponse.json(
        { error: 'Session not found' },
        { status: 404 }
      );
    }

    if (session.payment_status !== 'paid') {
      return NextResponse.json(
        { error: 'Payment not completed' },
        { status: 400 }
      );
    }

    // Find the payment record by Stripe session ID
    const payment = await prisma.payment.findFirst({
      where: { stripeSessionId: sessionId },
      include: {
        booking: true,
      },
    });

    if (!payment) {
      return NextResponse.json(
        { error: 'Payment record not found' },
        { status: 404 }
      );
    }

    // Check if payment is already completed
    if (payment.status === 'COMPLETED') {
      return NextResponse.json({
        success: true,
        message: 'Payment already completed',
        bookingId: payment.booking?.id,
        paymentId: payment.id,
      });
    }

    // Update payment status
    await prisma.payment.update({
      where: { id: payment.id },
      data: {
        status: 'COMPLETED',
        stripePaymentIntentId: session.payment_intent as string,
        completedAt: new Date(),
        notes: `Payment completed via Stripe checkout session ${sessionId}`,
      },
    });

    // Update booking status if this is a booking payment
    if (payment.booking) {
      await prisma.booking.update({
        where: { id: payment.booking.id },
        data: { 
          status: 'CONFIRMED',
          paymentStatus: 'COMPLETED'
        },
      });
    }

    // Update order status if this is an order payment
    if (payment.orderId) {
      await prisma.order.update({
        where: { id: payment.orderId },
        data: { 
          status: 'PAID',
          paymentStatus: 'COMPLETED'
        },
      });
    }

    console.log('Payment and booking status updated successfully for session:', sessionId);

    return NextResponse.json({
      success: true,
      message: 'Payment completed successfully',
      bookingId: payment.booking?.id,
      orderId: payment.orderId,
      paymentId: payment.id,
    });

  } catch (error) {
    console.error('Error completing payment session:', error);
    return NextResponse.json(
      { error: 'Failed to complete payment' },
      { status: 500 }
    );
  }
}