'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Sidebar } from '@/components/Sidebar';
import { Loader2 } from 'lucide-react';
import { TenantThemeProvider } from '@/components/providers/TenantThemeProvider';

export default function AdminLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    const router = useRouter();
    const [currentUser, setCurrentUser] = useState<any>(null);
    const [unreadCount, setUnreadCount] = useState(0);
    const [isLoading, setIsLoading] = useState(true);
    const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(true);

    useEffect(() => {
        const loadUser = async () => {
            try {
                // Fetch User
                const userRes = await fetch('/api/auth/me');
                if (!userRes.ok) {
                    router.push('/login');
                    return;
                }
                const userData = await userRes.json();

                if (!['ADMIN', 'SUPER_ADMIN'].includes(userData.user.role)) {
                    router.push('/dashboard/tasks');
                    return;
                }

                setCurrentUser(userData.user);

                // Fetch Unread
                const unreadRes = await fetch('/api/messages/unread-count');
                if (unreadRes.ok) {
                    const { count } = await unreadRes.json();
                    setUnreadCount(count);
                }
            } catch (e) {
                console.error(e);
                router.push('/login');
            } finally {
                setIsLoading(false);
            }
        };
        loadUser();
    }, [router]);

    if (isLoading) {
        return (
            <div className="flex items-center justify-center min-h-screen bg-[#F8F7F5]">
                <Loader2 className="w-8 h-8 animate-spin text-[#0D9488]" />
            </div>
        );
    }



    if (!currentUser) return null;

    return (
        <TenantThemeProvider settings={currentUser.tenant?.settings}>
            <div className="flex min-h-screen app-background">
                <Sidebar
                    user={currentUser}
                    unreadCount={unreadCount}
                    initialCollapsed={true}
                    onToggle={(collapsed) => setIsSidebarCollapsed(collapsed)}
                />
                <div className={`flex-1 transition-all duration-300 ${isSidebarCollapsed ? 'ml-16' : 'ml-64'}`}>
                    {children}
                </div>
            </div>
        </TenantThemeProvider>
    );
}
