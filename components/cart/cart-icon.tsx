'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Badge } from '@/components/ui/badge';
import { ShoppingCart, ShoppingBag, ArrowRight } from 'lucide-react';
import { useCart } from '@/hooks/use-cart';
import Image from 'next/image';
import { cn } from '@/lib/utils';

// Use the CartItem interface from the new client-side cart hook
import type { CartItem } from '@/hooks/use-client-cart';

interface CartIconProps {
  className?: string;
}

export function CartIcon({ className }: CartIconProps) {
  const { cartItems, itemCount } = useCart();
  const [isOpen, setIsOpen] = useState(false);

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(price);
  };

  const getCurrentPrice = (item: CartItem) => {
    return item.variant ? item.variant.price : item.product.price;
  };

  const subtotal = cartItems.reduce((total, item) => {
    return total + (getCurrentPrice(item) * item.quantity);
  }, 0);

  return (
    <DropdownMenu open={isOpen} onOpenChange={setIsOpen}>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="sm"
          className={cn("relative", className)}
        >
          <ShoppingCart className="h-5 w-5" />
          {itemCount > 0 && (
            <Badge
              variant="destructive"
              className="absolute -top-2 -right-2 h-5 w-5 flex items-center justify-center p-0 text-xs"
            >
              {itemCount > 99 ? '99+' : itemCount}
            </Badge>
          )}
          <span className="sr-only">Shopping cart</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent className="w-80" align="end" forceMount>
        <div className="p-4">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold text-lg">Shopping Cart</h3>
            <span className="text-sm text-gray-600">
              {itemCount} {itemCount === 1 ? 'item' : 'items'}
            </span>
          </div>

          {cartItems.length === 0 ? (
            <div className="text-center py-8">
              <ShoppingBag className="h-12 w-12 text-gray-400 mx-auto mb-3" />
              <p className="text-gray-600 mb-4">Your cart is empty</p>
              <Button asChild size="sm" onClick={() => setIsOpen(false)}>
                <Link href="/shop">Start Shopping</Link>
              </Button>
            </div>
          ) : (
            <>
              <div className="space-y-3 max-h-64 overflow-y-auto">
                {cartItems.slice(0, 3).map((item) => {
                  const currentPrice = getCurrentPrice(item);
                  return (
                    <div key={item.id} className="flex gap-3">
                      <div className="relative w-12 h-12 bg-gray-100 rounded overflow-hidden flex-shrink-0">
                        {item.product.images && item.product.images.length > 0 ? (
                          <Image
                            src={item.product.images[0]}
                            alt={item.product.name}
                            fill
                            className="object-cover"
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center">
                            <ShoppingBag className="h-6 w-6 text-gray-400" />
                          </div>
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-gray-900 truncate">
                          {item.product.name}
                        </p>
                        {item.variant && (
                          <p className="text-xs text-gray-600 truncate">
                            {item.variant.name}
                          </p>
                        )}
                        <div className="flex items-center justify-between mt-1">
                          <span className="text-xs text-gray-600">
                            Qty: {item.quantity}
                          </span>
                          <span className="text-sm font-medium text-gray-900">
                            {formatPrice(currentPrice * item.quantity)}
                          </span>
                        </div>
                      </div>
                    </div>
                  );
                })}
                {cartItems.length > 3 && (
                  <p className="text-xs text-gray-600 text-center py-2">
                    +{cartItems.length - 3} more items
                  </p>
                )}
              </div>

              <div className="border-t pt-3 mt-3">
                <div className="flex items-center justify-between mb-3">
                  <span className="font-medium text-gray-900">Subtotal:</span>
                  <span className="font-semibold text-gray-900">
                    {formatPrice(subtotal)}
                  </span>
                </div>
                <div className="space-y-2">
                  <Button asChild className="w-full" size="sm" onClick={() => setIsOpen(false)}>
                    <Link href="/cart">
                      View Cart
                      <ArrowRight className="h-4 w-4 ml-2" />
                    </Link>
                  </Button>
                  <Button asChild variant="outline" className="w-full" size="sm" onClick={() => setIsOpen(false)}>
                    <Link href="/checkout">
                      Checkout
                    </Link>
                  </Button>
                </div>
              </div>
            </>
          )}
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}