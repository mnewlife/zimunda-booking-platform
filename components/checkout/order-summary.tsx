'use client';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { ShoppingBag, Truck, Shield } from 'lucide-react';
import Image from 'next/image';

interface CartItem {
  id: string;
  productId: string;
  variantId?: string;
  quantity: number;
  price: number;
  name: string;
  variantName?: string;
}

interface CartSummary {
  subtotal: number;
  discount: number;
  shipping: number;
  tax: number;
  total: number;
  itemCount: number;
  totalQuantity: number;
  appliedPromo: string | null;
}

interface OrderSummaryProps {
  items: CartItem[];
  summary: CartSummary;
  currentStep: number;
  onPlaceOrder: () => void;
  processing: boolean;
}

export function OrderSummary({
  items,
  summary,
  currentStep,
  onPlaceOrder,
  processing,
}: OrderSummaryProps) {
  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(price);
  };

  return (
    <div className="space-y-6">
      {/* Order Summary Card */}
      <Card className="sticky top-4">
        <CardHeader>
          <CardTitle className="flex items-center">
            <ShoppingBag className="h-5 w-5 mr-2" />
            Order Summary
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Items List */}
          <div className="space-y-4">
            {items.map((item) => (
              <div key={`${item.productId}-${item.variantId || 'default'}`} className="flex items-center space-x-3">
                <div className="relative h-12 w-12 rounded-md overflow-hidden bg-gray-100">
                  <Image
                    src="/placeholder-product.jpg"
                    alt={item.name}
                    fill
                    className="object-cover"
                  />
                  <Badge 
                    variant="secondary" 
                    className="absolute -top-2 -right-2 h-5 w-5 rounded-full p-0 flex items-center justify-center text-xs"
                  >
                    {item.quantity}
                  </Badge>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-900 truncate">
                    {item.name}
                  </p>
                  {item.variantName && (
                    <p className="text-xs text-gray-500">
                      {item.variantName}
                    </p>
                  )}
                  <p className="text-xs text-gray-500">
                    Qty: {item.quantity}
                  </p>
                </div>
                <div className="text-sm font-medium text-gray-900">
                  {formatPrice(item.price * item.quantity)}
                </div>
              </div>
            ))}
          </div>

          <Separator />

          {/* Summary Lines */}
          <div className="space-y-3">
            <div className="flex justify-between text-sm">
              <span className="text-gray-600">Subtotal ({summary.totalQuantity} items)</span>
              <span className="font-medium">{formatPrice(summary.subtotal)}</span>
            </div>
            
            {summary.discount > 0 && (
              <div className="flex justify-between text-sm">
                <span className="text-green-600">
                  Discount {summary.appliedPromo && `(${summary.appliedPromo})`}
                </span>
                <span className="font-medium text-green-600">
                  -{formatPrice(summary.discount)}
                </span>
              </div>
            )}
            
            <div className="flex justify-between text-sm">
              <span className="text-gray-600 flex items-center">
                <Truck className="h-4 w-4 mr-1" />
                Shipping
              </span>
              <span className="font-medium">
                {summary.shipping === 0 ? 'Free' : formatPrice(summary.shipping)}
              </span>
            </div>
            
            <div className="flex justify-between text-sm">
              <span className="text-gray-600">Tax</span>
              <span className="font-medium">{formatPrice(summary.tax)}</span>
            </div>
            
            <Separator />
            
            <div className="flex justify-between text-lg font-semibold">
              <span>Total</span>
              <span>{formatPrice(summary.total)}</span>
            </div>
          </div>

          {/* Place Order Button (only on review step) */}
          {currentStep === 3 && (
            <Button 
              onClick={onPlaceOrder}
              disabled={processing}
              className="w-full"
              size="lg"
            >
              {processing ? 'Processing...' : `Place Order • ${formatPrice(summary.total)}`}
            </Button>
          )}
        </CardContent>
      </Card>

      {/* Security & Guarantees */}
      <Card>
        <CardContent className="p-4">
          <div className="space-y-3">
            <div className="flex items-center text-sm text-gray-600">
              <Shield className="h-4 w-4 mr-2 text-green-600" />
              <span>Secure SSL encryption</span>
            </div>
            <div className="flex items-center text-sm text-gray-600">
              <Truck className="h-4 w-4 mr-2 text-blue-600" />
              <span>Free shipping on orders over $50</span>
            </div>
            <div className="flex items-center text-sm text-gray-600">
              <ShoppingBag className="h-4 w-4 mr-2 text-purple-600" />
              <span>30-day return policy</span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Shipping Info */}
      {summary.shipping === 0 && summary.subtotal >= 50 && (
        <Card className="bg-green-50 border-green-200">
          <CardContent className="p-4">
            <div className="flex items-center text-sm text-green-800">
              <Truck className="h-4 w-4 mr-2" />
              <span className="font-medium">
                🎉 You qualify for free shipping!
              </span>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Estimated Delivery */}
      <Card>
        <CardContent className="p-4">
          <h4 className="font-medium text-gray-900 mb-2">Estimated Delivery</h4>
          <p className="text-sm text-gray-600">
            {summary.shipping === 0 
              ? '3-5 business days (Free shipping)'
              : '2-3 business days (Standard shipping)'
            }
          </p>
          <p className="text-xs text-gray-500 mt-1">
            Delivery times may vary based on location
          </p>
        </CardContent>
      </Card>
    </div>
  );
}