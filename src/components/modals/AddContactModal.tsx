'use client';

import { useState, useRef, useEffect } from 'react';
import { X, UserPlus, User, Briefcase, Mail, Phone, MapPin, FileText, Users } from 'lucide-react';

export type ContactType = 'CLAIMANT' | 'ATTORNEY' | 'MEDICAL_PROVIDER' | 'EMPLOYER' | 'OTHER';

export interface AddContactData {
    name: string;
    role: string;
    email?: string;
    phone?: string;
    type: ContactType;
    address?: string;
    notes?: string;
}

interface AddContactModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSubmit: (data: AddContactData) => void;
}

const CONTACT_TYPES: { value: ContactType; label: string }[] = [
    { value: 'CLAIMANT', label: 'Claimant' },
    { value: 'ATTORNEY', label: 'Attorney' },
    { value: 'MEDICAL_PROVIDER', label: 'Medical Provider' },
    { value: 'EMPLOYER', label: 'Employer' },
    { value: 'OTHER', label: 'Other' },
];

const labelCls = 'block text-[11px] font-semibold uppercase tracking-[0.1em] text-[#8C8880] mb-1.5';
const inputCls = 'w-full px-3 py-2 text-sm border border-[#E5E2DB] rounded-lg bg-[#ffffff] text-[#1C1A17] placeholder-[#8C8880] focus:outline-none focus:ring-2 focus:ring-[#0D9488]/30 focus:border-[#0D9488] transition-colors';
const iconInputCls = 'w-full pl-9 pr-3 py-2 text-sm border border-[#E5E2DB] rounded-lg bg-[#ffffff] text-[#1C1A17] placeholder-[#8C8880] focus:outline-none focus:ring-2 focus:ring-[#0D9488]/30 focus:border-[#0D9488] transition-colors';

export function AddContactModal({ isOpen, onClose, onSubmit }: AddContactModalProps) {
    const [name, setName] = useState('');
    const [role, setRole] = useState('');
    const [email, setEmail] = useState('');
    const [phone, setPhone] = useState('');
    const [type, setType] = useState<ContactType>('OTHER');
    const [address, setAddress] = useState('');
    const [notes, setNotes] = useState('');
    const firstInputRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        if (isOpen) {
            setName(''); setRole(''); setEmail(''); setPhone(''); setType('OTHER'); setAddress(''); setNotes('');
            setTimeout(() => firstInputRef.current?.focus(), 100);
        }
    }, [isOpen]);

    useEffect(() => {
        const handleEscape = (e: KeyboardEvent) => { if (e.key === 'Escape' && isOpen) onClose(); };
        document.addEventListener('keydown', handleEscape);
        return () => document.removeEventListener('keydown', handleEscape);
    }, [isOpen, onClose]);

    const handleSubmit = () => {
        if (!name.trim() || !role.trim()) return;
        onSubmit({ name: name.trim(), role: role.trim(), type, email: email.trim() || undefined, phone: phone.trim() || undefined, address: address.trim() || undefined, notes: notes.trim() || undefined });
        onClose();
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={(e) => e.target === e.currentTarget && onClose()}>
            <div className="bg-[#ffffff] rounded-xl shadow-[0_8px_40px_rgba(28,26,23,0.18)] border border-[#E5E2DB] w-full max-w-2xl max-h-[90vh] overflow-hidden flex flex-col" role="dialog" aria-modal="true" aria-labelledby="contact-modal-title">
                <div className="flex items-center justify-between px-6 py-4 border-b border-[#E5E2DB]">
                    <h2 id="contact-modal-title" className="text-base font-semibold text-[#1C1A17] flex items-center gap-2">
                        <UserPlus className="w-4 h-4 text-[#0D9488]" />
                        Add Contact
                    </h2>
                    <button onClick={onClose} className="p-1.5 hover:bg-[#F3F1EC] rounded-lg transition-colors" aria-label="Close modal">
                        <X className="w-4 h-4 text-[#8C8880]" />
                    </button>
                </div>

                <div className="flex-1 overflow-y-auto p-6 space-y-5">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                        <div>
                            <label className={labelCls}>Name <span className="text-red-500">*</span></label>
                            <div className="relative">
                                <User className="w-3.5 h-3.5 text-[#8C8880] absolute left-3 top-1/2 -translate-y-1/2" />
                                <input ref={firstInputRef} type="text" value={name} onChange={(e) => setName(e.target.value)} placeholder="Full Name" className={iconInputCls} />
                            </div>
                        </div>
                        <div>
                            <label className={labelCls}>Role / Title <span className="text-red-500">*</span></label>
                            <div className="relative">
                                <Briefcase className="w-3.5 h-3.5 text-[#8C8880] absolute left-3 top-1/2 -translate-y-1/2" />
                                <input type="text" value={role} onChange={(e) => setRole(e.target.value)} placeholder="e.g. Lead Attorney" className={iconInputCls} />
                            </div>
                        </div>
                        <div>
                            <label className={labelCls}>Contact Type</label>
                            <div className="relative">
                                <Users className="w-3.5 h-3.5 text-[#8C8880] absolute left-3 top-1/2 -translate-y-1/2" />
                                <select value={type} onChange={(e) => setType(e.target.value as ContactType)} className={`${iconInputCls} appearance-none`}>
                                    {CONTACT_TYPES.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
                                </select>
                            </div>
                        </div>
                        <div>
                            <label className={labelCls}>Email</label>
                            <div className="relative">
                                <Mail className="w-3.5 h-3.5 text-[#8C8880] absolute left-3 top-1/2 -translate-y-1/2" />
                                <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="email@example.com" className={iconInputCls} />
                            </div>
                        </div>
                        <div>
                            <label className={labelCls}>Phone</label>
                            <div className="relative">
                                <Phone className="w-3.5 h-3.5 text-[#8C8880] absolute left-3 top-1/2 -translate-y-1/2" />
                                <input type="tel" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="(555) 123-4567" className={iconInputCls} />
                            </div>
                        </div>
                    </div>
                    <div>
                        <label className={labelCls}>Address</label>
                        <div className="relative">
                            <MapPin className="w-3.5 h-3.5 text-[#8C8880] absolute left-3 top-2.5" />
                            <input type="text" value={address} onChange={(e) => setAddress(e.target.value)} placeholder="123 Main St, City, State ZIP" className={iconInputCls} />
                        </div>
                    </div>
                    <div>
                        <label className={labelCls}>Notes</label>
                        <div className="relative">
                            <FileText className="w-3.5 h-3.5 text-[#8C8880] absolute left-3 top-2.5" />
                            <textarea value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Additional details..." rows={3} className={`${iconInputCls} resize-none`} />
                        </div>
                    </div>
                </div>

                <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-[#E5E2DB] bg-[#F8F7F5]">
                    <button onClick={onClose} className="px-4 py-2 text-sm font-medium text-[#5C5850] bg-[#ffffff] border border-[#E5E2DB] rounded-lg hover:bg-[#F3F1EC] transition-colors">
                        Cancel
                    </button>
                    <button onClick={handleSubmit} disabled={!name.trim() || !role.trim()} className="flex items-center gap-2 px-5 py-2 text-sm font-semibold text-[#ffffff] bg-[#0D9488] hover:bg-[#0F766E] rounded-lg disabled:opacity-50 disabled:cursor-not-allowed transition-colors">
                        <UserPlus className="w-4 h-4" />
                        Save Contact
                    </button>
                </div>
            </div>
        </div>
    );
}

export default AddContactModal;
