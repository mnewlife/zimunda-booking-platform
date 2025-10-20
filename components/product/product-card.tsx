'use client';

import { useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { Card, CardContent, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Star, ShoppingCart, Package, AlertCircle } from 'lucide-react';
import { useCart } from '@/hooks/use-cart';
import { cn } from '@/lib/utils';

interface ProductVariant {
  id: string;
  name: string;
  price: number;
  inventory: number;
}

interface Product {
  id: string;
  name: string;
  //slug: string;
  description: string;
  price: number;
  category: string;
  inventory: number;
  images: string[];
  variants?: ProductVariant[];
  totalSales: number;
  inStock: boolean;
  isActive: boolean;
  isFeatured?: boolean;
}

interface ProductCardProps {
  product: Product;
  className?: string;
}

export function ProductCard({ product, className }: ProductCardProps) {
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const { addToCart } = useCart();

  const handleImageError = () => {
    // Fallback to next image or placeholder
    if (currentImageIndex < product.images.length - 1) {
      setCurrentImageIndex(currentImageIndex + 1);
    }
  };

  const handleAddToCart = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    
    if (!product.inStock) return;
    
    setIsLoading(true);
    await addToCart(product.id, undefined, 1);
    setIsLoading(false);
  };



  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 2,
    }).format(price);
  };

  const getCategoryColor = (category: string) => {
    switch (category.toLowerCase()) {
      case 'coffee':
        return 'bg-amber-100 text-amber-800';
      case 'merchandise':
        return 'bg-green-100 text-green-800';
      case 'local':
        return 'bg-purple-100 text-purple-800';
      case 'food':
        return 'bg-orange-100 text-orange-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getLowestPrice = () => {
    if (!product.variants || product.variants.length === 0) {
      return product.price;
    }
    
    const availableVariants = product.variants.filter(v => v.inventory > 0);
    if (availableVariants.length === 0) return product.price;
    
    return Math.min(...availableVariants.map(v => v.price));
  };

  const hasVariants = product.variants && product.variants.length > 0;
  const lowestPrice = getLowestPrice();
  const showFromPrice = hasVariants && lowestPrice < product.price;

  return (
    <Card className={cn(
      "group relative overflow-hidden transition-all duration-300 hover:shadow-lg",
      !product.inStock && "opacity-75",
      className
    )}>
      <Link href={`/shop/${product.id}`}>
        {/* Image Section */}
        <div className="relative aspect-square overflow-hidden bg-gray-100">
          {product.images && product.images.length > 0 ? (
            <Image
              src={product.images[currentImageIndex] || '/placeholder-product.jpg'}
              alt={product.name}
              fill
              className="object-cover transition-transform duration-300 group-hover:scale-105"
              onError={handleImageError}
              sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 25vw"
            />
          ) : (
            <div className="flex items-center justify-center h-full">
              <Package className="h-16 w-16 text-gray-300" />
            </div>
          )}
          
          {/* Badges */}
          <div className="absolute top-3 left-3 flex flex-col gap-2">
            <Badge className={getCategoryColor(product.category)}>
              {product.category}
            </Badge>
            {product.isFeatured && (
              <Badge variant="secondary">
                Featured
              </Badge>
            )}
            {!product.inStock && (
              <Badge variant="destructive" className="flex items-center gap-1">
                <AlertCircle className="h-3 w-3" />
                Out of Stock
              </Badge>
            )}
          </div>
          

          
          {/* Image Indicators */}
          {product.images && product.images.length > 1 && (
            <div className="absolute bottom-3 left-1/2 transform -translate-x-1/2 flex gap-1">
              {product.images.map((_, index) => (
                <button
                  key={index}
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    setCurrentImageIndex(index);
                  }}
                  className={cn(
                    "w-2 h-2 rounded-full transition-all",
                    index === currentImageIndex
                      ? "bg-white"
                      : "bg-white/50 hover:bg-white/75"
                  )}
                />
              ))}
            </div>
          )}
        </div>
        
        <CardContent className="p-4">
          {/* Product Name */}
          <h3 className="font-semibold text-gray-900 mb-2 line-clamp-2 group-hover:text-green-600 transition-colors">
            {product.name}
          </h3>
          
          {/* Description */}
          <p className="text-sm text-gray-600 mb-3 line-clamp-2">
            {product.description}
          </p>
          

          
          {/* Price */}
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <span className="text-lg font-bold text-gray-900">
                {showFromPrice && 'From '}{formatPrice(lowestPrice)}
              </span>
              {hasVariants && (
                <span className="text-sm text-gray-500">
                  {product.variants!.length} options
                </span>
              )}
            </div>
          </div>
          
          {/* Stock Status */}
          <div className="flex items-center gap-2 text-sm">
            {product.inStock ? (
              <>
                <div className="w-2 h-2 bg-green-500 rounded-full" />
                <span className="text-green-600">
                  {product.inventory > 10 ? 'In Stock' : `${product.inventory} left`}
                </span>
              </>
            ) : (
              <>
                <div className="w-2 h-2 bg-red-500 rounded-full" />
                <span className="text-red-600">Out of Stock</span>
              </>
            )}
          </div>
        </CardContent>
      </Link>
      
      <CardFooter className="p-4 pt-0">
        <div className="flex gap-2 w-full">
          <Button
            onClick={handleAddToCart}
            disabled={!product.inStock || isLoading}
            className="flex-1"
            size="sm"
          >
            {isLoading ? (
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                Adding...
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <ShoppingCart className="h-4 w-4" />
                {product.inStock ? 'Add to Cart' : 'Out of Stock'}
              </div>
            )}
          </Button>
          
          <Button variant="outline" size="sm" asChild>
            <Link href={`/shop/${product.id}`}>
              View
            </Link>
          </Button>
        </div>
      </CardFooter>
      
      {/* Sales Badge */}
      {product.totalSales > 0 && (
        <div className="absolute top-3 right-12 bg-blue-100 text-blue-800 text-xs px-2 py-1 rounded-full">
          {product.totalSales} sold
        </div>
      )}
    </Card>
  );
}