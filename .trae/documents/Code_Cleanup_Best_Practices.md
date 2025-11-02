# Code Cleanup and Best Practices Guide

## 1. Current Issues Identified

### 1.1 Critical Database Issues
- **Missing CartItem Model**: Code references `prisma.cartItem` but model doesn't exist in schema
- **Inconsistent Relationships**: Some foreign key relationships are not properly defined
- **Missing Cascade Deletes**: Product deletion doesn't properly handle related records

### 1.2 Architecture Inconsistencies
- **Mixed Cart Implementation**: Server-side cart APIs exist but frontend uses different patterns
- **Authentication Confusion**: Cart requires auth in some places, not in others
- **Duplicate Code**: Multiple cart validation functions with different logic

### 1.3 Code Quality Issues
- **Unused Imports**: Many components import unused dependencies
- **Inconsistent Error Handling**: Different error patterns across similar functions
- **Missing Type Safety**: Some API responses lack proper TypeScript types
- **Outdated Patterns**: Some components use deprecated React patterns

## 2. Cleanup Strategy

### 2.1 Database Schema Cleanup

**Remove Orphaned References:**
```typescript
// REMOVE these from all files:
import { cartItem } from '@prisma/client'  // ❌ Remove
await prisma.cartItem.findMany()          // ❌ Remove
await prisma.cartItem.create()            // ❌ Remove
await prisma.cartItem.update()            // ❌ Remove
await prisma.cartItem.delete()            // ❌ Remove
```

**Standardize Relationships:**
```prisma
// ✅ Correct cascade relationships
model Product {
  variants    ProductVariant[] @relation(onDelete: Cascade)
  images      Image[]          @relation(onDelete: Cascade)
  orderItems  OrderItem[]      @relation(onDelete: Restrict)
}

model ProductVariant {
  product     Product     @relation(fields: [productId], references: [id], onDelete: Cascade)
  orderItems  OrderItem[] @relation(onDelete: SetNull)
}
```

### 2.2 API Cleanup

**Remove Unused Cart APIs:**
```bash
# DELETE these entire directories:
app/api/cart/
app/api/cart/summary/
app/api/cart/validate/
app/api/cart/promo/
```

**Standardize API Response Format:**
```typescript
// ✅ Consistent API response interface
interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
  timestamp: string;
}

// ✅ Use in all API routes
export async function GET() {
  try {
    const data = await fetchData();
    return NextResponse.json({
      success: true,
      data,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    return NextResponse.json({
      success: false,
      error: error.message,
      timestamp: new Date().toISOString()
    }, { status: 500 });
  }
}
```

### 2.3 Component Cleanup

**Remove Unused Imports:**
```typescript
// ❌ Before cleanup
import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useRouter } from 'next/navigation';
import { useToast } from '@/hooks/use-toast';

// Only uses useState and Button

// ✅ After cleanup
import { useState } from 'react';
import { Button } from '@/components/ui/button';
```

**Standardize Component Structure:**
```typescript
// ✅ Consistent component structure
interface ComponentProps {
  // Props interface first
}

export function ComponentName({ prop1, prop2 }: ComponentProps) {
  // State declarations
  const [state, setState] = useState();
  
  // Hooks
  const router = useRouter();
  const { toast } = useToast();
  
  // Event handlers
  const handleAction = useCallback(() => {
    // Implementation
  }, [dependencies]);
  
  // Effects
  useEffect(() => {
    // Side effects
  }, [dependencies]);
  
  // Render
  return (
    <div>
      {/* JSX */}
    </div>
  );
}
```

## 3. Best Practices Implementation

### 3.1 Error Handling Standards

