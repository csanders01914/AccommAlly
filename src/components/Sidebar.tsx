'use client';
import { apiFetch } from '@/lib/api-client';

import { useState, useEffect } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { TenantThemeProvider } from './providers/TenantThemeProvider';
import {
    Home,
    ClipboardList,
    Calendar,
    Mail,
    Shield,
    LogOut,
    ChevronLeft,
    ChevronRight,
    Search,
    BarChart3,
    Bug,
    Settings
} from 'lucide-react';
import { BugReportModal } from '@/components/modals/BugReportModal';

interface SidebarProps {
    user: {
        name: string;
        role: 'ADMIN' | 'AUDITOR' | 'COORDINATOR' | 'SUPER_ADMIN';
        email?: string;
        tenant?: {
            name: string;
            settings?: {
                branding?: {
                    logo?: string;
                    primaryColor?: string;
                    secondaryColor?: string;
                }
            }
        }
    };
    unreadCount?: number;
    initialCollapsed?: boolean;
    onToggle?: (collapsed: boolean) => void;
}

interface NavItem {
    name: string;
    href: string;
    icon: React.ComponentType<{ className?: string }>;
    badge?: number;
    adminOnly?: boolean;
    superAdminOnly?: boolean;
}

const ROLE_LABELS: Record<string, string> = {
    ADMIN: 'Admin',
    COORDINATOR: 'Coordinator',
    AUDITOR: 'Auditor',
    SUPER_ADMIN: 'Super Admin',
};

