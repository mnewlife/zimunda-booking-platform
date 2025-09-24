'use client';

import { useState, useEffect, useCallback } from 'react';
import { useToast } from '@/hooks/use-toast';

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

interface CartSummary {
  subtotal: number;
  shipping: number;
  tax: number;
  discount: number;
  total: number;
  itemCount: number;
  freeShippingThreshold: number;
}

export function useCart() {
  const [cartItems, setCartItems] = useState<CartItem[]>([]);
  const [cartSummary, setCartSummary] = useState<CartSummary | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [itemCount, setItemCount] = useState(0);
  const { toast } = useToast();

  const fetchCartItems = useCallback(async () => {
    try {
      const response = await fetch('/api/cart');
      if (response.ok) {
        const data = await response.json();
        setCartItems(data.items || []);
        setItemCount(data.items?.length || 0);
      }
    } catch (error) {
      console.error('Error fetching cart items:', error);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const fetchCartSummary = useCallback(async () => {
    try {
      const response = await fetch('/api/cart/summary');
      if (response.ok) {
        const data = await response.json();
        setCartSummary(data);
      }
    } catch (error) {
      console.error('Error fetching cart summary:', error);
    }
  }, []);

  const addToCart = useCallback(async (productId: string, variantId?: string, quantity: number = 1) => {
    try {
      const response = await fetch('/api/cart', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          productId,
          variantId,
          quantity,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to add to cart');
      }

      await fetchCartItems();
      await fetchCartSummary();
      
      toast({
        title: "Added to Cart",
        description: "Item has been added to your cart.",
      });

      return true;
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to add item to cart. Please try again.",
        variant: "destructive",
      });
      return false;
    }
  }, [fetchCartItems, fetchCartSummary, toast]);

  const updateQuantity = useCallback(async (itemId: string, quantity: number) => {
    try {
      const response = await fetch('/api/cart', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          itemId,
          quantity,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to update quantity');
      }

      await fetchCartItems();
      await fetchCartSummary();
      return true;
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to update quantity. Please try again.",
        variant: "destructive",
      });
      return false;
    }
  }, [fetchCartItems, fetchCartSummary, toast]);

  const removeItem = useCallback(async (itemId: string) => {
    try {
      const response = await fetch('/api/cart', {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          itemId,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to remove item');
      }

      await fetchCartItems();
      await fetchCartSummary();
      
      toast({
        title: "Item Removed",
        description: "Item has been removed from your cart.",
      });
      
      return true;
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to remove item. Please try again.",
        variant: "destructive",
      });
      return false;
    }
  }, [fetchCartItems, fetchCartSummary, toast]);

  const clearCart = useCallback(async () => {
    try {
      const promises = cartItems.map(item => removeItem(item.id));
      await Promise.all(promises);
      return true;
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to clear cart. Please try again.",
        variant: "destructive",
      });
      return false;
    }
  }, [cartItems, removeItem, toast]);

  useEffect(() => {
    fetchCartItems();
    fetchCartSummary();
  }, [fetchCartItems, fetchCartSummary]);

  return {
    cartItems,
    cartSummary,
    itemCount,
    isLoading,
    addToCart,
    updateQuantity,
    removeItem,
    clearCart,
    refreshCart: () => {
      fetchCartItems();
      fetchCartSummary();
    },
  };
}