'use client';

import { useState, useEffect } from 'react';
import { X, FileText } from 'lucide-react';

interface Template { id: string; name: string; description: string | null; }
interface Case { id: string; caseNumber: string; clientName?: string; }

interface LoadTemplateModalProps {
 onClose: () => void;
 onLoad: (html: string, caseId: string) => void;
 linkedCaseId?: string;
 cases: Case[];
}

const labelCls = 'form-label';
const selectCls = 'form-input';

export function LoadTemplateModal({ onClose, onLoad, linkedCaseId, cases }: LoadTemplateModalProps) {
 const [templates, setTemplates] = useState<Template[]>([]);
 const [loadingTemplates, setLoadingTemplates] = useState(true);
 const [selectedTemplateId, setSelectedTemplateId] = useState('');
 const [selectedCaseId, setSelectedCaseId] = useState(linkedCaseId ?? '');
 const [applying, setApplying] = useState(false);
 const [error, setError] = useState('');

 useEffect(() => {
 fetch('/api/document-templates')
 .then(r => r.json())
 .then(d => setTemplates(d.templates ?? []))
 .catch(() => setError('Failed to load templates'))
 .finally(() => setLoadingTemplates(false));
 }, []);

 async function handleLoad() {
 if (!selectedTemplateId) { setError('Select a template.'); return; }
 if (!selectedCaseId) { setError('Select a case to populate the variables.'); return; }
 setApplying(true); setError('');
 try {
 const res = await fetch(`/api/document-templates/${selectedTemplateId}/apply`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ caseId: selectedCaseId }) });
 const data = await res.json();
 if (!res.ok) throw new Error(data.error);
 onLoad(data.html, selectedCaseId); onClose();
 } catch (err) { setError(err instanceof Error ? err.message : 'Failed to apply template'); }
 finally { setApplying(false); }
 }

 return (
 <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
 <div className="modal-container w-full max-w-md overflow-hidden">
 <div className="flex items-center justify-between px-6 py-4 border-b border-border">
 <h2 className="text-base font-semibold text-text-primary flex items-center gap-2">
 <FileText className="w-4 h-4 text-primary-500" /> Load Template
 </h2>
 <button onClick={onClose} className="p-1.5 hover:bg-surface-raised rounded-lg transition-colors">
 <X className="w-4 h-4 text-text-muted" />
 </button>
 </div>

 <div className="p-6 space-y-4">
 {error && <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">{error}</p>}
 <div>
 <label className={labelCls}>Template</label>
 {loadingTemplates ? (
 <p className="text-sm text-text-muted">Loading…</p>
 ) : templates.length === 0 ? (
 <p className="text-sm text-text-muted">No templates available for this account.</p>
 ) : (
 <select value={selectedTemplateId} onChange={e => setSelectedTemplateId(e.target.value)} className={selectCls}>
 <option value="">Select a template…</option>
 {templates.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
 </select>
 )}
 {selectedTemplateId && (() => { const sel = templates.find(t => t.id === selectedTemplateId); return sel?.description ? <p className="text-xs text-text-muted mt-1">{sel.description}</p> : null; })()}
 </div>
 {!linkedCaseId && (
 <div>
 <label className={labelCls}>Case</label>
 <select value={selectedCaseId} onChange={e => setSelectedCaseId(e.target.value)} className={selectCls}>
 <option value="">Select a case…</option>
 {cases.map(c => <option key={c.id} value={c.id}>{c.caseNumber}{c.clientName ? ` — ${c.clientName}` : ''}</option>)}
 </select>
 </div>
 )}
 </div>

 <div className="px-6 py-4 border-t border-border bg-background flex justify-end gap-3">
 <button onClick={onClose} className="px-4 py-2 text-sm font-medium text-text-secondary hover:bg-surface-raised rounded-lg transition-colors">Cancel</button>
 <button onClick={handleLoad} disabled={applying || loadingTemplates} className="px-4 py-2 text-sm font-semibold text-white bg-primary-500 hover:bg-primary-600 rounded-lg disabled:opacity-50 transition-colors">
 {applying ? 'Loading…' : 'Load Template'}
 </button>
 </div>
 </div>
 </div>
 );
}
