'use client';
import { apiFetch } from '@/lib/api-client';

import { useState } from 'react';
import { X, Shield, FileText, User, Mail, Phone, Calendar, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';

interface CreateClaimantModalProps {
 isOpen: boolean;
 onClose: () => void;
 onSuccess: () => void;
}

const labelCls = 'block text-[11px] font-semibold uppercase tracking-[0.1em] text-[#8C8880] mb-1.5';
const inputCls = 'w-full px-3 py-2 text-sm border border-[#E5E2DB] rounded-lg bg-[#ffffff] text-[#1C1A17] placeholder-[#8C8880] focus:outline-none focus:ring-2 focus:ring-[#0D9488]/30 focus:border-[#0D9488] transition-colors';
const iconInputCls = 'w-full pl-9 pr-3 py-2 text-sm border border-[#E5E2DB] rounded-lg bg-[#ffffff] text-[#1C1A17] placeholder-[#8C8880] focus:outline-none focus:ring-2 focus:ring-[#0D9488]/30 focus:border-[#0D9488] transition-colors';

export default function CreateClaimantModal({ isOpen, onClose, onSuccess }: CreateClaimantModalProps) {
 const [formData, setFormData] = useState({ name: '', email: '', phone: '', birthdate: '', credentialType: 'PIN' as 'PIN' | 'PASSPHRASE', credential: '' });
 const [isSubmitting, setIsSubmitting] = useState(false);
 const [error, setError] = useState<string | null>(null);

 if (!isOpen) return null;

 const handleSubmit = async (e: React.FormEvent) => {
 e.preventDefault();
 setIsSubmitting(true);
 setError(null);

 if (!formData.name || !formData.birthdate || !formData.credential) { setError('Please fill in all required fields'); setIsSubmitting(false); return; }
 if (formData.credentialType === 'PIN' && !/^\d{4,6}$/.test(formData.credential)) { setError('PIN must be 4-6 digits'); setIsSubmitting(false); return; }
 if (formData.credentialType === 'PASSPHRASE' && (formData.credential.length < 12 || formData.credential.length > 65)) { setError('Passphrase must be 12-65 characters'); setIsSubmitting(false); return; }

 try {
 const res = await apiFetch('/api/claimants', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(formData) });
 const data = await res.json();
 if (!res.ok) {
 if (res.status === 409) throw new Error(`Claimant already exists (ID: ${data.existingClaimantNumber || 'Unknown'})`);
 throw new Error(data.error || 'Failed to create claimant');
 }
 onSuccess(); onClose();
 } catch (err: any) {
 setError(err.message);
 } finally {
 setIsSubmitting(false);
 }
 };

 return (
 <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
 <div className="bg-[#ffffff] rounded-xl shadow-[0_8px_40px_rgba(28,26,23,0.18)] border border-[#E5E2DB] w-full max-w-md overflow-hidden">
 <div className="flex items-center justify-between px-6 py-4 border-b border-[#E5E2DB]">
 <h2 className="text-base font-semibold text-[#1C1A17]">New Claimant</h2>
 <button onClick={onClose} className="p-1.5 hover:bg-[#F3F1EC] rounded-lg transition-colors">
 <X className="w-4 h-4 text-[#8C8880]" />
 </button>
 </div>

 <form onSubmit={handleSubmit} className="p-6 space-y-4">
 {error && <div className="p-3 bg-red-50 border border-red-200 text-red-600 text-sm rounded-lg">{error}</div>}

 <div>
 <label className={labelCls}>Full Name *</label>
 <div className="relative">
 <User className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-[#8C8880]" />
 <input type="text" className={iconInputCls} value={formData.name} onChange={e => setFormData({ ...formData, name: e.target.value })} required />
 </div>
 </div>

 <div className="grid grid-cols-2 gap-4">
 <div>
 <label className={labelCls}>Email</label>
 <div className="relative">
 <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-[#8C8880]" />
 <input type="email" className={iconInputCls} value={formData.email} onChange={e => setFormData({ ...formData, email: e.target.value })} />
 </div>
 </div>
 <div>
 <label className={labelCls}>Phone</label>
 <div className="relative">
 <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-[#8C8880]" />
 <input type="tel" className={iconInputCls} value={formData.phone} onChange={e => setFormData({ ...formData, phone: e.target.value })} />
 </div>
 </div>
 </div>

 <div>
 <label className={labelCls}>Date of Birth *</label>
 <div className="relative">
 <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-[#8C8880]" />
 <input type="date" className={iconInputCls} value={formData.birthdate} onChange={e => setFormData({ ...formData, birthdate: e.target.value })} required />
 </div>
 </div>

 <div className="pt-4 border-t border-[#E5E2DB]">
 <label className={`${labelCls} mb-3`}>Security Credential *</label>
 <div className="grid grid-cols-2 gap-3 mb-3">
 <label className={cn('flex items-center justify-center gap-2 p-3 rounded-lg border cursor-pointer text-sm font-medium transition-all', formData.credentialType === 'PIN' ? 'bg-[#0D9488]/10 border-[#0D9488]/30 text-[#0D9488]' : 'border-[#E5E2DB] hover:bg-[#F3F1EC] text-[#5C5850]')}>
 <input type="radio" className="sr-only" checked={formData.credentialType === 'PIN'} onChange={() => setFormData({ ...formData, credentialType: 'PIN', credential: '' })} />
 <Shield className="w-4 h-4" /> PIN Code
 </label>
 <label className={cn('flex items-center justify-center gap-2 p-3 rounded-lg border cursor-pointer text-sm font-medium transition-all', formData.credentialType === 'PASSPHRASE' ? 'bg-[#0D9488]/10 border-[#0D9488]/30 text-[#0D9488]' : 'border-[#E5E2DB] hover:bg-[#F3F1EC] text-[#5C5850]')}>
 <input type="radio" className="sr-only" checked={formData.credentialType === 'PASSPHRASE'} onChange={() => setFormData({ ...formData, credentialType: 'PASSPHRASE', credential: '' })} />
 <FileText className="w-4 h-4" /> Passphrase
 </label>
 </div>
 <input
 type={formData.credentialType === 'PIN' ? 'text' : 'password'}
 className={inputCls}
 placeholder={formData.credentialType === 'PIN' ? 'Enter 4-6 digit PIN' : 'Enter 12-65 character passphrase'}
 value={formData.credential}
 onChange={e => setFormData({ ...formData, credential: e.target.value })}
 pattern={formData.credentialType === 'PIN' ? '\\d*' : undefined}
 maxLength={formData.credentialType === 'PIN' ? 6 : 65}
 required
 />
 <p className="mt-1 text-xs text-[#8C8880]">
 {formData.credentialType === 'PIN' ? 'This PIN will be required for phone verification.' : 'A longer passphrase for higher security verification.'}
 </p>
 </div>

 <div className="pt-4 flex justify-end gap-3">
 <button type="button" onClick={onClose} className="px-4 py-2 text-sm font-medium text-[#5C5850] hover:bg-[#F3F1EC] rounded-lg transition-colors">
 Cancel
 </button>
 <button type="submit" disabled={isSubmitting} className="flex items-center gap-2 px-4 py-2 bg-[#0D9488] hover:bg-[#0F766E] text-[#ffffff] rounded-lg text-sm font-semibold transition-colors disabled:opacity-70">
 {isSubmitting && <Loader2 className="w-4 h-4 animate-spin" />}
 Create Claimant
 </button>
 </div>
 </form>
 </div>
 </div>
 );
}
