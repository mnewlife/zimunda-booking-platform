import { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { headers } from 'next/headers';
import { auth } from '@/lib/auth';
import { DeletePropertyDialog } from '@/components/admin/delete-property-dialog';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
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
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from '@/components/ui/breadcrumb';
import { Separator } from '@/components/ui/separator';
import {
  SidebarInset,
  SidebarProvider,
  SidebarTrigger,
} from '@/components/ui/sidebar';
import {
  Plus,
  Search,
  Filter,
  MoreHorizontal,
  Edit,
  Trash2,
  Eye,
  Home,
  MapPin,
  Users,
  DollarSign,
  Calendar,
  Star,
} from 'lucide-react';
import Link from 'next/link';
import Image from 'next/image';
import { AdminSidebar } from '@/components/admin-sidebar';
import { prisma } from '@/lib/db';
import { PropertyType, PropertyStatus } from '@prisma/client';

export const metadata: Metadata = {
  title: 'Properties Management | Admin Dashboard',
  description: 'Manage all properties in the system',
};

const getStatusColor = (status: PropertyStatus) => {
  switch (status) {
    case 'ACTIVE':
      return 'bg-green-100 text-green-800';
    case 'INACTIVE':
      return 'bg-gray-100 text-gray-800';
    case 'MAINTENANCE':
      return 'bg-yellow-100 text-yellow-800';
    default:
      return 'bg-gray-100 text-gray-800';
  }
};

const getTypeColor = (type: PropertyType) => {
  switch (type) {
    case 'COTTAGE':
      return 'bg-blue-100 text-blue-800';
    case 'CABIN':
      return 'bg-purple-100 text-purple-800';
    default:
      return 'bg-gray-100 text-gray-800';
  }
};

const getProperties = async () => {
  try {
    const properties = await prisma.property.findMany({
      include: {
        images: {
          orderBy: { order: 'asc' },
          take: 1,
        },
        amenities: {
          include: {
            amenity: true,
          },
        },
        bookings: {
          where: {
            status: 'CONFIRMED',
          },
          select: {
            id: true,
            status: true,
            totalPrice: true,
          },
        },
        _count: {
          select: {
            bookings: true,
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    return properties.map(property => ({
      ...property,
      basePrice: Number(property.basePrice),
      bookings: property.bookings.map(booking => ({
        ...booking,
        totalPrice: Number(booking.totalPrice),
      })),
      location: property.location as { address: string; city: string; country: string },
      policies: property.policies as { checkIn: string; checkOut: string; cancellation: string },
      totalBookings: property._count.bookings,
      activeBookings: property.bookings.length,
      mainImage: property.images[0]?.url || '/placeholder-property.jpg',
    }));
  } catch (error) {
    console.error('Error fetching properties:', error);
    return [];
  }
};

const getPropertyStats = async () => {
  try {
    const [totalProperties, activeProperties, inactiveProperties, maintenanceProperties] = await Promise.all([
      prisma.property.count(),
      prisma.property.count({ where: { status: 'ACTIVE' } }),
      prisma.property.count({ where: { status: 'INACTIVE' } }),
      prisma.property.count({ where: { status: 'MAINTENANCE' } }),
    ]);

    const totalRevenue = await prisma.booking.aggregate({
      where: {
        status: 'COMPLETED',
        paymentStatus: 'COMPLETED',
      },
      _sum: {
        totalPrice: true,
      },
    });

    const totalBookings = await prisma.booking.count({
      where: {
        status: { in: ['CONFIRMED', 'COMPLETED'] },
      },
    });

    return {
      totalProperties,
      activeProperties,
      inactiveProperties,
      maintenanceProperties,
      totalRevenue: Number(totalRevenue._sum.totalPrice) || 0,
      totalBookings,
    };
  } catch (error) {
    console.error('Error fetching property stats:', error);
    return {
      totalProperties: 0,
      activeProperties: 0,
      inactiveProperties: 0,
      maintenanceProperties: 0,
      totalRevenue: 0,
      totalBookings: 0,
    };
  }
};

export default async function PropertiesPage() {
  const session = await auth.api.getSession({
    headers: await headers(),
  });
  
  if (!session?.user || (session.user as any).role !== 'ADMIN') {
    redirect('/login');
  }

  const [properties, stats] = await Promise.all([
    getProperties(),
    getPropertyStats(),
  ]);

  return (
      <SidebarInset>
        <header className="flex h-16 shrink-0 items-center gap-2 transition-[width,height] ease-linear group-has-[[data-collapsible=icon]]/sidebar-wrapper:h-12">
          <div className="flex items-center gap-2 px-4">
            <SidebarTrigger className="-ml-1" />
            <Separator orientation="vertical" className="mr-2 h-4" />
            <Breadcrumb>
              <BreadcrumbList>
                <BreadcrumbItem className="hidden md:block">
                  <BreadcrumbLink href="/admin">
                    Admin Dashboard
                  </BreadcrumbLink>
                </BreadcrumbItem>
                <BreadcrumbSeparator className="hidden md:block" />
                <BreadcrumbItem>
                  <BreadcrumbPage>Properties</BreadcrumbPage>
                </BreadcrumbItem>
              </BreadcrumbList>
            </Breadcrumb>
          </div>
        </header>

        <div className="flex flex-1 flex-col gap-4 p-4 pt-0">
          {/* Header */}
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold tracking-tight">Properties Management</h1>
              <p className="text-muted-foreground">
                Manage all properties, their details, and availability
              </p>
            </div>
            <Button asChild>
              <Link href="/admin/properties/add">
                <Plus className="h-4 w-4 mr-2" />
                Add Property
              </Link>
            </Button>
          </div>

          {/* Stats Cards */}
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Properties</CardTitle>
                <Home className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stats.totalProperties}</div>
                <p className="text-xs text-muted-foreground">
                  {stats.activeProperties} active, {stats.inactiveProperties} inactive
                </p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Revenue</CardTitle>
                <DollarSign className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">${stats.totalRevenue.toLocaleString()}</div>
                <p className="text-xs text-muted-foreground">
                  From completed bookings
                </p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Bookings</CardTitle>
                <Calendar className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stats.totalBookings}</div>
                <p className="text-xs text-muted-foreground">
                  Confirmed and completed
                </p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Maintenance</CardTitle>
                <Users className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stats.maintenanceProperties}</div>
                <p className="text-xs text-muted-foreground">
                  Properties under maintenance
                </p>
              </CardContent>
            </Card>
          </div>

          {/* Properties Table */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>All Properties</CardTitle>
                <div className="flex items-center gap-2">
                  <div className="relative">
                    <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                    <Input placeholder="Search properties..." className="pl-8 w-[300px]" />
                  </div>
                  <Button variant="outline" size="sm">
                    <Filter className="h-4 w-4 mr-2" />
                    Filter
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Property</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Location</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Occupancy</TableHead>
                    <TableHead>Base Price</TableHead>
                    <TableHead>Bookings</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {properties.map((property) => (
                    <TableRow key={property.id}>
                      <TableCell>
                        <div className="flex items-center gap-3">
                          <div className="relative h-12 w-12 rounded-lg overflow-hidden">
                            <Image
                              src={property.mainImage}
                              alt={property.name}
                              fill
                              className="object-cover"
                            />
                          </div>
                          <div>
                            <div className="font-medium">{property.name}</div>
                            <div className="text-sm text-muted-foreground">
                              {property.slug}
                            </div>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge className={getTypeColor(property.type)}>
                          {property.type}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1">
                          <MapPin className="h-3 w-3 text-muted-foreground" />
                          <span className="text-sm">
                            {property.location.city}, {property.location.country}
                          </span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge className={getStatusColor(property.status)}>
                          {property.status}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1">
                          <Users className="h-3 w-3 text-muted-foreground" />
                          <span>{property.maxOccupancy}</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="font-medium">
                          ${Number(property.basePrice)}/night
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="text-sm">
                          <div>{property.activeBookings} active</div>
                          <div className="text-muted-foreground">
                            {property.totalBookings} total
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" className="h-8 w-8 p-0">
                              <span className="sr-only">Open menu</span>
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuLabel>Actions</DropdownMenuLabel>
                            <DropdownMenuItem asChild>
                              <Link href={`/properties/${property.slug}`}>
                                <Eye className="h-4 w-4 mr-2" />
                                View Property
                              </Link>
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem asChild>
                              <Link href={`/admin/properties/${property.id}/edit`}>
                                <Edit className="h-4 w-4 mr-2" />
                                Edit Property
                              </Link>
                            </DropdownMenuItem>
                            <DeletePropertyDialog propertyId={property.id} propertyName={property.name}>
                              <DropdownMenuItem>
                                <Trash2 className="h-4 w-4 mr-2" />
                                Delete Property
                              </DropdownMenuItem>
                            </DeletePropertyDialog>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
              {properties.length === 0 && (
                <div className="text-center py-8">
                  <Home className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                  <h3 className="text-lg font-semibold">No properties found</h3>
                  <p className="text-muted-foreground mb-4">
                    Get started by adding your first property.
                  </p>
                  <Button asChild>
                    <Link href="/admin/properties/add">
                      <Plus className="h-4 w-4 mr-2" />
                      Add Property
                    </Link>
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </SidebarInset>
  );
}