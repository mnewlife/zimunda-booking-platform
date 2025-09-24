'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import * as z from 'zod';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { X, Plus, Loader2, Upload, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { ProductCategory } from '@prisma/client';
import Image from 'next/image';

const productFormSchema = z.object({
  name: z.string().min(1, 'Product name is required').max(100, 'Name too long'),
  category: z.nativeEnum(ProductCategory),
  description: z.string().min(10, 'Description must be at least 10 characters'),
  price: z.number().min(0, 'Price must be positive'),
  inventory: z.number().min(0, 'Inventory must be non-negative'),
  images: z.array(z.object({
    url: z.string().url('Invalid image URL'),
    alt: z.string().optional(),
    caption: z.string().optional(),
    order: z.number().default(0)
  })).optional(),
  variants: z.array(z.object({
    name: z.string().min(1, 'Variant name is required'),
    price: z.number().min(0, 'Price must be positive'),
    inventory: z.number().min(0, 'Inventory must be non-negative'),
    sku: z.string().min(1, 'SKU is required'),
    options: z.record(z.string()).optional()
  })).optional()
});

type ProductFormValues = z.infer<typeof productFormSchema>;

interface ProductFormProps {
  initialData?: Partial<ProductFormValues> & { id?: string };
  isEditing?: boolean;
}

const PRODUCT_CATEGORIES = [
  { value: 'COFFEE', label: 'Coffee' },
  { value: 'MERCHANDISE', label: 'Merchandise' },
  { value: 'FOOD', label: 'Food' },
  { value: 'BEVERAGES', label: 'Beverages' },
];

