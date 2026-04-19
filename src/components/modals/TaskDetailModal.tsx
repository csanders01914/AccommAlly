'use client';

import { useState } from 'react';
import {
    X,
    Calendar,
    Briefcase,
    User,
    CheckCircle,
    Trash2,
    Edit2
} from 'lucide-react';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';
// We need to define or import the Task type. 
// Since Prisma types are available, we can try using them or a customized one.
// The original code used a local interface `Task`. Let's use a compatible interface.

interface Task {
    id: string;
    title: string;
    description: string | null;
    status: string;
    priority: string;
    category: string;
    dueDate: string | Date; // API might return string
    assignedTo?: {
        id: string;
        name: string;
    };
    case?: {
        id: string;
        caseNumber: string;
        clientName: string;
    };
    createdById: string;
    createdAt: string | Date;
}

const STATUS_COLORS: Record<string, { bg: string; text: string }> = {
    PENDING: { bg: 'bg-yellow-100 dark:bg-yellow-900/30', text: 'text-yellow-700 dark:text-yellow-400' },
    IN_PROGRESS: { bg: 'bg-blue-100 dark:bg-blue-900/30', text: 'text-blue-700 dark:text-blue-400' },
    COMPLETED: { bg: 'bg-green-100 dark:bg-green-900/30', text: 'text-green-700 dark:text-green-400' },
    CANCELLED: { bg: 'bg-gray-100 dark:bg-gray-800', text: 'text-gray-500' },
};

const PRIORITY_COLORS: Record<string, string> = {
    HIGH: 'bg-red-500',
    MEDIUM: 'bg-yellow-500',
    LOW: 'bg-green-500',
};

