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
import { Checkbox } from '@/components/ui/checkbox';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ChevronDown, Filter, X } from 'lucide-react';
import { cn } from '@/lib/utils';

interface PropertyFiltersProps {
  amenities: {
    id: string;
    name: string;
    icon: string;
  }[];
}

interface FilterState {
  type: string;
  minPrice: string;
  maxPrice: string;
  occupancy: string;
  amenities: string[];
}

export function PropertyFilters({ amenities }: PropertyFiltersProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [isOpen, setIsOpen] = useState(false);
  const [filters, setFilters] = useState<FilterState>({
    type: 'all',
    minPrice: '',
    maxPrice: '',
    occupancy: 'any',
    amenities: [],
  });

  // Initialize filters from URL params
  useEffect(() => {
    setFilters({
      type: searchParams.get('type') || 'all',
      minPrice: searchParams.get('minPrice') || '',
      maxPrice: searchParams.get('maxPrice') || '',
      occupancy: searchParams.get('occupancy') || 'any',
      amenities: searchParams.get('amenities')?.split(',').filter(Boolean) || [],
    });
  }, [searchParams]);

  const updateURL = (newFilters: FilterState) => {
    const params = new URLSearchParams();
    
    if (newFilters.type && newFilters.type !== 'all') {
      params.set('type', newFilters.type);
    }
    if (newFilters.minPrice) {
      params.set('minPrice', newFilters.minPrice);
    }
    if (newFilters.maxPrice) {
      params.set('maxPrice', newFilters.maxPrice);
    }
    if (newFilters.occupancy && newFilters.occupancy !== 'any') {
      params.set('occupancy', newFilters.occupancy);
    }
    if (newFilters.amenities.length > 0) {
      params.set('amenities', newFilters.amenities.join(','));
    }

    const queryString = params.toString();
    const newURL = queryString ? `?${queryString}` : '/properties';
    router.push(newURL);
  };

  const handleFilterChange = (key: keyof FilterState, value: string | string[]) => {
    const newFilters = { ...filters, [key]: value };
    setFilters(newFilters);
    updateURL(newFilters);
  };

  const handleAmenityToggle = (amenityId: string) => {
    const newAmenities = filters.amenities.includes(amenityId)
      ? filters.amenities.filter(id => id !== amenityId)
      : [...filters.amenities, amenityId];
    
    handleFilterChange('amenities', newAmenities);
  };

  const clearFilters = () => {
    const clearedFilters = {
      type: 'all',
      minPrice: '',
      maxPrice: '',
      occupancy: 'any',
      amenities: [],
    };
    setFilters(clearedFilters);
    router.push('/properties');
  };

  const hasActiveFilters = 
    filters.type !== 'all' ||
    filters.minPrice ||
    filters.maxPrice ||
    (filters.occupancy && filters.occupancy !== 'any') ||
    filters.amenities.length > 0;

  return (
    <div className="mb-8">
      <Card>
        <Collapsible open={isOpen} onOpenChange={setIsOpen}>
          <CollapsibleTrigger asChild>
            <CardHeader className="cursor-pointer transition-colors">
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center space-x-2 py-1">
                  <Filter className="h-5 w-5" />
                  <span className='hover:text-green-600'>Filters</span>
                  {hasActiveFilters && (
                    <span className="bg-green-600 text-white text-xs px-2 py-1 rounded-full">
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
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                {/* Property Type */}
                <div className="space-y-2">
                  <Label htmlFor="type">Property Type</Label>
                  <Select
                    value={filters.type}
                    onValueChange={(value) => handleFilterChange('type', value)}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="All types" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Types</SelectItem>
                      <SelectItem value="cottage">Cottage</SelectItem>
                      <SelectItem value="cabin">Cabin</SelectItem>
                      {/*<SelectItem value="villa">Villa</SelectItem>
                      <SelectItem value="lodge">Lodge</SelectItem>*/}
                    </SelectContent>
                  </Select>
                </div>

                {/* Price Range */}
                <div className="space-y-2">
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

                {/* Occupancy */}
                <div className="space-y-2">
                  <Label htmlFor="occupancy">Minimum Guests</Label>
                  <Select
                    value={filters.occupancy}
                    onValueChange={(value) => handleFilterChange('occupancy', value)}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Any" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="any">Any</SelectItem>
                      <SelectItem value="1">1+ Guest</SelectItem>
                      <SelectItem value="2">2+ Guests</SelectItem>
                      <SelectItem value="4">4+ Guests</SelectItem>
                      <SelectItem value="6">6+ Guests</SelectItem>
                      <SelectItem value="8">8+ Guests</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {/* Amenities */}
                <div className="space-y-2">
                  <Label>Amenities</Label>
                  <div className="max-h-32 overflow-y-auto space-y-2 border rounded-md p-3">
                    {amenities.map((amenity) => (
                      <div key={amenity.id} className="flex items-center space-x-2">
                        <Checkbox
                          id={amenity.id}
                          checked={filters.amenities.includes(amenity.id)}
                          onCheckedChange={() => handleAmenityToggle(amenity.id)}
                        />
                        <Label
                          htmlFor={amenity.id}
                          className="text-sm font-normal cursor-pointer"
                        >
                          {amenity.name}
                        </Label>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* Quick Filter Buttons */}
              <div className="mt-6 pt-4 border-t">
                <div className="flex flex-wrap gap-2">
                  <Button
                    variant={filters.type === 'cottage' ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => handleFilterChange('type', filters.type === 'cottage' ? 'all' : 'cottage')}
                  >
                    Cottages
                  </Button>
                  <Button
                    variant={filters.type === 'cabin' ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => handleFilterChange('type', filters.type === 'cabin' ? 'all' : 'cabin')}
                  >
                    Cabins
                  </Button>
                  <Button
                    variant={filters.occupancy === '4' ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => handleFilterChange('occupancy', filters.occupancy === '4' ? 'any' : '4')}
                  >
                    Family Size (4+)
                  </Button>
                  <Button
                    variant={filters.maxPrice === '200' ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => handleFilterChange('maxPrice', filters.maxPrice === '200' ? '' : '200')}
                  >
                    Under $200
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