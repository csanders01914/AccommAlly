'use client';

import { useState, useEffect, useRef } from 'react';
import { X, Upload, Plus, Phone, FileText, Calendar, ClipboardList, MessageSquare, UserPlus, CheckSquare, Shield } from 'lucide-react';
import VerifyIdentityModal from './VerifyIdentityModal';
import { cn } from '@/lib/utils';

export type NoteType = 'GENERAL' | 'PHONE_CALL' | 'MEDICAL_UPDATE' | 'DOCUMENTATION' | 'FOLLOW_UP' | 'CLIENT_REQUEST' | 'AUDIT';

export interface AddNoteData {
 content: string;
 noteType: NoteType;
 claimId?: string;
 returnCallDate?: Date;
 setReturnCall?: boolean;
 createTask?: boolean;
 taskDescription?: string;
 taskDueDate?: Date;
 file?: File;
}

interface ClaimOption { id: string; caseNumber: string; description?: string; }

interface AddNoteModalProps {
 isOpen: boolean;
 onClose: () => void;
 onSubmit: (data: AddNoteData) => void;
 claims?: ClaimOption[];
 coordinatorName?: string;
 userRole?: 'ADMIN' | 'AUDITOR' | 'COORDINATOR';
 claimantNumber?: string | null;
 defaultNoteType?: NoteType;
}

const NOTE_TYPES: { value: NoteType; label: string; icon: typeof MessageSquare }[] = [
 { value: 'GENERAL', label: 'General Note', icon: MessageSquare },
 { value: 'PHONE_CALL', label: 'Phone Call', icon: Phone },
 { value: 'MEDICAL_UPDATE', label: 'Medical Update', icon: FileText },
 { value: 'DOCUMENTATION', label: 'Documentation', icon: ClipboardList },
 { value: 'FOLLOW_UP', label: 'Follow-Up', icon: Calendar },
 { value: 'CLIENT_REQUEST', label: 'Client Request', icon: UserPlus },
];

const labelCls = 'form-label';
const inputCls = 'form-input';

