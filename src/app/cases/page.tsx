'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import {
    Search, Plus, Filter, Loader2, ChevronRight,
    User, Calendar, ChevronDown, X, ArrowUpDown
} from 'lucide-react';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';
import { Sidebar } from '@/components/Sidebar';
import { SortableHeader } from '@/components/SortableHeader';
import {
    DndContext,
    closestCenter,
    KeyboardSensor,
    PointerSensor,
    useSensor,
    useSensors,
    DragEndEvent
} from '@dnd-kit/core';
import {
    arrayMove,
    SortableContext,
    sortableKeyboardCoordinates,
    horizontalListSortingStrategy,
} from '@dnd-kit/sortable';

export default function CasesPage() {
    const router = useRouter();
    const [loading, setLoading] = useState(true);
    const [cases, setCases] = useState<any[]>([]);
    const [filteredCases, setFilteredCases] = useState<any[]>([]);

    const [sidebarCollapsed, setSidebarCollapsed] = useState(true);

    // Sidebar State
    const [currentUser, setCurrentUser] = useState<any>(null);
    const [unreadCount, setUnreadCount] = useState(0);

    // Filter State
    const [filterOpen, setFilterOpen] = useState(false); // Collapsible filter bar
    const [users, setUsers] = useState<any[]>([]);
    const [clients, setClients] = useState<any[]>([]);
    const [filters, setFilters] = useState({
        assignedTo: '',
        clientId: '',
        openedStart: '',
        openedEnd: '',
        closedStart: '',
        closedEnd: '',
        program: ''
    });

    // Column Filters
    const [columnFilters, setColumnFilters] = useState<Record<string, string>>({});

    // Debounce search
    const [searchTerm, setSearchTerm] = useState('');
    const [debouncedSearch, setDebouncedSearch] = useState(searchTerm);
    const [statusFilter, setStatusFilter] = useState('ALL');

    // Columns DnD
    const [columns, setColumns] = useState([
        { id: 'caseNumber', label: 'Case Number', sortable: true, width: 150 },
        { id: 'clientName', label: 'Claimant', sortable: true, width: 180 },
        { id: 'status', label: 'Status', sortable: true, width: 120 },
        { id: 'program', label: 'Program', sortable: true, width: 150 },
        { id: 'createdAt', label: 'Created', sortable: true, width: 120 },
        { id: 'assignedTo', label: 'Assigned To', sortable: true, width: 180 },
    ]);
    const [initialColumns, setInitialColumns] = useState(columns);

    const sensors = useSensors(
        useSensor(PointerSensor),
        useSensor(KeyboardSensor, {
            coordinateGetter: sortableKeyboardCoordinates,
        })
    );

    useEffect(() => {
        const timer = setTimeout(() => setDebouncedSearch(searchTerm), 500);
        return () => clearTimeout(timer);
    }, [searchTerm]);

    // Metadata Fetching
    useEffect(() => {
        const fetchMetadata = async () => {
            try {
                const [uRes, cRes] = await Promise.all([
                    fetch('/api/users?role=COORDINATOR'),
                    fetch('/api/clients')
                ]);
                if (uRes.ok) setUsers(await uRes.json());
                if (cRes.ok) setClients(await cRes.json());
            } catch (e) { console.error('Metadata load error', e); }
        };
        fetchMetadata();
    }, []);

    // Main Data Load
    useEffect(() => {
        const loadData = async () => {
            setLoading(true);
            try {
                // Fetch User
                const userRes = await fetch('/api/auth/me');
                if (userRes.ok) {
                    const userData = await userRes.json();
                    setCurrentUser(userData.user);

                    // Load Column Preferences if they exist
                    if (userData.user?.preferences?.caseDashboardColumns) {
                        setColumns(userData.user.preferences.caseDashboardColumns);
                        setInitialColumns(userData.user.preferences.caseDashboardColumns);
                    }
                }

                // Fetch Unread
                const unreadRes = await fetch('/api/messages/unread-count');
                if (unreadRes.ok) {
                    const { count } = await unreadRes.json();
                    setUnreadCount(count);
                }

                // Fetch Cases
                const params = new URLSearchParams();
                if (debouncedSearch) params.append('search', debouncedSearch);
                if (statusFilter !== 'ALL') params.append('status', statusFilter);
                if (filters.assignedTo) params.append('assignedTo', filters.assignedTo);
                if (filters.clientId) params.append('clientId', filters.clientId);
                if (filters.program) params.append('program', filters.program);
                if (filters.openedStart) params.append('openedStart', filters.openedStart);
                if (filters.openedEnd) params.append('openedEnd', filters.openedEnd);
                if (filters.closedStart) params.append('closedStart', filters.closedStart);
                if (filters.closedEnd) params.append('closedEnd', filters.closedEnd);

                const res = await fetch(`/api/cases?${params.toString()}`);
                if (res.ok) {
                    const data = await res.json();
                    setCases(data);
                }
            } catch (error) {
                console.error('Failed to fetch data', error);
            } finally {
                setLoading(false);
            }
        };

        loadData();
    }, [debouncedSearch, statusFilter, filters]);

    // Client-side Filtering (Column Filters)
    useEffect(() => {
        let result = [...cases];

        Object.entries(columnFilters).forEach(([colId, filterVal]) => {
            if (!filterVal) return;
            const q = filterVal.toLowerCase();
            result = result.filter(c => {
                switch (colId) {
                    case 'caseNumber': return c.caseNumber?.toLowerCase().includes(q);
                    case 'clientName': return c.clientName?.toLowerCase().includes(q);
                    case 'status': return c.status?.toLowerCase().includes(q);
                    case 'program': return c.program?.toLowerCase().includes(q);
                    case 'createdAt': return format(new Date(c.createdAt), 'yyyy-MM-dd').includes(q);
                    case 'assignedTo': return getActiveAssignee(c)?.toLowerCase().includes(q);
                    default: return true;
                }
            });
        });

        setFilteredCases(result);
    }, [cases, columnFilters]);


    const getActiveAssignee = (c: any) => {
        const activeTask = c.tasks?.find((t: any) => t.status !== 'COMPLETED' && t.status !== 'CANCELLED') || c.tasks?.[0];
        return activeTask?.assignedTo?.name || 'Unassigned';
    };

    // Drag and Drop
    const handleDragEnd = (event: DragEndEvent) => {
        const { active, over } = event;
        if (active.id !== over?.id) {
            setColumns((items) => {
                const oldIndex = items.findIndex((item) => item.id === active.id);
                const newIndex = items.findIndex((item) => item.id === over?.id);
                return arrayMove(items, oldIndex, newIndex);
            });
        }
    };

    const handleResize = (colId: string, newWidth: number) => {
        setColumns(prev => prev.map(col =>
            col.id === colId ? { ...col, width: newWidth } : col
        ));
    };

    const handleSaveColumnPreferences = async () => {
        if (!currentUser) return;
        try {
            const preferences = { caseDashboardColumns: columns };
            const res = await fetch(`/api/users/${currentUser.id}/preferences`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ preferences })
            });

            if (res.ok) {
                setInitialColumns(columns);
                alert('Column preferences saved');
            }
        } catch (error) {
            console.error('Failed to save preferences', error);
        }
    };

    const statusColors: Record<string, string> = {
        OPEN: 'bg-emerald-100 text-emerald-800 border-emerald-200 dark:bg-emerald-900/30 dark:text-emerald-400 dark:border-emerald-800',
        IN_PROGRESS: 'bg-blue-100 text-blue-800 border-blue-200 dark:bg-blue-900/30 dark:text-blue-400 dark:border-blue-800',
        PENDING_REVIEW: 'bg-purple-100 text-purple-800 border-purple-200 dark:bg-purple-900/30 dark:text-purple-400 dark:border-purple-800',
        CLOSED: 'bg-gray-100 text-gray-800 border-gray-200 dark:bg-gray-800 dark:text-gray-400 dark:border-gray-700',
        APPEAL: 'bg-orange-100 text-orange-800 border-orange-200 dark:bg-orange-900/30 dark:text-orange-400 dark:border-orange-800',
    };

    const hasColumnChanges = JSON.stringify(columns) !== JSON.stringify(initialColumns);
    const hasActiveFilters = [
        ...Object.values(filters),
        ...Object.values(columnFilters),
        searchTerm,
        statusFilter !== 'ALL' ? statusFilter : ''
    ].some(Boolean);

    if (loading && !currentUser) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-950">
                <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
            </div>
        );
    }



    return (
        <div className="flex min-h-screen bg-gray-50 dark:bg-gray-950">
            {currentUser && <Sidebar user={currentUser} unreadCount={unreadCount} onToggle={setSidebarCollapsed} />}

            <div className={`flex-1 flex flex-col transition-all duration-300 ${sidebarCollapsed ? 'ml-16' : 'ml-64'}`}>

                {/* Header */}
                <header className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 sticky top-0 z-20">
                    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                        <div className="flex items-center justify-between h-16">
                            <div className="flex items-center gap-4">
                                <h1 className="text-xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
                                    <Search className="w-6 h-6 text-blue-600" />
                                    Case Management
                                </h1>
                            </div>
                            <button
                                onClick={() => router.push('/cases/new')}
                                className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-1.5 rounded-lg text-sm font-medium transition-colors shadow-sm"
                            >
                                <Plus className="w-4 h-4" />
                                New Case
                            </button>
                        </div>
                    </div>
                </header>

                <div className="max-w-full mx-auto px-4 sm:px-6 lg:px-8 py-6 w-full">

                    {/* Collapsible Filter Section */}
                    <div className="bg-gray-100 dark:bg-gray-800 rounded-t-xl border border-gray-200 dark:border-gray-700 mb-0">
                        <div
                            className="bg-gray-200/50 dark:bg-gray-700/50 px-4 py-3 flex items-center justify-between cursor-pointer rounded-t-xl"
                            onClick={() => setFilterOpen(!filterOpen)}
                        >
                            <h2 className="text-gray-700 dark:text-gray-200 text-lg font-medium">Search & Filters</h2>
                            <ChevronDown className={cn("text-gray-500 w-5 h-5 transition-transform", filterOpen ? "rotate-180" : "")} />
                        </div>

                        {filterOpen && (
                            <div className="p-6 pt-2 transition-all animate-in fade-in slide-in-from-top-2">
                                <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
                                    <div className="space-y-1">
                                        <label className="text-xs font-semibold text-gray-500 uppercase">Search</label>
                                        <input
                                            type="text"
                                            placeholder="Name, Case #..."
                                            className="w-full px-3 py-1.5 border border-gray-300 dark:border-gray-600 rounded text-sm bg-white dark:bg-gray-700"
                                            value={searchTerm}
                                            onChange={(e) => setSearchTerm(e.target.value)}
                                        />
                                    </div>
                                    <div className="space-y-1">
                                        <label className="text-xs font-semibold text-gray-500 uppercase">Status</label>
                                        <select
                                            value={statusFilter}
                                            onChange={(e) => setStatusFilter(e.target.value)}
                                            className="w-full px-3 py-1.5 border border-gray-300 dark:border-gray-600 rounded text-sm bg-white dark:bg-gray-700"
                                        >
                                            <option value="ALL">All Statuses</option>
                                            <option value="OPEN">Open</option>
                                            <option value="IN_PROGRESS">In Progress</option>
                                            <option value="PENDING_REVIEW">Pending Review</option>
                                            <option value="CLOSED">Closed</option>
                                        </select>
                                    </div>
                                    <div className="space-y-1">
                                        <label className="text-xs font-semibold text-gray-500 uppercase">Assigned To</label>
                                        <select
                                            value={filters.assignedTo}
                                            onChange={(e) => setFilters(prev => ({ ...prev, assignedTo: e.target.value }))}
                                            className="w-full px-3 py-1.5 border border-gray-300 dark:border-gray-600 rounded text-sm bg-white dark:bg-gray-700"
                                        >
                                            <option value="">Any User</option>
                                            {users.filter(u => u.name !== 'System').map(u => <option key={u.id} value={u.id}>{u.name}</option>)}
                                        </select>
                                    </div>
                                    <div className="space-y-1">
                                        <label className="text-xs font-semibold text-gray-500 uppercase">Client</label>
                                        <select
                                            value={filters.clientId}
                                            onChange={(e) => setFilters(prev => ({ ...prev, clientId: e.target.value }))}
                                            className="w-full px-3 py-1.5 border border-gray-300 dark:border-gray-600 rounded text-sm bg-white dark:bg-gray-700"
                                        >
                                            <option value="">Any Client</option>
                                            {clients.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                                        </select>
                                    </div>
                                    <div className="space-y-1">
                                        <label className="text-xs font-semibold text-gray-500 uppercase">Program</label>
                                        <input
                                            type="text"
                                            placeholder="e.g. Wellness"
                                            value={filters.program}
                                            onChange={(e) => setFilters(prev => ({ ...prev, program: e.target.value }))}
                                            className="w-full px-3 py-1.5 border border-gray-300 dark:border-gray-600 rounded text-sm bg-white dark:bg-gray-700"
                                        />
                                    </div>
                                    <div className="space-y-1">
                                        <label className="text-xs font-semibold text-gray-500 uppercase">Opened</label>
                                        <div className="flex gap-2">
                                            <input type="date" className="w-full px-2 py-1.5 text-sm border rounded bg-white dark:bg-gray-700" value={filters.openedStart} onChange={e => setFilters(p => ({ ...p, openedStart: e.target.value }))} />
                                            <input type="date" className="w-full px-2 py-1.5 text-sm border rounded bg-white dark:bg-gray-700" value={filters.openedEnd} onChange={e => setFilters(p => ({ ...p, openedEnd: e.target.value }))} />
                                        </div>
                                    </div>
                                </div>
                                <div className="flex justify-end border-t border-gray-200 dark:border-gray-700 pt-4">
                                    <button
                                        onClick={() => {
                                            setFilters({ assignedTo: '', clientId: '', openedStart: '', openedEnd: '', closedStart: '', closedEnd: '', program: '' });
                                            setSearchTerm('');
                                            setStatusFilter('ALL');
                                            setColumnFilters({});
                                        }}
                                        className="text-sm text-red-600 hover:text-red-700 font-medium px-4 py-1"
                                    >
                                        Reset Filters
                                    </button>
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Table Controls */}
                    <div className="bg-white dark:bg-gray-900 border-x border-b border-gray-200 dark:border-gray-700 p-2 flex items-center justify-between">
                        <div className="flex gap-2">
                            {/* Placeholder for future bulk actions */}
                        </div>
                        <div className="flex gap-2">
                            {hasColumnChanges && (
                                <button
                                    onClick={handleSaveColumnPreferences}
                                    className="px-3 py-1 bg-green-600 text-white text-xs font-medium rounded hover:bg-green-700 animate-in fade-in"
                                >
                                    Save View Layout
                                </button>
                            )}
                        </div>
                    </div>

                    {/* Sortable Table */}
                    <div className="border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 overflow-x-auto min-h-[400px]">
                        <DndContext
                            sensors={sensors}
                            collisionDetection={closestCenter}
                            onDragEnd={handleDragEnd}
                        >
                            <table className="w-full text-left border-collapse" style={{ tableLayout: 'fixed', minWidth: '1000px' }}>
                                <thead className="bg-gray-50 dark:bg-gray-800">
                                    <tr className="border-b border-gray-200 dark:border-gray-700">
                                        <SortableContext
                                            items={columns.map(c => c.id)}
                                            strategy={horizontalListSortingStrategy}
                                        >
                                            {columns.map((col) => (
                                                <SortableHeader
                                                    key={col.id}
                                                    id={col.id}
                                                    width={col.width}
                                                    onResize={(w) => handleResize(col.id, w)}
                                                    onFilter={(val) => setColumnFilters(prev => ({ ...prev, [col.id]: val }))}
                                                    filterValue={columnFilters[col.id]}
                                                >
                                                    {col.label}
                                                </SortableHeader>
                                            ))}
                                        </SortableContext>
                                        <th className="w-16 px-4 py-3 bg-gray-50 dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700"></th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                                    {loading ? (
                                        <tr>
                                            <td colSpan={columns.length + 1} className="h-64 text-center">
                                                <div className="flex justify-center"><Loader2 className="w-8 h-8 animate-spin text-blue-500" /></div>
                                            </td>
                                        </tr>
                                    ) : filteredCases.length === 0 ? (
                                        <tr>
                                            <td colSpan={columns.length + 1} className="h-64 text-center text-gray-500">
                                                No cases found matching criteria.
                                            </td>
                                        </tr>
                                    ) : (
                                        filteredCases.map((c) => (
                                            <tr
                                                key={c.id}
                                                onClick={() => router.push(`/cases/${c.id}`)}
                                                className="group hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors cursor-pointer"
                                            >
                                                {columns.map((col) => {
                                                    // Cell Rendering
                                                    let content: React.ReactNode = '';
                                                    switch (col.id) {
                                                        case 'caseNumber':
                                                            content = <span className="font-mono text-sm font-medium text-blue-600 dark:text-blue-400">{c.caseNumber}</span>;
                                                            break;
                                                        case 'clientName':
                                                            content = <span className="font-medium text-gray-900 dark:text-white">{c.clientName}</span>;
                                                            break;
                                                        case 'status':
                                                            content = <span className={cn(
                                                                "px-2.5 py-0.5 rounded-full text-xs font-medium border",
                                                                statusColors[c.status] || statusColors.CLOSED
                                                            )}>{c.status.replace('_', ' ')}</span>;
                                                            break;
                                                        case 'program':
                                                            content = <span className="text-sm text-gray-500">{c.program || '-'}</span>;
                                                            break;
                                                        case 'createdAt':
                                                            content = <div className="flex items-center gap-2 text-sm text-gray-500">
                                                                <Calendar className="w-3.5 h-3.5" />
                                                                {format(new Date(c.createdAt), 'MMM d, yyyy')}
                                                            </div>;
                                                            break;
                                                        case 'assignedTo':
                                                            content = <span className="text-sm text-gray-600 dark:text-gray-300 flex items-center gap-2">
                                                                <User className="w-3.5 h-3.5 text-gray-400" />
                                                                {getActiveAssignee(c)}
                                                            </span>;
                                                            break;
                                                        default:
                                                            content = null;
                                                    }

                                                    return (
                                                        <td key={col.id} className="px-4 py-3 align-middle overflow-hidden text-ellipsis whitespace-nowrap">
                                                            {content}
                                                        </td>
                                                    );
                                                })}
                                                <td className="px-4 py-3 text-right">
                                                    <ChevronRight className="w-5 h-5 text-gray-400 group-hover:text-blue-500 transition-colors inline-block" />
                                                </td>
                                            </tr>
                                        ))
                                    )}
                                </tbody>
                            </table>
                        </DndContext>
                    </div>

                    {/* Pagination - Simple for now */}
                    <div className="mt-4 flex items-center justify-between text-sm text-gray-500">
                        <div>Showing {filteredCases.length} cases</div>
                    </div>
                </div>
            </div>
        </div>
    );
}
