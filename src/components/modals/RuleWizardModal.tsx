'use client';
import { apiFetch } from '@/lib/api-client';

import { useState, useEffect } from 'react';
import { X, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';

interface Folder { id: string; name: string; color: string; }

interface RuleWizardModalProps {
 isOpen: boolean;
 onClose: () => void;
 onSave: () => void;
}

type Step = 1 | 2 | 3;

interface RuleState {
 name: string;
 senderContains: string;
 subjectContains: string;
 contentContains: string;
 targetFolderIds: string[];
 actionKeepInInbox: boolean;
 actionMarkAsRead: boolean;
 actionStar: boolean;
 checkedSender: boolean;
 checkedSubject: boolean;
 checkedBody: boolean;
 checkedMove: boolean;
 checkedCopy: boolean;
 checkedRead: boolean;
 checkedStar: boolean;
 checkedEmail: boolean;
 checkedSMS: boolean;
}

const INITIAL_RULE: RuleState = {
 name: '', senderContains: '', subjectContains: '', contentContains: '', targetFolderIds: [],
 actionKeepInInbox: false, actionMarkAsRead: false, actionStar: false,
 checkedSender: false, checkedSubject: false, checkedBody: false,
 checkedMove: false, checkedCopy: false, checkedRead: false,
 checkedStar: false, checkedEmail: false, checkedSMS: false,
};

const labelCls = 'form-label';
const inputCls = 'form-input';

export function RuleWizardModal({ isOpen, onClose, onSave }: RuleWizardModalProps) {
 const [step, setStep] = useState<Step>(1);
 const [folders, setFolders] = useState<Folder[]>([]);
 const [isSaving, setIsSaving] = useState(false);
 const [error, setError] = useState('');
 const [rule, setRule] = useState<RuleState>(INITIAL_RULE);
 const [editMode, setEditMode] = useState<{ field: keyof RuleState; type: 'text' | 'folder'; label: string } | null>(null);
 const [editValue, setEditValue] = useState('');

 useEffect(() => {
 if (isOpen) {
 setStep(1); setRule(INITIAL_RULE); setError('');
 apiFetch('/api/messages/folders').then(r => { if (r.ok) r.json().then(setFolders); }).catch(console.error);
 }
 }, [isOpen]);

 const handleSave = async () => {
 if (!rule.name) { setError('Please specify a name for this rule.'); return; }
 if (rule.targetFolderIds.length === 0 && (rule.checkedMove || rule.checkedCopy)) { setError('Please select a folder.'); return; }
 setIsSaving(true); setError('');
 try {
 await apiFetch('/api/messages/rules', {
 method: 'POST',
 headers: { 'Content-Type': 'application/json' },
 body: JSON.stringify({
 name: rule.name,
 senderContains: rule.checkedSender ? rule.senderContains : undefined,
 subjectContains: rule.checkedSubject ? rule.subjectContains : undefined,
 contentContains: rule.checkedBody ? rule.contentContains : undefined,
 targetFolderIds: (rule.checkedMove || rule.checkedCopy) ? rule.targetFolderIds : [],
 actionKeepInInbox: rule.checkedCopy,
 actionMarkAsRead: rule.checkedRead,
 actionStar: rule.checkedStar,
 actionSendEmailNotification: rule.checkedEmail,
 actionSendSMSNotification: rule.checkedSMS,
 })
 });
 onSave(); onClose();
 } catch { setError('Failed to save rule.'); }
 finally { setIsSaving(false); }
 };

 const Link = ({ label, field, type, value }: { label: string; field: keyof RuleState; type: 'text' | 'folder'; value?: string | string[] }) => {
 const display = type === 'folder'
 ? (rule.targetFolderIds.length > 0 ? folders.filter(f => rule.targetFolderIds.includes(f.id)).map(f => f.name).join(', ') : label)
 : (value ? `"${value}"` : label);
 return (
 <button onClick={() => { setEditMode({ field, type, label }); if (type === 'text') setEditValue(rule[field] as string); }}
 className="text-primary-500 underline hover:text-primary-600 mx-1 transition-colors">
 {display}
 </button>
 );
 };

 if (!isOpen) return null;

 return (
 <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
 <div className="modal-container w-full max-w-2xl h-[600px] flex flex-col relative overflow-hidden">
 <div className="flex items-center justify-between px-6 py-4 border-b border-border">
 <h2 className="text-base font-semibold text-text-primary">Rules Wizard</h2>
 <button onClick={onClose} className="p-1.5 hover:bg-surface-raised rounded-lg transition-colors">
 <X className="w-4 h-4 text-text-muted" />
 </button>
 </div>

 <div className="flex-1 flex flex-col min-h-0">
 <div className="flex-1 overflow-y-auto p-5 border-b border-border bg-background">
 {step === 1 && (
 <div className="space-y-1">
 <p className="text-[11px] font-semibold uppercase tracking-[0.1em] text-text-muted mb-3">Step 1 — Select condition(s)</p>
 <WizardCheckbox label="from [people or public group]" checked={rule.checkedSender} onChange={c => setRule({ ...rule, checkedSender: c })} />
 <WizardCheckbox label="with [specific words] in the subject" checked={rule.checkedSubject} onChange={c => setRule({ ...rule, checkedSubject: c })} />
 <WizardCheckbox label="with [specific words] in the body" checked={rule.checkedBody} onChange={c => setRule({ ...rule, checkedBody: c })} />
 </div>
 )}
 {step === 2 && (
 <div className="space-y-1">
 <p className="text-[11px] font-semibold uppercase tracking-[0.1em] text-text-muted mb-3">Step 2 — Select action(s)</p>
 <WizardCheckbox label="move it to the [specified folder]" checked={rule.checkedMove} onChange={c => setRule({ ...rule, checkedMove: c, checkedCopy: c ? false : rule.checkedCopy })} />
 <WizardCheckbox label="copy it to the [specified folder]" checked={rule.checkedCopy} onChange={c => setRule({ ...rule, checkedCopy: c, checkedMove: c ? false : rule.checkedMove })} />
 <WizardCheckbox label="mark it as [read]" checked={rule.checkedRead} onChange={c => setRule({ ...rule, checkedRead: c })} />
 <WizardCheckbox label="mark it as [starred]" checked={rule.checkedStar} onChange={c => setRule({ ...rule, checkedStar: c })} />
 <WizardCheckbox label="send an email notification" checked={rule.checkedEmail} onChange={c => setRule({ ...rule, checkedEmail: c })} />
 <WizardCheckbox label="send a text message (SMS)" checked={rule.checkedSMS} onChange={c => setRule({ ...rule, checkedSMS: c })} />
 </div>
 )}
 {step === 3 && (
 <div className="space-y-4">
 <p className="text-[11px] font-semibold uppercase tracking-[0.1em] text-text-muted mb-1">Step 3 — Finish rule setup</p>
 <div>
 <label className={labelCls}>Rule Name</label>
 <input type="text" value={rule.name} onChange={e => setRule({ ...rule, name: e.target.value })} placeholder="e.g. Project Updates" className={inputCls} autoFocus />
 </div>
 {error && <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">{error}</p>}
 </div>
 )}
 </div>

 <div className="h-40 p-4 bg-surface overflow-y-auto border-b border-border">
 <p className="text-[11px] font-semibold uppercase tracking-[0.1em] text-text-muted mb-2">Rule Description</p>
 <div className="p-3 border border-border rounded-lg text-sm text-text-secondary leading-relaxed bg-background">
 Apply this rule after the message arrives
 {rule.checkedSender && <><br />&nbsp;&nbsp;from <Link label="people or public group" field="senderContains" type="text" value={rule.senderContains} /></>}
 {rule.checkedSubject && <><br />&nbsp;&nbsp;with <Link label="specific words" field="subjectContains" type="text" value={rule.subjectContains} /> in the subject</>}
 {rule.checkedBody && <><br />&nbsp;&nbsp;with <Link label="specific words" field="contentContains" type="text" value={rule.contentContains} /> in the body</>}
 {(rule.checkedMove || rule.checkedCopy) && <><br />&nbsp;&nbsp;{rule.checkedMove ? 'move' : 'copy'} it to the <Link label="specified folder" field="targetFolderIds" type="folder" /></>}
 {rule.checkedRead && <><br />&nbsp;&nbsp;mark it as read</>}
 {rule.checkedStar && <><br />&nbsp;&nbsp;mark it as starred</>}
 {rule.checkedEmail && <><br />&nbsp;&nbsp;send an email notification</>}
 {rule.checkedSMS && <><br />&nbsp;&nbsp;send a text message</>}
 </div>
 </div>
 </div>

 <div className="px-6 py-4 border-t border-border bg-background flex justify-between items-center">
 <button onClick={onClose} className="text-sm font-medium text-text-secondary hover:text-text-primary transition-colors">Cancel</button>
 <div className="flex gap-2">
 <button disabled={step === 1} onClick={() => setStep(s => Math.max(1, s - 1) as Step)}
 className="px-4 py-2 text-sm font-medium text-text-secondary border border-border bg-surface rounded-lg hover:bg-surface-raised disabled:opacity-40 transition-colors">
 ← Back
 </button>
 {step < 3 ? (
 <button onClick={() => setStep(s => Math.min(3, s + 1) as Step)}
 className="px-4 py-2 text-sm font-semibold text-white bg-primary-500 hover:bg-primary-600 rounded-lg transition-colors">
 Next →
 </button>
 ) : (
 <button onClick={handleSave} disabled={isSaving}
 className="flex items-center gap-2 px-4 py-2 text-sm font-semibold text-white bg-primary-500 hover:bg-primary-600 rounded-lg disabled:opacity-50 transition-colors">
 {isSaving && <Loader2 className="w-3 h-3 animate-spin" />} Finish
 </button>
 )}
 </div>
 </div>

 {editMode && (
 <div className="absolute inset-0 z-50 flex items-center justify-center bg-black/30">
 <div className="modal-container p-5 w-80">
 <h3 className="text-sm font-semibold text-text-primary mb-3">{editMode.label}</h3>
 {editMode.type === 'text' && (
 <input autoFocus value={editValue} onChange={e => setEditValue(e.target.value)}
 className="w-full px-3 py-2 text-sm border border-border rounded-lg bg-surface text-text-primary focus:outline-none focus:ring-2 focus:ring-primary-500/30 focus:border-primary-500 mb-4 transition-colors" />
 )}
 {editMode.type === 'folder' && (
 <div className="space-y-1 mb-4 max-h-40 overflow-y-auto">
 {folders.map(f => (
 <label key={f.id} className="flex items-center gap-2.5 px-2 py-1.5 hover:bg-background rounded-lg cursor-pointer text-sm text-text-secondary">
 <input type="checkbox" checked={rule.targetFolderIds.includes(f.id)}
 onChange={e => setRule({ ...rule, targetFolderIds: e.target.checked ? [...rule.targetFolderIds, f.id] : rule.targetFolderIds.filter(id => id !== f.id) })}
 className="rounded accent-[#0D9488]" />
 <span className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ backgroundColor: f.color }} />
 {f.name}
 </label>
 ))}
 {folders.length === 0 && <p className="text-xs text-text-muted px-2">No folders found.</p>}
 </div>
 )}
 <div className="flex justify-end gap-2">
 <button onClick={() => setEditMode(null)} className="px-3 py-1.5 text-xs font-medium text-text-secondary hover:bg-surface-raised rounded-lg transition-colors">Cancel</button>
 <button onClick={() => { if (editMode.type === 'text') setRule({ ...rule, [editMode.field]: editValue }); setEditMode(null); }}
 className="px-3 py-1.5 text-xs font-semibold text-white bg-primary-500 hover:bg-primary-600 rounded-lg transition-colors">
 OK
 </button>
 </div>
 </div>
 </div>
 )}
 </div>
 </div>
 );
}

function WizardCheckbox({ label, checked, onChange }: { label: string; checked: boolean; onChange: (c: boolean) => void }) {
 return (
 <label className={cn('flex items-start gap-2.5 px-3 py-2 rounded-lg cursor-pointer leading-tight transition-colors', checked ? 'bg-primary-500/8' : 'hover:bg-surface-raised')}>
 <input type="checkbox" checked={checked} onChange={e => onChange(e.target.checked)} className="mt-0.5 rounded accent-[#0D9488]" />
 <span className="text-sm text-text-secondary">{label}</span>
 </label>
 );
}
