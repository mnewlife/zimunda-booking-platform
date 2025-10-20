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

interface CartItem {
  id: string;
  productId: string;
  variantId?: string;
  quantity: number;
  price: number;
  name: string;
  variantName?: string;
}

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
  const [currentStep, setCurrentStep] = useState(1);
  const [cartSummary, setCartSummary] = useState<CartSummary | null>(null);
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

  // Redirect if not authenticated
  useEffect(() => {
    if (!session) {
      router.push('/auth/signin?callbackUrl=/checkout');
      return;
    }
  }, [session, router]);

  // Validate cart and fetch summary on mount
  useEffect(() => {
    if (session) {
      validateCartAndFetchSummary();
    }
  }, [session]);

  const validateCartAndFetchSummary = async () => {
    try {
      setValidating(true);
      
      // Validate cart
      const validateResponse = await fetch('/api/cart/validate', {
        method: 'POST',
      });
      
      if (!validateResponse.ok) {
        const errorData = await validateResponse.json();
        if (errorData.issues?.length > 0) {
          errorData.issues.forEach((issue: any) => {
            toast.error(issue.message);
          });
        }
        
        if (errorData.itemCount === 0) {
          router.push('/cart');
          return;
        }
      }
      
      const validationResult: ValidationResult = await validateResponse.json();
      
      if (!validationResult.valid) {
        toast.error('Some items in your cart have issues. Please review and try again.');
        router.push('/cart');
        return;
      }
      
      setValidItems(validationResult.validItems);
      
      // Fetch cart summary
      const summaryResponse = await fetch('/api/cart/summary');
      if (summaryResponse.ok) {
        const summary: CartSummary = await summaryResponse.json();
        setCartSummary(summary);
      }
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
      
      // No additional validation needed for stripe and bank_transfer methods
      
      // Create order
      const orderData = {
        type: 'product',
        items: validItems.map(item => ({
          productId: item.productId,
          variantId: item.variantId,
          quantity: item.quantity,
          price: item.price,
        })),
        shippingAddress: formData.shipping,
        billingAddress: formData.billing.sameAsShipping ? formData.shipping : formData.billing,
        paymentMethod: formData.payment.method,
        paymentDetails: formData.payment,
        notes: formData.notes,
      };
      
      const response = await fetch('/api/orders', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(orderData),
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to place order');
      }
      
      const result = await response.json();
      
      toast.success('Order placed successfully!');
      
      // Redirect to order confirmation
      router.push(`/orders/${result.order.id}`);
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

  if (loading || validating) {
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
          items={validItems}
          summary={cartSummary}
          currentStep={currentStep}
          onPlaceOrder={handlePlaceOrder}
          processing={processing}
        />
      </div>
    </div>
  );
}