'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { CreditCard, Smartphone, Building2 } from 'lucide-react';
import { cn } from '@/lib/utils';

interface CheckoutFormProps {
  currentStep: number;
  formData: any;
  onFormDataChange: (section: string, data: any) => void;
  onStepChange: (step: number) => void;
  onPlaceOrder: () => void;
  processing: boolean;
}

export function CheckoutForm({
  currentStep,
  formData,
  onFormDataChange,
  onStepChange,
  onPlaceOrder,
  processing,
}: CheckoutFormProps) {
  const [errors, setErrors] = useState<Record<string, string>>({});

  const validateStep = (step: number): boolean => {
    const newErrors: Record<string, string> = {};

    if (step === 1) {
      // Validate shipping information
      const { shipping } = formData;
      if (!shipping.firstName) newErrors.firstName = 'First name is required';
      if (!shipping.lastName) newErrors.lastName = 'Last name is required';
      if (!shipping.email) newErrors.email = 'Email is required';
      if (!shipping.phone) newErrors.phone = 'Phone is required';
      if (!shipping.address) newErrors.address = 'Address is required';
      if (!shipping.city) newErrors.city = 'City is required';
      if (!shipping.zipCode) newErrors.zipCode = 'ZIP code is required';
    } else if (step === 2) {
      // Validate payment information
      const { payment } = formData;
      if (payment.method === 'card') {
        if (!payment.cardNumber) newErrors.cardNumber = 'Card number is required';
        if (!payment.expiryDate) newErrors.expiryDate = 'Expiry date is required';
        if (!payment.cvv) newErrors.cvv = 'CVV is required';
        if (!payment.cardName) newErrors.cardName = 'Cardholder name is required';
      } else if (payment.method === 'paynow') {
        if (!payment.paynowNumber) newErrors.paynowNumber = 'Paynow number is required';
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleNext = () => {
    if (validateStep(currentStep)) {
      onStepChange(currentStep + 1);
    }
  };

  const handleBack = () => {
    onStepChange(currentStep - 1);
  };

  const handleInputChange = (section: string, field: string, value: any) => {
    onFormDataChange(section, { [field]: value });
    // Clear error when user starts typing
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: '' }));
    }
  };

  const formatCardNumber = (value: string) => {
    const v = value.replace(/\s+/g, '').replace(/[^0-9]/gi, '');
    const matches = v.match(/\d{4,16}/g);
    const match = matches && matches[0] || '';
    const parts = [];
    for (let i = 0, len = match.length; i < len; i += 4) {
      parts.push(match.substring(i, i + 4));
    }
    if (parts.length) {
      return parts.join(' ');
    } else {
      return v;
    }
  };

  const formatExpiryDate = (value: string) => {
    const v = value.replace(/\s+/g, '').replace(/[^0-9]/gi, '');
    if (v.length >= 2) {
      return v.substring(0, 2) + '/' + v.substring(2, 4);
    }
    return v;
  };

  if (currentStep === 1) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Shipping Information</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="firstName">First Name *</Label>
              <Input
                id="firstName"
                value={formData.shipping.firstName}
                onChange={(e) => handleInputChange('shipping', 'firstName', e.target.value)}
                className={cn(errors.firstName && 'border-red-500')}
              />
              {errors.firstName && (
                <p className="text-sm text-red-500 mt-1">{errors.firstName}</p>
              )}
            </div>
            <div>
              <Label htmlFor="lastName">Last Name *</Label>
              <Input
                id="lastName"
                value={formData.shipping.lastName}
                onChange={(e) => handleInputChange('shipping', 'lastName', e.target.value)}
                className={cn(errors.lastName && 'border-red-500')}
              />
              {errors.lastName && (
                <p className="text-sm text-red-500 mt-1">{errors.lastName}</p>
              )}
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="email">Email *</Label>
              <Input
                id="email"
                type="email"
                value={formData.shipping.email}
                onChange={(e) => handleInputChange('shipping', 'email', e.target.value)}
                className={cn(errors.email && 'border-red-500')}
              />
              {errors.email && (
                <p className="text-sm text-red-500 mt-1">{errors.email}</p>
              )}
            </div>
            <div>
              <Label htmlFor="phone">Phone *</Label>
              <Input
                id="phone"
                value={formData.shipping.phone}
                onChange={(e) => handleInputChange('shipping', 'phone', e.target.value)}
                className={cn(errors.phone && 'border-red-500')}
              />
              {errors.phone && (
                <p className="text-sm text-red-500 mt-1">{errors.phone}</p>
              )}
            </div>
          </div>

          <div>
            <Label htmlFor="address">Address *</Label>
            <Input
              id="address"
              value={formData.shipping.address}
              onChange={(e) => handleInputChange('shipping', 'address', e.target.value)}
              className={cn(errors.address && 'border-red-500')}
            />
            {errors.address && (
              <p className="text-sm text-red-500 mt-1">{errors.address}</p>
            )}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <Label htmlFor="city">City *</Label>
              <Input
                id="city"
                value={formData.shipping.city}
                onChange={(e) => handleInputChange('shipping', 'city', e.target.value)}
                className={cn(errors.city && 'border-red-500')}
              />
              {errors.city && (
                <p className="text-sm text-red-500 mt-1">{errors.city}</p>
              )}
            </div>
            <div>
              <Label htmlFor="state">State/Province</Label>
              <Input
                id="state"
                value={formData.shipping.state}
                onChange={(e) => handleInputChange('shipping', 'state', e.target.value)}
              />
            </div>
            <div>
              <Label htmlFor="zipCode">ZIP Code *</Label>
              <Input
                id="zipCode"
                value={formData.shipping.zipCode}
                onChange={(e) => handleInputChange('shipping', 'zipCode', e.target.value)}
                className={cn(errors.zipCode && 'border-red-500')}
              />
              {errors.zipCode && (
                <p className="text-sm text-red-500 mt-1">{errors.zipCode}</p>
              )}
            </div>
          </div>

          <div className="flex justify-end">
            <Button onClick={handleNext}>
              Continue to Payment
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (currentStep === 2) {
    return (
      <div className="space-y-6">
        {/* Billing Address */}
        <Card>
          <CardHeader>
            <CardTitle>Billing Address</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center space-x-2 mb-4">
              <Checkbox
                id="sameAsShipping"
                checked={formData.billing.sameAsShipping}
                onCheckedChange={(checked) => 
                  handleInputChange('billing', 'sameAsShipping', checked)
                }
              />
              <Label htmlFor="sameAsShipping">
                Same as shipping address
              </Label>
            </div>

            {!formData.billing.sameAsShipping && (
              <div className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="billingFirstName">First Name *</Label>
                    <Input
                      id="billingFirstName"
                      value={formData.billing.firstName}
                      onChange={(e) => handleInputChange('billing', 'firstName', e.target.value)}
                    />
                  </div>
                  <div>
                    <Label htmlFor="billingLastName">Last Name *</Label>
                    <Input
                      id="billingLastName"
                      value={formData.billing.lastName}
                      onChange={(e) => handleInputChange('billing', 'lastName', e.target.value)}
                    />
                  </div>
                </div>
                {/* Add more billing fields as needed */}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Payment Method */}
        <Card>
          <CardHeader>
            <CardTitle>Payment Method</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <RadioGroup
              value={formData.payment.method}
              onValueChange={(value) => handleInputChange('payment', 'method', value)}
            >
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="card" id="card" />
                <Label htmlFor="card" className="flex items-center">
                  <CreditCard className="h-4 w-4 mr-2" />
                  Credit/Debit Card
                </Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="paynow" id="paynow" />
                <Label htmlFor="paynow" className="flex items-center">
                  <Smartphone className="h-4 w-4 mr-2" />
                  Paynow
                </Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="bank_transfer" id="bank_transfer" />
                <Label htmlFor="bank_transfer" className="flex items-center">
                  <Building2 className="h-4 w-4 mr-2" />
                  Bank Transfer
                </Label>
              </div>
            </RadioGroup>

            {formData.payment.method === 'card' && (
              <div className="space-y-4">
                <div>
                  <Label htmlFor="cardNumber">Card Number *</Label>
                  <Input
                    id="cardNumber"
                    placeholder="1234 5678 9012 3456"
                    value={formData.payment.cardNumber}
                    onChange={(e) => 
                      handleInputChange('payment', 'cardNumber', formatCardNumber(e.target.value))
                    }
                    maxLength={19}
                    className={cn(errors.cardNumber && 'border-red-500')}
                  />
                  {errors.cardNumber && (
                    <p className="text-sm text-red-500 mt-1">{errors.cardNumber}</p>
                  )}
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="expiryDate">Expiry Date *</Label>
                    <Input
                      id="expiryDate"
                      placeholder="MM/YY"
                      value={formData.payment.expiryDate}
                      onChange={(e) => 
                        handleInputChange('payment', 'expiryDate', formatExpiryDate(e.target.value))
                      }
                      maxLength={5}
                      className={cn(errors.expiryDate && 'border-red-500')}
                    />
                    {errors.expiryDate && (
                      <p className="text-sm text-red-500 mt-1">{errors.expiryDate}</p>
                    )}
                  </div>
                  <div>
                    <Label htmlFor="cvv">CVV *</Label>
                    <Input
                      id="cvv"
                      placeholder="123"
                      value={formData.payment.cvv}
                      onChange={(e) => handleInputChange('payment', 'cvv', e.target.value)}
                      maxLength={4}
                      className={cn(errors.cvv && 'border-red-500')}
                    />
                    {errors.cvv && (
                      <p className="text-sm text-red-500 mt-1">{errors.cvv}</p>
                    )}
                  </div>
                </div>
                <div>
                  <Label htmlFor="cardName">Cardholder Name *</Label>
                  <Input
                    id="cardName"
                    value={formData.payment.cardName}
                    onChange={(e) => handleInputChange('payment', 'cardName', e.target.value)}
                    className={cn(errors.cardName && 'border-red-500')}
                  />
                  {errors.cardName && (
                    <p className="text-sm text-red-500 mt-1">{errors.cardName}</p>
                  )}
                </div>
              </div>
            )}

            {formData.payment.method === 'paynow' && (
              <div>
                <Label htmlFor="paynowNumber">Paynow Number *</Label>
                <Input
                  id="paynowNumber"
                  placeholder="0771234567"
                  value={formData.payment.paynowNumber}
                  onChange={(e) => handleInputChange('payment', 'paynowNumber', e.target.value)}
                  className={cn(errors.paynowNumber && 'border-red-500')}
                />
                {errors.paynowNumber && (
                  <p className="text-sm text-red-500 mt-1">{errors.paynowNumber}</p>
                )}
                <p className="text-sm text-gray-600 mt-2">
                  You will receive a payment request on your Paynow number.
                </p>
              </div>
            )}

            {formData.payment.method === 'bank_transfer' && (
              <div className="bg-blue-50 p-4 rounded-lg">
                <h4 className="font-medium text-blue-900 mb-2">Bank Transfer Details</h4>
                <div className="text-sm text-blue-800 space-y-1">
                  <p><strong>Bank:</strong> Standard Chartered Bank</p>
                  <p><strong>Account Name:</strong> Zimunda Estate</p>
                  <p><strong>Account Number:</strong> 01234567890</p>
                  <p><strong>Branch Code:</strong> 20017</p>
                </div>
                <p className="text-sm text-blue-700 mt-3">
                  Please use your order number as the payment reference.
                </p>
              </div>
            )}
          </CardContent>
        </Card>

        <div className="flex justify-between">
          <Button variant="outline" onClick={handleBack}>
            Back to Shipping
          </Button>
          <Button onClick={handleNext}>
            Review Order
          </Button>
        </div>
      </div>
    );
  }

  if (currentStep === 3) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Order Notes (Optional)</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <div>
            <Label htmlFor="notes">Special Instructions</Label>
            <Textarea
              id="notes"
              placeholder="Any special delivery instructions or notes..."
              value={formData.notes}
              onChange={(e) => handleInputChange('', 'notes', e.target.value)}
              rows={4}
            />
          </div>

          <div className="flex justify-between">
            <Button variant="outline" onClick={handleBack}>
              Back to Payment
            </Button>
            <Button 
              onClick={onPlaceOrder}
              disabled={processing}
              className="min-w-[120px]"
            >
              {processing ? 'Processing...' : 'Place Order'}
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  return null;
}