export function TaskDetailModal({
    task,
    onClose,
    onStatusChange,
    onDelete,
    onUpdate,
    users = []
}: {
    task: Task;
    onClose: () => void;
    onStatusChange: (id: string, status: string) => void;
    onDelete: (id: string) => void;
    onUpdate: () => void;
    users?: { id: string; name: string }[];
}) {
    const [isEditing, setIsEditing] = useState(false);
    const [title, setTitle] = useState(task.title);
    const [description, setDescription] = useState(task.description || '');
    const [priority, setPriority] = useState(task.priority);
    // Handle date string or object safely
    const initialDate = task.dueDate ? new Date(task.dueDate) : new Date();
    const [dueDate, setDueDate] = useState(format(initialDate, "yyyy-MM-dd"));
    const [assignedToId, setAssignedToId] = useState(task.assignedTo?.id || '');
    const [loading, setLoading] = useState(false);

    const handleSave = async () => {
        setLoading(true);
        try {
            const res = await fetch(`/api/tasks/${task.id}`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    title,
                    description,
                    priority,
                    dueDate: new Date(dueDate).toISOString(),
                    assignedToId: assignedToId || undefined
                })
            });

            if (res.ok) {
                setIsEditing(false);
                onUpdate();
                onClose();
            }
        } catch (error) {
            console.error('Failed to update task:', error);
        } finally {
            setLoading(false);
        }
    };

    const statusConfig = STATUS_COLORS[task.status] || STATUS_COLORS.PENDING;

    return (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={onClose}>
            <div
                className="bg-white dark:bg-gray-800 rounded-xl w-full max-w-lg shadow-2xl overflow-hidden"
                onClick={e => e.stopPropagation()}
            >
                {/* Header */}
                <div className="p-4 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <div className={cn("w-3 h-3 rounded-full", PRIORITY_COLORS[task.priority])} />
                        <h3 className="font-semibold text-gray-900 dark:text-white">Task Details</h3>
                    </div>
                    <button onClick={onClose} className="p-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded">
                        <X className="w-5 h-5" />
                    </button>
                </div>

                {/* Content */}
                <div className="p-4 space-y-4">
                    {isEditing ? (
                        <>
                            <div>
                                <label className="text-xs text-gray-500 mb-1 block">Title</label>
                                <input
                                    type="text"
                                    value={title}
                                    onChange={e => setTitle(e.target.value)}
                                    className="w-full px-3 py-2 bg-gray-100 dark:bg-gray-700 rounded-lg text-sm border-none focus:ring-2 focus:ring-blue-500 outline-none"
                                />
                            </div>
                            <div>
                                <label className="text-xs text-gray-500 mb-1 block">Description</label>
                                <textarea
                                    value={description}
                                    onChange={e => setDescription(e.target.value)}
                                    rows={3}
                                    className="w-full px-3 py-2 bg-gray-100 dark:bg-gray-700 rounded-lg text-sm resize-none border-none focus:ring-2 focus:ring-blue-500 outline-none"
                                />
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="text-xs text-gray-500 mb-1 block">Priority</label>
                                    <select
                                        value={priority}
                                        onChange={e => setPriority(e.target.value)}
                                        className="w-full px-3 py-2 bg-gray-100 dark:bg-gray-700 rounded-lg text-sm border-none focus:ring-2 focus:ring-blue-500 outline-none"
                                    >
                                        <option value="HIGH">High</option>
                                        <option value="MEDIUM">Medium</option>
                                        <option value="LOW">Low</option>
                                    </select>
                                </div>
                                <div>
                                    <label className="text-xs text-gray-500 mb-1 block">Due Date</label>
                                    <input
                                        type="date"
                                        value={dueDate}
                                        onChange={e => setDueDate(e.target.value)}
                                        className="w-full px-3 py-2 bg-gray-100 dark:bg-gray-700 rounded-lg text-sm border-none focus:ring-2 focus:ring-blue-500 outline-none"
                                    />
                                </div>
                                {users.length > 0 && (
                                    <div className="col-span-2">
                                        <label className="text-xs text-gray-500 mb-1 block">Assigned To</label>
                                        <select
                                            value={assignedToId}
                                            onChange={e => setAssignedToId(e.target.value)}
                                            className="w-full px-3 py-2 bg-gray-100 dark:bg-gray-700 rounded-lg text-sm border-none focus:ring-2 focus:ring-blue-500 outline-none"
                                        >
                                            <option value="" disabled>Select User</option>
                                            {users.map(u => (
                                                <option key={u.id} value={u.id}>
                                                    {u.name}
                                                </option>
                                            ))}
                                        </select>
                                    </div>
                                )}
                            </div>
                        </>
                    ) : (
                        <>
                            <div>
                                <h4 className="text-lg font-semibold text-gray-900 dark:text-white">{task.title}</h4>
                                {task.description && (
                                    <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">{task.description}</p>
                                )}
                            </div>

                            <div className="flex flex-wrap gap-2">
                                <span className={cn("text-xs px-2 py-1 rounded-full", statusConfig.bg, statusConfig.text)}>
                                    {task.status.replace('_', ' ')}
                                </span>
                                <span className="text-xs px-2 py-1 rounded-full bg-gray-100 dark:bg-gray-700">
                                    {task.priority} Priority
                                </span>
                                <span className="text-xs px-2 py-1 rounded-full bg-gray-100 dark:bg-gray-700">
                                    {task.category}
                                </span>
                            </div>

                            <div className="space-y-2 text-sm">
                                <div className="flex items-center gap-2 text-gray-600 dark:text-gray-400">
                                    <Calendar className="w-4 h-4" />
                                    Due: {format(new Date(task.dueDate), 'MMMM d, yyyy')}
                                </div>
                                {task.case && (
                                    <div className="flex items-center gap-2 text-gray-600 dark:text-gray-400">
                                        <Briefcase className="w-4 h-4" />
                                        Case: {task.case.caseNumber} - {task.case.clientName}
                                    </div>
                                )}
                                {task.assignedTo && (
                                    <div className="flex items-center gap-2 text-gray-600 dark:text-gray-400">
                                        <User className="w-4 h-4" />
                                        Assigned to: {task.assignedTo.name}
                                    </div>
                                )}
                            </div>
                        </>
                    )}
                </div>

                {/* Actions */}
                <div className="p-4 border-t border-gray-200 dark:border-gray-700 flex gap-2">
                    {isEditing ? (
                        <>
                            <button
                                onClick={() => setIsEditing(false)}
                                className="flex-1 px-4 py-2 bg-gray-100 dark:bg-gray-700 rounded-lg text-sm"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={handleSave}
                                disabled={loading}
                                className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg text-sm disabled:opacity-50"
                            >
                                {loading ? 'Saving...' : 'Save'}
                            </button>
                        </>
                    ) : (
                        <>

                            <button
                                onClick={() => setIsEditing(true)}
                                className="flex-1 px-4 py-2 bg-gray-100 dark:bg-gray-700 rounded-lg text-sm flex items-center justify-center gap-2"
                            >
                                <Edit2 className="w-4 h-4" />
                                Edit
                            </button>
                            <button
                                onClick={() => {
                                    const nextStatus = task.status === 'COMPLETED' ? 'PENDING' : 'COMPLETED';
                                    onStatusChange(task.id, nextStatus);
                                    onClose();
                                }}
                                className={cn(
                                    "flex-1 px-4 py-2 rounded-lg text-sm flex items-center justify-center gap-2",
                                    task.status === 'COMPLETED'
                                        ? "bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700"
                                        : "bg-green-600 text-white"
                                )}
                            >
                                <CheckCircle className="w-4 h-4" />
                                {task.status === 'COMPLETED' ? 'Reopen' : 'Complete'}
                            </button>
                        </>
                    )}
                </div>
            </div>
        </div>
    );
}
