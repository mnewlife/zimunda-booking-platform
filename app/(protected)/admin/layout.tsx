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
            {/*<SidebarInset>
                <main className="flex-1 space-y-4 p-4 md:p-8 pt-6">
                    {children}
                </main>
            </SidebarInset>*/}
            <main className="flex-1 space-y-4 px-4 py-2">
                { children }
            </main>
        </SidebarProvider>
    );
}
 
export default AdminLayout;