export function ProductForm({ initialData, isEditing = false }: ProductFormProps) {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [images, setImages] = useState(initialData?.images || []);
  const [variants, setVariants] = useState(initialData?.variants || []);
  const [newImageUrl, setNewImageUrl] = useState('');

  const form = useForm<ProductFormValues>({
    resolver: zodResolver(productFormSchema),
    defaultValues: {
      name: initialData?.name || '',
      category: initialData?.category || 'COFFEE',
      description: initialData?.description || '',
      price: initialData?.price || 0,
      inventory: initialData?.inventory || 0,
      images: images,
      variants: variants
    },
  });

  const addImage = () => {
    if (newImageUrl.trim()) {
      try {
        new URL(newImageUrl); // Validate URL
        const newImage = {
          url: newImageUrl.trim(),
          alt: '',
          caption: '',
          order: images.length
        };
        const updatedImages = [...images, newImage];
        setImages(updatedImages);
        form.setValue('images', updatedImages);
        setNewImageUrl('');
      } catch {
        toast.error('Please enter a valid image URL');
      }
    }
  };

  const removeImage = (index: number) => {
    const updatedImages = images.filter((_, i) => i !== index);
    setImages(updatedImages);
    form.setValue('images', updatedImages);
  };

  const updateImageField = (index: number, field: 'alt' | 'caption', value: string) => {
    const updatedImages = images.map((img, i) => 
      i === index ? { ...img, [field]: value } : img
    );
    setImages(updatedImages);
    form.setValue('images', updatedImages);
  };

  const addVariant = () => {
    const newVariant = {
      name: '',
      price: 0,
      inventory: 0,
      sku: '',
      options: {}
    };
    const updatedVariants = [...variants, newVariant];
    setVariants(updatedVariants);
    form.setValue('variants', updatedVariants);
  };

  const removeVariant = (index: number) => {
    const updatedVariants = variants.filter((_, i) => i !== index);
    setVariants(updatedVariants);
    form.setValue('variants', updatedVariants);
  };

  const updateVariant = (index: number, field: keyof typeof variants[0], value: any) => {
    const updatedVariants = variants.map((variant, i) => 
      i === index ? { ...variant, [field]: value } : variant
    );
    setVariants(updatedVariants);
    form.setValue('variants', updatedVariants);
  };

  const onSubmit = async (data: ProductFormValues) => {
    setIsLoading(true);
    try {
      const url = isEditing ? `/api/products/${initialData?.id}` : '/api/products';
      const method = isEditing ? 'PUT' : 'POST';
      
      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ...data,
          images,
          variants
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to save product');
      }

      toast.success(isEditing ? 'Product updated successfully' : 'Product created successfully');
      router.push('/admin/products');
      router.refresh();
    } catch (error) {
      console.error('Error saving product:', error);
      toast.error('Failed to save product. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        <div className="grid gap-6 md:grid-cols-2">
          {/* Basic Information */}
          <Card>
            <CardHeader>
              <CardTitle>Basic Information</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Product Name</FormLabel>
                    <FormControl>
                      <Input placeholder="e.g., Premium Coffee Beans" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="category"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Category</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select category" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {PRODUCT_CATEGORIES.map((category) => (
                          <SelectItem key={category.value} value={category.value}>
                            {category.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="description"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Description</FormLabel>
                    <FormControl>
                      <Textarea
                        placeholder="Describe the product..."
                        className="min-h-[100px]"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </CardContent>
          </Card>

          {/* Pricing & Inventory */}
          <Card>
            <CardHeader>
              <CardTitle>Pricing & Inventory</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <FormField
                control={form.control}
                name="price"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Price ($)</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        step="0.01"
                        placeholder="25.00"
                        {...field}
                        onChange={(e) => field.onChange(parseFloat(e.target.value) || 0)}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="inventory"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Inventory</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        placeholder="100"
                        {...field}
                        onChange={(e) => field.onChange(parseInt(e.target.value) || 0)}
                      />
                    </FormControl>
                    <FormDescription>
                      Number of units in stock
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </CardContent>
          </Card>
        </div>

        {/* Product Images */}
        <Card>
          <CardHeader>
            <CardTitle>Product Images</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex gap-2">
              <Input
                placeholder="Enter image URL"
                value={newImageUrl}
                onChange={(e) => setNewImageUrl(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), addImage())}
              />
              <Button type="button" onClick={addImage} variant="outline">
                <Plus className="h-4 w-4" />
              </Button>
            </div>
            
            <div className="grid gap-4 md:grid-cols-2">
              {images.map((image, index) => (
                <div key={index} className="border rounded-lg p-4 space-y-2">
                  <div className="relative h-32 w-full rounded-md overflow-hidden bg-gray-100">
                    <Image
                      src={image.url}
                      alt={image.alt || 'Product image'}
                      fill
                      className="object-cover"
                      onError={() => {
                        toast.error(`Failed to load image: ${image.url}`);
                      }}
                    />
                    <Button
                      type="button"
                      onClick={() => removeImage(index)}
                      variant="destructive"
                      size="sm"
                      className="absolute top-2 right-2"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                  <Input
                    placeholder="Alt text"
                    value={image.alt || ''}
                    onChange={(e) => updateImageField(index, 'alt', e.target.value)}
                  />
                  <Input
                    placeholder="Caption"
                    value={image.caption || ''}
                    onChange={(e) => updateImageField(index, 'caption', e.target.value)}
                  />
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Product Variants */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>Product Variants</CardTitle>
              <Button type="button" onClick={addVariant} variant="outline" size="sm">
                <Plus className="h-4 w-4 mr-1" />
                Add Variant
              </Button>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            {variants.length === 0 ? (
              <p className="text-muted-foreground text-center py-4">
                No variants added. Click "Add Variant" to create product variations.
              </p>
            ) : (
              <div className="space-y-4">
                {variants.map((variant, index) => (
                  <div key={index} className="border rounded-lg p-4 space-y-4">
                    <div className="flex items-center justify-between">
                      <h4 className="font-medium">Variant {index + 1}</h4>
                      <Button
                        type="button"
                        onClick={() => removeVariant(index)}
                        variant="outline"
                        size="sm"
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                    <div className="grid gap-4 md:grid-cols-2">
                      <Input
                        placeholder="Variant name (e.g., 250g Ground)"
                        value={variant.name}
                        onChange={(e) => updateVariant(index, 'name', e.target.value)}
                      />
                      <Input
                        placeholder="SKU"
                        value={variant.sku}
                        onChange={(e) => updateVariant(index, 'sku', e.target.value)}
                      />
                      <Input
                        type="number"
                        step="0.01"
                        placeholder="Price"
                        value={variant.price}
                        onChange={(e) => updateVariant(index, 'price', parseFloat(e.target.value) || 0)}
                      />
                      <Input
                        type="number"
                        placeholder="Inventory"
                        value={variant.inventory}
                        onChange={(e) => updateVariant(index, 'inventory', parseInt(e.target.value) || 0)}
                      />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Submit Buttons */}
        <div className="flex items-center justify-end space-x-2">
          <Button
            type="button"
            variant="outline"
            onClick={() => router.back()}
            disabled={isLoading}
          >
            Cancel
          </Button>
          <Button type="submit" disabled={isLoading}>
            {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {isEditing ? 'Update Product' : 'Create Product'}
          </Button>
        </div>
      </form>
    </Form>
  );
}