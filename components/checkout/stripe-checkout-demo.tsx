'use client';

import { useState } from 'react';
import { stripePromise } from '@/utils/stripe';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ShoppingCart, CreditCard } from 'lucide-react';
import { toast } from 'sonner';

const products = [
  { id: '1', name: 'Luxury Villa Stay', price: 15000, quantity: 1 }, // $150.00
  { id: '2', name: 'Adventure Package', price: 8500, quantity: 1 }, // $85.00
  { id: '3', name: 'Spa Treatment', price: 5000, quantity: 1 }, // $50.00
];

export default function StripeCheckoutDemo() {
  const [cart, setCart] = useState(products);
  const [isLoading, setIsLoading] = useState(false);

  const updateQuantity = (id: string, newQuantity: number) => {
    if (newQuantity < 1) return;
    setCart(cart.map(item => 
      item.id === id ? { ...item, quantity: newQuantity } : item
    ));
  };

  const getTotalPrice = () => {
    return cart.reduce((total, item) => total + (item.price * item.quantity), 0);
  };

  const handleCheckout = async () => {
    setIsLoading(true);
    
    try {
      const response = await fetch('/api/create-checkout-session', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ items: cart }),
      });

      if (!response.ok) {
        throw new Error('Failed to create checkout session');
      }

      const { url } = await response.json();
      
      // Use the modern approach - redirect to the checkout session URL
      window.location.href = url;
      
    } catch (error) {
      console.error('Checkout error:', error);
      toast.error('Failed to start checkout process');
      setIsLoading(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto p-6 space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <ShoppingCart className="h-5 w-5" />
            Stripe Checkout Demo
          </CardTitle>
          <CardDescription>
            Test the Stripe integration with sample products
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {cart.map((item) => (
            <div key={item.id} className="flex items-center justify-between p-4 border rounded-lg">
              <div className="flex-1">
                <h3 className="font-medium">{item.name}</h3>
                <p className="text-sm text-muted-foreground">
                  ${(item.price / 100).toFixed(2)} each
                </p>
              </div>
              <div className="flex items-center gap-3">
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => updateQuantity(item.id, item.quantity - 1)}
                    disabled={item.quantity <= 1}
                  >
                    -
                  </Button>
                  <span className="w-8 text-center">{item.quantity}</span>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => updateQuantity(item.id, item.quantity + 1)}
                  >
                    +
                  </Button>
                </div>
                <Badge variant="secondary">
                  ${((item.price * item.quantity) / 100).toFixed(2)}
                </Badge>
              </div>
            </div>
          ))}
          
          <div className="border-t pt-4">
            <div className="flex justify-between items-center mb-4">
              <span className="text-lg font-semibold">Total:</span>
              <span className="text-lg font-bold">
                ${(getTotalPrice() / 100).toFixed(2)}
              </span>
            </div>
            
            <Button 
              onClick={handleCheckout} 
              disabled={isLoading || cart.length === 0}
              className="w-full"
              size="lg"
            >
              <CreditCard className="mr-2 h-4 w-4" />
              {isLoading ? 'Processing...' : 'Checkout with Stripe'}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}