'use client';

import { useEffect, useState } from 'react';
import { Loader2, Activity, FileText, CheckCircle } from 'lucide-react';
import {
 BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer
} from 'recharts';
import { format } from 'date-fns';

interface WorkflowData {
 interactions: { name: string; value: number }[];
 pendingMedical: {
 caseNumber: string;
 clientName: string;
 lastUpdated: string;
 }[];
 outcomeStats: {
 closedRatio: number;
 };
}

export function WorkflowTab() {
 const [data, setData] = useState<WorkflowData | null>(null);
 const [loading, setLoading] = useState(true);

 useEffect(() => {
 fetch('/api/reports?type=workflow')
 .then(res => res.json())
 .then(setData)
 .finally(() => setLoading(false));
 }, []);

 if (loading) return <div className="flex justify-center p-8"><Loader2 className="animate-spin h-8 w-8 text-primary-500" /></div>;
 if (!data) return <div>Failed to load data</div>;

 return (
 <div className="space-y-6 animate-in fade-in duration-500">

 <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
 {/* Interactions Summary */}
 <div className="bg-surface p-6 rounded-xl border border-border shadow-sm">
 <h3 className="text-lg font-semibold mb-4 flex items-center gap-2 text-text-primary">
 <Activity className="h-5 w-5 text-primary-500" />
 Interactions Log Summary
 </h3>
 <p className="text-sm text-text-muted mb-4">Total touchpoints across all cases</p>
 <div className="h-[250px] w-full">
 <ResponsiveContainer width="100%" height="100%">
 <BarChart data={data.interactions}>
 <CartesianGrid strokeDasharray="3 3" vertical={false} />
 <XAxis dataKey="name" fontSize={12} tickLine={false} axisLine={false} />
 <YAxis fontSize={12} tickLine={false} axisLine={false} />
 <Tooltip cursor={{ fill: '#f3f4f6' }} />
 <Bar dataKey="value" fill="#6366f1" radius={[4, 4, 0, 0]} barSize={60} />
 </BarChart>
 </ResponsiveContainer>
 </div>
 </div>

 {/* Outcome Effectiveness */}
 <div className="bg-surface p-6 rounded-xl border border-border shadow-sm flex flex-col justify-center items-center text-center">
 <div className="p-4 bg-green-100/50 dark:bg-green-900/30 rounded-full mb-4">
 <CheckCircle className="h-8 w-8 text-green-600 dark:text-green-400" />
 </div>
 <h3 className="text-3xl font-bold text-text-primary">{data.outcomeStats.closedRatio}%</h3>
 <p className="text-sm font-medium text-text-muted mt-2">Case Closure Ratio</p>
 <p className="text-xs text-text-muted mt-1 max-w-xs">Percentage of total cases that have been successfully closed.</p>
 </div>
 </div>

 {/* Pending Medical Documentation */}
 <div className="bg-surface rounded-xl border border-border shadow-sm overflow-hidden">
 <div className="p-6 border-b border-border">
 <h3 className="text-lg font-semibold flex items-center gap-2 text-text-primary">
 <FileText className="h-5 w-5 text-amber-500" />
 Pending Medical Documentation
 </h3>
 <p className="text-sm text-text-muted">Follow-up needed for these cases</p>
 </div>
 <div className="overflow-x-auto">
 <table className="w-full text-left text-sm">
 <thead className="bg-white/20 /50 text-text-secondary">
 <tr>
 <th className="px-6 py-3 font-medium">Case Number</th>
 <th className="px-6 py-3 font-medium">Client</th>
 <th className="px-6 py-3 font-medium">Last Updated</th>
 <th className="px-6 py-3 font-medium">Action</th>
 </tr>
 </thead>
 <tbody className="divide-y divide-white/10 dark:divide-gray-700/30">
 {data.pendingMedical.length > 0 ? (
 data.pendingMedical.map((item) => (
 <tr key={item.caseNumber} className="hover:bg-white/20 dark:hover:bg-gray-800/30">
 <td className="px-6 py-4 font-medium">{item.caseNumber}</td>
 <td className="px-6 py-4 text-text-muted">{item.clientName}</td>
 <td className="px-6 py-4 text-text-muted">
 {format(new Date(item.lastUpdated), 'MMM d, yyyy')}
 </td>
 <td className="px-6 py-4">
 <a href={`/cases/${item.caseNumber}`} className="text-primary-500 hover:text-primary-600 hover:underline">
 View Case
 </a>
 </td>
 </tr>
 ))
 ) : (
 <tr>
 <td colSpan={4} className="px-6 py-8 text-center text-text-muted">
 No pending medical documentation found.
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
