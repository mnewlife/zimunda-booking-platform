'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import { Heart, ShoppingCart, Minus, Plus, Truck, Shield } from 'lucide-react';
import { useCart } from '@/hooks/use-cart';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';

interface ProductPurchaseProps {
  product: {
    id: string;
    name: string;
    price: number;
    inventory: number;
    inStock: boolean;
    variants?: Array<{
      id: string;
      name: string;
      price: number;
      inventory: number;
    }>;
  };
}

export function ProductPurchase({ product }: ProductPurchaseProps) {
  const [selectedVariant, setSelectedVariant] = useState<string | null>(null);
  const [quantity, setQuantity] = useState(1);
  const [isAddingToCart, setIsAddingToCart] = useState(false);
  const [isAddingToWishlist, setIsAddingToWishlist] = useState(false);
  const [isInWishlist, setIsInWishlist] = useState(false);
  const { addToCart } = useCart();
  const { toast } = useToast();

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(price);
  };

  const getCurrentPrice = () => {
    if (selectedVariant && product.variants) {
      const variant = product.variants.find(v => v.id === selectedVariant);
      return variant?.price || product.price;
    }
    return product.price;
  };

  const getCurrentInventory = () => {
    if (selectedVariant && product.variants) {
      const variant = product.variants.find(v => v.id === selectedVariant);
      return variant?.inventory || 0;
    }
    return product.inventory;
  };

  const getMaxQuantity = () => {
    const inventory = getCurrentInventory();
    return Math.min(inventory, 10); // Limit to 10 items max
  };

  const isAvailable = () => {
    const inventory = getCurrentInventory();
    return inventory > 0;
  };

  const handleQuantityChange = (newQuantity: number) => {
    const maxQuantity = getMaxQuantity();
    if (newQuantity >= 1 && newQuantity <= maxQuantity) {
      setQuantity(newQuantity);
    }
  };

  const handleAddToCart = async () => {
    if (!isAvailable()) {
      return;
    }

    if (product.variants && product.variants.length > 0 && !selectedVariant) {
      return;
    }

    setIsAddingToCart(true);
    await addToCart(product.id, selectedVariant || undefined, quantity);
    setIsAddingToCart(false);
  };

  const handleAddToWishlist = async () => {
    setIsAddingToWishlist(true);

    try {
      const response = await fetch('/api/wishlist', {
        method: isInWishlist ? 'DELETE' : 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          productId: product.id,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to update wishlist');
      }

      setIsInWishlist(!isInWishlist);
      toast({
        title: isInWishlist ? "Removed from Wishlist" : "Added to Wishlist",
        description: isInWishlist 
          ? "Item removed from your wishlist." 
          : "Item added to your wishlist.",
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to update wishlist. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsAddingToWishlist(false);
    }
  };

  const handleBuyNow = () => {
    if (!isAvailable()) {
      toast({
        title: "Product Unavailable",
        description: "This product is currently out of stock.",
        variant: "destructive",
      });
      return;
    }

    if (product.variants && product.variants.length > 0 && !selectedVariant) {
      toast({
        title: "Please Select a Variant",
        description: "Choose a product variant before proceeding.",
        variant: "destructive",
      });
      return;
    }

    // Redirect to checkout with this item
    const params = new URLSearchParams({
      productId: product.id,
      quantity: quantity.toString(),
      ...(selectedVariant && { variantId: selectedVariant }),
    });
    
    window.location.href = `/checkout?${params.toString()}`;
  };

  return (
    <Card className="sticky top-4">
      <CardContent className="p-6 space-y-6">
        {/* Price Display */}
        <div className="space-y-2">
          <div className="text-2xl font-bold text-gray-900">
            {formatPrice(getCurrentPrice())}
          </div>
          <div className="text-sm text-gray-600">
            Total: {formatPrice(getCurrentPrice() * quantity)}
          </div>
        </div>

        <Separator />

        {/* Variant Selection */}
        {product.variants && product.variants.length > 0 && (
          <div className="space-y-3">
            <Label htmlFor="variant-select">Select Variant</Label>
            <Select value={selectedVariant || ""} onValueChange={setSelectedVariant}>
              <SelectTrigger id="variant-select">
                <SelectValue placeholder="Choose a variant" />
              </SelectTrigger>
              <SelectContent>
                {product.variants.map((variant) => (
                  <SelectItem 
                    key={variant.id} 
                    value={variant.id}
                    disabled={variant.inventory === 0}
                  >
                    <div className="flex justify-between items-center w-full">
                      <span>{variant.name}</span>
                      <div className="flex items-center gap-2 ml-4">
                        <span className="font-medium">{formatPrice(variant.price)}</span>
                        <Badge 
                          variant={variant.inventory > 0 ? "default" : "secondary"}
                          className={cn(
                            "text-xs",
                            variant.inventory > 0 
                              ? "bg-green-100 text-green-800" 
                              : "bg-red-100 text-red-800"
                          )}
                        >
                          {variant.inventory > 0 ? 'Available' : 'Out of Stock'}
                        </Badge>
                      </div>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}

        {/* Quantity Selection */}
        <div className="space-y-3">
          <Label htmlFor="quantity">Quantity</Label>
          <div className="flex items-center gap-3">
            <Button
              variant="outline"
              size="icon"
              onClick={() => handleQuantityChange(quantity - 1)}
              disabled={quantity <= 1}
            >
              <Minus className="h-4 w-4" />
            </Button>
            <div className="flex-1">
              <Select 
                value={quantity.toString()} 
                onValueChange={(value) => handleQuantityChange(parseInt(value))}
              >
                <SelectTrigger id="quantity">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Array.from({ length: getMaxQuantity() }, (_, i) => i + 1).map((num) => (
                    <SelectItem key={num} value={num.toString()}>
                      {num}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <Button
              variant="outline"
              size="icon"
              onClick={() => handleQuantityChange(quantity + 1)}
              disabled={quantity >= getMaxQuantity()}
            >
              <Plus className="h-4 w-4" />
            </Button>
          </div>
          <p className="text-xs text-gray-600">
            {getCurrentInventory()} items available
          </p>
        </div>

        <Separator />

        {/* Action Buttons */}
        <div className="space-y-3">
          <Button 
            className="w-full" 
            size="lg"
            onClick={handleBuyNow}
            disabled={!isAvailable()}
          >
            Buy Now
          </Button>
          
          <div className="grid grid-cols-2 gap-3">
            <Button 
              variant="outline" 
              className="flex-1"
              onClick={handleAddToCart}
              disabled={!isAvailable() || isAddingToCart}
            >
              <ShoppingCart className="h-4 w-4 mr-2" />
              {isAddingToCart ? 'Adding...' : 'Add to Cart'}
            </Button>
            
            <Button 
              variant="outline" 
              onClick={handleAddToWishlist}
              disabled={isAddingToWishlist}
            >
              <Heart className={cn(
                "h-4 w-4 mr-2",
                isInWishlist && "fill-red-500 text-red-500"
              )} />
              {isAddingToWishlist ? 'Saving...' : (isInWishlist ? 'Saved' : 'Save')}
            </Button>
          </div>
        </div>

        {!isAvailable() && (
          <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
            <p className="text-sm text-red-800 font-medium">
              This item is currently out of stock
            </p>
          </div>
        )}

        <Separator />

        {/* Shipping & Security Info */}
        <div className="space-y-3">
          <div className="flex items-center gap-3 text-sm text-gray-600">
            <Truck className="h-4 w-4" />
            <span>Free shipping on orders over $50</span>
          </div>
          <div className="flex items-center gap-3 text-sm text-gray-600">
            <Shield className="h-4 w-4" />
            <span>Secure payment & 30-day returns</span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}