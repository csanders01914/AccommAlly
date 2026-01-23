'use client';

import { useState, useEffect } from 'react';
import {
    Search,
    ChevronDown,
    ArrowUpDown,
    Edit2,
    CheckCircle,
    User,
    Calendar,
    Clock,
    AlertCircle,
    X,
    Filter
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';
import { Task } from '@prisma/client';
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
    horizontalListSortingStrategy
} from '@dnd-kit/sortable';
import { SortableHeader } from '@/components/SortableHeader';

export type ExtendedTask = Task & {
    assignee: { id?: string; name: string | null };
    createdBy?: { id?: string; name: string | null };
    case?: { caseNumber: string }; // Optional if needed for display
};

interface CaseTasksTableProps {
    tasks: ExtendedTask[];
    users: { id: string; name: string }[];
    onStatusChange: (taskId: string, status: string) => Promise<void>;
    onReassign: (taskId: string, userId: string) => Promise<void>;
    onDelete: (taskId: string) => Promise<void>;
    onEdit: (task: ExtendedTask) => void;
}

export function CaseTasksTable({
    tasks,
    users,
    onStatusChange,
    onReassign,
    onDelete,
    onEdit
}: CaseTasksTableProps) {
    // State
    const [filteredTasks, setFilteredTasks] = useState<ExtendedTask[]>(tasks);
    const [searchQuery, setSearchQuery] = useState('');
    const [showClosedTasks, setShowClosedTasks] = useState(false);
    // Initialize reassignFrom to current assignee of first open task
    const [reassignFrom, setReassignFrom] = useState('');
    const [reassignTo, setReassignTo] = useState('');
    const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');
    const [selectedTaskIds, setSelectedTaskIds] = useState<Set<string>>(new Set());

    // Columns State for Reordering
    const [columns, setColumns] = useState([
        { id: 'select', label: '', sortable: false, width: 'w-10' },
        { id: 'edit', label: '', sortable: false, width: 'w-10' },
        { id: 'claimNumber', label: 'Claim Number', sortable: true },
        { id: 'lob', label: 'LOB', sortable: false },
        { id: 'dueDate', label: 'Due Date', sortable: true },
        { id: 'description', label: 'Task Description', sortable: false },
        { id: 'type', label: 'Task Type', sortable: false },
        { id: 'assignedTo', label: 'Assigned To', sortable: false },
        { id: 'createdBy', label: 'Created By', sortable: false },
    ]);

    // Dnd Sensors
    const sensors = useSensors(
        useSensor(PointerSensor),
        useSensor(KeyboardSensor)
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

    useEffect(() => {
        // Set default reassignFrom once tasks load
        if (tasks.length > 0 && !reassignFrom) {
            const defaultAssignee = tasks.find(t => t.status !== 'COMPLETED')?.assignee.id || tasks[0]?.assignee.id;
            if (defaultAssignee) setReassignFrom(defaultAssignee);
        }
    }, [tasks]);

    // Filter Logic
    useEffect(() => {
        let result = [...tasks];

        // 1. Open/Closed Filter - Default is OPEN (!showClosedTasks)
        if (showClosedTasks) {
            // Show ONLY Closed? Or Toggle to Show All/Closed?
            // Usually "Show Closed" means include them or switch view.
            // Screenshot had "Closed Tasks" [Toggle] "Open Tasks"
            // If toggle is "Closed Tasks" (active), show Closed. If "Open Tasks", show Open.
            result = result.filter(t => t.status === 'COMPLETED' || t.status === 'CANCELLED');
        } else {
            result = result.filter(t => t.status !== 'COMPLETED' && t.status !== 'CANCELLED');
        }


        // 2. Search
        if (searchQuery) {
            const q = searchQuery.toLowerCase();
            result = result.filter(t =>
                t.title.toLowerCase().includes(q) ||
                t.description?.toLowerCase().includes(q) ||
                t.assignee.name?.toLowerCase().includes(q)
            );
        }

        // 3. Reassign From
        if (reassignFrom) {
            result = result.filter(t => t.assignedToId === reassignFrom);
        }

        // 4. Sort
        result.sort((a, b) => {
            const dateA = new Date(a.dueDate).getTime();
            const dateB = new Date(b.dueDate).getTime();
            return sortOrder === 'asc' ? dateA - dateB : dateB - dateA;
        });

        setFilteredTasks(result);
    }, [tasks, searchQuery, showClosedTasks, reassignFrom, sortOrder]);

    const handleBulkReassign = async () => {
        if (!reassignTo || selectedTaskIds.size === 0) return;
        if (!confirm(`Reassign ${selectedTaskIds.size} tasks to the selected user?`)) return;

        // Execute sequentially or parallel
        for (const taskId of selectedTaskIds) {
            await onReassign(taskId, reassignTo);
        }
        setSelectedTaskIds(new Set()); // Clear selection
        setReassignTo(''); // Clear target
    };

    const renderCell = (task: ExtendedTask, colId: string) => {
        switch (colId) {
            case 'select':
                return (
                    <input
                        type="checkbox"
                        checked={selectedTaskIds.has(task.id)}
                        onChange={(e) => {
                            const newSet = new Set(selectedTaskIds);
                            if (e.target.checked) newSet.add(task.id);
                            else newSet.delete(task.id);
                            setSelectedTaskIds(newSet);
                        }}
                        className="rounded bg-gray-700 border-gray-600 text-blue-600 focus:ring-blue-500 dark:focus:ring-blue-600 dark:ring-offset-gray-800"
                    />
                );
            case 'edit':
                return (
                    <button onClick={() => onEdit(task)} className="text-blue-400 hover:text-blue-300">
                        <Edit2 className="w-4 h-4" />
                    </button>
                );
            case 'claimNumber':
                return (
                    <div className="font-medium text-white">
                        {task.case?.caseNumber || 'N/A'}
                    </div>
                );
            case 'lob': return <span className="text-xs font-mono text-gray-400">AR</span>;
            case 'dueDate':
                return (
                    <div className={cn("flex items-center gap-1", new Date(task.dueDate) < new Date() && task.status !== 'COMPLETED' ? "text-red-400" : "text-gray-400")}>
                        <Calendar className="w-3 h-3" />
                        {task.dueDate ? format(new Date(task.dueDate), 'MM/dd/yyyy') : '-'}
                    </div>
                );
            case 'description': return <span className="text-white">{task.title}</span>;
            case 'type': return <span className="text-xs uppercase text-gray-500">{task.category.replace('_', ' ')}</span>;
            case 'assignedTo': return <span className="text-gray-300">{task.assignee.name || 'Unassigned'}</span>;
            case 'createdBy': return <span className="text-gray-400">{task.createdBy?.name || 'System'}</span>;
            default: return null;
        }
    };
    return (
        <div className="border border-gray-800 rounded-lg overflow-hidden flex flex-col h-full bg-gray-900 shadow-sm">
            {/* Header Controls */}
            <div className="bg-gray-900 text-white p-4">
                {/* Reassign Row */}
                <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 mb-4">
                    <div className="flex items-center gap-2">
                        <span className="text-sm text-gray-400">Reassign From:</span>
                        <select
                            value={reassignFrom}
                            onChange={(e) => setReassignFrom(e.target.value)}
                            className="bg-gray-800 border-gray-700 rounded text-sm px-2 py-1 text-white focus:ring-blue-500 focus:border-blue-500"
                        >
                            <option value="">Select User</option>
                            {users.map(u => <option key={u.id} value={u.id}>{u.name}</option>)}
                        </select>
                        <span className="text-sm ml-2 text-gray-400">Reassign to:</span>
                        <select
                            value={reassignTo}
                            onChange={(e) => setReassignTo(e.target.value)}
                            className="bg-gray-800 border-gray-700 rounded text-sm px-2 py-1 text-white focus:ring-blue-500 focus:border-blue-500"
                        >
                            <option value="">Select User</option>
                            {users.map(u => <option key={u.id} value={u.id}>{u.name}</option>)}
                        </select>
                    </div>
                    <div className="flex items-center gap-2">
                        <div className="relative">
                            <Search className="w-4 h-4 absolute left-2 top-2 text-gray-500" />
                            <input
                                type="text"
                                placeholder="Search..."
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                className="pl-8 pr-4 py-1 bg-gray-800 border-gray-700 rounded text-sm w-48 text-white focus:ring-blue-500 focus:border-blue-500"
                            />
                        </div>
                        <button onClick={handleBulkReassign} className="text-sm text-blue-400 hover:text-blue-300 font-medium">Reassign</button>
                    </div>
                </div>

                {/* Filters Row */}
                <div className="flex items-center justify-between border-t border-gray-800 pt-3">
                    <div className="flex items-center gap-2 bg-gray-800 p-1 rounded-lg">
                        <button
                            onClick={() => setShowClosedTasks(true)}
                            className={cn("px-3 py-1 rounded-md text-xs font-medium transition-all", showClosedTasks ? "bg-blue-600 text-white shadow-sm" : "text-gray-400 hover:text-white")}
                        >
                            Closed Tasks
                        </button>
                        <button
                            onClick={() => setShowClosedTasks(false)}
                            className={cn("px-3 py-1 rounded-md text-xs font-medium transition-all", !showClosedTasks ? "bg-blue-600 text-white shadow-sm" : "text-gray-400 hover:text-white")}
                        >
                            Open Tasks
                        </button>
                    </div>
                    <div className="flex gap-2">
                        <button onClick={() => { setSearchQuery(''); setReassignFrom(''); }} className="px-3 py-1 border border-gray-700 text-gray-400 text-xs rounded hover:bg-gray-700 transition-colors">Clear Table Filters</button>
                        <button className="px-3 py-1 border border-gray-700 text-gray-400 text-xs rounded hover:bg-gray-700 transition-colors">Save Column Preferences</button>
                    </div>
                </div>
            </div>

            {/* Table */}
            <div className="flex-1 overflow-auto bg-gray-900">
                <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
                    <table className="w-full text-sm text-left">
                        <thead className="bg-gray-950 text-gray-400 text-xs uppercase font-medium border-b border-gray-800 sticky top-0 z-10">
                            <tr>
                                <SortableContext items={columns.map(col => col.id)} strategy={horizontalListSortingStrategy}>
                                    {columns.map(col => (
                                        <SortableHeader key={col.id} id={col.id}>
                                            <div className="flex items-center gap-1 hover:text-white cursor-pointer py-1" onClick={() => col.sortable && setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')}>
                                                {col.label}
                                                {col.sortable && <ArrowUpDown className="w-3 h-3" />}
                                            </div>
                                        </SortableHeader>
                                    ))}
                                </SortableContext>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-800 bg-gray-900 text-gray-300">
                            {filteredTasks.length > 0 ? filteredTasks.map((task) => (
                                <tr key={task.id} className="hover:bg-gray-800 transition-colors group">
                                    {columns.map(col => (
                                        <td key={col.id} className="px-4 py-3 border-gray-800">
                                            {renderCell(task, col.id)}
                                        </td>
                                    ))}
                                </tr>
                            )) : (
                                <tr><td colSpan={columns.length} className="px-4 py-8 text-center text-gray-500">No tasks found</td></tr>
                            )}
                        </tbody>
                    </table>
                </DndContext>
            </div>
            {/* Footer / Pagination Placeholder */}
            <div className="bg-gray-950 border-t border-gray-800 p-3 flex items-center justify-between text-xs text-gray-500">
                <div className="flex gap-2">
                    <button className="px-2 py-1 rounded hover:bg-gray-800">&lt;</button>
                    <button className="bg-blue-600 text-white px-2 py-1 rounded">1</button>
                    <button className="px-2 py-1 rounded hover:bg-gray-800">&gt;</button>
                </div>
                <div>
                    10 items per page
                </div>
                <div>
                    1 - {filteredTasks.length} of {filteredTasks.length} items
                </div>
            </div>
        </div>
    );
}
