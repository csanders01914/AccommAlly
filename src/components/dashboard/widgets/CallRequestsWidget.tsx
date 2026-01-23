'use client';

import { useState } from 'react';
import { Phone, Clock, X, Calendar, CheckCircle, Edit2, AlertTriangle } from 'lucide-react';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';

export interface CallRequestProps {
    id: string;
    name: string;
    phoneNumber?: string;
    reason: string;
    status: string;
    urgent: boolean;
    createdAt: string;
    scheduledFor?: string | null;
    case?: {
        id: string;
        caseNumber: string;
        clientName: string;
    } | null;
}

interface CallRequestsWidgetProps {
    requests: CallRequestProps[];
    onUpdate?: () => void;
}

export function CallRequestsWidget({ requests, onUpdate }: CallRequestsWidgetProps) {
    const [selectedCall, setSelectedCall] = useState<CallRequestProps | null>(null);
    const hasUrgent = requests.some(c => c.urgent && c.status !== 'COMPLETED');

    const formatTime = (iso: string) => {
        return new Date(iso).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
    };

    const pendingRequests = requests.filter(r => r.status !== 'COMPLETED');

    return (
        <div className="flex flex-col h-full">
            <div className="p-4 border-b border-gray-100 dark:border-gray-800 flex items-center justify-between bg-gradient-to-r from-amber-50 to-transparent dark:from-amber-900/10">
                <h3 className="font-semibold text-gray-900 dark:text-white flex items-center gap-2">
                    <Phone className="w-4 h-4 text-amber-600" />
                    Call Requests
                    {pendingRequests.length > 0 && (
                        <span className="text-xs bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400 px-1.5 py-0.5 rounded-full">
                            {pendingRequests.length}
                        </span>
                    )}
                </h3>
                {hasUrgent && (
                    <span className="flex h-2.5 w-2.5 relative">
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                        <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-red-500"></span>
                    </span>
                )}
            </div>

            <div className="p-2 flex-1 overflow-y-auto space-y-2 custom-scrollbar">
                {pendingRequests.length > 0 ? pendingRequests.map(call => (
                    <div
                        key={call.id}
                        onClick={() => setSelectedCall(call)}
                        className="p-3 rounded-lg border border-amber-100 dark:border-amber-900/30 bg-amber-50/30 dark:bg-amber-900/10 cursor-pointer hover:bg-amber-100/50 dark:hover:bg-amber-900/20 transition-colors"
                    >
                        <div className="flex justify-between items-start mb-1">
                            <span className="text-sm font-medium text-gray-900 dark:text-white">
                                {call.name}
                            </span>
                            {call.urgent && (
                                <span className="text-[10px] font-bold text-red-600 bg-red-100 px-1.5 py-0.5 rounded border border-red-200">
                                    URGENT
                                </span>
                            )}
                        </div>
                        <div className="text-xs text-gray-600 dark:text-gray-300 mb-2 line-clamp-1">
                            {call.reason}
                        </div>
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2 text-[10px] text-gray-500">
                                <div className="flex items-center gap-1">
                                    <Clock className="w-3 h-3" />
                                    {formatTime(call.createdAt)}
                                </div>
                                {call.scheduledFor && (
                                    <div className="flex items-center gap-1 text-blue-600">
                                        <Calendar className="w-3 h-3" />
                                        {format(new Date(call.scheduledFor), 'MMM d, h:mm a')}
                                    </div>
                                )}
                            </div>
                            <span className="text-[10px] text-amber-600 font-medium">
                                Click to manage →
                            </span>
                        </div>
                    </div>
                )) : (
                    <div className="text-center py-8 text-gray-400 text-sm">
                        All calls returned ✓
                    </div>
                )}
            </div>

            {/* Detail Modal */}
            {selectedCall && (
                <CallDetailModal
                    call={selectedCall}
                    onClose={() => setSelectedCall(null)}
                    onUpdate={() => {
                        setSelectedCall(null);
                        onUpdate?.();
                    }}
                />
            )}
        </div>
    );
}