**Consistent Error Boundaries:**
```typescript
// ✅ Standard error handling pattern
export function withErrorHandling<T extends (...args: any[]) => Promise<any>>(
  fn: T
): T {
  return (async (...args: Parameters<T>) => {
    try {
      return await fn(...args);
    } catch (error) {
      console.error(`Error in ${fn.name}:`, error);
      throw new Error(`Operation failed: ${error.message}`);
    }
  }) as T;
}

// Usage
const safeDeleteProduct = withErrorHandling(deleteProduct);
```

**User-Friendly Error Messages:**
```typescript
// ✅ Error message mapping
const ERROR_MESSAGES = {
  PRODUCT_NOT_FOUND: 'Product not found. It may have been deleted.',
  INSUFFICIENT_INVENTORY: 'Not enough items in stock.',
  NETWORK_ERROR: 'Connection problem. Please try again.',
  VALIDATION_ERROR: 'Please check your input and try again.',
  PERMISSION_DENIED: 'You don\'t have permission for this action.',
} as const;

function getErrorMessage(error: Error): string {
  // Map technical errors to user-friendly messages
  if (error.message.includes('not found')) {
    return ERROR_MESSAGES.PRODUCT_NOT_FOUND;
  }
  // ... other mappings
  return ERROR_MESSAGES.NETWORK_ERROR;
}
```

### 3.2 Type Safety Improvements

**Strict Type Definitions:**
```typescript
// ✅ Comprehensive type definitions
export interface Product {
  readonly id: string;
  name: string;
  category: ProductCategory;
  description: string;
  price: number;
  inventory: number;
  isActive: boolean;
  variants: ProductVariant[];
  images: ProductImage[];
  createdAt: Date;
  updatedAt: Date;
}

export interface ProductVariant {
  readonly id: string;
  readonly productId: string;
  name: string;
  price: number;
  inventory: number;
  sku: string;
  options: Record<string, any>;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}
```

**API Type Safety:**
```typescript
// ✅ Typed API functions
export async function deleteProduct(id: string): Promise<{
  success: boolean;
  deletedItems: {
    variants: number;
    images: number;
  };
}> {
  const response = await fetch(`/api/products/${id}`, {
    method: 'DELETE',
  });
  
  if (!response.ok) {
    throw new Error(`Failed to delete product: ${response.statusText}`);
  }
  
  return response.json();
}
```

### 3.3 Performance Optimizations

**Efficient Cart Operations:**
```typescript
// ✅ Optimized localStorage cart operations
class CartManager {
  private static readonly STORAGE_KEY = 'zimunda_cart';
  private static readonly MAX_ITEMS = 100;
  
  static getCart(): CartItem[] {
    try {
      const stored = localStorage.getItem(this.STORAGE_KEY);
      return stored ? JSON.parse(stored) : [];
    } catch {
      return [];
    }
  }
  
  static setCart(items: CartItem[]): void {
    try {
      if (items.length > this.MAX_ITEMS) {
        throw new Error(`Cart cannot exceed ${this.MAX_ITEMS} items`);
      }
      localStorage.setItem(this.STORAGE_KEY, JSON.stringify(items));
      // Dispatch custom event for cross-tab sync
      window.dispatchEvent(new CustomEvent('cartUpdated', { detail: items }));
    } catch (error) {
      console.error('Failed to save cart:', error);
    }
  }
}
```

**Debounced Operations:**
```typescript
// ✅ Debounced cart updates
import { debounce } from 'lodash';

const debouncedCartUpdate = debounce((items: CartItem[]) => {
  CartManager.setCart(items);
}, 300);

export function useCart() {
  const [items, setItems] = useState<CartItem[]>([]);
  
  const updateCart = useCallback((newItems: CartItem[]) => {
    setItems(newItems);
    debouncedCartUpdate(newItems);
  }, []);
  
  return { items, updateCart };
}
```

## 4. Code Organization

### 4.1 File Structure Standards

