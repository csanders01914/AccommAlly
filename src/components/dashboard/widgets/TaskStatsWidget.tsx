'use client';

import { CheckSquare, Clock, AlertTriangle, ChevronRight } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useRouter } from 'next/navigation';
import { TaskListItem } from '@/components/UserDashboard'; // Re-use types if possible, or redefine

export interface TaskWidgetProps {
 tasks: any[]; // Using any for speed, but ideally strictly typed
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
 <div className="p-4 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between bg-gradient-to-r from-emerald-50/50 to-transparent dark:from-emerald-900/10">
 <h3 className="font-semibold text-gray-900 dark:text-white flex items-center gap-2">
 <CheckSquare className="w-4 h-4 text-emerald-600" />
 My Tasks
 </h3>
 {stats.overdue > 0 ? (
 <span className="flex items-center gap-1 text-xs font-medium text-red-600 bg-red-50 border border-red-100 px-2 py-0.5 rounded-full">
 <AlertTriangle className="w-3 h-3" />
 {stats.overdue} Overdue
 </span>
 ) : (
 <span className="text-xs font-medium px-2 py-1 bg-emerald-50 text-emerald-600 rounded-full">
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
 "group p-3 rounded-lg border transition-all cursor-pointer bg-white dark:bg-gray-800/50",
 overdue
 ? "border-red-200 dark:border-red-900/30 bg-red-50/20"
 : "border-gray-100 dark:border-gray-800 hover:border-emerald-200 dark:hover:border-emerald-800"
 )}
 onClick={() => {
 if (task.case?.id) {
 router.push(`/cases/${task.case.id}`);
 } else {
 // If no case link, maybe open tasks dashboard or do nothing
 // For now, doing nothing or maybe view all
 if (onViewAll) onViewAll();
 }
 }}
 >
 <div className="flex justify-between items-start mb-1">
 <span className={cn(
 "text-xs font-mono px-1.5 py-0.5 rounded",
 overdue ? "bg-red-100 text-red-700" : "bg-emerald-50 text-emerald-700 dark:text-emerald-400 dark:bg-emerald-900/20"
 )}>
 {task.case?.caseNumber || task.claimNumber || 'NO CASE'}
 </span>
 <span className={cn(
 "text-[10px] px-1.5 py-0.5 rounded border uppercase",
 task.priority === 'HIGH' || task.priority === 1 ? 'bg-red-50 text-red-600 border-red-100' :
 'bg-green-50 text-green-600 border-green-100'
 )}>
 {task.priority === 1 ? 'HIGH' : (task.priority || 'NORMAL')}
 </span>
 </div>
 <p className="text-sm font-medium text-gray-900 dark:text-white line-clamp-2 mt-1">
 {task.title || task.description}
 </p>
 <div className="flex items-center gap-2 mt-2 text-xs text-gray-500">
 <Clock className={cn("w-3 h-3", overdue && "text-red-500")} />
 <span className={cn(overdue && "text-red-600 font-medium")}>
 Due {formatDate(task.dueDate)}
 </span>
 </div>
 </div>
 );
 }) : (
 <div className="text-center py-8 text-gray-600 dark:text-gray-400 font-medium text-sm">
 No outstanding tasks
 </div>
 )}
 </div>

 <div className="p-3 border-t border-gray-100 dark:border-gray-800 mt-auto">
 <button
 onClick={onViewAll}
 className="text-sm font-medium text-emerald-600 hover:text-emerald-700 dark:text-emerald-400 flex items-center justify-center gap-1 w-full"
 >
 View All Tasks <ChevronRight className="w-4 h-4" />
 </button>
 </div>
 </div>
 );
}
