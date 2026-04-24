'use client';

import { createContext, useContext, useState, ReactNode } from 'react';
import { X, AlertTriangle, Terminal, Copy, Check } from 'lucide-react';
import { BugReportModal } from '@/components/modals/BugReportModal';

interface ErrorContextType {
 showError: (message: string, transactionId?: string) => void;
}

const ErrorContext = createContext<ErrorContextType | undefined>(undefined);

export function useError() {
 const context = useContext(ErrorContext);
 if (!context) throw new Error('useError must be used within ErrorProvider');
 return context;
}

export function ErrorProvider({ children }: { children: ReactNode }) {
 const [isOpen, setIsOpen] = useState(false);
 const [message, setMessage] = useState('');
 const [transactionId, setTransactionId] = useState<string | undefined>();
 const [showBugReport, setShowBugReport] = useState(false);
 const [copied, setCopied] = useState(false);

 const showError = (msg: string, txId?: string) => {
 setMessage(msg);
 setTransactionId(txId);
 setIsOpen(true);
 };

 const handleCopy = () => {
 if (transactionId) {
 navigator.clipboard.writeText(transactionId);
 setCopied(true);
 setTimeout(() => setCopied(false), 2000);
 }
 };

 return (
 <ErrorContext.Provider value={{ showError }}>
 {children}

 {/* Error Popup */}
 {isOpen && (
 <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-[200] p-4 animate-in fade-in duration-200">
 <div className="bg-surface rounded-2xl shadow-2xl w-full max-w-md overflow-hidden border border-red-100 dark:border-red-900/30">
 {/* Header */}
 <div className="bg-red-50 dark:bg-red-900/20 p-6 flex flex-col items-center text-center border-b border-red-100 dark:border-red-900/30">
 <div className="w-12 h-12 bg-red-100 dark:bg-red-900/50 text-red-600 rounded-full flex items-center justify-center mb-3">
 <AlertTriangle className="w-6 h-6" />
 </div>
 <h3 className="text-lg font-bold text-text-primary">Something went wrong</h3>
 <p className="text-sm text-text-muted mt-1">
 An unexpected error occurred while processing your request.
 </p>
 </div>

 {/* Body */}
 <div className="p-6 space-y-5">
 <div className="text-center text-text-secondary text-sm">
 {message}
 </div>

 {transactionId && (
 <div className="bg-surface-raised rounded-lg p-3 border border-border">
 <div className="text-xs text-text-muted mb-1 flex items-center gap-1">
 <Terminal className="w-3 h-3" />
 Transaction ID
 </div>
 <div className="flex items-center justify-between gap-2">
 <code className="text-xs font-mono bg-surface-raised px-2 py-1 rounded text-text-primary break-all">
 {transactionId}
 </code>
 <button
 onClick={handleCopy}
 className="p-1.5 hover:bg-surface-raised dark:hover:bg-gray-700 rounded text-text-muted transition-colors"
 title="Copy ID"
 >
 {copied ? <Check className="w-4 h-4 text-green-500" /> : <Copy className="w-4 h-4" />}
 </button>
 </div>
 </div>
 )}

 <div className="text-xs text-text-muted text-center">
 If this problem persists, please submit a bug report referencing the Transaction ID above.
 </div>
 </div>

 {/* Footer */}
 <div className="p-4 bg-surface-raised /50 flex flex-col sm:flex-row gap-3">
 <button
 onClick={() => { setIsOpen(false); setShowBugReport(true); }}
 className="flex-1 px-4 py-2.5 text-sm font-medium text-white bg-red-600 hover:bg-red-700 rounded-lg transition-colors shadow-sm shadow-red-200 dark:shadow-none"
 >
 Report Bug
 </button>
 <button
 onClick={() => setIsOpen(false)}
 className="flex-1 px-4 py-2.5 text-sm font-medium text-text-secondary bg-surface border border-border hover:bg-surface-raised dark:hover:bg-gray-700 rounded-lg transition-colors"
 >
 Close
 </button>
 </div>
 </div>
 </div>
 )}

 {/* Bug Report Modal Linked */}
 <BugReportModal
 isOpen={showBugReport}
 onClose={() => setShowBugReport(false)}
 initialTransactionId={transactionId}
 />
 </ErrorContext.Provider>
 );
}
