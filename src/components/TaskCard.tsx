'use client';

import { useState } from 'react';
import {
    Calendar,
    Clock,
    User,
    MoreVertical,
    CheckCircle2,
    AlertCircle,
    Circle,
    XCircle
} from 'lucide-react';

export type TaskStatus = 'PENDING' | 'IN_PROGRESS' | 'COMPLETED' | 'CANCELLED';
export type TaskCategory = 'MEETING' | 'DEADLINE' | 'FOLLOW_UP' | 'DOCUMENTATION' | 'OTHER';

export interface TaskCardProps {
    id: string;
    title: string;
    description?: string;
    caseNumber: string;
    caseTitle: string;
    status: TaskStatus;
    category: TaskCategory;
    dueDate: Date;
    assignee: {
        id: string;
        name: string;
    };
    isAdmin?: boolean;
    availableUsers?: Array<{ id: string; name: string }>;
    onReassign?: (taskId: string, newUserId: string) => void;
    onStatusChange?: (taskId: string, newStatus: TaskStatus) => void;
}

const statusConfig: Record<TaskStatus, { icon: typeof Circle; label: string; className: string }> = {
    PENDING: {
        icon: Circle,
        label: 'Pending',
        className: 'bg-amber-100 text-amber-800 border-amber-300 dark:bg-amber-900/30 dark:text-amber-200 dark:border-amber-700'
    },
    IN_PROGRESS: {
        icon: Clock,
        label: 'In Progress',
        className: 'bg-blue-100 text-blue-800 border-blue-300 dark:bg-blue-900/30 dark:text-blue-200 dark:border-blue-700'
    },
    COMPLETED: {
        icon: CheckCircle2,
        label: 'Completed',
        className: 'bg-emerald-100 text-emerald-800 border-emerald-300 dark:bg-emerald-900/30 dark:text-emerald-200 dark:border-emerald-700'
    },
    CANCELLED: {
        icon: XCircle,
        label: 'Cancelled',
        className: 'bg-gray-100 text-gray-600 border-gray-300 dark:bg-gray-800 dark:text-gray-400 dark:border-gray-600'
    },
};

const categoryConfig: Record<TaskCategory, { label: string; className: string }> = {
    MEETING: {
        label: 'Meeting',
        className: 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-200'
    },
    DEADLINE: {
        label: 'Deadline',
        className: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-200'
    },
    FOLLOW_UP: {
        label: 'Follow-up',
        className: 'bg-cyan-100 text-cyan-800 dark:bg-cyan-900/30 dark:text-cyan-200'
    },
    DOCUMENTATION: {
        label: 'Documentation',
        className: 'bg-indigo-100 text-indigo-800 dark:bg-indigo-900/30 dark:text-indigo-200'
    },
    OTHER: {
        label: 'Other',
        className: 'bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300'
    },
};

