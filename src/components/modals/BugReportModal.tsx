'use client';
import { apiFetch } from '@/lib/api-client';

import { useState } from 'react';
import { X, Bug, Loader2 } from 'lucide-react';

interface BugReportModalProps {
 isOpen: boolean;
 onClose: () => void;
 initialTransactionId?: string;
 currentUser?: { name: string; email: string };
}

const labelCls = 'form-label';
const inputCls = 'form-input';

export function BugReportModal({ isOpen, onClose, initialTransactionId, currentUser }: BugReportModalProps) {
 const [transactionId, setTransactionId] = useState(initialTransactionId || '');
 const [subject, setSubject] = useState('');
 const [description, setDescription] = useState('');
 const [reporterName, setReporterName] = useState(currentUser?.name || '');
 const [reporterEmail, setReporterEmail] = useState(currentUser?.email || '');
 const [reporterPhone, setReporterPhone] = useState('');
 const [contactMethod, setContactMethod] = useState('EMAIL');
 const [shouldContact, setShouldContact] = useState(true);
 const [submitting, setSubmitting] = useState(false);

 if (!isOpen) return null;

 const handleSubmit = async (e: React.FormEvent) => {
 e.preventDefault();
 setSubmitting(true);
 try {
 const res = await apiFetch('/api/bug-reports', {
 method: 'POST',
 headers: { 'Content-Type': 'application/json' },
 body: JSON.stringify({ transactionId, subject, description, reporterName, reporterEmail, reporterPhone, contactMethod: shouldContact ? contactMethod : 'NONE' })
 });
 if (res.ok) { alert('Bug report submitted successfully! Thank you for your feedback.'); onClose(); }
 else { alert('Failed to submit bug report. Please try again.'); }
 } catch (error) {
 console.error(error);
 alert('An error occurred.');
 } finally {
 setSubmitting(false);
 }
 };

 return (
 <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[100] p-4">
 <div className="modal-container w-full max-w-lg overflow-hidden flex flex-col max-h-[90vh]">
 <div className="flex items-center justify-between px-5 py-4 border-b border-border bg-background">
 <div className="flex items-center gap-2">
 <Bug className="w-4 h-4 text-red-500" />
 <h3 className="text-base font-semibold text-text-primary">Submit Bug Report</h3>
 </div>
 <button onClick={onClose} className="p-1.5 hover:bg-surface-raised rounded-lg transition-colors">
 <X className="w-4 h-4 text-text-muted" />
 </button>
 </div>

 <form onSubmit={handleSubmit} className="p-5 space-y-4 overflow-y-auto">
 <div>
 <label className={labelCls}>Transaction ID <span className="normal-case font-normal text-text-muted">(optional)</span></label>
 <input type="text" value={transactionId} onChange={(e) => setTransactionId(e.target.value)} className={`${inputCls} font-mono`} placeholder="e.g. 1234-5678-…" />
 <p className="text-xs text-text-muted mt-1">Found in the error popup if you experienced a crash.</p>
 </div>

 <div className="grid grid-cols-2 gap-4">
 <div>
 <label className={labelCls}>Name <span className="text-red-500">*</span></label>
 <input required type="text" value={reporterName} onChange={(e) => setReporterName(e.target.value)} className={inputCls} />
 </div>
 <div>
 <label className={labelCls}>Email <span className="text-red-500">*</span></label>
 <input required type="email" value={reporterEmail} onChange={(e) => setReporterEmail(e.target.value)} className={inputCls} />
 </div>
 </div>

 <div>
 <label className={labelCls}>One-line Summary <span className="text-red-500">*</span></label>
 <input required type="text" value={subject} onChange={(e) => setSubject(e.target.value)} placeholder="e.g. Save button not working on case notes" className={inputCls} />
 </div>

 <div>
 <label className={labelCls}>Description <span className="text-red-500">*</span></label>
 <textarea required rows={4} value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Please describe what happened, steps to reproduce, and what you expected to happen." className={`${inputCls} resize-none`} />
 </div>

 <div className="bg-background p-4 rounded-lg border border-border space-y-3">
 <div className="flex items-center gap-2">
 <input type="checkbox" id="contact" checked={shouldContact} onChange={(e) => setShouldContact(e.target.checked)} className="rounded border-border-strong text-primary-500 focus:ring-[#0D9488]" />
 <label htmlFor="contact" className="text-sm font-medium text-text-primary">I would like to be contacted about this issue</label>
 </div>
 {shouldContact && (
 <div className="pl-6 space-y-3">
 <div className="flex items-center gap-4">
 <label className="flex items-center gap-2 text-sm text-text-secondary">
 <input type="radio" name="method" checked={contactMethod === 'EMAIL'} onChange={() => setContactMethod('EMAIL')} className="text-primary-500" /> Email
 </label>
 <label className="flex items-center gap-2 text-sm text-text-secondary">
 <input type="radio" name="method" checked={contactMethod === 'PHONE'} onChange={() => setContactMethod('PHONE')} className="text-primary-500" /> Phone
 </label>
 </div>
 {contactMethod === 'PHONE' && (
 <input type="tel" placeholder="Phone Number" value={reporterPhone} onChange={(e) => setReporterPhone(e.target.value)} className={inputCls} />
 )}
 </div>
 )}
 </div>
 </form>

 <div className="flex justify-end gap-2 px-5 py-4 border-t border-border bg-background">
 <button onClick={onClose} className="px-4 py-2 text-sm font-medium text-text-secondary hover:bg-surface-raised rounded-lg transition-colors">
 Cancel
 </button>
 <button onClick={handleSubmit} disabled={submitting} className="flex items-center gap-2 px-5 py-2 text-sm font-semibold text-white bg-primary-500 hover:bg-primary-600 rounded-lg disabled:opacity-50 transition-colors">
 {submitting && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
 Submit Report
 </button>
 </div>
 </div>
 </div>
 );
}
