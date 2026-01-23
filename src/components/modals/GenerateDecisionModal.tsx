'use client';

import { useState } from 'react';
import { X, Loader2, FileText, CheckCircle2 } from 'lucide-react';

interface GenerateDecisionModalProps {
    isOpen: boolean;
    onClose: () => void;
    caseId: string;
    onSuccess: () => void;
}

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
            const res = await fetch(`/api/cases/${caseId}/decision`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ type, ...extraData })
            });
            if (res.ok) {
                setPreview(await res.json());
                setStep('PREVIEW');
            }
        } catch (error) {
            console.error(error);
        } finally {
            setIsLoading(false);
        }
    };

    const handleSave = async () => {
        if (!preview) return;
        setIsLoading(true);
        try {
            // Save as a Note for now
            const noteContent = `**DECISION Generated (${type})**\n\nSubject: ${preview.subject}\n\n${preview.body}`;
            await fetch(`/api/cases/${caseId}/notes`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ content: noteContent, noteType: 'GENERAL' }) // Could add 'DECISION' type later
            });
            onSuccess();
            onClose();
        } catch (error) {
            console.error(error);
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
            <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-xl w-full max-w-2xl overflow-hidden border border-gray-200 dark:border-gray-800 flex flex-col max-h-[90vh]">

                {/* Header */}
                <div className="flex items-center justify-between p-6 border-b border-gray-100 dark:border-gray-800">
                    <h2 className="text-xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
                        <FileText className="w-5 h-5 text-indigo-600" />
                        Generate Decision Notice
                    </h2>
                    <button onClick={onClose} className="text-gray-400 hover:text-gray-500 transition-colors">
                        <X className="w-5 h-5" />
                    </button>
                </div>

                {/* Content */}
                <div className="p-6 overflow-y-auto flex-1">
                    {step === 'INPUT' ? (
                        <div className="space-y-6">
                            <div className="space-y-3">
                                <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Decision Type</label>
                                <div className="grid grid-cols-3 gap-3">
                                    {['APPROVAL', 'DENIAL', 'RFI'].map((t) => (
                                        <button
                                            key={t}
                                            onClick={() => setType(t)}
                                            className={`py-3 px-4 rounded-lg border text-sm font-medium transition-all ${type === t
                                                    ? 'bg-indigo-50 border-indigo-500 text-indigo-700 dark:bg-indigo-900/20 dark:text-indigo-300'
                                                    : 'bg-white border-gray-200 text-gray-600 hover:bg-gray-50 dark:bg-gray-800 dark:border-gray-700 dark:text-gray-400'
                                                }`}
                                        >
                                            {t === 'RFI' ? 'Request Info' : t.charAt(0) + t.slice(1).toLowerCase()}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            {type === 'DENIAL' && (
                                <div className="space-y-2">
                                    <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Reason for Denial</label>
                                    <textarea
                                        value={extraData.reason}
                                        onChange={(e) => setExtraData({ ...extraData, reason: e.target.value })}
                                        className="w-full px-3 py-2 border rounded-lg dark:bg-gray-800 dark:border-gray-700 dark:text-white h-24"
                                        placeholder="Explain why the request is checked..."
                                    />
                                </div>
                            )}

                            {type === 'RFI' && (
                                <div className="space-y-2">
                                    <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Missing Information</label>
                                    <textarea
                                        value={extraData.missingInfo}
                                        onChange={(e) => setExtraData({ ...extraData, missingInfo: e.target.value })}
                                        className="w-full px-3 py-2 border rounded-lg dark:bg-gray-800 dark:border-gray-700 dark:text-white h-24"
                                        placeholder="List the documents or details needed..."
                                    />
                                </div>
                            )}
                        </div>
                    ) : (
                        <div className="space-y-4">
                            <div className="bg-gray-50 dark:bg-gray-800 p-4 rounded-lg border border-gray-200 dark:border-gray-700">
                                <p className="font-bold text-gray-900 dark:text-white mb-2">{preview?.subject}</p>
                                <hr className="border-gray-200 dark:border-gray-700 my-2" />
                                <pre className="whitespace-pre-wrap font-sans text-sm text-gray-700 dark:text-gray-300">
                                    {preview?.body}
                                </pre>
                            </div>
                        </div>
                    )}
                </div>

                {/* Footer */}
                <div className="p-6 border-t border-gray-100 dark:border-gray-800 flex justify-end gap-3 bg-gray-50 dark:bg-gray-900/50">
                    {step === 'INPUT' ? (
                        <>
                            <button onClick={onClose} className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-white rounded-lg transition-colors">
                                Cancel
                            </button>
                            <button
                                onClick={handleGenerate}
                                disabled={isLoading}
                                className="px-4 py-2 text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg transition-colors flex items-center gap-2"
                            >
                                {isLoading && <Loader2 className="w-4 h-4 animate-spin" />}
                                Preview Decision
                            </button>
                        </>
                    ) : (
                        <>
                            <button onClick={() => setStep('INPUT')} className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-white rounded-lg transition-colors">
                                Back to Edit
                            </button>
                            <button
                                onClick={handleSave}
                                disabled={isLoading}
                                className="px-4 py-2 text-sm font-medium text-white bg-green-600 hover:bg-green-700 rounded-lg transition-colors flex items-center gap-2"
                            >
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
