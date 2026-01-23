'use client';

import { useState, useEffect, useCallback } from 'react';
import { MessageSquare, Send, User, ArrowRight, Loader2, AlertCircle, CheckCircle, RefreshCw } from 'lucide-react';

interface PortalMessage {
    id: string;
    subject: string | null;
    content: string;
    createdAt: string;
    direction: 'PORTAL_INBOUND' | 'PORTAL_OUTBOUND';
    read: boolean;
    sender?: { name: string };
}

interface PortalMessagesSectionProps {
    caseId: string;
    clientName: string;
}

export default function PortalMessagesSection({ caseId, clientName }: PortalMessagesSectionProps) {
    const [messages, setMessages] = useState<PortalMessage[]>([]);
    const [pendingCount, setPendingCount] = useState(0);
    const [loading, setLoading] = useState(true);
    const [sending, setSending] = useState(false);
    const [replyContent, setReplyContent] = useState('');
    const [replySubject, setReplySubject] = useState('');
    const [error, setError] = useState<string | null>(null);
    const [success, setSuccess] = useState<string | null>(null);

    const fetchMessages = useCallback(async () => {
        try {
            setLoading(true);
            const res = await fetch(`/api/cases/${caseId}/portal-reply`);
            if (res.ok) {
                const data = await res.json();
                setMessages(data.messages || []);
                setPendingCount(data.pendingCount || 0);
            }
        } catch (e) {
            console.error('Failed to fetch portal messages:', e);
        } finally {
            setLoading(false);
        }
    }, [caseId]);

    useEffect(() => {
        fetchMessages();
    }, [fetchMessages]);

    const handleSendReply = async () => {
        if (!replyContent.trim()) return;

        setSending(true);
        setError(null);
        setSuccess(null);

        try {
            const res = await fetch(`/api/cases/${caseId}/portal-reply`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    subject: replySubject.trim() || null,
                    content: replyContent.trim()
                })
            });

            if (res.ok) {
                setReplyContent('');
                setReplySubject('');
                setSuccess('Reply sent successfully! A note was added and pending tasks were completed.');
                fetchMessages();
                setTimeout(() => setSuccess(null), 5000);
            } else {
                const data = await res.json();
                setError(data.error || 'Failed to send reply');
            }
        } catch (e) {
            setError('Failed to send reply. Please try again.');
        } finally {
            setSending(false);
        }
    };

    if (loading) {
        return (
            <div className="bg-gray-100 dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded-xl p-6">
                <div className="flex items-center justify-center py-8">
                    <Loader2 className="w-6 h-6 text-blue-500 animate-spin" />
                </div>
            </div>
        );
    }

    return (
        <div className="bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded-xl overflow-hidden shadow-md">
            {/* Header */}
            <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900 flex items-center justify-between">
                <div className="flex items-center gap-3">
                    <MessageSquare className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Portal Messages</h3>
                    {pendingCount > 0 && (
                        <span className="bg-red-500 text-white text-xs font-bold px-2 py-0.5 rounded-full">
                            {pendingCount} pending
                        </span>
                    )}
                </div>
                <button
                    onClick={fetchMessages}
                    className="p-2 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-lg transition-colors"
                    title="Refresh messages"
                >
                    <RefreshCw className="w-4 h-4 text-gray-600 dark:text-gray-300" />
                </button>
            </div>

            {/* Messages List */}
            <div className="max-h-96 overflow-y-auto p-4 space-y-3 bg-gray-50 dark:bg-gray-900">
                {messages.length === 0 ? (
                    <p className="text-center text-gray-500 dark:text-gray-400 py-8">
                        No portal messages yet. Messages from {clientName} will appear here.
                    </p>
                ) : (
                    messages.map((msg) => (
                        <div
                            key={msg.id}
                            className={`p-4 rounded-xl shadow-sm ${msg.direction === 'PORTAL_INBOUND'
                                ? 'bg-blue-100 dark:bg-blue-900 border-2 border-blue-300 dark:border-blue-700'
                                : 'bg-green-100 dark:bg-green-900 border-2 border-green-300 dark:border-green-700 ml-8'
                                }`}
                        >
                            <div className="flex items-center gap-2 mb-2">
                                <div className={`w-6 h-6 rounded-full flex items-center justify-center ${msg.direction === 'PORTAL_INBOUND'
                                        ? 'bg-blue-500'
                                        : 'bg-green-500'
                                    }`}>
                                    <User className="w-3 h-3 text-white" />
                                </div>
                                <span className="text-sm font-bold text-gray-900 dark:text-white">
                                    {msg.direction === 'PORTAL_INBOUND' ? clientName : (msg.sender?.name || 'You')}
                                </span>
                                <span className="text-xs text-gray-600 dark:text-gray-400 ml-auto">
                                    {new Date(msg.createdAt).toLocaleString()}
                                </span>
                                {msg.direction === 'PORTAL_INBOUND' && (
                                    <ArrowRight className="w-3 h-3 text-blue-600 dark:text-blue-400" />
                                )}
                            </div>
                            {msg.subject && (
                                <p className="text-sm font-semibold text-gray-800 dark:text-gray-200 mb-2 border-b border-gray-300 dark:border-gray-600 pb-2">
                                    {msg.subject}
                                </p>
                            )}
                            <p className="text-sm text-gray-800 dark:text-gray-200 whitespace-pre-wrap leading-relaxed">
                                {msg.content}
                            </p>
                        </div>
                    ))
                )}
            </div>

            {/* Reply Form */}
            <div className="p-4 border-t border-gray-200 dark:border-gray-700 space-y-3 bg-white dark:bg-gray-800">
                {error && (
                    <div className="flex items-center gap-2 text-red-700 dark:text-red-400 text-sm bg-red-100 dark:bg-red-900/30 p-3 rounded-lg border border-red-300 dark:border-red-700">
                        <AlertCircle className="w-4 h-4" />
                        {error}
                    </div>
                )}
                {success && (
                    <div className="flex items-center gap-2 text-green-700 dark:text-green-400 text-sm bg-green-100 dark:bg-green-900/30 p-3 rounded-lg border border-green-300 dark:border-green-700">
                        <CheckCircle className="w-4 h-4" />
                        {success}
                    </div>
                )}

                <input
                    type="text"
                    placeholder="Subject (optional)"
                    value={replySubject}
                    onChange={(e) => setReplySubject(e.target.value)}
                    className="w-full bg-gray-50 dark:bg-gray-900 border border-gray-300 dark:border-gray-600 rounded-lg px-4 py-2 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                />
                <div className="flex gap-3">
                    <textarea
                        placeholder={`Reply to ${clientName}...`}
                        value={replyContent}
                        onChange={(e) => setReplyContent(e.target.value)}
                        rows={3}
                        className="flex-1 bg-gray-50 dark:bg-gray-900 border border-gray-300 dark:border-gray-600 rounded-lg px-4 py-2 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 outline-none focus:ring-2 focus:ring-blue-500 resize-none text-sm"
                    />
                    <button
                        onClick={handleSendReply}
                        disabled={!replyContent.trim() || sending}
                        className="self-end px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 disabled:cursor-not-allowed text-white font-medium rounded-lg transition-all flex items-center gap-2"
                    >
                        {sending ? (
                            <Loader2 className="w-4 h-4 animate-spin" />
                        ) : (
                            <>
                                <Send className="w-4 h-4" />
                                Send
                            </>
                        )}
                    </button>
                </div>
                <p className="text-xs text-gray-600 dark:text-gray-400">
                    Sending a reply will automatically create a note and complete pending portal message tasks.
                </p>
            </div>
        </div>
    );
}
