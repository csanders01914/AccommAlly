'use client';
import { apiFetch } from '@/lib/api-client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { Shield, FileText, Calendar, Clock, LogOut, CheckCircle, Loader2, AlertCircle, RefreshCw, MessageSquare, Send, Download, User } from 'lucide-react';

interface Document {
 id: string;
 fileName: string;
 createdAt: string;
 category: string;
}

interface PortalMessage {
 id: string;
 subject: string | null;
 content: string;
 createdAt: string;
 direction: 'PORTAL_INBOUND' | 'PORTAL_OUTBOUND';
 read: boolean;
}

interface CaseData {
 caseNumber: string;
 createdAt: string;
 status: string;
 clientName: string;
 updatedAt: string;
 documents: Document[];
 createdById: string;
 createdBy?: { name: string };
}

export default function PortalDashboard() {
 const router = useRouter();
 const [data, setData] = useState<CaseData | null>(null);
 const [loading, setLoading] = useState(true);
 const [error, setError] = useState<string | null>(null);

 // Messaging state
 const [messages, setMessages] = useState<PortalMessage[]>([]);
 const [messagesLoading, setMessagesLoading] = useState(false);
 const [newMessage, setNewMessage] = useState('');
 const [messageSubject, setMessageSubject] = useState('');
 const [sendingMessage, setSendingMessage] = useState(false);
 const [messageSuccess, setMessageSuccess] = useState<string | null>(null);
 const [messageError, setMessageError] = useState<string | null>(null);

 // Active tab
 const [activeTab, setActiveTab] = useState<'status' | 'messages'>('status');

 const fetchData = useCallback(() => {
 setLoading(true);
 setError(null);
 apiFetch('/api/public/portal/status')
 .then(async (res) => {
 if (res.ok) return res.json();
 if (res.status === 401) {
 router.push('/portal');
 throw new Error('Unauthorized');
 }
 const errorData = await res.json().catch(() => ({}));
 throw new Error(errorData.error || 'Failed to load case data');
 })
 .then(setData)
 .catch((err) => {
 if (err.message !== 'Unauthorized') {
 setError(err.message || 'An error occurred while loading your case.');
 }
 })
 .finally(() => setLoading(false));
 }, [router]);

 const fetchMessages = useCallback(async () => {
 setMessagesLoading(true);
 try {
 const res = await apiFetch('/api/public/portal/messages');
 if (res.ok) {
 const data = await res.json();
 setMessages(data.messages || []);
 }
 } catch (e) {
 console.error('Failed to fetch messages:', e);
 } finally {
 setMessagesLoading(false);
 }
 }, []);

 useEffect(() => {
 fetchData();
 }, [fetchData]);

 useEffect(() => {
 if (activeTab === 'messages') {
 fetchMessages();
 }
 }, [activeTab, fetchMessages]);

 const handleLogout = async () => {
 await apiFetch('/api/public/portal/logout', { method: 'POST' });
 router.push('/portal');
 };

 const handleViewDocument = (docId: string) => {
 window.open(`/api/public/portal/documents/${docId}`, '_blank');
 };

 const handleSendMessage = async () => {
 if (!newMessage.trim()) return;

 setSendingMessage(true);
 setMessageError(null);
 setMessageSuccess(null);

 try {
 const res = await apiFetch('/api/public/portal/messages', {
 method: 'POST',
 headers: { 'Content-Type': 'application/json' },
 body: JSON.stringify({
 subject: messageSubject.trim() || null,
 content: newMessage.trim()
 })
 });

 if (res.ok) {
 setNewMessage('');
 setMessageSubject('');
 setMessageSuccess('Message sent successfully!');
 fetchMessages();
 setTimeout(() => setMessageSuccess(null), 5000);
 } else {
 const data = await res.json();
 setMessageError(data.error || 'Failed to send message');
 }
 } catch (e) {
 setMessageError('Failed to send message. Please try again.');
 } finally {
 setSendingMessage(false);
 }
 };

 if (loading) return (
 <div className="min-h-screen bg-background flex items-center justify-center">
 <Loader2 className="w-8 h-8 text-primary-500 animate-spin" />
 </div>
 );

 if (error || !data) return (
 <div className="min-h-screen bg-background flex items-center justify-center p-4">
 <div className="max-w-md w-full bg-surface border border-border shadow-sm rounded-3xl p-8 text-center">
 <div className="inline-flex p-3 rounded-2xl bg-red-50 mb-4 ring-1 ring-red-200">
 <AlertCircle className="w-8 h-8 text-red-500" />
 </div>
 <h2 className="text-xl font-bold text-text-primary mb-2">Unable to Load Case</h2>
 <p className="text-text-secondary text-sm mb-6">
 {error || 'We could not retrieve your case information. Please try again or contact support.'}
 </p>
 <div className="flex flex-col sm:flex-row gap-3 justify-center">
 <button
 onClick={fetchData}
 className="px-4 py-2 bg-primary-500 hover:bg-primary-600 text-white font-medium rounded-xl transition-all flex items-center justify-center gap-2 shadow-sm"
 >
 <RefreshCw className="w-4 h-4" /> Try Again
 </button>
 <button
 onClick={() => router.push('/portal')}
 className="px-4 py-2 bg-surface border border-border hover:bg-surface-raised text-text-secondary font-medium rounded-xl transition-all"
 >
 Back to Login
 </button>
 </div>
 </div>
 </div>
 );

 const getStatusColor = (status: string) => {
 switch (status) {
 case 'OPEN': return 'text-yellow-400 bg-yellow-400/10 border-yellow-400/20';
 case 'APPROVED': return 'text-green-400 bg-green-400/10 border-green-400/20';
 case 'DENIED': return 'text-red-400 bg-red-400/10 border-red-400/20';
 default: return 'text-blue-400 bg-blue-400/10 border-blue-400/20';
 }
 };

 return (
 <div className="min-h-screen bg-background">
 {/* Header */}
 <header className="border-b border-border bg-surface sticky top-0 z-10">
 <div className="max-w-5xl mx-auto px-4 h-16 flex items-center justify-between">
 <div className="flex items-center gap-3">
 <Shield className="w-6 h-6 text-primary-500" />
 <span className="text-text-primary font-bold">AccommAlly Portal</span>
 </div>
 <button onClick={handleLogout} className="text-sm text-text-secondary hover:text-text-primary flex items-center gap-2">
 <LogOut className="w-4 h-4" /> Sign Out
 </button>
 </div>
 </header>

 {/* Tab Navigation */}
 <div className="max-w-3xl mx-auto px-4 pt-4">
 <div className="flex gap-2 bg-surface border border-border p-1 rounded-xl shadow-sm w-fit">
 <button
 onClick={() => setActiveTab('status')}
 className={`py-2 px-4 rounded-lg text-sm font-medium transition-all flex items-center justify-center gap-2 ${activeTab === 'status'
 ? 'bg-primary-500 text-white shadow-sm'
 : 'text-text-secondary hover:text-text-primary hover:bg-surface-raised'
 }`}
 >
 <FileText className="w-4 h-4" /> Case Status
 </button>
 <button
 onClick={() => setActiveTab('messages')}
 className={`py-2 px-4 rounded-lg text-sm font-medium transition-all flex items-center justify-center gap-2 ${activeTab === 'messages'
 ? 'bg-primary-500 text-white shadow-sm'
 : 'text-text-secondary hover:text-text-primary hover:bg-surface-raised'
 }`}
 >
 <MessageSquare className="w-4 h-4" /> Messages
 </button>
 </div>
 </div>

 <main className="max-w-3xl mx-auto px-4 py-6">
 {/* STATUS TAB */}
 {activeTab === 'status' && (
 <>
 {/* Status Card */}
 <div className="bg-surface border border-border shadow-sm rounded-2xl p-6 mb-8">
 <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
 <div>
 <h1 className="text-2xl font-bold text-text-primary mb-1">Case # {data.caseNumber}</h1>
 <p className="text-text-secondary text-sm">Created on {new Date(data.createdAt).toLocaleDateString()}</p>
 </div>
 <div className={`px-4 py-2 rounded-full border text-sm font-bold flex items-center gap-2 ${getStatusColor(data.status)}`}>
 {data.status === 'APPROVED' ? <CheckCircle className="w-4 h-4" aria-hidden="true" /> : <Clock className="w-4 h-4" aria-hidden="true" />}
 {data.status}
 </div>
 </div>

 <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
 <div className="bg-background border border-border rounded-xl p-4">
 <p className="text-text-muted text-xs uppercase font-semibold mb-2">Applicant</p>
 <p className="text-text-primary font-medium">{data.clientName}</p>
 </div>
 <div className="bg-background border border-border rounded-xl p-4">
 <p className="text-text-muted text-xs uppercase font-semibold mb-2">Assigned Examiner</p>
 <p className="text-text-primary font-medium">{data.createdBy?.name || 'Pending Assignment'}</p>
 </div>
 <div className="bg-background border border-border rounded-xl p-4">
 <p className="text-text-muted text-xs uppercase font-semibold mb-2">Last Updated</p>
 <p className="text-text-primary font-medium">{new Date(data.updatedAt).toLocaleDateString()}</p>
 </div>
 </div>
 </div>

 {/* Timeline / Steps */}
 <h3 className="text-lg font-semibold text-text-primary mb-4 flex items-center gap-2">
 <Calendar className="w-5 h-5 text-primary-500" aria-hidden="true" /> Process Timeline
 </h3>
 <ol className="space-y-4 mb-8">
 <li><Step completed={true} title="Request Submitted" date={data.createdAt} /></li>
 <li><Step completed={data.status !== 'OPEN'} title="Coordinator Review" active={data.status === 'OPEN'} /></li>
 <li><Step completed={data.status === 'APPROVED' || data.status === 'DENIED'} title="Decision Made" active={false} /></li>
 </ol>

 {/* Documents */}
 <h3 className="text-lg font-semibold text-text-primary mb-4 flex items-center gap-2">
 <FileText className="w-5 h-5 text-primary-500" aria-hidden="true" /> Documents
 </h3>
 <div className="bg-surface border border-border shadow-sm rounded-2xl p-6">
 {data.documents && data.documents.length > 0 ? (
 <ul className="space-y-3">
 {data.documents.map((doc) => (
 <li key={doc.id} className="flex items-center justify-between p-3 bg-background border border-border rounded-lg hover:bg-surface-raised transition-colors">
 <div className="flex items-center gap-3">
 <div className="w-8 h-8 rounded bg-primary-500/10 flex items-center justify-center">
 <FileText className="w-4 h-4 text-primary-500" aria-hidden="true" />
 </div>
 <div>
 <p className="text-text-primary text-sm font-medium">{doc.fileName}</p>
 <p className="text-text-muted text-xs">{new Date(doc.createdAt).toLocaleDateString()}</p>
 </div>
 </div>
 <div className="flex items-center gap-2">
 <span className="text-xs text-text-secondary font-mono uppercase">{doc.category}</span>
 <button
 onClick={() => handleViewDocument(doc.id)}
 className="p-2 hover:bg-[#E5E2DB] rounded-lg transition-colors"
 title="View/Download"
 >
 <Download className="w-4 h-4 text-primary-500" />
 </button>
 </div>
 </li>
 ))}
 </ul>
 ) : (
 <p className="text-text-secondary text-center py-4">No documents on file.</p>
 )}
 </div>
 </>
 )}

 {/* MESSAGES TAB */}
 {activeTab === 'messages' && (
 <div className="space-y-6">
 <div className="bg-surface border border-border shadow-sm rounded-2xl overflow-hidden">
 {/* Messages Header */}
 <div className="px-6 py-4 border-b border-border bg-background flex items-center justify-between">
 <h3 className="text-lg font-semibold text-text-primary flex items-center gap-2">
 <MessageSquare className="w-5 h-5 text-primary-500" />
 Messages with Your Examiner
 </h3>
 <button
 onClick={fetchMessages}
 className="p-2 hover:bg-[#E5E2DB] rounded-lg transition-colors"
 title="Refresh"
 >
 <RefreshCw className={`w-4 h-4 text-primary-500 ${messagesLoading ? 'animate-spin' : ''}`} />
 </button>
 </div>

 {/* Messages List */}
 <div className="max-h-96 overflow-y-auto p-4 space-y-3">
 {messagesLoading && messages.length === 0 ? (
 <div className="flex justify-center py-8">
 <Loader2 className="w-6 h-6 text-primary-500 animate-spin" />
 </div>
 ) : messages.length === 0 ? (
 <p className="text-center text-text-secondary py-8">
 No messages yet. Send a message to your examiner below.
 </p>
 ) : (
 messages.map((msg) => (
 <div
 key={msg.id}
 className={`p-4 rounded-xl shadow-sm border ${msg.direction === 'PORTAL_INBOUND'
 ? 'bg-surface border-border ml-4'
 : 'bg-background border-border mr-4'
 }`}
 >
 <div className="flex items-center gap-2 mb-2">
 <div className={`w-6 h-6 rounded-full flex items-center justify-center ${msg.direction === 'PORTAL_INBOUND' ? 'bg-primary-500/10' : 'bg-[#E5E2DB]'
 }`}>
 <User className={`w-3 h-3 ${msg.direction === 'PORTAL_INBOUND' ? 'text-primary-500' : 'text-text-secondary'}`} />
 </div>
 <span className="text-sm font-bold text-text-primary">
 {msg.direction === 'PORTAL_INBOUND' ? 'You' : 'Examiner'}
 </span>
 <span className="text-xs text-text-muted ml-auto">
 {new Date(msg.createdAt).toLocaleString()}
 </span>
 </div>
 {msg.subject && (
 <p className="text-sm font-semibold text-text-primary mb-2 border-b border-border pb-2">{msg.subject}</p>
 )}
 <p className="text-sm text-text-primary whitespace-pre-wrap leading-relaxed">{msg.content}</p>
 </div>
 ))
 )}
 </div>

 {/* Compose Message */}
 <div className="p-4 border-t border-border bg-background space-y-3">
 {messageError && (
 <div className="flex items-center gap-2 text-red-600 text-sm bg-red-50 p-3 rounded-lg border border-red-200">
 <AlertCircle className="w-4 h-4" />
 {messageError}
 </div>
 )}
 {messageSuccess && (
 <div className="flex items-center gap-2 text-green-700 text-sm bg-green-50 p-3 rounded-lg border border-green-200">
 <CheckCircle className="w-4 h-4" />
 {messageSuccess}
 </div>
 )}

 <input
 type="text"
 placeholder="Subject (optional)"
 value={messageSubject}
 onChange={(e) => setMessageSubject(e.target.value)}
 className="w-full bg-surface border border-border rounded-lg px-4 py-2 text-text-primary placeholder-text-muted outline-none focus:ring-2 focus:ring-[#0D9488] text-sm"
 />
 <div className="flex gap-3">
 <textarea
 placeholder="Type your message to the examiner..."
 value={newMessage}
 onChange={(e) => setNewMessage(e.target.value)}
 rows={3}
 className="flex-1 bg-surface border border-border rounded-lg px-4 py-2 text-text-primary placeholder-text-muted outline-none focus:ring-2 focus:ring-[#0D9488] resize-none text-sm"
 />
 <button
 onClick={handleSendMessage}
 disabled={!newMessage.trim() || sendingMessage}
 className="self-end px-4 py-2 bg-primary-500 hover:bg-primary-600 disabled:bg-primary-500/50 text-white font-medium rounded-lg shadow-sm transition-all flex items-center gap-2"
 >
 {sendingMessage ? (
 <Loader2 className="w-4 h-4 animate-spin" />
 ) : (
 <>
 <Send className="w-4 h-4" />
 Send
 </>
 )}
 </button>
 </div>
 </div>
 </div>
 </div>
 )}
 </main>
 </div>
 );
}

interface StepProps {
 completed: boolean;
 title: string;
 date?: string;
 active?: boolean;
}

function Step({ completed, title, date, active }: StepProps) {
 return (
 <div className="flex gap-4">
 <div className="flex flex-col items-center">
 <div className={`w-8 h-8 rounded-full flex items-center justify-center border-2 ${completed ? 'bg-green-50 border-green-500 text-green-600' :
 active ? 'bg-primary-500/10 border-primary-500 text-primary-500 animate-pulse' :
 'border-border text-border'
 }`}>
 {completed ? <CheckCircle className="w-5 h-5" aria-hidden="true" /> : <div className="w-2 h-2 bg-current rounded-full" />}
 </div>
 <div className="w-0.5 h-full bg-[#E5E2DB] min-h-[30px]" />
 </div>
 <div className={`pb-8 ${completed || active ? 'opacity-100' : 'opacity-60'}`}>
 <p className="text-text-primary font-medium">{title}</p>
 {date && <p className="text-sm text-text-muted">{new Date(date).toLocaleDateString()}</p>}
 {active && <p className="text-sm text-primary-500">In Progress</p>}
 </div>
 </div>
 );
}
