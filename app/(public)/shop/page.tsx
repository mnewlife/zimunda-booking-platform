import { Suspense } from 'react';
import { Metadata } from 'next';
import prisma from '@/lib/prisma';
import { ProductCard } from '@/components/product/product-card';
import { ProductFilters } from '@/components/product/product-filters';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { ShoppingBag, Filter } from 'lucide-react';
import Link from 'next/link';

export const metadata: Metadata = {
  title: 'Shop - Zimunda Estate',
  description: 'Shop premium coffee, merchandise, and local products from Zimunda Estate in Vumba, Zimbabwe.',
  keywords: 'zimunda estate shop, zimbabwe coffee, vumba products, estate merchandise',
};

interface SearchParams {
  category?: string;
  minPrice?: string;
  maxPrice?: string;
  inStock?: string;
  sortBy?: string;
  sortOrder?: string;
  limit?: string;
  offset?: string;
}

interface ShopPageProps {
  searchParams: Promise<SearchParams>;
}

async function getProducts(searchParams: SearchParams) {
  const {
    category,
    minPrice,
    maxPrice,
    inStock,
    sortBy = 'createdAt',
    sortOrder = 'desc',
    limit = '12',
    offset = '0',
  } = searchParams;

  // Build where clause
  const where: any = {};

  if (category && category !== 'all') {
    where.category = category;
  }

  if (minPrice || maxPrice) {
    where.price = {};
    if (minPrice) where.price.gte = parseFloat(minPrice);
    if (maxPrice) where.price.lte = parseFloat(maxPrice);
  }

  if (inStock === 'true') {
    where.inventory = {
      gt: 0,
    };
  }

  // Build order by clause
  const orderBy: any = {};
  if (sortBy === 'price') {
    orderBy.price = sortOrder;
  } else if (sortBy === 'name') {
    orderBy.name = sortOrder;
  } else if (sortBy === 'popularity') {
    orderBy.totalSales = sortOrder;
  } else {
    orderBy.createdAt = sortOrder;
  }

  const [products, total, categories] = await Promise.all([
    prisma.product.findMany({
      where,
      orderBy,
      take: parseInt(limit),
      skip: parseInt(offset),
      include: {
        variants: {
          orderBy: {
            price: 'asc',
          },
        },
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
    }),
    prisma.product.count({ where }),
    prisma.product.findMany({
      select: {
        category: true,
      },
      distinct: ['category'],
    }),
  ]);

  return {
    products: products.map(product => ({
      ...product,
      price: Number(product.price),
      variants: product.variants.map(variant => ({
        ...variant,
        price: Number(variant.price),
      })),
      totalSales: product._count.orders,
      inStock: product.inventory > 0,
    })),
    total,
    categories: categories.map(c => c.category),
  };
}

function ProductSkeleton() {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
      {Array.from({ length: 8 }).map((_, i) => (
        <div key={i} className="space-y-4">
          <Skeleton className="aspect-square w-full" />
          <div className="space-y-2">
            <Skeleton className="h-4 w-3/4" />
            <Skeleton className="h-4 w-1/2" />
            <Skeleton className="h-6 w-1/4" />
          </div>
        </div>
      ))}
    </div>
  );
}

