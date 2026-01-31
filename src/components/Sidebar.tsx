'use client';

import { useState, useEffect } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import {
    Home,
    ClipboardList,
    Calendar,
    Mail,
    Settings,
    Shield,
    ClipboardCheck,
    LogOut,
    ChevronLeft,
    ChevronRight,
    Users,
    FileText,
    Search,
    BarChart3,
    Bug
} from 'lucide-react';
import { BugReportModal } from '@/components/BugReportModal';

interface SidebarProps {
    user: {
        name: string;
        role: 'ADMIN' | 'AUDITOR' | 'COORDINATOR';
        email?: string;
    };
    unreadCount?: number;
    initialCollapsed?: boolean;
    onToggle?: (collapsed: boolean) => void;
}

// ... NavItem interface ...
interface NavItem {
    name: string;
    href: string;
    icon: React.ComponentType<{ className?: string }>;
    badge?: number;
    adminOnly?: boolean;
}

export function Sidebar({ user, unreadCount = 0, initialCollapsed = false, onToggle }: SidebarProps) {
    const router = useRouter();
    const pathname = usePathname();
    const [showBugReport, setShowBugReport] = useState(false);

    // Initialize with prop if provided, otherwise default logic
    const [collapsed, setCollapsed] = useState(() => {
        if (initialCollapsed) return true;
        if (typeof window !== 'undefined') {
            return pathname !== '/';
        }
        return false;
    });

    // Notify parent on mount/change
    useEffect(() => {
        onToggle?.(collapsed);
    }, [collapsed, onToggle]);

    useEffect(() => {
        if (initialCollapsed) {
            setCollapsed(true);
        } else if (pathname !== '/') {
            setCollapsed(true);
        } else {
            setCollapsed(false);
        }
    }, [pathname, initialCollapsed]);

    const navItems: NavItem[] = [
        { name: 'Dashboard', href: '/dashboard', icon: Home },
        { name: 'Tasks', href: '/dashboard/tasks', icon: ClipboardList },
        { name: 'Cases', href: '/cases', icon: Search },
        { name: 'Calendar', href: '/calendar', icon: Calendar },
        { name: 'Messages', href: '/messages', icon: Mail, badge: unreadCount },
        { name: 'Settings', href: '/settings', icon: Settings },
    ];

    const adminItems: NavItem[] = [
        { name: 'Admin Console', href: '/admin', icon: Shield, adminOnly: true },
        { name: 'Communication Hub', href: '/admin/communications', icon: Mail, adminOnly: true }, // Added Link
        { name: 'Claimants', href: '/admin/claimants', icon: Users, adminOnly: true },
        { name: 'Reports', href: '/reports', icon: BarChart3, adminOnly: true },
        { name: 'Bug Reports', href: '/admin/bug-reports', icon: Bug, adminOnly: true },
    ];



    const handleLogout = async () => {
        await fetch('/api/auth/logout', { method: 'POST' });
        window.location.href = '/';
    };

    const isActive = (href: string) => {
        if (href === '/') return pathname === '/';
        // Prevent 'Dashboard' (/dashboard) from matching 'Tasks' (/dashboard/tasks)
        if (href === '/dashboard') return pathname === '/dashboard';
        return pathname?.startsWith(href);
    };

    return (
        <aside
            className={`fixed left-0 top-0 h-screen bg-white dark:bg-gray-900 border-r border-gray-200 dark:border-gray-800 flex flex-col z-30 transition-all duration-300 ${collapsed ? 'w-16' : 'w-64'
                }`}
        >
            {/* Logo / Brand */}
            <div className="h-16 flex items-center justify-between px-4 border-b border-gray-200 dark:border-gray-800">
                {!collapsed && (
                    <h1 className="text-xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
                        AccommAlly
                    </h1>
                )}
                <button
                    onClick={() => setCollapsed(!collapsed)}
                    className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-500 dark:text-gray-400 transition-colors"
                    title={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
                    aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
                    aria-expanded={!collapsed}
                    aria-controls="sidebar-nav"
                >
                    {collapsed ? (
                        <ChevronRight className="w-5 h-5" aria-hidden="true" />
                    ) : (
                        <ChevronLeft className="w-5 h-5" aria-hidden="true" />
                    )}
                </button>
            </div>

            {/* User Profile Mini */}
            <div className={`px-3 py-4 border-b border-gray-200 dark:border-gray-800 ${collapsed ? 'flex justify-center' : ''}`}>
                <div className={`flex items-center ${collapsed ? '' : 'gap-3'}`}>
                    <button
                        onClick={() => router.push('/settings')}
                        className="w-10 h-10 shrink-0 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-white font-medium hover:opacity-90 transition-opacity"
                        title="User Settings"
                    >
                        {user?.name?.charAt(0).toUpperCase() || 'U'}
                    </button>
                    {!collapsed && (
                        <div className="overflow-hidden">
                            <p className="text-sm font-medium text-gray-900 dark:text-white truncate">
                                {user.name || user.email || 'User'}
                            </p>
                            <p className="text-xs text-gray-500 dark:text-gray-400 truncate">
                                {user.role}
                            </p>
                        </div>
                    )}
                </div>
            </div>

            {/* Navigation Items */}
            <nav id="sidebar-nav" className="flex-1 overflow-y-auto py-4 px-2" aria-label="Main Navigation">
                <ul className="space-y-1">
                    {navItems.map((item) => {
                        const Icon = item.icon;
                        const active = isActive(item.href);
                        const hasBadge = item.badge && item.badge > 0;
                        const label = hasBadge ? `${item.name}, ${item.badge} unread items` : item.name;

                        return (
                            <li key={item.name}>
                                <button
                                    onClick={() => router.push(item.href)}
                                    className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all duration-200 ${active
                                        ? 'bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 font-medium'
                                        : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 hover:text-gray-900 dark:hover:text-white'
                                        } ${collapsed ? 'justify-center' : ''}`}
                                    title={collapsed ? label : undefined}
                                    aria-label={label}
                                    aria-current={active ? 'page' : undefined}
                                >
                                    <div className="relative">
                                        <Icon className="w-5 h-5 shrink-0" aria-hidden="true" />
                                        {hasBadge && (
                                            <span className="absolute -top-1.5 -right-1.5 w-4 h-4 bg-red-500 text-white text-[10px] font-bold flex items-center justify-center rounded-full" aria-hidden="true">
                                                {item.badge && item.badge > 9 ? '9+' : item.badge}
                                            </span>
                                        )}
                                    </div>
                                    {!collapsed && (
                                        <span className="truncate">{item.name}</span>
                                    )}
                                </button>
                            </li>
                        );
                    })}
                </ul>

                {/* Admin Section */}
                {user.role === 'ADMIN' && (
                    <>
                        <div className={`my-4 border-t border-gray-200 dark:border-gray-800 ${collapsed ? 'mx-1' : ''}`} role="separator" />
                        {!collapsed && (
                            <p id="admin-nav-heading" className="px-3 mb-2 text-xs font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wider">
                                Admin
                            </p>
                        )}
                        <ul className="space-y-1" aria-labelledby={!collapsed ? "admin-nav-heading" : undefined} aria-label={collapsed ? "Admin Navigation" : undefined}>
                            {adminItems.map((item) => {
                                const Icon = item.icon;
                                const active = isActive(item.href);
                                return (
                                    <li key={item.name}>
                                        <button
                                            onClick={() => router.push(item.href)}
                                            className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all duration-200 ${active
                                                ? 'bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 font-medium'
                                                : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 hover:text-gray-900 dark:hover:text-white'
                                                } ${collapsed ? 'justify-center' : ''}`}
                                            title={collapsed ? item.name : undefined}
                                            aria-label={item.name}
                                            aria-current={active ? 'page' : undefined}
                                        >
                                            <Icon className="w-5 h-5 shrink-0" aria-hidden="true" />
                                            {!collapsed && (
                                                <span className="truncate">{item.name}</span>
                                            )}
                                        </button>
                                    </li>
                                );
                            })}
                        </ul>
                    </>
                )}

                {/* Auditor Section - visible to ADMIN and AUDITOR */}

            </nav>

            {/* Footer Actions */}
            <div className="p-2 border-t border-gray-200 dark:border-gray-800 space-y-1">
                <button
                    onClick={() => setShowBugReport(true)}
                    className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 hover:text-gray-900 dark:hover:text-white transition-colors ${collapsed ? 'justify-center' : ''}`}
                    title={collapsed ? 'Report Bug' : undefined}
                >
                    <div className="w-5 h-5 flex items-center justify-center">
                        <Bug className="w-4 h-4 shrink-0" />
                    </div>
                    {!collapsed && <span className="text-sm">Bug Report</span>}
                </button>

                <button
                    onClick={handleLogout}
                    className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-gray-600 dark:text-gray-400 hover:bg-red-50 dark:hover:bg-red-900/20 hover:text-red-600 dark:hover:text-red-400 transition-colors ${collapsed ? 'justify-center' : ''
                        }`}
                    title={collapsed ? 'Sign Out' : undefined}
                >
                    <LogOut className="w-5 h-5 shrink-0" />
                    {!collapsed && <span>Sign Out</span>}
                </button>
            </div>

            <BugReportModal
                isOpen={showBugReport}
                onClose={() => setShowBugReport(false)}
                currentUser={{ name: user.name, email: user.email || '' }}
            />
        </aside>
    );
}
