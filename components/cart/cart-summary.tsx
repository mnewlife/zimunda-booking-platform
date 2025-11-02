'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { Truck, CreditCard, Shield } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useRouter } from 'next/navigation';
import { useCart } from '@/hooks/use-cart';

export function CartSummary() {
  const { cartSummary, cartItems } = useCart();
  const [isCheckingOut, setIsCheckingOut] = useState(false);
  const { toast } = useToast();
  const router = useRouter();

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(price);
  };

  const proceedToCheckout = async () => {
    if (!cartSummary || cartSummary.itemCount === 0) {
      toast({
        title: "Empty Cart",
        description: "Add items to your cart before checking out.",
        variant: "destructive",
      });
      return;
    }

    setIsCheckingOut(true);

    try {
      // Simple client-side validation
      const hasOutOfStockItems = cartItems.some(item => {
        const availableStock = item.variant ? item.variant.inventory : item.product.inventory;
        return availableStock < item.quantity;
      });

      if (hasOutOfStockItems) {
        throw new Error('Some items in your cart are out of stock. Please update quantities or remove unavailable items.');
      }

      // Redirect to checkout
      router.push('/checkout');
    } catch (error) {
      toast({
        title: "Checkout Error",
        description: error instanceof Error ? error.message : "Unable to proceed to checkout.",
        variant: "destructive",
      });
    } finally {
      setIsCheckingOut(false);
    }
  };

  if (!cartSummary) {
    return (
      <Card>
        <CardContent className="p-6 text-center">
          <p className="text-gray-600">Your cart is empty.</p>
        </CardContent>
      </Card>
    );
  }

  const remainingForFreeShipping = cartSummary.freeShippingThreshold - cartSummary.subtotal;
  const qualifiesForFreeShipping = remainingForFreeShipping <= 0;

  return (
    <div className="space-y-4">
      {/* Order Summary */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CreditCard className="h-5 w-5" />
            Order Summary
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Subtotal */}
          <div className="flex justify-between text-sm">
            <span className="text-gray-600">Subtotal ({cartSummary.itemCount} items)</span>
            <span className="font-medium">{formatPrice(cartSummary.subtotal)}</span>
          </div>

          {/* Shipping */}
          <div className="flex justify-between text-sm">
            <span className="text-gray-600 flex items-center gap-1">
              <Truck className="h-4 w-4" />
              Shipping
            </span>
            <span className={`font-medium ${qualifiesForFreeShipping ? 'text-green-600' : ''}`}>
              {qualifiesForFreeShipping ? 'FREE' : formatPrice(cartSummary.shipping)}
            </span>
          </div>

          {/* Free Shipping Progress */}
          {!qualifiesForFreeShipping && (
            <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
              <p className="text-sm text-blue-800">
                Add {formatPrice(remainingForFreeShipping)} more for free shipping!
              </p>
              <div className="mt-2 bg-blue-200 rounded-full h-2">
                <div 
                  className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                  style={{ 
                    width: `${Math.min((cartSummary.subtotal / cartSummary.freeShippingThreshold) * 100, 100)}%` 
                  }}
                />
              </div>
            </div>
          )}

          {/* Tax */}
          <div className="flex justify-between text-sm">
            <span className="text-gray-600">Tax</span>
            <span className="font-medium">{formatPrice(cartSummary.tax)}</span>
          </div>

          {/* Discount */}
          {cartSummary.discount > 0 && (
            <div className="flex justify-between text-sm">
              <span className="text-gray-600">Discount</span>
              <span className="font-medium text-green-600">-{formatPrice(cartSummary.discount)}</span>
            </div>
          )}

          <Separator />

          {/* Total */}
          <div className="flex justify-between text-lg font-semibold">
            <span>Total</span>
            <span>{formatPrice(cartSummary.total)}</span>
          </div>
        </CardContent>
      </Card>

      {/* Checkout Button */}
      <Card>
        <CardContent className="p-4">
          <Button 
            className="w-full" 
            size="lg"
            onClick={proceedToCheckout}
            disabled={isCheckingOut || cartSummary.itemCount === 0}
          >
            {isCheckingOut ? 'Processing...' : `Proceed to Checkout (${formatPrice(cartSummary.total)})`}
          </Button>
          
          <div className="flex items-center justify-center gap-2 mt-3 text-xs text-gray-600">
            <Shield className="h-3 w-3" />
            <span>Secure checkout with SSL encryption</span>
          </div>
        </CardContent>
      </Card>

      {/* Payment Methods */}
      <Card>
        <CardContent className="p-4">
          <div className="text-center">
            <p className="text-sm text-gray-600 mb-3">We accept</p>
            <div className="flex justify-center items-center gap-3">
              <div className="px-3 py-1 bg-gray-100 rounded text-xs font-medium">VISA</div>
              <div className="px-3 py-1 bg-gray-100 rounded text-xs font-medium">MASTERCARD</div>
              <div className="px-3 py-1 bg-gray-100 rounded text-xs font-medium">BANK TRANSFER</div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}