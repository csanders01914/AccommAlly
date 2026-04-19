'use client';

import { useEffect, useState } from 'react';
import { Loader2, PieChart as PieChartIcon, BarChart3, XCircle } from 'lucide-react';
import {
    BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
    PieChart, Pie, Cell, Legend
} from 'recharts';

interface TrendsData {
    typeDistribution: { name: string; value: number }[];
    jobRoleStats: { name: string; value: number }[];
    denialReasons: { name: string; value: number }[];
}

const COLORS = ['#0ea5e9', '#22c55e', '#eab308', '#f97316', '#ef4444', '#8b5cf6', '#ec4899'];

export function TrendsTab() {
    const [data, setData] = useState<TrendsData | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetch('/api/reports?type=trends')
            .then(res => res.json())
            .then(setData)
            .finally(() => setLoading(false));
    }, []);

    if (loading) return <div className="flex justify-center p-8"><Loader2 className="animate-spin h-8 w-8 text-blue-500" /></div>;
    if (!data) return <div>Failed to load data</div>;

    return (
        <div className="space-y-6 animate-in fade-in duration-500">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

                {/* Accommodation Type Distribution */}
                <div className="bg-white/40 dark:bg-gray-800/40 p-6 rounded-xl border border-white/20 dark:border-gray-700/30 shadow-sm backdrop-blur-md">
                    <h3 className="text-lg font-semibold mb-4 flex items-center gap-2 text-gray-800 dark:text-white">
                        <PieChartIcon className="h-5 w-5 text-blue-500" />
                        Accommodation Type Distribution
                    </h3>
                    <div className="h-[350px] w-full">
                        <ResponsiveContainer width="100%" height="100%">
                            <PieChart>
                                <Pie
                                    data={data.typeDistribution}
                                    cx="50%"
                                    cy="50%"
                                    innerRadius={60}
                                    outerRadius={100}
                                    paddingAngle={2}
                                    dataKey="value"
                                    label={({ name, percent }: { name?: string; percent?: number }) => `${((percent ?? 0) * 100).toFixed(0)}%`}
                                >
                                    {data.typeDistribution.map((entry, index) => (
                                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                    ))}
                                </Pie>
                                <Tooltip />
                                <Legend verticalAlign="bottom" height={70} />
                            </PieChart>
                        </ResponsiveContainer>
                    </div>
                </div>

                {/* High Frequency Job Roles */}
                <div className="bg-white/40 dark:bg-gray-800/40 p-6 rounded-xl border border-white/20 dark:border-gray-700/30 shadow-sm backdrop-blur-md">
                    <h3 className="text-lg font-semibold mb-4 flex items-center gap-2 text-gray-800 dark:text-white">
                        <BarChart3 className="h-5 w-5 text-orange-500" />
                        High-Frequency Job Roles
                    </h3>
                    <p className="text-sm text-gray-500 mb-4">Roles requesting accommodations most frequently</p>
                    <div className="h-[350px] w-full">
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={data.jobRoleStats} layout="vertical" margin={{ top: 5, right: 30, left: 40, bottom: 5 }}>
                                <CartesianGrid strokeDasharray="3 3" horizontal={false} />
                                <XAxis type="number" />
                                <YAxis dataKey="name" type="category" width={100} fontSize={12} />
                                <Tooltip cursor={{ fill: '#f3f4f6' }} />
                                <Bar dataKey="value" fill="#f97316" radius={[0, 4, 4, 0]} />
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                </div>
            </div>

            {/* Denial Reasons */}
            <div className="bg-white/40 dark:bg-gray-800/40 p-6 rounded-xl border border-white/20 dark:border-gray-700/30 shadow-sm backdrop-blur-md">
                <h3 className="text-lg font-semibold mb-4 flex items-center gap-2 text-gray-800 dark:text-white">
                    <XCircle className="h-5 w-5 text-red-500" />
                    Denial Reasons Breakdown
                </h3>
                <div className="h-[250px] w-full">
                    <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={data.denialReasons}>
                            <CartesianGrid strokeDasharray="3 3" vertical={false} />
                            <XAxis dataKey="name" fontSize={12} tickLine={false} axisLine={false} />
                            <YAxis fontSize={12} tickLine={false} axisLine={false} />
                            <Tooltip cursor={{ fill: '#f3f4f6' }} />
                            <Bar dataKey="value" fill="#ef4444" radius={[4, 4, 0, 0]} barSize={50} />
                        </BarChart>
                    </ResponsiveContainer>
                </div>
            </div>
        </div>
    );
}
