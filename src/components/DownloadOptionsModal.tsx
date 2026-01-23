'use client';

import { X, FileText, Highlighter } from 'lucide-react';

interface DownloadOptionsModalProps {
    isOpen: boolean;
    onClose: () => void;
    onConfirm: (withAnnotations: boolean) => void;
    fileName: string;
}

export function DownloadOptionsModal({
    isOpen,
    onClose,
    onConfirm,
    fileName,
}: DownloadOptionsModalProps) {
    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 animate-in fade-in duration-200">
            <div className="bg-white dark:bg-gray-900 rounded-xl shadow-xl w-full max-w-md overflow-hidden animate-in zoom-in-95 duration-200">
                {/* Header */}
                <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 dark:border-gray-800">
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                        Download Document
                    </h3>
                    <button
                        onClick={onClose}
                        className="text-gray-400 hover:text-gray-500 dark:hover:text-gray-300 transition-colors"
                    >
                        <X className="w-5 h-5" />
                    </button>
                </div>

                {/* Content */}
                <div className="p-6">
                    <p className="text-sm text-gray-600 dark:text-gray-400 mb-6">
                        How would you like to download <span className="font-medium text-gray-900 dark:text-white">{fileName}</span>?
                    </p>

                    <div className="space-y-3">
                        <button
                            onClick={() => onConfirm(false)}
                            className="w-full flex items-center gap-4 p-4 rounded-lg border border-gray-200 dark:border-gray-700 hover:border-blue-500 hover:bg-blue-50 dark:hover:bg-blue-900/20 dark:hover:border-blue-500 transition-all group"
                        >
                            <div className="w-10 h-10 rounded-full bg-gray-100 dark:bg-gray-800 flex items-center justify-center group-hover:bg-blue-100 dark:group-hover:bg-blue-900/50 transition-colors">
                                <FileText className="w-5 h-5 text-gray-600 dark:text-gray-400 group-hover:text-blue-600 dark:group-hover:text-blue-400" />
                            </div>
                            <div className="text-left">
                                <p className="font-medium text-gray-900 dark:text-white">Original Document</p>
                                <p className="text-xs text-gray-500 dark:text-gray-400">Download the clean file without any markups</p>
                            </div>
                        </button>

                        <button
                            onClick={() => onConfirm(true)}
                            className="w-full flex items-center gap-4 p-4 rounded-lg border border-gray-200 dark:border-gray-700 hover:border-blue-500 hover:bg-blue-50 dark:hover:bg-blue-900/20 dark:hover:border-blue-500 transition-all group"
                        >
                            <div className="w-10 h-10 rounded-full bg-gray-100 dark:bg-gray-800 flex items-center justify-center group-hover:bg-blue-100 dark:group-hover:bg-blue-900/50 transition-colors">
                                <Highlighter className="w-5 h-5 text-gray-600 dark:text-gray-400 group-hover:text-blue-600 dark:group-hover:text-blue-400" />
                            </div>
                            <div className="text-left">
                                <p className="font-medium text-gray-900 dark:text-white">With Annotations</p>
                                <p className="text-xs text-gray-500 dark:text-gray-400">Download PDF with your highlights burned in</p>
                            </div>
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}