export function AddNoteModal({
 isOpen,
 onClose,
 onSubmit,
 claims = [],
 coordinatorName = 'Coordinator',
 userRole,
 claimantNumber,
 defaultNoteType = 'GENERAL',
}: AddNoteModalProps) {
 const [content, setContent] = useState('');
 const [noteType, setNoteType] = useState<NoteType>(defaultNoteType);
 const [selectedClaimId, setSelectedClaimId] = useState('');
 const [showReturnCall, setShowReturnCall] = useState(false);
 const [returnCallDate, setReturnCallDate] = useState('');
 const [returnCallTime, setReturnCallTime] = useState('');
 const [showCreateTask, setShowCreateTask] = useState(false);
 const [taskDescription, setTaskDescription] = useState('');
 const [taskDueDate, setTaskDueDate] = useState('');
 const [selectedFile, setSelectedFile] = useState<File | null>(null);
 const [isVerifyModalOpen, setIsVerifyModalOpen] = useState(false);
 const [isVerified, setIsVerified] = useState(false);
 const [verificationMethod, setVerificationMethod] = useState<string | null>(null);

 const textareaRef = useRef<HTMLTextAreaElement>(null);

 useEffect(() => {
 if (isOpen) {
 setContent('');
 setNoteType(defaultNoteType);
 setSelectedClaimId(claims.length === 1 ? claims[0].id : '');
 setShowReturnCall(false); setReturnCallDate(''); setReturnCallTime('');
 setShowCreateTask(false); setTaskDescription(''); setTaskDueDate('');
 setSelectedFile(null); setIsVerified(false); setVerificationMethod(null);
 setTimeout(() => textareaRef.current?.focus(), 100);
 }
 }, [isOpen, claims, defaultNoteType]);

 useEffect(() => {
 const handleEscape = (e: KeyboardEvent) => { if (e.key === 'Escape' && isOpen) onClose(); };
 document.addEventListener('keydown', handleEscape);
 return () => document.removeEventListener('keydown', handleEscape);
 }, [isOpen, onClose]);

 const handleVerificationComplete = (method: 'PIN' | 'PASSPHRASE') => {
 setIsVerified(true);
 setVerificationMethod(method);
 const timestamp = new Date().toLocaleTimeString();
 setContent(prev => prev + `\n\n[Identity Verified via ${method} at ${timestamp}]`);
 };

 const handleSubmit = () => {
 if (!content.trim()) return;
 const data: AddNoteData = { content: content.trim(), noteType, claimId: selectedClaimId || undefined, file: selectedFile || undefined };
 if (showReturnCall && returnCallDate) {
 data.returnCallDate = returnCallTime ? new Date(`${returnCallDate}T${returnCallTime}`) : new Date(`${returnCallDate}T09:00:00`);
 data.setReturnCall = true;
 }
 if (showCreateTask && taskDescription.trim()) {
 data.createTask = true;
 data.taskDescription = taskDescription.trim();
 data.taskDueDate = taskDueDate ? new Date(taskDueDate) : undefined;
 }
 onSubmit(data);
 onClose();
 };

 if (!isOpen) return null;

 return (
 <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={e => { if (e.target === e.currentTarget) onClose(); }}>
 <div className="modal-container w-full max-w-2xl max-h-[90vh] overflow-hidden flex flex-col" role="dialog" aria-modal="true">
 <div className="flex items-center justify-between px-6 py-4 border-b border-border">
 <h2 className="text-base font-semibold text-text-primary flex items-center gap-2">
 <Plus className="w-4 h-4 text-primary-500" /> Add Note
 </h2>
 <button onClick={onClose} className="p-1.5 hover:bg-surface-raised rounded-lg transition-colors">
 <X className="w-4 h-4 text-text-muted" />
 </button>
 </div>

 <div className="flex-1 overflow-y-auto p-6 space-y-5">
 <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
 <div>
 <label className={labelCls}>Note Type</label>
 <select value={noteType} onChange={e => setNoteType(e.target.value as NoteType)}
 className={cn(inputCls, noteType === 'AUDIT' && 'border-warning focus:border-warning focus:ring-warning/30')}>
 {NOTE_TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
 {(userRole === 'ADMIN' || userRole === 'AUDITOR') && (
 <option value="AUDIT">🛡️ Audit Note</option>
 )}
 </select>
 {noteType === 'AUDIT' && (
 <p className="mt-1.5 text-xs text-amber-600 flex items-center gap-1">
 <Shield className="w-3 h-3" /> Audit notes are only visible to Admins and Auditors
 </p>
 )}
 </div>

 {claims.length > 0 && (
 <div>
 <label className={labelCls}>Claim Number</label>
 <select value={selectedClaimId} onChange={e => setSelectedClaimId(e.target.value)} className={inputCls}>
 <option value="">All claims (general)</option>
 {claims.map(c => <option key={c.id} value={c.id}>{c.caseNumber}{c.description ? ` — ${c.description}` : ''}</option>)}
 </select>
 </div>
 )}

 {noteType === 'PHONE_CALL' && claimantNumber && (
 <div className="md:col-span-2 bg-background p-4 rounded-lg border border-border flex items-center justify-between">
 <div>
 <h3 className="text-sm font-semibold text-text-primary flex items-center gap-2">
 <Shield className="w-4 h-4 text-primary-500" /> Identity Verification
 </h3>
 <p className="text-xs text-text-muted mt-0.5">
 {isVerified ? `Identity verified using ${verificationMethod}` : 'Verify caller identity before proceeding with sensitive info.'}
 </p>
 </div>
 {isVerified ? (
 <span className="flex items-center gap-1.5 px-3 py-1.5 bg-success/10 text-success rounded-lg text-sm font-medium">
 <CheckSquare className="w-4 h-4" /> Verified
 </span>
 ) : (
 <button onClick={() => setIsVerifyModalOpen(true)} className="px-4 py-2 text-sm font-semibold text-white bg-primary-500 hover:bg-primary-600 rounded-lg transition-colors">
 Verify Identity
 </button>
 )}
 </div>
 )}
 </div>

 <div>
 <label className={labelCls}>Note Content <span className="text-red-500 normal-case font-normal">*</span></label>
 <textarea ref={textareaRef} value={content} onChange={e => setContent(e.target.value)} placeholder="Enter note details…" rows={5} className={`${inputCls} resize-none`} />
 </div>

 <div>
 <label className={labelCls}>Attach Document</label>
 {selectedFile ? (
 <div className="flex items-center gap-3 p-3 bg-background border border-border rounded-lg">
 <FileText className="w-5 h-5 text-primary-500 flex-shrink-0" />
 <span className="flex-1 text-sm text-text-secondary truncate">{selectedFile.name}</span>
 <button onClick={() => setSelectedFile(null)} className="p-1 hover:text-red-500 text-text-muted rounded transition-colors">
 <X className="w-4 h-4" />
 </button>
 </div>
 ) : (
 <label className="flex items-center gap-2 px-4 py-3 border-2 border-dashed border-border rounded-lg cursor-pointer hover:border-primary-500/40 hover:bg-background transition-colors">
 <input type="file" onChange={e => { const f = e.target.files?.[0]; if (f) setSelectedFile(f); }} className="hidden" />
 <Upload className="w-5 h-5 text-text-muted" />
 <span className="text-sm text-text-muted">Click to upload (DCN auto-assigned)</span>
 </label>
 )}
 </div>

 <div className="space-y-3 pt-1 border-t border-border">
 <div>
 <label className="flex items-center gap-3 cursor-pointer">
 <input type="checkbox" checked={showReturnCall} onChange={e => setShowReturnCall(e.target.checked)} className="w-4 h-4 rounded accent-[#0D9488]" />
 <div className="flex items-center gap-2">
 <Phone className="w-4 h-4 text-amber-500" />
 <span className="text-sm font-medium text-text-primary">Set Return Call</span>
 </div>
 </label>
 {showReturnCall && (
 <div className="mt-3 ml-7 grid grid-cols-2 gap-3">
 <div>
 <label className={labelCls}>Date</label>
 <input type="date" value={returnCallDate} onChange={e => setReturnCallDate(e.target.value)} className={inputCls} />
 </div>
 <div>
 <label className={labelCls}>Time</label>
 <input type="time" value={returnCallTime} onChange={e => setReturnCallTime(e.target.value)} className={inputCls} />
 </div>
 </div>
 )}
 </div>

 <div>
 <label className="flex items-center gap-3 cursor-pointer">
 <input type="checkbox" checked={showCreateTask} onChange={e => setShowCreateTask(e.target.checked)} className="w-4 h-4 rounded accent-[#0D9488]" />
 <div className="flex items-center gap-2">
 <CheckSquare className="w-4 h-4 text-success" />
 <span className="text-sm font-medium text-text-primary">Create Task for {coordinatorName}</span>
 </div>
 </label>
 {showCreateTask && (
 <div className="mt-3 ml-7 space-y-3">
 <div>
 <label className={labelCls}>Task Description</label>
 <input type="text" value={taskDescription} onChange={e => setTaskDescription(e.target.value)} placeholder="Describe the task…" className={inputCls} />
 </div>
 <div className="w-1/2">
 <label className={labelCls}>Due Date <span className="normal-case font-normal">(optional)</span></label>
 <input type="date" value={taskDueDate} onChange={e => setTaskDueDate(e.target.value)} className={inputCls} />
 </div>
 </div>
 )}
 </div>
 </div>
 </div>

 <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-border bg-background">
 <button onClick={onClose} className="px-4 py-2 text-sm font-medium text-text-secondary hover:bg-surface-raised rounded-lg transition-colors">
 Cancel
 </button>
 <button onClick={handleSubmit} disabled={!content.trim()} className="flex items-center gap-2 px-5 py-2 text-sm font-semibold text-white bg-primary-500 hover:bg-primary-600 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed transition-colors">
 <Plus className="w-4 h-4" /> Add Note
 </button>
 </div>
 </div>

 {claimantNumber && (
 <VerifyIdentityModal
 isOpen={isVerifyModalOpen}
 onClose={() => setIsVerifyModalOpen(false)}
 claimantNumber={claimantNumber}
 onVerified={handleVerificationComplete}
 />
 )}
 </div>
 );
}

export default AddNoteModal;
