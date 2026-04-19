'use client';
import { apiFetch } from '@/lib/api-client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { DashboardLayout } from './dashboard/DashboardLayout';
import { ProfileCardWidget } from './dashboard/widgets/ProfileCardWidget';
import { MiniCalendarWidget } from './dashboard/widgets/MiniCalendarWidget';
import { MessagesWidget } from './dashboard/widgets/MessagesWidget';
import { CallRequestsWidget } from './dashboard/widgets/CallRequestsWidget';
import { TaskStatsWidget } from './dashboard/widgets/TaskStatsWidget';
import { RecentCasesWidget } from './dashboard/widgets/RecentCasesWidget';
import { QuickActionsWidget } from './dashboard/widgets/QuickActionsWidget';
import { Sidebar } from './Sidebar';
import { Loader2 } from 'lucide-react';

export function UserProfileDashboard() {
    const router = useRouter();
    const [data, setData] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [layoutOrder, setLayoutOrder] = useState<string[]>([]);
    const [unreadCount, setUnreadCount] = useState(0);
    const [sidebarCollapsed, setSidebarCollapsed] = useState(true);

    useEffect(() => {
        const fetchData = async () => {
            try {
                const res = await apiFetch('/api/dashboard');
                if (res.ok) {
                    const json = await res.json();
                    setData(json);
                    // Load saved layout order if exists in preferences
                    if (json.user?.preferences?.layout) {
                        try {
                            const saved = JSON.parse(json.user.preferences.layout);
                            if (Array.isArray(saved)) setLayoutOrder(saved);
                        } catch (e) {
                            // ignore parse error
                        }
                    }
                } else if (res.status === 401) {
                    router.push('/login');
                }
            } catch (error) {
                console.error('Failed to fetch dashboard', error);
            } finally {
                setLoading(false);
            }
        };

        const fetchUnread = async () => {
            try {
                const res = await apiFetch('/api/messages/unread-count');
                if (res.ok) {
                    const { count } = await res.json();
                    setUnreadCount(count);
                }
            } catch (e) {
                console.error(e);
            }
        };

        fetchData();
        fetchUnread();
    }, [router]);

    const handleLayoutChange = useCallback(async (newOrder: string[]) => {
        setLayoutOrder(newOrder);
        // Persist to DB
        if (data?.user?.id) {
            try {
                await fetch(`/api/users/${data.user.id}/preferences`, {
                    method: 'PATCH',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        preferences: {
                            ...data.user.preferences,
                            layout: JSON.stringify(newOrder)
                        }
                    })
                });
            } catch (e) {
                console.error('Failed to save layout', e);
            }
        }
    }, [data]);

    if (loading) {
        return (
            <div className="min-h-screen app-background flex items-center justify-center">
                <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
            </div>
        );
    }

    if (!data) return <div className="p-8 text-center">Failed to load dashboard data</div>;

    // Define widgets map
    const statsForProfile = {
        totalCases: data.recentCases?.length || 0,
        openTasks: data.taskStats?.totalPending || 0
    };

    // Map tasks to calendar format
    const taskDates = data.tasks?.map((t: any) => ({
        date: t.dueDate,
        hasTask: true,
        isOverdue: new Date(t.dueDate) < new Date() && t.status !== 'COMPLETED'
    })) || [];

    return (

        <div className="flex h-screen overflow-hidden app-background">
            {data.user && <Sidebar
                user={data.user}
                unreadCount={unreadCount}
                initialCollapsed={sidebarCollapsed}
                onToggle={setSidebarCollapsed}
            />}  {/* Main Content - offset for sidebar */}
            <div className={`transition-all duration-300 ${sidebarCollapsed ? 'ml-16' : 'ml-64'} h-full overflow-y-auto w-full`}>
                {/* Header */}
                <header className="bg-white/30 dark:bg-gray-800/30 backdrop-blur-md border border-white/20 dark:border-gray-700/30 p-4 rounded-2xl mx-6 mt-6 mb-2 shadow-lg transition-all">
                    <div className="px-6 lg:px-8">
                        <div className="flex items-center justify-between h-16">
                            <h1 className="text-xl font-bold text-gray-900 dark:text-white">My Dashboard</h1>
                            <p className="text-sm text-gray-500 dark:text-gray-400">
                                Welcome back, {data.user.name}
                            </p>
                        </div>
                    </div>
                </header>

                <main className="px-6 lg:px-8 py-8">
                    <DashboardLayout
                        onLayoutChange={handleLayoutChange}
                        savedOrder={layoutOrder}
                    >
                        <ProfileCardWidget
                            key="profile"
                            user={data.user}
                            stats={statsForProfile}
                        />

                        <QuickActionsWidget key="actions" user={data.user} />

                        <TaskStatsWidget
                            key="tasks"
                            tasks={data.tasks}
                            stats={data.taskStats}
                            onViewAll={() => router.push('/dashboard/tasks')}
                        />

                        <RecentCasesWidget
                            key="cases"
                            cases={data.recentCases}
                        />

                        <MiniCalendarWidget
                            key="calendar"
                        />

                        <MessagesWidget
                            key="messages"
                            messages={data.messages}
                        />

                        <CallRequestsWidget
                            key="calls"
                            requests={data.callRequests}
                        />
                    </DashboardLayout>
                </main>
            </div>
        </div>
    );
}
