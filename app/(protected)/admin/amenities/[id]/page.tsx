import { Metadata } from 'next';
import { redirect, notFound } from 'next/navigation';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import prisma from '@/lib/prisma';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from '@/components/ui/breadcrumb';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Edit, Home, Users, TrendingUp, Calendar } from 'lucide-react';
import Link from 'next/link';

export const metadata: Metadata = {
  title: 'Amenity Details | Admin Dashboard',
  description: 'View amenity details and usage statistics',
};

interface AmenityDetailsPageProps {
  params: {
    id: string;
  };
}

export default async function AmenityDetailsPage({ params }: AmenityDetailsPageProps) {
  const session = await getServerSession(authOptions);
  
  if (!session?.user) {
    redirect('/login');
  }

  if (session.user.role !== 'ADMIN' && session.user.role !== 'MANAGER') {
    redirect('/dashboard');
  }

  const [amenity, properties] = await Promise.all([
    prisma.amenity.findUnique({
      where: {
        id: params.id,
      },
      include: {
        _count: {
          select: {
            properties: true,
          },
        },
      },
    }),
    prisma.property.findMany({
      where: {
        amenities: {
          some: {
            id: params.id,
          },
        },
      },
      include: {
        _count: {
          select: {
            bookings: true,
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
      take: 10,
    }),
  ]);

  if (!amenity) {
    notFound();
  }

  const totalProperties = amenity._count.properties;
  const totalBookings = properties.reduce((sum, property) => sum + property._count.bookings, 0);
  const averageBookingsPerProperty = totalProperties > 0 ? totalBookings / totalProperties : 0;

  const formatCategoryName = (category: string) => {
    return category
      .split('_')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
      .join(' ');
  };

  return (
    <div className="flex-1 space-y-4 p-4 md:p-8 pt-6">
      <Breadcrumb>
        <BreadcrumbList>
          <BreadcrumbItem>
            <BreadcrumbLink href="/admin">Dashboard</BreadcrumbLink>
          </BreadcrumbItem>
          <BreadcrumbSeparator />
          <BreadcrumbItem>
            <BreadcrumbLink href="/admin/amenities">Amenities</BreadcrumbLink>
          </BreadcrumbItem>
          <BreadcrumbSeparator />
          <BreadcrumbItem>
            <BreadcrumbPage>{amenity.name}</BreadcrumbPage>
          </BreadcrumbItem>
        </BreadcrumbList>
      </Breadcrumb>

      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div>
            <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2">
              {amenity.icon && <span className="text-2xl">{amenity.icon}</span>}
              {amenity.name}
            </h1>
            <p className="text-muted-foreground">
              Amenity details and usage statistics
            </p>
          </div>
        </div>
        <Button asChild>
          <Link href={`/admin/amenities/${amenity.id}/edit`}>
            <Edit className="mr-2 h-4 w-4" />
            Edit Amenity
          </Link>
        </Button>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Properties</CardTitle>
            <Home className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalProperties}</div>
            <p className="text-xs text-muted-foreground">
              Using this amenity
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Bookings</CardTitle>
            <Calendar className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalBookings}</div>
            <p className="text-xs text-muted-foreground">
              From properties with this amenity
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Avg. Bookings</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{averageBookingsPerProperty.toFixed(1)}</div>
            <p className="text-xs text-muted-foreground">
              Per property
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Category</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-lg font-bold">
              <Badge variant="outline">
                {formatCategoryName(amenity.category)}
              </Badge>
            </div>
            <p className="text-xs text-muted-foreground">
              Amenity type
            </p>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        {/* Amenity Details */}
        <Card>
          <CardHeader>
            <CardTitle>Amenity Information</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <label className="text-sm font-medium text-muted-foreground">Name</label>
              <p className="text-sm flex items-center gap-2">
                {amenity.icon && <span className="text-lg">{amenity.icon}</span>}
                {amenity.name}
              </p>
            </div>
            
            <div>
              <label className="text-sm font-medium text-muted-foreground">Category</label>
              <div className="mt-1">
                <Badge variant="outline">{formatCategoryName(amenity.category)}</Badge>
              </div>
            </div>
            
            <div>
              <label className="text-sm font-medium text-muted-foreground">Status</label>
              <div className="mt-1">
                <Badge variant={amenity.isActive ? 'default' : 'secondary'}>
                  {amenity.isActive ? 'Active' : 'Inactive'}
                </Badge>
              </div>
            </div>
            
            {amenity.description && (
              <div>
                <label className="text-sm font-medium text-muted-foreground">Description</label>
                <p className="text-sm mt-1">{amenity.description}</p>
              </div>
            )}
            
            <div>
              <label className="text-sm font-medium text-muted-foreground">Created</label>
              <p className="text-sm">{new Date(amenity.createdAt).toLocaleDateString()}</p>
            </div>
            
            <div>
              <label className="text-sm font-medium text-muted-foreground">Last Updated</label>
              <p className="text-sm">{new Date(amenity.updatedAt).toLocaleDateString()}</p>
            </div>
          </CardContent>
        </Card>

        {/* Properties Using This Amenity */}
        <Card>
          <CardHeader>
            <CardTitle>Properties with This Amenity</CardTitle>
          </CardHeader>
          <CardContent>
            {properties.length > 0 ? (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Property</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Bookings</TableHead>
                    <TableHead>Created</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {properties.map((property) => (
                    <TableRow key={property.id}>
                      <TableCell>
                        <div>
                          <div className="font-medium">
                            <Link 
                              href={`/admin/properties/${property.id}`}
                              className="hover:underline"
                            >
                              {property.name}
                            </Link>
                          </div>
                          {property.location && (
                            <div className="text-sm text-muted-foreground">
                              {property.location}
                            </div>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline">
                          {property.type.split('_').map(word => 
                            word.charAt(0).toUpperCase() + word.slice(1).toLowerCase()
                          ).join(' ')}
                        </Badge>
                      </TableCell>
                      <TableCell>{property._count.bookings}</TableCell>
                      <TableCell>
                        {new Date(property.createdAt).toLocaleDateString()}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            ) : (
              <p className="text-muted-foreground text-center py-4">
                No properties are currently using this amenity.
              </p>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}