export default async function ShopPage({ searchParams }: ShopPageProps) {
  const resolvedSearchParams = await searchParams;
  const { products, total, categories } = await getProducts(resolvedSearchParams);
  const hasFilters = Object.keys(resolvedSearchParams).some(key => 
    ['category', 'minPrice', 'maxPrice', 'inStock'].includes(key) && resolvedSearchParams[key as keyof SearchParams]
  );

  return (
    <div className="min-h-screen bg-background">
      {/* Hero Section */}
      <section className="bg-gradient-to-r from-green-50 to-emerald-50 py-16">
        <div className="container mx-auto px-4">
          <div className="text-center max-w-3xl mx-auto">
            <div className="flex items-center justify-center mb-4">
              <ShoppingBag className="h-12 w-12 text-green-600 mr-3" />
              <h1 className="text-4xl md:text-5xl font-bold text-gray-900">
                Zimunda Shop
              </h1>
            </div>
            <p className="text-xl text-gray-600 mb-8">
              Discover premium coffee, handcrafted merchandise, and authentic local products 
              from our estate in the beautiful Vumba mountains.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Button size="lg" asChild>
                <Link href="#products">
                  Browse Products
                </Link>
              </Button>
              <Button variant="outline" size="lg" asChild>
                <Link href="/about">
                  Our Story
                </Link>
              </Button>
            </div>
          </div>
        </div>
      </section>

      {/* Filters and Products */}
      <section id="products" className="py-16">
        <div className="container mx-auto px-4">
          {/* Filters */}
          <div className="mb-8">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h2 className="text-2xl font-bold text-gray-900 mb-2">
                  Our Products
                </h2>
                <p className="text-gray-600">
                  {total} {total === 1 ? 'product' : 'products'} available
                  {hasFilters && ' (filtered)'}
                </p>
              </div>
              <div className="flex items-center gap-2">
                <Filter className="h-4 w-4 text-gray-500" />
                <span className="text-sm text-gray-500">Filter & Sort</span>
              </div>
            </div>
            
            <Suspense fallback={<div className="h-20 bg-gray-50 rounded-lg animate-pulse" />}>
              <ProductFilters 
                categories={categories}
                searchParams={searchParams}
              />
            </Suspense>
          </div>

          {/* Products Grid */}
          <Suspense fallback={<ProductSkeleton />}>
            {products.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                {products.map((product) => (
                  <ProductCard key={product.id} product={product} />
                ))}
              </div>
            ) : (
              <div className="text-center py-16">
                <ShoppingBag className="h-16 w-16 text-gray-300 mx-auto mb-4" />
                <h3 className="text-xl font-semibold text-gray-900 mb-2">
                  No products found
                </h3>
                <p className="text-gray-600 mb-6">
                  {hasFilters 
                    ? 'Try adjusting your filters to see more products.'
                    : 'We\'re currently updating our product catalog. Please check back soon!'
                  }
                </p>
                {hasFilters && (
                  <Button variant="outline" asChild>
                    <Link href="/shop">
                      Clear Filters
                    </Link>
                  </Button>
                )}
              </div>
            )}
          </Suspense>

          {/* Pagination */}
          {total > parseInt(resolvedSearchParams.limit || '12') && (
            <div className="mt-12 flex justify-center">
              <div className="flex items-center gap-2">
                {parseInt(resolvedSearchParams.offset || '0') > 0 && (
                  <Button variant="outline" asChild>
                    <Link 
                      href={{
                        pathname: '/shop',
                        query: {
                          ...resolvedSearchParams,
                          offset: Math.max(0, parseInt(resolvedSearchParams.offset || '0') - parseInt(resolvedSearchParams.limit || '12')).toString(),
                        },
                      }}
                    >
                      Previous
                    </Link>
                  </Button>
                )}
                
                <span className="px-4 py-2 text-sm text-gray-600">
                  Showing {parseInt(resolvedSearchParams.offset || '0') + 1} - {Math.min(parseInt(resolvedSearchParams.offset || '0') + parseInt(resolvedSearchParams.limit || '12'), total)} of {total}
                </span>
                
                {parseInt(resolvedSearchParams.offset || '0') + parseInt(resolvedSearchParams.limit || '12') < total && (
                  <Button variant="outline" asChild>
                    <Link 
                      href={{
                        pathname: '/shop',
                        query: {
                          ...resolvedSearchParams,
                          offset: (parseInt(resolvedSearchParams.offset || '0') + parseInt(resolvedSearchParams.limit || '12')).toString(),
                        },
                      }}
                    >
                      Next
                    </Link>
                  </Button>
                )}
              </div>
            </div>
          )}
        </div>
      </section>

      {/* Featured Categories */}
      <section className="py-16 bg-gray-50">
        <div className="container mx-auto px-4">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold text-gray-900 mb-4">
              Shop by Category
            </h2>
            <p className="text-gray-600 max-w-2xl mx-auto">
              Explore our carefully curated selection of products, 
              from our signature coffee to unique local crafts.
            </p>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <Link 
              href="/shop?category=coffee"
              className="group bg-white rounded-lg p-6 shadow-sm hover:shadow-md transition-shadow"
            >
              <div className="text-center">
                <div className="w-16 h-16 bg-amber-100 rounded-full flex items-center justify-center mx-auto mb-4 group-hover:bg-amber-200 transition-colors">
                  <span className="text-2xl">☕</span>
                </div>
                <h3 className="text-xl font-semibold text-gray-900 mb-2">
                  Premium Coffee
                </h3>
                <p className="text-gray-600">
                  Freshly roasted beans from our estate
                </p>
              </div>
            </Link>
            
            <Link 
              href="/shop?category=merchandise"
              className="group bg-white rounded-lg p-6 shadow-sm hover:shadow-md transition-shadow"
            >
              <div className="text-center">
                <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4 group-hover:bg-green-200 transition-colors">
                  <span className="text-2xl">🎁</span>
                </div>
                <h3 className="text-xl font-semibold text-gray-900 mb-2">
                  Merchandise
                </h3>
                <p className="text-gray-600">
                  Branded apparel and accessories
                </p>
              </div>
            </Link>
            
            <Link 
              href="/shop?category=local"
              className="group bg-white rounded-lg p-6 shadow-sm hover:shadow-md transition-shadow"
            >
              <div className="text-center">
                <div className="w-16 h-16 bg-purple-100 rounded-full flex items-center justify-center mx-auto mb-4 group-hover:bg-purple-200 transition-colors">
                  <span className="text-2xl">🏺</span>
                </div>
                <h3 className="text-xl font-semibold text-gray-900 mb-2">
                  Local Crafts
                </h3>
                <p className="text-gray-600">
                  Authentic Zimbabwean artisan products
                </p>
              </div>
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}