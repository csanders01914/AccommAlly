'use client';

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
import { TaskDetailModal } from '@/components/TaskDetailModal';

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
        start: format(new Date(), 'yyyy-MM-dd'),
        end: ''
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
        { id: 'title', label: 'Task Description', sortable: true, width: 300 },
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
                const res = await fetch('/api/auth/me'); // This route currently returns session with ID
                if (!res.ok) {
                    router.push('/');
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
                        fetch('/api/messages/unread-count'),
                        fetch('/api/users'),
                        fetch('/api/clients')
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
                router.push('/');
            }
        };
        checkAuth();
    }, [router]);


    // ... fetchTasks ... (existing) 
    const fetchTasks = useCallback(async () => {
        setLoading(true);
        try {
            const res = await fetch('/api/tasks');
            if (res.ok) {
                const data = await res.json();
                setTasks(data.tasks || []);
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
                    case 'title': return t.title.toLowerCase().includes(q);
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
            // Compare dates (ignoring time for start date if needed, but simple comparison works if standard ISO YYYY-MM-DD)
            // t.dueDate is ISO string. Input is YYYY-MM-DD.
            // Using simple string comparison for YYYY-MM-DD works if time is 00:00, but better to use Date objects.
            // Start date: tasks ON or AFTER. 
            // End date: tasks ON or BEFORE.
            result = result.filter(t => {
                const taskDate = new Date(t.dueDate);
                const startDate = new Date(dateRange.start);
                // Reset times to midnight for accurate day comparison
                taskDate.setHours(0, 0, 0, 0);
                startDate.setHours(0, 0, 0, 0);
                return taskDate >= startDate;
            });
        }
        if (dateRange.end) {
            result = result.filter(t => {
                const taskDate = new Date(t.dueDate);
                const endDate = new Date(dateRange.end);
                taskDate.setHours(0, 0, 0, 0);
                endDate.setHours(0, 0, 0, 0);
                return taskDate <= endDate;
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

    const stats = {
        total: tasks.length,
        pending: tasks.filter(t => t.status === 'PENDING').length,
        inProgress: tasks.filter(t => t.status === 'IN_PROGRESS').length,
        completed: tasks.filter(t => t.status === 'COMPLETED').length,
        overdue: tasks.filter(t => t.status !== 'COMPLETED' && new Date(t.dueDate) < new Date()).length,
    };

    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900">
                <Loader2 className="w-10 h-10 animate-spin text-blue-500" />
            </div>
        );
    }



    // ... existing code ...

    return (
        <div className="flex min-h-screen bg-gray-50 dark:bg-gray-900">
            {currentUser && <Sidebar user={currentUser} unreadCount={unreadCount} onToggle={setSidebarCollapsed} />}

            <div className={`flex-1 flex flex-col transition-all duration-300 ${sidebarCollapsed ? 'ml-16' : 'ml-64'}`}>

                {/* Header */}
                <header className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 sticky top-0 z-20">
                    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                        <div className="flex items-center justify-between h-16">
                            <div className="flex items-center gap-4">
                                {/* Removed Back Button as Sidebar exists */}
                                <div>
                                    <h1 className="text-xl font-bold text-gray-900 dark:text-white">
                                        Task Management
                                    </h1>
                                    <p className="text-sm text-gray-500">
                                        {filteredTasks.length} tasks shown {filteredTasks.length !== stats.total && `(of ${stats.total})`} • {stats.overdue} overdue
                                    </p>
                                </div>
                            </div>

                        </div>
                    </div>
                </header>

                <div className="max-w-full mx-auto px-4 sm:px-6 lg:px-8 py-6 w-full">

                    {/* Collapsible Filter Section */}
                    <div className="bg-gray-100 dark:bg-gray-800 rounded-t-xl border border-gray-200 dark:border-gray-700 mb-0">
                        <div
                            className="bg-gray-200/50 dark:bg-gray-700/50 px-4 py-3 flex items-center justify-between cursor-pointer rounded-t-xl"
                            onClick={() => setShowFilters(!showFilters)}
                        >
                            <h2 className="text-gray-700 dark:text-gray-200 text-lg font-medium">Select Colleagues and Date Range</h2>
                            <ChevronDown className={cn("text-gray-500 w-5 h-5 transition-transform", showFilters ? "rotate-180" : "")} />
                        </div>

                        {/* Selected Chips (Always Visible) */}
                        <div className="px-6 pt-4 pb-2">
                            <div className="flex flex-wrap gap-2">
                                {activeFilters.map((chip) => (
                                    <span key={chip} className="inline-flex items-center gap-1 px-3 py-1 bg-blue-600 text-white text-xs rounded-full">
                                        {chip}
                                        <X
                                            className="w-3 h-3 cursor-pointer hover:text-blue-200"
                                            onClick={() => setActiveFilters(prev => prev.filter(f => f !== chip))}
                                        />
                                    </span>
                                ))}
                                {activeFilters.length === 0 && !showFilters && (
                                    <span className="text-gray-500 text-xs italic p-1">No filters selected</span>
                                )}
                            </div>
                        </div>

                        {showFilters && (
                            <div className="p-6 pt-2 transition-all animate-in fade-in slide-in-from-top-2">
                                {/* Filter Grid */}
                                <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
                                    <div className="space-y-1 relative">
                                        <label htmlFor="client-search" className="text-xs font-semibold text-gray-500 uppercase">Clients</label>
                                        <div className="relative">
                                            <input
                                                id="client-search"
                                                type="text"
                                                value={clientSearch}
                                                onChange={(e) => {
                                                    setClientSearch(e.target.value);
                                                    setShowClientDropdown(true);
                                                }}
                                                onFocus={() => setShowClientDropdown(true)}
                                                onBlur={() => setTimeout(() => setShowClientDropdown(false), 200)}
                                                className="w-full pl-2 pr-8 py-1.5 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded text-sm"
                                                placeholder="Search..."
                                                aria-label="Search Clients"
                                            />
                                            <Search className="absolute right-2 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                                        </div>
                                        {showClientDropdown && (
                                            <div className="absolute top-full left-0 right-0 mt-1 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-md shadow-lg max-h-48 overflow-y-auto z-50">
                                                {clients
                                                    .filter(c => {
                                                        const search = clientSearch.toLowerCase();
                                                        return (c.name.toLowerCase().includes(search) || c.code?.toLowerCase().includes(search)) && !activeFilters.includes(c.name);
                                                    })
                                                    .map(client => (
                                                        <div
                                                            key={client.id}
                                                            className="px-3 py-2 text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700 cursor-pointer"
                                                            onClick={() => {
                                                                setActiveFilters(prev => [...prev, client.name]);
                                                                setClientSearch('');
                                                                setShowClientDropdown(false);
                                                            }}
                                                        >
                                                            {client.code ? `${client.code} - ${client.name}` : client.name}
                                                        </div>
                                                    ))}
                                                {clients.filter(c => {
                                                    const search = clientSearch.toLowerCase();
                                                    return (c.name.toLowerCase().includes(search) || c.code?.toLowerCase().includes(search)) && !activeFilters.includes(c.name);
                                                }).length === 0 && (
                                                        <div className="px-3 py-2 text-sm text-gray-500">No clients found</div>
                                                    )}
                                            </div>
                                        )}
                                    </div>

                                    {/* Examiners (Autocomplete) */}
                                    <div className="space-y-1 relative">
                                        <label htmlFor="examiner-search" className="text-xs font-semibold text-gray-500 uppercase">Examiners</label>
                                        <div className="relative">
                                            <input
                                                id="examiner-search"
                                                type="text"
                                                value={examinerSearch}
                                                onChange={(e) => {
                                                    setExaminerSearch(e.target.value);
                                                    setShowExaminerDropdown(true);
                                                }}
                                                onFocus={() => setShowExaminerDropdown(true)}
                                                onBlur={() => setTimeout(() => setShowExaminerDropdown(false), 200)}
                                                className="w-full pl-2 pr-8 py-1.5 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded text-sm"
                                                placeholder="Search..."
                                                aria-label="Search Examiners"
                                            />
                                            <Search className="absolute right-2 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                                        </div>
                                        {showExaminerDropdown && (
                                            <div className="absolute top-full left-0 right-0 mt-1 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-md shadow-lg max-h-48 overflow-y-auto z-50">
                                                {users
                                                    .filter(u => u.name !== 'System')
                                                    .filter(u => u.name.toLowerCase().includes(examinerSearch.toLowerCase()) && !activeFilters.includes(u.name))
                                                    .map(user => (
                                                        <div
                                                            key={user.id}
                                                            className="px-3 py-2 text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700 cursor-pointer"
                                                            onClick={() => {
                                                                setActiveFilters(prev => [...prev, user.name]);
                                                                setExaminerSearch('');
                                                                setShowExaminerDropdown(false);
                                                            }}
                                                        >
                                                            {user.name}
                                                        </div>
                                                    ))}
                                                {users.filter(u => u.name.toLowerCase().includes(examinerSearch.toLowerCase()) && !activeFilters.includes(u.name)).length === 0 && (
                                                    <div className="px-3 py-2 text-sm text-gray-500">No users found</div>
                                                )}
                                            </div>
                                        )}
                                    </div>

                                    <div className="space-y-1">
                                        <label htmlFor="period-start" className="text-xs font-semibold text-gray-500 uppercase">Period Begin</label>
                                        <div className="relative">
                                            <input
                                                id="period-start"
                                                type="date"
                                                value={dateRange.start}
                                                onChange={(e) => setDateRange(prev => ({ ...prev, start: e.target.value }))}
                                                className="w-full pl-2 pr-2 py-1.5 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded text-sm text-gray-900 dark:text-gray-100 placeholder-gray-500"
                                                aria-label="Period Begin Date"
                                            />
                                        </div>
                                    </div>
                                    <div className="space-y-1">
                                        <label htmlFor="period-end" className="text-xs font-semibold text-gray-500 uppercase">Period End</label>
                                        <div className="relative">
                                            <input
                                                id="period-end"
                                                type="date"
                                                value={dateRange.end}
                                                onChange={(e) => setDateRange(prev => ({ ...prev, end: e.target.value }))}
                                                className="w-full pl-2 pr-2 py-1.5 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded text-sm text-gray-900 dark:text-gray-100 placeholder-gray-500"
                                                aria-label="Period End Date"
                                            />
                                        </div>
                                    </div>
                                </div>

                                {/* Actions Row */}
                                <div className="flex items-center justify-end border-t border-gray-200 dark:border-gray-700 pt-4">
                                    <div className="flex flex-col items-end gap-4">
                                        <div className="flex gap-2">
                                            <button
                                                onClick={() => {
                                                    setActiveFilters([]);
                                                    setDateRange({ start: '', end: '' });
                                                    setColumnFilters({});
                                                    setClientSearch('');
                                                    setExaminerSearch('');
                                                    setSearchQuery('');
                                                }}
                                                className="px-6 py-1.5 border border-blue-600 text-blue-600 rounded bg-white hover:bg-blue-50 text-sm font-medium"
                                            >
                                                Clear
                                            </button>
                                            <button
                                                onClick={() => setShowFilters(false)}
                                                className="px-6 py-1.5 bg-blue-700 text-white rounded hover:bg-blue-800 text-sm font-medium shadow-sm"
                                            >
                                                Apply
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Reassign Toolbar */}
                    <div className="bg-gray-100 dark:bg-gray-800 border-x border-b border-gray-200 dark:border-gray-700 p-4 flex flex-wrap items-center gap-4">
                        <div className="flex items-center gap-2">
                            <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Reassign From:</span>
                            <div className="bg-gray-100 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded px-3 py-1 text-sm min-w-[150px] text-gray-500 cursor-not-allowed">
                                {currentUser?.name || 'Current User'}
                            </div>
                        </div>
                        <div className="flex items-center gap-2">
                            <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Reassign to:</span>
                            <select
                                value={reassignTo}
                                onChange={(e) => setReassignTo(e.target.value)}
                                className="bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded px-3 py-1 text-sm min-w-[150px]"
                            >
                                <option value="">Select</option>
                                {users.map(u => <option key={u.id} value={u.id}>{u.name}</option>)}
                            </select>
                        </div>
                        <div className="ml-auto relative">
                            <Search className="absolute left-2 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                            <input
                                type="text"
                                placeholder="Search..."
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                className="pl-8 pr-3 py-1 border border-gray-300 dark:border-gray-600 rounded text-sm w-48 focus:outline-none focus:ring-1 focus:ring-blue-500"
                            />
                        </div>
                        <button
                            onClick={handleBulkReassign}
                            className={cn(
                                "text-sm font-medium px-4 py-1.5 rounded transition-all",
                                reassignTo && selectedTaskIds.size > 0
                                    ? "bg-blue-600 text-white shadow-sm hover:bg-blue-700"
                                    : "text-gray-400 bg-gray-100 cursor-not-allowed"
                            )}
                            disabled={!reassignTo || selectedTaskIds.size === 0}
                        >
                            Reassign
                        </button>
                    </div>

                    {/* Controls Bar */}
                    <div className="bg-white dark:bg-gray-900 border-x border-b border-gray-200 dark:border-gray-700 p-2 flex items-center justify-between">
                        <div className="flex items-center gap-4">

                        </div>
                        <div className="flex gap-2">
                            <button
                                onClick={handleExportToExcel}
                                className="px-3 py-1 border border-blue-600 text-blue-600 text-xs font-medium rounded hover:bg-blue-50"
                            >
                                Export to Excel
                            </button>
                            <button
                                onClick={handleClearTableFilters}
                                disabled={!hasActiveFilters}
                                className={cn(
                                    "px-3 py-1 border text-xs rounded transition-colors",
                                    hasActiveFilters
                                        ? "border-blue-600 text-blue-600 font-medium hover:bg-blue-50"
                                        : "border-gray-300 text-gray-400 cursor-not-allowed bg-gray-50"
                                )}
                            >
                                Clear Table Filters
                            </button>
                            <button
                                onClick={handleSaveColumnPreferences}
                                disabled={!hasColumnChanges}
                                className={cn(
                                    "px-3 py-1 border text-xs rounded transition-colors",
                                    hasColumnChanges
                                        ? "border-blue-600 text-blue-600 font-medium hover:bg-blue-50"
                                        : "border-gray-300 text-gray-400 cursor-not-allowed bg-gray-50"
                                )}
                            >
                                Save Column Preferences
                            </button>
                        </div>
                    </div>

                    {/* Table */}
                    <div className="bg-white dark:bg-gray-800 border-x border-b border-gray-200 dark:border-gray-700 overflow-x-auto">
                        <DndContext
                            sensors={sensors}
                            collisionDetection={closestCenter}
                            onDragEnd={handleDragEnd}
                        >
                            <table className="w-full text-sm text-left table-fixed">
                                <thead className="bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 font-medium border-b border-gray-200 dark:border-gray-700">
                                    <tr>
                                        <th className="px-4 py-3 w-10"><input type="checkbox" className="rounded" /></th>
                                        <th className="px-4 py-3 w-10"></th>
                                        <SortableContext items={columns} strategy={horizontalListSortingStrategy}>
                                            {columns.map(col => (
                                                <SortableHeader
                                                    key={col.id}
                                                    id={col.id}
                                                    onClick={() => col.sortable && setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')}
                                                    onFilter={(val) => setColumnFilters(prev => ({ ...prev, [col.id]: val }))}
                                                    filterValue={columnFilters[col.id]}
                                                    width={(col as any).width /** keeping as any for now as Column definition is implicit in state */}
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
                                <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                                    {paginatedTasks.length > 0 ? (
                                        paginatedTasks.map((task, idx) => (
                                            <tr
                                                key={task.id}
                                                className={cn("hover:bg-blue-50 dark:hover:bg-blue-900/10 transition-colors cursor-pointer", idx % 2 === 0 ? "bg-white dark:bg-gray-900" : "bg-gray-50 dark:bg-gray-800/50")}
                                                onClick={(e) => {
                                                    // Prevent navigation if clicking checkbox or action buttons
                                                    if ((e.target as HTMLElement).closest('input[type="checkbox"], button')) return;
                                                    if (task.case?.id) {
                                                        router.push(`/cases/${task.case.id}`);
                                                    }
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
                                                        className="rounded border-gray-300"
                                                    />
                                                </td>
                                                <td className="px-4 py-3">
                                                    <button onClick={() => setSelectedTask(task)} className="text-blue-500 hover:text-blue-700">
                                                        <Edit2 className="w-4 h-4" />
                                                    </button>
                                                </td>

                                                {/* Dynamic Columns */}
                                                {columns.map(col => {
                                                    switch (col.id) {
                                                        case 'caseNumber':
                                                            return (
                                                                <td key={col.id} className="px-4 py-3 font-medium text-gray-900 dark:text-white overflow-hidden text-ellipsis whitespace-nowrap" style={{ width: (col as any).width }}>
                                                                    {task.case?.caseNumber || 'N/A'}
                                                                </td>
                                                            );
                                                        case 'lob':
                                                            return (
                                                                <td key={col.id} className="px-4 py-3 text-gray-500 overflow-hidden text-ellipsis whitespace-nowrap" style={{ width: (col as any).width }}>
                                                                    AR
                                                                </td>
                                                            );
                                                        case 'dueDate':
                                                            return (
                                                                <td key={col.id} className="px-4 py-3 text-gray-900 dark:text-gray-100 overflow-hidden text-ellipsis whitespace-nowrap" style={{ width: (col as any).width }}>
                                                                    {format(new Date(task.dueDate), 'MM/dd/yyyy')}
                                                                </td>
                                                            );
                                                        case 'title':
                                                            return (
                                                                <td key={col.id} className="px-4 py-3 text-gray-900 dark:text-gray-100 overflow-hidden text-ellipsis whitespace-nowrap" style={{ width: (col as any).width }}>
                                                                    {task.title}
                                                                </td>
                                                            );
                                                        case 'category':
                                                            return (
                                                                <td key={col.id} className="px-4 py-3 text-gray-500 overflow-hidden text-ellipsis whitespace-nowrap" style={{ width: (col as any).width }}>
                                                                    {task.category.replace('_', ' ')}
                                                                </td>
                                                            );
                                                        case 'assignedTo':
                                                            return (
                                                                <td key={col.id} className="px-4 py-3 text-gray-500 overflow-hidden text-ellipsis whitespace-nowrap" style={{ width: (col as any).width }}>
                                                                    {task.assignedTo?.name || 'Unassigned'}
                                                                </td>
                                                            );
                                                        case 'createdBy':
                                                            return (
                                                                <td key={col.id} className="px-4 py-3 text-gray-500 overflow-hidden text-ellipsis whitespace-nowrap" style={{ width: (col as any).width }}>
                                                                    {task.createdBy?.name || 'System'}
                                                                </td>
                                                            );
                                                        default: return <td key={col.id}></td>;
                                                    }
                                                })}
                                            </tr>
                                        ))
                                    ) : (
                                        <tr>
                                            <td colSpan={9} className="px-4 py-12 text-center text-gray-500">
                                                No tasks found
                                            </td>
                                        </tr>
                                    )}
                                </tbody>
                            </table>
                        </DndContext>
                    </div>

                    {/* Footer / Pagination */}
                    <div className="bg-gray-50 dark:bg-gray-900 border-x border-b border-gray-200 dark:border-gray-700 rounded-b-lg p-3 flex items-center justify-between text-xs text-gray-500">
                        <div className="flex gap-2">
                            <button
                                onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                                disabled={currentPage === 1}
                                className="px-2 py-1 border rounded disabled:opacity-50 hover:bg-gray-200 dark:hover:bg-gray-700"
                            >
                                &lt;
                            </button>
                            <span className="flex items-center px-2">Page {currentPage} of {Math.max(totalPages, 1)}</span>
                            <button
                                onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                                disabled={currentPage === totalPages || totalPages === 0}
                                className="px-2 py-1 border rounded disabled:opacity-50 hover:bg-gray-200 dark:hover:bg-gray-700"
                            >
                                &gt;
                            </button>
                        </div>
                        <div className="flex items-center gap-2">
                            <select
                                value={itemsPerPage}
                                onChange={(e) => {
                                    setItemsPerPage(Number(e.target.value));
                                    setCurrentPage(1);
                                }}
                                className="bg-transparent border border-gray-300 dark:border-gray-600 rounded px-2 py-1 focus:ring-1 focus:ring-blue-500"
                            >
                                <option value={10}>10</option>
                                <option value={25}>25</option>
                                <option value={50}>50</option>
                                <option value={100}>100</option>
                                <option value={200}>200</option>
                            </select>
                            <span>items per page</span>
                        </div>
                        <div>
                            {filteredTasks.length > 0 ? (
                                <span>{startIndex + 1} - {Math.min(startIndex + itemsPerPage, filteredTasks.length)} of {filteredTasks.length} items</span>
                            ) : (
                                <span>0 items</span>
                            )}
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
