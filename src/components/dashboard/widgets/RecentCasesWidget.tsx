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
            <div className="p-4 border-b border-gray-100 dark:border-gray-800 flex items-center justify-between bg-gradient-to-r from-blue-50 to-transparent dark:from-blue-900/10">
                <h3 className="font-semibold text-gray-900 dark:text-white flex items-center gap-2">
                    <FileText className="w-4 h-4 text-blue-600" />
                    Recent Cases
                </h3>
            </div>

            <div className="p-2 flex-1 overflow-y-auto space-y-2 custom-scrollbar">
                {cases.length > 0 ? cases.map(c => (
                    <div
                        key={c.id || Math.random()}
                        onClick={() => c.id && navToCase(c.id)}
                        className="flex items-center justify-between p-3 rounded-lg border border-gray-100 dark:border-gray-800 hover:border-blue-200 dark:hover:border-blue-800 hover:bg-blue-50/30 dark:hover:bg-blue-900/10 transition-colors cursor-pointer group"
                    >
                        <div>
                            <div className="font-medium text-gray-900 dark:text-white text-sm group-hover:text-blue-600 transition-colors">
                                {c.clientName}
                            </div>
                            <div className="text-[10px] text-gray-500 dark:text-gray-400 mt-0.5 flex gap-2">
                                <span className="font-mono bg-gray-100 dark:bg-gray-800 px-1 rounded">{c.caseNumber}</span>
                                {c.program && <span>• {c.program}</span>}
                            </div>
                        </div>
                        <div className="text-right">
                            <span className={cn(
                                "inline-block px-2 py-0.5 rounded-full text-[10px] font-medium border",
                                c.status === 'OPEN' ? 'bg-green-50 text-green-700 border-green-200' :
                                    c.status === 'IN_PROGRESS' ? 'bg-blue-50 text-blue-700 border-blue-200' :
                                        'bg-gray-100 text-gray-600 border-gray-200'
                            )}>
                                {c.status.replace('_', ' ')}
                            </span>
                            <div className="text-[10px] text-gray-400 mt-1">{formatDate(c.createdAt)}</div>
                        </div>
                    </div>
                )) : (
                    <div className="text-center py-8 text-gray-400 text-sm">
                        No recent cases
                    </div>
                )}
            </div>

            <div className="p-3 border-t border-gray-100 dark:border-gray-800 mt-auto">
                <button
                    onClick={() => router.push('/cases')}
                    className="text-sm font-medium text-blue-600 hover:text-blue-700 dark:text-blue-400 flex items-center justify-center gap-1 w-full"
                >
                    View All Cases <ChevronRight className="w-4 h-4" />
                </button>
            </div>
        </div>
    );
}
