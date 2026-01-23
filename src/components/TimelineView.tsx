'use client';

import { useEffect, useState } from 'react';
import {
    Clock,
    FileText,
    CheckSquare,
    MessageSquare,
    Shield,
    User,
    AlertCircle,
    Plus,
    Edit2,
    Trash2
} from 'lucide-react';
import { format } from 'date-fns';

interface TimelineEvent {
    id: string;
    timestamp: string;
    user: { id: string; name: string; role: string };
    action: string;
    entityType: string;
    details: string;
    raw: {
        oldValue: string | null;
        newValue: string | null;
        field: string | null;
    };
}

interface TimelineViewProps {
    caseId: string;
}

export function TimelineView({ caseId }: TimelineViewProps) {
    const [events, setEvents] = useState<TimelineEvent[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        const fetchTimeline = async () => {
            try {
                const res = await fetch(`/api/cases/${caseId}/timeline`);
                if (res.ok) {
                    const data = await res.json();
                    setEvents(data.timeline);
                }
            } catch (e) {
                console.error('Failed to fetch timeline:', e);
            } finally {
                setIsLoading(false);
            }
        };

        fetchTimeline();
    }, [caseId]);

    if (isLoading) {
        return <div className="p-8 text-center text-gray-500">Loading timeline...</div>;
    }

    if (events.length === 0) {
        return (
            <div className="p-12 text-center border-2 border-dashed border-gray-200 dark:border-gray-800 rounded-xl">
                <Clock className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                <p className="text-gray-500">No activity recorded for this case yet.</p>
            </div>
        );
    }

    const getIcon = (type: string) => {
        switch (type) {
            case 'Case': return <Shield className="w-4 h-4" />;
            case 'Task': return <CheckSquare className="w-4 h-4" />;
            case 'Note': return <MessageSquare className="w-4 h-4" />;
            case 'Document': return <FileText className="w-4 h-4" />;
            default: return <AlertCircle className="w-4 h-4" />;
        }
    };

    const getActionColor = (action: string) => {
        switch (action) {
            case 'CREATE': return 'bg-green-100 text-green-700 border-green-200';
            case 'UPDATE': return 'bg-blue-100 text-blue-700 border-blue-200';
            case 'DELETE': return 'bg-red-100 text-red-700 border-red-200';
            default: return 'bg-gray-100 text-gray-700 border-gray-200';
        }
    };

    return (
        <div className="space-y-8 relative before:absolute before:inset-0 before:ml-5 before:-translate-x-px md:before:mx-auto md:before:translate-x-0 before:h-full before:w-0.5 before:bg-gradient-to-b before:from-transparent before:via-slate-300 before:to-transparent">
            {events.map((event) => (
                <div key={event.id} className="relative flex items-center justify-between md:justify-normal md:odd:flex-row-reverse group is-active">

                    {/* Icon */}
                    <div className="flex items-center justify-center w-10 h-10 rounded-full border border-white bg-slate-50 shadow shrink-0 md:order-1 md:group-odd:-translate-x-1/2 md:group-even:translate-x-1/2">
                        <span className="text-slate-500">{getIcon(event.entityType)}</span>
                    </div>

                    {/* Content Card */}
                    <div className="w-[calc(100%-4rem)] md:w-[calc(50%-2.5rem)] bg-white dark:bg-gray-900 p-4 rounded-xl border border-gray-200 dark:border-gray-800 shadow-sm">
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-1">
                            <div className="flex items-center gap-2">
                                <span className={`text-[10px] font-bold px-2 py-0.5 rounded uppercase border ${getActionColor(event.action)}`}>
                                    {event.action}
                                </span>
                                <span className="font-semibold text-gray-900 dark:text-white text-sm">
                                    {event.entityType}
                                </span>
                            </div>
                            <time className="text-xs text-gray-500 font-mono">
                                {format(new Date(event.timestamp), 'MMM d, h:mm a')}
                            </time>
                        </div>

                        <div className="text-sm text-gray-600 dark:text-gray-300 mt-2">
                            {event.entityType === 'Note' && event.action === 'CREATE' ? (
                                <span className="italic">"Added a new note..."</span>
                            ) : (
                                <span>{event.details || 'System update'}</span>
                            )}
                        </div>

                        <div className="mt-3 flex items-center gap-2 text-xs text-gray-400 border-t border-gray-100 dark:border-gray-800 pt-2">
                            <User className="w-3 h-3" />
                            <span className="font-medium text-gray-600 dark:text-gray-400">{event.user.name}</span>
                            <span className="text-gray-300">•</span>
                            <span>{event.user.role}</span>
                        </div>
                    </div>
                </div>
            ))}
        </div>
    );
}
