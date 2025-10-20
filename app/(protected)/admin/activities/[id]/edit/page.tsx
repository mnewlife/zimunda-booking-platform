import { Metadata } from 'next';
import { redirect, notFound } from 'next/navigation';
import { auth } from '@/lib/auth';
import { headers } from 'next/headers';
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from '@/components/ui/breadcrumb';
import { Separator } from '@/components/ui/separator';
import { SidebarTrigger } from '@/components/ui/sidebar';
import { ActivityForm } from '@/components/admin/activity-form';
import prisma from '@/lib/prisma';

export const metadata: Metadata = {
  title: 'Edit Activity | Zimunda Estate Admin',
  description: 'Edit activity details',
};

interface EditActivityPageProps {
  params: {
    id: string;
  };
}

const getActivity = async (id: string) => {
  const activity = await prisma.activity.findUnique({
    where: { id },
  });

  if (!activity) {
    notFound();
  }

  return activity;
};

export default async function EditActivityPage({ params }: EditActivityPageProps) {
  const session = await auth.api.getSession({
    headers: await headers()
  });

  if (!session?.user) {
    redirect('/login');
  }

  if (session.user.role !== 'ADMIN' && session.user.role !== 'MANAGER') {
    redirect('/dashboard');
  }

  const activity = await getActivity(params.id);

  // Parse the availability JSON
  const availability = typeof activity.availability === 'object' && activity.availability !== null
    ? activity.availability as { days: string[], timeSlots: { start: string, end: string }[] }
    : { days: [], timeSlots: [{ start: '09:00', end: '17:00' }] };

  const initialData = {
    id: activity.id,
    name: activity.name,
    type: activity.type,
    description: activity.description,
    duration: activity.duration,
    price: Number(activity.price),
    capacity: activity.capacity,
    requirements: activity.requirements,
    availability,
  };

  return (
    <div className="flex-1 space-y-4 p-4 md:p-8 pt-6">
      <div className="flex items-center gap-4">
        <SidebarTrigger className="-ml-1" />
        <Separator orientation="vertical" className="mr-2 h-4" />
        <Breadcrumb>
          <BreadcrumbList>
            <BreadcrumbItem className="hidden md:block">
              <BreadcrumbLink href="/admin">
                Dashboard
              </BreadcrumbLink>
            </BreadcrumbItem>
            <BreadcrumbSeparator className="hidden md:block" />
            <BreadcrumbItem>
              <BreadcrumbLink href="/admin/activities">
                Activities
              </BreadcrumbLink>
            </BreadcrumbItem>
            <BreadcrumbSeparator className="hidden md:block" />
            <BreadcrumbItem>
              <BreadcrumbPage>Edit {activity.name}</BreadcrumbPage>
            </BreadcrumbItem>
          </BreadcrumbList>
        </Breadcrumb>
      </div>

      <div className="space-y-6">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Edit Activity</h2>
          <p className="text-muted-foreground">
            Update the details for {activity.name}
          </p>
        </div>

        <ActivityForm initialData={initialData} isEditing={true} />
      </div>
    </div>
  );
}