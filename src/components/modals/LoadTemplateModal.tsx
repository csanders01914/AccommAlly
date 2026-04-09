'use client';

import { useState, useEffect } from 'react';
import { X, FileText } from 'lucide-react';

interface Template {
    id: string;
    name: string;
    description: string | null;
}

interface Case {
    id: string;
    caseNumber: string;
    clientName?: string;
}

interface LoadTemplateModalProps {
    onClose: () => void;
    onLoad: (html: string) => void;
    linkedCaseId?: string;
    cases: Case[];
}

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

        setApplying(true);
        setError('');
        try {
            const res = await fetch(`/api/document-templates/${selectedTemplateId}/apply`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ caseId: selectedCaseId }),
            });
            const data = await res.json();
            if (!res.ok) throw new Error(data.error);
            onLoad(data.html);
            onClose();
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to apply template');
        } finally {
            setApplying(false);
        }
    }

    return (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-white dark:bg-gray-900 rounded-xl w-full max-w-md shadow-xl">
                <div className="flex items-center justify-between p-5 border-b border-gray-100 dark:border-gray-800">
                    <h2 className="text-base font-semibold text-gray-900 dark:text-white flex items-center gap-2">
                        <FileText className="w-4 h-4" /> Load Template
                    </h2>
                    <button onClick={onClose} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200">
                        <X className="w-5 h-5" />
                    </button>
                </div>

                <div className="p-5 space-y-4">
                    {error && <p className="text-red-500 text-sm">{error}</p>}

                    <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Template</label>
                        {loadingTemplates ? (
                            <p className="text-sm text-gray-400">Loading…</p>
                        ) : templates.length === 0 ? (
                            <p className="text-sm text-gray-400">No templates available for this account.</p>
                        ) : (
                            <select
                                value={selectedTemplateId}
                                onChange={e => setSelectedTemplateId(e.target.value)}
                                className="w-full px-3 py-2 border border-gray-200 dark:border-gray-700 rounded-lg text-sm dark:bg-gray-800 dark:text-white"
                            >
                                <option value="">Select a template…</option>
                                {templates.map(t => (
                                    <option key={t.id} value={t.id}>{t.name}</option>
                                ))}
                            </select>
                        )}
                        {selectedTemplateId && (() => {
                            const selected = templates.find(t => t.id === selectedTemplateId);
                            return selected?.description ? (
                                <p className="text-xs text-gray-400 mt-1">{selected.description}</p>
                            ) : null;
                        })()}
                    </div>

                    {!linkedCaseId && (
                        <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Case</label>
                            <select
                                value={selectedCaseId}
                                onChange={e => setSelectedCaseId(e.target.value)}
                                className="w-full px-3 py-2 border border-gray-200 dark:border-gray-700 rounded-lg text-sm dark:bg-gray-800 dark:text-white"
                            >
                                <option value="">Select a case…</option>
                                {cases.map(c => (
                                    <option key={c.id} value={c.id}>{c.caseNumber}{c.clientName ? ` — ${c.clientName}` : ''}</option>
                                ))}
                            </select>
                        </div>
                    )}
                </div>

                <div className="p-5 border-t border-gray-100 dark:border-gray-800 flex justify-end gap-3">
                    <button onClick={onClose} className="px-4 py-2 text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg text-sm">
                        Cancel
                    </button>
                    <button
                        onClick={handleLoad}
                        disabled={applying || loadingTemplates}
                        className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-sm font-medium disabled:opacity-50"
                    >
                        {applying ? 'Loading…' : 'Load Template'}
                    </button>
                </div>
            </div>
        </div>
    );
}
