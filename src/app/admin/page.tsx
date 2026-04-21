'use client';
import { apiFetch } from '@/lib/api-client';

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
                apiFetch('/api/admin/stats'),
                apiFetch('/api/admin/intelligence')
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
            const res = await apiFetch('/api/admin/users');
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
            const res = await apiFetch('/api/admin/inventory');
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
            const res = await apiFetch('/api/admin/reports/grant');
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
            const res = await apiFetch('/api/admin/health');
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
            const res = await apiFetch('/api/debug/encrypt', {
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
            const res = await apiFetch('/api/admin/retention', { method: 'POST' });
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
        <div className="p-6 space-y-6 h-full flex flex-col">
            <div className="flex items-center justify-between flex-shrink-0">
                <div>
                    <h1 className="text-2xl font-bold text-[#1C1A17] flex items-center gap-3">
                        <Shield className="w-7 h-7 text-[#0D9488]" />
                        Admin Console
                    </h1>
                    <p className="text-[#8C8880] mt-1">System monitoring and user management</p>
                </div>
                <div className="flex items-center gap-3">
                    <button
                        onClick={handleExportReport}
                        className="px-4 py-2 text-sm font-medium text-[#ffffff] bg-[#0D9488] rounded-lg hover:bg-[#0F766E] transition-colors shadow-sm flex items-center gap-2"
                    >
                        <FileText className="w-4 h-4" />
                        Export Grant Report
                    </button>
                    <button
                        onClick={() => router.push('/dashboard/tasks')}
                        className="px-4 py-2 text-sm font-medium text-[#5C5850] bg-[#ffffff] border border-[#E5E2DB] rounded-lg hover:bg-[#F8F7F5] transition-colors"
                    >
                        Back to Dashboard
                    </button>
                </div>
            </div>

            {/* Main Container */}
            <div className="flex-1 bg-[#ffffff] rounded-xl border border-[#E5E2DB] shadow-sm overflow-hidden flex flex-col">

                {/* Tabs Header */}
                <div className="p-4 border-b border-[#E5E2DB]">
                    <div className="flex space-x-1 bg-[#F8F7F5] p-1 rounded-lg border border-[#E5E2DB] w-fit">
                        {[
                            { id: 'overview', label: 'Overview', icon: LayoutDashboard },
                            { id: 'users', label: 'User Management', icon: Users },
                            { id: 'clients', label: 'Clients', icon: Database },
                            { id: 'resources', label: 'Resources', icon: Box },
                            { id: 'audit', label: 'System Audit', icon: Activity },
                            { id: 'tools', label: 'Tools', icon: Wrench },
                            { id: 'claimants', label: 'Claimants', icon: Users, href: '/admin/claimants' },
                            { id: 'reports', label: 'Reports', icon: BarChart, href: '/reports' },
                        ].map((tab) => (
                            <button
                                key={tab.id}
                                onClick={() => (tab as any).href ? router.push((tab as any).href) : setActiveTab(tab.id)}
                                className={cn(
                                    "px-4 py-2 text-sm font-medium rounded-md flex items-center gap-2 transition-all",
                                    activeTab === tab.id
                                        ? "bg-[#ffffff] text-[#0D9488] shadow-sm"
                                        : "text-[#5C5850] hover:text-[#1C1A17] hover:bg-[#F3F1EC]"
                                )}
                            >
                                <tab.icon className="w-4 h-4" />
                                <span className="hidden sm:inline">{tab.label}</span>
                            </button>
                        ))}
                    </div>
                </div>

                {/* Scrollable Content Area */}
                <div className="p-6 overflow-y-auto flex-1">

                    {/* OVERVIEW TAB */}
                    {activeTab === 'overview' && stats && (
                        <div className="space-y-6">
                            {/* Metrics */}
                            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                                <div className="bg-[#ffffff] p-6 rounded-xl border border-[#E5E2DB] shadow-sm transition-all hover:bg-[#F8F7F5]">
                                    <h3 className="text-sm font-semibold text-[#5C5850]">Total Cases</h3>
                                    <p className="text-3xl font-bold text-[#1C1A17] mt-2">{stats.totalCases}</p>
                                </div>
                                <div className="bg-[#ffffff] p-6 rounded-xl border border-[#E5E2DB] shadow-sm transition-all hover:bg-[#F8F7F5]">
                                    <h3 className="text-sm font-semibold text-[#5C5850]">Active Cases</h3>
                                    <p className="text-3xl font-bold text-[#0D9488] mt-2">{stats.activeCases}</p>
                                </div>
                                <div className="bg-[#ffffff] p-6 rounded-xl border border-[#E5E2DB] shadow-sm transition-all hover:bg-[#F8F7F5]">
                                    <h3 className="text-sm font-semibold text-[#5C5850]">Total Users</h3>
                                    <p className="text-3xl font-bold text-[#0D9488] mt-2">{stats.totalUsers}</p>
                                </div>
                                <div className="bg-[#ffffff] p-6 rounded-xl border border-[#E5E2DB] shadow-sm transition-all hover:bg-[#F8F7F5]">
                                    <h3 className="text-sm font-semibold text-[#5C5850]">Documents</h3>
                                    <p className="text-3xl font-bold text-[#1C1A17] mt-2">{stats.totalDocuments}</p>
                                </div>
                            </div>

                            {/* Operational Intelligence (Phase 1) */}
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                {/* Urgency Heatmap */}
                                <div className="bg-[#ffffff] p-6 rounded-xl border border-[#E5E2DB] shadow-sm">
                                    <div className="mb-4">
                                        <h3 className="text-lg font-semibold text-[#1C1A17]">Case Urgency Heatmap</h3>
                                        <p className="text-xs text-[#8C8880]">Tracks active cases by days since last update</p>
                                    </div>
                                    <UrgencyHeatmap data={intelligence?.urgencyStats ?? null} isLoading={isLoading} />
                                </div>

                                {/* Program Distribution */}
                                <div className="bg-[#ffffff] p-6 rounded-xl border border-[#E5E2DB] shadow-sm">
                                    <div className="mb-4">
                                        <h3 className="text-lg font-semibold text-[#1C1A17]">Program Distribution</h3>
                                        <p className="text-xs text-[#8C8880]">Active accommodations by program type</p>
                                    </div>
                                    <ProgramDistribution data={intelligence?.programDistribution ?? null} isLoading={isLoading} />
                                </div>
                            </div>

                            {/* Recent Audit Activity Table */}
                            <div className="bg-[#ffffff] rounded-xl border border-[#E5E2DB]">
                                <div className="p-6 border-b border-[#E5E2DB]">
                                    <h3 className="font-semibold text-[#1C1A17]">Recent System Activity</h3>
                                </div>
                                <table className="w-full text-left font-sm">
                                    <thead className="bg-[#F8F7F5]">
                                        <tr>
                                            <th className="px-6 py-3 text-xs font-semibold text-[#8C8880] uppercase tracking-[0.08em]">Time</th>
                                            <th className="px-6 py-3 text-xs font-semibold text-[#8C8880] uppercase tracking-[0.08em]">User</th>
                                            <th className="px-6 py-3 text-xs font-semibold text-[#8C8880] uppercase tracking-[0.08em]">Action</th>
                                            <th className="px-6 py-3 text-xs font-semibold text-[#8C8880] uppercase tracking-[0.08em]">Entity</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-[#F3F1EC]">
                                        {recentLogs.map(log => (
                                            <tr key={log.id} className="hover:bg-[#F8F7F5] transition-colors">
                                                <td className="px-6 py-3 text-sm text-[#8C8880]">
                                                    {format(new Date(log.timestamp), 'MMM d, HH:mm')}
                                                </td>
                                                <td className="px-6 py-3 text-sm font-medium text-[#1C1A17]">
                                                    {log.user?.name || log.userId || 'Unknown'}
                                                </td>
                                                <td className="px-6 py-3 text-sm text-[#5C5850]">
                                                    {log.action}
                                                </td>
                                                <td className="px-6 py-3 text-sm text-[#5C5850]">
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
                        <div className="bg-[#F8F7F5] rounded-xl border border-[#E5E2DB] p-6">
                            <ClientManagement />
                        </div>
                    )}

                    {/* USERS TAB */}
                    {activeTab === 'users' && (
                        <div className="space-y-4">
                            {/* Role Filter Tabs */}
                            <div className="flex items-center gap-2 p-1 bg-[#F8F7F5] border border-[#E5E2DB] rounded-lg w-fit">
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
                                                ? "bg-[#ffffff] text-[#1C1A17] shadow-sm"
                                                : "text-[#5C5850] hover:text-[#1C1A17] hover:bg-[#F3F1EC]"
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

                            <div className="bg-[#ffffff] rounded-xl border border-[#E5E2DB] overflow-hidden">
                                <div className="p-4 flex items-center justify-between border-b border-[#E5E2DB] bg-[#F8F7F5]">
                                    <h3 className="font-semibold text-[#1C1A17]">
                                        {userRoleFilter === 'ALL' ? 'All Users' :
                                            userRoleFilter === 'ADMIN' ? 'Administrators' :
                                                userRoleFilter === 'AUDITOR' ? 'Auditors' : 'Coordinators'}
                                    </h3>
                                    <button
                                        onClick={() => setIsCreateUserOpen(true)}
                                        className="flex items-center gap-2 px-3 py-1.5 bg-[#0D9488] hover:bg-[#0F766E] text-[#ffffff] rounded-lg text-sm font-medium transition-colors"
                                    >
                                        <Users className="w-4 h-4" />
                                        Create User
                                    </button>
                                </div>
                                <table className="w-full text-left">
                                    <thead className="bg-[#F8F7F5] border-b border-[#E5E2DB]">
                                        <tr>
                                            <th className="px-6 py-3 text-xs font-semibold text-[#8C8880] uppercase tracking-[0.08em]">User</th>
                                            <th className="px-6 py-3 text-xs font-semibold text-[#8C8880] uppercase tracking-[0.08em]">Role</th>
                                            <th className="px-6 py-3 text-xs font-semibold text-[#8C8880] uppercase tracking-[0.08em]">Status</th>
                                            <th className="px-6 py-3 text-xs font-semibold text-[#8C8880] uppercase tracking-[0.08em]">Last Login</th>
                                            <th className="px-6 py-3 text-xs font-semibold text-[#8C8880] uppercase tracking-[0.08em] text-right">Actions</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-[#F3F1EC]">
                                        {users
                                            .filter(u => userRoleFilter === 'ALL' || u.role === userRoleFilter)
                                            .map(u => (
                                                <tr key={u.id} className="hover:bg-[#F8F7F5] transition-colors">
                                                    <td className="px-6 py-3">
                                                        <div className="flex items-center gap-3">
                                                            <div className="w-8 h-8 rounded-full bg-[#F3F1EC] flex items-center justify-center text-[#5C5850] font-medium text-sm">
                                                                {u.name.charAt(0)}
                                                            </div>
                                                            <div>
                                                                <p className="font-medium text-[#1C1A17]">{u.name}</p>
                                                                <p className="text-xs text-[#8C8880]">{u.email}</p>
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
                                                                    : "bg-[#0D9488]/8 text-[#0D9488] border-[#0D9488]/20"
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
                                                    <td className="px-6 py-3 text-sm text-[#8C8880]">
                                                        {u.lastLogin ? format(new Date(u.lastLogin), 'MMM d, yyyy') : 'Never'}
                                                    </td>
                                                    <td className="px-6 py-3 text-right">
                                                        <div className="flex items-center justify-end gap-2">
                                                            <button
                                                                onClick={() => {
                                                                    setEditingUser(u);
                                                                    setIsEditUserOpen(true);
                                                                }}
                                                                className="p-1 text-[#8C8880] hover:text-[#0D9488] transition-colors"
                                                                title="Edit"
                                                            >
                                                                <Edit2 className="w-4 h-4" />
                                                            </button>

                                                            {u.lockedUntil && new Date(u.lockedUntil) > new Date() ? (
                                                                <button
                                                                    onClick={() => handleUserAction(u.id, 'unlock')}
                                                                    className="p-1 text-[#8C8880] hover:text-green-600 transition-colors"
                                                                    title="Unlock"
                                                                >
                                                                    <Unlock className="w-4 h-4" />
                                                                </button>
                                                            ) : (
                                                                <button
                                                                    onClick={() => handleUserAction(u.id, 'lock')}
                                                                    className="p-1 text-[#8C8880] hover:text-orange-600 transition-colors"
                                                                    title="Lock"
                                                                >
                                                                    <Lock className="w-4 h-4" />
                                                                </button>
                                                            )}

                                                            <button
                                                                onClick={() => handleDeleteUser(u.id)}
                                                                className="p-1 text-[#8C8880] hover:text-red-600 transition-colors"
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
                                                <td colSpan={5} className="px-6 py-12 text-center text-[#8C8880]">
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
                                <h2 className="text-xl font-bold text-[#1C1A17]">Asset Inventory</h2>
                                <button
                                    onClick={() => setIsAddInventoryOpen(true)}
                                    className="px-4 py-2 bg-[#0D9488] text-[#ffffff] rounded-lg hover:bg-[#0F766E] font-medium flex items-center gap-2 shadow-sm transition-all"
                                >
                                    <Plus className="w-4 h-4" />
                                    Add Asset
                                </button>
                            </div>

                            <div className="bg-[#ffffff] rounded-xl border border-[#E5E2DB] overflow-hidden">
                                <table className="w-full text-left text-sm">
                                    <thead className="bg-[#F8F7F5] border-b border-[#E5E2DB]">
                                        <tr>
                                            <th className="px-6 py-4 text-xs font-semibold text-[#8C8880] uppercase tracking-[0.08em]">Asset Tag</th>
                                            <th className="px-6 py-4 text-xs font-semibold text-[#8C8880] uppercase tracking-[0.08em]">Name</th>
                                            <th className="px-6 py-4 text-xs font-semibold text-[#8C8880] uppercase tracking-[0.08em]">Category</th>
                                            <th className="px-6 py-4 text-xs font-semibold text-[#8C8880] uppercase tracking-[0.08em]">Status</th>
                                            <th className="px-6 py-4 text-xs font-semibold text-[#8C8880] uppercase tracking-[0.08em]">Assigned To</th>
                                            <th className="px-6 py-4 text-xs font-semibold text-[#8C8880] uppercase tracking-[0.08em]">Added</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-[#F3F1EC]">
                                        {inventory.length === 0 ? (
                                            <tr>
                                                <td colSpan={6} className="px-6 py-12 text-center text-[#8C8880]">
                                                    <Box className="w-12 h-12 mx-auto mb-3 text-[#E5E2DB]" />
                                                    No assets found
                                                </td>
                                            </tr>
                                        ) : (
                                            inventory.map((item: any) => (
                                                <tr key={item.id} className="hover:bg-[#F8F7F5] transition-colors">
                                                    <td className="px-6 py-4 font-mono text-xs font-bold text-[#8C8880]">{item.assetTag}</td>
                                                    <td className="px-6 py-4 font-medium text-[#1C1A17]">{item.name}</td>
                                                    <td className="px-6 py-4 text-[#5C5850]">{item.category}</td>
                                                    <td className="px-6 py-4">
                                                        <span className={cn(
                                                            "px-2 py-1 rounded-full text-xs font-semibold border",
                                                            item.status === 'AVAILABLE' ? "bg-green-50 text-green-700 border-green-100" :
                                                                item.status === 'ASSIGNED' ? "bg-[#0D9488]/8 text-[#0D9488] border-[#0D9488]/20" :
                                                                    "bg-[#F3F1EC] text-[#5C5850] border-[#E5E2DB]"
                                                        )}>
                                                            {item.status}
                                                        </span>
                                                    </td>
                                                    <td className="px-6 py-4 text-[#5C5850]">
                                                        {item.assignedToUser ? (
                                                            <div className="flex items-center gap-2">
                                                                <div className="w-6 h-6 rounded-full bg-[#0D9488]/10 flex items-center justify-center text-[#0D9488] text-xs font-bold">
                                                                    {item.assignedToUser.name[0]}
                                                                </div>
                                                                {item.assignedToUser.name}
                                                            </div>
                                                        ) : '-'}
                                                    </td>
                                                    <td className="px-6 py-4 text-[#8C8880] text-xs">
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
                            <div className="bg-[#ffffff] p-4 rounded-xl border border-[#E5E2DB] flex flex-col md:flex-row gap-4 items-end">
                                <div className="flex-1 grid grid-cols-1 md:grid-cols-3 gap-4 w-full">
                                    <div>
                                        <label className="block text-[11px] font-semibold uppercase tracking-[0.1em] text-[#8C8880] mb-1.5">User</label>
                                        <select
                                            className="w-full p-2 rounded-lg border border-[#E5E2DB] bg-[#F8F7F5] text-[#1C1A17] text-sm focus:outline-none focus:ring-2 focus:ring-[#0D9488]/30 focus:border-[#0D9488] transition-colors"
                                            value={auditUser}
                                            onChange={e => setAuditUser(e.target.value)}
                                        >
                                            <option value="">All Users</option>
                                            {users.map(u => <option key={u.id} value={u.id}>{u.name}</option>)}
                                        </select>
                                    </div>
                                    <div>
                                        <label className="block text-[11px] font-semibold uppercase tracking-[0.1em] text-[#8C8880] mb-1.5">Start Date</label>
                                        <input
                                            type="date"
                                            className="w-full p-2 rounded-lg border border-[#E5E2DB] bg-[#F8F7F5] text-[#1C1A17] text-sm focus:outline-none focus:ring-2 focus:ring-[#0D9488]/30 focus:border-[#0D9488] transition-colors"
                                            value={auditStartDate}
                                            onChange={e => setAuditStartDate(e.target.value)}
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-[11px] font-semibold uppercase tracking-[0.1em] text-[#8C8880] mb-1.5">End Date</label>
                                        <input
                                            type="date"
                                            className="w-full p-2 rounded-lg border border-[#E5E2DB] bg-[#F8F7F5] text-[#1C1A17] text-sm focus:outline-none focus:ring-2 focus:ring-[#0D9488]/30 focus:border-[#0D9488] transition-colors"
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
                            <div className="bg-[#ffffff] rounded-xl border border-[#E5E2DB] overflow-hidden">
                                <table className="w-full text-left">
                                    <thead className="bg-[#F8F7F5]">
                                        <tr>
                                            <th className="px-6 py-3 text-xs font-semibold text-[#8C8880] uppercase tracking-[0.08em]">Timestamp</th>
                                            <th className="px-6 py-3 text-xs font-semibold text-[#8C8880] uppercase tracking-[0.08em]">User</th>
                                            <th className="px-6 py-3 text-xs font-semibold text-[#8C8880] uppercase tracking-[0.08em]">Action</th>
                                            <th className="px-6 py-3 text-xs font-semibold text-[#8C8880] uppercase tracking-[0.08em]">Details</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-[#F3F1EC]">
                                        {auditLogs.length > 0 ? auditLogs.map(log => (
                                            <tr key={log.id} className="hover:bg-[#F8F7F5] transition-colors">
                                                <td className="px-6 py-3 text-sm text-[#8C8880] whitespace-nowrap">
                                                    {format(new Date(log.timestamp), 'MMM d, HH:mm:ss')}
                                                </td>
                                                <td className="px-6 py-3 text-sm font-medium text-[#1C1A17]">
                                                    {log.user?.name || log.userId || 'Unknown'}
                                                </td>
                                                <td className="px-6 py-3">
                                                    <span className={cn("px-2 py-0.5 rounded text-xs font-mono border",
                                                        log.action.includes('DELETE') ? "bg-red-50 text-red-600 border-red-100" :
                                                            log.action.includes('CREATE') ? "bg-green-50 text-green-600 border-green-100" :
                                                                "bg-[#F3F1EC] text-[#5C5850] border-[#E5E2DB]"
                                                    )}>
                                                        {log.action}
                                                    </span>
                                                    {log.entityType && <span className="ml-2 text-xs text-[#8C8880]">{log.entityType}</span>}
                                                </td>
                                                <td className="px-6 py-4 text-sm text-[#5C5850] max-w-xs break-all">
                                                    {formatAuditDetails(log)}
                                                </td>
                                            </tr>
                                        )) : (
                                            <tr>
                                                <td colSpan={4} className="px-6 py-12 text-center text-[#8C8880]">
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
                            <div className="bg-[#ffffff] rounded-xl border border-[#E5E2DB] p-6">
                                <div className="mb-6">
                                    <h3 className="text-lg font-bold text-[#1C1A17] flex items-center gap-2">
                                        <Clock className="w-5 h-5 text-[#0D9488]" />
                                        Timestamp Decoder
                                    </h3>
                                    <p className="text-sm text-[#8C8880] mt-1">
                                        Enter a Claim Number (e.g., AA...) or DCN to decode its exact creation timestamp.
                                    </p>
                                </div>

                                <form onSubmit={handleLookup} className="flex gap-2 mb-6">
                                    <input
                                        type="text"
                                        value={lookupQuery}
                                        onChange={(e) => setLookupQuery(e.target.value)}
                                        placeholder="Enter Claim # or DCN..."
                                        className="flex-1 px-4 py-2 border border-[#E5E2DB] bg-[#ffffff] text-[#1C1A17] placeholder-[#8C8880] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#0D9488]/30 focus:border-[#0D9488] transition-colors"
                                    />
                                    <button
                                        type="submit"
                                        disabled={isLookingUp || !lookupQuery.trim()}
                                        className="px-4 py-2 bg-[#0D9488] text-[#ffffff] rounded-lg hover:bg-[#0F766E] disabled:opacity-50 disabled:cursor-not-allowed font-medium flex items-center gap-2 transition-colors"
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
                                            ? "bg-green-50 border-green-200"
                                            : "bg-red-50 border-red-200"
                                    )}>
                                        {lookupResult.success ? (
                                            <div className="space-y-3">
                                                <div className="flex items-center justify-between">
                                                    <span className="text-sm font-medium text-[#8C8880]">Type</span>
                                                    <span className="text-sm font-bold text-[#1C1A17] uppercase">
                                                        {lookupResult.type.replace('_', ' ')}
                                                    </span>
                                                </div>
                                                <div className="flex items-center justify-between">
                                                    <span className="text-sm font-medium text-[#8C8880]">Creation Time</span>
                                                    <span className="text-sm font-bold text-[#0D9488]">
                                                        {lookupResult.localTime}
                                                    </span>
                                                </div>
                                                {lookupResult.details && (
                                                    <div className="pt-3 border-t border-[#E5E2DB]">
                                                        <p className="text-xs font-medium text-[#8C8880] mb-2">Details:</p>
                                                        <div className="grid grid-cols-2 gap-2 text-xs">
                                                            {Object.entries(lookupResult.details).map(([k, v]) => (
                                                                <div key={k}>
                                                                    <span className="text-[#8C8880] capitalize">{k}: </span>
                                                                    <span className="font-mono text-[#5C5850]">{String(v)}</span>
                                                                </div>
                                                            ))}
                                                        </div>
                                                    </div>
                                                )}
                                            </div>
                                        ) : (
                                            <div className="flex items-start gap-3 text-red-700">
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
                            <div className="bg-[#ffffff] rounded-xl border border-[#E5E2DB] p-6">
                                <div className="mb-6 flex items-center justify-between">
                                    <div>
                                        <h3 className="text-lg font-bold text-[#1C1A17] flex items-center gap-2">
                                            <Activity className="w-5 h-5 text-green-600" />
                                            System Health
                                        </h3>
                                        <p className="text-sm text-[#8C8880] mt-1">
                                            Monitor database connectivity and system status.
                                        </p>
                                    </div>
                                    <button
                                        onClick={handleHealthCheck}
                                        disabled={isHealthLoading}
                                        className="p-2 text-[#8C8880] hover:text-green-600 hover:bg-green-50 rounded-lg transition-colors"
                                    >
                                        <Activity className={cn("w-5 h-5", isHealthLoading && "animate-spin")} />
                                    </button>
                                </div>

                                {healthData ? (
                                    <div className="space-y-4">
                                        <div className="grid grid-cols-2 gap-4">
                                            <div className="p-3 bg-[#F8F7F5] rounded-lg border border-[#E5E2DB]">
                                                <div className="text-xs text-[#8C8880] uppercase font-medium mb-1">Status</div>
                                                <div className={cn(
                                                    "font-bold",
                                                    healthData.status === 'healthy' ? "text-green-600" : "text-red-600"
                                                )}>
                                                    {healthData.status.toUpperCase()}
                                                </div>
                                            </div>
                                            <div className="p-3 bg-[#F8F7F5] rounded-lg border border-[#E5E2DB]">
                                                <div className="text-xs text-[#8C8880] uppercase font-medium mb-1">DB Latency</div>
                                                <div className="font-mono text-[#1C1A17]">
                                                    {healthData.database?.latency || 'N/A'}
                                                </div>
                                            </div>
                                            <div className="p-3 bg-[#F8F7F5] rounded-lg border border-[#E5E2DB]">
                                                <div className="text-xs text-[#8C8880] uppercase font-medium mb-1">Uptime</div>
                                                <div className="font-mono text-[#1C1A17]">
                                                    {(healthData.system?.uptime / 3600).toFixed(2)}h
                                                </div>
                                            </div>
                                            <div className="p-3 bg-[#F8F7F5] rounded-lg border border-[#E5E2DB]">
                                                <div className="text-xs text-[#8C8880] uppercase font-medium mb-1">Memory</div>
                                                <div className="font-mono text-[#1C1A17]">
                                                    {healthData.system?.memory?.rss || 'N/A'}
                                                </div>
                                            </div>
                                        </div>
                                        <div className="text-xs text-[#8C8880] text-center pt-2 border-t border-[#E5E2DB]">
                                            Last checked: {new Date(healthData.timestamp).toLocaleTimeString()}
                                        </div>
                                    </div>
                                ) : (
                                    <div className="text-center py-8 text-[#8C8880]">
                                        Click icon to run system check
                                    </div>
                                )}
                            </div>

                            {/* Encryption Tool Widget */}
                            <div className="bg-[#ffffff] rounded-xl border border-[#E5E2DB] p-6 md:col-span-2">
                                <div className="mb-6">
                                    <h3 className="text-lg font-bold text-[#1C1A17] flex items-center gap-2">
                                        <Lock className="w-5 h-5 text-[#0D9488]" />
                                        Encryption Helper
                                    </h3>
                                    <p className="text-sm text-[#8C8880] mt-1">
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
                                                className="w-full px-4 py-2 border border-[#E5E2DB] bg-[#ffffff] text-[#1C1A17] placeholder-[#8C8880] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#0D9488]/30 focus:border-[#0D9488] transition-colors"
                                            />
                                        </div>
                                        <div className="flex bg-[#F8F7F5] border border-[#E5E2DB] rounded-lg p-1">
                                            <button
                                                type="button"
                                                onClick={() => setCryptoMode('encrypt')}
                                                className={cn(
                                                    "px-3 py-1.5 text-sm font-medium rounded-md transition-all",
                                                    cryptoMode === 'encrypt'
                                                        ? "bg-[#ffffff] shadow-sm text-[#0D9488]"
                                                        : "text-[#5C5850] hover:text-[#1C1A17]"
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
                                                        ? "bg-[#ffffff] shadow-sm text-[#0D9488]"
                                                        : "text-[#5C5850] hover:text-[#1C1A17]"
                                                )}
                                            >
                                                Decrypt
                                            </button>
                                        </div>
                                        <button
                                            type="submit"
                                            disabled={isCryptoLoading || !cryptoInput.trim()}
                                            className="px-6 py-2 bg-[#0D9488] text-[#ffffff] rounded-lg hover:bg-[#0F766E] disabled:opacity-50 font-medium transition-colors"
                                        >
                                            {isCryptoLoading ? 'Processing...' : 'Process'}
                                        </button>
                                    </div>

                                    {cryptoOutput && (
                                        <div className="mt-4 p-4 bg-[#F8F7F5] rounded-lg font-mono text-sm break-all text-[#1C1A17] border border-[#E5E2DB]">
                                            {cryptoOutput}
                                        </div>
                                    )}
                                </form>
                            </div>

                            {/* Data Retention Widget */}
                            <div className="bg-[#ffffff] rounded-xl border border-red-200 p-6 md:col-span-2">
                                <div className="flex items-start justify-between">
                                    <div>
                                        <h3 className="text-lg font-bold text-[#1C1A17] flex items-center gap-2">
                                            <Trash2 className="w-5 h-5 text-red-600" />
                                            Data Retention Policy
                                        </h3>
                                        <p className="text-sm text-[#8C8880] mt-1">
                                            Manage automated data cleanup tasks.
                                        </p>
                                    </div>
                                    <span className="bg-red-50 text-red-700 text-xs font-bold px-2 py-1 rounded border border-red-100">
                                        ADMIN ONLY
                                    </span>
                                </div>

                                <div className="mt-6 p-4 bg-[#F8F7F5] rounded-lg border border-[#E5E2DB]">
                                    <div className="flex items-center justify-between">
                                        <div>
                                            <h4 className="font-semibold text-[#1C1A17]">5-Year Message Retention</h4>
                                            <p className="text-sm text-[#8C8880] mt-1 max-w-xl">
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
        </div>

    );
}

// Missing Components Stubs
// Chart Helpers
const COLORS = ['#0D9488', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899'];

function UrgencyHeatmap({ data, isLoading }: { data: any; isLoading?: boolean }) {
    if (isLoading) return <div className="p-4 bg-[#F3F1EC] rounded animate-pulse h-64" />;
    if (!data || data.length === 0) return <div className="p-4 text-[#8C8880] text-center bg-[#F8F7F5] rounded h-64 flex items-center justify-center">No data available</div>;

    return (
        <div className="h-64 w-full bg-[#F8F7F5] rounded-xl p-2 border border-[#E5E2DB]">
            <ResponsiveContainer width="100%" height="100%">
                <RechartsBarChart data={data}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#E5E2DB" opacity={0.6} />
                    <XAxis
                        dataKey="range"
                        stroke="#8C8880"
                        fontSize={12}
                        tickLine={false}
                        axisLine={false}
                    />
                    <YAxis stroke="#8C8880" fontSize={12} tickLine={false} axisLine={false} allowDecimals={false} />
                    <Tooltip
                        contentStyle={{ backgroundColor: '#ffffff', borderColor: '#E5E2DB', color: '#1C1A17', borderRadius: '0.5rem' }}
                        itemStyle={{ color: '#1C1A17' }}
                        cursor={{ fill: 'rgba(13,148,136,0.05)' }}
                    />
                    <Bar dataKey="count" name="Urgent Cases" fill="#0D9488" radius={[4, 4, 0, 0]} />
                </RechartsBarChart>
            </ResponsiveContainer>
        </div>
    );
}

function ProgramDistribution({ data, isLoading }: { data: any; isLoading?: boolean }) {
    if (isLoading) return <div className="p-4 bg-[#F3F1EC] rounded animate-pulse h-64" />;
    if (!data || data.length === 0) return <div className="p-4 text-[#8C8880] text-center bg-[#F8F7F5] rounded h-64 flex items-center justify-center">No data available</div>;

    return (
        <div className="h-64 w-full bg-[#F8F7F5] rounded-xl p-2 border border-[#E5E2DB]">
            <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                    <Pie
                        data={data}
                        cx="50%"
                        cy="50%"
                        innerRadius={60}
                        outerRadius={80}
                        fill="#0D9488"
                        paddingAngle={5}
                        dataKey="value"
                    >
                        {data.map((entry: any, index: number) => (
                            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                        ))}
                    </Pie>
                    <Tooltip
                        contentStyle={{ backgroundColor: '#ffffff', borderColor: '#E5E2DB', color: '#1C1A17', borderRadius: '0.5rem' }}
                        itemStyle={{ color: '#1C1A17' }}
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
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
            <div className="bg-[#ffffff] border border-[#E5E2DB] p-6 rounded-xl shadow-[0_8px_40px_rgba(28,26,23,0.18)] max-w-md w-full">
                <h2 className="text-xl font-bold mb-4 text-[#1C1A17]">Add Inventory</h2>
                <p className="text-[#8C8880] mb-4">Inventory form goes here.</p>
                <div className="flex justify-end gap-2">
                    <button onClick={onClose} className="px-4 py-2 bg-[#F8F7F5] hover:bg-[#F3F1EC] border border-[#E5E2DB] rounded-lg text-sm font-medium text-[#5C5850] transition-colors">Close</button>
                    <button onClick={() => { onSuccess(); onClose(); }} className="px-4 py-2 bg-[#0D9488] text-[#ffffff] rounded-lg hover:bg-[#0F766E] text-sm font-medium transition-colors shadow-sm">Save (Stub)</button>
                </div>
            </div>
        </div>
    );
}

export default function AdminDashboard() {
    return (
        <Suspense fallback={<div className="flex items-center justify-center min-h-screen bg-[#F8F7F5]"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#0D9488]"></div></div>}>
            <AdminDashboardContent />
        </Suspense>
    );
}
