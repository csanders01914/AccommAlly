'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Sidebar } from '@/components/Sidebar';
import { Loader2 } from 'lucide-react';

export default function CalendarLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    const router = useRouter();
    const [currentUser, setCurrentUser] = useState<any>(null);
    const [unreadCount, setUnreadCount] = useState(0);
    const [isLoading, setIsLoading] = useState(true);
    const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(true); // Default to closed

    useEffect(() => {
        const loadUser = async () => {
            try {
                // Fetch User
                const userRes = await fetch('/api/auth/me');
                if (!userRes.ok) {
                    router.push('/');
                    return;
                }
                const userData = await userRes.json();
                setCurrentUser(userData.user);

                // Fetch Unread
                const unreadRes = await fetch('/api/messages/unread-count');
                if (unreadRes.ok) {
                    const { count } = await unreadRes.json();
                    setUnreadCount(count);
                }
            } catch (e) {
                console.error(e);
                router.push('/');
            } finally {
                setIsLoading(false);
            }
        };
        loadUser();
    }, [router]);

    if (isLoading) {
        return (
            <div className="flex items-center justify-center min-h-screen bg-gray-900">
                <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
            </div>
        );
    }

    if (!currentUser) return null;

    return (
        <div className="flex min-h-screen bg-gray-900 text-white">
            <Sidebar
                user={currentUser}
                unreadCount={unreadCount}
                initialCollapsed={true}
                onToggle={(collapsed) => setIsSidebarCollapsed(collapsed)}
            />
            <div
                className={`flex-1 flex flex-col transition-all duration-300 ${isSidebarCollapsed ? 'ml-16' : 'ml-64'}`}
            >
                {children}
            </div>
        </div>
    );
}
