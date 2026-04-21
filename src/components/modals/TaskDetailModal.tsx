'use client';

import { useState } from 'react';
import { X, Calendar, Briefcase, User, CheckCircle, Edit2 } from 'lucide-react';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';

interface Task {
    id: string;
    title: string;
    description: string | null;
    status: string;
    priority: string;
    category: string;
    dueDate: string | Date;
    assignedTo?: { id: string; name: string };
    case?: { id: string; caseNumber: string; clientName: string };
    createdById: string;
    createdAt: string | Date;
}

const STATUS_COLORS: Record<string, { bg: string; text: string }> = {
    PENDING: { bg: 'bg-amber-50', text: 'text-amber-700' },
    IN_PROGRESS: { bg: 'bg-blue-50', text: 'text-blue-700' },
    COMPLETED: { bg: 'bg-emerald-50', text: 'text-emerald-700' },
    CANCELLED: { bg: 'bg-[#F3F1EC]', text: 'text-[#8C8880]' },
};

const PRIORITY_DOT: Record<string, string> = {
    HIGH: 'bg-red-500',
    MEDIUM: 'bg-amber-400',
    LOW: 'bg-emerald-500',
};

const labelCls = 'block text-[11px] font-semibold uppercase tracking-[0.1em] text-[#8C8880] mb-1.5';
const fieldCls = 'w-full px-3 py-2 text-sm border border-[#E5E2DB] rounded-lg bg-[#ffffff] text-[#1C1A17] focus:outline-none focus:ring-2 focus:ring-[#0D9488]/30 focus:border-[#0D9488] transition-colors';

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
    const initialDate = task.dueDate ? new Date(task.dueDate) : new Date();
    const [dueDate, setDueDate] = useState(format(initialDate, 'yyyy-MM-dd'));
    const [assignedToId, setAssignedToId] = useState(task.assignedTo?.id || '');
    const [loading, setLoading] = useState(false);

    const handleSave = async () => {
        setLoading(true);
        try {
            const res = await fetch(`/api/tasks/${task.id}`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ title, description, priority, dueDate: new Date(dueDate).toISOString(), assignedToId: assignedToId || undefined })
            });
            if (res.ok) { setIsEditing(false); onUpdate(); onClose(); }
        } catch (error) { console.error('Failed to update task:', error); }
        finally { setLoading(false); }
    };

    const statusConfig = STATUS_COLORS[task.status] || STATUS_COLORS.PENDING;

    return (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={onClose}>
            <div className="bg-[#ffffff] rounded-xl shadow-[0_8px_40px_rgba(28,26,23,0.18)] border border-[#E5E2DB] w-full max-w-lg overflow-hidden" onClick={e => e.stopPropagation()}>
                <div className="flex items-center justify-between px-6 py-4 border-b border-[#E5E2DB]">
                    <div className="flex items-center gap-2.5">
                        <div className={cn('w-2.5 h-2.5 rounded-full', PRIORITY_DOT[task.priority] ?? 'bg-[#8C8880]')} />
                        <h3 className="text-base font-semibold text-[#1C1A17]">Task Details</h3>
                    </div>
                    <button onClick={onClose} className="p-1.5 hover:bg-[#F3F1EC] rounded-lg transition-colors">
                        <X className="w-4 h-4 text-[#8C8880]" />
                    </button>
                </div>

                <div className="p-6 space-y-4">
                    {isEditing ? (
                        <>
                            <div>
                                <label className={labelCls}>Title</label>
                                <input type="text" value={title} onChange={e => setTitle(e.target.value)} className={fieldCls} />
                            </div>
                            <div>
                                <label className={labelCls}>Description</label>
                                <textarea value={description} onChange={e => setDescription(e.target.value)} rows={3} className={cn(fieldCls, 'resize-none')} />
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className={labelCls}>Priority</label>
                                    <select value={priority} onChange={e => setPriority(e.target.value)} className={fieldCls}>
                                        <option value="HIGH">High</option>
                                        <option value="MEDIUM">Medium</option>
                                        <option value="LOW">Low</option>
                                    </select>
                                </div>
                                <div>
                                    <label className={labelCls}>Due Date</label>
                                    <input type="date" value={dueDate} onChange={e => setDueDate(e.target.value)} className={fieldCls} />
                                </div>
                                {users.length > 0 && (
                                    <div className="col-span-2">
                                        <label className={labelCls}>Assigned To</label>
                                        <select value={assignedToId} onChange={e => setAssignedToId(e.target.value)} className={fieldCls}>
                                            <option value="">Unassigned</option>
                                            {users.map(u => <option key={u.id} value={u.id}>{u.name}</option>)}
                                        </select>
                                    </div>
                                )}
                            </div>
                        </>
                    ) : (
                        <>
                            <div>
                                <h4 className="text-base font-semibold text-[#1C1A17]">{task.title}</h4>
                                {task.description && <p className="text-sm text-[#5C5850] mt-1">{task.description}</p>}
                            </div>
                            <div className="flex flex-wrap gap-2">
                                <span className={cn('text-xs px-2.5 py-1 rounded-full font-medium', statusConfig.bg, statusConfig.text)}>
                                    {task.status.replace('_', ' ')}
                                </span>
                                <span className="text-xs px-2.5 py-1 rounded-full bg-[#F3F1EC] text-[#5C5850]">
                                    {task.priority} Priority
                                </span>
                                <span className="text-xs px-2.5 py-1 rounded-full bg-[#F3F1EC] text-[#5C5850]">
                                    {task.category}
                                </span>
                            </div>
                            <div className="space-y-2 text-sm text-[#5C5850]">
                                <div className="flex items-center gap-2">
                                    <Calendar className="w-4 h-4 text-[#8C8880] flex-shrink-0" />
                                    Due: {format(new Date(task.dueDate), 'MMMM d, yyyy')}
                                </div>
                                {task.case && (
                                    <div className="flex items-center gap-2">
                                        <Briefcase className="w-4 h-4 text-[#8C8880] flex-shrink-0" />
                                        Case: {task.case.caseNumber} — {task.case.clientName}
                                    </div>
                                )}
                                {task.assignedTo && (
                                    <div className="flex items-center gap-2">
                                        <User className="w-4 h-4 text-[#8C8880] flex-shrink-0" />
                                        Assigned to: {task.assignedTo.name}
                                    </div>
                                )}
                            </div>
                        </>
                    )}
                </div>

                <div className="px-6 py-4 border-t border-[#E5E2DB] bg-[#F8F7F5] flex gap-2">
                    {isEditing ? (
                        <>
                            <button onClick={() => setIsEditing(false)} className="flex-1 px-4 py-2 text-sm font-medium text-[#5C5850] hover:bg-[#F3F1EC] border border-[#E5E2DB] bg-[#ffffff] rounded-lg transition-colors">
                                Cancel
                            </button>
                            <button onClick={handleSave} disabled={loading} className="flex-1 px-4 py-2 text-sm font-semibold text-[#ffffff] bg-[#0D9488] hover:bg-[#0F766E] rounded-lg disabled:opacity-50 transition-colors">
                                {loading ? 'Saving…' : 'Save'}
                            </button>
                        </>
                    ) : (
                        <>
                            <button onClick={() => setIsEditing(true)} className="flex-1 px-4 py-2 text-sm font-medium text-[#5C5850] hover:bg-[#F3F1EC] border border-[#E5E2DB] bg-[#ffffff] rounded-lg flex items-center justify-center gap-2 transition-colors">
                                <Edit2 className="w-4 h-4" /> Edit
                            </button>
                            <button
                                onClick={() => { onStatusChange(task.id, task.status === 'COMPLETED' ? 'PENDING' : 'COMPLETED'); onClose(); }}
                                className={cn('flex-1 px-4 py-2 text-sm font-semibold rounded-lg flex items-center justify-center gap-2 transition-colors',
                                    task.status === 'COMPLETED'
                                        ? 'bg-amber-50 text-amber-700 hover:bg-amber-100'
                                        : 'bg-[#0D9488] text-[#ffffff] hover:bg-[#0F766E]'
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
