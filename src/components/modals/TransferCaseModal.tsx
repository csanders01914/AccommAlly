'use client';

import { useState, useEffect } from 'react';
import { X, ArrowRightLeft } from 'lucide-react';

interface UserOption { id: string; name: string; role: string; }

interface TransferCaseModalProps {
 isOpen: boolean;
 onClose: () => void;
 onSubmit: (newOwnerId: string) => Promise<void>;
 users: UserOption[];
 currentOwnerName?: string;
}

const labelCls = 'block text-[11px] font-semibold uppercase tracking-[0.1em] text-[#8C8880] mb-1.5';
const inputCls = 'w-full px-3 py-2 text-sm border border-[#E5E2DB] rounded-lg bg-[#ffffff] text-[#1C1A17] focus:outline-none focus:ring-2 focus:ring-[#0D9488]/30 focus:border-[#0D9488] transition-colors';

export function TransferCaseModal({ isOpen, onClose, onSubmit, users, currentOwnerName }: TransferCaseModalProps) {
 const [selectedUserId, setSelectedUserId] = useState('');
 const [isSubmitting, setIsSubmitting] = useState(false);

 useEffect(() => {
 if (isOpen) { setSelectedUserId(''); setIsSubmitting(false); }
 }, [isOpen]);

 const handleSubmit = async () => {
 if (!selectedUserId) return;
 setIsSubmitting(true);
 try { await onSubmit(selectedUserId); onClose(); }
 catch (err) { console.error(err); }
 finally { setIsSubmitting(false); }
 };

 if (!isOpen) return null;

 const coordinators = users.filter(u => u.role === 'COORDINATOR' || u.role === 'ADMIN' || u.role === 'PROGRAM_LEAD');

 return (
 <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={(e) => e.target === e.currentTarget && onClose()}>
 <div className="bg-[#ffffff] rounded-xl shadow-[0_8px_40px_rgba(28,26,23,0.18)] border border-[#E5E2DB] w-full max-w-md overflow-hidden flex flex-col" role="dialog" aria-modal="true">
 <div className="flex items-center justify-between px-6 py-4 border-b border-[#E5E2DB]">
 <h2 className="text-base font-semibold text-[#1C1A17] flex items-center gap-2">
 <ArrowRightLeft className="w-4 h-4 text-[#0D9488]" />
 Transfer Case
 </h2>
 <button onClick={onClose} className="p-1.5 hover:bg-[#F3F1EC] rounded-lg transition-colors">
 <X className="w-4 h-4 text-[#8C8880]" />
 </button>
 </div>

 <div className="p-6 space-y-4">
 <p className="text-sm text-[#5C5850]">
 Transferring this case will reassign all <strong className="text-[#1C1A17]">pending tasks</strong> to the new owner.
 {currentOwnerName && <span> Currently assigned to: <strong className="text-[#1C1A17]">{currentOwnerName}</strong></span>}
 </p>
 <div>
 <label className={labelCls}>New Owner</label>
 <select value={selectedUserId} onChange={(e) => setSelectedUserId(e.target.value)} className={inputCls}>
 <option value="">Select a coordinator…</option>
 {coordinators.map(user => <option key={user.id} value={user.id}>{user.name} ({user.role})</option>)}
 </select>
 </div>
 </div>

 <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-[#E5E2DB] bg-[#FAF6EE]">
 <button onClick={onClose} disabled={isSubmitting} className="px-4 py-2 text-sm font-medium text-[#5C5850] bg-[#ffffff] border border-[#E5E2DB] rounded-lg hover:bg-[#F3F1EC] transition-colors">
 Cancel
 </button>
 <button onClick={handleSubmit} disabled={!selectedUserId || isSubmitting} className="px-4 py-2 text-sm font-semibold text-[#ffffff] bg-[#0D9488] hover:bg-[#0F766E] rounded-lg disabled:opacity-50 disabled:cursor-not-allowed transition-colors">
 {isSubmitting ? 'Transferring…' : 'Transfer Case'}
 </button>
 </div>
 </div>
 </div>
 );
}
