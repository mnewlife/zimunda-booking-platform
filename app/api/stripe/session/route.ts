import Stripe from 'stripe';
import { NextRequest, NextResponse } from 'next/server';

if (!process.env.STRIPE_SECRET_KEY) {
  throw new Error('STRIPE_SECRET_KEY is not defined in environment variables');
}

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
  apiVersion: '2024-12-18.acacia',
});

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const sessionId = searchParams.get('session_id');

    if (!sessionId) {
      return NextResponse.json(
        { error: 'Session ID is required' },
        { status: 400 }
      );
    }

    // Retrieve the session from Stripe
    const session = await stripe.checkout.sessions.retrieve(sessionId);

    if (!session) {
      return NextResponse.json(
        { error: 'Session not found' },
        { status: 404 }
      );
    }

    // Extract metadata
    const { bookingId, orderId, customerName } = session.metadata || {};

    return NextResponse.json({
      sessionId: session.id,
      paymentStatus: session.payment_status,
      bookingId: bookingId || null,
      orderId: orderId || null,
      customerName: customerName || null,
      customerEmail: session.customer_email,
      amountTotal: session.amount_total,
      currency: session.currency,
    });
  } catch (err) {
    console.error('Error retrieving session:', err);
    return NextResponse.json(
      { error: 'Error retrieving session details' },
      { status: 500 }
    );
  }
}