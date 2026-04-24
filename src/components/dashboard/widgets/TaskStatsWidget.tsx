'use client';

import { CheckSquare, Clock, AlertTriangle, ChevronRight } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useRouter } from 'next/navigation';

export interface TaskWidgetProps {
 tasks: any[];
 stats: {
 totalPending: number;
 overdue: number;
 };
 onViewAll?: () => void;
}

export function TaskStatsWidget({ tasks, stats, onViewAll }: TaskWidgetProps) {
 const router = useRouter();

 const formatDate = (date: string | Date) => {
 return new Date(date).toLocaleDateString([], { month: 'short', day: 'numeric' });
 };

 const isOverdue = (date: string | Date) => {
 return new Date(date) < new Date();
 };

 return (
 <div className="flex flex-col h-full">
 <div className="widget-header">
 <h3 className="widget-header-title">
 <CheckSquare className="w-4 h-4 text-primary-500" />
 My Tasks
 </h3>
 {stats.overdue > 0 ? (
 <span className="flex items-center gap-1 text-xs font-medium text-danger bg-danger/10 border border-danger/20 px-2 py-0.5 rounded-full">
 <AlertTriangle className="w-3 h-3" />
 {stats.overdue} Overdue
 </span>
 ) : (
 <span className="text-xs font-medium px-2 py-1 bg-primary-50 text-primary-600 rounded-full">
 {stats.totalPending} Pending
 </span>
 )}
 </div>

 <div className="p-2 flex-1 overflow-y-auto space-y-2 custom-scrollbar">
 {tasks.length > 0 ? tasks.map(task => {
 const overdue = isOverdue(task.dueDate);
 return (
 <div
 key={task.id}
 className={cn(
 "group p-3 rounded-lg border transition-all cursor-pointer bg-surface",
 overdue
 ? "border-danger/30 bg-danger/5"
 : "border-border hover:border-primary-500/40"
 )}
 onClick={() => {
 if (task.case?.id) {
 router.push(`/cases/${task.case.id}`);
 } else {
 if (onViewAll) onViewAll();
 }
 }}
 >
 <div className="flex justify-between items-start mb-1">
 <span className={cn(
 "text-xs font-mono px-1.5 py-0.5 rounded",
 overdue ? "bg-danger/10 text-danger" : "bg-primary-50 text-primary-600"
 )}>
 {task.case?.caseNumber || task.claimNumber || 'NO CASE'}
 </span>
 <span className={cn(
 "text-[10px] px-1.5 py-0.5 rounded border uppercase",
 task.priority === 'HIGH' || task.priority === 1
 ? 'bg-danger/10 text-danger border-danger/20'
 : 'bg-surface-raised text-text-secondary border-border'
 )}>
 {task.priority === 1 ? 'HIGH' : (task.priority || 'NORMAL')}
 </span>
 </div>
 <p className="text-sm font-medium text-text-primary line-clamp-2 mt-1">
 {task.title || task.description}
 </p>
 <div className="flex items-center gap-2 mt-2 text-xs text-text-secondary">
 <Clock className={cn("w-3 h-3", overdue && "text-danger")} />
 <span className={cn(overdue && "text-danger font-medium")}>
 Due {formatDate(task.dueDate)}
 </span>
 </div>
 </div>
 );
 }) : (
 <div className="text-center py-8 text-text-secondary font-medium text-sm">
 No outstanding tasks
 </div>
 )}
 </div>

 <div className="widget-footer">
 <button
 onClick={onViewAll}
 className="text-sm font-medium text-primary-600 hover:text-primary-700 flex items-center justify-center gap-1 w-full"
 >
 View All Tasks <ChevronRight className="w-4 h-4" />
 </button>
 </div>
 </div>
 );
}
