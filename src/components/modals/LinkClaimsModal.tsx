'use client';

import { useState, useEffect } from 'react';
import { X, Link as LinkIcon, CheckCircle, Loader2, AlertCircle } from 'lucide-react';
import { cn } from '@/lib/utils';

interface Suggestion {
 id: string;
 caseNumber: string;
 title: string;
 descriptionSnippet: string | null;
 status: string;
 createdAt: string;
 claimFamily?: { id: string; name: string | null };
 isInSameFamily: boolean;
}

interface LinkClaimsModalProps {
 isOpen: boolean;
 onClose: () => void;
 caseId: string;
 onSuccess: () => void;
 currentFamily?: { id: string; name: string | null } | null;
}

const labelCls = 'block text-[11px] font-semibold uppercase tracking-[0.1em] text-[#8C8880] mb-1.5';
const inputCls = 'w-full px-3 py-2 text-sm border border-[#E5E2DB] rounded-lg bg-[#ffffff] text-[#1C1A17] placeholder-[#8C8880] focus:outline-none focus:ring-2 focus:ring-[#0D9488]/30 focus:border-[#0D9488] transition-colors';

export default function LinkClaimsModal({ isOpen, onClose, caseId, onSuccess, currentFamily }: LinkClaimsModalProps) {
 const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
 const [isLoading, setIsLoading] = useState(true);
 const [isSubmitting, setIsSubmitting] = useState(false);
 const [error, setError] = useState<string | null>(null);
 const [selectedCaseIds, setSelectedCaseIds] = useState<Set<string>>(new Set());
 const [familyName, setFamilyName] = useState(currentFamily?.name || '');

 useEffect(() => {
 if (isOpen) { fetchSuggestions(); setSelectedCaseIds(new Set()); setFamilyName(currentFamily?.name || ''); }
 }, [isOpen, caseId, currentFamily]);

 const fetchSuggestions = async () => {
 setIsLoading(true);
 try {
 const res = await fetch(`/api/cases/${caseId}/link-suggestions`);
 if (res.ok) {
 const data = await res.json();
 setSuggestions(data);
 const preSelected = new Set<string>();
 data.forEach((s: Suggestion) => { if (s.isInSameFamily) preSelected.add(s.id); });
 setSelectedCaseIds(preSelected);
 }
 } catch (err) { console.error('Failed to fetch suggestions', err); }
 finally { setIsLoading(false); }
 };

 const toggleSelection = (id: string) => {
 const next = new Set(selectedCaseIds);
 next.has(id) ? next.delete(id) : next.add(id);
 setSelectedCaseIds(next);
 };

 const handleSubmit = async () => {
 setIsSubmitting(true); setError(null);
 const idsToLink = Array.from(selectedCaseIds);
 if (!idsToLink.includes(caseId)) idsToLink.push(caseId);
 try {
 const url = currentFamily ? `/api/claim-families/${currentFamily.id}` : '/api/claim-families';
 const res = await fetch(url, { method: currentFamily ? 'PATCH' : 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ name: familyName, caseIds: idsToLink }) });
 if (!res.ok) { const data = await res.json(); throw new Error(data.error || 'Failed to link claims'); }
 onSuccess(); onClose();
 } catch (err: any) { setError(err.message); }
 finally { setIsSubmitting(false); }
 };

 if (!isOpen) return null;

 return (
 <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
 <div className="bg-[#ffffff] rounded-xl shadow-[0_8px_40px_rgba(28,26,23,0.18)] border border-[#E5E2DB] w-full max-w-2xl overflow-hidden flex flex-col max-h-[90vh]">
 <div className="flex items-center justify-between px-6 py-4 border-b border-[#E5E2DB]">
 <h2 className="text-base font-semibold text-[#1C1A17] flex items-center gap-2">
 <LinkIcon className="w-4 h-4 text-[#0D9488]" />
 {currentFamily ? 'Manage Claim Family' : 'Link Related Claims'}
 </h2>
 <button onClick={onClose} className="p-1.5 hover:bg-[#F3F1EC] rounded-lg transition-colors">
 <X className="w-4 h-4 text-[#8C8880]" />
 </button>
 </div>

 <div className="flex-1 overflow-y-auto p-6 space-y-5">
 {error && (
 <div className="p-3 bg-red-50 border border-red-200 text-red-600 text-sm rounded-lg flex items-center gap-2">
 <AlertCircle className="w-4 h-4 flex-shrink-0" /> {error}
 </div>
 )}
 <div>
 <label className={labelCls}>Family Name <span className="normal-case font-normal text-[#8C8880]">(optional)</span></label>
 <input type="text" placeholder="e.g. 'Work Injury 2023'" className={inputCls} value={familyName} onChange={(e) => setFamilyName(e.target.value)} />
 </div>
 <div>
 <label className={labelCls}>Select Claims to Link</label>
 {isLoading ? (
 <div className="flex justify-center py-8"><Loader2 className="w-6 h-6 animate-spin text-[#0D9488]" /></div>
 ) : suggestions.length === 0 ? (
 <div className="text-center py-8 bg-[#FAF6EE] rounded-xl border border-dashed border-[#E5E2DB]">
 <p className="text-sm text-[#8C8880]">No other claims found for this claimant.</p>
 </div>
 ) : (
 <div className="space-y-2">
 {suggestions.map(suggestion => {
 const isSelected = selectedCaseIds.has(suggestion.id);
 return (
 <div key={suggestion.id} onClick={() => toggleSelection(suggestion.id)}
 className={cn('flex items-start gap-3 p-3 rounded-xl border cursor-pointer transition-all', isSelected ? 'bg-[#0D9488]/8 border-[#0D9488]/30' : 'bg-[#ffffff] border-[#E5E2DB] hover:border-[#0D9488]/30 hover:bg-[#FAF6EE]')}>
 <div className={cn('mt-0.5 w-5 h-5 rounded border flex items-center justify-center transition-colors flex-shrink-0', isSelected ? 'bg-[#0D9488] border-[#0D9488] text-[#ffffff]' : 'border-[#C8C4BB] bg-[#ffffff]')}>
 {isSelected && <CheckCircle className="w-3.5 h-3.5" />}
 </div>
 <div className="flex-1">
 <div className="flex items-center justify-between">
 <span className="font-medium text-sm text-[#1C1A17]">#{suggestion.caseNumber}</span>
 <span className="text-xs px-2 py-0.5 bg-[#F3F1EC] rounded-full text-[#5C5850]">{suggestion.status}</span>
 </div>
 <p className="text-sm text-[#5C5850] mt-1">{suggestion.title}</p>
 {suggestion.descriptionSnippet && <p className="text-xs text-[#8C8880] mt-0.5 line-clamp-1">{suggestion.descriptionSnippet}</p>}
 {suggestion.claimFamily && !suggestion.isInSameFamily && (
 <p className="text-xs text-amber-600 mt-1 flex items-center gap-1">
 <AlertCircle className="w-3 h-3" />
 Currently in "{suggestion.claimFamily.name || 'Another Family'}"
 </p>
 )}
 </div>
 </div>
 );
 })}
 </div>
 )}
 </div>
 </div>

 <div className="flex justify-end gap-3 px-6 py-4 border-t border-[#E5E2DB] bg-[#FAF6EE]">
 <button onClick={onClose} className="px-4 py-2 text-sm font-medium text-[#5C5850] hover:bg-[#F3F1EC] rounded-lg transition-colors">
 Cancel
 </button>
 <button onClick={handleSubmit} disabled={isSubmitting} className="flex items-center gap-2 px-5 py-2 bg-[#0D9488] hover:bg-[#0F766E] text-[#ffffff] rounded-lg text-sm font-semibold transition-colors disabled:opacity-70">
 {isSubmitting ? <><Loader2 className="w-4 h-4 animate-spin" /> Saving…</> : <><LinkIcon className="w-4 h-4" />{currentFamily ? 'Update Family' : 'Link Claims'}</>}
 </button>
 </div>
 </div>
 </div>
 );
}
