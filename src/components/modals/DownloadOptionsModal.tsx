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
 <div className="modal-container w-full max-w-md overflow-hidden">
 <div className="flex items-center justify-between px-6 py-4 border-b border-border">
 <h3 className="text-base font-semibold text-text-primary">Download Document</h3>
 <button onClick={onClose} className="p-1.5 hover:bg-surface-raised rounded-lg transition-colors">
 <X className="w-4 h-4 text-text-muted" />
 </button>
 </div>

 <div className="p-6">
 <p className="text-sm text-text-secondary mb-5">
 How would you like to download <span className="font-medium text-text-primary">{fileName}</span>?
 </p>
 <div className="space-y-3">
 <button onClick={() => onConfirm(false)}
 className="w-full flex items-center gap-4 p-4 rounded-lg border border-border hover:border-primary-500/40 hover:bg-primary-500/5 transition-all group">
 <div className="w-10 h-10 rounded-full bg-surface-raised flex items-center justify-center group-hover:bg-primary-500/10 transition-colors">
 <FileText className="w-5 h-5 text-text-secondary group-hover:text-primary-500" />
 </div>
 <div className="text-left">
 <p className="font-medium text-sm text-text-primary">Original Document</p>
 <p className="text-xs text-text-muted">Download the clean file without any markups</p>
 </div>
 </button>
 <button onClick={() => onConfirm(true)}
 className="w-full flex items-center gap-4 p-4 rounded-lg border border-border hover:border-primary-500/40 hover:bg-primary-500/5 transition-all group">
 <div className="w-10 h-10 rounded-full bg-surface-raised flex items-center justify-center group-hover:bg-primary-500/10 transition-colors">
 <Highlighter className="w-5 h-5 text-text-secondary group-hover:text-primary-500" />
 </div>
 <div className="text-left">
 <p className="font-medium text-sm text-text-primary">With Annotations</p>
 <p className="text-xs text-text-muted">Download PDF with your highlights burned in</p>
 </div>
 </button>
 </div>
 </div>
 </div>
 </div>
 );
}
