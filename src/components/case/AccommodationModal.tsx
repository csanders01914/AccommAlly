
import React, { useState, useEffect } from 'react';
import { X, Calendar, BrainCircuit, Info, Check, X as XIcon } from 'lucide-react';
import { AccommodationType, AccommodationStatus, LifecycleSubstatus } from '@prisma/client';
import { DecisionLogicAnswers, calculateDecisionSuggestion, DecisionRecommendation } from '@/lib/decision-logic';

interface AccommodationModalProps {
 isOpen: boolean;
 onClose: () => void;
 onSave: (data: any) => Promise<void>;
 initialData?: any;
 caseId: string;
}

const ACCOMMODATION_TYPES = [
 { value: 'CHANGE_IN_FUNCTIONS', label: 'Change in Functions' },
 { value: 'ENVIRONMENTAL_MODIFICATION', label: 'Environmental Modification' },
 { value: 'JOB_AID', label: 'Job Aid Accommodation' },
 { value: 'LEAVE_OF_ABSENCE', label: 'Leave of Absence' },
 { value: 'PHYSICAL_ACCOMMODATION', label: 'Physical Accommodation' },
 { value: 'SCHEDULE_MODIFICATION', label: 'Schedule Modification' },
];

const labelCls = 'block text-[11px] font-semibold uppercase tracking-[0.1em] text-[#8C8880] mb-1.5';
const inputCls = 'w-full px-3 py-2 text-sm border border-[#E5E2DB] rounded-lg bg-[#ffffff] text-[#1C1A17] placeholder-[#8C8880] focus:outline-none focus:ring-2 focus:ring-[#0D9488]/30 focus:border-[#0D9488] transition-colors';

