'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import {
    ClipboardCheck,
    FileText,
    AlertTriangle,
    Search,
    Clock,
    Shield,
    Filter,
    ChevronDown
} from 'lucide-react';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';
import { Sidebar } from '@/components/Sidebar';

interface AuditLogEntry {
    id: string;
    userId: string;
    user?: { name: string; email: string };
    action: string;
    entityType?: string;
    entityId?: string;
    metadata?: string;
    timestamp: string;
}

interface CaseWithAuditNotes {
    id: string;
    caseNumber: string;
    clientName: string;
    status: string;
    auditNoteCount: number;
    lastAuditNote?: string;
}

export default function AuditorConsolePage() {
    const router = useRouter();
    const [currentUser, setCurrentUser] = useState<any>(null);
    const [unreadCount, setUnreadCount] = useState(0);
    const [activeTab, setActiveTab] = useState('overview');
    const [isLoading, setIsLoading] = useState(true);
    const [sidebarCollapsed, setSidebarCollapsed] = useState(true);

    // Data
    const [auditLogs, setAuditLogs] = useState<AuditLogEntry[]>([]);
    const [casesWithAuditNotes, setCasesWithAuditNotes] = useState<CaseWithAuditNotes[]>([]);
    const [searchQuery, setSearchQuery] = useState('');
    const [actionFilter, setActionFilter] = useState('ALL');

    useEffect(() => {
        const loadData = async () => {
            try {
                // Fetch User
                const userRes = await fetch('/api/auth/me');
                if (!userRes.ok) {
                    router.push('/');
                    return;
                }
                const userData = await userRes.json();
                setCurrentUser(userData.user);

                // Check role - only ADMIN or AUDITOR can access
                if (userData.user.role !== 'ADMIN' && userData.user.role !== 'AUDITOR') {
                    router.push('/dashboard');
                    return;
                }

                // Fetch Unread
                const unreadRes = await fetch('/api/messages/unread-count');
                if (unreadRes.ok) {
                    const { count } = await unreadRes.json();
                    setUnreadCount(count);
                }

                // Fetch audit logs
                await fetchAuditLogs();
            } catch (e) {
                console.error(e);
            } finally {
                setIsLoading(false);
            }
        };
        loadData();
    }, [router]);

    const fetchAuditLogs = async () => {
        try {
            const res = await fetch('/api/admin/audit?limit=100');
            if (res.ok) {
                const data = await res.json();
                setAuditLogs(data.logs || []);
            }
        } catch (e) {
            console.error('Failed to fetch audit logs', e);
        }
    };

    // Filter logs based on search and action filter
    const filteredLogs = auditLogs.filter(log => {
        const matchesSearch = searchQuery === '' ||
            log.user?.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
            log.action.toLowerCase().includes(searchQuery.toLowerCase()) ||
            log.entityType?.toLowerCase().includes(searchQuery.toLowerCase());

        const matchesAction = actionFilter === 'ALL' || log.action === actionFilter;

        return matchesSearch && matchesAction;
    });

    // Get unique actions for filter dropdown
    const uniqueActions = [...new Set(auditLogs.map(log => log.action))];

    // Get stats
    const stats = {
        totalLogs: auditLogs.length,
        uniqueUsers: new Set(auditLogs.map(log => log.userId)).size,
        todayLogs: auditLogs.filter(log =>
            new Date(log.timestamp).toDateString() === new Date().toDateString()
        ).length,
        sensitiveActions: auditLogs.filter(log =>
            log.action === 'REVEAL_SSN' || log.action === 'DELETE'
        ).length
    };

    if (isLoading || !currentUser) {
        return (
            <div className="flex min-h-screen items-center justify-center bg-gray-50 dark:bg-gray-950">
                <div className="w-8 h-8 border-4 border-amber-500 border-t-transparent rounded-full animate-spin" />
            </div>
        );
    }



    return (
        <div className="flex min-h-screen bg-gray-50 dark:bg-gray-950">
            <Sidebar user={currentUser} unreadCount={unreadCount} onToggle={setSidebarCollapsed} />
            <main className={`flex-1 transition-all duration-300 p-6 space-y-6 ${sidebarCollapsed ? 'ml-16' : 'ml-64'}`}>
                {/* Header */}
                <div className="flex items-center justify-between">
                    <div>
                        <h1 className="text-3xl font-bold text-gray-900 dark:text-white flex items-center gap-3">
                            <ClipboardCheck className="w-8 h-8 text-amber-500" />
                            Auditor Console
                        </h1>
                        <p className="text-gray-500 dark:text-gray-400 mt-1">
                            Review system activity and audit trails
                        </p>
                    </div>
                    <button
                        onClick={() => router.push('/dashboard')}
                        className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors shadow-sm"
                    >
                        Back to Dashboard
                    </button>
                </div>

                {/* Stats Cards */}
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                    <div className="bg-white dark:bg-gray-900 p-6 rounded-xl border border-gray-200 dark:border-gray-800">
                        <h3 className="text-sm font-medium text-gray-500">Total Audit Logs</h3>
                        <p className="text-3xl font-bold text-gray-900 dark:text-white mt-2">{stats.totalLogs}</p>
                    </div>
                    <div className="bg-white dark:bg-gray-900 p-6 rounded-xl border border-gray-200 dark:border-gray-800">
                        <h3 className="text-sm font-medium text-gray-500">Unique Users</h3>
                        <p className="text-3xl font-bold text-amber-600 mt-2">{stats.uniqueUsers}</p>
                    </div>
                    <div className="bg-white dark:bg-gray-900 p-6 rounded-xl border border-gray-200 dark:border-gray-800">
                        <h3 className="text-sm font-medium text-gray-500">Today&apos;s Activity</h3>
                        <p className="text-3xl font-bold text-blue-600 mt-2">{stats.todayLogs}</p>
                    </div>
                    <div className="bg-white dark:bg-gray-900 p-6 rounded-xl border border-amber-200 dark:border-amber-800 bg-amber-50/50 dark:bg-amber-900/10">
                        <h3 className="text-sm font-medium text-amber-600 flex items-center gap-2">
                            <AlertTriangle className="w-4 h-4" />
                            Sensitive Actions
                        </h3>
                        <p className="text-3xl font-bold text-amber-600 mt-2">{stats.sensitiveActions}</p>
                    </div>
                </div>

                {/* Filters */}
                <div className="bg-white dark:bg-gray-900 p-4 rounded-xl border border-gray-200 dark:border-gray-800 flex items-center gap-4">
                    <div className="flex-1 relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                        <input
                            type="text"
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            placeholder="Search logs by user, action, or entity..."
                            className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-amber-500 outline-none"
                        />
                    </div>
                    <div className="relative">
                        <select
                            value={actionFilter}
                            onChange={(e) => setActionFilter(e.target.value)}
                            className="appearance-none px-4 py-2 pr-8 border border-gray-300 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-amber-500 outline-none"
                        >
                            <option value="ALL">All Actions</option>
                            {uniqueActions.map(action => (
                                <option key={action} value={action}>{action}</option>
                            ))}
                        </select>
                        <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
                    </div>
                </div>

                {/* Audit Log Table */}
                <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 overflow-hidden">
                    <div className="p-4 border-b border-gray-200 dark:border-gray-800 flex items-center justify-between">
                        <h3 className="font-semibold text-gray-900 dark:text-white flex items-center gap-2">
                            <Shield className="w-5 h-5 text-amber-500" />
                            Audit Trail
                        </h3>
                        <span className="text-sm text-gray-500">
                            Showing {filteredLogs.length} of {auditLogs.length} entries
                        </span>
                    </div>
                    <table className="w-full text-left">
                        <thead className="bg-gray-50 dark:bg-gray-800/50">
                            <tr>
                                <th className="px-6 py-3 text-xs font-semibold text-gray-500 uppercase">Timestamp</th>
                                <th className="px-6 py-3 text-xs font-semibold text-gray-500 uppercase">User</th>
                                <th className="px-6 py-3 text-xs font-semibold text-gray-500 uppercase">Action</th>
                                <th className="px-6 py-3 text-xs font-semibold text-gray-500 uppercase">Entity</th>
                                <th className="px-6 py-3 text-xs font-semibold text-gray-500 uppercase">Details</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                            {filteredLogs.length === 0 ? (
                                <tr>
                                    <td colSpan={5} className="px-6 py-12 text-center text-gray-400">
                                        <FileText className="w-12 h-12 mx-auto mb-3 text-gray-200" />
                                        No audit logs found
                                    </td>
                                </tr>
                            ) : (
                                filteredLogs.map(log => (
                                    <tr key={log.id} className="hover:bg-gray-50 dark:hover:bg-gray-800/50">
                                        <td className="px-6 py-3 text-sm text-gray-500 whitespace-nowrap">
                                            <div className="flex items-center gap-2">
                                                <Clock className="w-3 h-3" />
                                                {format(new Date(log.timestamp), 'MMM d, HH:mm:ss')}
                                            </div>
                                        </td>
                                        <td className="px-6 py-3 text-sm font-medium text-gray-900 dark:text-white">
                                            {log.user?.name || 'Unknown'}
                                        </td>
                                        <td className="px-6 py-3">
                                            <span className={cn(
                                                "px-2 py-0.5 rounded text-xs font-mono font-medium",
                                                log.action === 'REVEAL_SSN' || log.action === 'DELETE'
                                                    ? "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400"
                                                    : log.action === 'CREATE'
                                                        ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400"
                                                        : log.action === 'UPDATE'
                                                            ? "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400"
                                                            : "bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-400"
                                            )}>
                                                {log.action}
                                            </span>
                                        </td>
                                        <td className="px-6 py-3 text-sm text-gray-600 dark:text-gray-400">
                                            {log.entityType || '-'}
                                        </td>
                                        <td className="px-6 py-4 text-sm text-gray-500 max-w-xs truncate">
                                            {(() => {
                                                try {
                                                    if (!log.metadata) return '-';
                                                    const meta = JSON.parse(log.metadata);
                                                    if (log.action === 'REVEAL_SSN' && meta.ip) return `IP: ${meta.ip}`;
                                                    if (meta.action === 'add_note') return 'Added a note';
                                                    return Object.entries(meta)
                                                        .slice(0, 2)
                                                        .map(([k, v]) => `${k}: ${v}`)
                                                        .join(', ');
                                                } catch {
                                                    return log.metadata || '-';
                                                }
                                            })()}
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </main>
        </div>
    );
}
