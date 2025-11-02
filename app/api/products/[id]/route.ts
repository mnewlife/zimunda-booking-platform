import { NextRequest, NextResponse } from 'next/server';
import { headers } from 'next/headers';
import { z } from 'zod';
import { auth } from '@/lib/auth';
import prisma from '@/lib/prisma';
import { ProductCategory } from '@prisma/client';

// Product validation schema - aligned with frontend validation
const productSchema = z.object({
  name: z.string().min(1, 'Product name is required').max(100, 'Name too long'),
  category: z.nativeEnum(ProductCategory),
  description: z.string().min(10, 'Description must be at least 10 characters'),
  price: z.number().min(0, 'Price must be positive'),
  inventory: z.number().int().min(0, 'Inventory cannot be negative'),
  images: z.array(z.object({
    id: z.string().optional(), // For existing images
    url: z.string().url(),
    alt: z.string().optional(),
    caption: z.string().optional(),
    order: z.number().int().default(0),
  })).optional(),
  variants: z.array(z.object({
    id: z.string().optional(), // For existing variants
    name: z.string().min(1, 'Variant name is required'),
    price: z.number().min(0, 'Price must be positive'),
    inventory: z.number().min(0, 'Inventory must be non-negative'),
    sku: z.string().min(1, 'SKU is required'),
    options: z.record(z.string()).optional()
  })).optional()
});

interface RouteParams {
  params: Promise<{
    id: string;
  }>;
}

// GET /api/products/[id] - Get a specific product
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params;

    const product = await prisma.product.findUnique({
      where: { id },
      include: {
        images: {
          orderBy: {
            order: 'asc',
          },
        },
        variants: true,
      },
    });

    if (!product) {
      return NextResponse.json(
        { error: 'Product not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({ product });
  } catch (error) {
    console.error('Error fetching product:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// PUT /api/products/[id] - Update a specific product (admin only)
export async function PUT(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params;
    
    const session = await auth.api.getSession({
      headers: await headers(),
    });

    if (!session || !['ADMIN', 'MANAGER'].includes(session.user.role)) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const body = await request.json();
    console.log('Received update data:', JSON.stringify(body, null, 2));
    
    const validatedData = productSchema.partial().parse(body);
    console.log('Validated update data:', JSON.stringify(validatedData, null, 2));

    // Check if product exists
    const existingProduct = await prisma.product.findUnique({
      where: { id },
      include: {
        images: true,
        variants: true,
      },
    });

    if (!existingProduct) {
      return NextResponse.json(
        { error: 'Product not found' },
        { status: 404 }
      );
    }

    // Use a transaction to ensure data consistency
    const updatedProduct = await prisma.$transaction(async (tx) => {
      // Update basic product information
      const { images, variants, ...productData } = validatedData;
      
      const product = await tx.product.update({
        where: { id },
        data: productData,
      });

      // Handle images update
      if (images !== undefined) {
        // Delete existing images
        await tx.image.deleteMany({
          where: { productId: id },
        });

        // Create new images
        if (images.length > 0) {
          await tx.image.createMany({
            data: images.map((image, index) => ({
              productId: id,
              url: image.url,
              alt: image.alt || '',
              order: image.order ?? index,
            })),
          });
        }
      }

      // Handle variants update
      if (variants !== undefined) {
        // Delete existing variants
        await tx.productVariant.deleteMany({
          where: { productId: id },
        });

        // Create new variants
        if (variants.length > 0) {
          await tx.productVariant.createMany({
            data: variants.map((variant) => ({
              productId: id,
              name: variant.name,
              price: variant.price,
              inventory: variant.inventory,
              sku: variant.sku,
              options: variant.options || {},
            })),
          });
        }
      }

      // Return the updated product with relations
      return await tx.product.findUnique({
        where: { id },
        include: {
          images: {
            orderBy: {
              order: 'asc',
            },
          },
          variants: true,
        },
      });
    });

    return NextResponse.json({ product: updatedProduct });
  } catch (error) {
    if (error instanceof z.ZodError) {
      console.error('Validation error details:', error.errors);
      return NextResponse.json(
        { 
          error: 'Validation error', 
          details: error.errors,
          message: 'Please check your form data and try again'
        },
        { status: 400 }
      );
    }

    console.error('Error updating product:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// DELETE /api/products/[id] - Delete a specific product (admin only)
export async function DELETE(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params;
    
    const session = await auth.api.getSession({
      headers: await headers(),
    });

    if (!session || session.user.role !== 'ADMIN') {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Check if product exists and get related data for proper cascade handling
    const existingProduct = await prisma.product.findUnique({
      where: { id },
      include: {
        images: true,
        variants: true,
        orders: {
          select: {
            id: true,
            status: true,
          },
        },
        _count: {
          select: {
            images: true,
            variants: true,
            orders: true,
          },
        },
      },
    });

    if (!existingProduct) {
      return NextResponse.json(
        { error: 'Product not found' },
        { status: 404 }
      );
    }

    // Check if product has active orders
    const activeOrders = existingProduct.orders.filter(
      order => order.status === 'PENDING' || order.status === 'CONFIRMED'
    );

    if (activeOrders.length > 0) {
      return NextResponse.json(
        { 
          error: 'Cannot delete product with active orders',
          details: `This product has ${activeOrders.length} active order(s). Please complete or cancel these orders before deleting the product.`,
          activeOrderCount: activeOrders.length
        },
        { status: 409 }
      );
    }

    // Use transaction for safe cascade deletion
    const deletionResult = await prisma.$transaction(async (tx) => {
      // First, delete all related images
      const deletedImages = await tx.image.deleteMany({
        where: { productId: id },
      });

      // Delete all product variants
      const deletedVariants = await tx.productVariant.deleteMany({
        where: { productId: id },
      });

      // Delete any completed order items (keep order history but remove product reference)
      const updatedOrderItems = await tx.orderItem.updateMany({
        where: { productId: id },
        data: { productId: null }, // Set to null to maintain order history
      });

      // Finally, delete the product itself
      const deletedProduct = await tx.product.delete({
        where: { id },
      });

      return {
        product: deletedProduct,
        deletedImages: deletedImages.count,
        deletedVariants: deletedVariants.count,
        updatedOrderItems: updatedOrderItems.count,
      };
    });

    return NextResponse.json({ 
      message: 'Product deleted successfully',
      details: {
        productName: existingProduct.name,
        deletedImages: deletionResult.deletedImages,
        deletedVariants: deletionResult.deletedVariants,
        updatedOrderItems: deletionResult.updatedOrderItems,
      }
    });
  } catch (error) {
    console.error('Error deleting product:', error);
    
    // Handle specific Prisma errors
    if (error instanceof Error) {
      if (error.message.includes('Foreign key constraint')) {
        return NextResponse.json(
          { 
            error: 'Cannot delete product due to existing references',
            details: 'This product is referenced by other records and cannot be deleted. Please remove all references first.'
          },
          { status: 409 }
        );
      }
    }

    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}