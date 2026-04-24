'use client';

import { useState } from 'react';
import {
 LogOut,
 Calendar,
 FileText,
 Clock,
 ChevronRight,
 Search,
 Filter,
 Bell,
 AlertTriangle,
 Settings
} from 'lucide-react';

export interface TaskListItem {
 id: string;
 caseId: string; // Link to case detail
 claimNumber: string; // Case Number (e.g., TCP-011426200530-001-AR)
 description: string;
 dueDate: Date;
 createdDate: Date;
 status: 'PENDING' | 'IN_PROGRESS' | 'COMPLETED' | 'CANCELLED';
 priority: 'HIGH' | 'MEDIUM' | 'LOW';
}

interface UserDashboardProps {
 user: {
 id: string;
 name: string;
 email: string;
 role: 'ADMIN' | 'COORDINATOR';
 };
 tasks: TaskListItem[];
 onLogout: () => void;
 onTaskClick?: (taskId: string, caseId: string) => void;

 onSettingsClick?: () => void;
 onProfileClick?: () => void;
}

const priorityColors = {
 HIGH: 'bg-red-100 text-red-700 border-red-200',
 MEDIUM: 'bg-amber-100 text-amber-700 border-amber-200',
 LOW: 'bg-green-100 text-green-700 border-green-200',
};

const statusColors = {
 PENDING: 'text-amber-600',
 IN_PROGRESS: 'text-primary-500',
 COMPLETED: 'text-success',
 CANCELLED: 'text-text-muted',
};

