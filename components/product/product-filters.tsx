'use client';

import { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { X, Filter, RotateCcw } from 'lucide-react';
import { cn } from '@/lib/utils';

interface ProductFiltersProps {
  categories: string[];
  searchParams: {
    category?: string;
    minPrice?: string;
    maxPrice?: string;
    inStock?: string;
    sortBy?: string;
    sortOrder?: string;
  };
}

const SORT_OPTIONS = [
  { value: 'createdAt-desc', label: 'Newest First' },
  { value: 'createdAt-asc', label: 'Oldest First' },
  { value: 'name-asc', label: 'Name A-Z' },
  { value: 'name-desc', label: 'Name Z-A' },
  { value: 'price-asc', label: 'Price Low to High' },
  { value: 'price-desc', label: 'Price High to Low' },
  { value: 'popularity-desc', label: 'Most Popular' },
];

const QUICK_FILTERS = [
  { label: 'All Products', params: {} },
  { label: 'Coffee', params: { category: 'coffee' } },
  { label: 'Merchandise', params: { category: 'merchandise' } },
  { label: 'Local Crafts', params: { category: 'local' } },
  { label: 'In Stock Only', params: { inStock: 'true' } },
  { label: 'Under $20', params: { maxPrice: '20' } },
  { label: 'Premium ($50+)', params: { minPrice: '50' } },
];

const CATEGORY_LABELS: Record<string, string> = {
  coffee: 'Coffee',
  merchandise: 'Merchandise',
  local: 'Local Crafts',
  food: 'Food & Beverages',
  accessories: 'Accessories',
};

export function ProductFilters({ categories, searchParams }: ProductFiltersProps) {
  const router = useRouter();
  const currentSearchParams = useSearchParams();
  const [isExpanded, setIsExpanded] = useState(false);
  
  // Local state for form inputs
  const [filters, setFilters] = useState({
    category: searchParams.category || 'all',
    minPrice: searchParams.minPrice || '',
    maxPrice: searchParams.maxPrice || '',
    inStock: searchParams.inStock === 'true',
    sortBy: searchParams.sortBy || 'createdAt',
    sortOrder: searchParams.sortOrder || 'desc',
  });

  // Update local state when search params change
  useEffect(() => {
    setFilters({
      category: searchParams.category || 'all',
      minPrice: searchParams.minPrice || '',
      maxPrice: searchParams.maxPrice || '',
      inStock: searchParams.inStock === 'true',
      sortBy: searchParams.sortBy || 'createdAt',
      sortOrder: searchParams.sortOrder || 'desc',
    });
  }, [searchParams]);

  const updateURL = (newFilters: Partial<typeof filters>) => {
    const params = new URLSearchParams(currentSearchParams.toString());
    
    // Update or remove parameters
    Object.entries({ ...filters, ...newFilters }).forEach(([key, value]) => {
      if (value && value !== 'all' && value !== false && value !== '') {
        params.set(key, value.toString());
      } else {
        params.delete(key);
      }
    });
    
    // Reset pagination when filters change
    params.delete('offset');
    
    router.push(`/shop?${params.toString()}`);
  };

  const handleFilterChange = (key: string, value: any) => {
    const newFilters = { ...filters, [key]: value };
    setFilters(newFilters);
    updateURL(newFilters);
  };

  const handleQuickFilter = (quickFilter: typeof QUICK_FILTERS[0]) => {
    const newFilters = {
      category: 'all',
      minPrice: '',
      maxPrice: '',
      inStock: false,
      sortBy: 'createdAt',
      sortOrder: 'desc',
      ...quickFilter.params,
    };
    setFilters(newFilters);
    updateURL(newFilters);
  };

  const clearAllFilters = () => {
    const defaultFilters = {
      category: 'all',
      minPrice: '',
      maxPrice: '',
      inStock: false,
      sortBy: 'createdAt',
      sortOrder: 'desc',
    };
    setFilters(defaultFilters);
    router.push('/shop');
  };

  const hasActiveFilters = () => {
    return (
      filters.category !== 'all' ||
      filters.minPrice !== '' ||
      filters.maxPrice !== '' ||
      filters.inStock ||
      filters.sortBy !== 'createdAt' ||
      filters.sortOrder !== 'desc'
    );
  };

  const getActiveFilterCount = () => {
    let count = 0;
    if (filters.category !== 'all') count++;
    if (filters.minPrice !== '') count++;
    if (filters.maxPrice !== '') count++;
    if (filters.inStock) count++;
    return count;
  };

  const getSortValue = () => {
    return `${filters.sortBy}-${filters.sortOrder}`;
  };

  const handleSortChange = (value: string) => {
    const [sortBy, sortOrder] = value.split('-');
    const newFilters = { ...filters, sortBy, sortOrder };
    setFilters(newFilters);
    updateURL(newFilters);
  };

  return (
    <div className="space-y-6">
      {/* Quick Filters */}
      <div className="flex flex-wrap gap-2">
        {QUICK_FILTERS.map((quickFilter, index) => {
          const isActive = Object.entries(quickFilter.params).every(
            ([key, value]) => filters[key as keyof typeof filters]?.toString() === value
          ) && Object.keys(quickFilter.params).length > 0 ? true : 
          Object.keys(quickFilter.params).length === 0 && !hasActiveFilters();
          
          return (
            <Button
              key={index}
              variant={isActive ? "default" : "outline"}
              size="sm"
              onClick={() => handleQuickFilter(quickFilter)}
              className="text-xs"
            >
              {quickFilter.label}
            </Button>
          );
        })}
      </div>

      {/* Main Filters */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg flex items-center gap-2">
              <Filter className="h-5 w-5" />
              Filters & Sort
              {getActiveFilterCount() > 0 && (
                <Badge variant="secondary" className="ml-2">
                  {getActiveFilterCount()}
                </Badge>
              )}
            </CardTitle>
            <div className="flex items-center gap-2">
              {hasActiveFilters() && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={clearAllFilters}
                  className="text-xs"
                >
                  <RotateCcw className="h-3 w-3 mr-1" />
                  Clear All
                </Button>
              )}
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setIsExpanded(!isExpanded)}
                className="lg:hidden"
              >
                {isExpanded ? 'Hide' : 'Show'} Filters
              </Button>
            </div>
          </div>
        </CardHeader>
        
        <CardContent className={cn(
          "space-y-6",
          "lg:block", // Always show on large screens
          isExpanded ? "block" : "hidden lg:block" // Toggle on mobile
        )}>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 xl:grid-cols-6 gap-4">
            {/* Category Filter */}
            <div className="space-y-2">
              <Label htmlFor="category">Category</Label>
              <Select
                value={filters.category}
                onValueChange={(value) => handleFilterChange('category', value)}
              >
                <SelectTrigger id="category">
                  <SelectValue placeholder="All Categories" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Categories</SelectItem>
                  {categories.map((category) => (
                    <SelectItem key={category} value={category}>
                      {CATEGORY_LABELS[category] || category}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Price Range */}
            <div className="space-y-2">
              <Label htmlFor="minPrice">Min Price ($)</Label>
              <Input
                id="minPrice"
                type="number"
                placeholder="0"
                value={filters.minPrice}
                onChange={(e) => handleFilterChange('minPrice', e.target.value)}
                min="0"
                step="0.01"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="maxPrice">Max Price ($)</Label>
              <Input
                id="maxPrice"
                type="number"
                placeholder="1000"
                value={filters.maxPrice}
                onChange={(e) => handleFilterChange('maxPrice', e.target.value)}
                min="0"
                step="0.01"
              />
            </div>

            {/* Stock Filter */}
            <div className="space-y-2">
              <Label>Availability</Label>
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="inStock"
                  checked={filters.inStock}
                  onCheckedChange={(checked) => handleFilterChange('inStock', checked)}
                />
                <Label htmlFor="inStock" className="text-sm font-normal">
                  In stock only
                </Label>
              </div>
            </div>

            {/* Sort Options */}
            <div className="space-y-2 md:col-span-2">
              <Label htmlFor="sort">Sort By</Label>
              <Select
                value={getSortValue()}
                onValueChange={handleSortChange}
              >
                <SelectTrigger id="sort">
                  <SelectValue placeholder="Sort by..." />
                </SelectTrigger>
                <SelectContent>
                  {SORT_OPTIONS.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Active Filters Display */}
          {hasActiveFilters() && (
            <>
              <Separator />
              <div className="space-y-2">
                <Label className="text-sm font-medium">Active Filters:</Label>
                <div className="flex flex-wrap gap-2">
                  {filters.category !== 'all' && (
                    <Badge variant="secondary" className="flex items-center gap-1">
                      Category: {CATEGORY_LABELS[filters.category] || filters.category}
                      <button
                        onClick={() => handleFilterChange('category', 'all')}
                        className="ml-1 hover:bg-gray-200 rounded-full p-0.5"
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </Badge>
                  )}
                  
                  {filters.minPrice && (
                    <Badge variant="secondary" className="flex items-center gap-1">
                      Min: ${filters.minPrice}
                      <button
                        onClick={() => handleFilterChange('minPrice', '')}
                        className="ml-1 hover:bg-gray-200 rounded-full p-0.5"
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </Badge>
                  )}
                  
                  {filters.maxPrice && (
                    <Badge variant="secondary" className="flex items-center gap-1">
                      Max: ${filters.maxPrice}
                      <button
                        onClick={() => handleFilterChange('maxPrice', '')}
                        className="ml-1 hover:bg-gray-200 rounded-full p-0.5"
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </Badge>
                  )}
                  
                  {filters.inStock && (
                    <Badge variant="secondary" className="flex items-center gap-1">
                      In Stock Only
                      <button
                        onClick={() => handleFilterChange('inStock', false)}
                        className="ml-1 hover:bg-gray-200 rounded-full p-0.5"
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </Badge>
                  )}
                </div>
              </div>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}