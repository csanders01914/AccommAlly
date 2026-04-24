'use client';

import { FileText, ChevronRight } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useRouter } from 'next/navigation';

export interface CaseSummary {
 id: string;
 clientName: string;
 program?: string;
 status: string;
 createdAt: string;
 caseNumber: string;
}

interface RecentCasesWidgetProps {
 cases: CaseSummary[];
}

export function RecentCasesWidget({ cases }: RecentCasesWidgetProps) {
 const router = useRouter();

 const formatDate = (iso: string) => {
 return new Date(iso).toLocaleDateString([], { month: 'short', day: 'numeric' });
 };

 const navToCase = (id: string) => {
 router.push(`/cases/${id}`);
 };

 return (
 <div className="flex flex-col h-full">
 <div className="widget-header">
 <h3 className="widget-header-title">
 <FileText className="w-4 h-4 text-primary-500" />
 Recent Cases
 </h3>
 </div>

 <div className="p-2 flex-1 overflow-y-auto space-y-2 custom-scrollbar">
 {cases.length > 0 ? cases.map(c => (
 <div
 key={c.id || Math.random()}
 onClick={() => c.id && navToCase(c.id)}
 className="flex items-center justify-between p-3 rounded-lg border border-border hover:border-primary-500/40 hover:bg-primary-50/30 transition-colors cursor-pointer group"
 >
 <div>
 <div className="font-medium text-text-primary text-sm group-hover:text-primary-600 transition-colors">
 {c.clientName}
 </div>
 <div className="text-[10px] text-text-muted mt-0.5 flex gap-2">
 <span className="font-mono bg-surface-raised px-1 rounded">{c.caseNumber}</span>
 {c.program && <span>• {c.program}</span>}
 </div>
 </div>
 <div className="text-right">
 <span className={cn(
 "inline-block px-2 py-0.5 rounded-full text-[10px] font-medium border",
 c.status === 'OPEN' ? 'bg-success/10 text-success border-success/20' :
 c.status === 'IN_PROGRESS' ? 'bg-primary-50 text-primary-600 border-primary-100' :
 'bg-surface-raised text-text-secondary border-border'
 )}>
 {c.status.replace('_', ' ')}
 </span>
 <div className="text-[10px] text-text-muted mt-1">{formatDate(c.createdAt)}</div>
 </div>
 </div>
 )) : (
 <div className="text-center py-8 text-text-muted text-sm">
 No recent cases
 </div>
 )}
 </div>

 <div className="widget-footer">
 <button
 onClick={() => router.push('/cases')}
 className="text-sm font-medium text-primary-600 hover:text-primary-700 flex items-center justify-center gap-1 w-full"
 >
 View All Cases <ChevronRight className="w-4 h-4" />
 </button>
 </div>
 </div>
 );
}
