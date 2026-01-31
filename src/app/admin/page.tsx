'use client';

import { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import {
    LayoutDashboard,
    Users,
    Settings,
    Shield,
    FileText,
    BarChart,
    Activity,
    Database,
    Search,
    Filter,
    Download,
    Plus,
    MoreVertical,
    CheckCircle,
    XCircle,
    AlertTriangle,
    Clock,
    Lock,
    Unlock,
    Edit2,
    Trash2,
    Box,
    Wrench
} from 'lucide-react';
import {
    ResponsiveContainer,
    BarChart as RechartsBarChart,
    Bar,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    PieChart,
    Pie,
    Cell,
    Legend
} from 'recharts';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import * as XLSX from 'xlsx';

// Sidebar removed - handled by layout
import { Loader2 } from 'lucide-react';
import { EditUserModal } from '@/components/modals/EditUserModal';
import { CreateUserModal } from '@/components/modals/CreateUserModal';
import { ClientManagement } from '@/components/ClientManagement';

// Interfaces
interface MonitorStats {
    activeUsers: number;
    totalUsers: number; // Renamed/Added
    totalCases: number;
    totalDocuments: number; // Added
    systemHealth: string;
    activeTasks: number;
    activeCases?: number; // Added for compatibility
    serverUptime: string;
}

interface IntelligenceData {
    urgencyHeatmap: { day: string; value: number }[];
    urgencyStats?: any; // Added
    programDistribution: { name: string; value: number }[];
    activeHours: { hour: string; value: number }[];
}

interface AdminUser {
    id: string;
    name: string;
    email: string;
    role: 'ADMIN' | 'COORDINATOR' | 'AUDITOR';
    status: 'ACTIVE' | 'INACTIVE';
    lastActive: string; // or lastLogin?
    lastLogin?: string; // Added
    lockedUntil?: string | null; // Added
    department?: string;
}

interface AuditLogEntry {
    id: string;
    userId: string;
    userName: string;
    user?: { name: string; email: string }; // Added
    action: string;
    entityType?: string; // Added
    details: string; // or metadata?
    metadata?: any; // Added
    timestamp: string;
    ipAddress: string;
}

function AdminDashboardContent() {
    const router = useRouter();
    // ... existing state ...
    const [activeTab, setActiveTab] = useState('overview');



    // Data State...
    const [stats, setStats] = useState<MonitorStats | null>(null);
    const [intelligence, setIntelligence] = useState<IntelligenceData | null>(null);
    const [users, setUsers] = useState<AdminUser[]>([]);
    const [auditLogs, setAuditLogs] = useState<AuditLogEntry[]>([]);
    const [recentLogs, setRecentLogs] = useState<AuditLogEntry[]>([]);
    const [inventory, setInventory] = useState<any[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    // ... Toosl, URL Params, Modals State ...
    const [lookupQuery, setLookupQuery] = useState('');
    const [lookupResult, setLookupResult] = useState<any>(null);
    const [isLookingUp, setIsLookingUp] = useState(false);
    const searchParams = useSearchParams();
    const [isCreateUserOpen, setIsCreateUserOpen] = useState(false);
    const [isEditUserOpen, setIsEditUserOpen] = useState(false);
    const [isAddInventoryOpen, setIsAddInventoryOpen] = useState(false);
    const [editingUser, setEditingUser] = useState<AdminUser | null>(null);
    const [userRoleFilter, setUserRoleFilter] = useState<'ALL' | 'ADMIN' | 'COORDINATOR' | 'AUDITOR'>('ALL');

    // Tools State
    const [healthData, setHealthData] = useState<any>(null);
    const [isHealthLoading, setIsHealthLoading] = useState(false);
    const [cryptoInput, setCryptoInput] = useState('');
    const [cryptoOutput, setCryptoOutput] = useState('');
    const [cryptoMode, setCryptoMode] = useState<'encrypt' | 'decrypt'>('encrypt');
    const [isCryptoLoading, setIsCryptoLoading] = useState(false);

    // Retention Policy State
    const [isRetentionLoading, setIsRetentionLoading] = useState(false);
    const [retentionResult, setRetentionResult] = useState<any>(null);

    // Audit Filters
    const [auditUser, setAuditUser] = useState('');
    const [auditStartDate, setAuditStartDate] = useState('');
    const [auditEndDate, setAuditEndDate] = useState('');

    // Wait, I'm replacing lines 1-141 range roughly? No, I need to insert imports and state.

    // Let's do imports first via Replace.
    // Then Layout via Replace.
    // I can't effectively inject state without seeing exactly where to put it. 
    // Step 456 shows lines 78-100 (state declarations).

    // Plan: 
    // 1. Add Imports (top of file).
    // 2. Add State (inside component).
    // 3. Add useEffect for user (inside component).
    // 4. Update Render (return statement).

    // I'll do 1 & 2 & 3 in this call if I target the right lines.




    useEffect(() => {
        fetchOverview();
    }, []);

    useEffect(() => {
        if (activeTab === 'users') fetchUsers();
        if (activeTab === 'audit') fetchAuditLogs();
        if (activeTab === 'resources') fetchInventory();
    }, [activeTab]);

    // Handle URL Actions
    useEffect(() => {
        const action = searchParams.get('action');
        if (action === 'create_user') {
            setActiveTab('users');
            setIsCreateUserOpen(true);
            // Optional: clean up URL
            router.replace('/admin', { scroll: false });
        }
    }, [searchParams, router]);

    // Fetch Overview Data
    const fetchOverview = async () => {
        setIsLoading(true);
        try {
            const [statsRes, intelRes] = await Promise.all([
                fetch('/api/admin/stats'),
                fetch('/api/admin/intelligence')
            ]);

            if (statsRes.ok) {
                const statsData = await statsRes.json();
                setStats(statsData.stats);
                setRecentLogs(statsData.recentLogs);
            }
            if (intelRes.ok) setIntelligence(await intelRes.json());
        } catch (e) {
            console.error('Failed to fetch overview data', e);
        } finally {
            setIsLoading(false);
        }
    };

    // Fetch Users
    const fetchUsers = async () => {
        setIsLoading(true);
        try {
            const res = await fetch('/api/admin/users');
            if (res.ok) {
                setUsers(await res.json());
            }
        } catch (e) {
            console.error('Failed to fetch users', e);
        } finally {
            setIsLoading(false);
        }
    };

    // Fetch Audit Logs
    const fetchAuditLogs = async () => {
        setIsLoading(true);
        try {
            const params = new URLSearchParams();
            if (auditUser) params.append('userId', auditUser);
            if (auditStartDate) params.append('startDate', auditStartDate);
            if (auditEndDate) params.append('endDate', auditEndDate);
            params.append('limit', '100');

            const res = await fetch(`/api/admin/audit?${params.toString()}`);
            if (res.ok) {
                const data = await res.json();
                setAuditLogs(data.logs);
            }
        } catch (e) {
            console.error('Failed to fetch audit logs', e);
        } finally {
            setIsLoading(false);
        }
    };

    // Trigger fetch when filters change (debounced or effect-driven? Effect is safer if simple)
    useEffect(() => {
        if (activeTab === 'audit') fetchAuditLogs();
    }, [auditUser, auditStartDate, auditEndDate]);

    const handleAuditExportPDF = async () => {
        try {
            // Fetch specific export data
            const params = new URLSearchParams();
            if (auditUser) params.append('userId', auditUser);
            if (auditStartDate) params.append('startDate', auditStartDate);
            if (auditEndDate) params.append('endDate', auditEndDate);

            const res = await fetch(`/api/audit-logs/export?${params.toString()}`);
            if (!res.ok) throw new Error("Failed to fetch export data");
            const exportLogs: AuditLogEntry[] = await res.json();

            const doc = new jsPDF();
            doc.setFontSize(18);
            doc.text('System Audit Log', 14, 22);
            doc.setFontSize(11);
            doc.text(`Generated: ${new Date().toLocaleString()}`, 14, 30);

            const tableData = exportLogs.map(log => [
                new Date(log.timestamp).toLocaleString(),
                log.user?.name || 'Unknown',
                log.action,
                `${log.entityType || '-'}`,
                formatAuditDetails(log)
            ]);

            autoTable(doc, {
                head: [['Date', 'User', 'Action', 'Entity', 'Details']],
                body: tableData,
                startY: 40,
                styles: { fontSize: 8 },
                columnStyles: { 4: { cellWidth: 80 } }
            });
            doc.save(`audit_log_${Date.now()}.pdf`);
        } catch (e) {
            console.error(e);
            alert('Export failed');
        }
    };

    const handleAuditExportExcel = async () => {
        try {
            const params = new URLSearchParams();
            if (auditUser) params.append('userId', auditUser);
            if (auditStartDate) params.append('startDate', auditStartDate);
            if (auditEndDate) params.append('endDate', auditEndDate);

            const res = await fetch(`/api/audit-logs/export?${params.toString()}`);
            if (!res.ok) throw new Error("Failed to fetch export data");
            const exportLogs: AuditLogEntry[] = await res.json();

            const wsData = exportLogs.map(log => ({
                'Date/Time': new Date(log.timestamp).toLocaleString(),
                'User': log.user?.name || log.userId,
                'Email': log.user?.email || '',
                'Action': log.action,
                'Entity Type': log.entityType,
                'Details': formatAuditDetails(log),
                'Raw Metadata': JSON.stringify(log.metadata || {})
            }));

            const ws = XLSX.utils.json_to_sheet(wsData);
            const wb = XLSX.utils.book_new();
            XLSX.utils.book_append_sheet(wb, ws, "Audit Logs");
            XLSX.writeFile(wb, `Audit_Logs_${Date.now()}.xlsx`);
        } catch (e) {
            console.error(e);
            alert('Export failed');
        }
    };

    const formatAuditDetails = (log: any) => {
        if (log.oldValue && log.newValue) {
            const oldV = log.oldValue.length > 20 ? log.oldValue.substring(0, 20) + '...' : log.oldValue;
            const newV = log.newValue.length > 20 ? log.newValue.substring(0, 20) + '...' : log.newValue;
            return `${log.field || 'Change'}: ${oldV} -> ${newV}`;
        }
        try {
            if (typeof log.metadata === 'string') {
                const parsed = JSON.parse(log.metadata);
                return Object.entries(parsed).map(([k, v]) => `${k}:${v}`).join(', ');
            }
            if (typeof log.metadata === 'object' && log.metadata) {
                return Object.entries(log.metadata).map(([k, v]) => `${k}:${v}`).join(', ');
            }
        } catch { }
        return log.details || '-';
    };

    // Fetch Inventory
    const fetchInventory = async () => {
        setIsLoading(true);
        try {
            const res = await fetch('/api/admin/inventory');
            if (res.ok) {
                setInventory(await res.json());
            }
        } catch (e) {
            console.error('Failed to fetch inventory', e);
        } finally {
            setIsLoading(false);
        }
    };

    const handleUserAction = async (userId: string, action: 'lock' | 'unlock') => {
        const lock = action === 'lock';
        await fetch(`/api/admin/users/${userId}`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ lock }),
        });
        fetchUsers(); // Refresh
    };

    const handleDeleteUser = async (userId: string) => {
        if (!confirm('Are you sure you want to delete this user? This action cannot be undone.')) return;

        try {
            const res = await fetch(`/api/admin/users/${userId}`, { method: 'DELETE' });
            if (res.ok) {
                fetchUsers();
            } else {
                const data = await res.json();
                alert(data.error || 'Failed to delete user');
            }
        } catch (e) {
            console.error(e);
            alert('Failed to delete user');
        }
    };

    const handleExportReport = async () => {
        try {
            const res = await fetch('/api/admin/reports/grant');
            if (!res.ok) throw new Error('Failed to generate report');

            const reportData = await res.json();

            // Dynamically import the PDF generator to avoid SSR issues
            const { generateGrantReportPDF } = await import('@/lib/pdfGenerator');
            generateGrantReportPDF(reportData);
        } catch (e) {
            console.error(e);
            alert('Failed to export report');
        }
    };

    const handleHealthCheck = async () => {
        setIsHealthLoading(true);
        try {
            const res = await fetch('/api/admin/health');
            setHealthData(await res.json());
        } catch (e) {
            console.error(e);
        } finally {
            setIsHealthLoading(false);
        }
    };

    const handleCrypto = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!cryptoInput.trim()) return;
        setIsCryptoLoading(true);
        try {
            const res = await fetch('/api/debug/encrypt', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ text: cryptoInput, mode: cryptoMode })
            });
            const data = await res.json();
            setCryptoOutput(data.result || data.error);
        } catch (e) {
            setCryptoOutput('Error: ' + e);
        } finally {
            setIsCryptoLoading(false);
        }
    };

    const handleRunRetention = async () => {
        if (!confirm('WARNING: This will PERMANENTLY delete all messages older than 5 years. This action cannot be undone. Are you sure?')) return;

        setIsRetentionLoading(true);
        setRetentionResult(null);
        try {
            const res = await fetch('/api/admin/retention', { method: 'POST' });
            const data = await res.json();
            setRetentionResult(data);
        } catch (e) {
            setRetentionResult({ error: 'Failed to execute retention policy: ' + e });
        } finally {
            setIsRetentionLoading(false);
        }
    };

    const handleLookup = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!lookupQuery.trim()) return;

        setIsLookingUp(true);
        setLookupResult(null);
        try {
            const res = await fetch(`/api/debug/lookup-v2?q=${encodeURIComponent(lookupQuery)}`);
            const data = await res.json();
            setLookupResult(data);
        } catch (error) {
            console.error('Lookup failed', error);
            setLookupResult({ error: 'Failed to perform lookup' });
        } finally {
            setIsLookingUp(false);
        }
    };

    return (
        <div className="p-6 space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-bold text-gray-900 dark:text-white flex items-center gap-3">
                        <Shield className="w-8 h-8 text-indigo-600" />
                        Admin Console
                    </h1>
                    <p className="text-gray-500 dark:text-gray-400 mt-1">System monitoring and user management</p>
                </div>
                <div className="flex items-center gap-3">
                    <button
                        onClick={handleExportReport}
                        className="px-4 py-2 text-sm font-medium text-white bg-indigo-600 rounded-lg hover:bg-indigo-700 transition-colors shadow-sm flex items-center gap-2"
                    >
                        <FileText className="w-4 h-4" />
                        Export Grant Report
                    </button>
                    <button
                        onClick={() => router.push('/')}
                        className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors shadow-sm"
                    >
                        Back to Dashboard
                    </button>
                </div>
            </div>

            {/* Tabs */}
            <div className="flex space-x-1 bg-white dark:bg-gray-900 p-1 rounded-xl shadow-sm border border-gray-200 dark:border-gray-800 w-fit">
                {[
                    { id: 'overview', label: 'Overview', icon: LayoutDashboard },
                    { id: 'users', label: 'User Management', icon: Users },
                    { id: 'clients', label: 'Clients', icon: Database },
                    { id: 'resources', label: 'Resources', icon: Box },
                    { id: 'audit', label: 'System Audit', icon: Activity },
                    { id: 'tools', label: 'Tools', icon: Wrench }
                ].map((tab) => (
                    <button
                        key={tab.id}
                        onClick={() => setActiveTab(tab.id)}
                        className={cn(
                            "px-4 py-2 text-sm font-medium rounded-lg flex items-center gap-2 transition-all",
                            activeTab === tab.id
                                ? "bg-indigo-50 text-indigo-600 shadow-sm"
                                : "text-gray-600 hover:text-gray-900 hover:bg-gray-50 dark:text-gray-400 dark:hover:text-gray-200 dark:hover:bg-gray-800"
                        )}
                    >
                        <tab.icon className="w-4 h-4" />
                        {tab.label}
                    </button>
                ))}
            </div>

            {/* CONTENT */}
            <div className="space-y-6">

                {/* OVERVIEW TAB */}
                {activeTab === 'overview' && stats && (
                    <div className="space-y-6">
                        {/* Metrics */}
                        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                            <div className="bg-white dark:bg-gray-900 p-6 rounded-xl border border-gray-200 dark:border-gray-800">
                                <h3 className="text-sm font-medium text-gray-500">Total Cases</h3>
                                <p className="text-3xl font-bold text-gray-900 dark:text-white mt-2">{stats.totalCases}</p>
                            </div>
                            <div className="bg-white dark:bg-gray-900 p-6 rounded-xl border border-gray-200 dark:border-gray-800">
                                <h3 className="text-sm font-medium text-gray-500">Active Cases</h3>
                                <p className="text-3xl font-bold text-blue-600 mt-2">{stats.activeCases}</p>
                            </div>
                            <div className="bg-white dark:bg-gray-900 p-6 rounded-xl border border-gray-200 dark:border-gray-800">
                                <h3 className="text-sm font-medium text-gray-500">Total Users</h3>
                                <p className="text-3xl font-bold text-indigo-600 mt-2">{stats.totalUsers}</p>
                            </div>
                            <div className="bg-white dark:bg-gray-900 p-6 rounded-xl border border-gray-200 dark:border-gray-800">
                                <h3 className="text-sm font-medium text-gray-500">Documents</h3>
                                <p className="text-3xl font-bold text-gray-900 dark:text-white mt-2">{stats.totalDocuments}</p>
                            </div>
                        </div>

                        {/* Operational Intelligence (Phase 1) */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            {/* Urgency Heatmap */}
                            <div className="bg-white dark:bg-gray-900 p-6 rounded-xl border border-gray-200 dark:border-gray-800">
                                <div className="mb-4">
                                    <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Case Urgency Heatmap</h3>
                                    <p className="text-xs text-gray-500">Tracks active cases by days since last update</p>
                                </div>
                                <UrgencyHeatmap data={intelligence?.urgencyStats ?? null} isLoading={isLoading} />
                            </div>

                            {/* Program Distribution */}
                            <div className="bg-white dark:bg-gray-900 p-6 rounded-xl border border-gray-200 dark:border-gray-800">
                                <div className="mb-4">
                                    <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Program Distribution</h3>
                                    <p className="text-xs text-gray-500">Active accommodations by program type</p>
                                </div>
                                <ProgramDistribution data={intelligence?.programDistribution ?? null} isLoading={isLoading} />
                            </div>
                        </div>

                        {/* Recent Audit Activity Table */}
                        <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800">
                            <div className="p-6 border-b border-gray-200 dark:border-gray-800">
                                <h3 className="font-semibold text-gray-900 dark:text-white">Recent System Activity</h3>
                            </div>
                            <table className="w-full text-left font-sm">
                                <thead className="bg-gray-50 dark:bg-gray-800/50">
                                    <tr>
                                        <th className="px-6 py-3 text-xs font-semibold text-gray-500 uppercase">Time</th>
                                        <th className="px-6 py-3 text-xs font-semibold text-gray-500 uppercase">User</th>
                                        <th className="px-6 py-3 text-xs font-semibold text-gray-500 uppercase">Action</th>
                                        <th className="px-6 py-3 text-xs font-semibold text-gray-500 uppercase">Entity</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                                    {recentLogs.map(log => (
                                        <tr key={log.id}>
                                            <td className="px-6 py-3 text-sm text-gray-500">
                                                {format(new Date(log.timestamp), 'MMM d, HH:mm')}
                                            </td>
                                            <td className="px-6 py-3 text-sm font-medium text-gray-900 dark:text-white">
                                                {log.user?.name || log.userId || 'Unknown'}
                                            </td>
                                            <td className="px-6 py-3 text-sm text-gray-600 dark:text-gray-400">
                                                {log.action}
                                            </td>
                                            <td className="px-6 py-3 text-sm text-gray-600 dark:text-gray-400">
                                                {log.entityType}
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                )}

                {/* CLIENTS TAB */}
                {activeTab === 'clients' && (
                    <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 p-6">
                        <ClientManagement />
                    </div>
                )}

                {/* USERS TAB */}
                {activeTab === 'users' && (
                    <div className="space-y-4">
                        {/* Role Filter Tabs */}
                        <div className="flex items-center gap-2 p-1 bg-gray-100 dark:bg-gray-800 rounded-lg w-fit">
                            {[
                                { id: 'ALL', label: 'All Users' },
                                { id: 'COORDINATOR', label: 'Coordinators' },
                                { id: 'AUDITOR', label: 'Auditors' },
                                { id: 'ADMIN', label: 'Admins' }
                            ].map((role) => (
                                <button
                                    key={role.id}
                                    onClick={() => setUserRoleFilter(role.id as any)}
                                    className={cn(
                                        "px-4 py-2 text-sm font-medium rounded-md transition-all",
                                        userRoleFilter === role.id
                                            ? "bg-white dark:bg-gray-700 text-gray-900 dark:text-white shadow-sm"
                                            : "text-gray-500 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white"
                                    )}
                                >
                                    {role.label}
                                    <span className="ml-2 text-xs opacity-60">
                                        {role.id === 'ALL'
                                            ? users.length
                                            : users.filter(u => u.role === role.id).length}
                                    </span>
                                </button>
                            ))}
                        </div>

                        <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800">
                            <div className="p-4 flex items-center justify-between border-b border-gray-200 dark:border-gray-800">
                                <h3 className="font-semibold text-gray-900 dark:text-white">
                                    {userRoleFilter === 'ALL' ? 'All Users' :
                                        userRoleFilter === 'ADMIN' ? 'Administrators' :
                                            userRoleFilter === 'AUDITOR' ? 'Auditors' : 'Coordinators'}
                                </h3>
                                <button
                                    onClick={() => setIsCreateUserOpen(true)}
                                    className="flex items-center gap-2 px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-medium transition-colors"
                                >
                                    <Users className="w-4 h-4" />
                                    Create User
                                </button>
                            </div>
                            <table className="w-full text-left">
                                <thead className="bg-gray-50 dark:bg-gray-800/50">
                                    <tr>
                                        <th className="px-6 py-3 text-xs font-semibold text-gray-500 uppercase">User</th>
                                        <th className="px-6 py-3 text-xs font-semibold text-gray-500 uppercase">Role</th>
                                        <th className="px-6 py-3 text-xs font-semibold text-gray-500 uppercase">Status</th>
                                        <th className="px-6 py-3 text-xs font-semibold text-gray-500 uppercase">Last Login</th>
                                        <th className="px-6 py-3 text-xs font-semibold text-gray-500 uppercase text-right">Actions</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                                    {users
                                        .filter(u => userRoleFilter === 'ALL' || u.role === userRoleFilter)
                                        .map(u => (
                                            <tr key={u.id} className="hover:bg-gray-50 dark:hover:bg-gray-800/50">
                                                <td className="px-6 py-3">
                                                    <div className="flex items-center gap-3">
                                                        <div className="w-8 h-8 rounded-full bg-gray-100 dark:bg-gray-800 flex items-center justify-center text-gray-500 font-medium">
                                                            {u.name.charAt(0)}
                                                        </div>
                                                        <div>
                                                            <p className="font-medium text-gray-900 dark:text-white">{u.name}</p>
                                                            <p className="text-xs text-gray-500">{u.email}</p>
                                                        </div>
                                                    </div>
                                                </td>
                                                <td className="px-6 py-3">
                                                    <span className={cn(
                                                        "px-2 py-0.5 rounded text-xs font-medium border",
                                                        u.role === 'ADMIN'
                                                            ? "bg-purple-50 text-purple-700 border-purple-200"
                                                            : u.role === 'AUDITOR'
                                                                ? "bg-amber-50 text-amber-700 border-amber-200"
                                                                : "bg-blue-50 text-blue-700 border-blue-200"
                                                    )}>
                                                        {u.role}
                                                    </span>
                                                </td>
                                                <td className="px-6 py-3">
                                                    {u.lockedUntil && new Date(u.lockedUntil) > new Date() ? (
                                                        <span className="flex items-center gap-1 text-red-600 text-sm font-medium">
                                                            <Lock className="w-3 h-3" /> Locked
                                                        </span>
                                                    ) : (
                                                        <span className="text-green-600 text-sm font-medium">Active</span>
                                                    )}
                                                </td>
                                                <td className="px-6 py-3 text-sm text-gray-500">
                                                    {u.lastLogin ? format(new Date(u.lastLogin), 'MMM d, yyyy') : 'Never'}
                                                </td>
                                                <td className="px-6 py-3 text-right">
                                                    <div className="flex items-center justify-end gap-2">
                                                        <button
                                                            onClick={() => {
                                                                setEditingUser(u);
                                                                setIsEditUserOpen(true);
                                                            }}
                                                            className="p-1 text-gray-500 hover:text-blue-600 transition-colors"
                                                            title="Edit"
                                                        >
                                                            <Edit2 className="w-4 h-4" />
                                                        </button>

                                                        {u.lockedUntil && new Date(u.lockedUntil) > new Date() ? (
                                                            <button
                                                                onClick={() => handleUserAction(u.id, 'unlock')}
                                                                className="p-1 text-gray-500 hover:text-green-600 transition-colors"
                                                                title="Unlock"
                                                            >
                                                                <Unlock className="w-4 h-4" />
                                                            </button>
                                                        ) : (
                                                            <button
                                                                onClick={() => handleUserAction(u.id, 'lock')}
                                                                className="p-1 text-gray-500 hover:text-orange-600 transition-colors"
                                                                title="Lock"
                                                            >
                                                                <Lock className="w-4 h-4" />
                                                            </button>
                                                        )}

                                                        <button
                                                            onClick={() => handleDeleteUser(u.id)}
                                                            className="p-1 text-gray-500 hover:text-red-600 transition-colors"
                                                            title="Delete"
                                                        >
                                                            <Trash2 className="w-4 h-4" />
                                                        </button>
                                                    </div>
                                                </td>
                                            </tr>
                                        ))}
                                    {users.filter(u => userRoleFilter === 'ALL' || u.role === userRoleFilter).length === 0 && (
                                        <tr>
                                            <td colSpan={5} className="px-6 py-12 text-center text-gray-500">
                                                No users found in this category.
                                            </td>
                                        </tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>
                )}

                {/* RESOURCES TAB */}
                {activeTab === 'resources' && (
                    <div className="space-y-6">
                        <div className="flex justify-between items-center">
                            <h2 className="text-xl font-bold text-gray-900 dark:text-white">Asset Inventory</h2>
                            <button
                                onClick={() => setIsAddInventoryOpen(true)}
                                className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 font-medium flex items-center gap-2 shadow-sm transition-all"
                            >
                                <Plus className="w-4 h-4" />
                                Add Asset
                            </button>
                        </div>

                        <div className="bg-white dark:bg-gray-900 rounded-xl shadow-sm border border-gray-200 dark:border-gray-800 overflow-hidden">
                            <table className="w-full text-left text-sm">
                                <thead className="bg-gray-50 dark:bg-gray-800 text-gray-500 font-medium">
                                    <tr>
                                        <th className="px-6 py-4">Asset Tag</th>
                                        <th className="px-6 py-4">Name</th>
                                        <th className="px-6 py-4">Category</th>
                                        <th className="px-6 py-4">Status</th>
                                        <th className="px-6 py-4">Assigned To</th>
                                        <th className="px-6 py-4">Added</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                                    {inventory.length === 0 ? (
                                        <tr>
                                            <td colSpan={6} className="px-6 py-12 text-center text-gray-400">
                                                <Box className="w-12 h-12 mx-auto mb-3 text-gray-200" />
                                                No assets found
                                            </td>
                                        </tr>
                                    ) : (
                                        inventory.map((item: any) => (
                                            <tr key={item.id} className="hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors">
                                                <td className="px-6 py-4 font-mono text-xs font-bold text-gray-500">{item.assetTag}</td>
                                                <td className="px-6 py-4 font-medium text-gray-900 dark:text-white">{item.name}</td>
                                                <td className="px-6 py-4 text-gray-500">{item.category}</td>
                                                <td className="px-6 py-4">
                                                    <span className={cn(
                                                        "px-2 py-1 rounded-full text-xs font-semibold border",
                                                        item.status === 'AVAILABLE' ? "bg-green-50 text-green-700 border-green-100" :
                                                            item.status === 'ASSIGNED' ? "bg-blue-50 text-blue-700 border-blue-100" :
                                                                "bg-gray-100 text-gray-700 border-gray-200"
                                                    )}>
                                                        {item.status}
                                                    </span>
                                                </td>
                                                <td className="px-6 py-4 text-gray-500">
                                                    {item.assignedToUser ? (
                                                        <div className="flex items-center gap-2">
                                                            <div className="w-6 h-6 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-600 text-xs font-bold">
                                                                {item.assignedToUser.name[0]}
                                                            </div>
                                                            {item.assignedToUser.name}
                                                        </div>
                                                    ) : '-'}
                                                </td>
                                                <td className="px-6 py-4 text-gray-400 text-xs">
                                                    {format(new Date(item.createdAt), 'MMM d, yyyy')}
                                                </td>
                                            </tr>
                                        ))
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>
                )}

                {/* AUDIT TAB */}
                {activeTab === 'audit' && (
                    <div className="space-y-4">
                        {/* Filters & Actions */}
                        <div className="bg-white dark:bg-gray-900 p-4 rounded-xl border border-gray-200 dark:border-gray-800 flex flex-col md:flex-row gap-4 items-end">
                            <div className="flex-1 grid grid-cols-1 md:grid-cols-3 gap-4 w-full">
                                <div>
                                    <label className="block text-xs font-semibold text-gray-500 mb-1">User</label>
                                    <select
                                        className="w-full p-2 rounded-lg border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 text-sm"
                                        value={auditUser}
                                        onChange={e => setAuditUser(e.target.value)}
                                    >
                                        <option value="">All Users</option>
                                        {users.map(u => <option key={u.id} value={u.id}>{u.name}</option>)}
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-xs font-semibold text-gray-500 mb-1">Start Date</label>
                                    <input
                                        type="date"
                                        className="w-full p-2 rounded-lg border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 text-sm"
                                        value={auditStartDate}
                                        onChange={e => setAuditStartDate(e.target.value)}
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs font-semibold text-gray-500 mb-1">End Date</label>
                                    <input
                                        type="date"
                                        className="w-full p-2 rounded-lg border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 text-sm"
                                        value={auditEndDate}
                                        onChange={e => setAuditEndDate(e.target.value)}
                                    />
                                </div>
                            </div>
                            <div className="flex gap-2">
                                <button
                                    onClick={handleAuditExportExcel}
                                    className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg flex items-center gap-2 text-xs font-medium transition-colors"
                                >
                                    <FileText className="w-4 h-4" /> Excel
                                </button>
                                <button
                                    onClick={handleAuditExportPDF}
                                    className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg flex items-center gap-2 text-xs font-medium transition-colors"
                                >
                                    <Download className="w-4 h-4" /> PDF
                                </button>
                            </div>
                        </div>

                        {/* Table */}
                        <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 overflow-hidden">
                            <table className="w-full text-left">
                                <thead className="bg-gray-50 dark:bg-gray-800/50">
                                    <tr>
                                        <th className="px-6 py-3 text-xs font-semibold text-gray-500 uppercase">Timestamp</th>
                                        <th className="px-6 py-3 text-xs font-semibold text-gray-500 uppercase">User</th>
                                        <th className="px-6 py-3 text-xs font-semibold text-gray-500 uppercase">Action</th>
                                        <th className="px-6 py-3 text-xs font-semibold text-gray-500 uppercase">Details</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                                    {auditLogs.length > 0 ? auditLogs.map(log => (
                                        <tr key={log.id} className="hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors">
                                            <td className="px-6 py-3 text-sm text-gray-500 whitespace-nowrap">
                                                {format(new Date(log.timestamp), 'MMM d, HH:mm:ss')}
                                            </td>
                                            <td className="px-6 py-3 text-sm font-medium text-gray-900 dark:text-white">
                                                {log.user?.name || log.userId || 'Unknown'}
                                            </td>
                                            <td className="px-6 py-3">
                                                <span className={cn("px-2 py-0.5 rounded text-xs font-mono border",
                                                    log.action.includes('DELETE') ? "bg-red-50 text-red-600 border-red-100" :
                                                        log.action.includes('CREATE') ? "bg-green-50 text-green-600 border-green-100" :
                                                            "bg-gray-100 text-gray-600 border-gray-200"
                                                )}>
                                                    {log.action}
                                                </span>
                                                {log.entityType && <span className="ml-2 text-xs text-gray-400">{log.entityType}</span>}
                                            </td>
                                            <td className="px-6 py-4 text-sm text-gray-500 max-w-xs break-all">
                                                {formatAuditDetails(log)}
                                            </td>
                                        </tr>
                                    )) : (
                                        <tr>
                                            <td colSpan={4} className="px-6 py-12 text-center text-gray-400">
                                                No audit logs found for the selected filters.
                                            </td>
                                        </tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>
                )}

                {/* Modals */}
                <CreateUserModal
                    isOpen={isCreateUserOpen}
                    onClose={() => setIsCreateUserOpen(false)}
                    onSuccess={fetchUsers}
                />

                <EditUserModal
                    isOpen={isEditUserOpen}
                    onClose={() => {
                        setIsEditUserOpen(false);
                        setEditingUser(null);
                    }}
                    onSuccess={fetchUsers}
                    user={editingUser as any}
                />

                <AddInventoryModal
                    isOpen={isAddInventoryOpen}
                    onClose={() => setIsAddInventoryOpen(false)}
                    onSuccess={fetchInventory}
                />

                {/* TOOLS TAB */}
                {activeTab === 'tools' && (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        {/* Time Decoder Widget */}
                        <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 p-6">
                            <div className="mb-6">
                                <h3 className="text-lg font-bold text-gray-900 dark:text-white flex items-center gap-2">
                                    <Clock className="w-5 h-5 text-indigo-600" />
                                    Timestamp Decoder
                                </h3>
                                <p className="text-sm text-gray-500 mt-1">
                                    Enter a Claim Number (e.g., AA...) or DCN to decode its exact creation timestamp.
                                </p>
                            </div>

                            <form onSubmit={handleLookup} className="flex gap-2 mb-6">
                                <input
                                    type="text"
                                    value={lookupQuery}
                                    onChange={(e) => setLookupQuery(e.target.value)}
                                    placeholder="Enter Claim # or DCN..."
                                    className="flex-1 px-4 py-2 border border-gray-300 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-indigo-500 outline-none"
                                />
                                <button
                                    type="submit"
                                    disabled={isLookingUp || !lookupQuery.trim()}
                                    className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed font-medium flex items-center gap-2"
                                >
                                    {isLookingUp ? (
                                        <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                    ) : (
                                        <Search className="w-4 h-4" />
                                    )}
                                    Lookup
                                </button>
                            </form>

                            {lookupResult && (
                                <div className={cn(
                                    "p-4 rounded-lg border",
                                    lookupResult.success
                                        ? "bg-green-50 border-green-200 dark:bg-green-900/10 dark:border-green-800"
                                        : "bg-red-50 border-red-200 dark:bg-red-900/10 dark:border-red-800"
                                )}>
                                    {lookupResult.success ? (
                                        <div className="space-y-3">
                                            <div className="flex items-center justify-between">
                                                <span className="text-sm font-medium text-gray-500">Type</span>
                                                <span className="text-sm font-bold text-gray-900 dark:text-white uppercase">
                                                    {lookupResult.type.replace('_', ' ')}
                                                </span>
                                            </div>
                                            <div className="flex items-center justify-between">
                                                <span className="text-sm font-medium text-gray-500">Creation Time</span>
                                                <span className="text-sm font-bold text-indigo-600 dark:text-indigo-400">
                                                    {lookupResult.localTime}
                                                </span>
                                            </div>
                                            {lookupResult.details && (
                                                <div className="pt-3 border-t border-gray-200 dark:border-gray-700/50">
                                                    <p className="text-xs font-medium text-gray-500 mb-2">Details:</p>
                                                    <div className="grid grid-cols-2 gap-2 text-xs">
                                                        {Object.entries(lookupResult.details).map(([k, v]) => (
                                                            <div key={k}>
                                                                <span className="text-gray-500 capitalize">{k}: </span>
                                                                <span className="font-mono text-gray-700 dark:text-gray-300">{String(v)}</span>
                                                            </div>
                                                        ))}
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                    ) : (
                                        <div className="flex items-start gap-3 text-red-700 dark:text-red-400">
                                            <div className="text-sm">
                                                <p className="font-bold">Lookup Failed</p>
                                                <p>{lookupResult.error || lookupResult.message}</p>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>

                        {/* System Health Widget */}
                        <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 p-6">
                            <div className="mb-6 flex items-center justify-between">
                                <div>
                                    <h3 className="text-lg font-bold text-gray-900 dark:text-white flex items-center gap-2">
                                        <Activity className="w-5 h-5 text-green-600" />
                                        System Health
                                    </h3>
                                    <p className="text-sm text-gray-500 mt-1">
                                        Monitor database connectivity and system status.
                                    </p>
                                </div>
                                <button
                                    onClick={handleHealthCheck}
                                    disabled={isHealthLoading}
                                    className="p-2 text-gray-500 hover:text-green-600 hover:bg-green-50 rounded-lg transition-colors"
                                >
                                    <Activity className={cn("w-5 h-5", isHealthLoading && "animate-spin")} />
                                </button>
                            </div>

                            {healthData ? (
                                <div className="space-y-4">
                                    <div className="grid grid-cols-2 gap-4">
                                        <div className="p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
                                            <div className="text-xs text-gray-500 uppercase font-medium mb-1">Status</div>
                                            <div className={cn(
                                                "font-bold",
                                                healthData.status === 'healthy' ? "text-green-600" : "text-red-600"
                                            )}>
                                                {healthData.status.toUpperCase()}
                                            </div>
                                        </div>
                                        <div className="p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
                                            <div className="text-xs text-gray-500 uppercase font-medium mb-1">DB Latency</div>
                                            <div className="font-mono text-gray-900 dark:text-white">
                                                {healthData.database?.latency || 'N/A'}
                                            </div>
                                        </div>
                                        <div className="p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
                                            <div className="text-xs text-gray-500 uppercase font-medium mb-1">Uptime</div>
                                            <div className="font-mono text-gray-900 dark:text-white">
                                                {(healthData.system?.uptime / 3600).toFixed(2)}h
                                            </div>
                                        </div>
                                        <div className="p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
                                            <div className="text-xs text-gray-500 uppercase font-medium mb-1">Memory</div>
                                            <div className="font-mono text-gray-900 dark:text-white">
                                                {healthData.system?.memory?.rss || 'N/A'}
                                            </div>
                                        </div>
                                    </div>
                                    <div className="text-xs text-gray-400 text-center pt-2 border-t border-gray-100 dark:border-gray-800">
                                        Last checked: {new Date(healthData.timestamp).toLocaleTimeString()}
                                    </div>
                                </div>
                            ) : (
                                <div className="text-center py-8 text-gray-500">
                                    Click icon to run system check
                                </div>
                            )}
                        </div>

                        {/* Encryption Tool Widget */}
                        <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 p-6 md:col-span-2">
                            <div className="mb-6">
                                <h3 className="text-lg font-bold text-gray-900 dark:text-white flex items-center gap-2">
                                    <Lock className="w-5 h-5 text-blue-600" />
                                    Encryption Helper
                                </h3>
                                <p className="text-sm text-gray-500 mt-1">
                                    Encrypt or decrypt sensitive data using system keys. Use with caution.
                                </p>
                            </div>

                            <form onSubmit={handleCrypto} className="space-y-4">
                                <div className="flex gap-4">
                                    <div className="flex-1">
                                        <input
                                            type="text"
                                            value={cryptoInput}
                                            onChange={(e) => setCryptoInput(e.target.value)}
                                            placeholder="Enter text to process..."
                                            className="w-full px-4 py-2 border border-gray-300 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none"
                                        />
                                    </div>
                                    <div className="flex bg-gray-100 dark:bg-gray-800 rounded-lg p-1">
                                        <button
                                            type="button"
                                            onClick={() => setCryptoMode('encrypt')}
                                            className={cn(
                                                "px-3 py-1.5 text-sm font-medium rounded-md transition-all",
                                                cryptoMode === 'encrypt'
                                                    ? "bg-white dark:bg-gray-700 shadow-sm text-blue-600 dark:text-blue-400"
                                                    : "text-gray-500 hover:text-gray-700"
                                            )}
                                        >
                                            Encrypt
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() => setCryptoMode('decrypt')}
                                            className={cn(
                                                "px-3 py-1.5 text-sm font-medium rounded-md transition-all",
                                                cryptoMode === 'decrypt'
                                                    ? "bg-white dark:bg-gray-700 shadow-sm text-blue-600 dark:text-blue-400"
                                                    : "text-gray-500 hover:text-gray-700"
                                            )}
                                        >
                                            Decrypt
                                        </button>
                                    </div>
                                    <button
                                        type="submit"
                                        disabled={isCryptoLoading || !cryptoInput.trim()}
                                        className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 font-medium"
                                    >
                                        {isCryptoLoading ? 'Processing...' : 'Process'}
                                    </button>
                                </div>

                                {cryptoOutput && (
                                    <div className="mt-4 p-4 bg-gray-50 dark:bg-gray-800 rounded-lg font-mono text-sm break-all text-gray-900 dark:text-white border border-gray-200 dark:border-gray-700">
                                        {cryptoOutput}
                                    </div>
                                )}
                            </form>
                        </div>

                        {/* Data Retention Widget */}
                        <div className="bg-white dark:bg-gray-900 rounded-xl border border-red-200 dark:border-red-900/30 p-6 md:col-span-2">
                            <div className="flex items-start justify-between">
                                <div>
                                    <h3 className="text-lg font-bold text-gray-900 dark:text-white flex items-center gap-2">
                                        <Trash2 className="w-5 h-5 text-red-600" />
                                        Data Retention Policy
                                    </h3>
                                    <p className="text-sm text-gray-500 mt-1">
                                        Manage automated data cleanup tasks.
                                    </p>
                                </div>
                                <span className="bg-red-50 text-red-700 text-xs font-bold px-2 py-1 rounded border border-red-100">
                                    ADMIN ONLY
                                </span>
                            </div>

                            <div className="mt-6 p-4 bg-gray-50 dark:bg-gray-800 rounded-lg border border-gray-100 dark:border-gray-700">
                                <div className="flex items-center justify-between">
                                    <div>
                                        <h4 className="font-semibold text-gray-900 dark:text-white">5-Year Message Retention</h4>
                                        <p className="text-sm text-gray-500 mt-1 max-w-xl">
                                            Enforce the 5-year retention policy by permanently deleting all messages and associated metadata
                                            created more than 5 years ago from the current timestamp.
                                        </p>
                                    </div>
                                    <button
                                        onClick={handleRunRetention}
                                        disabled={isRetentionLoading}
                                        className="px-4 py-2 bg-white border border-red-200 text-red-600 hover:bg-red-50 hover:border-red-300 rounded-lg font-medium shadow-sm transition-all flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                                    >
                                        {isRetentionLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
                                        Run Cleanup
                                    </button>
                                </div>

                                {retentionResult && (
                                    <div className={cn(
                                        "mt-4 p-3 rounded text-sm font-medium",
                                        retentionResult.success
                                            ? "bg-green-50 text-green-700 border border-green-200"
                                            : "bg-red-50 text-red-700 border border-red-200"
                                    )}>
                                        {retentionResult.message || retentionResult.error}
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}

// Missing Components Stubs
// Chart Helpers
const COLORS = ['#4f46e5', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899'];

function UrgencyHeatmap({ data, isLoading }: { data: any; isLoading?: boolean }) {
    if (isLoading) return <div className="p-4 bg-gray-100 dark:bg-gray-800 rounded animate-pulse h-64" />;
    if (!data || data.length === 0) return <div className="p-4 text-gray-500 text-center bg-gray-50 dark:bg-gray-800 rounded h-64 flex items-center justify-center">No data available</div>;

    return (
        <div className="h-64 w-full bg-white dark:bg-gray-900 rounded p-2">
            <ResponsiveContainer width="100%" height="100%">
                <RechartsBarChart data={data}>
                    <CartesianGrid strokeDasharray="3 3" opacity={0.1} />
                    <XAxis
                        dataKey="range"
                        stroke="#888888"
                        fontSize={12}
                        tickLine={false}
                        axisLine={false}
                    />
                    <YAxis stroke="#888888" fontSize={12} tickLine={false} axisLine={false} allowDecimals={false} />
                    <Tooltip
                        contentStyle={{ backgroundColor: '#1f2937', borderColor: '#374151', color: '#fff', borderRadius: '0.5rem' }}
                        itemStyle={{ color: '#fff' }}
                        cursor={{ fill: 'transparent' }}
                    />
                    <Bar dataKey="count" name="Urgent Cases" fill="#4f46e5" radius={[4, 4, 0, 0]} />
                </RechartsBarChart>
            </ResponsiveContainer>
        </div>
    );
}

function ProgramDistribution({ data, isLoading }: { data: any; isLoading?: boolean }) {
    if (isLoading) return <div className="p-4 bg-gray-100 dark:bg-gray-800 rounded animate-pulse h-64" />;
    if (!data || data.length === 0) return <div className="p-4 text-gray-500 text-center bg-gray-50 dark:bg-gray-800 rounded h-64 flex items-center justify-center">No data available</div>;

    return (
        <div className="h-64 w-full bg-white dark:bg-gray-900 rounded p-2">
            <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                    <Pie
                        data={data}
                        cx="50%"
                        cy="50%"
                        innerRadius={60}
                        outerRadius={80}
                        fill="#8884d8"
                        paddingAngle={5}
                        dataKey="value"
                    >
                        {data.map((entry: any, index: number) => (
                            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                        ))}
                    </Pie>
                    <Tooltip
                        contentStyle={{ backgroundColor: '#1f2937', borderColor: '#374151', color: '#fff', borderRadius: '0.5rem' }}
                        itemStyle={{ color: '#fff' }}
                    />
                    <Legend verticalAlign="bottom" height={36} />
                </PieChart>
            </ResponsiveContainer>
        </div>
    );
}

// AddInventoryModal stub - can be replaced later if needed
function AddInventoryModal({ isOpen, onClose, onSuccess }: any) {
    if (!isOpen) return null;
    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
            <div className="bg-white p-6 rounded-lg shadow-lg">
                <h2 className="text-xl font-bold mb-4">Add Inventory</h2>
                <p className="text-gray-500 mb-4">Inventory form goes here.</p>
                <div className="flex justify-end gap-2">
                    <button onClick={onClose} className="px-4 py-2 bg-gray-200 rounded hover:bg-gray-300">Close</button>
                    <button onClick={() => { onSuccess(); onClose(); }} className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700">Save (Stub)</button>
                </div>
            </div>
        </div>
    );
}

export default function AdminDashboard() {
    return (
        <Suspense fallback={<div className="flex items-center justify-center min-h-screen"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div></div>}>
            <AdminDashboardContent />
        </Suspense>
    );
}
