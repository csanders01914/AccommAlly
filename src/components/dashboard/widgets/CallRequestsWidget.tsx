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
 caseNumber?: string;
 clientName?: string;
 clientPhone?: string;
 case?: {
 id: string;
 caseNumber: string;
 clientName: string;
 clientPhone?: string;
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
 <div className="widget-header" style={{ background: 'linear-gradient(to right, color-mix(in srgb, var(--warning) 8%, transparent), transparent)' }}>
 <h3 className="widget-header-title">
 <Phone className="w-4 h-4 text-warning" />
 Call Requests
 {pendingRequests.length > 0 && (
 <span className="text-xs bg-warning/10 text-warning px-1.5 py-0.5 rounded-full">
 {pendingRequests.length}
 </span>
 )}
 </h3>
 {hasUrgent && (
 <span className="flex h-2.5 w-2.5 relative">
 <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-danger/60 opacity-75"></span>
 <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-danger"></span>
 </span>
 )}
 </div>

 <div className="p-2 flex-1 overflow-y-auto space-y-2 custom-scrollbar">
 {pendingRequests.length > 0 ? pendingRequests.map(call => (
 <div
 key={call.id}
 onClick={() => setSelectedCall(call)}
 className="p-3 rounded-lg border border-warning/20 bg-warning/5 cursor-pointer hover:bg-warning/10 transition-colors"
 >
 <div className="flex justify-between items-start mb-1">
 <span className="text-sm font-medium text-text-primary">
 {call.name}
 </span>
 {call.urgent && (
 <span className="text-[10px] font-bold text-danger bg-danger/10 px-1.5 py-0.5 rounded border border-danger/20">
 URGENT
 </span>
 )}
 </div>
 <div className="text-xs text-text-secondary mb-2 line-clamp-1">
 {call.reason}
 </div>
 <div className="flex items-center justify-between">
 <div className="flex items-center gap-2 text-[10px] text-text-muted">
 <div className="flex items-center gap-1">
 <Clock className="w-3 h-3" />
 {formatTime(call.createdAt)}
 </div>
 {call.scheduledFor && (
 <div className="flex items-center gap-1 text-primary-600">
 <Calendar className="w-3 h-3" />
 {format(new Date(call.scheduledFor), 'MMM d, h:mm a')}
 </div>
 )}
 </div>
 <span className="text-[10px] text-warning font-medium">
 Click to manage →
 </span>
 </div>
 </div>
 )) : (
 <div className="text-center py-8 text-text-secondary font-medium text-sm">
 All calls returned ✓
 </div>
 )}
 </div>

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

 const [scheduledFor, setScheduledFor] = useState(
 call.scheduledFor ? format(new Date(call.scheduledFor), "yyyy-MM-dd'T'HH:mm") : ''
 );
 const [reason, setReason] = useState(call.reason);
 const [urgent, setUrgent] = useState(call.urgent);

 const [returnNote, setReturnNote] = useState('');
 const [phoneSelection, setPhoneSelection] = useState<'CASE' | 'REQUEST' | 'CUSTOM'>('CASE');
 const [customPhone, setCustomPhone] = useState('');

 const getSelectedPhone = () => {
 if (phoneSelection === 'CASE') return call.case?.clientPhone || '';
 if (phoneSelection === 'REQUEST') return call.phoneNumber || '';
 return customPhone;
 };

 const handleSave = async () => {
 setLoading(true);
 try {
 const res = await fetch(`/api/calls/${call.id}`, {
 method: 'PATCH',
 headers: { 'Content-Type': 'application/json' },
 body: JSON.stringify({ scheduledFor: scheduledFor || null, reason, urgent })
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
 note: returnNote,
 phoneNumberUsed: getSelectedPhone()
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
 className="modal-container max-w-md"
 onClick={e => e.stopPropagation()}
 >
 {/* Header */}
 <div className={cn(
 "p-4 flex items-center gap-3",
 call.urgent ? "bg-danger/5" : "bg-warning/5"
 )}>
 <Phone className={cn("w-5 h-5", call.urgent ? "text-danger" : "text-warning")} />
 <div className="flex-1">
 <h3 className="font-semibold text-text-primary">{call.name}</h3>
 {call.phoneNumber && (
 <a href={`tel:${call.phoneNumber}`} className="text-sm text-primary-600 hover:underline">
 {call.phoneNumber}
 </a>
 )}
 </div>
 {call.urgent && (
 <span className="flex items-center gap-1 text-xs font-bold text-danger bg-danger/10 px-2 py-1 rounded">
 <AlertTriangle className="w-3 h-3" />
 URGENT
 </span>
 )}
 <button onClick={onClose} className="p-1 hover:bg-surface-raised rounded">
 <X className="w-5 h-5 text-text-muted" />
 </button>
 </div>

 {/* Content */}
 <div className="p-4 space-y-4">
 {call.case && (
 <div className="text-sm bg-surface-raised p-3 rounded-lg">
 <span className="text-text-muted">Case: </span>
 <span className="font-medium text-text-primary">
 {call.case.caseNumber} - {call.case.clientName}
 </span>
 </div>
 )}

 {isEditing ? (
 <div>
 <label className="form-label">Reason</label>
 <textarea
 value={reason}
 onChange={e => setReason(e.target.value)}
 rows={3}
 className="form-input resize-none"
 />
 </div>
 ) : (
 <div>
 <div className="form-label" style={{ marginBottom: '0.25rem' }}>Reason</div>
 <div className="text-sm text-text-secondary">{call.reason}</div>
 </div>
 )}

 {isEditing ? (
 <div>
 <label className="form-label">Schedule Return Call</label>
 <input
 type="datetime-local"
 value={scheduledFor}
 onChange={e => setScheduledFor(e.target.value)}
 className="form-input"
 />
 </div>
 ) : call.scheduledFor ? (
 <div className="flex items-center gap-2 text-sm text-primary-600">
 <Calendar className="w-4 h-4" />
 Scheduled: {format(new Date(call.scheduledFor), 'MMMM d, yyyy h:mm a')}
 </div>
 ) : null}

 {isEditing && (
 <label className="flex items-center gap-2 cursor-pointer">
 <input
 type="checkbox"
 checked={urgent}
 onChange={e => setUrgent(e.target.checked)}
 className="w-4 h-4 rounded"
 />
 <span className="text-sm text-text-secondary">Mark as urgent</span>
 </label>
 )}

 <div className="text-xs text-text-muted flex items-center gap-4">
 <div className="flex items-center gap-1">
 <Clock className="w-3 h-3" />
 Received: {format(new Date(call.createdAt), 'MMM d, h:mm a')}
 </div>
 </div>

 {isCompleting && (
 <div className="border-t border-border pt-4 mt-4">
 <div className="text-sm font-medium text-text-primary mb-2 flex items-center gap-2">
 <CheckCircle className="w-4 h-4 text-success" />
 Return Call Details
 </div>

 <div className="mb-4 space-y-2">
 <label className="form-label">Number Called</label>
 <div className="space-y-2">
 {call.case?.clientPhone && (
 <label className="flex items-center gap-2 text-sm cursor-pointer">
 <input
 type="radio"
 name="phoneSelection"
 checked={phoneSelection === 'CASE'}
 onChange={() => setPhoneSelection('CASE')}
 />
 <span className="text-text-secondary">Case Phone: {call.case.clientPhone}</span>
 </label>
 )}
 {call.phoneNumber && call.phoneNumber !== call.case?.clientPhone && (
 <label className="flex items-center gap-2 text-sm cursor-pointer">
 <input
 type="radio"
 name="phoneSelection"
 checked={phoneSelection === 'REQUEST'}
 onChange={() => setPhoneSelection('REQUEST')}
 />
 <span className="text-text-secondary">Request Phone: {call.phoneNumber}</span>
 </label>
 )}
 <label className="flex items-center gap-2 text-sm cursor-pointer">
 <input
 type="radio"
 name="phoneSelection"
 checked={phoneSelection === 'CUSTOM'}
 onChange={() => setPhoneSelection('CUSTOM')}
 />
 <span className="text-text-secondary">Other Number</span>
 </label>
 {phoneSelection === 'CUSTOM' && (
 <input
 type="text"
 value={customPhone}
 onChange={(e) => setCustomPhone(e.target.value)}
 placeholder="Enter phone number..."
 className="form-input ml-6 max-w-[200px]"
 style={{ width: 'auto' }}
 />
 )}
 </div>
 </div>

 <label className="form-label">Notes</label>
 <textarea
 value={returnNote}
 onChange={e => setReturnNote(e.target.value)}
 placeholder="Enter notes from the return call..."
 rows={4}
 className="form-input resize-none"
 autoFocus
 />
 <p className="text-xs text-text-muted mt-1">
 This note will be saved to the case automatically.
 </p>
 </div>
 )}
 </div>

 {/* Actions */}
 <div className="modal-footer">
 {isEditing ? (
 <>
 <button onClick={() => setIsEditing(false)} className="btn-secondary">
 Cancel
 </button>
 <button onClick={handleSave} disabled={loading} className="btn-primary" style={{ backgroundColor: 'var(--warning)', color: '#fff' }}>
 {loading ? 'Saving...' : 'Save Changes'}
 </button>
 </>
 ) : isCompleting ? (
 <>
 <button onClick={() => setIsCompleting(false)} className="btn-secondary">
 Cancel
 </button>
 <button
 onClick={handleComplete}
 disabled={loading || !returnNote.trim()}
 className="btn-primary"
 style={{ backgroundColor: 'var(--success)' }}
 >
 <CheckCircle className="w-4 h-4 mr-1" />
 {loading ? 'Saving...' : 'Complete & Save Note'}
 </button>
 </>
 ) : (
 <>
 <button onClick={() => setIsEditing(true)} className="btn-secondary flex items-center gap-2">
 <Edit2 className="w-4 h-4" />
 Edit
 </button>
 <button
 onClick={() => setIsCompleting(true)}
 className="btn-primary"
 style={{ backgroundColor: 'var(--success)' }}
 >
 <CheckCircle className="w-4 h-4 mr-1" />
 Mark Complete
 </button>
 </>
 )}
 </div>
 </div>
 </div>
 );
}
