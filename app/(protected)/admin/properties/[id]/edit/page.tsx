import { Metadata } from 'next';
import { redirect, notFound } from 'next/navigation';
import { headers } from 'next/headers';
import { auth } from '@/lib/auth';
import prisma from '@/lib/prisma';
import { AdminSidebar } from '@/components/admin-sidebar';
import { SidebarProvider, SidebarInset, SidebarTrigger } from '@/components/ui/sidebar';
import { Separator } from '@/components/ui/separator';
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from '@/components/ui/breadcrumb';
import { PropertyFormPage } from '@/components/admin/property-form-page';

export const metadata: Metadata = {
  title: 'Edit Property | Admin Dashboard',
  description: 'Edit property details and settings',
};

interface EditPropertyPageProps {
  params: Promise<{
    id: string;
  }>;
}

async function getProperty(id: string) {
  const property = await prisma.property.findUnique({
    where: {
      id,
    },
    include: {
      images: {
        orderBy: {
          order: 'asc',
        },
      },
      amenities: {
        include: {
          amenity: true,
        },
      },
    },
  });

  return property;
}

export default async function EditPropertyPage({ params }: EditPropertyPageProps) {
  const session = await auth.api.getSession({
    headers: await headers(),
  });
  
  if (!session?.user || (session.user as any).role !== 'ADMIN') {
    redirect('/login');
  }

  const { id } = await params;
  const property = await getProperty(id);

  if (!property) {
    notFound();
  }

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
                <BreadcrumbItem className="hidden md:block">
                  <BreadcrumbLink href="/admin/properties">
                    Properties
                  </BreadcrumbLink>
                </BreadcrumbItem>
                <BreadcrumbSeparator className="hidden md:block" />
                <BreadcrumbItem>
                  <BreadcrumbPage>Edit {property.name}</BreadcrumbPage>
                </BreadcrumbItem>
              </BreadcrumbList>
            </Breadcrumb>
          </div>
        </header>

        <div className="flex flex-1 flex-col gap-4 p-4 pt-0">
          <div className="mb-6">
            <h1 className="text-3xl font-bold tracking-tight">Edit Property</h1>
            <p className="text-muted-foreground">
              Update property details and settings for {property.name}.
            </p>
          </div>
          
          <PropertyFormPage property={property} />
        </div>
      </SidebarInset>
  );
}