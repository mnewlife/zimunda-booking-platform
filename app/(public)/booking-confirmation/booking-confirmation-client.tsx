'use client'

import { useEffect, useState } from 'react'
import { useSearchParams } from 'next/navigation'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { CalendarDays, MapPin, Users, CreditCard, CheckCircle, Clock, Phone, Mail } from 'lucide-react'
import { Button } from '@/components/ui/button'
import Link from 'next/link'

interface BookingDetails {
  id: string
  property?: {
    name: string
    type: string
    location: any
  }
  guest: {
    name: string
    email: string
    phone?: string
  }
  checkIn: string
  checkOut: string
  adults: number
  children: number
  totalPrice: number
  status: string
  paymentMethod: string
  paymentStatus: string
  addOns: Array<{
    addOn: {
      name: string
      description: string
    }
    quantity: number
    price: number
  }>
  activities: Array<{
    activity: {
      name: string
      type: string
    }
    date: string
    time: string
    participants: number
    totalPrice: number
  }>
  createdAt: string
}

export default function BookingConfirmationClient() {
  const searchParams = useSearchParams()
  const bookingId = searchParams.get('booking')
  const [booking, setBooking] = useState<BookingDetails | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!bookingId) {
      setError('No booking ID provided')
      setLoading(false)
      return
    }

    fetchBookingDetails()
  }, [bookingId])

  const fetchBookingDetails = async () => {
    try {
      const response = await fetch(`/api/public/bookings/${bookingId}`)
      
      if (!response.ok) {
        throw new Error('Failed to fetch booking details')
      }

      const data = await response.json()
      setBooking(data)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred')
    } finally {
      setLoading(false)
    }
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    })
  }

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(amount)
  }

  const getStatusColor = (status: string) => {
    switch (status.toLowerCase()) {
      case 'confirmed':
        return 'bg-green-100 text-green-800'
      case 'pending':
        return 'bg-yellow-100 text-yellow-800'
      case 'cancelled':
        return 'bg-red-100 text-red-800'
      default:
        return 'bg-gray-100 text-gray-800'
    }
  }

  const getPaymentStatusColor = (status: string) => {
    switch (status.toLowerCase()) {
      case 'paid':
        return 'bg-green-100 text-green-800'
      case 'pending':
        return 'bg-yellow-100 text-yellow-800'
      case 'failed':
        return 'bg-red-100 text-red-800'
      default:
        return 'bg-gray-100 text-gray-800'
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 py-8">
        <div className="max-w-4xl mx-auto px-4">
          <div className="text-center">
            <Clock className="h-8 w-8 animate-spin mx-auto mb-4" />
            <p>Loading your booking details...</p>
          </div>
        </div>
      </div>
    )
  }

  if (error || !booking) {
    return (
      <div className="min-h-screen bg-gray-50 py-8">
        <div className="max-w-4xl mx-auto px-4">
          <Card>
            <CardContent className="text-center py-8">
              <p className="text-red-600 mb-4">{error || 'Booking not found'}</p>
              <Link href="/">
                <Button>Return to Home</Button>
              </Link>
            </CardContent>
          </Card>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-4xl mx-auto px-4">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="flex items-center justify-center gap-2 mb-4">
            <CheckCircle className="h-8 w-8 text-green-600" />
            <h1 className="text-3xl font-bold text-gray-900">Booking Confirmed!</h1>
          </div>
          <p className="text-gray-600">
            Thank you for your booking. Here are your confirmation details.
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main Booking Details */}
          <div className="lg:col-span-2 space-y-6">
            {/* Booking Summary */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <CalendarDays className="h-5 w-5" />
                  Booking Summary
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex justify-between items-start">
                  <div>
                    <h3 className="font-semibold text-lg">{booking.property?.name || 'Activity Booking'}</h3>
                    <p className="text-gray-600 capitalize">{booking.property?.type || 'Activity'}</p>
                    {booking.property?.location && (
                      <div className="flex items-center gap-1 text-gray-500 mt-1">
                        <MapPin className="h-4 w-4" />
                        <span className="text-sm">{booking.property.location.address || 'Zimunda Estate'}</span>
                      </div>
                    )}
                  </div>
                  <div className="text-right">
                    <Badge className={getStatusColor(booking.status)}>
                      {booking.status}
                    </Badge>
                  </div>
                </div>

                <Separator />

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm text-gray-500">Check-in</p>
                    <p className="font-semibold">{formatDate(booking.checkIn)}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-500">Check-out</p>
                    <p className="font-semibold">{formatDate(booking.checkOut)}</p>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <Users className="h-4 w-4 text-gray-500" />
                  <span>{booking.adults} Adult{booking.adults !== 1 ? 's' : ''}</span>
                  {booking.children > 0 && (
                    <span>, {booking.children} Child{booking.children !== 1 ? 'ren' : ''}</span>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Add-ons */}
            {booking.addOns && booking.addOns.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle>Add-ons</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {booking.addOns.map((addOn, index) => (
                      <div key={index} className="flex justify-between items-center">
                        <div>
                          <p className="font-medium">{addOn.addOn.name}</p>
                          <p className="text-sm text-gray-500">{addOn.addOn.description}</p>
                          <p className="text-sm text-gray-500">Quantity: {addOn.quantity}</p>
                        </div>
                        <p className="font-semibold">{formatCurrency(addOn.price)}</p>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Activities */}
            {booking.activities && booking.activities.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle>Activities</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {booking.activities.map((activity, index) => (
                      <div key={index} className="flex justify-between items-center">
                        <div>
                          <p className="font-medium">{activity.activity.name}</p>
                          <p className="text-sm text-gray-500 capitalize">{activity.activity.type.replace('_', ' ')}</p>
                          <p className="text-sm text-gray-500">
                            {formatDate(activity.date)} at {activity.time}
                          </p>
                          <p className="text-sm text-gray-500">{activity.participants} participant{activity.participants !== 1 ? 's' : ''}</p>
                        </div>
                        <p className="font-semibold">{formatCurrency(activity.totalPrice)}</p>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Guest Information */}
            <Card>
              <CardHeader>
                <CardTitle>Guest Information</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div>
                  <p className="font-semibold">{booking.guest.name}</p>
                </div>
                <div className="flex items-center gap-2">
                  <Mail className="h-4 w-4 text-gray-500" />
                  <span className="text-sm">{booking.guest.email}</span>
                </div>
                {booking.guest.phone && (
                  <div className="flex items-center gap-2">
                    <Phone className="h-4 w-4 text-gray-500" />
                    <span className="text-sm">{booking.guest.phone}</span>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Payment Information */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <CreditCard className="h-5 w-5" />
                  Payment Details
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex justify-between">
                  <span>Total Amount</span>
                  <span className="font-bold text-lg">{formatCurrency(booking.totalPrice)}</span>
                </div>
                <div className="flex justify-between">
                  <span>Payment Method</span>
                  <span className="capitalize">{booking.paymentMethod.replace('_', ' ')}</span>
                </div>
                <div className="flex justify-between">
                  <span>Payment Status</span>
                  <Badge className={getPaymentStatusColor(booking.paymentStatus)}>
                    {booking.paymentStatus}
                  </Badge>
                </div>
              </CardContent>
            </Card>

            {/* Booking Reference */}
            <Card>
              <CardHeader>
                <CardTitle>Booking Reference</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="font-mono text-sm bg-gray-100 p-2 rounded">{booking.id}</p>
                <p className="text-xs text-gray-500 mt-2">
                  Please keep this reference number for your records.
                </p>
              </CardContent>
            </Card>

            {/* Next Steps */}
            <Card>
              <CardHeader>
                <CardTitle>Next Steps</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="text-sm space-y-2">
                  <p>• You will receive a confirmation email shortly</p>
                  <p>• Check-in is available from 3:00 PM</p>
                  <p>• Check-out is by 11:00 AM</p>
                  <p>• Contact us if you need to make any changes</p>
                </div>
                <div className="pt-4 space-y-2">
                  <Link href="/" className="block">
                    <Button className="w-full" variant="outline">
                      Return to Home
                    </Button>
                  </Link>
                  <Link href="/contact" className="block">
                    <Button className="w-full">
                      Contact Us
                    </Button>
                  </Link>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  )
}