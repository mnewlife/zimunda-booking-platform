'use client';

import { useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Trash2, Plus, Minus, ShoppingBag, Heart } from 'lucide-react';
import { useCart } from '@/hooks/use-cart';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';

interface CartItem {
  id: string;
  productId: string;
  variantId?: string;
  quantity: number;
  product: {
    id: string;
    name: string;
    price: number;
    images: string[];
    category: string;
    inventory: number;
  };
  variant?: {
    id: string;
    name: string;
    price: number;
    inventory: number;
  };
}

export function CartContent() {
  const [updatingItems, setUpdatingItems] = useState<Set<string>>(new Set());
  const { cartItems, isLoading, updateQuantity: updateCartQuantity, removeItem: removeCartItem, clearCart } = useCart();
  const { toast } = useToast();

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(price);
  };

  const getCurrentPrice = (item: CartItem) => {
    return item.variant?.price || item.product.price;
  };

  const getCurrentInventory = (item: CartItem) => {
    return item.variant?.inventory || item.product.inventory;
  };

  const updateQuantity = async (itemId: string, newQuantity: number) => {
    if (newQuantity < 1) return;

    setUpdatingItems(prev => new Set(prev).add(itemId));
    await updateCartQuantity(itemId, newQuantity);
    setUpdatingItems(prev => {
      const newSet = new Set(prev);
      newSet.delete(itemId);
      return newSet;
    });
  };

  const removeItem = async (itemId: string) => {
    setUpdatingItems(prev => new Set(prev).add(itemId));
    await removeCartItem(itemId);
    setUpdatingItems(prev => {
      const newSet = new Set(prev);
      newSet.delete(itemId);
      return newSet;
    });
  };

  const moveToWishlist = async (item: CartItem) => {
    try {
      // Add to wishlist
      const wishlistResponse = await fetch('/api/wishlist', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          productId: item.productId,
        }),
      });

      if (wishlistResponse.ok) {
        // Remove from cart
        await removeItem(item.id);
        
        toast({
          title: "Moved to Wishlist",
          description: "Item has been moved to your wishlist.",
        });
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to move item to wishlist.",
        variant: "destructive",
      });
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-4">
        {Array.from({ length: 3 }).map((_, i) => (
          <Card key={i} className="animate-pulse">
            <CardContent className="p-4">
              <div className="flex gap-4">
                <div className="w-20 h-20 bg-gray-200 rounded" />
                <div className="flex-1 space-y-2">
                  <div className="h-5 bg-gray-200 rounded w-3/4" />
                  <div className="h-4 bg-gray-200 rounded w-1/2" />
                  <div className="h-8 bg-gray-200 rounded w-24" />
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  if (cartItems.length === 0) {
    return (
      <Card>
        <CardContent className="p-8 text-center">
          <ShoppingBag className="h-16 w-16 text-gray-400 mx-auto mb-4" />
          <h3 className="text-xl font-semibold text-gray-900 mb-2">
            Your cart is empty
          </h3>
          <p className="text-gray-600 mb-6">
            Looks like you haven't added any items to your cart yet.
          </p>
          <Link href="/shop">
            <Button>
              Start Shopping
            </Button>
          </Link>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {/* Cart Header */}
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold text-gray-900">
          Cart Items ({cartItems.length})
        </h2>
        <Button 
          variant="outline" 
          size="sm"
          onClick={() => {
            cartItems.forEach(item => removeItem(item.id));
          }}
          disabled={updatingItems.size > 0}
        >
          Clear Cart
        </Button>
      </div>

      {/* Cart Items */}
      <div className="space-y-4">
        {cartItems.map((item) => {
          const currentPrice = getCurrentPrice(item);
          const currentInventory = getCurrentInventory(item);
          const isUpdating = updatingItems.has(item.id);
          const isOutOfStock = currentInventory < item.quantity;

          return (
            <Card key={item.id} className={cn(
              "transition-opacity",
              isUpdating && "opacity-50"
            )}>
              <CardContent className="p-4">
                <div className="flex gap-4">
                  {/* Product Image */}
                  <div className="relative w-20 h-20 bg-gray-100 rounded-lg overflow-hidden flex-shrink-0">
                    {item.product.images.length > 0 ? (
                      <Image
                        src={item.product.images[0]}
                        alt={item.product.name}
                        fill
                        className="object-cover"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">
                        <ShoppingBag className="h-8 w-8 text-gray-400" />
                      </div>
                    )}
                  </div>

                  {/* Product Details */}
                  <div className="flex-1 min-w-0">
                    <div className="flex justify-between items-start mb-2">
                      <div>
                        <Link 
                          href={`/shop/${item.product.id}`}
                          className="font-medium text-gray-900 hover:text-primary transition-colors line-clamp-2"
                        >
                          {item.product.name}
                        </Link>
                        <div className="flex items-center gap-2 mt-1">
                          <Badge variant="secondary" className="text-xs">
                            {item.product.category}
                          </Badge>
                          {item.variant && (
                            <Badge variant="outline" className="text-xs">
                              {item.variant.name}
                            </Badge>
                          )}
                          {isOutOfStock && (
                            <Badge variant="destructive" className="text-xs">
                              Low Stock
                            </Badge>
                          )}
                        </div>
                      </div>
                      
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => removeItem(item.id)}
                        disabled={isUpdating}
                        className="text-gray-400 hover:text-red-500"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>

                    {/* Price and Quantity Controls */}
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        {/* Quantity Controls */}
                        <div className="flex items-center gap-1 border rounded-lg">
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8"
                            onClick={() => updateQuantity(item.id, item.quantity - 1)}
                            disabled={item.quantity <= 1 || isUpdating}
                          >
                            <Minus className="h-3 w-3" />
                          </Button>
                          
                          <Select 
                            value={item.quantity.toString()}
                            onValueChange={(value) => updateQuantity(item.id, parseInt(value))}
                            disabled={isUpdating}
                          >
                            <SelectTrigger className="h-8 w-16 border-0">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              {Array.from({ length: Math.min(currentInventory, 10) }, (_, i) => i + 1).map((num) => (
                                <SelectItem key={num} value={num.toString()}>
                                  {num}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8"
                            onClick={() => updateQuantity(item.id, item.quantity + 1)}
                            disabled={item.quantity >= currentInventory || isUpdating}
                          >
                            <Plus className="h-3 w-3" />
                          </Button>
                        </div>

                        {/* Move to Wishlist */}
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => moveToWishlist(item)}
                          disabled={isUpdating}
                          className="text-gray-600 hover:text-primary"
                        >
                          <Heart className="h-4 w-4 mr-1" />
                          Save for Later
                        </Button>
                      </div>

                      {/* Price */}
                      <div className="text-right">
                        <div className="font-semibold text-gray-900">
                          {formatPrice(currentPrice * item.quantity)}
                        </div>
                        <div className="text-sm text-gray-600">
                          {formatPrice(currentPrice)} each
                        </div>
                      </div>
                    </div>

                    {/* Stock Warning */}
                    {isOutOfStock && (
                      <div className="mt-2 p-2 bg-orange-50 border border-orange-200 rounded text-sm text-orange-800">
                        Only {currentInventory} item{currentInventory !== 1 ? 's' : ''} available. 
                        Quantity will be adjusted at checkout.
                      </div>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}