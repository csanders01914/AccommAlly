'use client';
import { apiFetch } from '@/lib/api-client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import {
    Plus, Loader2, ChevronRight,
    User, Calendar, ChevronDown,
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

// ── Status badges ──────────────────────────────────────────────────────────

const STATUS_STYLE: Record<string, string> = {
    OPEN:           'bg-emerald-50 text-emerald-800 border-emerald-200',
    IN_PROGRESS:    'bg-blue-50 text-blue-800 border-blue-200',
    PENDING_REVIEW: 'bg-purple-50 text-purple-800 border-purple-200',
    CLOSED:         'bg-[#F3F1EC] text-[#5C5850] border-[#E5E2DB]',
    APPEAL:         'bg-orange-50 text-orange-800 border-orange-200',
};

// ── Stat chip (dark-band variant) ──────────────────────────────────────────

function StatChip({ label, value, tone = 'neutral' }: {
    label: string; value: number; tone?: 'neutral' | 'danger' | 'accent';
}) {
    const dotColor = tone === 'danger' ? '#F87171' : tone === 'accent' ? '#0D9488' : 'rgba(255,255,255,0.55)';
    const valueColor = tone === 'danger' ? '#FCA5A5' : '#F0EEE8';
    return (
        <div className="inline-flex items-baseline gap-2 px-3 py-1.5 rounded-full border border-white/[0.12] bg-white/[0.04]">
            <span className="w-1.5 h-1.5 rounded-full self-center flex-shrink-0" style={{ background: dotColor }} />
            <span className="text-sm font-semibold tabular-nums" style={{ color: valueColor }}>{value}</span>
            <span className="text-[11px] font-medium" style={{ color: 'rgba(240,238,232,0.55)' }}>{label}</span>
        </div>
    );
}

// ── Page ───────────────────────────────────────────────────────────────────

