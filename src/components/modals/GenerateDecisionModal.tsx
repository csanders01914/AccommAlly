'use client';

import { useState } from 'react';
import { X, Loader2, FileText, CheckCircle2 } from 'lucide-react';
import { cn } from '@/lib/utils';

interface GenerateDecisionModalProps {
    isOpen: boolean;
    onClose: () => void;
    caseId: string;
    onSuccess: () => void;
}

const labelCls = 'block text-[11px] font-semibold uppercase tracking-[0.1em] text-[#8C8880] mb-1.5';
const inputCls = 'w-full px-3 py-2 text-sm border border-[#E5E2DB] rounded-lg bg-[#ffffff] text-[#1C1A17] placeholder-[#8C8880] focus:outline-none focus:ring-2 focus:ring-[#0D9488]/30 focus:border-[#0D9488] transition-colors resize-none';

export function GenerateDecisionModal({ isOpen, onClose, caseId, onSuccess }: GenerateDecisionModalProps) {
    const [isLoading, setIsLoading] = useState(false);
    const [step, setStep] = useState<'INPUT' | 'PREVIEW'>('INPUT');
    const [type, setType] = useState('APPROVAL');
    const [extraData, setExtraData] = useState({ reason: '', missingInfo: '' });
    const [preview, setPreview] = useState<{ subject: string; body: string } | null>(null);

    if (!isOpen) return null;

    const handleGenerate = async () => {
        setIsLoading(true);
        try {
            const res = await fetch(`/api/cases/${caseId}/decision`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ type, ...extraData }) });
            if (res.ok) { setPreview(await res.json()); setStep('PREVIEW'); }
        } catch (error) { console.error(error); }
        finally { setIsLoading(false); }
    };

    const handleSave = async () => {
        if (!preview) return;
        setIsLoading(true);
        try {
            const noteContent = `**DECISION Generated (${type})**\n\nSubject: ${preview.subject}\n\n${preview.body}`;
            await fetch(`/api/cases/${caseId}/notes`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ content: noteContent, noteType: 'GENERAL' }) });
            onSuccess(); onClose();
        } catch (error) { console.error(error); }
        finally { setIsLoading(false); }
    };

    const DECISION_TYPES = [
        { value: 'APPROVAL', label: 'Approval' },
        { value: 'DENIAL', label: 'Denial' },
        { value: 'RFI', label: 'Request Info' },
    ];

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
            <div className="bg-[#ffffff] rounded-xl shadow-[0_8px_40px_rgba(28,26,23,0.18)] border border-[#E5E2DB] w-full max-w-2xl overflow-hidden flex flex-col max-h-[90vh]">
                <div className="flex items-center justify-between px-6 py-4 border-b border-[#E5E2DB]">
                    <h2 className="text-base font-semibold text-[#1C1A17] flex items-center gap-2">
                        <FileText className="w-4 h-4 text-[#0D9488]" />
                        Generate Decision Notice
                    </h2>
                    <button onClick={onClose} className="p-1.5 hover:bg-[#F3F1EC] rounded-lg transition-colors">
                        <X className="w-4 h-4 text-[#8C8880]" />
                    </button>
                </div>

                <div className="p-6 overflow-y-auto flex-1">
                    {step === 'INPUT' ? (
                        <div className="space-y-5">
                            <div>
                                <label className={labelCls}>Decision Type</label>
                                <div className="grid grid-cols-3 gap-3">
                                    {DECISION_TYPES.map((t) => (
                                        <button key={t.value} onClick={() => setType(t.value)}
                                            className={cn('py-2.5 px-4 rounded-lg border text-sm font-medium transition-all', type === t.value ? 'bg-[#0D9488]/10 border-[#0D9488]/30 text-[#0D9488]' : 'bg-[#ffffff] border-[#E5E2DB] text-[#5C5850] hover:bg-[#F3F1EC]')}>
                                            {t.label}
                                        </button>
                                    ))}
                                </div>
                            </div>
                            {type === 'DENIAL' && (
                                <div>
                                    <label className={labelCls}>Reason for Denial</label>
                                    <textarea value={extraData.reason} onChange={(e) => setExtraData({ ...extraData, reason: e.target.value })} className={inputCls} rows={4} placeholder="Explain why the request is denied…" />
                                </div>
                            )}
                            {type === 'RFI' && (
                                <div>
                                    <label className={labelCls}>Missing Information</label>
                                    <textarea value={extraData.missingInfo} onChange={(e) => setExtraData({ ...extraData, missingInfo: e.target.value })} className={inputCls} rows={4} placeholder="List the documents or details needed…" />
                                </div>
                            )}
                        </div>
                    ) : (
                        <div className="space-y-4">
                            <div className="bg-[#F8F7F5] p-4 rounded-lg border border-[#E5E2DB]">
                                <p className="font-semibold text-[#1C1A17] mb-2 text-sm">{preview?.subject}</p>
                                <hr className="border-[#E5E2DB] my-2" />
                                <pre className="whitespace-pre-wrap font-sans text-sm text-[#5C5850]">{preview?.body}</pre>
                            </div>
                        </div>
                    )}
                </div>

                <div className="px-6 py-4 border-t border-[#E5E2DB] flex justify-end gap-3 bg-[#F8F7F5]">
                    {step === 'INPUT' ? (
                        <>
                            <button onClick={onClose} className="px-4 py-2 text-sm font-medium text-[#5C5850] hover:bg-[#F3F1EC] rounded-lg transition-colors">Cancel</button>
                            <button onClick={handleGenerate} disabled={isLoading} className="flex items-center gap-2 px-4 py-2 text-sm font-semibold text-[#ffffff] bg-[#0D9488] hover:bg-[#0F766E] rounded-lg transition-colors disabled:opacity-50">
                                {isLoading && <Loader2 className="w-4 h-4 animate-spin" />}
                                Preview Decision
                            </button>
                        </>
                    ) : (
                        <>
                            <button onClick={() => setStep('INPUT')} className="px-4 py-2 text-sm font-medium text-[#5C5850] hover:bg-[#F3F1EC] rounded-lg transition-colors">Back to Edit</button>
                            <button onClick={handleSave} disabled={isLoading} className="flex items-center gap-2 px-4 py-2 text-sm font-semibold text-[#ffffff] bg-[#0D9488] hover:bg-[#0F766E] rounded-lg transition-colors disabled:opacity-50">
                                {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
                                Confirm & Save to Notes
                            </button>
                        </>
                    )}
                </div>
            </div>
        </div>
    );
}
