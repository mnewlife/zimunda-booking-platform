'use client';

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { 
  Package, 
  MapPin, 
  Calendar, 
  Users, 
  CreditCard, 
  Truck, 
  Download,
  MessageSquare,
  Phone,
  Mail
} from 'lucide-react';
import Image from 'next/image';
import Link from 'next/link';
import { toast } from 'sonner';

interface OrderDetailsProps {
  order: any; // You might want to create a proper type for this
}

export function OrderDetails({ order }: OrderDetailsProps) {
  const [downloading, setDownloading] = useState(false);

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(price);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'confirmed':
        return 'bg-green-100 text-green-800';
      case 'pending':
        return 'bg-yellow-100 text-yellow-800';
      case 'cancelled':
        return 'bg-red-100 text-red-800';
      case 'completed':
        return 'bg-blue-100 text-blue-800';
      case 'pending_payment':
        return 'bg-orange-100 text-orange-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getPaymentStatusColor = (status: string) => {
    switch (status) {
      case 'paid':
        return 'bg-green-100 text-green-800';
      case 'pending':
        return 'bg-yellow-100 text-yellow-800';
      case 'failed':
        return 'bg-red-100 text-red-800';
      case 'processing':
        return 'bg-blue-100 text-blue-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const handleDownloadInvoice = async () => {
    try {
      setDownloading(true);
      // TODO: Implement invoice download
      toast.success('Invoice downloaded successfully');
    } catch (error) {
      toast.error('Failed to download invoice');
    } finally {
      setDownloading(false);
    }
  };

  const canCancel = order.status === 'pending' || order.status === 'confirmed';
  const showTrackingInfo = order.type === 'product' && order.status === 'confirmed';

  return (
    <div className="space-y-6">
      {/* Order Status */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center">
              <Package className="h-5 w-5 mr-2" />
              Order Status
            </CardTitle>
            <div className="flex items-center space-x-2">
              <Badge className={getStatusColor(order.status)}>
                {order.status.replace('_', ' ').toUpperCase()}
              </Badge>
              <Badge className={getPaymentStatusColor(order.paymentStatus)}>
                Payment: {order.paymentStatus.replace('_', ' ').toUpperCase()}
              </Badge>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div>
              <h4 className="font-medium text-gray-900 mb-2">Order Information</h4>
              <div className="space-y-1 text-sm text-gray-600">
                <p><strong>Order Number:</strong> {order.orderNumber}</p>
                <p><strong>Order Date:</strong> {new Date(order.createdAt).toLocaleDateString()}</p>
                <p><strong>Order Type:</strong> {order.type.replace('_', ' ').toUpperCase()}</p>
              </div>
            </div>
            
            <div>
              <h4 className="font-medium text-gray-900 mb-2">Payment Information</h4>
              <div className="space-y-1 text-sm text-gray-600">
                <p><strong>Payment Method:</strong> {order.paymentMethod.replace('_', ' ').toUpperCase()}</p>
                <p><strong>Total Amount:</strong> {formatPrice(order.total)}</p>
                {order.paymentMethod === 'bank_transfer' && order.paymentStatus === 'pending' && (
                  <div className="mt-2 p-3 bg-orange-50 rounded-lg">
                    <p className="text-sm text-orange-800">
                      Please complete your bank transfer using the details provided in your confirmation email.
                    </p>
                  </div>
                )}
              </div>
            </div>
            
            <div>
              <h4 className="font-medium text-gray-900 mb-2">Actions</h4>
              <div className="space-y-2">
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={handleDownloadInvoice}
                  disabled={downloading}
                  className="w-full"
                >
                  <Download className="h-4 w-4 mr-2" />
                  {downloading ? 'Downloading...' : 'Download Invoice'}
                </Button>
                {canCancel && (
                  <Button variant="outline" size="sm" className="w-full">
                    Cancel Order
                  </Button>
                )}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Order Items */}
      <Card>
        <CardHeader>
          <CardTitle>Order Items</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {/* Product Items */}
            {order.items?.map((item: any) => (
              <div key={item.id} className="flex items-center space-x-4 p-4 border rounded-lg">
                <div className="relative h-16 w-16 rounded-md overflow-hidden bg-gray-100">
                  <Image
                    src={item.variant?.images?.[0] || item.product?.images?.[0] || '/placeholder-product.jpg'}
                    alt={item.product?.name || 'Product'}
                    fill
                    className="object-cover"
                  />
                </div>
                <div className="flex-1">
                  <h4 className="font-medium text-gray-900">{item.product?.name}</h4>
                  {item.variant && (
                    <p className="text-sm text-gray-600">{item.variant.name}</p>
                  )}
                  <p className="text-sm text-gray-600">Quantity: {item.quantity}</p>
                  {item.product?.category && (
                    <Badge variant="secondary" className="mt-1">
                      {item.product.category}
                    </Badge>
                  )}
                </div>
                <div className="text-right">
                  <p className="font-medium text-gray-900">{formatPrice(item.price * item.quantity)}</p>
                  <p className="text-sm text-gray-600">{formatPrice(item.price)} each</p>
                </div>
              </div>
            ))}
            
            {/* Property Bookings */}
            {order.bookings?.map((booking: any) => (
              <div key={booking.id} className="flex items-center space-x-4 p-4 border rounded-lg">
                <div className="relative h-16 w-16 rounded-md overflow-hidden bg-gray-100">
                  <Image
                    src={booking.property?.images?.[0] || '/placeholder-property.jpg'}
                    alt={booking.property?.name || 'Property'}
                    fill
                    className="object-cover"
                  />
                </div>
                <div className="flex-1">
                  <h4 className="font-medium text-gray-900">{booking.property?.name}</h4>
                  <div className="flex items-center text-sm text-gray-600 mt-1">
                    <MapPin className="h-4 w-4 mr-1" />
                    {booking.property?.location}
                  </div>
                  <div className="flex items-center text-sm text-gray-600 mt-1">
                    <Calendar className="h-4 w-4 mr-1" />
                    {new Date(booking.checkIn).toLocaleDateString()} - {new Date(booking.checkOut).toLocaleDateString()}
                  </div>
                  <div className="flex items-center text-sm text-gray-600 mt-1">
                    <Users className="h-4 w-4 mr-1" />
                    {booking.guests} guests
                  </div>
                </div>
                <div className="text-right">
                  <p className="font-medium text-gray-900">{formatPrice(booking.totalAmount)}</p>
                  <Badge className={getStatusColor(booking.status)} variant="secondary">
                    {booking.status.toUpperCase()}
                  </Badge>
                </div>
              </div>
            ))}
            
            {/* Activity Bookings */}
            {order.activityBookings?.map((booking: any) => (
              <div key={booking.id} className="flex items-center space-x-4 p-4 border rounded-lg">
                <div className="relative h-16 w-16 rounded-md overflow-hidden bg-gray-100">
                  <Image
                    src={booking.activity?.images?.[0] || '/placeholder-activity.jpg'}
                    alt={booking.activity?.name || 'Activity'}
                    fill
                    className="object-cover"
                  />
                </div>
                <div className="flex-1">
                  <h4 className="font-medium text-gray-900">{booking.activity?.name}</h4>
                  <div className="flex items-center text-sm text-gray-600 mt-1">
                    <MapPin className="h-4 w-4 mr-1" />
                    {booking.activity?.location}
                  </div>
                  <div className="flex items-center text-sm text-gray-600 mt-1">
                    <Calendar className="h-4 w-4 mr-1" />
                    {new Date(booking.activityDate).toLocaleDateString()}
                  </div>
                  <div className="flex items-center text-sm text-gray-600 mt-1">
                    <Users className="h-4 w-4 mr-1" />
                    {booking.participants} participants
                  </div>
                  {booking.activity?.duration && (
                    <p className="text-sm text-gray-600 mt-1">
                      Duration: {booking.activity.duration}
                    </p>
                  )}
                </div>
                <div className="text-right">
                  <p className="font-medium text-gray-900">{formatPrice(booking.totalAmount)}</p>
                  <Badge className={getStatusColor(booking.status)} variant="secondary">
                    {booking.status.toUpperCase()}
                  </Badge>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Order Summary */}
      <Card>
        <CardHeader>
          <CardTitle>Order Summary</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            <div className="flex justify-between text-sm">
              <span className="text-gray-600">Subtotal</span>
              <span className="font-medium">{formatPrice(order.subtotal)}</span>
            </div>
            {order.shipping > 0 && (
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">Shipping</span>
                <span className="font-medium">{formatPrice(order.shipping)}</span>
              </div>
            )}
            <div className="flex justify-between text-sm">
              <span className="text-gray-600">Tax</span>
              <span className="font-medium">{formatPrice(order.tax)}</span>
            </div>
            <Separator />
            <div className="flex justify-between text-lg font-semibold">
              <span>Total</span>
              <span>{formatPrice(order.total)}</span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Shipping Information (for product orders) */}
      {order.type === 'product' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <Truck className="h-5 w-5 mr-2" />
                Shipping Address
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-sm text-gray-600 space-y-1">
                <p className="font-medium text-gray-900">
                  {order.shippingAddress.firstName} {order.shippingAddress.lastName}
                </p>
                <p>{order.shippingAddress.address}</p>
                <p>
                  {order.shippingAddress.city}, {order.shippingAddress.state} {order.shippingAddress.zipCode}
                </p>
                <p>{order.shippingAddress.country}</p>
                <p className="mt-2">
                  <strong>Phone:</strong> {order.shippingAddress.phone}
                </p>
                <p>
                  <strong>Email:</strong> {order.shippingAddress.email}
                </p>
              </div>
            </CardContent>
          </Card>

          {showTrackingInfo && (
            <Card>
              <CardHeader>
                <CardTitle>Tracking Information</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <p className="text-sm text-gray-600">
                    Your order has been shipped and is on its way!
                  </p>
                  <div className="bg-blue-50 p-3 rounded-lg">
                    <p className="text-sm font-medium text-blue-900">Tracking Number</p>
                    <p className="text-sm text-blue-800 font-mono">ZE{order.orderNumber}TRACK</p>
                  </div>
                  <Button variant="outline" size="sm" className="w-full">
                    Track Package
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      )}

      {/* Contact Support */}
      <Card>
        <CardHeader>
          <CardTitle>Need Help?</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Button variant="outline" className="flex items-center justify-center">
              <MessageSquare className="h-4 w-4 mr-2" />
              Live Chat
            </Button>
            <Button variant="outline" className="flex items-center justify-center">
              <Phone className="h-4 w-4 mr-2" />
              Call Support
            </Button>
            <Button variant="outline" className="flex items-center justify-center">
              <Mail className="h-4 w-4 mr-2" />
              Email Support
            </Button>
          </div>
          <p className="text-sm text-gray-600 mt-4 text-center">
            Our support team is available 24/7 to help with your order.
          </p>
        </CardContent>
      </Card>

      {/* Order Notes */}
      {order.notes && (
        <Card>
          <CardHeader>
            <CardTitle>Order Notes</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-gray-600">{order.notes}</p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}