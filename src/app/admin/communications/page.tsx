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
 <h1 className="text-2xl font-bold text-text-primary">Admin Communication Hub</h1>
 <p className="text-text-muted">Monitor and manage system-wide messages and return calls.</p>
 </div>
 <button
 onClick={fetchData}
 className="p-2 bg-surface border border-border rounded-lg hover:bg-background text-text-secondary transition-colors"
 >
 <RefreshCw className={`w-5 h-5 ${loading ? 'animate-spin' : ''}`} />
 </button>
 </div>

 {/* Tabs */}
 <div className="flex space-x-1 bg-background p-1 rounded-lg w-fit border border-border">
 <button
 onClick={() => setActiveTab('MESSAGES')}
 className={`px-4 py-2 rounded-md text-sm font-medium transition-all ${activeTab === 'MESSAGES'
 ? 'bg-surface text-primary-500 shadow-sm'
 : 'text-text-secondary hover:text-text-primary hover:bg-surface-raised'
 }`}
 >
 <div className="flex items-center gap-2">
 <Mail className="w-4 h-4" />
 Messages ({messages.length})
 </div>
 </button>
 <button
 onClick={() => setActiveTab('RTCS')}
 className={`px-4 py-2 rounded-md text-sm font-medium transition-all ${activeTab === 'RTCS'
 ? 'bg-surface text-primary-500 shadow-sm'
 : 'text-text-secondary hover:text-text-primary hover:bg-surface-raised'
 }`}
 >
 <div className="flex items-center gap-2">
 <Phone className="w-4 h-4" />
 Return Calls ({rtcs.length})
 </div>
 </button>
 </div>

 {/* Content Area */}
 <div className="bg-surface rounded-xl border border-border overflow-hidden min-h-[500px]">
 {loading && messages.length === 0 && rtcs.length === 0 ? (
 <div className="flex justify-center items-center h-64">
 <span className="text-text-muted">Loading...</span>
 </div>
 ) : activeTab === 'MESSAGES' ? (
 <div className="overflow-x-auto">
 <table className="w-full text-left text-sm">
 <thead className="bg-background border-b border-border">
 <tr>
 <th className="px-6 py-4 text-xs font-semibold text-text-muted uppercase tracking-[0.08em]">Date</th>
 <th className="px-6 py-4 text-xs font-semibold text-text-muted uppercase tracking-[0.08em]">From</th>
 <th className="px-6 py-4 text-xs font-semibold text-text-muted uppercase tracking-[0.08em]">To</th>
 <th className="px-6 py-4 text-xs font-semibold text-text-muted uppercase tracking-[0.08em]">Subject</th>
 <th className="px-6 py-4 text-xs font-semibold text-text-muted uppercase tracking-[0.08em] text-right">Actions</th>
 </tr>
 </thead>
 <tbody className="divide-y divide-[#F3F1EC]">
 {messages.map(msg => (
 <tr key={msg.id} className="hover:bg-background transition-colors">
 <td className="px-6 py-4 text-text-muted whitespace-nowrap">
 {format(new Date(msg.createdAt), 'MMM d, h:mm a')}
 </td>
 <td className="px-6 py-4">
 <div className="font-medium text-text-primary">{msg.sender.name}</div>
 <div className="text-xs text-text-muted">{msg.sender.email}</div>
 </td>
 <td className="px-6 py-4">
 <div className="flex items-center gap-2">
 <div className="font-medium text-text-primary">{msg.recipient.name}</div>
 <ArrowRight className="w-3 h-3 text-text-muted" />
 </div>
 <div className="text-xs text-text-muted">{msg.recipient.email}</div>
 </td>
 <td className="px-6 py-4">
 <div className="text-text-primary font-medium truncate max-w-xs">{msg.subject}</div>
 <div className="text-text-muted truncate max-w-xs text-xs">{msg.content}</div>
 </td>
 <td className="px-6 py-4 text-right">
 <button
 onClick={() => setReassignItem({ id: msg.id, type: 'MESSAGE', title: msg.subject })}
 className="text-primary-500 hover:text-primary-600 text-xs font-medium border border-primary-500/20 bg-primary-500/8 px-3 py-1.5 rounded-lg hover:border-primary-500/40 transition-colors"
 >
 Reassign
 </button>
 </td>
 </tr>
 ))}
 {messages.length === 0 && (
 <tr>
 <td colSpan={5} className="px-6 py-12 text-center text-text-muted">
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
 <thead className="bg-background border-b border-border">
 <tr>
 <th className="px-6 py-4 text-xs font-semibold text-text-muted uppercase tracking-[0.08em]">Status</th>
 <th className="px-6 py-4 text-xs font-semibold text-text-muted uppercase tracking-[0.08em]">Client</th>
 <th className="px-6 py-4 text-xs font-semibold text-text-muted uppercase tracking-[0.08em]">Details</th>
 <th className="px-6 py-4 text-xs font-semibold text-text-muted uppercase tracking-[0.08em]">Assigned To</th>
 <th className="px-6 py-4 text-xs font-semibold text-text-muted uppercase tracking-[0.08em]">Due</th>
 <th className="px-6 py-4 text-xs font-semibold text-text-muted uppercase tracking-[0.08em] text-right">Actions</th>
 </tr>
 </thead>
 <tbody className="divide-y divide-[#F3F1EC]">
 {rtcs.map(rtc => (
 <tr key={rtc.id} className="hover:bg-background transition-colors">
 <td className="px-6 py-4">
 <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium border ${rtc.priority === 'URGENT' || rtc.priority === 'HIGH'
 ? 'bg-red-50 text-red-700 border-red-100'
 : 'bg-primary-500/8 text-primary-500 border-primary-500/20'
 }`}>
 {rtc.priority}
 </span>
 </td>
 <td className="px-6 py-4">
 <div className="font-medium text-text-primary">{rtc.client.name}</div>
 <div className="text-xs text-text-muted">Case: {rtc.client.caseNumber}</div>
 </td>
 <td className="px-6 py-4">
 <div className="text-text-primary font-medium truncate max-w-xs">{rtc.title}</div>
 <div className="text-text-muted truncate max-w-xs text-xs">{rtc.description}</div>
 </td>
 <td className="px-6 py-4">
 {rtc.assignedTo ? (
 <div className="flex items-center gap-2">
 <div className="w-5 h-5 rounded-full bg-surface-raised flex items-center justify-center text-[10px] text-text-secondary font-bold">
 {rtc.assignedTo.name.charAt(0)}
 </div>
 <span className="text-text-secondary">{rtc.assignedTo.name}</span>
 </div>
 ) : (
 <span className="text-text-muted italic text-xs">Unassigned</span>
 )}
 </td>
 <td className="px-6 py-4 text-text-muted whitespace-nowrap">
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
 className="text-text-muted text-xs font-medium border border-border bg-background px-3 py-1.5 rounded-lg cursor-not-allowed"
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
 <td colSpan={6} className="px-6 py-12 text-center text-text-muted">
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
