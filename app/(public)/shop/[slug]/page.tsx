import { Suspense } from 'react';
import { Metadata } from 'next/metadata';
import { notFound } from 'next/navigation';
import prisma from '@/lib/prisma';
import { ProductGallery } from '@/components/product/product-gallery';
import { ProductDetails } from '@/components/product/product-details';
import { ProductPurchase } from '@/components/product/product-purchase';
import { ProductReviews } from '@/components/product/product-reviews';
import { ProductCard } from '@/components/product/product-card';
import { Breadcrumb, BreadcrumbItem, BreadcrumbLink, BreadcrumbList, BreadcrumbPage, BreadcrumbSeparator } from '@/components/ui/breadcrumb';
import { Skeleton } from '@/components/ui/skeleton';
import { ArrowLeft } from 'lucide-react';
import Link from 'next/link';

interface ProductPageProps {
  params: {
    slug: string;
  };
}

async function getProduct(slug: string) {
  const product = await prisma.product.findUnique({
    where: {
      id: slug, // Using id instead of slug since slug field doesn't exist
    },
    include: {
      variants: {
        orderBy: {
          price: 'asc',
        },
      },
      images: true,
      _count: {
        select: {
          orders: {
            where: {
              order: {
                status: 'DELIVERED',
              },
            },
          },
        },
      },
    },
  });

  if (!product) {
    return null;
  }

  return {
    ...product,
    price: Number(product.price),
    variants: product.variants.map(variant => ({
      ...variant,
      price: Number(variant.price),
    })),
    totalSales: product._count.orders,
    inStock: product.inventory > 0,
  };
}

async function getSimilarProducts(productId: string, category: string, limit = 4) {
  const products = await prisma.product.findMany({
    where: {
      id: {
        not: productId,
      },
      category,
    },
    include: {
      variants: {
        orderBy: {
          price: 'asc',
        },
      },
      images: true,
      _count: {
        select: {
          orders: {
            where: {
              order: {
                status: 'DELIVERED',
              },
            },
          },
        },
      },
    },
    take: limit,
    orderBy: {
      createdAt: 'desc',
    },
  });

  return products.map(product => ({
    ...product,
    price: Number(product.price),
    variants: product.variants.map(variant => ({
      ...variant,
      price: Number(variant.price),
    })),
    totalSales: product._count.orders,
    inStock: product.inventory > 0,
  }));
}

export async function generateMetadata({ params }: ProductPageProps): Promise<Metadata> {
  const resolvedParams = await params;
  const product = await getProduct(resolvedParams.slug);

  if (!product) {
    return {
      title: 'Product Not Found - Zimunda Estate',
      description: 'The requested product could not be found.',
    };
  }

  return {
    title: `${product.name} - Zimunda Estate Shop`,
    description: product.description,
    keywords: `${product.name}, ${product.category}, zimunda estate, zimbabwe, vumba`,
    openGraph: {
      title: product.name,
      description: product.description,
      images: product.images.slice(0, 4).map(image => ({
        url: image.url,
        alt: image.alt || product.name,
      })),
      type: 'website',
    },
  };
}

function ProductDetailsSkeleton() {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
      {/* Gallery Skeleton */}
      <div className="space-y-4">
        <Skeleton className="aspect-square w-full" />
        <div className="grid grid-cols-4 gap-2">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="aspect-square" />
          ))}
        </div>
      </div>
      
      {/* Details Skeleton */}
      <div className="space-y-6">
        <div className="space-y-2">
          <Skeleton className="h-8 w-3/4" />
          <Skeleton className="h-4 w-1/2" />
          <Skeleton className="h-6 w-1/4" />
        </div>
        
        <div className="space-y-2">
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-3/4" />
        </div>
        
        <div className="space-y-4">
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-10 w-full" />
        </div>
      </div>
    </div>
  );
}

export default async function ProductPage({ params }: ProductPageProps) {
  const resolvedParams = await params;
  const product = await getProduct(resolvedParams.slug);

  if (!product) {
    notFound();
  }

  const similarProducts = await getSimilarProducts(product.id, product.category);

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-8">
        {/* Breadcrumb */}
        <div className="mb-6">
          <Breadcrumb>
            <BreadcrumbList>
              <BreadcrumbItem>
                <BreadcrumbLink href="/">Home</BreadcrumbLink>
              </BreadcrumbItem>
              <BreadcrumbSeparator />
              <BreadcrumbItem>
                <BreadcrumbLink href="/shop">Shop</BreadcrumbLink>
              </BreadcrumbItem>
              <BreadcrumbSeparator />
              <BreadcrumbItem>
                <BreadcrumbLink href={`/shop?category=${product.category}`}>
                  {product.category.charAt(0).toUpperCase() + product.category.slice(1)}
                </BreadcrumbLink>
              </BreadcrumbItem>
              <BreadcrumbSeparator />
              <BreadcrumbItem>
                <BreadcrumbPage>{product.name}</BreadcrumbPage>
              </BreadcrumbItem>
            </BreadcrumbList>
          </Breadcrumb>
        </div>

        {/* Back Button */}
        <div className="mb-6">
          <Link 
            href="/shop"
            className="inline-flex items-center gap-2 text-sm text-gray-600 hover:text-gray-900 transition-colors"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to Shop
          </Link>
        </div>

        {/* Product Details */}
        <Suspense fallback={<ProductDetailsSkeleton />}>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-16">
            {/* Product Gallery */}
            <div>
              <ProductGallery 
                images={product.images}
                productName={product.name}
              />
            </div>

            {/* Product Info & Purchase */}
            <div className="space-y-8">
              <ProductDetails product={product} />
              <ProductPurchase product={product} />
            </div>
          </div>
        </Suspense>

        {/* Product Reviews */}
        <div className="mb-16">
          <Suspense fallback={
            <div className="space-y-4">
              <Skeleton className="h-8 w-48" />
              <div className="space-y-4">
                {Array.from({ length: 3 }).map((_, i) => (
                  <div key={i} className="space-y-2">
                    <Skeleton className="h-4 w-32" />
                    <Skeleton className="h-4 w-full" />
                    <Skeleton className="h-4 w-3/4" />
                  </div>
                ))}
              </div>
            </div>
          }>
            <ProductReviews 
              productId={product.id}
              reviews={product.reviews}
              averageRating={product.averageRating}
              totalReviews={product.totalReviews}
            />
          </Suspense>
        </div>

        {/* Similar Products */}
        {similarProducts.length > 0 && (
          <div>
            <div className="mb-8">
              <h2 className="text-2xl font-bold text-gray-900 mb-2">
                Similar Products
              </h2>
              <p className="text-gray-600">
                More products from our {product.category} collection
              </p>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              {similarProducts.map((similarProduct) => (
                <ProductCard 
                  key={similarProduct.id} 
                  product={similarProduct}
                />
              ))}
            </div>
            
            <div className="text-center mt-8">
              <Link 
                href={`/shop?category=${product.category}`}
                className="inline-flex items-center justify-center px-6 py-3 border border-gray-300 rounded-md text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 transition-colors"
              >
                View All {product.category.charAt(0).toUpperCase() + product.category.slice(1)} Products
              </Link>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// Generate static params for popular products (optional)
export async function generateStaticParams() {
  const products = await prisma.product.findMany({
    select: {
      id: true,
    },
    take: 20,
  });

  return products.map((product) => ({
    slug: product.id,
  }));
}