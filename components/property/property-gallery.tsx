'use client';

import { useState } from 'react';
import Image from 'next/image';
import { Dialog, DialogContent, DialogTrigger } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { 
  ChevronLeft, 
  ChevronRight, 
  X, 
  ZoomIn,
  Grid3X3
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface PropertyGalleryProps {
  images: {
    id: string;
    url: string;
    alt: string;
    order: number;
  }[];
  propertyName: string;
}

export function PropertyGallery({ images, propertyName }: PropertyGalleryProps) {
  const [selectedImageIndex, setSelectedImageIndex] = useState(0);
  const [isGalleryOpen, setIsGalleryOpen] = useState(false);
  const [imageErrors, setImageErrors] = useState<Set<string>>(new Set());

  const handleImageError = (imageId: string) => {
    setImageErrors(prev => new Set([...prev, imageId]));
  };

  const nextImage = () => {
    setSelectedImageIndex((prev) => 
      prev === images.length - 1 ? 0 : prev + 1
    );
  };

  const prevImage = () => {
    setSelectedImageIndex((prev) => 
      prev === 0 ? images.length - 1 : prev - 1
    );
  };

  const validImages = images.filter(img => !imageErrors.has(img.id));
  const fallbackImage = '/images/property-placeholder.jpg';

  if (validImages.length === 0) {
    return (
      <div className="h-96 bg-gray-200 flex items-center justify-center">
        <div className="text-center text-gray-500">
          <Grid3X3 className="h-16 w-16 mx-auto mb-4" />
          <p className="text-lg font-medium">No images available</p>
          <p className="text-sm">Images for {propertyName} will be added soon</p>
        </div>
      </div>
    );
  }

  const mainImage = validImages[0];
  const thumbnailImages = validImages.slice(1, 5);

  return (
    <>
      {/* Main Gallery Grid */}
      <div className="grid grid-cols-4 gap-2 h-96 md:h-[500px]">
        {/* Main Image */}
        <div className="col-span-4 md:col-span-2 relative group cursor-pointer overflow-hidden rounded-lg">
          <Image
            src={mainImage.url}
            alt={mainImage.alt || propertyName}
            fill
            className="object-cover group-hover:scale-105 transition-transform duration-300"
            onError={() => handleImageError(mainImage.id)}
            priority
          />
          <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors duration-300" />
          <Button
            variant="secondary"
            size="sm"
            className="absolute bottom-4 right-4 opacity-0 group-hover:opacity-100 transition-opacity"
            onClick={() => {
              setSelectedImageIndex(0);
              setIsGalleryOpen(true);
            }}
          >
            <ZoomIn className="h-4 w-4 mr-2" />
            View Gallery
          </Button>
        </div>

        {/* Thumbnail Grid */}
        <div className="col-span-4 md:col-span-2 grid grid-cols-2 gap-2">
          {thumbnailImages.map((image, index) => (
            <div 
              key={image.id}
              className="relative group cursor-pointer overflow-hidden rounded-lg h-full"
              onClick={() => {
                setSelectedImageIndex(index + 1);
                setIsGalleryOpen(true);
              }}
            >
              <Image
                src={image.url}
                alt={image.alt || `${propertyName} - Image ${index + 2}`}
                fill
                className="object-cover group-hover:scale-105 transition-transform duration-300"
                onError={() => handleImageError(image.id)}
              />
              <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors duration-300" />
              
              {/* Show All Photos overlay on last thumbnail */}
              {index === 3 && validImages.length > 5 && (
                <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
                  <div className="text-white text-center">
                    <Grid3X3 className="h-6 w-6 mx-auto mb-1" />
                    <span className="text-sm font-medium">
                      +{validImages.length - 4} more
                    </span>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Full Screen Gallery Modal */}
      <Dialog open={isGalleryOpen} onOpenChange={setIsGalleryOpen}>
        <DialogContent className="max-w-7xl w-full h-full max-h-screen p-0 bg-black">
          <div className="relative w-full h-full flex items-center justify-center">
            {/* Close Button */}
            <Button
              variant="ghost"
              size="icon"
              className="absolute top-4 right-4 z-50 text-white hover:bg-white/20"
              onClick={() => setIsGalleryOpen(false)}
            >
              <X className="h-6 w-6" />
            </Button>

            {/* Image Counter */}
            <div className="absolute top-4 left-4 z-50 bg-black/50 text-white px-3 py-1 rounded-full text-sm">
              {selectedImageIndex + 1} / {validImages.length}
            </div>

            {/* Navigation Buttons */}
            {validImages.length > 1 && (
              <>
                <Button
                  variant="ghost"
                  size="icon"
                  className="absolute left-4 top-1/2 transform -translate-y-1/2 z-50 text-white hover:bg-white/20"
                  onClick={prevImage}
                >
                  <ChevronLeft className="h-8 w-8" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  className="absolute right-4 top-1/2 transform -translate-y-1/2 z-50 text-white hover:bg-white/20"
                  onClick={nextImage}
                >
                  <ChevronRight className="h-8 w-8" />
                </Button>
              </>
            )}

            {/* Main Image */}
            <div className="relative w-full h-full max-w-5xl max-h-[80vh] mx-4">
              <Image
                src={validImages[selectedImageIndex]?.url || fallbackImage}
                alt={validImages[selectedImageIndex]?.alt || `${propertyName} - Image ${selectedImageIndex + 1}`}
                fill
                className="object-contain"
                onError={() => handleImageError(validImages[selectedImageIndex]?.id)}
              />
            </div>

            {/* Thumbnail Strip */}
            <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2 z-50">
              <div className="flex space-x-2 bg-black/50 p-2 rounded-lg max-w-md overflow-x-auto">
                {validImages.map((image, index) => (
                  <button
                    key={image.id}
                    onClick={() => setSelectedImageIndex(index)}
                    className={cn(
                      "relative w-16 h-12 rounded overflow-hidden flex-shrink-0 border-2 transition-all",
                      index === selectedImageIndex
                        ? "border-white"
                        : "border-transparent opacity-70 hover:opacity-100"
                    )}
                  >
                    <Image
                      src={image.url}
                      alt={image.alt || `${propertyName} thumbnail ${index + 1}`}
                      fill
                      className="object-cover"
                      onError={() => handleImageError(image.id)}
                    />
                  </button>
                ))}
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}