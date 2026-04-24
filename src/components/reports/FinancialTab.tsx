'use client';

import { useEffect, useState } from 'react';
import { Loader2, DollarSign, PieChart as PieChartIcon, TrendingUp } from 'lucide-react';
import {
 BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
 PieChart, Pie, Cell, Legend
} from 'recharts';

interface FinancialData {
 costByJobFamily: { name: string; value: number }[];
 internalExternal: { name: string; value: number }[];
 taxCreditEligible: {
 id: string;
 type: string;
 description: string;
 actualCost: number;
 }[];
}

const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6'];
const PIE_COLORS = ['#3b82f6', '#8b5cf6']; // Blue for Internal, Purple for External? Or similar.

export function FinancialTab() {
 const [data, setData] = useState<FinancialData | null>(null);
 const [loading, setLoading] = useState(true);

 useEffect(() => {
 fetch('/api/reports?type=financial')
 .then(res => res.json())
 .then(setData)
 .finally(() => setLoading(false));
 }, []);

 if (loading) return <div className="flex justify-center p-8"><Loader2 className="animate-spin h-8 w-8 text-primary-500" /></div>;
 if (!data) return <div>Failed to load data</div>;

 const totalSpend = data.internalExternal.reduce((acc, curr) => acc + curr.value, 0);

 return (
 <div className="space-y-6 animate-in fade-in duration-500">

 {/* Summary Cards */}
 <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
 <div className="bg-surface p-6 rounded-xl border border-border shadow-sm">
 <p className="text-sm font-medium text-text-secondary">Total Spend</p>
 <h3 className="text-2xl font-bold mt-1 text-text-primary">${totalSpend.toLocaleString()}</h3>
 </div>
 <div className="bg-surface p-6 rounded-xl border border-border shadow-sm">
 <p className="text-sm font-medium text-text-secondary">Top Cost Center</p>
 <h3 className="text-lg font-bold mt-1 truncate text-text-primary">
 {data.costByJobFamily.sort((a, b) => b.value - a.value)[0]?.name || 'N/A'}
 </h3>
 </div>
 <div className="bg-surface p-6 rounded-xl border border-border shadow-sm">
 <p className="text-sm font-medium text-text-secondary">Potential Tax Credits</p>
 <h3 className="text-2xl font-bold mt-1 text-text-primary">{data.taxCreditEligible.length} <span className="text-xs font-normal text-text-muted">items</span></h3>
 </div>
 </div>

 <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
 {/* Cost Analysis Chart */}
 <div className="bg-surface p-6 rounded-xl border border-border shadow-sm">
 <h3 className="text-lg font-semibold mb-4 flex items-center gap-2 text-text-primary">
 <TrendingUp className="h-5 w-5 text-green-500" />
 Cost by Job Family
 </h3>
 <div className="h-[300px] w-full">
 <ResponsiveContainer width="100%" height="100%">
 <BarChart data={data.costByJobFamily}>
 <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e5e7eb" />
 <XAxis dataKey="name" stroke="#9ca3af" fontSize={12} tickLine={false} axisLine={false} />
 <YAxis stroke="#9ca3af" fontSize={12} tickLine={false} axisLine={false} tickFormatter={(value) => `$${value}`} />
 <Tooltip
 contentStyle={{ backgroundColor: 'rgba(255, 255, 255, 0.95)', borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
 cursor={{ fill: '#f3f4f6' }}
 />
 <Bar dataKey="value" fill="#3b82f6" radius={[4, 4, 0, 0]} />
 </BarChart>
 </ResponsiveContainer>
 </div>
 </div>

 {/* Internal vs External */}
 <div className="bg-surface p-6 rounded-xl border border-border shadow-sm">
 <h3 className="text-lg font-semibold mb-4 flex items-center gap-2 text-text-primary">
 <PieChartIcon className="h-5 w-5 text-primary-500" />
 Internal vs External Spend
 </h3>
 <div className="h-[300px] w-full flex items-center justify-center">
 <ResponsiveContainer width="100%" height="100%">
 <PieChart>
 <Pie
 data={data.internalExternal}
 cx="50%"
 cy="50%"
 innerRadius={60}
 outerRadius={100}
 paddingAngle={5}
 dataKey="value"
 >
 {data.internalExternal.map((entry, index) => (
 <Cell key={`cell-${index}`} fill={PIE_COLORS[index % PIE_COLORS.length]} />
 ))}
 </Pie>
 <Tooltip
 formatter={(value?: number) => `$${value?.toLocaleString() ?? 0}`}
 contentStyle={{ backgroundColor: 'rgba(255, 255, 255, 0.95)', borderRadius: '8px' }}
 />
 <Legend verticalAlign="bottom" height={36} />
 </PieChart>
 </ResponsiveContainer>
 </div>
 </div>
 </div>

 {/* Tax Credit Table */}
 <div className="bg-surface rounded-xl border border-border shadow-sm overflow-hidden">
 <div className="p-6 border-b border-border">
 <h3 className="text-lg font-semibold flex items-center gap-2">
 <DollarSign className="h-5 w-5 text-primary-500" />
 Potential Tax Credit Eligibility (Disabled Access Credit)
 </h3>
 </div>
 <div className="overflow-x-auto">
 <table className="w-full text-left text-sm">
 <thead className="bg-white/20 /50 text-text-secondary">
 <tr>
 <th className="px-6 py-3 font-medium">Type</th>
 <th className="px-6 py-3 font-medium">Description</th>
 <th className="px-6 py-3 font-medium">Cost</th>
 </tr>
 </thead>
 <tbody className="divide-y divide-white/10 dark:divide-gray-700/30">
 {data.taxCreditEligible.map((item) => (
 <tr key={item.id} className="hover:bg-white/20 dark:hover:bg-gray-800/30">
 <td className="px-6 py-4 font-medium">{item.type.replace(/_/g, ' ')}</td>
 <td className="px-6 py-4 text-text-muted truncate max-w-xs">{item.description}</td>
 <td className="px-6 py-4 font-medium text-text-primary">${Number(item.actualCost).toLocaleString()}</td>
 </tr>
 ))}
 </tbody>
 </table>
 </div>
 </div>
 </div>
 );
}
