import { Metadata } from 'next';
import { redirect } from 'next/navigation';
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
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Plus, MoreHorizontal, Eye, Edit, Trash2, Star, Home, TrendingUp, Users } from 'lucide-react';
import Link from 'next/link';

export const metadata: Metadata = {
  title: 'Amenities Management | Admin Dashboard',
  description: 'Manage property amenities and features',
};

export default async function AmenitiesPage() {
  const session = await getServerSession(authOptions);
  
  if (!session?.user) {
    redirect('/login');
  }

  if (session.user.role !== 'ADMIN' && session.user.role !== 'MANAGER') {
    redirect('/dashboard');
  }

  const [amenities, stats] = await Promise.all([
    prisma.amenity.findMany({
      include: {
        _count: {
          select: {
            properties: true,
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    }),
    Promise.all([
      prisma.amenity.count(),
      prisma.amenity.count({
        where: {
          isActive: true,
        },
      }),
      prisma.amenity.findMany({
        include: {
          _count: {
            select: {
              properties: true,
            },
          },
        },
        orderBy: {
          properties: {
            _count: 'desc',
          },
        },
        take: 1,
      }),
      prisma.property.count(),
    ]),
  ]);

  const [totalAmenities, activeAmenities, topAmenity, totalProperties] = stats;
  const mostPopularAmenity = topAmenity[0];
  const averageAmenitiesPerProperty = totalProperties > 0 
    ? amenities.reduce((sum, amenity) => sum + amenity._count.properties, 0) / totalProperties 
    : 0;

  return (
    <div className="flex-1 space-y-4 p-4 md:p-8 pt-6">
      <Breadcrumb>
        <BreadcrumbList>
          <BreadcrumbItem>
            <BreadcrumbLink href="/admin">Dashboard</BreadcrumbLink>
          </BreadcrumbItem>
          <BreadcrumbSeparator />
          <BreadcrumbItem>
            <BreadcrumbPage>Amenities</BreadcrumbPage>
          </BreadcrumbItem>
        </BreadcrumbList>
      </Breadcrumb>

      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Amenities Management</h1>
          <p className="text-muted-foreground">
            Manage property amenities and features
          </p>
        </div>
        <Button asChild>
          <Link href="/admin/amenities/add">
            <Plus className="mr-2 h-4 w-4" />
            Add New Amenity
          </Link>
        </Button>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Amenities</CardTitle>
            <Star className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalAmenities}</div>
            <p className="text-xs text-muted-foreground">
              {activeAmenities} active
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Most Popular</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {mostPopularAmenity ? mostPopularAmenity._count.properties : 0}
            </div>
            <p className="text-xs text-muted-foreground">
              {mostPopularAmenity ? mostPopularAmenity.name : 'No data'}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Properties</CardTitle>
            <Home className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalProperties}</div>
            <p className="text-xs text-muted-foreground">
              Total properties
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Avg. per Property</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{averageAmenitiesPerProperty.toFixed(1)}</div>
            <p className="text-xs text-muted-foreground">
              Amenities per property
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Amenities Table */}
      <Card>
        <CardHeader>
          <CardTitle>All Amenities</CardTitle>
        </CardHeader>
        <CardContent>
          {amenities.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Category</TableHead>
                  <TableHead>Icon</TableHead>
                  <TableHead>Properties</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Created</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {amenities.map((amenity) => (
                  <TableRow key={amenity.id}>
                    <TableCell>
                      <div>
                        <div className="font-medium">{amenity.name}</div>
                        {amenity.description && (
                          <div className="text-sm text-muted-foreground truncate max-w-[200px]">
                            {amenity.description}
                          </div>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline">
                        {amenity.category.split('_').map(word => 
                          word.charAt(0).toUpperCase() + word.slice(1).toLowerCase()
                        ).join(' ')}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {amenity.icon && (
                        <div className="w-6 h-6 flex items-center justify-center">
                          <span className="text-lg">{amenity.icon}</span>
                        </div>
                      )}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <span className="font-medium">{amenity._count.properties}</span>
                        <span className="text-sm text-muted-foreground">properties</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant={amenity.isActive ? 'default' : 'secondary'}>
                        {amenity.isActive ? 'Active' : 'Inactive'}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {new Date(amenity.createdAt).toLocaleDateString()}
                    </TableCell>
                    <TableCell className="text-right">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" className="h-8 w-8 p-0">
                            <span className="sr-only">Open menu</span>
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem asChild>
                            <Link href={`/admin/amenities/${amenity.id}`}>
                              <Eye className="mr-2 h-4 w-4" />
                              View
                            </Link>
                          </DropdownMenuItem>
                          <DropdownMenuItem asChild>
                            <Link href={`/admin/amenities/${amenity.id}/edit`}>
                              <Edit className="mr-2 h-4 w-4" />
                              Edit
                            </Link>
                          </DropdownMenuItem>
                          <DropdownMenuItem className="text-red-600">
                            <Trash2 className="mr-2 h-4 w-4" />
                            Delete
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : (
            <div className="text-center py-8">
              <Star className="mx-auto h-12 w-12 text-muted-foreground" />
              <h3 className="mt-2 text-sm font-semibold text-gray-900">No amenities</h3>
              <p className="mt-1 text-sm text-muted-foreground">
                Get started by creating a new amenity.
              </p>
              <div className="mt-6">
                <Button asChild>
                  <Link href="/admin/amenities/add">
                    <Plus className="mr-2 h-4 w-4" />
                    Add New Amenity
                  </Link>
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}