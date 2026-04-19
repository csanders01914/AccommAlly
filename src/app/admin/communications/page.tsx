'use client';
import { apiFetch } from '@/lib/api-client';

import { useState, useEffect } from 'react';
import { Mail, Phone, RefreshCw, User, Calendar, ArrowRight, CheckCircle, Clock } from 'lucide-react';
import { format } from 'date-fns';
import { ReassignModal } from '@/components/modals/ReassignModal';

type Tab = 'MESSAGES' | 'RTCS';

interface Message {
    id: string;
    subject: string;
    content: string;
    createdAt: string;
    sender: { name: string; email: string };
    recipient: { name: string; email: string };
    read: boolean;
}

interface RTC {
    id: string;
    type: 'TASK' | 'CALL_REQUEST';
    title: string;
    description: string;
    status: string;
    priority: string;
    createdAt: string;
    dueDate?: string;
    assignedTo?: { name: string };
    client: { name: string; caseNumber: string };
}

export default function AdminCommunicationsPage() {
    const [activeTab, setActiveTab] = useState<Tab>('MESSAGES');
    const [messages, setMessages] = useState<Message[]>([]);
    const [rtcs, setRtcs] = useState<RTC[]>([]);
    const [loading, setLoading] = useState(true);

    // Reassignment State
    const [reassignItem, setReassignItem] = useState<{ id: string, type: string, title: string } | null>(null);

    useEffect(() => {
        fetchData();
    }, []);

    const fetchData = async () => {
        setLoading(true);
        try {
            const res = await apiFetch('/api/admin/communications?type=all');
            if (res.ok) {
                const data = await res.json();
                setMessages(data.messages);
                setRtcs(data.rtcs);
            }
        } catch (error) {
            console.error('Failed to load data', error);
        } finally {
            setLoading(false);
        }
    };

    const handleReassign = async (newUserId: string) => {
        if (!reassignItem) return;

        try {
            const res = await apiFetch('/api/admin/communications/reassign', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    id: reassignItem.id,
                    type: reassignItem.type,
                    newAssigneeId: newUserId
                })
            });

            if (res.ok) {
                // Refresh data
                fetchData();
                setReassignItem(null);
            } else {
                const err = await res.json();
                alert(`Error: ${err.error}`);
            }
        } catch (error) {
            console.error('Reassign failed', error);
            alert('Failed to reassign');
        }
    };

    return (
        <div className="p-8 max-w-7xl mx-auto space-y-6">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Admin Communication Hub</h1>
                    <p className="text-gray-500 dark:text-gray-400">Monitor and manage system-wide messages and return calls.</p>
                </div>
                <button
                    onClick={fetchData}
                    className="p-2 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 text-gray-600 dark:text-gray-300 transition-colors"
                >
                    <RefreshCw className={`w-5 h-5 ${loading ? 'animate-spin' : ''}`} />
                </button>
            </div>

            {/* Tabs */}
            <div className="flex space-x-1 bg-white/20 dark:bg-gray-800/50 p-1 rounded-xl w-fit border border-white/10">
                <button
                    onClick={() => setActiveTab('MESSAGES')}
                    className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${activeTab === 'MESSAGES'
                        ? 'bg-white/50 dark:bg-gray-700/50 text-blue-700 dark:text-blue-300 shadow-sm backdrop-blur-sm'
                        : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200'
                        }`}
                >
                    <div className="flex items-center gap-2">
                        <Mail className="w-4 h-4" />
                        sys_messages ({messages.length})
                    </div>
                </button>
                <button
                    onClick={() => setActiveTab('RTCS')}
                    className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${activeTab === 'RTCS'
                        ? 'bg-white/50 dark:bg-gray-700/50 text-amber-700 dark:text-amber-300 shadow-sm backdrop-blur-sm'
                        : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200'
                        }`}
                >
                    <div className="flex items-center gap-2">
                        <Phone className="w-4 h-4" />
                        return_calls ({rtcs.length})
                    </div>
                </button>
            </div>

            {/* Content Area */}
            <div className="bg-white/30 dark:bg-gray-900/30 rounded-2xl shadow-sm border border-white/20 dark:border-gray-700/30 overflow-hidden min-h-[500px] backdrop-blur-md">
                {loading && messages.length === 0 && rtcs.length === 0 ? (
                    <div className="flex justify-center items-center h-64">
                        <span className="text-gray-400">Loading...</span>
                    </div>
                ) : activeTab === 'MESSAGES' ? (
                    <div className="overflow-x-auto">
                        <table className="w-full text-left text-sm">
                            <thead className="bg-white/20 dark:bg-gray-800/50 border-b border-white/10 dark:border-gray-700/30 text-gray-600 dark:text-gray-300 font-medium">
                                <tr>
                                    <th className="px-6 py-4">Date</th>
                                    <th className="px-6 py-4">From</th>
                                    <th className="px-6 py-4">To</th>
                                    <th className="px-6 py-4">Subject</th>
                                    <th className="px-6 py-4 text-right">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-white/10 dark:divide-gray-700/30">
                                {messages.map(msg => (
                                    <tr key={msg.id} className="hover:bg-white/20 dark:hover:bg-gray-800/30 transition-colors">
                                        <td className="px-6 py-4 text-gray-500 whitespace-nowrap">
                                            {format(new Date(msg.createdAt), 'MMM d, h:mm a')}
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="font-medium text-gray-900 dark:text-white">{msg.sender.name}</div>
                                            <div className="text-xs text-gray-500">{msg.sender.email}</div>
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="flex items-center gap-2">
                                                <div className="font-medium text-gray-900 dark:text-white">{msg.recipient.name}</div>
                                                <ArrowRight className="w-3 h-3 text-gray-400" />
                                            </div>
                                            <div className="text-xs text-gray-500">{msg.recipient.email}</div>
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="text-gray-900 dark:text-white font-medium truncate max-w-xs">{msg.subject}</div>
                                            <div className="text-gray-500 truncate max-w-xs text-xs">{msg.content}</div>
                                        </td>
                                        <td className="px-6 py-4 text-right">
                                            <button
                                                onClick={() => setReassignItem({ id: msg.id, type: 'MESSAGE', title: msg.subject })}
                                                className="text-blue-600 hover:text-blue-700 text-xs font-medium border border-blue-200 bg-blue-50 px-3 py-1.5 rounded-lg hover:border-blue-300 transition-colors"
                                            >
                                                Reassign
                                            </button>
                                        </td>
                                    </tr>
                                ))}
                                {messages.length === 0 && (
                                    <tr>
                                        <td colSpan={5} className="px-6 py-12 text-center text-gray-500">
                                            No messages found
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full text-left text-sm">
                            <thead className="bg-white/20 dark:bg-gray-800/50 border-b border-white/10 dark:border-gray-700/30 text-gray-600 dark:text-gray-300 font-medium">
                                <tr>
                                    <th className="px-6 py-4">Status</th>
                                    <th className="px-6 py-4">Client</th>
                                    <th className="px-6 py-4">Details</th>
                                    <th className="px-6 py-4">Assigned To</th>
                                    <th className="px-6 py-4">Due</th>
                                    <th className="px-6 py-4 text-right">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-white/10 dark:divide-gray-700/30">
                                {rtcs.map(rtc => (
                                    <tr key={rtc.id} className="hover:bg-white/20 dark:hover:bg-gray-800/30 transition-colors">
                                        <td className="px-6 py-4">
                                            <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium border ${rtc.priority === 'URGENT' || rtc.priority === 'HIGH'
                                                ? 'bg-red-50 text-red-700 border-red-100'
                                                : 'bg-blue-50 text-blue-700 border-blue-100'
                                                }`}>
                                                {rtc.priority}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="font-medium text-gray-900 dark:text-white">{rtc.client.name}</div>
                                            <div className="text-xs text-gray-500">Case: {rtc.client.caseNumber}</div>
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="text-gray-900 dark:text-white font-medium truncate max-w-xs">{rtc.title}</div>
                                            <div className="text-gray-500 truncate max-w-xs text-xs">{rtc.description}</div>
                                        </td>
                                        <td className="px-6 py-4">
                                            {rtc.assignedTo ? (
                                                <div className="flex items-center gap-2">
                                                    <div className="w-5 h-5 rounded-full bg-gray-200 flex items-center justify-center text-[10px] text-gray-600 font-bold">
                                                        {rtc.assignedTo.name.charAt(0)}
                                                    </div>
                                                    <span className="text-gray-700 dark:text-gray-300">{rtc.assignedTo.name}</span>
                                                </div>
                                            ) : (
                                                <span className="text-gray-400 italic text-xs">Unassigned</span>
                                            )}
                                        </td>
                                        <td className="px-6 py-4 text-gray-500 whitespace-nowrap">
                                            {rtc.dueDate ? (
                                                <div className="flex items-center gap-1">
                                                    <Calendar className="w-3 h-3" />
                                                    {format(new Date(rtc.dueDate), 'MMM d, h:mm a')}
                                                </div>
                                            ) : '-'}
                                        </td>
                                        <td className="px-6 py-4 text-right">
                                            {rtc.type === 'TASK' ? (
                                                <button
                                                    onClick={() => setReassignItem({ id: rtc.id, type: rtc.type, title: rtc.title })}
                                                    className="text-amber-600 hover:text-amber-700 text-xs font-medium border border-amber-200 bg-amber-50 px-3 py-1.5 rounded-lg hover:border-amber-300 transition-colors"
                                                >
                                                    Reassign
                                                </button>
                                            ) : (
                                                <button
                                                    disabled
                                                    className="text-gray-400 text-xs font-medium border border-gray-100 bg-gray-50 px-3 py-1.5 rounded-lg cursor-not-allowed"
                                                    title="Call Requests cannot be reassigned directly. Convert to Task first."
                                                >
                                                    Reassign
                                                </button>
                                            )}
                                        </td>
                                    </tr>
                                ))}
                                {rtcs.length === 0 && (
                                    <tr>
                                        <td colSpan={6} className="px-6 py-12 text-center text-gray-500">
                                            No pending return calls found
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>

            {/* Reassign Modal */}
            <ReassignModal
                isOpen={!!reassignItem}
                onClose={() => setReassignItem(null)}
                currentItemType={reassignItem?.type || ''}
                currentItemTitle={reassignItem?.title}
                onReassign={handleReassign}
            />
        </div>
    );
}
