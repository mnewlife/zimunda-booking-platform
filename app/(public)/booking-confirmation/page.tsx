import { Suspense } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { CalendarDays, MapPin, Users, CreditCard, CheckCircle, Clock, Phone, Mail } from 'lucide-react'
import { Button } from '@/components/ui/button'
import Link from 'next/link'
import BookingConfirmationClient from './booking-confirmation-client'

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

export default function BookingConfirmationPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-gray-50 py-8">
        <div className="max-w-4xl mx-auto px-4">
          <div className="text-center">
            <Clock className="h-8 w-8 animate-spin mx-auto mb-4" />
            <p>Loading your booking details...</p>
          </div>
        </div>
      </div>
    }>
      <BookingConfirmationClient />
    </Suspense>
  )
}