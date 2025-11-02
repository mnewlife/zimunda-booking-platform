'use client';

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Trash2, AlertTriangle } from 'lucide-react';

interface DeleteConfirmationDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: () => void;
  title?: string;
  description?: string;
  itemName?: string;
  itemType?: string;
  isLoading?: boolean;
  destructive?: boolean;
}

export function DeleteConfirmationDialog({
  open,
  onOpenChange,
  onConfirm,
  title,
  description,
  itemName,
  itemType = 'item',
  isLoading = false,
  destructive = true,
}: DeleteConfirmationDialogProps) {
  const defaultTitle = title || `Delete ${itemType}`;
  const defaultDescription = description || 
    `Are you sure you want to delete ${itemName ? `"${itemName}"` : `this ${itemType}`}? This action cannot be undone.`;

  const handleConfirm = () => {
    onConfirm();
  };

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent className="sm:max-w-md">
        <AlertDialogHeader>
          <div className="flex items-center gap-3">
            <div className={`flex h-10 w-10 items-center justify-center rounded-full ${
              destructive ? 'bg-red-100 text-red-600' : 'bg-orange-100 text-orange-600'
            }`}>
              {destructive ? (
                <Trash2 className="h-5 w-5" />
              ) : (
                <AlertTriangle className="h-5 w-5" />
              )}
            </div>
            <div className="flex-1">
              <AlertDialogTitle className="text-left">
                {defaultTitle}
              </AlertDialogTitle>
            </div>
          </div>
          <AlertDialogDescription className="text-left mt-2">
            {defaultDescription}
          </AlertDialogDescription>
        </AlertDialogHeader>
        
        <AlertDialogFooter className="flex-col-reverse sm:flex-row sm:justify-end gap-2">
          <AlertDialogCancel 
            disabled={isLoading}
            className="mt-2 sm:mt-0"
          >
            Cancel
          </AlertDialogCancel>
          <AlertDialogAction
            onClick={handleConfirm}
            disabled={isLoading}
            className={`${
              destructive 
                ? 'bg-red-600 hover:bg-red-700 focus:ring-red-600' 
                : 'bg-orange-600 hover:bg-orange-700 focus:ring-orange-600'
            } text-white`}
          >
            {isLoading ? (
              <div className="flex items-center gap-2">
                <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                Deleting...
              </div>
            ) : (
              `Delete ${itemType}`
            )}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

// Specialized version for products
interface ProductDeleteConfirmationDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: () => void;
  productName: string;
  hasVariants?: boolean;
  variantCount?: number;
  hasImages?: boolean;
  imageCount?: number;
  isLoading?: boolean;
}

export function ProductDeleteConfirmationDialog({
  open,
  onOpenChange,
  onConfirm,
  productName,
  hasVariants = false,
  variantCount = 0,
  hasImages = false,
  imageCount = 0,
  isLoading = false,
}: ProductDeleteConfirmationDialogProps) {
  const getDescription = () => {
    let description = `Are you sure you want to delete "${productName}"? This action cannot be undone.`;
    
    const additionalItems = [];
    if (hasVariants && variantCount > 0) {
      additionalItems.push(`${variantCount} variant${variantCount > 1 ? 's' : ''}`);
    }
    if (hasImages && imageCount > 0) {
      additionalItems.push(`${imageCount} image${imageCount > 1 ? 's' : ''}`);
    }
    
    if (additionalItems.length > 0) {
      description += ` This will also delete ${additionalItems.join(' and ')}.`;
    }
    
    return description;
  };

  return (
    <DeleteConfirmationDialog
      open={open}
      onOpenChange={onOpenChange}
      onConfirm={onConfirm}
      title="Delete Product"
      description={getDescription()}
      itemType="product"
      isLoading={isLoading}
      destructive={true}
    />
  );
}