export function Sidebar({ user, unreadCount = 0, initialCollapsed = false, onToggle }: SidebarProps) {
    const router = useRouter();
    const pathname = usePathname();
    const [showBugReport, setShowBugReport] = useState(false);

    const [collapsed, setCollapsed] = useState(() => {
        if (initialCollapsed) return true;
        if (typeof window !== 'undefined') {
            return pathname !== '/';
        }
        return false;
    });

    useEffect(() => {
        onToggle?.(collapsed);
    }, [collapsed, onToggle]);

    useEffect(() => {
        if (pathname !== '/') {
            setCollapsed(true);
        }
    }, [pathname]);

    useEffect(() => {
        if (initialCollapsed) {
            setCollapsed(true);
        }
    }, [initialCollapsed]);

    const navItems: NavItem[] = [
        { name: 'Dashboard', href: '/dashboard', icon: Home },
        { name: 'Tasks', href: '/dashboard/tasks', icon: ClipboardList },
        { name: 'Cases', href: '/cases', icon: Search },
        { name: 'Calendar', href: '/calendar', icon: Calendar },
        { name: 'Messages', href: '/messages', icon: Mail, badge: unreadCount },
        { name: 'Reports', href: '/reports', icon: BarChart3 },
    ];

    const adminItems: NavItem[] = [
        { name: 'Super Admin', href: '/super-admin', icon: Shield, superAdminOnly: true },
        { name: 'Admin Console', href: '/admin', icon: Shield, adminOnly: true },
        { name: 'Communications', href: '/admin/communications', icon: Mail, adminOnly: true },
    ];

    const handleLogout = async () => {
        await apiFetch('/api/auth/logout', { method: 'POST' });
        window.location.href = '/login';
    };

    const isActive = (href: string) => {
        if (href === '/') return pathname === '/';
        if (href === '/dashboard') return pathname === '/dashboard';
        return pathname?.startsWith(href);
    };

    const initials = user?.name
        ? user.name.split(' ').map(n => n[0]).slice(0, 2).join('').toUpperCase()
        : 'U';

    return (
        <TenantThemeProvider settings={user.tenant?.settings}>
            <aside
                className={`fixed left-0 top-0 h-screen flex flex-col z-30 transition-all duration-300 ${collapsed ? 'w-[60px]' : 'w-[220px]'}`}
                style={{
                    backgroundColor: 'var(--sidebar-background, #1C1A17)',
                    color: 'var(--sidebar-foreground, #F0EEE8)',
                    borderRight: '1px solid rgba(255,255,255,0.06)',
                }}
            >
                {/* Brand */}
                <div className={`h-14 flex items-center shrink-0 ${collapsed ? 'justify-center px-0' : 'justify-between px-4'}`}>
                    {!collapsed && (
                        user.tenant?.settings?.branding?.logo ? (
                            /* eslint-disable-next-line @next/next/no-img-element */
                            <img
                                src={user.tenant.settings.branding.logo}
                                alt={user.tenant.name}
                                className="h-7 w-auto object-contain max-w-[140px]"
                            />
                        ) : (
                            <span
                                className="text-lg tracking-tight select-none"
                                style={{ fontFamily: 'var(--font-instrument-serif), Georgia, serif', color: 'var(--sidebar-foreground, #F0EEE8)' }}
                            >
                                AccommAlly
                            </span>
                        )
                    )}
                    <button
                        onClick={() => setCollapsed(!collapsed)}
                        className="p-1.5 rounded-md transition-colors"
                        style={{ color: 'rgba(255,255,255,0.35)' }}
                        onMouseEnter={e => (e.currentTarget.style.color = 'rgba(255,255,255,0.7)')}
                        onMouseLeave={e => (e.currentTarget.style.color = 'rgba(255,255,255,0.35)')}
                        title={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
                        aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
                        aria-expanded={!collapsed}
                        aria-controls="sidebar-nav"
                    >
                        {collapsed ? <ChevronRight className="w-4 h-4" aria-hidden="true" /> : <ChevronLeft className="w-4 h-4" aria-hidden="true" />}
                    </button>
                </div>

                {/* User */}
                <div
                    className={`mx-2 mb-1 rounded-lg p-2 flex items-center gap-2.5 cursor-pointer transition-colors`}
                    style={{ backgroundColor: 'rgba(255,255,255,0.04)' }}
                    onClick={() => router.push('/settings')}
                    role="button"
                    tabIndex={0}
                    onKeyDown={e => e.key === 'Enter' && router.push('/settings')}
                    title="Settings"
                >
                    <div
                        className="w-7 h-7 rounded-full shrink-0 flex items-center justify-center text-xs font-semibold"
                        style={{ background: 'linear-gradient(135deg, #0D9488, #0F766E)', color: 'white' }}
                    >
                        {initials}
                    </div>
                    {!collapsed && (
                        <div className="overflow-hidden flex-1 min-w-0">
                            <p className="text-sm font-medium truncate leading-tight" style={{ color: 'var(--sidebar-foreground, #F0EEE8)' }}>
                                {user.name || user.email || 'User'}
                            </p>
                            <p className="text-xs truncate leading-tight" style={{ color: 'rgba(255,255,255,0.4)' }}>
                                {ROLE_LABELS[user.role] ?? user.role}
                            </p>
                        </div>
                    )}
                </div>

                {/* Nav */}
                <nav
                    id="sidebar-nav"
                    className="flex-1 overflow-y-auto py-2 px-2 sidebar-scrollbar"
                    aria-label="Main Navigation"
                >
                    <ul className="space-y-0.5">
                        {navItems.map((item) => {
                            const Icon = item.icon;
                            const active = isActive(item.href);
                            const hasBadge = item.badge && item.badge > 0;
                            const label = hasBadge ? `${item.name}, ${item.badge} unread` : item.name;

                            return (
                                <li key={item.name}>
                                    <button
                                        onClick={() => router.push(item.href)}
                                        className={`w-full flex items-center gap-2.5 px-2.5 py-2 rounded-md text-sm transition-all duration-150 ${collapsed ? 'justify-center' : ''}`}
                                        style={active ? {
                                            backgroundColor: 'rgba(255,255,255,0.09)',
                                            color: 'var(--sidebar-foreground, #F0EEE8)',
                                            fontWeight: 500,
                                        } : {
                                            color: 'rgba(255,255,255,0.45)',
                                        }}
                                        onMouseEnter={e => { if (!active) e.currentTarget.style.color = 'rgba(255,255,255,0.75)'; }}
                                        onMouseLeave={e => { if (!active) e.currentTarget.style.color = 'rgba(255,255,255,0.45)'; }}
                                        title={collapsed ? label : undefined}
                                        aria-label={label}
                                        aria-current={active ? 'page' : undefined}
                                    >
                                        <div className="relative shrink-0">
                                            <Icon className="w-4 h-4" aria-hidden="true" />
                                            {hasBadge && (
                                                <span
                                                    className="absolute -top-1.5 -right-1.5 w-3.5 h-3.5 text-white text-[9px] font-bold flex items-center justify-center rounded-full"
                                                    style={{ backgroundColor: '#DC2626' }}
                                                    aria-hidden="true"
                                                >
                                                    {item.badge && item.badge > 9 ? '9+' : item.badge}
                                                </span>
                                            )}
                                        </div>
                                        {!collapsed && <span className="truncate">{item.name}</span>}
                                    </button>
                                </li>
                            );
                        })}
                    </ul>

                    {/* Admin Section */}
                    {(user.role === 'ADMIN' || user.role === 'SUPER_ADMIN') && (
                        <div className="mt-4">
                            <div className="mx-2 mb-2" style={{ borderTop: '1px solid rgba(255,255,255,0.06)' }} role="separator" />
                            {!collapsed && (
                                <p
                                    id="admin-nav-heading"
                                    className="px-2.5 mb-1.5 text-[10px] font-semibold uppercase tracking-widest"
                                    style={{ color: 'rgba(255,255,255,0.25)' }}
                                >
                                    Admin
                                </p>
                            )}
                            <ul className="space-y-0.5" aria-labelledby={!collapsed ? "admin-nav-heading" : undefined} aria-label={collapsed ? "Admin Navigation" : undefined}>
                                {adminItems
                                    .filter(item => !item.superAdminOnly || user.role === 'SUPER_ADMIN')
                                    .map((item) => {
                                        const Icon = item.icon;
                                        const active = isActive(item.href);
                                        return (
                                            <li key={item.name}>
                                                <button
                                                    onClick={() => router.push(item.href)}
                                                    className={`w-full flex items-center gap-2.5 px-2.5 py-2 rounded-md text-sm transition-all duration-150 ${collapsed ? 'justify-center' : ''}`}
                                                    style={active ? {
                                                        backgroundColor: 'rgba(255,255,255,0.09)',
                                                        color: 'var(--sidebar-foreground, #F0EEE8)',
                                                        fontWeight: 500,
                                                    } : {
                                                        color: 'rgba(255,255,255,0.45)',
                                                    }}
                                                    onMouseEnter={e => { if (!active) e.currentTarget.style.color = 'rgba(255,255,255,0.75)'; }}
                                                    onMouseLeave={e => { if (!active) e.currentTarget.style.color = 'rgba(255,255,255,0.45)'; }}
                                                    title={collapsed ? item.name : undefined}
                                                    aria-label={item.name}
                                                    aria-current={active ? 'page' : undefined}
                                                >
                                                    <Icon className="w-4 h-4 shrink-0" aria-hidden="true" />
                                                    {!collapsed && <span className="truncate">{item.name}</span>}
                                                </button>
                                            </li>
                                        );
                                    })}
                            </ul>
                        </div>
                    )}
                </nav>

                {/* Footer */}
                <div className="px-2 pb-3 pt-1 space-y-0.5" style={{ borderTop: '1px solid rgba(255,255,255,0.06)' }}>
                    <button
                        onClick={() => setShowBugReport(true)}
                        className={`w-full flex items-center gap-2.5 px-2.5 py-2 rounded-md text-sm transition-all duration-150 ${collapsed ? 'justify-center' : ''}`}
                        style={{ color: 'rgba(255,255,255,0.35)' }}
                        onMouseEnter={e => (e.currentTarget.style.color = 'rgba(255,255,255,0.65)')}
                        onMouseLeave={e => (e.currentTarget.style.color = 'rgba(255,255,255,0.35)')}
                        title={collapsed ? 'Report a bug' : undefined}
                    >
                        <Bug className="w-4 h-4 shrink-0" aria-hidden="true" />
                        {!collapsed && <span>Bug Report</span>}
                    </button>

                    <button
                        onClick={handleLogout}
                        className={`w-full flex items-center gap-2.5 px-2.5 py-2 rounded-md text-sm transition-all duration-150 ${collapsed ? 'justify-center' : ''}`}
                        style={{ color: 'rgba(255,255,255,0.35)' }}
                        onMouseEnter={e => (e.currentTarget.style.color = '#FCA5A5')}
                        onMouseLeave={e => (e.currentTarget.style.color = 'rgba(255,255,255,0.35)')}
                        title={collapsed ? 'Sign out' : undefined}
                        aria-label="Sign out"
                    >
                        <LogOut className="w-4 h-4 shrink-0" aria-hidden="true" />
                        {!collapsed && <span>Sign Out</span>}
                    </button>
                </div>

                <BugReportModal
                    isOpen={showBugReport}
                    onClose={() => setShowBugReport(false)}
                    currentUser={{ name: user.name, email: user.email || '' }}
                />
            </aside>
        </TenantThemeProvider>
    );
}
