'use client';

import { useState, useEffect, useRef } from 'react';
import { X, CheckSquare } from 'lucide-react';

export type TaskPriority = 'LOW' | 'MEDIUM' | 'HIGH';
export type TaskCategory = 'MEETING' | 'DEADLINE' | 'FOLLOW_UP' | 'DOCUMENTATION' | 'OTHER';

export interface AddTaskData {
    title: string;
    description: string;
    dueDate: Date;
    priority: TaskPriority;
    category: TaskCategory;
    assignedToId?: string;
}

interface UserOption { id: string; name: string; }

interface AddTaskModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSubmit: (data: AddTaskData) => Promise<void>;
    users?: UserOption[];
}

const labelCls = 'block text-[11px] font-semibold uppercase tracking-[0.1em] text-[#8C8880] mb-1.5';
const inputCls = 'w-full px-3 py-2 text-sm border border-[#E5E2DB] rounded-lg bg-[#ffffff] text-[#1C1A17] placeholder-[#8C8880] focus:outline-none focus:ring-2 focus:ring-[#0D9488]/30 focus:border-[#0D9488] transition-colors';

export function AddTaskModal({ isOpen, onClose, onSubmit, users = [] }: AddTaskModalProps) {
    const [title, setTitle] = useState('');
    const [description, setDescription] = useState('');
    const [dueDate, setDueDate] = useState('');
    const [priority, setPriority] = useState<TaskPriority>('MEDIUM');
    const [category, setCategory] = useState<TaskCategory>('OTHER');
    const [assignedToId, setAssignedToId] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);
    const titleRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        if (isOpen) {
            setTitle(''); setDescription('');
            const tomorrow = new Date();
            tomorrow.setDate(tomorrow.getDate() + 1);
            setDueDate(tomorrow.toISOString().split('T')[0]);
            setPriority('MEDIUM'); setCategory('OTHER'); setAssignedToId(''); setIsSubmitting(false);
            setTimeout(() => titleRef.current?.focus(), 100);
        }
    }, [isOpen]);

    useEffect(() => {
        const handleEscape = (e: KeyboardEvent) => { if (e.key === 'Escape' && isOpen) onClose(); };
        document.addEventListener('keydown', handleEscape);
        return () => document.removeEventListener('keydown', handleEscape);
    }, [isOpen, onClose]);

    const handleSubmit = async () => {
        if (!title.trim() || !dueDate) return;
        try {
            setIsSubmitting(true);
            await onSubmit({ title: title.trim(), description: description.trim(), dueDate: new Date(dueDate), priority, category, assignedToId: assignedToId || undefined });
            onClose();
        } catch (error) {
            console.error('Error creating task:', error);
        } finally {
            setIsSubmitting(false);
        }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={(e) => e.target === e.currentTarget && onClose()}>
            <div className="bg-[#ffffff] rounded-xl shadow-[0_8px_40px_rgba(28,26,23,0.18)] border border-[#E5E2DB] w-full max-w-lg overflow-hidden flex flex-col" role="dialog" aria-modal="true" aria-labelledby="add-task-title">
                <div className="flex items-center justify-between px-6 py-4 border-b border-[#E5E2DB]">
                    <h2 id="add-task-title" className="text-base font-semibold text-[#1C1A17] flex items-center gap-2">
                        <CheckSquare className="w-4 h-4 text-[#0D9488]" />
                        Add New Task
                    </h2>
                    <button onClick={onClose} className="p-1.5 hover:bg-[#F3F1EC] rounded-lg transition-colors">
                        <X className="w-4 h-4 text-[#8C8880]" />
                    </button>
                </div>

                <div className="p-6 space-y-4">
                    <div>
                        <label className={labelCls}>Title <span className="text-red-500">*</span></label>
                        <input ref={titleRef} type="text" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="e.g. Follow up with claimant" className={inputCls} />
                    </div>
                    <div>
                        <label className={labelCls}>Description</label>
                        <textarea value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Additional details..." rows={3} className={`${inputCls} resize-none`} />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className={labelCls}>Due Date <span className="text-red-500">*</span></label>
                            <input type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} className={inputCls} />
                        </div>
                        <div>
                            <label className={labelCls}>Category</label>
                            <select value={category} onChange={(e) => setCategory(e.target.value as TaskCategory)} className={inputCls}>
                                <option value="FOLLOW_UP">Follow Up</option>
                                <option value="MEETING">Meeting</option>
                                <option value="DEADLINE">Deadline</option>
                                <option value="DOCUMENTATION">Documentation</option>
                                <option value="OTHER">Other</option>
                            </select>
                        </div>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className={labelCls}>Priority</label>
                            <select value={priority} onChange={(e) => setPriority(e.target.value as TaskPriority)} className={inputCls}>
                                <option value="LOW">Low</option>
                                <option value="MEDIUM">Medium</option>
                                <option value="HIGH">High</option>
                            </select>
                        </div>
                        {users.length > 0 && (
                            <div>
                                <label className={labelCls}>Assign To</label>
                                <select value={assignedToId} onChange={(e) => setAssignedToId(e.target.value)} className={inputCls}>
                                    <option value="">Current User (Me)</option>
                                    {users.map(u => <option key={u.id} value={u.id}>{u.name}</option>)}
                                </select>
                            </div>
                        )}
                    </div>
                </div>

                <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-[#E5E2DB] bg-[#F8F7F5]">
                    <button onClick={onClose} disabled={isSubmitting} className="px-4 py-2 text-sm font-medium text-[#5C5850] bg-[#ffffff] border border-[#E5E2DB] rounded-lg hover:bg-[#F3F1EC] transition-colors">
                        Cancel
                    </button>
                    <button onClick={handleSubmit} disabled={!title.trim() || !dueDate || isSubmitting} className="px-4 py-2 text-sm font-semibold text-[#ffffff] bg-[#0D9488] hover:bg-[#0F766E] rounded-lg disabled:opacity-50 disabled:cursor-not-allowed transition-colors">
                        {isSubmitting ? 'Creating…' : 'Create Task'}
                    </button>
                </div>
            </div>
        </div>
    );
}
