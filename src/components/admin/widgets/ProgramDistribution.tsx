'use client';

import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend } from 'recharts';
import { Loader2 } from 'lucide-react';

interface ProgramData {
    name: string;
    value: number;
    [key: string]: any;
}

interface ProgramDistributionProps {
    data: ProgramData[] | null;
    isLoading: boolean;
}

const COLORS = ['#3B82F6', '#10B981', '#F59E0B', '#6366F1', '#EC4899', '#8B5CF6'];

export function ProgramDistribution({ data, isLoading }: ProgramDistributionProps) {
    if (isLoading) {
        return <div className="h-64 flex items-center justify-center"><Loader2 className="animate-spin text-gray-400" /></div>;
    }

    if (!data || data.length === 0) {
        return <div className="h-64 flex items-center justify-center text-gray-500">No program data</div>;
    }

    return (
        <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                    <Pie
                        data={data}
                        cx="50%"
                        cy="50%"
                        innerRadius={60}
                        outerRadius={80}
                        paddingAngle={5}
                        dataKey="value"
                    >
                        {data.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                        ))}
                    </Pie>
                    <Tooltip
                        contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                    />
                    <Legend verticalAlign="bottom" height={36} iconType="circle" />
                </PieChart>
            </ResponsiveContainer>
        </div>
    );
}
