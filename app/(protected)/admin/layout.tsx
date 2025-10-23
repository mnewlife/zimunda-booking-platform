import * as React from 'react';
import { redirect } from 'next/navigation';
import { auth } from '@/lib/auth';
import { headers } from 'next/headers';
import { SidebarProvider, SidebarInset } from '@/components/ui/sidebar';
import { AdminSidebar } from '@/components/admin-sidebar';

const AdminLayout = async ({ children }: { children: React.ReactNode }) => {
    const session = await auth.api.getSession({
        headers: await headers()
    });

    if (!session?.user) {
        redirect('/login');
    }

    if (session.user.role !== 'ADMIN' && session.user.role !== 'MANAGER') {
        redirect('/dashboard');
    }

    const user = {
        name: session.user.name || 'Admin User',
        email: session.user.email || '',
        avatar: session.user.image || undefined,
    };

    return (
        <SidebarProvider>
            <AdminSidebar user={user} />
            {children}
        </SidebarProvider>
    );
}
 
export default AdminLayout;
