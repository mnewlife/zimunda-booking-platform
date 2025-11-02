'use client';

import { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ChevronDown, Filter, X, Mountain, Binoculars, Camera, TrendingUp } from 'lucide-react';
import { cn } from '@/lib/utils';

interface FilterState {
  type: string;
  duration: string;
  minPrice: string;
  maxPrice: string;
}

export function ActivityFilters() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [isOpen, setIsOpen] = useState(false);
  const [filters, setFilters] = useState<FilterState>({
    type: 'all',
    duration: 'any',
    minPrice: '',
    maxPrice: '',
  });

  // Initialize filters from URL params
  useEffect(() => {
    setFilters({
      type: searchParams.get('type') || 'all',
      duration: searchParams.get('duration') || 'any',
      minPrice: searchParams.get('minPrice') || '',
      maxPrice: searchParams.get('maxPrice') || '',
    });
  }, [searchParams]);

  const updateURL = (newFilters: FilterState) => {
    const params = new URLSearchParams();
    
    if (newFilters.type && newFilters.type !== 'all') {
      params.set('type', newFilters.type);
    }
    if (newFilters.duration && newFilters.duration !== 'any') {
      params.set('duration', newFilters.duration);
    }

    if (newFilters.minPrice) {
      params.set('minPrice', newFilters.minPrice);
    }
    if (newFilters.maxPrice) {
      params.set('maxPrice', newFilters.maxPrice);
    }

    const queryString = params.toString();
    const newURL = queryString ? `?${queryString}` : '/activities';
    router.push(newURL);
  };

  const handleFilterChange = (key: keyof FilterState, value: string) => {
    const newFilters = { ...filters, [key]: value };
    setFilters(newFilters);
    updateURL(newFilters);
  };

  const clearFilters = () => {
    const clearedFilters = {
      type: 'all',
      duration: 'any',
      minPrice: '',
      maxPrice: '',
    };
    setFilters(clearedFilters);
    router.push('/activities');
  };

  const hasActiveFilters = 
    filters.type !== 'all' ||
    (filters.duration && filters.duration !== 'any') ||
    filters.minPrice ||
    filters.maxPrice;

  return (
    <div className="mb-8">
      <Card>
        <Collapsible open={isOpen} onOpenChange={setIsOpen}>
          <CollapsibleTrigger asChild>
            <CardHeader className="cursor-pointer hover:bg-gray-50 transition-colors">
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center space-x-2">
                  <Filter className="h-5 w-5" />
                  <span>Filters</span>
                  {hasActiveFilters && (
                    <span className="bg-blue-600 text-white text-xs px-2 py-1 rounded-full">
                      Active
                    </span>
                  )}
                </CardTitle>
                <div className="flex items-center space-x-2">
                  {hasActiveFilters && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={(e) => {
                        e.stopPropagation();
                        clearFilters();
                      }}
                      className="text-red-600 hover:text-red-700"
                    >
                      <X className="h-4 w-4 mr-1" />
                      Clear
                    </Button>
                  )}
                  <ChevronDown 
                    className={cn(
                      "h-4 w-4 transition-transform",
                      isOpen && "transform rotate-180"
                    )} 
                  />
                </div>
              </div>
            </CardHeader>
          </CollapsibleTrigger>
          
          <CollapsibleContent>
            <CardContent className="pt-0">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6">
                {/* Activity Type */}
                <div className="space-y-2">
                  <Label htmlFor="type">Activity Type</Label>
                  <Select
                    value={filters.type}
                    onValueChange={(value) => handleFilterChange('type', value)}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="All types" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Types</SelectItem>
                      <SelectItem value="hiking">Hiking</SelectItem>
                      <SelectItem value="wildlife">Wildlife</SelectItem>
                      <SelectItem value="photography">Photography</SelectItem>
                      <SelectItem value="adventure">Adventure</SelectItem>
                      <SelectItem value="cultural">Cultural</SelectItem>
                      <SelectItem value="wellness">Wellness</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {/* Duration */}
                <div className="space-y-2">
                  <Label htmlFor="duration">Max Duration</Label>
                  <Select
                    value={filters.duration}
                    onValueChange={(value) => handleFilterChange('duration', value)}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Any duration" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="any">Any Duration</SelectItem>
                      <SelectItem value="2">Up to 2 hours</SelectItem>
                      <SelectItem value="4">Up to 4 hours</SelectItem>
                      <SelectItem value="8">Up to 8 hours</SelectItem>
                      <SelectItem value="24">Full day</SelectItem>
                      <SelectItem value="48">Multi-day</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {/* Price Range */}
                <div className="space-y-2 md:col-span-2">
                  <Label>Price Range (USD)</Label>
                  <div className="flex space-x-2">
                    <Input
                      type="number"
                      placeholder="Min"
                      value={filters.minPrice}
                      onChange={(e) => handleFilterChange('minPrice', e.target.value)}
                      className="w-full"
                    />
                    <Input
                      type="number"
                      placeholder="Max"
                      value={filters.maxPrice}
                      onChange={(e) => handleFilterChange('maxPrice', e.target.value)}
                      className="w-full"
                    />
                  </div>
                </div>
              </div>

              {/* Quick Filter Buttons */}
              <div className="mt-6 pt-4 border-t">
                <div className="flex flex-wrap gap-2">
                  <Button
                    variant={filters.type === 'hiking' ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => handleFilterChange('type', filters.type === 'hiking' ? 'all' : 'hiking')}
                    className="flex items-center space-x-1"
                  >
                    <Mountain className="h-3 w-3" />
                    <span>Hiking</span>
                  </Button>
                  <Button
                    variant={filters.type === 'wildlife' ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => handleFilterChange('type', filters.type === 'wildlife' ? 'all' : 'wildlife')}
                    className="flex items-center space-x-1"
                  >
                    <Binoculars className="h-3 w-3" />
                    <span>Wildlife</span>
                  </Button>
                  <Button
                    variant={filters.type === 'photography' ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => handleFilterChange('type', filters.type === 'photography' ? 'all' : 'photography')}
                    className="flex items-center space-x-1"
                  >
                    <Camera className="h-3 w-3" />
                    <span>Photography</span>
                  </Button>
                  <Button
                    variant={filters.type === 'adventure' ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => handleFilterChange('type', filters.type === 'adventure' ? 'all' : 'adventure')}
                    className="flex items-center space-x-1"
                  >
                    <TrendingUp className="h-3 w-3" />
                    <span>Adventure</span>
                  </Button>

                  <Button
                    variant={filters.duration === '4' ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => handleFilterChange('duration', filters.duration === '4' ? 'any' : '4')}
                  >
                    Half Day
                  </Button>
                  <Button
                    variant={filters.maxPrice === '50' ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => handleFilterChange('maxPrice', filters.maxPrice === '50' ? '' : '50')}
                  >
                    Under $50
                  </Button>
                </div>
              </div>
            </CardContent>
          </CollapsibleContent>
        </Collapsible>
      </Card>
    </div>
  );
}