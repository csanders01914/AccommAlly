'use client';

import { X, FileText, Highlighter } from 'lucide-react';

interface DownloadOptionsModalProps {
    isOpen: boolean;
    onClose: () => void;
    onConfirm: (withAnnotations: boolean) => void;
    fileName: string;
}

export function DownloadOptionsModal({ isOpen, onClose, onConfirm, fileName }: DownloadOptionsModalProps) {
    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
            <div className="bg-[#ffffff] rounded-xl shadow-[0_8px_40px_rgba(28,26,23,0.18)] border border-[#E5E2DB] w-full max-w-md overflow-hidden">
                <div className="flex items-center justify-between px-6 py-4 border-b border-[#E5E2DB]">
                    <h3 className="text-base font-semibold text-[#1C1A17]">Download Document</h3>
                    <button onClick={onClose} className="p-1.5 hover:bg-[#F3F1EC] rounded-lg transition-colors">
                        <X className="w-4 h-4 text-[#8C8880]" />
                    </button>
                </div>

                <div className="p-6">
                    <p className="text-sm text-[#5C5850] mb-5">
                        How would you like to download <span className="font-medium text-[#1C1A17]">{fileName}</span>?
                    </p>
                    <div className="space-y-3">
                        <button onClick={() => onConfirm(false)}
                            className="w-full flex items-center gap-4 p-4 rounded-lg border border-[#E5E2DB] hover:border-[#0D9488]/40 hover:bg-[#0D9488]/5 transition-all group">
                            <div className="w-10 h-10 rounded-full bg-[#F3F1EC] flex items-center justify-center group-hover:bg-[#0D9488]/10 transition-colors">
                                <FileText className="w-5 h-5 text-[#5C5850] group-hover:text-[#0D9488]" />
                            </div>
                            <div className="text-left">
                                <p className="font-medium text-sm text-[#1C1A17]">Original Document</p>
                                <p className="text-xs text-[#8C8880]">Download the clean file without any markups</p>
                            </div>
                        </button>
                        <button onClick={() => onConfirm(true)}
                            className="w-full flex items-center gap-4 p-4 rounded-lg border border-[#E5E2DB] hover:border-[#0D9488]/40 hover:bg-[#0D9488]/5 transition-all group">
                            <div className="w-10 h-10 rounded-full bg-[#F3F1EC] flex items-center justify-center group-hover:bg-[#0D9488]/10 transition-colors">
                                <Highlighter className="w-5 h-5 text-[#5C5850] group-hover:text-[#0D9488]" />
                            </div>
                            <div className="text-left">
                                <p className="font-medium text-sm text-[#1C1A17]">With Annotations</p>
                                <p className="text-xs text-[#8C8880]">Download PDF with your highlights burned in</p>
                            </div>
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}
