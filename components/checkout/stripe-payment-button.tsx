'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { CreditCard, Loader2 } from 'lucide-react';
import { toast } from 'sonner';

interface StripePaymentButtonProps {
  bookingId?: string;
  orderId?: string;
  amount: number;
  currency?: string;
  customerEmail?: string;
  customerName?: string;
  description?: string;
  onSuccess?: (sessionId: string) => void;
  onError?: (error: string) => void;
  disabled?: boolean;
  className?: string;
  children?: React.ReactNode;
}

export function StripePaymentButton({
  bookingId,
  orderId,
  amount,
  currency = 'USD',
  customerEmail,
  customerName,
  description,
  onSuccess,
  onError,
  disabled = false,
  className,
  children
}: StripePaymentButtonProps) {
  const [isLoading, setIsLoading] = useState(false);

  const handlePayment = async () => {
    if (!bookingId && !orderId) {
      const error = 'Either bookingId or orderId is required';
      toast.error(error);
      onError?.(error);
      return;
    }

    setIsLoading(true);

    try {
      const response = await fetch('/api/create-checkout-session', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          bookingId,
          orderId,
          // Optional: pass custom items for demo purposes
          items: undefined,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to create checkout session');
      }

      const { url, sessionId } = await response.json();

      if (!url) {
        throw new Error('No checkout URL received');
      }

      // Call success callback before redirecting
      onSuccess?.(sessionId);

      // Redirect to Stripe Checkout
      window.location.href = url;
    } catch (error) {
      console.error('Payment error:', error);
      const errorMessage = error instanceof Error ? error.message : 'Payment failed';
      toast.error(errorMessage);
      onError?.(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Button
      onClick={handlePayment}
      disabled={disabled || isLoading}
      className={className}
    >
      {isLoading ? (
        <>
          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
          Processing...
        </>
      ) : (
        <>
          {children || (
            <>
              <CreditCard className="h-4 w-4 mr-2" />
              Pay with Stripe
            </>
          )}
        </>
      )}
    </Button>
  );
}