// Detail Modal Component
function CallDetailModal({
    call,
    onClose,
    onUpdate
}: {
    call: CallRequestProps;
    onClose: () => void;
    onUpdate: () => void;
}) {
    const [isEditing, setIsEditing] = useState(false);
    const [isCompleting, setIsCompleting] = useState(false);
    const [loading, setLoading] = useState(false);

    // Edit state
    const [scheduledFor, setScheduledFor] = useState(
        call.scheduledFor ? format(new Date(call.scheduledFor), "yyyy-MM-dd'T'HH:mm") : ''
    );
    const [reason, setReason] = useState(call.reason);
    const [urgent, setUrgent] = useState(call.urgent);

    // Completion state
    const [returnNote, setReturnNote] = useState('');

    const handleSave = async () => {
        setLoading(true);
        try {
            const res = await fetch(`/api/calls/${call.id}`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    scheduledFor: scheduledFor || null,
                    reason,
                    urgent
                })
            });

            if (res.ok) {
                setIsEditing(false);
                onUpdate();
            }
        } catch (error) {
            console.error('Failed to update call:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleComplete = async () => {
        if (!returnNote.trim()) {
            alert('Please enter a return call note');
            return;
        }

        setLoading(true);
        try {
            const res = await fetch(`/api/calls/${call.id}`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    status: 'COMPLETED',
                    note: returnNote
                })
            });

            if (res.ok) {
                onUpdate();
            }
        } catch (error) {
            console.error('Failed to complete call:', error);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div
            className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
            onClick={onClose}
        >
            <div
                className="bg-white dark:bg-gray-800 rounded-xl w-full max-w-md shadow-2xl overflow-hidden"
                onClick={e => e.stopPropagation()}
            >
                {/* Header */}
                <div className={cn(
                    "p-4 flex items-center gap-3",
                    call.urgent
                        ? "bg-red-50 dark:bg-red-900/20"
                        : "bg-amber-50 dark:bg-amber-900/20"
                )}>
                    <Phone className={cn(
                        "w-5 h-5",
                        call.urgent ? "text-red-600" : "text-amber-600"
                    )} />
                    <div className="flex-1">
                        <h3 className="font-semibold text-gray-900 dark:text-white">{call.name}</h3>
                        {call.phoneNumber && (
                            <a
                                href={`tel:${call.phoneNumber}`}
                                className="text-sm text-blue-600 hover:underline"
                            >
                                {call.phoneNumber}
                            </a>
                        )}
                    </div>
                    {call.urgent && (
                        <span className="flex items-center gap-1 text-xs font-bold text-red-600 bg-red-100 px-2 py-1 rounded">
                            <AlertTriangle className="w-3 h-3" />
                            URGENT
                        </span>
                    )}
                    <button onClick={onClose} className="p-1 hover:bg-gray-200 dark:hover:bg-gray-700 rounded">
                        <X className="w-5 h-5" />
                    </button>
                </div>

                {/* Content */}
                <div className="p-4 space-y-4">
                    {/* Case Info */}
                    {call.case && (
                        <div className="text-sm bg-gray-50 dark:bg-gray-700/50 p-3 rounded-lg">
                            <span className="text-gray-500 dark:text-gray-400">Case: </span>
                            <span className="font-medium text-gray-900 dark:text-white">
                                {call.case.caseNumber} - {call.case.clientName}
                            </span>
                        </div>
                    )}

                    {/* Reason */}
                    {isEditing ? (
                        <div>
                            <label className="text-xs text-gray-500 mb-1 block">Reason</label>
                            <textarea
                                value={reason}
                                onChange={e => setReason(e.target.value)}
                                rows={3}
                                className="w-full px-3 py-2 bg-gray-100 dark:bg-gray-700 rounded-lg text-sm resize-none focus:ring-2 focus:ring-amber-500 outline-none"
                            />
                        </div>
                    ) : (
                        <div>
                            <div className="text-xs text-gray-500 mb-1">Reason</div>
                            <div className="text-sm text-gray-700 dark:text-gray-300">{call.reason}</div>
                        </div>
                    )}

                    {/* Scheduled For */}
                    {isEditing ? (
                        <div>
                            <label className="text-xs text-gray-500 mb-1 block">Schedule Return Call</label>
                            <input
                                type="datetime-local"
                                value={scheduledFor}
                                onChange={e => setScheduledFor(e.target.value)}
                                className="w-full px-3 py-2 bg-gray-100 dark:bg-gray-700 rounded-lg text-sm focus:ring-2 focus:ring-amber-500 outline-none"
                            />
                        </div>
                    ) : call.scheduledFor ? (
                        <div className="flex items-center gap-2 text-sm text-blue-600">
                            <Calendar className="w-4 h-4" />
                            Scheduled: {format(new Date(call.scheduledFor), 'MMMM d, yyyy h:mm a')}
                        </div>
                    ) : null}

                    {/* Urgent Toggle (edit mode) */}
                    {isEditing && (
                        <label className="flex items-center gap-2 cursor-pointer">
                            <input
                                type="checkbox"
                                checked={urgent}
                                onChange={e => setUrgent(e.target.checked)}
                                className="w-4 h-4 rounded"
                            />
                            <span className="text-sm text-gray-700 dark:text-gray-300">Mark as urgent</span>
                        </label>
                    )}

                    {/* Timestamps */}
                    <div className="text-xs text-gray-500 flex items-center gap-4">
                        <div className="flex items-center gap-1">
                            <Clock className="w-3 h-3" />
                            Received: {format(new Date(call.createdAt), 'MMM d, h:mm a')}
                        </div>
                    </div>

                    {/* Complete Section */}
                    {isCompleting && (
                        <div className="border-t border-gray-200 dark:border-gray-700 pt-4 mt-4">
                            <div className="text-sm font-medium text-gray-900 dark:text-white mb-2 flex items-center gap-2">
                                <CheckCircle className="w-4 h-4 text-green-600" />
                                Return Call Notes
                            </div>
                            <textarea
                                value={returnNote}
                                onChange={e => setReturnNote(e.target.value)}
                                placeholder="Enter notes from the return call..."
                                rows={4}
                                className="w-full px-3 py-2 bg-gray-100 dark:bg-gray-700 rounded-lg text-sm resize-none focus:ring-2 focus:ring-green-500 outline-none"
                                autoFocus
                            />
                            <p className="text-xs text-gray-500 mt-1">
                                This note will be saved to the case automatically.
                            </p>
                        </div>
                    )}
                </div>

                {/* Actions */}
                <div className="p-4 border-t border-gray-200 dark:border-gray-700 flex gap-2">
                    {isEditing ? (
                        <>
                            <button
                                onClick={() => setIsEditing(false)}
                                className="flex-1 px-4 py-2 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 rounded-lg text-sm transition-colors"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={handleSave}
                                disabled={loading}
                                className="flex-1 px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white rounded-lg text-sm transition-colors disabled:opacity-50"
                            >
                                {loading ? 'Saving...' : 'Save Changes'}
                            </button>
                        </>
                    ) : isCompleting ? (
                        <>
                            <button
                                onClick={() => setIsCompleting(false)}
                                className="flex-1 px-4 py-2 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 rounded-lg text-sm transition-colors"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={handleComplete}
                                disabled={loading || !returnNote.trim()}
                                className="flex-1 px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg text-sm transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
                            >
                                <CheckCircle className="w-4 h-4" />
                                {loading ? 'Saving...' : 'Complete & Save Note'}
                            </button>
                        </>
                    ) : (
                        <>
                            <button
                                onClick={() => setIsEditing(true)}
                                className="flex-1 px-4 py-2 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 rounded-lg text-sm transition-colors flex items-center justify-center gap-2"
                            >
                                <Edit2 className="w-4 h-4" />
                                Edit
                            </button>
                            <button
                                onClick={() => setIsCompleting(true)}
                                className="flex-1 px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg text-sm transition-colors flex items-center justify-center gap-2"
                            >
                                <CheckCircle className="w-4 h-4" />
                                Mark Complete
                            </button>
                        </>
                    )}
                </div>
            </div>
        </div>
    );
}
