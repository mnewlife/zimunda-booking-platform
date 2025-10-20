'use client';

import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { Star, Package, Truck, Shield, RotateCcw, Award } from 'lucide-react';
import { cn } from '@/lib/utils';

interface ProductDetailsProps {
  product: {
    id: string;
    name: string;
    description: string;
    category: string;
    price: number;
    inventory: number;
    isFeatured: boolean;
    specifications?: Record<string, any>;
    features?: string[];
    totalSales: number;
    inStock: boolean;
    variants?: Array<{
      id: string;
      name: string;
      price: number;
      inventory: number;
      isActive: boolean;
    }>;
  };
}

export function ProductDetails({ product }: ProductDetailsProps) {
  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(price);
  };

  const renderStars = (rating: number) => {
    return Array.from({ length: 5 }, (_, i) => (
      <Star
        key={i}
        className={cn(
          "h-4 w-4",
          i < Math.floor(rating)
            ? "fill-yellow-400 text-yellow-400"
            : i < rating
            ? "fill-yellow-400/50 text-yellow-400"
            : "fill-gray-200 text-gray-200"
        )}
      />
    ));
  };

  const getStockStatus = () => {
    if (!product.inStock) {
      return { text: 'Out of Stock', color: 'bg-red-100 text-red-800' };
    }
    if (product.inventory <= 5) {
      return { text: `Only ${product.inventory} left`, color: 'bg-orange-100 text-orange-800' };
    }
    return { text: 'In Stock', color: 'bg-green-100 text-green-800' };
  };

  const stockStatus = getStockStatus();

  return (
    <div className="space-y-6">
      {/* Product Header */}
      <div className="space-y-4">
        <div className="flex items-start justify-between">
          <div className="space-y-2">
            <h1 className="text-3xl font-bold text-gray-900">{product.name}</h1>
            <div className="flex items-center gap-2">
              <Badge variant="secondary" className="capitalize">
                {product.category}
              </Badge>
              {product.isFeatured && (
                <Badge className="bg-yellow-100 text-yellow-800 hover:bg-yellow-200">
                  <Award className="h-3 w-3 mr-1" />
                  Featured
                </Badge>
              )}
              <Badge className={stockStatus.color}>
                {stockStatus.text}
              </Badge>
            </div>
          </div>
        </div>

        {/* Sales Info */}
        {product.totalSales > 0 && (
          <div className="flex items-center gap-4">
            <span className="text-sm text-gray-600">
              {product.totalSales} sold
            </span>
          </div>
        )}

        {/* Price */}
        <div className="space-y-2">
          <div className="text-3xl font-bold text-gray-900">
            {formatPrice(product.price)}
          </div>
          {product.variants && product.variants.length > 0 && (
            <p className="text-sm text-gray-600">
              Starting from {formatPrice(Math.min(...product.variants.map(v => v.price)))}
            </p>
          )}
        </div>
      </div>

      <Separator />

      {/* Description */}
      <div className="space-y-3">
        <h3 className="text-lg font-semibold text-gray-900">Description</h3>
        <div className="prose prose-sm max-w-none text-gray-700">
          {product.description.split('\n').map((paragraph, index) => (
            <p key={index} className="mb-3 last:mb-0">
              {paragraph}
            </p>
          ))}
        </div>
      </div>

      {/* Features */}
      {product.features && product.features.length > 0 && (
        <>
          <Separator />
          <div className="space-y-3">
            <h3 className="text-lg font-semibold text-gray-900">Features</h3>
            <ul className="space-y-2">
              {product.features.map((feature, index) => (
                <li key={index} className="flex items-start gap-2 text-sm text-gray-700">
                  <div className="w-1.5 h-1.5 bg-primary rounded-full mt-2 flex-shrink-0" />
                  {feature}
                </li>
              ))}
            </ul>
          </div>
        </>
      )}

      {/* Specifications */}
      {product.specifications && Object.keys(product.specifications).length > 0 && (
        <>
          <Separator />
          <div className="space-y-3">
            <h3 className="text-lg font-semibold text-gray-900">Specifications</h3>
            <div className="grid grid-cols-1 gap-3">
              {Object.entries(product.specifications).map(([key, value]) => (
                <div key={key} className="flex justify-between py-2 border-b border-gray-100 last:border-0">
                  <span className="text-sm font-medium text-gray-600 capitalize">
                    {key.replace(/([A-Z])/g, ' $1').trim()}
                  </span>
                  <span className="text-sm text-gray-900">
                    {typeof value === 'object' ? JSON.stringify(value) : String(value)}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </>
      )}

      {/* Product Variants */}
      {product.variants && product.variants.length > 0 && (
        <>
          <Separator />
          <div className="space-y-3">
            <h3 className="text-lg font-semibold text-gray-900">Available Variants</h3>
            <div className="grid grid-cols-1 gap-3">
              {product.variants.map((variant) => (
                <Card key={variant.id} className="p-4">
                  <div className="flex justify-between items-center">
                    <div>
                      <h4 className="font-medium text-gray-900">{variant.name}</h4>
                      <p className="text-sm text-gray-600">
                        {variant.inventory > 0 ? `${variant.inventory} available` : 'Out of stock'}
                      </p>
                    </div>
                    <div className="text-right">
                      <div className="font-semibold text-gray-900">
                        {formatPrice(variant.price)}
                      </div>
                      <Badge 
                        variant={variant.inventory > 0 ? "default" : "secondary"}
                        className={variant.inventory > 0 ? "bg-green-100 text-green-800" : ""}
                      >
                        {variant.inventory > 0 ? 'Available' : 'Out of Stock'}
                      </Badge>
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          </div>
        </>
      )}

      <Separator />

      {/* Product Guarantees */}
      <div className="space-y-3">
        <h3 className="text-lg font-semibold text-gray-900">Our Promise</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="flex items-start gap-3">
            <div className="p-2 bg-blue-100 rounded-lg">
              <Truck className="h-5 w-5 text-blue-600" />
            </div>
            <div>
              <h4 className="font-medium text-gray-900">Free Shipping</h4>
              <p className="text-sm text-gray-600">On orders over $50</p>
            </div>
          </div>
          
          <div className="flex items-start gap-3">
            <div className="p-2 bg-green-100 rounded-lg">
              <Shield className="h-5 w-5 text-green-600" />
            </div>
            <div>
              <h4 className="font-medium text-gray-900">Quality Guarantee</h4>
              <p className="text-sm text-gray-600">100% authentic products</p>
            </div>
          </div>
          
          <div className="flex items-start gap-3">
            <div className="p-2 bg-orange-100 rounded-lg">
              <RotateCcw className="h-5 w-5 text-orange-600" />
            </div>
            <div>
              <h4 className="font-medium text-gray-900">Easy Returns</h4>
              <p className="text-sm text-gray-600">30-day return policy</p>
            </div>
          </div>
          
          <div className="flex items-start gap-3">
            <div className="p-2 bg-purple-100 rounded-lg">
              <Package className="h-5 w-5 text-purple-600" />
            </div>
            <div>
              <h4 className="font-medium text-gray-900">Secure Packaging</h4>
              <p className="text-sm text-gray-600">Safe delivery guaranteed</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}