export function UserDashboard({ user, tasks, onLogout, onTaskClick, onSettingsClick, onProfileClick }: UserDashboardProps) {
 const [searchQuery, setSearchQuery] = useState('');
 const [filterStatus, setFilterStatus] = useState<string>('all');

 const now = new Date();

 // Filter and search
 const filteredTasks = tasks.filter((task) => {
 // Status filter
 if (filterStatus !== 'all') {
 if (filterStatus === 'overdue') {
 const isOverdue = new Date(task.dueDate) < now && task.status !== 'COMPLETED' && task.status !== 'CANCELLED';
 if (!isOverdue) return false;
 } else if (task.status !== filterStatus) {
 return false;
 }
 }

 // Search filter
 if (searchQuery) {
 const query = searchQuery.toLowerCase();
 return (
 task.claimNumber.toLowerCase().includes(query) ||
 task.description.toLowerCase().includes(query)
 );
 }

 return true;
 });

 // Count overdue
 const overdueCount = tasks.filter(
 (t) => new Date(t.dueDate) < now && t.status !== 'COMPLETED' && t.status !== 'CANCELLED'
 ).length;

 const formatDate = (date: Date) => {
 return new Intl.DateTimeFormat('en-US', {
 month: 'short',
 day: 'numeric',
 year: 'numeric',
 }).format(new Date(date));
 };

 const isOverdue = (task: TaskListItem) => {
 return new Date(task.dueDate) < now && task.status !== 'COMPLETED' && task.status !== 'CANCELLED';
 };

 return (
 <div className="min-h-screen bg-background">
 {/* Header */}
 <header className="bg-surface border-b border-border sticky top-0 z-20">
 <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
 <div className="flex items-center justify-between h-16">
 {/* Logo */}
 <div className="flex items-center gap-3">
 <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-blue-600 to-indigo-600 flex items-center justify-center">
 <FileText className="w-5 h-5 text-white" />
 </div>
 <span className="font-bold text-xl text-text-primary">AccommAlly</span>
 </div>

 {/* Right side */}
 <div className="flex items-center gap-4">
 {/* Notifications */}
 {overdueCount > 0 && (
 <button className="relative p-2 text-text-muted hover:text-text-secondary dark:hover:text-gray-200">
 <Bell className="w-5 h-5" />
 <span className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 text-white text-xs font-bold rounded-full flex items-center justify-center">
 {overdueCount}
 </span>
 </button>
 )}

 {/* User Menu */}
 <div className="flex items-center gap-3 pl-4 border-l border-border">
 <button onClick={onProfileClick} className="flex items-center gap-3 hover:opacity-80 transition-opacity text-left">
 <div className="text-right hidden sm:block">
 <p className="text-sm font-medium text-text-primary">{user.name}</p>
 <p className="text-xs text-text-muted">{user.role}</p>
 </div>
 <div className="w-9 h-9 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-white font-medium">
 {user.name.charAt(0)}
 </div>
 </button>
 <button
 onClick={onSettingsClick}
 className="p-2 text-text-muted hover:text-text-secondary dark:hover:text-gray-200 transition-colors"
 title="Settings"
 >
 <Settings className="w-5 h-5" />
 </button>
 <button
 onClick={onLogout}
 className="p-2 text-text-muted hover:text-red-600 dark:hover:text-red-400 transition-colors"
 title="Sign out"
 >
 <LogOut className="w-5 h-5" />
 </button>
 </div>
 </div>
 </div>
 </div>
 </header>

 {/* Main Content */}
 <main className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
 {/* Page Header */}
 <div className="mb-8">
 <h1 className="text-2xl font-bold text-text-primary">My Tasks</h1>
 <p className="text-text-secondary mt-1">
 {filteredTasks.length} task{filteredTasks.length !== 1 ? 's' : ''} assigned to you
 </p>
 </div>

 {/* Filters Bar */}
 <div className="bg-surface rounded-xl border border-border p-4 mb-6 flex flex-col sm:flex-row gap-4">
 {/* Search */}
 <div className="flex-1 relative">
 <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-text-muted" />
 <input
 type="search"
 placeholder="Search by claim number or description..."
 value={searchQuery}
 onChange={(e) => setSearchQuery(e.target.value)}
 className="w-full pl-10 pr-4 py-2.5 border border-border-strong rounded-lg bg-surface text-text-primary focus:outline-none focus:ring-2 focus:ring-blue-500"
 />
 </div>

 {/* Status Filter */}
 <div className="flex items-center gap-2">
 <Filter className="w-5 h-5 text-text-muted" />
 <select
 value={filterStatus}
 onChange={(e) => setFilterStatus(e.target.value)}
 className="px-4 py-2.5 border border-border-strong rounded-lg bg-surface text-text-primary focus:outline-none focus:ring-2 focus:ring-blue-500"
 >
 <option value="all">All Tasks</option>
 <option value="overdue">⚠️ Overdue</option>
 <option value="PENDING">Pending</option>
 <option value="IN_PROGRESS">In Progress</option>
 <option value="COMPLETED">Completed</option>
 </select>
 </div>
 </div>

 {/* Task List - Paper Style */}
 <div className="bg-surface rounded-xl border border-border shadow-sm overflow-hidden">
 {/* Table Header */}
 <div className="hidden md:grid md:grid-cols-12 gap-4 px-6 py-3 bg-surface-raised border-b border-border text-xs font-semibold text-text-muted uppercase tracking-wider">
 <div className="col-span-2">Due Date</div>
 <div className="col-span-2">Created</div>
 <div className="col-span-3">Claim Number</div>
 <div className="col-span-5">Description</div>
 </div>

 {/* Task Rows */}
 {filteredTasks.length === 0 ? (
 <div className="p-12 text-center">
 <FileText className="w-12 h-12 text-text-muted dark:text-text-secondary mx-auto mb-4" />
 <p className="text-text-muted">No tasks found</p>
 </div>
 ) : (
 <div className="divide-y divide-gray-100 dark:divide-gray-800">
 {filteredTasks.map((task) => (
 <div
 key={task.id}
 onClick={() => onTaskClick?.(task.id, task.caseId)}
 className={`
 group grid grid-cols-1 md:grid-cols-12 gap-2 md:gap-4 px-6 py-4 
 hover:bg-blue-50 dark:hover:bg-blue-900/10 cursor-pointer transition-colors
 ${isOverdue(task) ? 'bg-red-50/50 dark:bg-red-900/10' : ''}
 `}
 >
 {/* Due Date */}
 <div className="md:col-span-2 flex items-center gap-2">
 <Calendar className={`w-4 h-4 ${isOverdue(task) ? 'text-red-500' : 'text-text-muted'}`} />
 <span className={`text-sm font-medium ${isOverdue(task) ? 'text-red-600 dark:text-red-400' : 'text-text-primary'}`}>
 {formatDate(task.dueDate)}
 </span>
 {isOverdue(task) && (
 <AlertTriangle className="w-4 h-4 text-red-500" />
 )}
 </div>

 {/* Created Date */}
 <div className="md:col-span-2 flex items-center gap-2">
 <Clock className="w-4 h-4 text-text-muted hidden md:block" />
 <span className="text-sm text-text-secondary">
 {formatDate(task.createdDate)}
 </span>
 </div>

 {/* Claim Number */}
 <div className="md:col-span-3">
 <code className="text-sm font-mono text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/30 px-2 py-1 rounded">
 {task.claimNumber}
 </code>
 </div>

 {/* Description */}
 <div className="md:col-span-5 flex items-center justify-between">
 <div>
 <p className="text-sm text-text-primary line-clamp-2">
 {task.description}
 </p>
 <div className="flex items-center gap-2 mt-1">
 <span className={`text-xs font-medium ${statusColors[task.status]}`}>
 {task.status.replace('_', ' ')}
 </span>
 <span className={`text-xs px-2 py-0.5 rounded-full border ${priorityColors[task.priority]}`}>
 {task.priority}
 </span>
 </div>
 </div>
 <ChevronRight className="w-5 h-5 text-text-muted group-hover:text-primary-500 transition-colors ml-2" />
 </div>
 </div>
 ))}
 </div>
 )}
 </div>
 </main>
 </div>
 );
}

export default UserDashboard;
