'use client';
import { apiFetch } from '@/lib/api-client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { format } from 'date-fns';
import {
 Loader2, Search, ArrowUpDown, ChevronDown, X, Edit2
} from 'lucide-react';
import { cn } from '@/lib/utils';
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
import { CSS } from '@dnd-kit/utilities';

interface Task {
 id: string;
 title: string;
 description: string | null;
 status: string;
 priority: string;
 category: string;
 dueDate: string;
 startTime?: string | null;
 endTime?: string | null;
 completedAt?: string | null;
 createdById: string;
 createdAt: string;
 case?: {
 id: string;
 caseNumber: string;
 clientName: string;
 };
 assignedTo?: {
 id: string;
 name: string;
 };
 createdBy?: {
 id: string;
 name: string;
 };
}

interface Client {
 id: string;
 name: string;
 code?: string;
}

interface User {
 id: string;
 name: string;
 email?: string;
 role: "ADMIN" | "AUDITOR" | "COORDINATOR"; // Role is required for Sidebar
 preferences?: {
 taskDashboardColumns?: any[];
 };
}



import { Sidebar } from '@/components/Sidebar';
import { TaskDetailModal } from '@/components/modals/TaskDetailModal';

// ... existing imports ...

export default function TasksDashboardPage() {
 const router = useRouter();
 const [loading, setLoading] = useState(true);
 const [tasks, setTasks] = useState<Task[]>([]);
 const [filteredTasks, setFilteredTasks] = useState<Task[]>([]);
 const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

 // Sidebar State
 const [currentUser, setCurrentUser] = useState<User | null>(null);
 const [unreadCount, setUnreadCount] = useState(0);
 const [users, setUsers] = useState<User[]>([]);

 // UX State
 const [selectedActionTaskId, setSelectedActionTaskId] = useState<string | null>(null);
 const [selectedTaskIds, setSelectedTaskIds] = useState<Set<string>>(new Set());

 // Filters...
 const [searchQuery, setSearchQuery] = useState('');
 const [showClosedTasks, setShowClosedTasks] = useState(false);
 const [reassignFrom, setReassignFrom] = useState('');
 const [reassignTo, setReassignTo] = useState('');
 const [showFilters, setShowFilters] = useState(true);
 const [activeFilters, setActiveFilters] = useState<string[]>([]);
 const [columnFilters, setColumnFilters] = useState<Record<string, string>>({});

 // Examiner Search State
 const [examinerSearch, setExaminerSearch] = useState('');
 const [showExaminerDropdown, setShowExaminerDropdown] = useState(false);

 // Client Search State
 const [clients, setClients] = useState<Client[]>([]);
 const [clientSearch, setClientSearch] = useState('');
 const [showClientDropdown, setShowClientDropdown] = useState(false);

 // Date Range State
 const [dateRange, setDateRange] = useState<{ start: string; end: string }>({
 start: '',
 end: format(new Date(), 'yyyy-MM-dd')
 });

 // Pagination State
 const [currentPage, setCurrentPage] = useState(1);
 const [itemsPerPage, setItemsPerPage] = useState(10);

 // Sort
 const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');

 // Modal states
 const [selectedTask, setSelectedTask] = useState<Task | null>(null);

 // Columns DnD
 const [columns, setColumns] = useState([
 { id: 'caseNumber', label: 'Claim Number', sortable: true, width: 150 },
 { id: 'lob', label: 'LOB', sortable: true, width: 80 },
 { id: 'dueDate', label: 'Due Date', sortable: true, width: 120 },
 { id: 'description', label: 'Task Description', sortable: true, width: 300 },
 { id: 'category', label: 'Task Type', sortable: true, width: 150 },
 { id: 'assignedTo', label: 'Assigned To', sortable: true, width: 150 },
 { id: 'createdBy', label: 'Created By', sortable: true, width: 150 },
 ]);
 const [initialColumns, setInitialColumns] = useState(columns);

 const sensors = useSensors(
 useSensor(PointerSensor),
 useSensor(KeyboardSensor, {
 coordinateGetter: sortableKeyboardCoordinates,
 })
 );

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
 const preferences = { taskDashboardColumns: columns };
 const res = await fetch(`/api/users/${currentUser.id}/preferences`, {
 method: 'PATCH',
 headers: { 'Content-Type': 'application/json' },
 body: JSON.stringify({ preferences })
 });

 if (res.ok) {
 setInitialColumns(columns); // Sync state to disable button
 alert('Column preferences saved');
 }
 } catch (error) {
 console.error('Failed to save preferences', error);
 }
 };

 const handleClearTableFilters = () => {
 setColumnFilters({});
 };

 // State checks for UI
 const hasColumnChanges = JSON.stringify(columns) !== JSON.stringify(initialColumns);
 const hasActiveFilters = Object.values(columnFilters).some(v => !!v);


 // Auth check
 useEffect(() => {
 const checkAuth = async () => {
 try {
 const res = await apiFetch('/api/auth/me'); // This route currently returns session with ID
 if (!res.ok) {
 router.push('/login');
 return;
 }
 const data = await res.json();

 // Fetch full user data for preferences
 if (data.user?.id) {
 try {
 const userRes = await fetch(`/api/users/${data.user.id}`);
 if (userRes.ok) {
 const userData = await userRes.json();
 setCurrentUser(userData);

 // Load Column Preferences
 if (userData.preferences?.taskDashboardColumns) {
 setColumns(userData.preferences.taskDashboardColumns);
 setInitialColumns(userData.preferences.taskDashboardColumns);
 }

 // Default Filter: Current User
 if (userData.name) {
 setActiveFilters([userData.name]);
 }
 } else {
 setCurrentUser(data.user);
 }
 } catch (e) {
 setCurrentUser(data.user);
 }
 }

 // ... rest of auxiliary fetch ...
 try {
 const [unreadRes, usersRes, clientsRes] = await Promise.all([
 apiFetch('/api/messages/unread-count'),
 apiFetch('/api/users'),
 apiFetch('/api/clients')
 ]);

 if (unreadRes.ok) {
 const { count } = await unreadRes.json();
 setUnreadCount(count);
 }
 if (usersRes.ok) {
 const usersData = await usersRes.json();
 setUsers(usersData);
 }
 if (clientsRes.ok) {
 const clientsData = await clientsRes.json();
 setClients(clientsData);
 }
 } catch (e) {
 console.error('Failed to fetch auxiliary data', e);
 }
 } catch {
 router.push('/login');
 }
 };
 checkAuth();
 }, [router]);


 // ... fetchTasks ... (existing) 
 const fetchTasks = useCallback(async () => {
 setLoading(true);
 try {
 const res = await apiFetch('/api/tasks');
 if (res.ok) {
 const { data } = await res.json();
 setTasks(data || []);
 }
 } catch (error) {
 console.error('Failed to fetch tasks:', error);
 } finally {
 setLoading(false);
 }
 }, []);

 useEffect(() => {
 fetchTasks();
 }, [fetchTasks]);

 // ... UseEffect filters ... (existing)
 // ... UseEffect filters ...
 useEffect(() => {
 let result = [...tasks];

 // Open/Closed Toggle
 if (showClosedTasks) {
 result = result.filter(t => t.status === 'COMPLETED' || t.status === 'CANCELLED');
 } else {
 result = result.filter(t => t.status !== 'COMPLETED' && t.status !== 'CANCELLED');
 }

 // Active Filters (User Selection)
 // If activeFilters is empty, maybe show ALL (or NONE? Request said "only show tasks for user... unless they select additional").
 // "Task Management screen should only show tasks for the user who is currently signed in, unless they select additional users."
 // This implies activeFilters should default to [currentUser].
 if (activeFilters.length > 0) {
 result = result.filter(t => {
 // Check if task matches any of the active filters (assuming filter = user name)
 // We might need strict matching or flexible.
 return activeFilters.some(filterName =>
 t.assignedTo?.name === filterName ||
 // Handle "Chris S." vs "Chris Sanders" loose match if needed?
 // For now, assume exact name from DB.
 t.assignedTo?.name?.includes(filterName)
 );
 });
 } else {
 // Fallback: If no filters active, maybe show nothing or just current user if not in list?
 // But activeFilters is initialized to currentUser.
 // If user explicitly clears it, maybe show all? Or nothing?
 // Let's assume show all if cleared, or stick to currentUser.
 // "should only show tasks for the user... unless" -> implied default. If cleared, logic is undefined.
 // I'll show ALL if filters are cleared, to allow "Global" view.
 }

 // Search
 if (searchQuery) {
 const query = searchQuery.toLowerCase();
 result = result.filter(t =>
 t.title.toLowerCase().includes(query) ||
 t.description?.toLowerCase().includes(query) ||
 t.case?.caseNumber.toLowerCase().includes(query) ||
 t.case?.clientName.toLowerCase().includes(query)
 );
 }

 // Column Filters
 Object.entries(columnFilters).forEach(([colId, filterVal]) => {
 if (!filterVal) return;
 const q = filterVal.toLowerCase();
 result = result.filter(t => {
 switch (colId) {
 case 'caseNumber': return t.case?.caseNumber?.toLowerCase().includes(q);
 case 'lob': return true; // Mocked as AR always, so always true? Or check "AR".
 case 'dueDate': return format(new Date(t.dueDate), 'MM/dd/yyyy').includes(q);
 case 'description': return t.description?.toLowerCase().includes(q) ?? false;
 case 'category': return t.category.toLowerCase().includes(q);
 case 'assignedTo': return t.assignedTo?.name.toLowerCase().includes(q);
 case 'createdBy': return t.createdBy?.name.toLowerCase().includes(q);
 default: return true;
 }
 });
 });

 // Reassign From Filter (if selected)
 if (reassignFrom) {
 result = result.filter(t => t.assignedTo?.id === reassignFrom);
 }

 // Date Range Filter
 if (dateRange.start) {
 result = result.filter(t => {
 const taskDate = new Date(t.dueDate);
 // Reset task date times to midnight for accurate day comparison
 taskDate.setHours(0, 0, 0, 0);

 // Parse input date strings as local time to avoid UTC-shift issues
 const [y, m, d] = dateRange.start.split('-').map(Number);
 const startDate = new Date(y, m - 1, d);
 startDate.setHours(0, 0, 0, 0);

 return taskDate.getTime() >= startDate.getTime();
 });
 }
 if (dateRange.end) {
 result = result.filter(t => {
 const taskDate = new Date(t.dueDate);
 taskDate.setHours(0, 0, 0, 0);

 const [y, m, d] = dateRange.end.split('-').map(Number);
 const endDate = new Date(y, m - 1, d);
 endDate.setHours(0, 0, 0, 0);

 return taskDate.getTime() <= endDate.getTime();
 });
 }

 result.sort((a, b) => {
 const dateA = new Date(a.dueDate).getTime();
 const dateB = new Date(b.dueDate).getTime();
 return sortOrder === 'asc' ? dateA - dateB : dateB - dateA;
 });
 setFilteredTasks(result);
 setCurrentPage(1); // Reset to first page on filter change
 }, [tasks, searchQuery, showClosedTasks, sortOrder, activeFilters, columnFilters, reassignTo, clientSearch, examinerSearch, dateRange]);

 // Pagination Logic
 const totalPages = Math.ceil(filteredTasks.length / itemsPerPage);
 const startIndex = (currentPage - 1) * itemsPerPage;
 const paginatedTasks = filteredTasks.slice(startIndex, startIndex + itemsPerPage);

 const handleStatusChange = async (taskId: string, newStatus: string) => {
 try {
 const res = await fetch(`/api/tasks/${taskId}`, {
 method: 'PATCH',
 headers: { 'Content-Type': 'application/json' },
 body: JSON.stringify({
 status: newStatus,
 completedAt: newStatus === 'COMPLETED' ? new Date().toISOString() : null
 })
 });

 if (res.ok) {
 fetchTasks();
 setSelectedActionTaskId(null); // Clear selection
 }
 } catch (error) {
 console.error('Failed to update task:', error);
 }
 };

 const handleDeleteTask = async (taskId: string) => {
 if (!confirm('Are you sure you want to delete this task?')) return;

 try {
 const res = await fetch(`/api/tasks/${taskId}`, { method: 'DELETE' });
 if (res.ok) {
 setSelectedTask(null);
 fetchTasks();
 }
 } catch (error) {
 console.error('Failed to delete task:', error);
 }
 };

 const handleExportToExcel = () => {
 // Determine which tasks to export: selected tasks or all filtered tasks
 const tasksToExport = selectedTaskIds.size > 0
 ? filteredTasks.filter(t => selectedTaskIds.has(t.id))
 : filteredTasks;

 if (tasksToExport.length === 0) {
 alert('No tasks available to export.');
 return;
 }

 // Define CSV headers
 const headers = [
 'Case Number',
 'Client Name',
 'Task Title',
 'Description',
 'Type',
 'Status',
 'Priority',
 'Due Date',
 'Assigned To',
 'Created By'
 ];

 // Map task data to rows
 const rows = tasksToExport.map(task => [
 task.case?.caseNumber || 'N/A',
 `"${task.case?.clientName || ''}"`, // Wrap in quotes to handle commas
 `"${task.title.replace(/"/g, '""')}"`, // Escape quotes
 `"${(task.description || '').replace(/"/g, '""')}"`,
 task.category,
 task.status,
 task.priority,
 task.dueDate ? format(new Date(task.dueDate), 'yyyy-MM-dd') : '',
 task.assignedTo?.name || 'Unassigned',
 task.createdBy?.name || 'System'
 ]);

 // Combine headers and rows
 const csvContent = [
 headers.join(','),
 ...rows.map(row => row.join(','))
 ].join('\n');

 // Create Blob and download link
 const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
 const url = URL.createObjectURL(blob);
 const link = document.createElement('a');
 link.href = url;
 link.setAttribute('download', `tasks_export_${format(new Date(), 'yyyy-MM-dd')}.csv`);
 document.body.appendChild(link);
 link.click();
 document.body.removeChild(link);
 };

 const handleBulkReassign = async () => {
 if (!reassignTo || selectedTaskIds.size === 0) return;

 if (!confirm(`Are you sure you want to reassign ${selectedTaskIds.size} task(s)?`)) return;

 try {
 const updates = Array.from(selectedTaskIds).map(taskId =>
 fetch(`/api/tasks/${taskId}`, {
 method: 'PATCH',
 headers: { 'Content-Type': 'application/json' },
 body: JSON.stringify({ assignedToId: reassignTo })
 })
 );

 await Promise.all(updates);

 // Refresh and clear
 fetchTasks();
 setSelectedTaskIds(new Set());
 setReassignTo('');
 alert('Tasks successfully reassigned.');

 } catch (error) {
 console.error('Failed to reassign tasks:', error);
 alert('Failed to reassign some tasks. Please try again.');
 }
 };

 const toggleSelectAll = () => {
 // If all currently filtered/paginated tasks are selected, deselect them.
 // Otherwise, select them.
 // Usually Select All applies to the visible set (paginated or filtered). 
 // Given the requirement is often "bulk action", let's select ALL FILTERED tasks, not just current page (unless desired?).
 // The previous implementation in CaseTasksTable selected relevant tasks.
 // Let's select all FILTERED tasks to be safe/powerful.

 if (filteredTasks.length === 0) return;

 const allSelected = filteredTasks.every(t => selectedTaskIds.has(t.id));

 if (allSelected) {
 const newSet = new Set(selectedTaskIds);
 filteredTasks.forEach(t => newSet.delete(t.id));
 setSelectedTaskIds(newSet);
 } else {
 const newSet = new Set(selectedTaskIds);
 filteredTasks.forEach(t => newSet.add(t.id));
 setSelectedTaskIds(newSet);
 }
 };

 const stats = {
 total: tasks.length,
 pending: tasks.filter(t => t.status === 'PENDING').length,
 inProgress: tasks.filter(t => t.status === 'IN_PROGRESS').length,
 completed: tasks.filter(t => t.status === 'COMPLETED').length,
 overdue: tasks.filter(t => t.status !== 'COMPLETED' && new Date(t.dueDate) < new Date()).length,
 };

 if (loading) {
 return (
 <div className="min-h-screen flex items-center justify-center bg-background">
 <Loader2 className="w-10 h-10 animate-spin text-primary-500" />
 </div>
 );
 }

 const inputCls = 'form-input';
 const labelCls = 'form-label';

 return (
 <div className="flex min-h-screen bg-background">
 {currentUser && <Sidebar user={currentUser} unreadCount={unreadCount} onToggle={setSidebarCollapsed} />}

 <div className={`flex-1 flex flex-col transition-all duration-300 ${sidebarCollapsed ? 'ml-16' : 'ml-64'}`}>

 {/* Editorial band */}
 <div className="relative overflow-hidden" style={{ padding: '28px 48px 20px', background: '#1C1A17' }}>
 <div aria-hidden style={{ position: 'absolute', inset: 0, pointerEvents: 'none', backgroundImage: 'radial-gradient(ellipse at 10% 60%,rgba(13,148,136,0.12) 0%,transparent 55%)' }} />
 <div aria-hidden style={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: 1, background: 'linear-gradient(to right,transparent,rgba(13,148,136,0.4),transparent)' }} />
 <div className="relative z-10">
 <h1 style={{ fontFamily: 'var(--font-instrument-serif, Georgia, serif)', fontSize: 36, fontWeight: 400, lineHeight: 1.1, color: '#F0EEE8', margin: 0 }}>
 Task Management
 </h1>
 <p className="mt-1.5 text-sm" style={{ color: 'rgba(240,238,232,0.45)' }}>
 {filteredTasks.length} tasks shown {filteredTasks.length !== stats.total && `(of ${stats.total})`}
 {stats.overdue > 0 && <span className="ml-2 text-red-400 font-medium">• {stats.overdue} overdue</span>}
 </p>
 </div>
 </div>

 {/* Content surface */}
 <div className="bg-background flex-1">
 <div className="px-6 py-6">

 {/* Main card */}
 <div className="bg-surface rounded-xl border border-border shadow-[0_1px_3px_rgba(28,26,23,0.06)] overflow-hidden">

 {/* Collapsible Filter Section */}
 <div className="border-b border-border">
 <button
 className="w-full px-5 py-3.5 flex items-center justify-between hover:bg-background transition-colors text-left"
 onClick={() => setShowFilters(!showFilters)}
 >
 <span className="text-sm font-semibold text-text-primary">Filters & Date Range</span>
 <ChevronDown className={cn("text-text-muted w-4 h-4 transition-transform", showFilters ? "rotate-180" : "")} />
 </button>

 {/* Active filter chips */}
 {activeFilters.length > 0 && (
 <div className="px-5 pb-3 flex flex-wrap gap-2">
 {activeFilters.map((chip) => (
 <span key={chip} className="inline-flex items-center gap-1 px-2.5 py-1 bg-primary-500/12 text-primary-500 text-xs font-medium rounded-full border border-primary-500/20">
 {chip}
 <button
 onClick={() => setActiveFilters(prev => prev.filter(f => f !== chip))}
 className="hover:text-primary-600 ml-0.5"
 aria-label={`Remove filter ${chip}`}
 >
 <X className="w-3 h-3" />
 </button>
 </span>
 ))}
 </div>
 )}

 {showFilters && (
 <div className="px-5 pb-5 border-t border-surface-raised">
 <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mt-4">
 {/* Clients */}
 <div className="relative">
 <label htmlFor="client-search" className={labelCls}>Clients</label>
 <div className="relative">
 <input
 id="client-search"
 type="text"
 value={clientSearch}
 onChange={(e) => { setClientSearch(e.target.value); setShowClientDropdown(true); }}
 onFocus={() => setShowClientDropdown(true)}
 onBlur={() => setTimeout(() => setShowClientDropdown(false), 200)}
 className={inputCls}
 placeholder="Search clients..."
 aria-label="Search Clients"
 />
 <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-text-muted pointer-events-none" />
 </div>
 {showClientDropdown && (
 <div className="absolute top-full left-0 right-0 mt-1 bg-surface border border-border rounded-lg shadow-lg max-h-48 overflow-y-auto z-50">
 {clients
 .filter(c => {
 const s = clientSearch.toLowerCase();
 return (c.name.toLowerCase().includes(s) || c.code?.toLowerCase().includes(s)) && !activeFilters.includes(c.name);
 })
 .map(client => (
 <div key={client.id} className="px-3 py-2 text-sm text-text-primary hover:bg-surface-raised cursor-pointer"
 onClick={() => { setActiveFilters(prev => [...prev, client.name]); setClientSearch(''); setShowClientDropdown(false); }}>
 {client.code ? `${client.code} — ${client.name}` : client.name}
 </div>
 ))}
 {clients.filter(c => { const s = clientSearch.toLowerCase(); return (c.name.toLowerCase().includes(s) || c.code?.toLowerCase().includes(s)) && !activeFilters.includes(c.name); }).length === 0 && (
 <div className="px-3 py-2 text-sm text-text-muted">No clients found</div>
 )}
 </div>
 )}
 </div>

 {/* Examiners */}
 <div className="relative">
 <label htmlFor="examiner-search" className={labelCls}>Examiners</label>
 <div className="relative">
 <input
 id="examiner-search"
 type="text"
 value={examinerSearch}
 onChange={(e) => { setExaminerSearch(e.target.value); setShowExaminerDropdown(true); }}
 onFocus={() => setShowExaminerDropdown(true)}
 onBlur={() => setTimeout(() => setShowExaminerDropdown(false), 200)}
 className={inputCls}
 placeholder="Search examiners..."
 aria-label="Search Examiners"
 />
 <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-text-muted pointer-events-none" />
 </div>
 {showExaminerDropdown && (
 <div className="absolute top-full left-0 right-0 mt-1 bg-surface border border-border rounded-lg shadow-lg max-h-48 overflow-y-auto z-50">
 {users
 .filter(u => u.name !== 'System')
 .filter(u => u.name.toLowerCase().includes(examinerSearch.toLowerCase()) && !activeFilters.includes(u.name))
 .map(user => (
 <div key={user.id} className="px-3 py-2 text-sm text-text-primary hover:bg-surface-raised cursor-pointer"
 onClick={() => { setActiveFilters(prev => [...prev, user.name]); setExaminerSearch(''); setShowExaminerDropdown(false); }}>
 {user.name}
 </div>
 ))}
 {users.filter(u => u.name.toLowerCase().includes(examinerSearch.toLowerCase()) && !activeFilters.includes(u.name)).length === 0 && (
 <div className="px-3 py-2 text-sm text-text-muted">No users found</div>
 )}
 </div>
 )}
 </div>

 {/* Period Begin */}
 <div>
 <label htmlFor="period-start" className={labelCls}>Period Begin</label>
 <input
 id="period-start"
 type="date"
 value={dateRange.start}
 onChange={(e) => setDateRange(prev => ({ ...prev, start: e.target.value }))}
 className={inputCls}
 aria-label="Period Begin Date"
 />
 </div>

 {/* Period End */}
 <div>
 <label htmlFor="period-end" className={labelCls}>Period End</label>
 <input
 id="period-end"
 type="date"
 value={dateRange.end}
 onChange={(e) => setDateRange(prev => ({ ...prev, end: e.target.value }))}
 className={inputCls}
 aria-label="Period End Date"
 />
 </div>
 </div>

 <div className="flex items-center justify-end gap-2 mt-4 pt-4 border-t border-surface-raised">
 <button
 onClick={() => { setActiveFilters([]); setDateRange({ start: '', end: '' }); setColumnFilters({}); setClientSearch(''); setExaminerSearch(''); setSearchQuery(''); }}
 className="px-4 py-1.5 border border-border text-text-secondary rounded-lg bg-surface hover:bg-surface-raised text-sm font-medium transition-colors"
 >
 Clear
 </button>
 <button
 onClick={() => setShowFilters(false)}
 className="px-4 py-1.5 bg-primary-500 hover:bg-primary-600 text-white rounded-lg text-sm font-semibold transition-colors"
 >
 Apply
 </button>
 </div>
 </div>
 )}
 </div>

 {/* Reassign Toolbar */}
 <div className="border-b border-border px-5 py-3 flex flex-wrap items-center gap-4 bg-background">
 <div className="flex items-center gap-2">
 <span className="text-xs font-semibold uppercase tracking-[0.08em] text-text-muted">Reassign From:</span>
 <div className="border border-border rounded-lg px-3 py-1.5 text-sm text-text-secondary bg-surface min-w-[140px] cursor-not-allowed">
 {currentUser?.name || 'Current User'}
 </div>
 </div>
 <div className="flex items-center gap-2">
 <span className="text-xs font-semibold uppercase tracking-[0.08em] text-text-muted">Reassign To:</span>
 <select
 value={reassignTo}
 onChange={(e) => setReassignTo(e.target.value)}
 className="border border-border rounded-lg px-3 py-1.5 text-sm text-text-primary bg-surface min-w-[140px] focus:outline-none focus:ring-2 focus:ring-primary-500/30 focus:border-primary-500 transition-colors"
 >
 <option value="">Select…</option>
 {users.map(u => <option key={u.id} value={u.id}>{u.name}</option>)}
 </select>
 </div>
 <div className="ml-auto relative">
 <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-text-muted" />
 <input
 type="text"
 placeholder="Search tasks…"
 value={searchQuery}
 onChange={(e) => setSearchQuery(e.target.value)}
 className="pl-9 pr-3 py-1.5 border border-border rounded-lg text-sm bg-surface text-text-primary placeholder-text-muted w-52 focus:outline-none focus:ring-2 focus:ring-primary-500/30 focus:border-primary-500 transition-colors"
 />
 </div>
 <button
 onClick={handleBulkReassign}
 className={cn(
 "text-sm font-semibold px-4 py-1.5 rounded-lg transition-all",
 reassignTo && selectedTaskIds.size > 0
 ? "bg-primary-500 text-white hover:bg-primary-600"
 : "text-border-strong bg-surface-raised cursor-not-allowed border border-border"
 )}
 disabled={!reassignTo || selectedTaskIds.size === 0}
 >
 Reassign
 </button>
 </div>

 {/* Controls Bar */}
 <div className="border-b border-border px-5 py-2.5 flex items-center justify-end gap-2">
 <button
 onClick={handleExportToExcel}
 className="px-3 py-1.5 border border-border text-text-secondary text-xs font-medium rounded-lg hover:bg-surface-raised bg-surface transition-colors"
 >
 Export CSV
 </button>
 <button
 onClick={handleClearTableFilters}
 disabled={!hasActiveFilters}
 className={cn(
 "px-3 py-1.5 border text-xs font-medium rounded-lg transition-colors",
 hasActiveFilters
 ? "border-primary-500/40 text-primary-500 bg-primary-500/5 hover:bg-primary-500/10"
 : "border-border text-border-strong cursor-not-allowed bg-surface"
 )}
 >
 Clear Table Filters
 </button>
 <button
 onClick={handleSaveColumnPreferences}
 disabled={!hasColumnChanges}
 className={cn(
 "px-3 py-1.5 border text-xs font-medium rounded-lg transition-colors",
 hasColumnChanges
 ? "border-primary-500/40 text-primary-500 bg-primary-500/5 hover:bg-primary-500/10"
 : "border-border text-border-strong cursor-not-allowed bg-surface"
 )}
 >
 Save Columns
 </button>
 </div>

 {/* Table */}
 <div className="overflow-x-auto">
 <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
 <table className="w-full text-sm text-left table-fixed">
 <thead className="bg-background border-b border-border">
 <tr>
 <th className="px-4 py-3 w-10">
 <input
 type="checkbox"
 className="rounded border-border-strong text-primary-500 focus:ring-[#0D9488]"
 checked={filteredTasks.length > 0 && filteredTasks.every(t => selectedTaskIds.has(t.id))}
 onChange={toggleSelectAll}
 />
 </th>
 <th className="px-4 py-3 w-10"></th>
 <SortableContext items={columns} strategy={horizontalListSortingStrategy}>
 {columns.map(col => (
 <SortableHeader
 key={col.id}
 id={col.id}
 onClick={() => col.sortable && setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')}
 onFilter={(val) => setColumnFilters(prev => ({ ...prev, [col.id]: val }))}
 filterValue={columnFilters[col.id]}
 width={(col as any).width}
 onResize={(w) => handleResize(col.id, w)}
 >
 <div className="flex items-center gap-1">
 {col.label}
 {col.sortable && <ArrowUpDown className="w-3 h-3" />}
 </div>
 </SortableHeader>
 ))}
 </SortableContext>
 </tr>
 </thead>
 <tbody className="divide-y divide-[#F3F1EC]">
 {paginatedTasks.length > 0 ? (
 paginatedTasks.map((task) => {
 const today = new Date(); today.setHours(0, 0, 0, 0);
 const taskDate = new Date(task.dueDate); taskDate.setHours(0, 0, 0, 0);
 const isOverdue = !['COMPLETED', 'CANCELLED'].includes(task.status) && taskDate < today;
 const isDueToday = !['COMPLETED', 'CANCELLED'].includes(task.status) && taskDate.getTime() === today.getTime();

 const primaryColor = isOverdue ? "text-red-600 font-medium" : isDueToday ? "text-primary-500 font-medium" : "text-text-primary";
 const secondaryColor = isOverdue ? "text-red-500" : isDueToday ? "text-primary-500" : "text-text-muted";

 return (
 <tr
 key={task.id}
 className="bg-surface hover:bg-background transition-colors cursor-pointer group"
 onClick={(e) => {
 if ((e.target as HTMLElement).closest('input[type="checkbox"], button')) return;
 if (task.case?.id) router.push(`/cases/${task.case.id}`);
 }}
 >
 <td className="px-4 py-3">
 <input
 type="checkbox"
 checked={selectedTaskIds.has(task.id)}
 onChange={(e) => {
 const newSet = new Set(selectedTaskIds);
 if (e.target.checked) newSet.add(task.id);
 else newSet.delete(task.id);
 setSelectedTaskIds(newSet);
 }}
 className="rounded border-border-strong"
 />
 </td>
 <td className="px-4 py-3">
 <button onClick={() => setSelectedTask(task)} className="text-border-strong hover:text-primary-500 transition-colors">
 <Edit2 className="w-4 h-4" />
 </button>
 </td>

 {columns.map(col => {
 switch (col.id) {
 case 'caseNumber':
 return <td key={col.id} className={cn("px-4 py-3 font-mono overflow-hidden text-ellipsis whitespace-nowrap", primaryColor)} style={{ width: (col as any).width }}>{task.case?.caseNumber || 'N/A'}</td>;
 case 'lob':
 return <td key={col.id} className={cn("px-4 py-3 overflow-hidden text-ellipsis whitespace-nowrap", secondaryColor)} style={{ width: (col as any).width }}>AR</td>;
 case 'dueDate':
 return <td key={col.id} className={cn("px-4 py-3 overflow-hidden text-ellipsis whitespace-nowrap", primaryColor)} style={{ width: (col as any).width }}>{format(new Date(task.dueDate), 'MM/dd/yyyy')}</td>;
 case 'description':
 return <td key={col.id} className={cn("px-4 py-3 overflow-hidden text-ellipsis whitespace-nowrap", primaryColor)} style={{ width: (col as any).width }}>{task.description || ''}</td>;
 case 'category':
 return <td key={col.id} className={cn("px-4 py-3 overflow-hidden text-ellipsis whitespace-nowrap", secondaryColor)} style={{ width: (col as any).width }}>{task.category.replace('_', ' ')}</td>;
 case 'assignedTo':
 return <td key={col.id} className={cn("px-4 py-3 overflow-hidden text-ellipsis whitespace-nowrap", secondaryColor)} style={{ width: (col as any).width }}>{task.assignedTo?.name || 'Unassigned'}</td>;
 case 'createdBy':
 return <td key={col.id} className={cn("px-4 py-3 overflow-hidden text-ellipsis whitespace-nowrap", secondaryColor)} style={{ width: (col as any).width }}>{task.createdBy?.name || 'System'}</td>;
 default: return <td key={col.id}></td>;
 }
 })}
 </tr>
 );
 })
 ) : (
 <tr>
 <td colSpan={9} className="px-4 py-12 text-center text-text-muted text-sm">
 No tasks found
 </td>
 </tr>
 )}
 </tbody>
 </table>
 </DndContext>
 </div>

 {/* Pagination */}
 <div className="border-t border-border bg-background px-5 py-3 flex items-center justify-between text-xs text-text-muted">
 <div className="flex items-center gap-1">
 <button
 onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
 disabled={currentPage === 1}
 className="px-2.5 py-1 border border-border rounded-lg disabled:opacity-40 hover:bg-surface transition-colors"
 >
 &lt;
 </button>
 <span className="px-3 text-text-secondary">Page {currentPage} of {Math.max(totalPages, 1)}</span>
 <button
 onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
 disabled={currentPage === totalPages || totalPages === 0}
 className="px-2.5 py-1 border border-border rounded-lg disabled:opacity-40 hover:bg-surface transition-colors"
 >
 &gt;
 </button>
 </div>
 <div className="flex items-center gap-2">
 <select
 value={itemsPerPage}
 onChange={(e) => { setItemsPerPage(Number(e.target.value)); setCurrentPage(1); }}
 className="border border-border rounded-lg px-2 py-1 bg-surface focus:outline-none focus:ring-1 focus:ring-[#0D9488] text-text-secondary"
 >
 <option value={10}>10</option>
 <option value={25}>25</option>
 <option value={50}>50</option>
 <option value={100}>100</option>
 <option value={200}>200</option>
 </select>
 <span>per page</span>
 </div>
 <div>
 {filteredTasks.length > 0
 ? <span>{startIndex + 1}–{Math.min(startIndex + itemsPerPage, filteredTasks.length)} of {filteredTasks.length}</span>
 : <span>0 items</span>}
 </div>
 </div>

 </div>
 </div>
 </div>

 {/* Task Detail Modal */}
 {selectedTask && (
 <TaskDetailModal
 task={selectedTask}
 onClose={() => setSelectedTask(null)}
 onStatusChange={handleStatusChange}
 onDelete={handleDeleteTask}
 onUpdate={fetchTasks}
 users={users}
 />
 )}

 </div>
 </div>
 );
}

// SortableHeader removed (moved to components)
