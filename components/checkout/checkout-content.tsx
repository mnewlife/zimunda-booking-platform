'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useSession } from '@/lib/auth-client';
import { toast } from 'sonner';
import { CheckoutForm } from './checkout-form';
import { OrderSummary } from './order-summary';
import { CheckoutSteps } from './checkout-steps';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { ShoppingCart, ArrowLeft } from 'lucide-react';
import Link from 'next/link';
import { useCart } from '@/hooks/use-cart';

// Use the interfaces from the new client-side cart hook
import type { CartItem, CartSummary } from '@/hooks/use-client-cart';

interface ValidationResult {
  valid: boolean;
  itemCount: number;
  subtotal: number;
  issues: any[];
  validItems: CartItem[];
  removedItems: number;
}

export function CheckoutContent() {
  const { data: session } = useSession();
  const router = useRouter();
  const { cartItems, cartSummary, clearCart } = useCart();
  const [currentStep, setCurrentStep] = useState(1);
  const [validItems, setValidItems] = useState<CartItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [validating, setValidating] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [formData, setFormData] = useState({
    shipping: {
      firstName: '',
      lastName: '',
      email: '',
      phone: '',
      address: '',
      city: '',
      state: '',
      zipCode: '',
      country: 'Zimbabwe',
    },
    billing: {
      sameAsShipping: true,
      firstName: '',
      lastName: '',
      email: '',
      phone: '',
      address: '',
      city: '',
      state: '',
      zipCode: '',
      country: 'Zimbabwe',
    },
    payment: {
      method: 'card' as 'card' | 'bank_transfer',
      cardNumber: '',
      expiryDate: '',
      cvv: '',
      cardName: '',
      bankDetails: {
        accountName: '',
        accountNumber: '',
        bankName: '',
        branchCode: '',
      },
    },
    notes: '',
  });

  // Redirect to login if not authenticated (checkout requires authentication)
  useEffect(() => {
    if (!session) {
      router.push('/login?callbackUrl=/checkout');
      return;
    }
  }, [session, router]);

  // Validate cart items when cart data is available
  useEffect(() => {
    if (session) {
      validateCartItems();
    }
  }, [session, cartItems]);

  const validateCartItems = async () => {
    try {
      setValidating(true);
      
      // Check if cart is empty
      if (cartItems.length === 0) {
        router.push('/cart');
        return;
      }
      
      // For now, we'll assume all items are valid since we're using client-side cart
      // In a real implementation, you might want to validate against current product data
      const issues: any[] = [];
      const validCartItems: CartItem[] = [];
      
      for (const item of cartItems) {
        // Basic validation - check if item has required fields
        if (!item.product || !item.product.id || !item.product.name || item.quantity <= 0) {
          issues.push({
            message: `Invalid item: ${item.product?.name || 'Unknown item'}`,
            itemId: item.id,
          });
          continue;
        }
        
        // Check inventory (basic client-side check)
        const currentInventory = item.variant?.inventory || item.product.inventory;
        if (item.quantity > currentInventory) {
          issues.push({
            message: `${item.product.name} - Only ${currentInventory} items available, but ${item.quantity} requested`,
            itemId: item.id,
          });
          continue;
        }
        
        validCartItems.push(item);
      }
      
      // Show issues if any
      if (issues.length > 0) {
        issues.forEach(issue => {
          toast.error(issue.message);
        });
        
        if (validCartItems.length === 0) {
          router.push('/cart');
          return;
        }
      }
      
      setValidItems(validCartItems);
    } catch (error) {
      console.error('Error validating cart:', error);
      toast.error('Failed to validate cart. Please try again.');
      router.push('/cart');
    } finally {
      setValidating(false);
      setLoading(false);
    }
  };

  const handleStepChange = (step: number) => {
    setCurrentStep(step);
  };

  const handleFormDataChange = (section: string, data: any) => {
    setFormData(prev => ({
      ...prev,
      [section]: {
        ...prev[section as keyof typeof prev],
        ...data,
      },
    }));
  };

  const handlePlaceOrder = async () => {
    try {
      setProcessing(true);
      
      // Validate form data
      const { shipping, payment } = formData;
      
      if (!shipping.firstName || !shipping.lastName || !shipping.email || 
          !shipping.phone || !shipping.address || !shipping.city) {
        toast.error('Please fill in all required shipping information');
        setCurrentStep(1);
        return;
      }
      
      // Create order data
      const orderData = {
        type: 'product',
        items: validItems.map(item => ({
          productId: item.product.id,
          variantId: item.variant?.id,
          quantity: item.quantity,
          price: item.variant?.price || item.product.price,
          name: item.product.name,
          variantName: item.variant?.name,
        })),
        shippingAddress: formData.shipping,
        billingAddress: formData.billing.sameAsShipping ? formData.shipping : formData.billing,
        paymentMethod: formData.payment.method,
        paymentDetails: formData.payment,
        notes: formData.notes,
        summary: cartSummary,
      };
      
      // Create the order via API
      const response = await fetch('/api/orders', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(orderData),
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to create order');
      }
      
      const order = await response.json();
      
      toast.success('Order placed successfully!');
      
      // Clear cart and redirect
      await clearCart();
      router.push(`/orders/${order.id}?success=true`);
    } catch (error) {
      console.error('Error placing order:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to place order');
    } finally {
      setProcessing(false);
    }
  };

  if (!session) {
    return null;
  }

  if (loading || validating || isLoading) {
    return (
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-6">
          <div className="animate-pulse">
            <div className="h-8 bg-gray-200 rounded mb-4"></div>
            <div className="space-y-4">
              <div className="h-12 bg-gray-200 rounded"></div>
              <div className="h-12 bg-gray-200 rounded"></div>
              <div className="h-12 bg-gray-200 rounded"></div>
            </div>
          </div>
        </div>
        <div className="animate-pulse">
          <div className="h-64 bg-gray-200 rounded"></div>
        </div>
      </div>
    );
  }

  if (!cartSummary || validItems.length === 0) {
    return (
      <Card>
        <CardContent className="p-8 text-center">
          <ShoppingCart className="h-16 w-16 text-gray-400 mx-auto mb-4" />
          <h2 className="text-xl font-semibold text-gray-900 mb-2">
            Your cart is empty
          </h2>
          <p className="text-gray-600 mb-6">
            Add some items to your cart before proceeding to checkout.
          </p>
          <Link href="/shop">
            <Button>
              Continue Shopping
            </Button>
          </Link>
        </CardContent>
      </Card>
    );
  }

  // Convert CartItem[] to the format expected by OrderSummary
  const orderItems = validItems.map(item => ({
    id: item.id,
    productId: item.product.id,
    variantId: item.variant?.id,
    quantity: item.quantity,
    price: item.variant?.price || item.product.price,
    name: item.product.name,
    variantName: item.variant?.name,
  }));

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
      {/* Checkout Form */}
      <div className="lg:col-span-2 space-y-6">
        {/* Steps */}
        <CheckoutSteps currentStep={currentStep} onStepChange={handleStepChange} />
        
        {/* Back to Cart */}
        <div className="flex items-center">
          <Link 
            href="/cart" 
            className="flex items-center text-sm text-gray-600 hover:text-gray-900 transition-colors"
          >
            <ArrowLeft className="h-4 w-4 mr-1" />
            Back to Cart
          </Link>
        </div>
        
        {/* Form */}
        <CheckoutForm
          currentStep={currentStep}
          formData={formData}
          onFormDataChange={handleFormDataChange}
          onStepChange={handleStepChange}
          onPlaceOrder={handlePlaceOrder}
          processing={processing}
        />
      </div>
      
      {/* Order Summary */}
      <div className="lg:col-span-1">
        <OrderSummary
          items={orderItems}
          summary={cartSummary}
          currentStep={currentStep}
          onPlaceOrder={handlePlaceOrder}
          processing={processing}
        />
      </div>
    </div>
  );
}