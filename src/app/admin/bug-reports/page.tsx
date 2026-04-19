'use client';
import { apiFetch } from '@/lib/api-client';

import { useState, useEffect } from 'react';
import { format } from 'date-fns';
import {
    Bug,
    CheckCircle,
    Circle,
    Clock,
    AlertCircle,
    Filter,
    Search,
    ChevronDown
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface BugReport {
    id: string;
    transactionId: string | null;
    subject: string;
    description: string;
    reporterName: string;
    reporterEmail: string | null;
    reporterPhone: string | null;
    status: string;
    createdAt: string;
    user?: {
        name: string;
        email: string;
    };
}

const STATUS_COLORS: Record<string, string> = {
    OPEN: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
    IN_PROGRESS: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
    RESOLVED: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
    CLOSED: 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-400'
};

export default function BugReportsPage() {
    const [reports, setReports] = useState<BugReport[]>([]);
    const [loading, setLoading] = useState(true);
    const [filterStatus, setFilterStatus] = useState<string>('ALL');
    const [searchQuery, setSearchQuery] = useState('');

    useEffect(() => {
        fetchReports();
    }, []);

    const fetchReports = async () => {
        try {
            const res = await apiFetch('/api/bug-reports');
            if (res.ok) {
                const data = await res.json();
                setReports(data.reports);
            }
        } catch (error) {
            console.error('Failed to fetch reports:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleStatusUpdate = async (id: string, newStatus: string) => {
        try {
            const res = await fetch(`/api/bug-reports/${id}`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ status: newStatus })
            });

            if (res.ok) {
                setReports(prev => prev.map(r =>
                    r.id === id ? { ...r, status: newStatus } : r
                ));
            }
        } catch (error) {
            console.error('Failed to update status:', error);
        }
    };

    const filteredReports = reports.filter(report => {
        const matchesStatus = filterStatus === 'ALL' || report.status === filterStatus;
        const searchLower = searchQuery.toLowerCase();
        const matchesSearch =
            report.subject.toLowerCase().includes(searchLower) ||
            report.description.toLowerCase().includes(searchLower) ||
            report.reporterName.toLowerCase().includes(searchLower) ||
            (report.transactionId?.toLowerCase().includes(searchLower) ?? false);

        return matchesStatus && matchesSearch;
    });

    return (
        <div className="min-h-screen bg-gray-50 dark:bg-gray-900 p-8 ml-64">
            <div className="max-w-7xl mx-auto space-y-6">

                {/* Header */}
                <div className="flex items-center justify-between">
                    <div>
                        <h1 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
                            <Bug className="w-8 h-8 text-blue-600" />
                            Bug Reports
                        </h1>
                        <p className="text-gray-500 dark:text-gray-400 mt-1">
                            Track and manage system issues reported by users
                        </p>
                    </div>
                    <div className="flex items-center gap-4">
                        <div className="relative">
                            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                            <input
                                type="text"
                                placeholder="Search reports..."
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                className="pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 text-sm focus:ring-2 focus:ring-blue-500"
                            />
                        </div>
                        <select
                            value={filterStatus}
                            onChange={(e) => setFilterStatus(e.target.value)}
                            className="pl-3 pr-8 py-2 border border-gray-300 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 text-sm focus:ring-2 focus:ring-blue-500"
                        >
                            <option value="ALL">All Statuses</option>
                            <option value="OPEN">Open</option>
                            <option value="IN_PROGRESS">In Progress</option>
                            <option value="RESOLVED">Resolved</option>
                            <option value="CLOSED">Closed</option>
                        </select>
                    </div>
                </div>

                {/* List */}
                <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden">
                    {loading ? (
                        <div className="p-12 text-center text-gray-500">Loading reports...</div>
                    ) : filteredReports.length === 0 ? (
                        <div className="p-12 text-center text-gray-500">No bug reports found.</div>
                    ) : (
                        <div className="divide-y divide-gray-200 dark:divide-gray-700">
                            {filteredReports.map((report) => (
                                <div key={report.id} className="p-6 hover:bg-gray-50 dark:hover:bg-gray-750 transition-colors">
                                    <div className="flex items-start justify-between gap-4">
                                        <div className="flex-1 space-y-2">
                                            <div className="flex items-center gap-3">
                                                <span className={cn("px-2.5 py-0.5 rounded-full text-xs font-medium uppercase tracking-wide", STATUS_COLORS[report.status])}>
                                                    {report.status.replace('_', ' ')}
                                                </span>
                                                <span className="text-sm text-gray-500 dark:text-gray-400 flex items-center gap-1">
                                                    <Clock className="w-3 h-3" />
                                                    {format(new Date(report.createdAt), 'MMM d, yyyy h:mm a')}
                                                </span>
                                                {report.transactionId && (
                                                    <span className="text-xs font-mono text-gray-400 bg-gray-100 dark:bg-gray-800 px-2 py-0.5 rounded">
                                                        ID: {report.transactionId}
                                                    </span>
                                                )}
                                            </div>
                                            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                                                {report.subject}
                                            </h3>
                                            <p className="text-gray-600 dark:text-gray-300 whitespace-pre-wrap">
                                                {report.description}
                                            </p>
                                            <div className="flex items-center gap-6 text-sm text-gray-500 dark:text-gray-400 pt-2">
                                                <div className="flex items-center gap-2">
                                                    <div className="w-6 h-6 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center font-bold text-xs">
                                                        {report.reporterName.charAt(0)}
                                                    </div>
                                                    {report.reporterName}
                                                </div>
                                                {report.reporterEmail && (
                                                    <div>{report.reporterEmail}</div>
                                                )}
                                                {report.reporterPhone && (
                                                    <div>{report.reporterPhone}</div>
                                                )}
                                            </div>
                                        </div>

                                        {/* Actions */}
                                        <div className="flex flex-col gap-2 min-w-[140px]">
                                            <select
                                                value={report.status}
                                                onChange={(e) => handleStatusUpdate(report.id, e.target.value)}
                                                className="w-full px-3 py-1.5 text-sm bg-white dark:bg-gray-900 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 cursor-pointer hover:border-blue-400 transition-colors"
                                            >
                                                <option value="OPEN">Open</option>
                                                <option value="IN_PROGRESS">In Progress</option>
                                                <option value="RESOLVED">Resolved</option>
                                                <option value="CLOSED">Closed</option>
                                            </select>

                                            {report.status !== 'CLOSED' && (
                                                <button
                                                    onClick={() => handleStatusUpdate(report.id, 'CLOSED')}
                                                    className="w-full px-3 py-1.5 text-xs font-medium text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white bg-gray-100 hover:bg-gray-200 dark:bg-gray-800 dark:hover:bg-gray-700 rounded-lg transition-colors"
                                                >
                                                    Mark Closed
                                                </button>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
