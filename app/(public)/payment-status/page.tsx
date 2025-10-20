'use client'

import { Suspense, useEffect, useState } from 'react'
import { useSearchParams } from 'next/navigation'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { CheckCircle, XCircle, Loader2 } from 'lucide-react'
import Link from 'next/link'

function PaymentStatusContent() {
  const searchParams = useSearchParams();
  const status = searchParams.get('status');
  const sessionId = searchParams.get('session_id');
  const [bookingId, setBookingId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchSessionDetails = async () => {
      if (status === 'success' && sessionId) {
        try {
          // First, get session details
          const response = await fetch(`/api/stripe/session?session_id=${sessionId}`);
          if (response.ok) {
            const sessionData = await response.json();
            setBookingId(sessionData.bookingId);
            
            // Then, complete the payment (this handles the webhook logic in development)
            try {
              const completeResponse = await fetch('/api/payments/complete-session', {
                method: 'POST',
                headers: {
                  'Content-Type': 'application/json',
                },
                body: JSON.stringify({ sessionId }),
              });
              
              if (completeResponse.ok) {
                const completeData = await completeResponse.json();
                console.log('Payment completed successfully:', completeData);
              } else {
                console.error('Failed to complete payment:', await completeResponse.text());
              }
            } catch (completeError) {
              console.error('Error completing payment:', completeError);
            }
          }
        } catch (error) {
          console.error('Error fetching session details:', error);
        }
      }
      setLoading(false);
    };

    fetchSessionDetails();
  }, [status, sessionId]);

  if (loading && status === 'success') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardContent className="text-center py-8">
            <Loader2 className="mx-auto mb-4 w-8 h-8 animate-spin text-blue-600" />
            <p className="text-gray-600">Processing your payment...</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (status === 'success' && sessionId) {

    return (
      <div className="min-h-screen bg-gradient-to-br from-green-50 to-emerald-100 flex items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <div className="mx-auto mb-4 w-16 h-16 bg-green-100 rounded-full flex items-center justify-center">
              <CheckCircle className="w-8 h-8 text-green-600" />
            </div>
            <CardTitle className="text-2xl font-bold text-green-800">
              Payment Successful!
            </CardTitle>
          </CardHeader>
          <CardContent className="text-center space-y-4">
            <p className="text-gray-600">
              Your payment has been processed successfully.
            </p>
            <div className="bg-gray-50 p-3 rounded-lg">
              <p className="text-sm text-gray-500">Session ID</p>
              <p className="font-mono text-sm break-all">{sessionId}</p>
            </div>
            <div className="space-y-2">
              <Button asChild className="w-full">
                <Link href={bookingId ? `/booking-confirmation?booking=${bookingId}` : '/booking-confirmation'}>
                  View Booking Details
                </Link>
              </Button>
              <Button variant="outline" asChild className="w-full">
                <Link href="/">
                  Return to Home
                </Link>
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (status === 'cancelled') {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <div className="mx-auto w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mb-4">
              <XCircle className="h-8 w-8 text-red-600" />
            </div>
            <CardTitle className="text-red-800">Payment Cancelled</CardTitle>
          </CardHeader>
          <CardContent className="text-center space-y-4">
            <p className="text-gray-600">
              Your payment was cancelled. No charges have been made to your account.
            </p>
            <div className="space-y-2">
              <Button 
                className="w-full" 
                onClick={() => window.history.back()}
              >
                Try Again
              </Button>
              <Button variant="outline" asChild className="w-full">
                <Link href="/">
                  Return to Home
                </Link>
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Default loading state or unknown status
  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="mx-auto w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mb-4">
            <Loader2 className="h-8 w-8 text-blue-600 animate-spin" />
          </div>
          <CardTitle className="text-blue-800">Processing Payment...</CardTitle>
        </CardHeader>
        <CardContent className="text-center space-y-4">
          <p className="text-gray-600">
            Please wait while we process your payment.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}

export default function PaymentStatusPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    }>
      <PaymentStatusContent />
    </Suspense>
  );
}