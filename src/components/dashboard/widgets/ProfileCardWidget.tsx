'use client';

import { cn } from '@/lib/utils';
import { User } from 'lucide-react';

interface ProfileCardProps {
 user: {
 name: string;
 email: string;
 role: string;
 };
 stats: {
 totalCases: number;
 openTasks: number;
 };
}

export function ProfileCardWidget({ user, stats }: ProfileCardProps) {
 return (
 <div className="flex flex-col h-full p-6">
 <div className="flex items-center gap-4 mb-6">
 <div className="w-16 h-16 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-white text-2xl font-bold shadow-lg shrink-0">
 {user.name.charAt(0)}
 </div>
 <div className="overflow-hidden">
 <h2 className="text-lg font-bold text-gray-900 dark:text-white truncate">{user.name}</h2>
 <p className="text-sm text-gray-500 dark:text-gray-400 truncate">{user.email}</p>
 <span className="inline-block mt-2 px-2 py-0.5 text-xs font-medium bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 rounded-full">
 {user.role}
 </span>
 </div>
 </div>

 <div className="grid grid-cols-2 gap-4 mt-auto border-t border-gray-100/50 dark:border-gray-800/50 pt-6">
 <div className="text-center p-3 bg-gray-50/50 dark:bg-gray-800/50 rounded-lg">
 <div className="text-2xl font-bold text-gray-900 dark:text-white">{stats.totalCases}</div>
 <div className="text-xs text-gray-500 dark:text-gray-400">Recent Cases</div>
 </div>
 <div className="text-center p-3 bg-gray-50/50 dark:bg-gray-800/50 rounded-lg">
 <div className="text-2xl font-bold text-gray-900 dark:text-white">
 {stats.openTasks}
 </div>
 <div className="text-xs text-gray-500 dark:text-gray-400">Open Tasks</div>
 </div>
 </div>
 </div>
 );
}
