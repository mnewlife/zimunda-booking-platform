import { Footer } from '@/components/navigation/footer';
import { Header } from '@/components/navigation/header';
import * as React from 'react';

const PublicLayout = ({ children }: { children: React.ReactNode }) => {
    return ( 
        <div>
            <Header />
                <main className="flex-1">{children}</main>
            <Footer />
        </div>
    );
}
 
export default PublicLayout;
