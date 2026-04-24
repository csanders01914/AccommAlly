'use client';

import { useState, useEffect } from 'react';
import {
 Search,
 ArrowUpDown,
 Edit2,
 CheckCircle,
 Calendar,
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
 case?: { caseNumber: string };
};

interface CaseTasksTableProps {
 tasks: ExtendedTask[];
 users: { id: string; name: string }[];
 onStatusChange: (taskId: string, status: string) => Promise<void>;
 onReassign: (taskId: string, userId: string) => Promise<void>;
 onDelete: (taskId: string) => Promise<void>;
 onEdit: (task: ExtendedTask) => void;
}

const selectCls = 'form-input py-1.5';

export function CaseTasksTable({
 tasks,
 users,
 onStatusChange,
 onReassign,
 onDelete,
 onEdit
}: CaseTasksTableProps) {
 const [filteredTasks, setFilteredTasks] = useState<ExtendedTask[]>(tasks);
 const [searchQuery, setSearchQuery] = useState('');
 const [showClosedTasks, setShowClosedTasks] = useState(false);
 const [reassignFrom, setReassignFrom] = useState('');
 const [reassignTo, setReassignTo] = useState('');
 const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');
 const [selectedTaskIds, setSelectedTaskIds] = useState<Set<string>>(new Set());
 const [columns, setColumns] = useState([
 { id: 'select', label: '', sortable: false },
 { id: 'edit', label: '', sortable: false },
 { id: 'claimNumber', label: 'Claim Number', sortable: true },
 { id: 'lob', label: 'LOB', sortable: false },
 { id: 'dueDate', label: 'Due Date', sortable: true },
 { id: 'description', label: 'Task Description', sortable: false },
 { id: 'type', label: 'Task Type', sortable: false },
 { id: 'assignedTo', label: 'Assigned To', sortable: false },
 { id: 'createdBy', label: 'Created By', sortable: false },
 ]);
 const [columnFilters, setColumnFilters] = useState<Record<string, string>>({});

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
 let result = [...tasks];

 if (showClosedTasks) {
 result = result.filter(t => t.status === 'COMPLETED' || t.status === 'CANCELLED');
 } else {
 result = result.filter(t => t.status !== 'COMPLETED' && t.status !== 'CANCELLED');
 }

 if (searchQuery) {
 const q = searchQuery.toLowerCase();
 result = result.filter(t =>
 t.title.toLowerCase().includes(q) ||
 t.description?.toLowerCase().includes(q) ||
 t.assignee.name?.toLowerCase().includes(q)
 );
 }

 if (reassignFrom) {
 result = result.filter(t => t.assignedToId === reassignFrom);
 }

 result.sort((a, b) => {
 const dateA = new Date(a.dueDate).getTime();
 const dateB = new Date(b.dueDate).getTime();
 return sortOrder === 'asc' ? dateA - dateB : dateB - dateA;
 });

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
 setSelectedTaskIds(new Set());
 };

 const handleBulkReassign = async () => {
 if (!reassignTo || selectedTaskIds.size === 0) return;
 if (!confirm(`Reassign ${selectedTaskIds.size} tasks to the selected user?`)) return;
 for (const taskId of selectedTaskIds) {
 await onReassign(taskId, reassignTo);
 }
 setSelectedTaskIds(new Set());
 setReassignTo('');
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

 let primaryColor = 'text-text-primary';
 let secondaryColor = 'text-text-secondary';

 if (isOverdue) {
 primaryColor = 'text-red-600 font-medium';
 secondaryColor = 'text-red-500';
 } else if (isDueToday) {
 primaryColor = 'text-primary-500 font-medium';
 secondaryColor = 'text-primary-500';
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
 if (!reassignFrom && task.assignee.id) {
 setReassignFrom(task.assignee.id);
 }
 } else {
 newSet.delete(task.id);
 }
 setSelectedTaskIds(newSet);
 }}
 className="rounded border-border-strong text-primary-500 focus:ring-[#0D9488]"
 />
 );
 case 'edit':
 return (
 <button onClick={() => onEdit(task)} className="text-border-strong hover:text-primary-500 transition-colors">
 <Edit2 className="w-4 h-4" />
 </button>
 );
 case 'claimNumber':
 return <div className={cn('font-mono text-sm font-medium', primaryColor)}>{task.case?.caseNumber || 'N/A'}</div>;
 case 'lob':
 return <span className="text-xs font-mono text-text-muted">AR</span>;
 case 'dueDate':
 return (
 <div className={cn('flex items-center gap-1', primaryColor)}>
 <Calendar className="w-3 h-3" />
 {task.dueDate ? format(new Date(task.dueDate), 'MM/dd/yyyy') : '-'}
 </div>
 );
 case 'description':
 return <span className={primaryColor}>{task.title}</span>;
 case 'type':
 return <span className={cn('text-xs uppercase font-medium text-primary-500', secondaryColor === 'text-text-secondary' ? 'text-primary-500' : secondaryColor)}>{task.category.replace('_', ' ')}</span>;
 case 'assignedTo':
 return <span className={secondaryColor}>{task.assignee.name || 'Unassigned'}</span>;
 case 'createdBy':
 return <span className={secondaryColor}>{task.createdBy?.name || 'System'}</span>;
 default:
 return null;
 }
 };

 return (
 <div className="border border-border rounded-xl overflow-hidden flex flex-col bg-surface shadow-[0_1px_3px_rgba(28,26,23,0.06)]">
 {/* Reassign / Search bar */}
 <div className="px-4 py-3 bg-background border-b border-border flex flex-col md:flex-row items-start md:items-center justify-between gap-3">
 <div className="flex items-center gap-2 flex-wrap">
 <span className="text-xs font-semibold uppercase tracking-[0.08em] text-text-muted">Reassign From:</span>
 <select value={reassignFrom} onChange={(e) => setReassignFrom(e.target.value)} className={selectCls}>
 <option value="">Select User</option>
 {users.map(u => <option key={u.id} value={u.id}>{u.name}</option>)}
 </select>
 <span className="text-xs font-semibold uppercase tracking-[0.08em] text-text-muted">Reassign to:</span>
 <select value={reassignTo} onChange={(e) => setReassignTo(e.target.value)} className={selectCls}>
 <option value="">Select User</option>
 {users.map(u => <option key={u.id} value={u.id}>{u.name}</option>)}
 </select>
 </div>
 <div className="flex items-center gap-2 ml-auto">
 <div className="relative">
 <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-text-muted" />
 <input
 type="text"
 placeholder="Search..."
 value={searchQuery}
 onChange={(e) => setSearchQuery(e.target.value)}
 className="pl-8 pr-3 py-1.5 border border-border rounded-lg text-sm bg-surface text-text-primary placeholder-text-muted w-48 focus:outline-none focus:ring-2 focus:ring-primary-500/30 focus:border-primary-500 transition-colors"
 />
 </div>
 {selectedTaskIds.size > 0 && (
 <button
 onClick={handleBulkComplete}
 className="text-sm px-3 py-1.5 bg-primary-500 text-white hover:bg-primary-600 rounded-lg transition-colors font-medium flex items-center gap-1"
 >
 <CheckCircle className="w-3.5 h-3.5" />
 Complete
 </button>
 )}
 <button
 onClick={handleBulkReassign}
 disabled={!reassignTo || selectedTaskIds.size === 0}
 className={cn(
 'text-sm font-semibold px-3 py-1.5 rounded-lg transition-colors',
 reassignTo && selectedTaskIds.size > 0
 ? 'text-primary-500 hover:text-primary-600'
 : 'text-border-strong cursor-not-allowed'
 )}
 >
 Reassign
 </button>
 </div>
 </div>

 {/* Open / Closed toggle + controls */}
 <div className="flex items-center justify-between px-4 py-2.5 border-b border-border">
 <div className="flex items-center gap-1 bg-surface-raised p-1 rounded-lg">
 <button
 onClick={() => setShowClosedTasks(true)}
 className={cn(
 'px-3 py-1 rounded-md text-xs font-medium transition-all',
 showClosedTasks
 ? 'bg-surface text-text-primary shadow-sm ring-1 ring-black/5'
 : 'text-text-muted hover:text-text-primary'
 )}
 >
 Closed Tasks
 </button>
 <button
 onClick={() => setShowClosedTasks(false)}
 className={cn(
 'px-3 py-1 rounded-md text-xs font-medium transition-all',
 !showClosedTasks
 ? 'bg-surface text-text-primary shadow-sm ring-1 ring-black/5'
 : 'text-text-muted hover:text-text-primary'
 )}
 >
 Open Tasks
 </button>
 </div>
 <div className="flex gap-2">
 <button
 onClick={() => { setSearchQuery(''); setReassignFrom(''); setColumnFilters({}); }}
 className="px-3 py-1 border border-border text-text-secondary text-xs rounded-lg hover:bg-surface-raised bg-surface transition-colors"
 >
 Clear Table Filters
 </button>
 <button className="px-3 py-1 border border-border text-text-secondary text-xs rounded-lg hover:bg-surface-raised bg-surface transition-colors">
 Save Column Preferences
 </button>
 </div>
 </div>

 {/* Table */}
 <div className="flex-1 overflow-auto">
 <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
 <table className="w-full text-sm text-left">
 <thead className="bg-background border-b border-border text-[11px] font-semibold uppercase tracking-[0.08em] text-text-muted sticky top-0 z-10">
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
 className="rounded border-border-strong text-primary-500 focus:ring-[#0D9488]"
 />
 </div>
 ) : (
 <div
 className="flex items-center gap-1 hover:text-text-primary cursor-pointer py-1"
 onClick={() => col.sortable && setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')}
 >
 {col.label}
 {col.sortable && <ArrowUpDown className="w-3 h-3" />}
 </div>
 )}
 </SortableHeader>
 ))}
 </SortableContext>
 </tr>
 </thead>
 <tbody className="divide-y divide-[#F3F1EC] bg-surface text-text-secondary">
 {filteredTasks.length > 0 ? filteredTasks.map((task) => (
 <tr key={task.id} className="hover:bg-background transition-colors">
 {columns.map(col => (
 <td key={col.id} className="px-4 py-3">
 {renderCell(task, col.id)}
 </td>
 ))}
 </tr>
 )) : (
 <tr>
 <td colSpan={columns.length} className="px-4 py-8 text-center text-text-muted">
 No tasks found
 </td>
 </tr>
 )}
 </tbody>
 </table>
 </DndContext>
 </div>

 {/* Footer / Pagination */}
 <div className="bg-background border-t border-border px-4 py-2.5 flex items-center justify-between text-xs text-text-muted">
 <div className="flex gap-1">
 <button className="px-2 py-1 rounded-md border border-border bg-surface hover:bg-surface-raised transition-colors">&lt;</button>
 <button className="bg-primary-500 text-white px-2 py-1 rounded-md">1</button>
 <button className="px-2 py-1 rounded-md border border-border bg-surface hover:bg-surface-raised transition-colors">&gt;</button>
 </div>
 <div>10 items per page</div>
 <div>1 – {filteredTasks.length} of {filteredTasks.length} items</div>
 </div>
 </div>
 );
}
