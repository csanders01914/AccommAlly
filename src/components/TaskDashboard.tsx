'use client';

import { useState, useMemo } from 'react';
import {
    ListTodo,
    AlertTriangle,
    CheckCircle,
    Search,
    Filter,
    RefreshCw,
    LayoutGrid,
    List
} from 'lucide-react';
import { TaskCard, type TaskCardProps, type TaskStatus as TaskStatusType, type TaskCategory } from './TaskCard';

type FilterType = 'all' | 'current' | 'past-due' | 'completed';
type ViewType = 'grid' | 'list';

interface TaskDashboardProps {
    tasks: Omit<TaskCardProps, 'isAdmin' | 'availableUsers' | 'onReassign' | 'onStatusChange'>[];
    currentUser: {
        id: string;
        name: string;
        role: 'ADMIN' | 'COORDINATOR';
    };
    allUsers: Array<{ id: string; name: string }>;
    onReassign?: (taskId: string, newUserId: string) => Promise<void>;
    onStatusChange?: (taskId: string, newStatus: TaskStatusType) => Promise<void>;
    onRefresh?: () => Promise<void>;
    isLoading?: boolean;
}

export function TaskDashboard({
    tasks,
    currentUser,
    allUsers,
    onReassign,
    onStatusChange,
    onRefresh,
    isLoading = false,
}: TaskDashboardProps) {
    const [filter, setFilter] = useState<FilterType>('current');
    const [searchQuery, setSearchQuery] = useState('');
    const [categoryFilter, setCategoryFilter] = useState<TaskCategory | 'ALL'>('ALL');
    const [viewType, setViewType] = useState<ViewType>('grid');

    const isAdmin = currentUser.role === 'ADMIN';

    // Filter and search logic
    const filteredTasks = useMemo(() => {
        const now = new Date();

        return tasks.filter((task) => {
            const dueDate = new Date(task.dueDate);
            const isPastDue = dueDate < now && task.status !== 'COMPLETED' && task.status !== 'CANCELLED';
            const isCompleted = task.status === 'COMPLETED';
            const isCurrent = !isPastDue && !isCompleted && task.status !== 'CANCELLED';

            // Apply filter
            switch (filter) {
                case 'current':
                    if (!isCurrent) return false;
                    break;
                case 'past-due':
                    if (!isPastDue) return false;
                    break;
                case 'completed':
                    if (!isCompleted) return false;
                    break;
                case 'all':
                    break;
            }

            // Apply category filter
            if (categoryFilter !== 'ALL' && task.category !== categoryFilter) {
                return false;
            }

            // Apply search
            if (searchQuery) {
                const query = searchQuery.toLowerCase();
                const matchesTitle = task.title.toLowerCase().includes(query);
                const matchesCaseNumber = task.caseNumber.toLowerCase().includes(query);
                const matchesCaseTitle = task.caseTitle.toLowerCase().includes(query);
                const matchesAssignee = task.assignee.name.toLowerCase().includes(query);

                if (!matchesTitle && !matchesCaseNumber && !matchesCaseTitle && !matchesAssignee) {
                    return false;
                }
            }

            return true;
        });
    }, [tasks, filter, searchQuery, categoryFilter]);

    // Calculate stats
    const stats = useMemo(() => {
        const now = new Date();
        let current = 0;
        let pastDue = 0;
        let completed = 0;

        tasks.forEach((task) => {
            const dueDate = new Date(task.dueDate);
            if (task.status === 'COMPLETED') {
                completed++;
            } else if (dueDate < now && task.status !== 'CANCELLED') {
                pastDue++;
            } else if (task.status !== 'CANCELLED') {
                current++;
            }
        });

        return { current, pastDue, completed, total: tasks.length };
    }, [tasks]);

    const handleReassign = async (taskId: string, newUserId: string) => {
        if (onReassign) {
            await onReassign(taskId, newUserId);
        }
    };

    const handleStatusChange = async (taskId: string, newStatus: TaskStatusType) => {
        if (onStatusChange) {
            await onStatusChange(taskId, newStatus);
        }
    };

    return (
        <div className="min-h-screen bg-gray-50 dark:bg-gray-950">
            {/* Header */}
            <header className="bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-800 sticky top-0 z-10">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
                    <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
                        <div>
                            <h1 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-3">
                                <ListTodo className="text-blue-600 dark:text-blue-400" size={28} aria-hidden="true" />
                                Task Dashboard
                            </h1>
                            <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">
                                Manage and track all accommodation tasks
                            </p>
                        </div>

                        {/* Actions */}
                        <div className="flex items-center gap-3">
                            {onRefresh && (
                                <button
                                    onClick={onRefresh}
                                    disabled={isLoading}
                                    className="inline-flex items-center gap-2 px-4 py-2 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50 transition-all"
                                    aria-label="Refresh tasks"
                                >
                                    <RefreshCw
                                        size={16}
                                        className={isLoading ? 'animate-spin' : ''}
                                        aria-hidden="true"
                                    />
                                    Refresh
                                </button>
                            )}
                        </div>
                    </div>
                </div>
            </header>

            <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
                {/* Stats Cards */}
                <section className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8" aria-label="Task statistics">
                    <div
                        className={`p-5 rounded-xl border-2 transition-all cursor-pointer ${filter === 'current'
                                ? 'bg-blue-50 border-blue-500 dark:bg-blue-900/20 dark:border-blue-400'
                                : 'bg-white border-gray-200 hover:border-blue-300 dark:bg-gray-900 dark:border-gray-700'
                            }`}
                        onClick={() => setFilter('current')}
                        role="button"
                        aria-pressed={filter === 'current'}
                        tabIndex={0}
                        onKeyDown={(e) => e.key === 'Enter' && setFilter('current')}
                    >
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Current Tasks</p>
                                <p className="text-3xl font-bold text-blue-600 dark:text-blue-400">{stats.current}</p>
                            </div>
                            <ListTodo size={40} className="text-blue-500/30 dark:text-blue-400/30" aria-hidden="true" />
                        </div>
                    </div>

                    <div
                        className={`p-5 rounded-xl border-2 transition-all cursor-pointer ${filter === 'past-due'
                                ? 'bg-red-50 border-red-500 dark:bg-red-900/20 dark:border-red-400'
                                : 'bg-white border-gray-200 hover:border-red-300 dark:bg-gray-900 dark:border-gray-700'
                            }`}
                        onClick={() => setFilter('past-due')}
                        role="button"
                        aria-pressed={filter === 'past-due'}
                        tabIndex={0}
                        onKeyDown={(e) => e.key === 'Enter' && setFilter('past-due')}
                    >
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Past Due</p>
                                <p className="text-3xl font-bold text-red-600 dark:text-red-400">{stats.pastDue}</p>
                            </div>
                            <AlertTriangle size={40} className="text-red-500/30 dark:text-red-400/30" aria-hidden="true" />
                        </div>
                    </div>

                    <div
                        className={`p-5 rounded-xl border-2 transition-all cursor-pointer ${filter === 'completed'
                                ? 'bg-emerald-50 border-emerald-500 dark:bg-emerald-900/20 dark:border-emerald-400'
                                : 'bg-white border-gray-200 hover:border-emerald-300 dark:bg-gray-900 dark:border-gray-700'
                            }`}
                        onClick={() => setFilter('completed')}
                        role="button"
                        aria-pressed={filter === 'completed'}
                        tabIndex={0}
                        onKeyDown={(e) => e.key === 'Enter' && setFilter('completed')}
                    >
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Completed</p>
                                <p className="text-3xl font-bold text-emerald-600 dark:text-emerald-400">{stats.completed}</p>
                            </div>
                            <CheckCircle size={40} className="text-emerald-500/30 dark:text-emerald-400/30" aria-hidden="true" />
                        </div>
                    </div>
                </section>

                {/* Filters & Search */}
                <section
                    className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 p-4 mb-6"
                    aria-label="Filter tasks"
                >
                    <div className="flex flex-col lg:flex-row gap-4">
                        {/* Search */}
                        <div className="flex-1 relative">
                            <Search
                                size={18}
                                className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
                                aria-hidden="true"
                            />
                            <input
                                type="search"
                                placeholder="Search by case number, title, or assignee..."
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                className="w-full pl-10 pr-4 py-2.5 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                aria-label="Search tasks"
                            />
                        </div>

                        {/* Category Filter */}
                        <div className="flex items-center gap-2">
                            <Filter size={18} className="text-gray-400" aria-hidden="true" />
                            <select
                                value={categoryFilter}
                                onChange={(e) => setCategoryFilter(e.target.value as TaskCategory | 'ALL')}
                                className="px-4 py-2.5 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                                aria-label="Filter by category"
                            >
                                <option value="ALL">All Categories</option>
                                <option value="MEETING">Meetings</option>
                                <option value="DEADLINE">Deadlines</option>
                                <option value="FOLLOW_UP">Follow-ups</option>
                                <option value="DOCUMENTATION">Documentation</option>
                                <option value="OTHER">Other</option>
                            </select>
                        </div>

                        {/* View Toggle */}
                        <div
                            className="flex items-center bg-gray-100 dark:bg-gray-800 rounded-lg p-1"
                            role="group"
                            aria-label="View type"
                        >
                            <button
                                onClick={() => setViewType('grid')}
                                className={`p-2 rounded-md transition-all ${viewType === 'grid'
                                        ? 'bg-white dark:bg-gray-700 shadow text-blue-600 dark:text-blue-400'
                                        : 'text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'
                                    }`}
                                aria-pressed={viewType === 'grid'}
                                aria-label="Grid view"
                            >
                                <LayoutGrid size={18} aria-hidden="true" />
                            </button>
                            <button
                                onClick={() => setViewType('list')}
                                className={`p-2 rounded-md transition-all ${viewType === 'list'
                                        ? 'bg-white dark:bg-gray-700 shadow text-blue-600 dark:text-blue-400'
                                        : 'text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'
                                    }`}
                                aria-pressed={viewType === 'list'}
                                aria-label="List view"
                            >
                                <List size={18} aria-hidden="true" />
                            </button>
                        </div>
                    </div>
                </section>

                {/* Filter Toggle Tabs */}
                <section className="flex items-center gap-2 mb-6 overflow-x-auto pb-2" role="tablist">
                    {(['all', 'current', 'past-due', 'completed'] as FilterType[]).map((f) => (
                        <button
                            key={f}
                            onClick={() => setFilter(f)}
                            role="tab"
                            aria-selected={filter === f}
                            className={`px-4 py-2 text-sm font-medium rounded-full whitespace-nowrap transition-all ${filter === f
                                    ? 'bg-blue-600 text-white'
                                    : 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700'
                                }`}
                        >
                            {f === 'all' && 'All Tasks'}
                            {f === 'current' && 'Current'}
                            {f === 'past-due' && 'Past Due'}
                            {f === 'completed' && 'Completed'}
                        </button>
                    ))}
                </section>

                {/* Task Grid/List */}
                {isLoading ? (
                    <div className="flex items-center justify-center py-16">
                        <RefreshCw size={32} className="animate-spin text-blue-600" aria-hidden="true" />
                        <span className="sr-only">Loading tasks...</span>
                    </div>
                ) : filteredTasks.length === 0 ? (
                    <div className="text-center py-16 bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800">
                        <ListTodo size={48} className="mx-auto text-gray-300 dark:text-gray-600 mb-4" aria-hidden="true" />
                        <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-1">No tasks found</h3>
                        <p className="text-gray-600 dark:text-gray-400">
                            {searchQuery ? 'Try adjusting your search query' : 'All caught up!'}
                        </p>
                    </div>
                ) : (
                    <div
                        className={
                            viewType === 'grid'
                                ? 'grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5'
                                : 'flex flex-col gap-4'
                        }
                        role="list"
                        aria-label="Task list"
                    >
                        {filteredTasks.map((task) => (
                            <div key={task.id} role="listitem">
                                <TaskCard
                                    {...task}
                                    isAdmin={isAdmin}
                                    availableUsers={allUsers}
                                    onReassign={handleReassign}
                                    onStatusChange={handleStatusChange}
                                />
                            </div>
                        ))}
                    </div>
                )}

                {/* Results Count */}
                {!isLoading && filteredTasks.length > 0 && (
                    <p className="text-center text-sm text-gray-500 dark:text-gray-400 mt-6">
                        Showing {filteredTasks.length} of {stats.total} tasks
                    </p>
                )}
            </main>
        </div>
    );
}

export default TaskDashboard;
