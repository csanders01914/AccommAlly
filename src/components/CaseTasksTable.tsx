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

    // Column Filters
    const [columnFilters, setColumnFilters] = useState<Record<string, string>>({});

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

    // Removed default assignee filter to show all tasks by default

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

        // 5. Column Filters
        Object.entries(columnFilters).forEach(([colId, filterVal]) => {
            if (!filterVal) return;
            const q = filterVal.toLowerCase();
            result = result.filter(t => {
                switch (colId) {
                    case 'claimNumber': return t.case?.caseNumber?.toLowerCase().includes(q) ?? false;
                    case 'description': return t.title.toLowerCase().includes(q);
                    case 'type': return t.category.toLowerCase().includes(q);
                    case 'assignedTo': return t.assignee.name?.toLowerCase().includes(q) ?? false;
                    case 'createdBy': return t.createdBy?.name?.toLowerCase().includes(q) ?? false;
                    case 'dueDate': return format(new Date(t.dueDate), 'MM/dd/yyyy').includes(q);
                    default: return true;
                }
            });
        });

        setFilteredTasks(result);
    }, [tasks, searchQuery, showClosedTasks, reassignFrom, sortOrder, columnFilters]);

    const handleBulkComplete = async () => {
        if (selectedTaskIds.size === 0) return;
        if (!confirm(`Mark ${selectedTaskIds.size} tasks as complete?`)) return;

        for (const taskId of selectedTaskIds) {
            await onStatusChange(taskId, 'COMPLETED');
        }
        setSelectedTaskIds(new Set()); // Clear selection
    };

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

    const toggleSelectAll = () => {
        if (selectedTaskIds.size === filteredTasks.length && filteredTasks.length > 0) {
            setSelectedTaskIds(new Set());
        } else {
            setSelectedTaskIds(new Set(filteredTasks.map(t => t.id)));
        }
    };

    const renderCell = (task: ExtendedTask, colId: string) => {
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const taskDate = new Date(task.dueDate);
        taskDate.setHours(0, 0, 0, 0);

        const isOverdue = !['COMPLETED', 'CANCELLED'].includes(task.status) && taskDate < today;
        const isDueToday = !['COMPLETED', 'CANCELLED'].includes(task.status) && taskDate.getTime() === today.getTime();

        let primaryColor = "text-gray-900 dark:text-white";
        let secondaryColor = "text-gray-600 dark:text-gray-300";

        if (isOverdue) {
            primaryColor = "text-red-600 dark:text-red-400 font-medium";
            secondaryColor = "text-red-500 dark:text-red-400";
        } else if (isDueToday) {
            primaryColor = "text-blue-600 dark:text-blue-400 font-medium";
            secondaryColor = "text-blue-500 dark:text-blue-400";
        }

        switch (colId) {
            case 'select':
                return (
                    <input
                        type="checkbox"
                        checked={selectedTaskIds.has(task.id)}
                        onChange={(e) => {
                            const newSet = new Set(selectedTaskIds);
                            if (e.target.checked) {
                                newSet.add(task.id);
                                // Auto-select assignee in filter if not already set
                                if (!reassignFrom && task.assignee.id) {
                                    setReassignFrom(task.assignee.id);
                                }
                            } else {
                                newSet.delete(task.id);
                            }
                            setSelectedTaskIds(newSet);
                        }}
                        className="rounded bg-white dark:bg-gray-700 border-gray-300 dark:border-gray-600 text-blue-600 focus:ring-blue-500 dark:focus:ring-blue-600 dark:ring-offset-gray-800"
                    />
                );
            case 'edit':
                return (
                    <button onClick={() => onEdit(task)} className="text-blue-600 dark:text-blue-400 hover:text-blue-500 dark:hover:text-blue-300">
                        <Edit2 className="w-4 h-4" />
                    </button>
                );
            case 'claimNumber':
                return (
                    <div className={cn("font-medium", primaryColor)}>
                        {task.case?.caseNumber || 'N/A'}
                    </div>
                );
            case 'lob': return <span className="text-xs font-mono text-gray-500 dark:text-gray-400">AR</span>;
            case 'dueDate':
                return (
                    <div className={cn("flex items-center gap-1", primaryColor)}>
                        <Calendar className="w-3 h-3" />
                        {task.dueDate ? format(new Date(task.dueDate), 'MM/dd/yyyy') : '-'}
                    </div>
                );
            case 'description': return <span className={primaryColor}>{task.title}</span>;
            case 'type': return <span className={cn("text-xs uppercase", secondaryColor)}>{task.category.replace('_', ' ')}</span>;
            case 'assignedTo': return <span className={secondaryColor}>{task.assignee.name || 'Unassigned'}</span>;
            case 'createdBy': return <span className={secondaryColor}>{task.createdBy?.name || 'System'}</span>;
            default: return null;
        }
    };
    return (
        <div className="border border-gray-200 dark:border-gray-800 rounded-lg overflow-hidden flex flex-col h-full bg-white dark:bg-gray-900 shadow-sm transition-colors">
            {/* Header Controls */}
            <div className="bg-white dark:bg-gray-900 px-4 py-4 dark:text-white text-gray-900">
                {/* Reassign Row */}
                <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 mb-4">
                    <div className="flex items-center gap-2">
                        <span className="text-sm text-gray-500 dark:text-gray-400">Reassign From:</span>
                        <select
                            value={reassignFrom}
                            onChange={(e) => setReassignFrom(e.target.value)}
                            className="bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded text-sm px-2 py-1 text-gray-900 dark:text-white focus:ring-blue-500 focus:border-blue-500"
                        >
                            <option value="">Select User</option>
                            {users.map(u => <option key={u.id} value={u.id}>{u.name}</option>)}
                        </select>
                        <span className="text-sm ml-2 text-gray-500 dark:text-gray-400">Reassign to:</span>
                        <select
                            value={reassignTo}
                            onChange={(e) => setReassignTo(e.target.value)}
                            className="bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded text-sm px-2 py-1 text-gray-900 dark:text-white focus:ring-blue-500 focus:border-blue-500"
                        >
                            <option value="">Select User</option>
                            {users.map(u => <option key={u.id} value={u.id}>{u.name}</option>)}
                        </select>
                    </div>
                    <div className="flex items-center gap-2">
                        <div className="relative">
                            <Search className="w-4 h-4 absolute left-2 top-2 text-gray-400" />
                            <input
                                type="text"
                                placeholder="Search..."
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                className="pl-8 pr-4 py-1 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded text-sm w-48 text-gray-900 dark:text-white focus:ring-blue-500 focus:border-blue-500"
                            />
                        </div>
                    </div>
                    <div className="flex items-center gap-2">
                        {selectedTaskIds.size > 0 && (
                            <button
                                onClick={handleBulkComplete}
                                className="text-sm px-3 py-1 bg-green-600 text-white hover:bg-green-700 rounded transition-colors font-medium flex items-center gap-1"
                            >
                                <CheckCircle className="w-3.5 h-3.5" />
                                Complete
                            </button>
                        )}
                        <button onClick={handleBulkReassign} className="text-sm text-blue-600 dark:text-blue-400 hover:text-blue-500 dark:hover:text-blue-300 font-medium">Reassign</button>
                    </div>
                </div>
            </div>

            {/* Filters Row */}
            <div className="flex items-center justify-between border-t border-gray-100 dark:border-gray-800 pt-3">
                <div className="flex items-center gap-2 bg-gray-100 dark:bg-gray-800 p-1 rounded-lg">
                    <button
                        onClick={() => setShowClosedTasks(true)}
                        className={cn("px-3 py-1 rounded-md text-xs font-medium transition-all", showClosedTasks ? "bg-white dark:bg-blue-600 text-blue-600 dark:text-white shadow-sm ring-1 ring-black/5 dark:ring-0" : "text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white")}
                    >
                        Closed Tasks
                    </button>
                    <button
                        onClick={() => setShowClosedTasks(false)}
                        className={cn("px-3 py-1 rounded-md text-xs font-medium transition-all", !showClosedTasks ? "bg-white dark:bg-blue-600 text-blue-600 dark:text-white shadow-sm ring-1 ring-black/5 dark:ring-0" : "text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white")}
                    >
                        Open Tasks
                    </button>
                </div>
                <div className="flex gap-2">
                    <button onClick={() => { setSearchQuery(''); setReassignFrom(''); }} className="px-3 py-1 border border-gray-300 dark:border-gray-700 text-gray-500 dark:text-gray-400 text-xs rounded hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors">Clear Table Filters</button>
                    <button className="px-3 py-1 border border-gray-300 dark:border-gray-700 text-gray-500 dark:text-gray-400 text-xs rounded hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors">Save Column Preferences</button>
                </div>
            </div>
        </div>


                {/* Table */ }
    <div className="flex-1 overflow-auto bg-white dark:bg-gray-900">
        <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
            <table className="w-full text-sm text-left">
                <thead className="bg-gray-50 dark:bg-gray-950 text-gray-500 dark:text-gray-400 text-xs uppercase font-medium border-b border-gray-200 dark:border-gray-800 sticky top-0 z-10">
                    <tr>
                        <SortableContext items={columns.map(col => col.id)} strategy={horizontalListSortingStrategy}>
                            {columns.map(col => (
                                <SortableHeader
                                    key={col.id}
                                    id={col.id}
                                    onFilter={col.sortable || ['type', 'assignedTo', 'description', 'createdBy'].includes(col.id) ? (val) => setColumnFilters(prev => ({ ...prev, [col.id]: val })) : undefined}
                                    filterValue={columnFilters[col.id]}
                                >
                                    {col.id === 'select' ? (
                                        <div className="flex items-center justify-center w-full h-full py-1" onPointerDown={(e) => e.stopPropagation()} onClick={(e) => e.stopPropagation()}>
                                            <input
                                                type="checkbox"
                                                checked={filteredTasks.length > 0 && selectedTaskIds.size === filteredTasks.length}
                                                onChange={toggleSelectAll}
                                                className="rounded bg-white dark:bg-gray-700 border-gray-300 dark:border-gray-600 text-blue-600 focus:ring-blue-500 dark:focus:ring-blue-600 dark:ring-offset-gray-800"
                                            />
                                        </div>
                                    ) : (
                                        <div className="flex items-center gap-1 hover:text-gray-900 dark:hover:text-white cursor-pointer py-1" onClick={() => col.sortable && setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')}>
                                            {col.label}
                                            {col.sortable && <ArrowUpDown className="w-3 h-3" />}
                                        </div>
                                    )}
                                </SortableHeader>
                            ))
                            }
                        </SortableContext>
                    </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 dark:divide-gray-800 bg-white dark:bg-gray-900 text-gray-600 dark:text-gray-300">
                    {filteredTasks.length > 0 ? filteredTasks.map((task) => (
                        <tr key={task.id} className="hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors group">
                            {columns.map(col => (
                                <td key={col.id} className="px-4 py-3 border-gray-100 dark:border-gray-800">
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
    {/* Footer / Pagination Placeholder */ }
    <div className="bg-white dark:bg-gray-950 border-t border-gray-200 dark:border-gray-800 p-3 flex items-center justify-between text-xs text-gray-500 dark:text-gray-500">
        <div className="flex gap-2">
            <button className="px-2 py-1 rounded hover:bg-gray-100 dark:hover:bg-gray-800">&lt;</button>
            <button className="bg-blue-600 text-white px-2 py-1 rounded">1</button>
            <button className="px-2 py-1 rounded hover:bg-gray-100 dark:hover:bg-gray-800">&gt;</button>
        </div>
        <div>
            10 items per page
        </div>
        <div>
            1 - {filteredTasks.length} of {filteredTasks.length} items
        </div>
    </div>
            </div >
            );
}
