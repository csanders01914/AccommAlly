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

export default function LinkClaimsModal({ isOpen, onClose, caseId, onSuccess, currentFamily }: LinkClaimsModalProps) {
    const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [selectedCaseIds, setSelectedCaseIds] = useState<Set<string>>(new Set());
    const [familyName, setFamilyName] = useState(currentFamily?.name || '');

    useEffect(() => {
        if (isOpen) {
            fetchSuggestions();
            setSelectedCaseIds(new Set()); // Reset selection
            setFamilyName(currentFamily?.name || '');
        }
    }, [isOpen, caseId, currentFamily]);

    const fetchSuggestions = async () => {
        setIsLoading(true);
        try {
            const res = await fetch(`/api/cases/${caseId}/link-suggestions`);
            if (res.ok) {
                const data = await res.json();
                setSuggestions(data);
                // Pre-select cases already in the same family
                const preSelected = new Set<string>();
                data.forEach((s: Suggestion) => {
                    if (s.isInSameFamily) preSelected.add(s.id);
                });
                setSelectedCaseIds(preSelected);
            }
        } catch (err) {
            console.error('Failed to fetch suggestions', err);
        } finally {
            setIsLoading(false);
        }
    };

    const toggleSelection = (id: string) => {
        const next = new Set(selectedCaseIds);
        if (next.has(id)) {
            next.delete(id);
        } else {
            next.add(id);
        }
        setSelectedCaseIds(next);
    };

    const handleSubmit = async () => {
        setIsSubmitting(true);
        setError(null);

        const idsToLink = Array.from(selectedCaseIds);
        // Include current case
        if (!idsToLink.includes(caseId)) idsToLink.push(caseId);

        try {
            // Decide whether to CREATE new family or UPDATE existing (if we had logic for that)
            // For now, simpler to always use CREATE/UPDATE logic via POST or specific endpoint?
            // The plan says POST creates family.
            // If we have a currentFamily, maybe we should update it?
            // But if we want to add *new* cases to *current* family, we use PATCH.
            // Let's stick to POST for now to "Create or Update Grouping".
            // Actually, if we use POST and the cases are already in families, they move.
            // But we need to handle the case where we just want to ADD to current family.

            // Strategy:
            // If currentFamily exists, use PATCH /api/claim-families/[id].
            // If no currentFamily, use POST /api/claim-families.

            let url = '/api/claim-families';
            let method = 'POST';

            if (currentFamily) {
                url = `/api/claim-families/${currentFamily.id}`;
                method = 'PATCH';
            }

            const res = await fetch(url, {
                method,
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    name: familyName,
                    caseIds: idsToLink
                })
            });

            if (!res.ok) {
                const data = await res.json();
                throw new Error(data.error || 'Failed to link claims');
            }

            onSuccess();
            onClose();

        } catch (err: any) {
            setError(err.message);
        } finally {
            setIsSubmitting(false);
        }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
            <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl w-full max-w-2xl overflow-hidden border border-gray-200 dark:border-gray-800 flex flex-col max-h-[90vh]">
                <div className="flex items-center justify-between p-4 border-b border-gray-100 dark:border-gray-800">
                    <h2 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center gap-2">
                        <LinkIcon className="w-5 h-5 text-purple-600" />
                        {currentFamily ? 'Manage Claim Family' : 'Link Related Claims'}
                    </h2>
                    <button onClick={onClose} className="p-1 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors">
                        <X className="w-5 h-5 text-gray-500" />
                    </button>
                </div>

                <div className="flex-1 overflow-y-auto p-6 space-y-6">
                    {error && (
                        <div className="p-3 bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 text-sm rounded-lg flex items-center gap-2">
                            <AlertCircle className="w-4 h-4" />
                            {error}
                        </div>
                    )}

                    <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                            Family Name (Optional)
                        </label>
                        <input
                            type="text"
                            placeholder="e.g. 'Work Injury 2023'"
                            className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
                            value={familyName}
                            onChange={(e) => setFamilyName(e.target.value)}
                        />
                    </div>

                    <div>
                        <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
                            Select Claims to Link
                        </h3>

                        {isLoading ? (
                            <div className="flex justify-center py-8">
                                <Loader2 className="w-6 h-6 animate-spin text-purple-600" />
                            </div>
                        ) : suggestions.length === 0 ? (
                            <div className="text-center py-8 bg-gray-50 dark:bg-gray-900 rounded-xl border border-dashed border-gray-300 dark:border-gray-700">
                                <p className="text-gray-500">No other claims found for this claimant.</p>
                            </div>
                        ) : (
                            <div className="space-y-3">
                                {suggestions.map(suggestion => {
                                    const isSelected = selectedCaseIds.has(suggestion.id);
                                    return (
                                        <div
                                            key={suggestion.id}
                                            onClick={() => toggleSelection(suggestion.id)}
                                            className={cn(
                                                "flex items-start gap-3 p-3 rounded-xl border cursor-pointer transition-all",
                                                isSelected
                                                    ? "bg-purple-50 border-purple-200 dark:bg-purple-900/20 dark:border-purple-800"
                                                    : "bg-white border-gray-200 dark:bg-gray-900 dark:border-gray-700 hover:border-purple-300 dark:hover:border-purple-700"
                                            )}
                                        >
                                            <div className={cn(
                                                "mt-1 w-5 h-5 rounded border flex items-center justify-center transition-colors",
                                                isSelected
                                                    ? "bg-purple-600 border-purple-600 text-white"
                                                    : "border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800"
                                            )}>
                                                {isSelected && <CheckCircle className="w-3.5 h-3.5" />}
                                            </div>
                                            <div className="flex-1">
                                                <div className="flex items-center justify-between">
                                                    <span className="font-medium text-gray-900 dark:text-white">
                                                        #{suggestion.caseNumber}
                                                    </span>
                                                    <span className="text-xs px-2 py-0.5 bg-gray-100 dark:bg-gray-800 rounded-full text-gray-600 dark:text-gray-400">
                                                        {suggestion.status}
                                                    </span>
                                                </div>
                                                <p className="text-sm text-gray-600 dark:text-gray-300 mt-1">
                                                    {suggestion.title}
                                                </p>
                                                {suggestion.descriptionSnippet && (
                                                    <p className="text-xs text-gray-500 mt-1 line-clamp-1">
                                                        {suggestion.descriptionSnippet}
                                                    </p>
                                                )}
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

                <div className="flex justify-end gap-3 p-4 border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50">
                    <button
                        onClick={onClose}
                        className="px-4 py-2 text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg text-sm font-medium transition-colors"
                    >
                        Cancel
                    </button>
                    <button
                        onClick={handleSubmit}
                        disabled={isSubmitting}
                        className="flex items-center gap-2 px-5 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg text-sm font-medium transition-colors shadow-sm disabled:opacity-70"
                    >
                        {isSubmitting ? (
                            <>
                                <Loader2 className="w-4 h-4 animate-spin" />
                                Saving...
                            </>
                        ) : (
                            <>
                                <LinkIcon className="w-4 h-4" />
                                {currentFamily ? 'Update Family' : 'Link Claims'}
                            </>
                        )}
                    </button>
                </div>
            </div>
        </div>
    );
}