export default function CasesPage() {
    const router = useRouter();
    const [loading, setLoading] = useState(true);
    const [cases, setCases] = useState<any[]>([]);
    const [filteredCases, setFilteredCases] = useState<any[]>([]);
    const [sidebarCollapsed, setSidebarCollapsed] = useState(true);
    const [currentUser, setCurrentUser] = useState<any>(null);
    const [unreadCount, setUnreadCount] = useState(0);
    const [filterOpen, setFilterOpen] = useState(false);
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
    const [columnFilters, setColumnFilters] = useState<Record<string, string>>({});
    const [searchTerm, setSearchTerm] = useState('');
    const [debouncedSearch, setDebouncedSearch] = useState(searchTerm);
    const [statusFilter, setStatusFilter] = useState('ALL');
    const [columns, setColumns] = useState([
        { id: 'caseNumber', label: 'Case Number', sortable: true, width: 160 },
        { id: 'clientName', label: 'Claimant',    sortable: true, width: 180 },
        { id: 'status',     label: 'Status',      sortable: true, width: 130 },
        { id: 'program',    label: 'Program',     sortable: true, width: 150 },
        { id: 'createdAt',  label: 'Created',     sortable: true, width: 130 },
        { id: 'assignedTo', label: 'Assigned To', sortable: true, width: 180 },
    ]);
    const [initialColumns, setInitialColumns] = useState(columns);
    const [isUserLoaded, setIsUserLoaded] = useState(false);

    const sensors = useSensors(
        useSensor(PointerSensor),
        useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
    );

    useEffect(() => {
        const t = setTimeout(() => setDebouncedSearch(searchTerm), 500);
        return () => clearTimeout(t);
    }, [searchTerm]);

    useEffect(() => {
        const load = async () => {
            try {
                const [uRes, cRes] = await Promise.all([
                    apiFetch('/api/users?role=COORDINATOR'),
                    apiFetch('/api/clients'),
                ]);
                if (uRes.ok) setUsers(await uRes.json());
                if (cRes.ok) setClients(await cRes.json());
            } catch { /* ignore */ }
        };
        load();
    }, []);

    useEffect(() => {
        const fetchUser = async () => {
            try {
                const res = await apiFetch('/api/auth/me');
                if (res.ok) {
                    const { user } = await res.json();
                    setCurrentUser(user);
                    if (user?.preferences?.caseDashboardColumns) {
                        setColumns(user.preferences.caseDashboardColumns);
                        setInitialColumns(user.preferences.caseDashboardColumns);
                    }
                    setFilters(prev => ({ ...prev, assignedTo: user.id }));
                }
            } catch { /* ignore */ }
            finally { setIsUserLoaded(true); }
        };
        const fetchUnread = async () => {
            try {
                const res = await apiFetch('/api/messages/unread-count');
                if (res.ok) setUnreadCount((await res.json()).count);
            } catch { /* ignore */ }
        };
        fetchUser();
        fetchUnread();
    }, []);

    useEffect(() => {
        if (!isUserLoaded) return;
        const load = async () => {
            setLoading(true);
            try {
                const p = new URLSearchParams();
                if (debouncedSearch)       p.append('search', debouncedSearch);
                if (statusFilter !== 'ALL') p.append('status', statusFilter);
                if (filters.assignedTo)    p.append('assignedTo', filters.assignedTo);
                if (filters.clientId)      p.append('clientId', filters.clientId);
                if (filters.program)       p.append('program', filters.program);
                if (filters.openedStart)   p.append('openedStart', filters.openedStart);
                if (filters.openedEnd)     p.append('openedEnd', filters.openedEnd);
                if (filters.closedStart)   p.append('closedStart', filters.closedStart);
                if (filters.closedEnd)     p.append('closedEnd', filters.closedEnd);
                const res = await fetch(`/api/cases?${p.toString()}`);
                if (res.ok) setCases((await res.json()).data);
            } catch { /* ignore */ }
            finally { setLoading(false); }
        };
        load();
    }, [debouncedSearch, statusFilter, filters, isUserLoaded]);

    useEffect(() => {
        let result = [...cases];
        Object.entries(columnFilters).forEach(([colId, val]) => {
            if (!val) return;
            const q = val.toLowerCase();
            result = result.filter(c => {
                switch (colId) {
                    case 'caseNumber': return c.caseNumber?.toLowerCase().includes(q);
                    case 'clientName': return c.clientName?.toLowerCase().includes(q);
                    case 'status':     return c.status?.toLowerCase().includes(q);
                    case 'program':    return c.program?.toLowerCase().includes(q);
                    case 'createdAt':  return format(new Date(c.createdAt), 'yyyy-MM-dd').includes(q);
                    case 'assignedTo': return getActiveAssignee(c)?.toLowerCase().includes(q);
                    default: return true;
                }
            });
        });
        setFilteredCases(result);
    }, [cases, columnFilters]);

    const getActiveAssignee = (c: any) => {
        const t = c.tasks?.find((t: any) => t.status !== 'COMPLETED' && t.status !== 'CANCELLED') || c.tasks?.[0];
        return t?.assignedTo?.name || 'Unassigned';
    };

    const handleDragEnd = (event: DragEndEvent) => {
        const { active, over } = event;
        if (active.id !== over?.id) {
            setColumns(items => {
                const oldIdx = items.findIndex(i => i.id === active.id);
                const newIdx = items.findIndex(i => i.id === over?.id);
                return arrayMove(items, oldIdx, newIdx);
            });
        }
    };

    const handleResize = (colId: string, newWidth: number) => {
        setColumns(prev => prev.map(col => col.id === colId ? { ...col, width: newWidth } : col));
    };

    const handleSaveColumnPreferences = async () => {
        if (!currentUser) return;
        try {
            const res = await fetch(`/api/users/${currentUser.id}/preferences`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ preferences: { caseDashboardColumns: columns } }),
            });
            if (res.ok) {
                setInitialColumns(columns);
                alert('Column preferences saved');
            }
        } catch { /* ignore */ }
    };

    const resetFilters = () => {
        setFilters({ assignedTo: '', clientId: '', openedStart: '', openedEnd: '', closedStart: '', closedEnd: '', program: '' });
        setSearchTerm('');
        setStatusFilter('ALL');
        setColumnFilters({});
    };

    const hasColumnChanges = JSON.stringify(columns) !== JSON.stringify(initialColumns);
    const hasActiveFilters = [
        ...Object.values(filters),
        ...Object.values(columnFilters),
        searchTerm,
        statusFilter !== 'ALL' ? statusFilter : '',
    ].some(Boolean);

    const stats = {
        open:    filteredCases.filter(c => c.status === 'OPEN').length,
        active:  filteredCases.filter(c => c.status === 'IN_PROGRESS').length,
        pending: filteredCases.filter(c => c.status === 'PENDING_REVIEW').length,
    };

    // ── Shared input class ─────────────────────────────────────────────────
    const inputCls = 'w-full px-3 py-2 text-sm border border-[#E5E2DB] rounded-lg bg-[#ffffff] text-[#1C1A17] placeholder-[#8C8880] focus:outline-none focus:ring-2 focus:ring-[#0D9488]/30 focus:border-[#0D9488] transition-colors';

    if (loading && !currentUser) {
        return (
            <div className="min-h-screen bg-[#F8F7F5] flex items-center justify-center">
                <Loader2 className="w-8 h-8 animate-spin text-[#0D9488]" />
            </div>
        );
    }

    return (
        <div className="flex h-screen overflow-hidden bg-[#1C1A17]">
            {currentUser && (
                <Sidebar user={currentUser} unreadCount={unreadCount} onToggle={setSidebarCollapsed} />
            )}

            <div
                className="flex-1 h-full overflow-y-auto transition-all duration-300"
                style={{ marginLeft: sidebarCollapsed ? 64 : 256 }}
            >
                {/* ── Editorial band ── */}
                <section
                    className="relative overflow-hidden"
                    style={{ background: '#1C1A17', color: '#F0EEE8', padding: '40px 48px 32px' }}
                >
                    {/* Radial teal glows */}
                    <div
                        aria-hidden
                        style={{
                            position: 'absolute', inset: 0, pointerEvents: 'none',
                            backgroundImage: 'radial-gradient(ellipse at 15% 50%,rgba(13,148,136,0.16) 0%,transparent 55%),radial-gradient(ellipse at 90% 80%,rgba(13,148,136,0.08) 0%,transparent 50%)',
                        }}
                    />
                    {/* Hairline divider */}
                    <div
                        aria-hidden
                        style={{
                            position: 'absolute', bottom: 0, left: 0, right: 0, height: 1,
                            background: 'linear-gradient(to right,transparent,rgba(13,148,136,0.5),transparent)',
                        }}
                    />

                    <div className="relative z-10 max-w-[1440px] mx-auto flex items-end justify-between gap-8 flex-wrap">
                        <div style={{ flex: '1 1 420px', minWidth: 0 }}>
                            <p className="m-0 text-[11px] font-semibold uppercase tracking-[0.2em] text-[#0D9488]">
                                Case Management
                            </p>
                            <h1
                                className="my-3 tracking-[-0.01em]"
                                style={{ fontFamily: 'var(--font-instrument-serif, Georgia, serif)', fontSize: 52, fontWeight: 400, lineHeight: 1.1, color: '#F0EEE8' }}
                            >
                                Your Cases.
                            </h1>
                            <p className="m-0 text-base" style={{ color: 'rgba(240,238,232,0.55)', lineHeight: 1.55 }}>
                                {loading
                                    ? 'Loading cases…'
                                    : `${filteredCases.length} case${filteredCases.length !== 1 ? 's' : ''} ${hasActiveFilters ? 'matching filters' : 'in your workspace'}.`
                                }
                            </p>
                        </div>

                        <div className="flex gap-2 flex-wrap items-center">
                            <StatChip label="Open"           value={stats.open}    tone={stats.open > 0 ? 'accent' : 'neutral'} />
                            <StatChip label="In Progress"    value={stats.active}  tone="neutral" />
                            <StatChip label="Pending Review" value={stats.pending} tone="neutral" />
                            <button
                                onClick={() => router.push('/cases/new')}
                                className="flex items-center gap-2 px-4 py-2 rounded-full text-sm font-semibold text-[#1C1A17] bg-[#0D9488] hover:bg-[#0F766E] transition-colors ml-2"
                            >
                                <Plus className="w-4 h-4" />
                                New Case
                            </button>
                        </div>
                    </div>
                </section>

                {/* ── Working surface ── */}
                <div className="px-12 py-8">
                    <div
                        className="max-w-[1440px] mx-auto bg-[#ffffff] border border-[#E5E2DB] rounded-xl shadow-[0_1px_2px_rgba(28,26,23,0.04)] overflow-hidden"
                    >
                        {/* ── Filter section ── */}
                        <div className="border-b border-[#E5E2DB]">
                            <button
                                className="w-full flex items-center justify-between px-6 py-4 hover:bg-[#F8F7F5] transition-colors text-left"
                                onClick={() => setFilterOpen(v => !v)}
                            >
                                <div className="flex items-center gap-2">
                                    <span className="text-sm font-semibold text-[#1C1A17]">Search & Filters</span>
                                    {hasActiveFilters && (
                                        <span className="text-[11px] font-semibold px-2 py-0.5 bg-[#0D9488] text-[#ffffff] rounded-full">Active</span>
                                    )}
                                </div>
                                <ChevronDown className={cn('w-4 h-4 text-[#8C8880] transition-transform', filterOpen && 'rotate-180')} />
                            </button>

                            {filterOpen && (
                                <div className="px-6 pb-6 pt-2 border-t border-[#F3F1EC]">
                                    <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-4 mb-4">
                                        <div className="space-y-1.5">
                                            <label className="text-[11px] font-semibold uppercase tracking-[0.1em] text-[#8C8880]">Search</label>
                                            <input
                                                type="text"
                                                placeholder="Name, case number…"
                                                className={inputCls}
                                                value={searchTerm}
                                                onChange={e => setSearchTerm(e.target.value)}
                                            />
                                        </div>
                                        <div className="space-y-1.5">
                                            <label className="text-[11px] font-semibold uppercase tracking-[0.1em] text-[#8C8880]">Status</label>
                                            <select
                                                value={statusFilter}
                                                onChange={e => setStatusFilter(e.target.value)}
                                                className={inputCls}
                                            >
                                                <option value="ALL">All Statuses</option>
                                                <option value="OPEN">Open</option>
                                                <option value="IN_PROGRESS">In Progress</option>
                                                <option value="PENDING_REVIEW">Pending Review</option>
                                                <option value="CLOSED">Closed</option>
                                            </select>
                                        </div>
                                        <div className="space-y-1.5">
                                            <label className="text-[11px] font-semibold uppercase tracking-[0.1em] text-[#8C8880]">Assigned To</label>
                                            <select
                                                value={filters.assignedTo}
                                                onChange={e => setFilters(p => ({ ...p, assignedTo: e.target.value }))}
                                                className={inputCls}
                                            >
                                                <option value="">Any User</option>
                                                {users.filter(u => u.name !== 'System').map(u => (
                                                    <option key={u.id} value={u.id}>{u.name}</option>
                                                ))}
                                            </select>
                                        </div>
                                        <div className="space-y-1.5">
                                            <label className="text-[11px] font-semibold uppercase tracking-[0.1em] text-[#8C8880]">Client</label>
                                            <select
                                                value={filters.clientId}
                                                onChange={e => setFilters(p => ({ ...p, clientId: e.target.value }))}
                                                className={inputCls}
                                            >
                                                <option value="">Any Client</option>
                                                {clients.map(c => (
                                                    <option key={c.id} value={c.id}>{c.name}</option>
                                                ))}
                                            </select>
                                        </div>
                                        <div className="space-y-1.5">
                                            <label className="text-[11px] font-semibold uppercase tracking-[0.1em] text-[#8C8880]">Program</label>
                                            <input
                                                type="text"
                                                placeholder="e.g. Wellness"
                                                value={filters.program}
                                                onChange={e => setFilters(p => ({ ...p, program: e.target.value }))}
                                                className={inputCls}
                                            />
                                        </div>
                                        <div className="space-y-1.5">
                                            <label className="text-[11px] font-semibold uppercase tracking-[0.1em] text-[#8C8880]">Opened (from)</label>
                                            <input
                                                type="date"
                                                className={inputCls}
                                                value={filters.openedStart}
                                                onChange={e => setFilters(p => ({ ...p, openedStart: e.target.value }))}
                                            />
                                        </div>
                                        <div className="space-y-1.5">
                                            <label className="text-[11px] font-semibold uppercase tracking-[0.1em] text-[#8C8880]">Opened (to)</label>
                                            <input
                                                type="date"
                                                className={inputCls}
                                                value={filters.openedEnd}
                                                onChange={e => setFilters(p => ({ ...p, openedEnd: e.target.value }))}
                                            />
                                        </div>
                                    </div>
                                    <div className="flex justify-end pt-3 border-t border-[#F3F1EC]">
                                        <button
                                            onClick={resetFilters}
                                            className="text-sm font-medium text-red-600 hover:text-red-700 px-3 py-1 rounded-lg hover:bg-red-50 transition-colors"
                                        >
                                            Reset Filters
                                        </button>
                                    </div>
                                </div>
                            )}
                        </div>

                        {/* ── Table toolbar ── */}
                        {hasColumnChanges && (
                            <div className="flex justify-end px-5 py-2.5 border-b border-[#F3F1EC] bg-[#F8F7F5]">
                                <button
                                    onClick={handleSaveColumnPreferences}
                                    className="px-3 py-1 bg-[#0D9488] hover:bg-[#0F766E] text-[#ffffff] text-xs font-semibold rounded-lg transition-colors"
                                >
                                    Save View Layout
                                </button>
                            </div>
                        )}

                        {/* ── Table ── */}
                        <div className="overflow-x-auto min-h-[400px]">
                            <DndContext
                                sensors={sensors}
                                collisionDetection={closestCenter}
                                onDragEnd={handleDragEnd}
                            >
                                <table
                                    className="w-full text-left border-collapse"
                                    style={{ tableLayout: 'fixed', minWidth: 1000 }}
                                >
                                    <thead className="bg-[#F8F7F5]">
                                        <tr className="border-b border-[#E5E2DB]">
                                            <SortableContext
                                                items={columns.map(c => c.id)}
                                                strategy={horizontalListSortingStrategy}
                                            >
                                                {columns.map(col => (
                                                    <SortableHeader
                                                        key={col.id}
                                                        id={col.id}
                                                        width={col.width}
                                                        onResize={w => handleResize(col.id, w)}
                                                        onFilter={val => setColumnFilters(prev => ({ ...prev, [col.id]: val }))}
                                                        filterValue={columnFilters[col.id]}
                                                    >
                                                        {col.label}
                                                    </SortableHeader>
                                                ))}
                                            </SortableContext>
                                            <th className="w-12 px-4 py-3 bg-[#F8F7F5]" />
                                        </tr>
                                    </thead>

                                    <tbody>
                                        {loading ? (
                                            <tr>
                                                <td colSpan={columns.length + 1} className="h-64 text-center">
                                                    <div className="flex justify-center">
                                                        <Loader2 className="w-7 h-7 animate-spin text-[#0D9488]" />
                                                    </div>
                                                </td>
                                            </tr>
                                        ) : filteredCases.length === 0 ? (
                                            <tr>
                                                <td colSpan={columns.length + 1} className="h-64 text-center text-[#8C8880] text-sm">
                                                    No cases found matching criteria.
                                                </td>
                                            </tr>
                                        ) : (
                                            filteredCases.map(c => (
                                                <tr
                                                    key={c.id}
                                                    onClick={() => router.push(`/cases/${c.id}`)}
                                                    className="group bg-[#ffffff] hover:bg-[#F8F7F5] border-b border-[#F3F1EC] last:border-b-0 cursor-pointer transition-colors"
                                                >
                                                    {columns.map(col => {
                                                        let content: React.ReactNode = null;
                                                        switch (col.id) {
                                                            case 'caseNumber':
                                                                content = (
                                                                    <code className="font-mono text-sm font-medium text-[#0D9488]">
                                                                        {c.caseNumber}
                                                                    </code>
                                                                );
                                                                break;
                                                            case 'clientName':
                                                                content = (
                                                                    <span className="text-sm font-medium text-[#1C1A17]">
                                                                        {c.clientName}
                                                                    </span>
                                                                );
                                                                break;
                                                            case 'status':
                                                                content = (
                                                                    <span className={cn(
                                                                        'px-2.5 py-0.5 rounded-full text-[11px] font-semibold border',
                                                                        STATUS_STYLE[c.status] ?? STATUS_STYLE.CLOSED
                                                                    )}>
                                                                        {c.status.replace(/_/g, ' ')}
                                                                    </span>
                                                                );
                                                                break;
                                                            case 'program':
                                                                content = (
                                                                    <span className="text-sm text-[#5C5850]">
                                                                        {c.program || '—'}
                                                                    </span>
                                                                );
                                                                break;
                                                            case 'createdAt':
                                                                content = (
                                                                    <div className="flex items-center gap-1.5 text-sm text-[#5C5850]">
                                                                        <Calendar className="w-3.5 h-3.5 text-[#8C8880]" />
                                                                        {format(new Date(c.createdAt), 'MMM d, yyyy')}
                                                                    </div>
                                                                );
                                                                break;
                                                            case 'assignedTo':
                                                                content = (
                                                                    <div className="flex items-center gap-1.5 text-sm text-[#5C5850]">
                                                                        <User className="w-3.5 h-3.5 text-[#8C8880]" />
                                                                        {getActiveAssignee(c)}
                                                                    </div>
                                                                );
                                                                break;
                                                        }
                                                        return (
                                                            <td
                                                                key={col.id}
                                                                className="px-4 py-3.5 align-middle overflow-hidden text-ellipsis whitespace-nowrap"
                                                            >
                                                                {content}
                                                            </td>
                                                        );
                                                    })}
                                                    <td className="px-4 py-3.5 text-right">
                                                        <ChevronRight className="w-4 h-4 text-[#C8C4BB] group-hover:text-[#0D9488] transition-colors inline-block" />
                                                    </td>
                                                </tr>
                                            ))
                                        )}
                                    </tbody>
                                </table>
                            </DndContext>
                        </div>

                        {/* ── Footer ── */}
                        <div className="flex items-center justify-between px-5 py-3 border-t border-[#E5E2DB] bg-[#F8F7F5]">
                            <p className="text-xs text-[#8C8880]">
                                Showing <span className="font-semibold text-[#1C1A17]">{filteredCases.length}</span> case{filteredCases.length !== 1 ? 's' : ''}
                                {hasActiveFilters && <span className="text-[#0D9488]"> (filtered)</span>}
                            </p>
                            {hasActiveFilters && (
                                <button
                                    onClick={resetFilters}
                                    className="text-xs font-medium text-[#0D9488] hover:text-[#0F766E] transition-colors"
                                >
                                    Clear filters
                                </button>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
