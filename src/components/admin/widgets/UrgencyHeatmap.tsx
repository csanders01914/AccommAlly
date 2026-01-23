'use client';

import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import { Loader2 } from 'lucide-react';

interface UrgencyData {
    range: string;
    count: number;
}

interface UrgencyHeatmapProps {
    data: UrgencyData[] | null;
    isLoading: boolean;
}

export function UrgencyHeatmap({ data, isLoading }: UrgencyHeatmapProps) {
    if (isLoading) {
        return <div className="h-64 flex items-center justify-center"><Loader2 className="animate-spin text-gray-400" /></div>;
    }

    if (!data || data.length === 0) {
        return <div className="h-64 flex items-center justify-center text-gray-500">No active case data</div>;
    }

    return (
        <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
                <BarChart data={data} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E5E7EB" />
                    <XAxis
                        dataKey="range"
                        axisLine={false}
                        tickLine={false}
                        tick={{ fill: '#6B7280', fontSize: 12 }}
                        dy={10}
                    />
                    <YAxis
                        axisLine={false}
                        tickLine={false}
                        tick={{ fill: '#6B7280', fontSize: 12 }}
                    />
                    <Tooltip
                        cursor={{ fill: 'transparent' }}
                        contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                    />
                    <Bar dataKey="count" radius={[4, 4, 0, 0]}>
                        {data.map((entry, index) => {
                            let color = '#3B82F6'; // Blue (Normal)
                            if (entry.range === '4-7 Days') color = '#F59E0B'; // Orange
                            if (entry.range === '8-14 Days') color = '#F97316'; // Dark Orange
                            if (entry.range === '15+ Days') color = '#EF4444'; // Red (Critical)
                            return <Cell key={`cell-${index}`} fill={color} />;
                        })}
                    </Bar>
                </BarChart>
            </ResponsiveContainer>
        </div>
    );
}
