'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import { Truck, Tag, CreditCard, Shield } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useRouter } from 'next/navigation';
import { useCart } from '@/hooks/use-cart';

interface CartSummaryData {
  subtotal: number;
  shipping: number;
  tax: number;
  discount: number;
  total: number;
  itemCount: number;
  freeShippingThreshold: number;
}

export function CartSummary() {
  const { cartSummary, isLoading, fetchCartSummary } = useCart();
  const [promoCode, setPromoCode] = useState('');
  const [isApplyingPromo, setIsApplyingPromo] = useState(false);
  const [appliedPromo, setAppliedPromo] = useState<string | null>(null);
  const [isCheckingOut, setIsCheckingOut] = useState(false);
  const { toast } = useToast();
  const router = useRouter();



  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(price);
  };

  const applyPromoCode = async () => {
    if (!promoCode.trim()) {
      toast({
        title: "Invalid Promo Code",
        description: "Please enter a valid promo code.",
        variant: "destructive",
      });
      return;
    }

    setIsApplyingPromo(true);

    try {
      const response = await fetch('/api/cart/promo', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ code: promoCode.trim() }),
      });

      const data = await response.json();

      if (response.ok) {
        setAppliedPromo(promoCode.trim());
        await fetchCartSummary();
        toast({
          title: "Promo Code Applied",
          description: `You saved ${formatPrice(data.discount)}!`,
        });
      } else {
        toast({
          title: "Invalid Promo Code",
          description: data.message || "This promo code is not valid.",
          variant: "destructive",
        });
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to apply promo code.",
        variant: "destructive",
      });
    } finally {
      setIsApplyingPromo(false);
    }
  };

  const removePromoCode = async () => {
    try {
      const response = await fetch('/api/cart/promo', {
        method: 'DELETE',
      });

      if (response.ok) {
        setAppliedPromo(null);
        setPromoCode('');
        await fetchCartSummary();
        toast({
          title: "Promo Code Removed",
          description: "Promo code has been removed from your cart.",
        });
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to remove promo code.",
        variant: "destructive",
      });
    }
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
      // Validate cart items and availability
      const response = await fetch('/api/cart/validate', {
        method: 'POST',
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.message || 'Cart validation failed');
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

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <div className="h-6 bg-gray-200 rounded animate-pulse" />
        </CardHeader>
        <CardContent className="space-y-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="flex justify-between">
              <div className="h-4 bg-gray-200 rounded w-20 animate-pulse" />
              <div className="h-4 bg-gray-200 rounded w-16 animate-pulse" />
            </div>
          ))}
          <div className="h-10 bg-gray-200 rounded animate-pulse" />
        </CardContent>
      </Card>
    );
  }

  if (!cartSummary) {
    return (
      <Card>
        <CardContent className="p-6 text-center">
          <p className="text-gray-600">Unable to load cart summary.</p>
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

      {/* Promo Code */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Tag className="h-4 w-4" />
            Promo Code
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {appliedPromo ? (
            <div className="flex items-center justify-between p-3 bg-green-50 border border-green-200 rounded-lg">
              <div className="flex items-center gap-2">
                <Badge className="bg-green-100 text-green-800">
                  {appliedPromo}
                </Badge>
                <span className="text-sm text-green-700">Applied</span>
              </div>
              <Button 
                variant="ghost" 
                size="sm"
                onClick={removePromoCode}
                className="text-green-700 hover:text-green-900"
              >
                Remove
              </Button>
            </div>
          ) : (
            <div className="space-y-2">
              <Label htmlFor="promo-code">Enter promo code</Label>
              <div className="flex gap-2">
                <Input
                  id="promo-code"
                  placeholder="SAVE10"
                  value={promoCode}
                  onChange={(e) => setPromoCode(e.target.value.toUpperCase())}
                  onKeyDown={(e) => e.key === 'Enter' && applyPromoCode()}
                />
                <Button 
                  variant="outline"
                  onClick={applyPromoCode}
                  disabled={isApplyingPromo || !promoCode.trim()}
                >
                  {isApplyingPromo ? 'Applying...' : 'Apply'}
                </Button>
              </div>
            </div>
          )}
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