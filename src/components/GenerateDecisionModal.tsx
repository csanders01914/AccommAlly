'use client';

import { useState } from 'react';
import { X, CheckCircle, FileText } from 'lucide-react';

interface GenerateDecisionModalProps {
    isOpen: boolean;
    onClose: () => void;
    caseId: string;
    onSuccess?: () => void;
}

export default function GenerateDecisionModal({ isOpen, onClose, caseId, onSuccess }: GenerateDecisionModalProps) {
    const [isLoading, setIsLoading] = useState(false);
    const [result, setResult] = useState<string | null>(null);

    if (!isOpen) return null;

    const handleGenerate = async () => {
        setIsLoading(true);
        // Simulate API call
        setTimeout(() => {
            setIsLoading(false);
            setResult('Decision generated successfully based on case notes and medical evidence.');
            if (onSuccess) onSuccess();
        }, 1500);
    };

    return (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
            <div className="bg-white dark:bg-gray-900 rounded-xl max-w-lg w-full p-6 shadow-xl">
                <div className="flex items-center justify-between mb-6">
                    <h2 className="text-xl font-bold dark:text-white flex items-center gap-2">
                        <FileText className="w-5 h-5 text-indigo-600" />
                        Generate Decision
                    </h2>
                    <button onClick={onClose} className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg">
                        <X className="w-5 h-5 text-gray-500" />
                    </button>
                </div>

                <div className="space-y-6">
                    {!result ? (
                        <>
                            <p className="text-gray-600 dark:text-gray-300">
                                This will analyze all case notes, medical documents, and timeline events to generate a recommended decision for this case.
                            </p>

                            <div className="flex justify-end gap-3 pt-4">
                                <button
                                    onClick={onClose}
                                    className="px-4 py-2 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg"
                                >
                                    Cancel
                                </button>
                                <button
                                    onClick={handleGenerate}
                                    disabled={isLoading}
                                    className="flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg font-medium disabled:opacity-50"
                                >
                                    {isLoading ? 'Analyzing...' : 'Generate Decision'}
                                </button>
                            </div>
                        </>
                    ) : (
                        <div className="text-center py-6">
                            <CheckCircle className="w-12 h-12 text-green-500 mx-auto mb-4" />
                            <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">Success</h3>
                            <p className="text-gray-600 dark:text-gray-300 mb-6">{result}</p>
                            <button
                                onClick={onClose}
                                className="px-6 py-2 bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-900 dark:text-white rounded-lg font-medium"
                            >
                                Close
                            </button>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