```
src/
├── components/
│   ├── ui/              # Reusable UI components
│   ├── cart/            # Cart-specific components
│   ├── product/         # Product-specific components
│   └── admin/           # Admin-specific components
├── hooks/
│   ├── use-cart.ts      # Cart management hook
│   ├── use-products.ts  # Product operations hook
│   └── use-toast.ts     # Toast notifications hook
├── lib/
│   ├── api/             # API client functions
│   ├── utils/           # Utility functions
│   └── validations/     # Zod schemas
├── types/
│   ├── api.ts           # API response types
│   ├── cart.ts          # Cart-related types
│   └── product.ts       # Product-related types
└── constants/
    ├── errors.ts        # Error messages
    └── config.ts        # App configuration
```

### 4.2 Import Organization

```typescript
// ✅ Consistent import order
// 1. React and Next.js
import React from 'react';
import { NextRequest, NextResponse } from 'next/server';

// 2. Third-party libraries
import { z } from 'zod';
import { clsx } from 'clsx';

// 3. Internal utilities and configs
import { auth } from '@/lib/auth';
import prisma from '@/lib/prisma';

// 4. Components
import { Button } from '@/components/ui/button';
import { ProductCard } from '@/components/product/product-card';

// 5. Types and interfaces
import type { Product, CartItem } from '@/types';

// 6. Constants
import { ERROR_MESSAGES } from '@/constants/errors';
```

## 5. Testing Strategy

### 5.1 Unit Testing Standards

```typescript
// ✅ Comprehensive test coverage
describe('CartManager', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('should add item to empty cart', () => {
    const item: CartItem = createMockCartItem();
    CartManager.addItem(item);
    
    const cart = CartManager.getCart();
    expect(cart).toHaveLength(1);
    expect(cart[0]).toEqual(item);
  });

  it('should handle localStorage errors gracefully', () => {
    // Mock localStorage to throw error
    jest.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new Error('Storage full');
    });

    expect(() => CartManager.addItem(createMockCartItem())).not.toThrow();
  });
});
```

### 5.2 Integration Testing

```typescript
// ✅ API integration tests
describe('Product Deletion API', () => {
  it('should delete product with all variants', async () => {
    const product = await createTestProduct();
    const variant = await createTestVariant(product.id);
    
    const response = await DELETE(`/api/products/${product.id}`);
    
    expect(response.status).toBe(200);
    expect(response.body.success).toBe(true);
    expect(response.body.deletedItems.variants).toBe(1);
    
    // Verify deletion
    const deletedProduct = await prisma.product.findUnique({
      where: { id: product.id }
    });
    expect(deletedProduct).toBeNull();
  });
});
```

## 6. Documentation Standards

### 6.1 Code Documentation

```typescript
/**
 * Deletes a product and all its related data (variants, images).
 * 
 * @param productId - The unique identifier of the product to delete
 * @returns Promise resolving to deletion summary
 * @throws {Error} When product is not found or has existing orders
 * 
 * @example
 * ```typescript
 * const result = await deleteProduct('prod_123');
 * console.log(`Deleted ${result.deletedItems.variants} variants`);
 * ```
 */
export async function deleteProduct(productId: string): Promise<DeletionResult> {
  // Implementation
}
```

### 6.2 API Documentation

```typescript
/**
 * @api {delete} /api/products/:id Delete Product
 * @apiName DeleteProduct
 * @apiGroup Products
 * @apiPermission admin
 * 
 * @apiParam {String} id Product unique ID
 * 
 * @apiSuccess {Boolean} success Operation status
 * @apiSuccess {Object} deletedItems Count of deleted related items
 * @apiSuccess {Number} deletedItems.variants Number of variants deleted
 * @apiSuccess {Number} deletedItems.images Number of images deleted
 * 
 * @apiError {String} error Error message
 * @apiError (404) ProductNotFound Product does not exist
 * @apiError (409) ProductHasOrders Product cannot be deleted due to existing orders
 */
```

This comprehensive cleanup and best practices guide ensures the codebase becomes maintainable, performant, and follows modern development standards.