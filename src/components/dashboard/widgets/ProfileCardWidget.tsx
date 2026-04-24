'use client';

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
 <div
 className="w-16 h-16 rounded-full flex items-center justify-center text-white text-2xl font-bold shadow-lg shrink-0"
 style={{ background: 'linear-gradient(135deg, var(--primary-500) 0%, var(--primary-700) 100%)' }}
 >
 {user.name.charAt(0)}
 </div>
 <div className="overflow-hidden">
 <h2 className="text-lg font-bold text-text-primary truncate">{user.name}</h2>
 <p className="text-sm text-text-muted truncate">{user.email}</p>
 <span className="inline-block mt-2 px-2 py-0.5 text-xs font-medium bg-primary-50 text-primary-700 rounded-full">
 {user.role}
 </span>
 </div>
 </div>

 <div className="grid grid-cols-2 gap-4 mt-auto border-t border-border pt-6">
 <div className="text-center p-3 bg-surface-raised rounded-lg">
 <div className="text-2xl font-bold text-text-primary">{stats.totalCases}</div>
 <div className="text-xs text-text-muted">Recent Cases</div>
 </div>
 <div className="text-center p-3 bg-surface-raised rounded-lg">
 <div className="text-2xl font-bold text-text-primary">{stats.openTasks}</div>
 <div className="text-xs text-text-muted">Open Tasks</div>
 </div>
 </div>
 </div>
 );
}
