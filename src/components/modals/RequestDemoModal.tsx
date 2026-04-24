'use client';

import { useState } from 'react';
import { X, User, Mail, Building, Briefcase, Users, MessageSquare, Loader2, CheckCircle2, AlertCircle } from 'lucide-react';
import { apiFetch } from '@/lib/api-client';

interface RequestDemoModalProps {
 isOpen: boolean;
 onClose: () => void;
}

export function RequestDemoModal({ isOpen, onClose }: RequestDemoModalProps) {
 const [name, setName] = useState('');
 const [email, setEmail] = useState('');
 const [organization, setOrganization] = useState('');
 const [casesEstimate, setCasesEstimate] = useState('');
 const [usersEstimate, setUsersEstimate] = useState('');
 const [message, setMessage] = useState('');

 const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
 const [errorMsg, setErrorMsg] = useState<string | null>(null);

 const handleSubmit = async (e: React.FormEvent) => {
 e.preventDefault();
 setStatus('loading');
 setErrorMsg(null);

 try {
 const res = await apiFetch('/api/demo/request', {
 method: 'POST',
 headers: { 'Content-Type': 'application/json' },
 body: JSON.stringify({
 name,
 email,
 organization,
 casesEstimate,
 usersEstimate,
 message
 })
 });

 if (!res.ok) {
 const data = await res.json();
 throw new Error(data.error || 'Failed to submit demo request.');
 }

 setStatus('success');
 // Reset form
 setName('');
 setEmail('');
 setOrganization('');
 setCasesEstimate('');
 setUsersEstimate('');
 setMessage('');
 } catch (err: any) {
 setErrorMsg(err.message || 'An unexpected error occurred.');
 setStatus('error');
 }
 };

 if (!isOpen) return null;

 return (
 <div
 className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60"
 onClick={(e) => { if (e.target === e.currentTarget && status !== 'loading') onClose(); }}
 role="dialog"
 aria-modal="true"
 aria-labelledby="demo-modal-title"
 >
 <div className="relative w-full max-w-[500px] bg-surface rounded-2xl shadow-2xl overflow-hidden border border-border">
 <div className="flex items-center justify-between px-6 py-5 border-b border-border bg-background">
 <div>
 <h2 id="demo-modal-title" className="text-xl font-semibold inline-block" style={{ color: '#1C1A17', fontFamily: 'var(--font-instrument-serif), Georgia, serif' }}>
 Request a Demo
 </h2>
 <p className="text-sm mt-1" style={{ color: '#5C5850' }}>See AccommAlly in action.</p>
 </div>
 <button
 onClick={onClose}
 disabled={status === 'loading'}
 className="p-2 rounded-full transition-colors text-text-muted hover:text-text-primary hover:bg-surface-raised disabled:opacity-50"
 aria-label="Close"
 >
 <X className="w-5 h-5" />
 </button>
 </div>

 <div className="p-6">
 {status === 'success' ? (
 <div className="flex flex-col items-center justify-center py-12 text-center">
 <div className="w-16 h-16 rounded-full bg-primary-50 flex items-center justify-center mb-6">
 <CheckCircle2 className="w-8 h-8 text-primary-500" />
 </div>
 <h3 className="text-2xl font-semibold mb-3" style={{ color: '#1C1A17', fontFamily: 'var(--font-instrument-serif), Georgia, serif' }}>
 Request Sent!
 </h3>
 <p className="text-text-secondary max-w-sm mb-8">
 Thanks for reaching out. A member of our team will be in touch shortly to schedule your personalized demo.
 </p>
 <button
 onClick={onClose}
 className="px-6 py-2.5 bg-primary-500 hover:bg-primary-600 text-white rounded-lg font-medium transition-colors"
 >
 Done
 </button>
 </div>
 ) : (
 <form onSubmit={handleSubmit} className="space-y-4">
 {status === 'error' && errorMsg && (
 <div className="p-4 rounded-lg bg-danger/5 border border-danger/20 flex items-start gap-3">
 <AlertCircle className="w-4 h-4 text-danger mt-0.5 shrink-0" />
 <p className="text-sm text-danger">{errorMsg}</p>
 </div>
 )}
 
 <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
 <div>
 <label htmlFor="name" className="block text-sm font-medium mb-1.5" style={{ color: '#1C1A17' }}>
 Full Name *
 </label>
 <div className="relative">
 <User className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-border-strong pointer-events-none" />
 <input
 id="name"
 required
 value={name}
 onChange={(e) => setName(e.target.value)}
 className="w-full pl-10 pr-4 py-2.5 rounded-lg border border-border bg-white text-sm focus:outline-none focus:border-primary-500 transition-colors"
 placeholder="Jane Doe"
 disabled={status === 'loading'}
 />
 </div>
 </div>
 
 <div>
 <label htmlFor="email" className="block text-sm font-medium mb-1.5" style={{ color: '#1C1A17' }}>
 Email Address *
 </label>
 <div className="relative">
 <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-border-strong pointer-events-none" />
 <input
 id="email"
 required
 type="email"
 value={email}
 onChange={(e) => setEmail(e.target.value)}
 className="w-full pl-10 pr-4 py-2.5 rounded-lg border border-border bg-white text-sm focus:outline-none focus:border-primary-500 transition-colors"
 placeholder="jane@organization.org"
 disabled={status === 'loading'}
 />
 </div>
 </div>
 </div>

 <div>
 <label htmlFor="org" className="block text-sm font-medium mb-1.5" style={{ color: '#1C1A17' }}>
 Organization Name *
 </label>
 <div className="relative">
 <Building className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-border-strong pointer-events-none" />
 <input
 id="org"
 required
 value={organization}
 onChange={(e) => setOrganization(e.target.value)}
 className="w-full pl-10 pr-4 py-2.5 rounded-lg border border-border bg-white text-sm focus:outline-none focus:border-primary-500 transition-colors"
 placeholder="Acme Health Inc."
 disabled={status === 'loading'}
 />
 </div>
 </div>

 <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
 <div>
 <label htmlFor="cases" className="block text-sm font-medium mb-1.5" style={{ color: '#1C1A17' }}>
 Est. Open Cases *
 </label>
 <div className="relative">
 <Briefcase className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-border-strong pointer-events-none" />
 <select
 id="cases"
 required
 value={casesEstimate}
 onChange={(e) => setCasesEstimate(e.target.value)}
 className="w-full pl-10 pr-4 py-2.5 rounded-lg border border-border bg-white text-sm focus:outline-none focus:border-primary-500 transition-colors appearance-none"
 disabled={status === 'loading'}
 >
 <option value="" disabled>Select range</option>
 <option value="1-50">1 - 50</option>
 <option value="50-250">50 - 250</option>
 <option value="250-1000">250 - 1,000</option>
 <option value="1000+">1,000+</option>
 </select>
 </div>
 </div>
 
 <div>
 <label htmlFor="users" className="block text-sm font-medium mb-1.5" style={{ color: '#1C1A17' }}>
 Est. Active Users *
 </label>
 <div className="relative">
 <Users className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-border-strong pointer-events-none" />
 <select
 id="users"
 required
 value={usersEstimate}
 onChange={(e) => setUsersEstimate(e.target.value)}
 className="w-full pl-10 pr-4 py-2.5 rounded-lg border border-border bg-white text-sm focus:outline-none focus:border-primary-500 transition-colors appearance-none"
 disabled={status === 'loading'}
 >
 <option value="" disabled>Select range</option>
 <option value="1-2">1 - 2 users</option>
 <option value="3-5">3 - 5 users</option>
 <option value="6-15">6 - 15 users</option>
 <option value="15+">15+ users</option>
 </select>
 </div>
 </div>
 </div>

 <div>
 <label htmlFor="message" className="block text-sm font-medium mb-1.5" style={{ color: '#1C1A17' }}>
 Message <span className="text-text-muted font-normal">(Optional)</span>
 </label>
 <div className="relative">
 <MessageSquare className="absolute left-3.5 top-3.5 w-4 h-4 text-border-strong pointer-events-none" />
 <textarea
 id="message"
 rows={3}
 value={message}
 onChange={(e) => setMessage(e.target.value)}
 className="w-full pl-10 pr-4 py-2.5 rounded-lg border border-border bg-white text-sm focus:outline-none focus:border-primary-500 transition-colors"
 placeholder="Any specific needs?"
 disabled={status === 'loading'}
 />
 </div>
 </div>

 <button
 type="submit"
 disabled={status === 'loading'}
 className="w-full mt-2 py-2.5 px-4 rounded-lg text-sm font-medium text-white transition-all disabled:opacity-50 flex items-center justify-center gap-2"
 style={{ backgroundColor: '#0D9488' }}
 onMouseEnter={e => { if (status !== 'loading') e.currentTarget.style.backgroundColor = '#0F766E'; }}
 onMouseLeave={e => { if (status !== 'loading') e.currentTarget.style.backgroundColor = '#0D9488'; }}
 >
 {status === 'loading' ? (
 <>
 <Loader2 className="w-4 h-4 animate-spin" />
 Submitting...
 </>
 ) : (
 'Submit Request'
 )}
 </button>
 </form>
 )}
 </div>
 </div>
 </div>
 );
}