export function TaskCard({
    id,
    title,
    description,
    caseNumber,
    caseTitle,
    status,
    category,
    dueDate,
    assignee,
    isAdmin = false,
    availableUsers = [],
    onReassign,
    onStatusChange,
}: TaskCardProps) {
    const [showMenu, setShowMenu] = useState(false);
    const [showReassign, setShowReassign] = useState(false);

    const StatusIcon = statusConfig[status].icon;
    const isPastDue = new Date() > new Date(dueDate) && status !== 'COMPLETED' && status !== 'CANCELLED';

    const formatDate = (date: Date) => {
        return new Intl.DateTimeFormat('en-US', {
            month: 'short',
            day: 'numeric',
            year: 'numeric',
            hour: 'numeric',
            minute: '2-digit',
        }).format(new Date(date));
    };

    const handleReassign = (userId: string) => {
        if (onReassign) {
            onReassign(id, userId);
        }
        setShowReassign(false);
        setShowMenu(false);
    };

    return (
        <article
            className={`
        relative rounded-xl border-2 p-5 transition-all duration-200
        bg-white dark:bg-gray-900
        hover:shadow-lg hover:scale-[1.01]
        focus-within:ring-2 focus-within:ring-blue-500 focus-within:ring-offset-2
        ${isPastDue
                    ? 'border-red-400 dark:border-red-600 shadow-red-100 dark:shadow-red-900/20'
                    : 'border-gray-200 dark:border-gray-700'
                }
      `}
            aria-label={`Task: ${title}`}
        >
            {/* Past Due Banner */}
            {isPastDue && (
                <div
                    className="absolute -top-3 left-4 px-3 py-1 bg-red-500 text-white text-xs font-bold rounded-full flex items-center gap-1"
                    role="alert"
                    aria-live="polite"
                >
                    <AlertCircle size={12} aria-hidden="true" />
                    <span>PAST DUE</span>
                </div>
            )}

            {/* Header */}
            <header className="flex items-start justify-between gap-3 mb-3">
                <div className="flex-1 min-w-0">
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 truncate">
                        {title}
                    </h3>
                    <p className="text-sm text-gray-600 dark:text-gray-400 font-mono">
                        {caseNumber}
                    </p>
                </div>

                {/* Actions Menu */}
                {isAdmin && (
                    <div className="relative">
                        <button
                            onClick={() => setShowMenu(!showMenu)}
                            className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500"
                            aria-label="Task options"
                            aria-expanded={showMenu}
                            aria-haspopup="menu"
                        >
                            <MoreVertical size={20} className="text-gray-500 dark:text-gray-400" aria-hidden="true" />
                        </button>

                        {showMenu && (
                            <div
                                className="absolute right-0 top-full mt-1 w-48 bg-white dark:bg-gray-800 rounded-lg shadow-xl border border-gray-200 dark:border-gray-700 py-1 z-20"
                                role="menu"
                            >
                                <button
                                    onClick={() => setShowReassign(!showReassign)}
                                    className="w-full px-4 py-2 text-left text-sm hover:bg-gray-100 dark:hover:bg-gray-700 flex items-center gap-2"
                                    role="menuitem"
                                >
                                    <User size={16} aria-hidden="true" />
                                    Reassign Task
                                </button>
                                {onStatusChange && (
                                    <>
                                        <hr className="my-1 border-gray-200 dark:border-gray-700" />
                                        {(['PENDING', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED'] as TaskStatus[]).map((s) => (
                                            <button
                                                key={s}
                                                onClick={() => {
                                                    onStatusChange(id, s);
                                                    setShowMenu(false);
                                                }}
                                                className={`w-full px-4 py-2 text-left text-sm hover:bg-gray-100 dark:hover:bg-gray-700 ${status === s ? 'font-semibold' : ''}`}
                                                role="menuitem"
                                            >
                                                Mark as {statusConfig[s].label}
                                            </button>
                                        ))}
                                    </>
                                )}
                            </div>
                        )}

                        {/* Reassignment Dropdown */}
                        {showReassign && (
                            <div
                                className="absolute right-0 top-full mt-1 w-56 bg-white dark:bg-gray-800 rounded-lg shadow-xl border border-gray-200 dark:border-gray-700 py-1 z-30"
                                role="listbox"
                                aria-label="Select user to reassign"
                            >
                                <p className="px-4 py-2 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase">
                                    Reassign to:
                                </p>
                                {availableUsers.map((user) => (
                                    <button
                                        key={user.id}
                                        onClick={() => handleReassign(user.id)}
                                        className={`w-full px-4 py-2 text-left text-sm hover:bg-gray-100 dark:hover:bg-gray-700 flex items-center gap-2 ${user.id === assignee.id ? 'bg-blue-50 dark:bg-blue-900/20' : ''
                                            }`}
                                        role="option"
                                        aria-selected={user.id === assignee.id}
                                    >
                                        <User size={16} aria-hidden="true" />
                                        {user.name}
                                        {user.id === assignee.id && (
                                            <span className="ml-auto text-xs text-blue-600 dark:text-blue-400">(Current)</span>
                                        )}
                                    </button>
                                ))}
                            </div>
                        )}
                    </div>
                )}
            </header>

            {/* Description */}
            {description && (
                <p className="text-sm text-gray-600 dark:text-gray-400 mb-4 line-clamp-2">
                    {description}
                </p>
            )}

            {/* Meta Info */}
            <div className="flex flex-wrap items-center gap-3 mb-4">
                {/* Status Badge */}
                <span
                    className={`inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium rounded-full border ${statusConfig[status].className}`}
                >
                    <StatusIcon size={14} aria-hidden="true" />
                    {statusConfig[status].label}
                </span>

                {/* Category Badge */}
                <span
                    className={`px-2.5 py-1 text-xs font-medium rounded-full ${categoryConfig[category].className}`}
                >
                    {categoryConfig[category].label}
                </span>
            </div>

            {/* Footer */}
            <footer className="flex items-center justify-between text-sm border-t border-gray-100 dark:border-gray-800 pt-4">
                <div className="flex items-center gap-2 text-gray-600 dark:text-gray-400">
                    <Calendar size={16} aria-hidden="true" />
                    <time dateTime={new Date(dueDate).toISOString()}>
                        {formatDate(dueDate)}
                    </time>
                </div>

                <div className="flex items-center gap-2">
                    <div
                        className="w-7 h-7 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-white text-xs font-medium"
                        aria-hidden="true"
                    >
                        {assignee.name.charAt(0).toUpperCase()}
                    </div>
                    <span className="text-gray-700 dark:text-gray-300 font-medium">
                        {assignee.name}
                    </span>
                </div>
            </footer>
        </article>
    );
}

export default TaskCard;
