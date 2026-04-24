'use client';

import { useEffect, useState } from 'react';
import { Loader2, Calendar, Clock, AlertCircle } from 'lucide-react';
import { format } from 'date-fns';

interface ComplianceData {
 initialResponseLag: number;
 avgCaseDuration: number;
 expiringAccommodations: {
 id: string;
 caseNumber: string;
 clientName: string;
 type: string;
 reviewDate: string;
 }[];
}

export function ComplianceTab() {
 const [data, setData] = useState<ComplianceData | null>(null);
 const [loading, setLoading] = useState(true);

 useEffect(() => {
 fetch('/api/reports?type=compliance')
 .then(res => res.json())
 .then(setData)
 .finally(() => setLoading(false));
 }, []);

 if (loading) {
 return <div className="flex justify-center p-8"><Loader2 className="animate-spin h-8 w-8 text-primary-500" /></div>;
 }

 if (!data) return <div>Failed to load data</div>;

 return (
 <div className="space-y-6 animate-in fade-in duration-500">
 <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
 {/* Initial Response Lag */}
 <div className="bg-surface p-6 rounded-xl border border-border shadow-sm">
 <div className="flex items-center justify-between">
 <div>
 <p className="text-sm font-medium text-text-secondary">Initial Response Lag</p>
 <h3 className="text-2xl font-bold mt-2 text-text-primary">{data.initialResponseLag} <span className="text-sm font-normal text-text-muted">days</span></h3>
 <p className="text-xs text-text-muted mt-1">Avg time to first interactive dialogue</p>
 </div>
 <div className="p-3 bg-blue-100/50 dark:bg-blue-900/20 rounded-full">
 <Clock className="h-6 w-6 text-blue-600 dark:text-blue-400" />
 </div>
 </div>
 </div>

 {/* Avg Case Duration */}
 <div className="bg-surface p-6 rounded-xl border border-border shadow-sm">
 <div className="flex items-center justify-between">
 <div>
 <p className="text-sm font-medium text-text-secondary">Avg Case Duration</p>
 <h3 className="text-2xl font-bold mt-2 text-text-primary">{data.avgCaseDuration} <span className="text-sm font-normal text-text-muted">days</span></h3>
 <p className="text-xs text-text-muted mt-1">Request to closure</p>
 </div>
 <div className="p-3 bg-purple-100/50 dark:bg-purple-900/20 rounded-full">
 <Calendar className="h-6 w-6 text-purple-600 dark:text-purple-400" />
 </div>
 </div>
 </div>
 </div>

 {/* Recertification Calendar */}
 <div className="bg-surface rounded-xl border border-border shadow-sm overflow-hidden">
 <div className="p-6 border-b border-border">
 <h3 className="text-lg font-semibold flex items-center gap-2">
 <AlertCircle className="h-5 w-5 text-amber-500" />
 Recertification Calendar
 </h3>
 <p className="text-sm text-text-muted">Accommodations expiring in the next 6 months</p>
 </div>
 <div className="overflow-x-auto">
 <table className="w-full text-left text-sm">
 <thead className="bg-white/20 /50 text-text-secondary border-b border-border">
 <tr>
 <th className="px-6 py-3 font-medium">Review Date</th>
 <th className="px-6 py-3 font-medium">Case Number</th>
 <th className="px-6 py-3 font-medium">Client</th>
 <th className="px-6 py-3 font-medium">Type</th>
 </tr>
 </thead>
 <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
 {data.expiringAccommodations.length > 0 ? (
 data.expiringAccommodations.map((item) => (
 <tr key={item.id} className="hover:bg-white/20 dark:hover:bg-gray-800/30 transition-colors">
 <td className="px-6 py-4 font-medium text-text-primary">
 {format(new Date(item.reviewDate), 'MMM d, yyyy')}
 </td>
 <td className="px-6 py-4 text-text-muted">{item.caseNumber}</td>
 <td className="px-6 py-4 text-text-muted">{item.clientName}</td>
 <td className="px-6 py-4">
 <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100/50 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300">
 {item.type.replace(/_/g, ' ')}
 </span>
 </td>
 </tr>
 ))
 ) : (
 <tr>
 <td colSpan={4} className="px-6 py-8 text-center text-text-muted">
 No upcoming recertifications found.
 </td>
 </tr>
 )}
 </tbody>
 </table>
 </div>
 </div>
 </div>
 );
}
