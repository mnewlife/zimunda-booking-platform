'use client';

import { useState, useEffect, useCallback } from 'react';
import { useToast } from '@/hooks/use-toast';

export interface CartItem {
  id: string;
  productId: string;
  variantId?: string;
  name: string;
  price: number;
  quantity: number;
  image?: string;
  maxQuantity: number;
  inStock: boolean;
  addedAt: Date;
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

export interface CartSummary {
  items: CartItem[];
  subtotal: number;
  itemCount: number;
  totalQuantity: number;
  lastUpdated: Date;
}

class CartManager {
  private static readonly STORAGE_KEY = 'zimunda_cart';
  private static readonly MAX_ITEMS = 100;

  static getCart(): CartItem[] {
    if (typeof window === 'undefined') return [];
    
    try {
      const stored = localStorage.getItem(this.STORAGE_KEY);
      return stored ? JSON.parse(stored) : [];
    } catch (error) {
      console.error('Failed to load cart from localStorage:', error);
      return [];
    }
  }

  static setCart(items: CartItem[]): void {
    if (typeof window === 'undefined') return;
    
    try {
      if (items.length > this.MAX_ITEMS) {
        throw new Error(`Cart cannot exceed ${this.MAX_ITEMS} items`);
      }
      localStorage.setItem(this.STORAGE_KEY, JSON.stringify(items));
      // Dispatch custom event for cross-tab sync
      window.dispatchEvent(new CustomEvent('cartUpdated', { detail: items }));
    } catch (error) {
      console.error('Failed to save cart to localStorage:', error);
    }
  }

  static addItem(item: Omit<CartItem, 'id' | 'addedAt'>): CartItem {
    const cartItem: CartItem = {
      ...item,
      id: `${item.productId}-${item.variantId || 'default'}-${Date.now()}`,
      addedAt: new Date(),
    };

    const items = this.getCart();
    const existingIndex = items.findIndex(
      (existing) => 
        existing.productId === item.productId && 
        existing.variantId === item.variantId
    );

    if (existingIndex >= 0) {
      // Update existing item quantity
      items[existingIndex].quantity = Math.min(
        items[existingIndex].quantity + item.quantity,
        item.maxQuantity
      );
    } else {
      // Add new item
      items.push(cartItem);
    }

    this.setCart(items);
    return cartItem;
  }

  static updateQuantity(itemId: string, quantity: number): boolean {
    const items = this.getCart();
    const itemIndex = items.findIndex(item => item.id === itemId);
    
    if (itemIndex >= 0) {
      if (quantity <= 0) {
        items.splice(itemIndex, 1);
      } else {
        items[itemIndex].quantity = Math.min(quantity, items[itemIndex].maxQuantity);
      }
      this.setCart(items);
      return true;
    }
    return false;
  }

  static removeItem(itemId: string): boolean {
    const items = this.getCart();
    const filteredItems = items.filter(item => item.id !== itemId);
    
    if (filteredItems.length !== items.length) {
      this.setCart(filteredItems);
      return true;
    }
    return false;
  }

  static clearCart(): void {
    this.setCart([]);
  }

  static getCartSummary(): CartSummary {
    const items = this.getCart();
    const subtotal = items.reduce((total, item) => {
      const price = item.variant?.price || item.product.price;
      return total + (price * item.quantity);
    }, 0);

    return {
      items,
      subtotal,
      itemCount: items.length,
      totalQuantity: items.reduce((total, item) => total + item.quantity, 0),
      lastUpdated: new Date(),
    };
  }
}

export function useClientCart() {
  const [cartItems, setCartItems] = useState<CartItem[]>([]);
  const [cartSummary, setCartSummary] = useState<CartSummary | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [itemCount, setItemCount] = useState(0);
  const { toast } = useToast();

  const refreshCart = useCallback(() => {
    const items = CartManager.getCart();
    const summary = CartManager.getCartSummary();
    
    setCartItems(items);
    setCartSummary(summary);
    setItemCount(items.length);
    setIsLoading(false);
  }, []);

  const addToCart = useCallback(async (
    productId: string, 
    productData: CartItem['product'],
    variantId?: string,
    variantData?: CartItem['variant'],
    quantity: number = 1
  ) => {
    try {
      const maxQuantity = variantData?.inventory || productData.inventory;
      const price = variantData?.price || productData.price;
      const name = variantData ? `${productData.name} - ${variantData.name}` : productData.name;
      const image = productData.images[0];

      const cartItem = CartManager.addItem({
        productId,
        variantId,
        name,
        price,
        quantity,
        image,
        maxQuantity,
        inStock: maxQuantity > 0,
        product: productData,
        variant: variantData,
      });

      refreshCart();
      
      toast({
        title: "Added to Cart",
        description: `${name} has been added to your cart.`,
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
  }, [refreshCart, toast]);

  const updateQuantity = useCallback((itemId: string, quantity: number) => {
    try {
      const success = CartManager.updateQuantity(itemId, quantity);
      if (success) {
        refreshCart();
        return true;
      }
      return false;
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to update quantity. Please try again.",
        variant: "destructive",
      });
      return false;
    }
  }, [refreshCart, toast]);

  const removeItem = useCallback((itemId: string) => {
    try {
      const success = CartManager.removeItem(itemId);
      if (success) {
        refreshCart();
        toast({
          title: "Item Removed",
          description: "Item has been removed from your cart.",
        });
        return true;
      }
      return false;
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to remove item. Please try again.",
        variant: "destructive",
      });
      return false;
    }
  }, [refreshCart, toast]);

  const clearCart = useCallback(() => {
    try {
      CartManager.clearCart();
      refreshCart();
      toast({
        title: "Cart Cleared",
        description: "All items have been removed from your cart.",
      });
      return true;
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to clear cart. Please try again.",
        variant: "destructive",
      });
      return false;
    }
  }, [refreshCart, toast]);

  // Handle cross-tab synchronization
  useEffect(() => {
    const handleCartUpdate = (event: CustomEvent) => {
      refreshCart();
    };

    window.addEventListener('cartUpdated', handleCartUpdate as EventListener);
    return () => {
      window.removeEventListener('cartUpdated', handleCartUpdate as EventListener);
    };
  }, [refreshCart]);

  // Initial load
  useEffect(() => {
    refreshCart();
  }, [refreshCart]);

  return {
    cartItems,
    cartSummary,
    itemCount,
    isLoading,
    addToCart,
    updateQuantity,
    removeItem,
    clearCart,
    refreshCart,
  };
}