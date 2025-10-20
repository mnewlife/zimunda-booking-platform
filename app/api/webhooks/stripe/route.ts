import { NextRequest, NextResponse } from 'next/server';
import Stripe from 'stripe';
import prisma from '@/lib/prisma';

if (!process.env.STRIPE_SECRET_KEY) {
  throw new Error('STRIPE_SECRET_KEY is not defined in environment variables');
}

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
  apiVersion: '2024-12-18.acacia',
});

const endpointSecret = process.env.STRIPE_WEBHOOK_SECRET as string;

export async function POST(request: NextRequest) {
  const body = await request.text();
  const signature = request.headers.get('stripe-signature') as string;

  let event: Stripe.Event;

  try {
    event = stripe.webhooks.constructEvent(body, signature, endpointSecret);
  } catch (err) {
    console.error('Webhook signature verification failed:', err);
    return NextResponse.json(
      { error: 'Webhook signature verification failed' },
      { status: 400 }
    );
  }

  try {
    switch (event.type) {
      case 'checkout.session.completed':
        await handleCheckoutSessionCompleted(event.data.object as Stripe.Checkout.Session);
        break;
      
      case 'payment_intent.succeeded':
        await handlePaymentIntentSucceeded(event.data.object as Stripe.PaymentIntent);
        break;
      
      case 'payment_intent.payment_failed':
        await handlePaymentIntentFailed(event.data.object as Stripe.PaymentIntent);
        break;
      
      default:
        console.log(`Unhandled event type: ${event.type}`);
    }

    // Log the webhook event
    await prisma.webhookLog.create({
      data: {
        provider: 'stripe',
        eventType: event.type,
        eventId: event.id,
        processed: true,
        data: JSON.stringify(event.data.object),
      },
    });

    return NextResponse.json({ received: true });
  } catch (error) {
    console.error('Webhook processing error:', error);
    
    // Log the failed webhook event
    await prisma.webhookLog.create({
      data: {
        provider: 'stripe',
        eventType: event.type,
        eventId: event.id,
        processed: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        data: JSON.stringify(event.data.object),
      },
    });

    return NextResponse.json(
      { error: 'Webhook processing failed' },
      { status: 500 }
    );
  }
}

async function handleCheckoutSessionCompleted(session: Stripe.Checkout.Session) {
  console.log('Checkout session completed:', session.id);

  // Find the payment record by Stripe session ID
  const payment = await prisma.payment.findFirst({
    where: { stripeSessionId: session.id },
    include: {
      booking: true,
      order: true,
    },
  });

  if (!payment) {
    console.error('Payment not found for session:', session.id);
    return;
  }

  // Update payment status
  await prisma.payment.update({
    where: { id: payment.id },
    data: {
      status: 'COMPLETED',
      stripePaymentIntentId: session.payment_intent as string,
      notes: `Payment completed via Stripe checkout session ${session.id}`,
    },
  });

  // Update booking status if this is a booking payment
  if (payment.booking) {
    await prisma.booking.update({
      where: { id: payment.booking.id },
      data: { status: 'CONFIRMED' },
    });
  }

  // Update order status if this is an order payment
  if (payment.order) {
    await prisma.order.update({
      where: { id: payment.order.id },
      data: { status: 'PAID' },
    });
  }

  console.log('Payment and booking/order status updated successfully');
}

async function handlePaymentIntentSucceeded(paymentIntent: Stripe.PaymentIntent) {
  console.log('Payment intent succeeded:', paymentIntent.id);

  // Find the payment record by Stripe payment intent ID
  const payment = await prisma.payment.findFirst({
    where: { stripePaymentIntentId: paymentIntent.id },
    include: {
      booking: true,
      order: true,
    },
  });

  if (!payment) {
    console.error('Payment not found for payment intent:', paymentIntent.id);
    return;
  }

  // Update payment status if not already completed
  if (payment.status !== 'COMPLETED') {
    await prisma.payment.update({
      where: { id: payment.id },
      data: {
        status: 'COMPLETED',
        notes: `Payment completed via Stripe payment intent ${paymentIntent.id}`,
      },
    });

    // Update booking status if this is a booking payment
    if (payment.booking) {
      await prisma.booking.update({
        where: { id: payment.booking.id },
        data: { status: 'CONFIRMED' },
      });
    }

    // Update order status if this is an order payment
    if (payment.order) {
      await prisma.order.update({
        where: { id: payment.order.id },
        data: { status: 'PAID' },
      });
    }
  }
}

async function handlePaymentIntentFailed(paymentIntent: Stripe.PaymentIntent) {
  console.log('Payment intent failed:', paymentIntent.id);

  // Find the payment record by Stripe payment intent ID
  const payment = await prisma.payment.findFirst({
    where: { stripePaymentIntentId: paymentIntent.id },
    include: {
      booking: true,
      order: true,
    },
  });

  if (!payment) {
    console.error('Payment not found for payment intent:', paymentIntent.id);
    return;
  }

  // Update payment status to failed
  await prisma.payment.update({
    where: { id: payment.id },
    data: {
      status: 'FAILED',
      notes: `Payment failed via Stripe payment intent ${paymentIntent.id}. Reason: ${paymentIntent.last_payment_error?.message || 'Unknown error'}`,
    },
  });

  // Update booking status if this is a booking payment
  if (payment.booking) {
    await prisma.booking.update({
      where: { id: payment.booking.id },
      data: { status: 'CANCELLED' },
    });
  }

  // Update order status if this is an order payment
  if (payment.order) {
    await prisma.order.update({
      where: { id: payment.order.id },
      data: { status: 'CANCELLED' },
    });
  }
}