export function AccommodationModal({ isOpen, onClose, onSave, initialData, caseId }: AccommodationModalProps) {
 const [isLoading, setIsLoading] = useState(false);
 const [type, setType] = useState<AccommodationType | ''>('');
 const [subtype, setSubtype] = useState('');
 const [description, setDescription] = useState('');
 const [isLongTerm, setIsLongTerm] = useState(false);
 const [startDate, setStartDate] = useState('');
 const [endDate, setEndDate] = useState('');
 const [status, setStatus] = useState<AccommodationStatus>('PENDING');
 const [lifecycleSubstatus, setLifecycleSubstatus] = useState<LifecycleSubstatus>('PENDING');
 const [decisionDate, setDecisionDate] = useState('');

 // Decision Logic State
 const [useLogicTool, setUseLogicTool] = useState(false);
 const [decisionLogic, setDecisionLogic] = useState<DecisionLogicAnswers>({
 hasValidMedical: null,
 restrictsEssentialFunctions: null,
 isReasonableAccommodation: null
 });
 const [suggestion, setSuggestion] = useState<DecisionRecommendation>('PENDING');

 useEffect(() => {
 if (isOpen) {
 if (initialData) {
 setType(initialData.type);
 setSubtype(initialData.subtype || '');
 setDescription(initialData.description);
 setIsLongTerm(initialData.isLongTerm);
 setStartDate(initialData.startDate ? new Date(initialData.startDate).toISOString().split('T')[0] : '');
 setEndDate(initialData.endDate ? new Date(initialData.endDate).toISOString().split('T')[0] : '');
 setStatus(initialData.status);
 setLifecycleSubstatus(initialData.lifecycleSubstatus);
 setDecisionDate(initialData.decisionDate ? new Date(initialData.decisionDate).toISOString().split('T')[0] : '');
 
 const initialLogic = initialData.decisionLogic || {
 hasValidMedical: null,
 restrictsEssentialFunctions: null,
 isReasonableAccommodation: null
 };
 setDecisionLogic(initialLogic);
 setUseLogicTool(!!initialData.decisionLogic);
 setSuggestion(calculateDecisionSuggestion(initialLogic));
 } else {
 setType(''); setSubtype(''); setDescription(''); setIsLongTerm(false);
 setStartDate(''); setEndDate(''); setStatus('PENDING'); setLifecycleSubstatus('PENDING'); setDecisionDate('');
 setUseLogicTool(false);
 setDecisionLogic({ hasValidMedical: null, restrictsEssentialFunctions: null, isReasonableAccommodation: null });
 setSuggestion('PENDING');
 }
 }
 }, [isOpen, initialData]);

 const updateLogic = (field: keyof DecisionLogicAnswers, val: boolean) => {
 const newLogic = { ...decisionLogic, [field]: val };
 setDecisionLogic(newLogic);
 setSuggestion(calculateDecisionSuggestion(newLogic));
 };

 const handleSubmit = async (e: React.FormEvent) => {
 e.preventDefault();
 setIsLoading(true);
 try {
 await onSave({ 
 type, subtype, description, isLongTerm, startDate, endDate: isLongTerm ? null : endDate, 
 status, lifecycleSubstatus, decisionDate: decisionDate || null,
 decisionLogic: useLogicTool ? decisionLogic : null
 });
 onClose();
 } catch (error) {
 console.error(error);
 alert('Failed to save accommodation');
 } finally {
 setIsLoading(false);
 }
 };

 if (!isOpen) return null;

 return (
 <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
 <div className="bg-[#ffffff] rounded-xl shadow-[0_8px_40px_rgba(28,26,23,0.18)] border border-[#E5E2DB] w-full max-w-2xl max-h-[90vh] overflow-y-auto">
 <div className="flex items-center justify-between px-6 py-4 border-b border-[#E5E2DB]">
 <h2 className="text-base font-semibold text-[#1C1A17]">
 {initialData ? `Edit Accommodation #${initialData.accommodationNumber}` : 'New Accommodation Request'}
 </h2>
 <button onClick={onClose} className="p-1.5 hover:bg-[#F3F1EC] rounded-lg transition-colors">
 <X className="w-4 h-4 text-[#8C8880]" />
 </button>
 </div>

 <form onSubmit={handleSubmit} className="p-6 space-y-5">
 <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
 <div>
 <label className={labelCls}>Type</label>
 <select required value={type} onChange={e => setType(e.target.value as AccommodationType)} className={inputCls}>
 <option value="">Select Type…</option>
 {ACCOMMODATION_TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
 </select>
 </div>
 <div>
 <label className={labelCls}>Subtype</label>
 <input type="text" value={subtype} onChange={e => setSubtype(e.target.value)} placeholder="E.g. Ergonomic Chair" className={inputCls} />
 </div>
 </div>

 <div>
 <label className={labelCls}>Description</label>
 <textarea required rows={3} value={description} onChange={e => setDescription(e.target.value)} placeholder="Describe the requested accommodation…" className={`${inputCls} resize-none`} />
 </div>

 <div className="p-4 bg-[#FAF6EE] rounded-lg border border-[#E5E2DB] space-y-4">
 <div className="flex items-center justify-between">
 <h3 className="text-sm font-semibold text-[#1C1A17] flex items-center gap-2">
 <Calendar className="w-4 h-4 text-[#0D9488]" />
 Timeline
 </h3>
 <label className="flex items-center gap-2 text-sm text-[#5C5850] cursor-pointer">
 <input type="checkbox" checked={isLongTerm} onChange={e => setIsLongTerm(e.target.checked)} className="rounded accent-[#0D9488]" />
 Long-Term / Indefinite
 </label>
 </div>
 <div className="grid grid-cols-2 gap-4">
 <div>
 <label className={labelCls}>Start Date</label>
 <input type="date" required value={startDate} onChange={e => setStartDate(e.target.value)} className={inputCls} />
 </div>
 <div>
 <label className={labelCls}>End Date</label>
 <input type="date" disabled={isLongTerm} value={endDate} onChange={e => setEndDate(e.target.value)} className={`${inputCls} ${isLongTerm ? 'opacity-40 cursor-not-allowed' : ''}`} />
 </div>
 </div>
 </div>

 {initialData && (
 <div className="space-y-4 pt-2 border-t border-[#E5E2DB]">
 
 <div className="flex items-center justify-between">
 <p className="text-[11px] font-semibold uppercase tracking-[0.1em] text-[#8C8880]">Decision Logic</p>
 <label className="flex items-center gap-2 text-sm text-[#5C5850] cursor-pointer">
 <input type="checkbox" checked={useLogicTool} onChange={e => setUseLogicTool(e.target.checked)} className="rounded accent-[#0D9488]" />
 <BrainCircuit className="w-4 h-4 text-[#0D9488]" />
 Use Logic Suggestor
 </label>
 </div>

 {useLogicTool && (
 <div className="p-4 bg-[#FAF6EE] rounded-lg border border-[#E5E2DB] space-y-4">
 {[
 { key: 'hasValidMedical', label: 'Is valid medical documentation on file?' },
 { key: 'restrictsEssentialFunctions', label: 'Does the condition restrict essential job functions?' },
 { key: 'isReasonableAccommodation', label: 'Is the accommodation reasonable (no undue hardship)?' },
 ].map((q) => {
 const val = decisionLogic[q.key as keyof DecisionLogicAnswers];
 return (
 <div key={q.key} className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
 <span className="text-sm text-[#1C1A17] font-medium">{q.label}</span>
 <div className="flex bg-[#ffffff] border border-[#E5E2DB] rounded-lg overflow-hidden shrink-0">
 <button type="button" onClick={() => updateLogic(q.key as keyof DecisionLogicAnswers, true)} className={`px-3 py-1 text-xs font-semibold flex items-center gap-1 transition-colors ${val === true ? 'bg-green-100 text-green-700' : 'text-[#8C8880] hover:bg-[#F3F1EC]'}`}>
 <Check className="w-3 h-3" /> Yes
 </button>
 <div className="w-px bg-[#E5E2DB]"></div>
 <button type="button" onClick={() => updateLogic(q.key as keyof DecisionLogicAnswers, false)} className={`px-3 py-1 text-xs font-semibold flex items-center gap-1 transition-colors ${val === false ? 'bg-red-100 text-red-700' : 'text-[#8C8880] hover:bg-[#F3F1EC]'}`}>
 <XIcon className="w-3 h-3" /> No
 </button>
 </div>
 </div>
 )
 })}
 
 <div className={`mt-4 p-3 rounded-md flex items-start gap-2 text-sm font-medium border ${
 suggestion === 'APPROVE' ? 'bg-green-50 text-green-800 border-green-200' :
 suggestion === 'REQUEST_INFO' ? 'bg-yellow-50 text-yellow-800 border-yellow-200' :
 suggestion === 'REVIEW_FOR_DENIAL' ? 'bg-red-50 text-red-800 border-red-200' :
 'bg-gray-50 text-gray-500 border-gray-200'
 }`}>
 <Info className={`w-5 h-5 shrink-0 ${suggestion === 'APPROVE' ? 'text-green-500' : suggestion === 'REQUEST_INFO' ? 'text-yellow-500' : suggestion === 'REVIEW_FOR_DENIAL' ? 'text-red-500' : 'text-gray-400'}`} />
 <span>
 {suggestion === 'APPROVE' ? 'Suggestion: APPROVE. All compliance criteria are met.' :
 suggestion === 'REQUEST_INFO' ? 'Suggestion: REQUEST MORE INFO. Medical documentation is missing or insufficient.' :
 suggestion === 'REVIEW_FOR_DENIAL' ? 'Suggestion: REVIEW FOR DENIAL. The accommodation is deemed unreasonable or an undue hardship.' :
 'Suggestion: Please answer all questions to see recommendation.'}
 </span>
 </div>
 </div>
 )}

 <div className="h-px bg-[#E5E2DB] my-4"></div>

 <p className="text-[11px] font-semibold uppercase tracking-[0.1em] text-[#8C8880]">Request Status</p>
 <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
 <div>
 <label className={labelCls}>Decision</label>
 <select value={status} onChange={e => setStatus(e.target.value as AccommodationStatus)} className={inputCls}>
 <option value="PENDING">Pending</option>
 <option value="APPROVED">Approved</option>
 <option value="REJECTED">Rejected</option>
 <option value="VOID">Void</option>
 <option value="RESCINDED">Rescinded</option>
 </select>
 </div>
 <div>
 <label className={labelCls}>Date of Decision</label>
 <input type="date" value={decisionDate} onChange={e => setDecisionDate(e.target.value)} className={inputCls} />
 </div>
 </div>
 <div>
 <label className={labelCls}>Lifecycle Substatus</label>
 <select value={lifecycleSubstatus} onChange={e => setLifecycleSubstatus(e.target.value as LifecycleSubstatus)} className={inputCls}>
 <option value="PENDING">Pending</option>
 <option value="APPROVED">Approved</option>
 <option value="MEDICAL_NOT_SUBMITTED">Medical Not Submitted</option>
 <option value="NO_LONGER_NEEDED">No Longer Needed</option>
 <option value="UNABLE_TO_ACCOMMODATE">Unable to Accommodate</option>
 <option value="CANCELLED">Cancelled</option>
 <option value="INSUFFICIENT_MEDICAL">Insufficient Medical</option>
 </select>
 </div>
 </div>
 )}

 <div className="flex justify-end gap-3 pt-2">
 <button type="button" onClick={onClose} className="px-4 py-2 text-sm font-medium text-[#5C5850] hover:bg-[#F3F1EC] rounded-lg transition-colors">
 Cancel
 </button>
 <button type="submit" disabled={isLoading} className="px-5 py-2 text-sm font-semibold text-[#ffffff] bg-[#0D9488] hover:bg-[#0F766E] rounded-lg disabled:opacity-50 transition-colors">
 {isLoading ? 'Saving…' : initialData ? 'Update Accommodation' : 'Create Request'}
 </button>
 </div>
 </form>
 </div>
 </div>
 );
}
