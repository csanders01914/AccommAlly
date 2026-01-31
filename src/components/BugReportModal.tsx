'use client';

import { useState } from 'react';
import { X, Bug, Loader2 } from 'lucide-react';

interface BugReportModalProps {
    isOpen: boolean;
    onClose: () => void;
    initialTransactionId?: string;
    currentUser?: { name: string; email: string };
}

export function BugReportModal({ isOpen, onClose, initialTransactionId, currentUser }: BugReportModalProps) {
    const [transactionId, setTransactionId] = useState(initialTransactionId || '');
    const [subject, setSubject] = useState('');
    const [description, setDescription] = useState('');
    const [reporterName, setReporterName] = useState(currentUser?.name || '');
    const [reporterEmail, setReporterEmail] = useState(currentUser?.email || '');
    const [reporterPhone, setReporterPhone] = useState('');
    const [contactMethod, setContactMethod] = useState('EMAIL'); // EMAIL, PHONE, NONE
    const [shouldContact, setShouldContact] = useState(true);
    const [submitting, setSubmitting] = useState(false);

    if (!isOpen) return null;

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setSubmitting(true);

        try {
            const res = await fetch('/api/bug-reports', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    transactionId,
                    subject,
                    description,
                    reporterName,
                    reporterEmail,
                    reporterPhone,
                    contactMethod: shouldContact ? contactMethod : 'NONE'
                })
            });

            if (res.ok) {
                alert('Bug report submitted successfully! Thank you for your feedback.');
                onClose();
            } else {
                alert('Failed to submit bug report. Please try again.');
            }
        } catch (error) {
            console.error(error);
            alert('An error occurred.');
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[100] p-4 backdrop-blur-sm">
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-2xl w-full max-w-lg overflow-hidden flex flex-col max-h-[90vh]">
                <div className="p-4 border-b border-gray-100 dark:border-gray-700 flex justify-between items-center bg-gray-50 dark:bg-gray-900">
                    <div className="flex items-center gap-2 text-red-600">
                        <Bug className="w-5 h-5" />
                        <h3 className="font-semibold text-gray-900 dark:text-white">Submit Bug Report</h3>
                    </div>
                    <button onClick={onClose} className="p-1 hover:bg-gray-200 dark:hover:bg-gray-700 rounded text-gray-400">
                        <X className="w-5 h-5" />
                    </button>
                </div>

                <form onSubmit={handleSubmit} className="p-6 space-y-4 overflow-y-auto">
                    <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Transaction ID (Optional)</label>
                        <input
                            type="text"
                            value={transactionId}
                            onChange={(e) => setTransactionId(e.target.value)}
                            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-gray-50 dark:bg-gray-700 font-mono text-sm"
                            placeholder="e.g. 1234-5678-..."
                        />
                        <p className="text-xs text-gray-500 mt-1">Found in the error popup if you experienced a crash.</p>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Name <span className="text-red-500">*</span></label>
                            <input
                                required
                                type="text"
                                value={reporterName}
                                onChange={(e) => setReporterName(e.target.value)}
                                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-700"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Email <span className="text-red-500">*</span></label>
                            <input
                                required
                                type="email"
                                value={reporterEmail}
                                onChange={(e) => setReporterEmail(e.target.value)}
                                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-700"
                            />
                        </div>
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">One-line Summary <span className="text-red-500">*</span></label>
                        <input
                            required
                            type="text"
                            value={subject}
                            onChange={(e) => setSubject(e.target.value)}
                            placeholder="e.g. Save button not working on case notes"
                            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-700"
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Description <span className="text-red-500">*</span></label>
                        <textarea
                            required
                            rows={4}
                            value={description}
                            onChange={(e) => setDescription(e.target.value)}
                            placeholder="Please describe what happened, steps to reproduce, and what you expected to happen."
                            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-700"
                        />
                    </div>

                    <div className="bg-gray-50 dark:bg-gray-900 p-4 rounded-lg space-y-3">
                        <div className="flex items-center gap-2">
                            <input
                                type="checkbox"
                                id="contact"
                                checked={shouldContact}
                                onChange={(e) => setShouldContact(e.target.checked)}
                                className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                            />
                            <label htmlFor="contact" className="text-sm font-medium text-gray-900 dark:text-gray-100">
                                I would like to be contacted about this issue
                            </label>
                        </div>

                        {shouldContact && (
                            <div className="pl-6 space-y-3">
                                <div className="flex items-center gap-4">
                                    <label className="flex items-center gap-2 text-sm text-gray-700 dark:text-gray-300">
                                        <input
                                            type="radio"
                                            name="method"
                                            checked={contactMethod === 'EMAIL'}
                                            onChange={() => setContactMethod('EMAIL')}
                                        /> Email
                                    </label>
                                    <label className="flex items-center gap-2 text-sm text-gray-700 dark:text-gray-300">
                                        <input
                                            type="radio"
                                            name="method"
                                            checked={contactMethod === 'PHONE'}
                                            onChange={() => setContactMethod('PHONE')}
                                        /> Phone
                                    </label>
                                </div>
                                {contactMethod === 'PHONE' && (
                                    <input
                                        type="tel"
                                        placeholder="Phone Number"
                                        value={reporterPhone}
                                        onChange={(e) => setReporterPhone(e.target.value)}
                                        className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-700"
                                    />
                                )}
                            </div>
                        )}
                    </div>
                </form>

                <div className="p-4 border-t border-gray-100 dark:border-gray-700 bg-gray-50 dark:bg-gray-900 flex justify-end gap-2">
                    <button
                        onClick={onClose}
                        className="px-4 py-2 text-sm font-medium text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg"
                    >
                        Cancel
                    </button>
                    <button
                        onClick={handleSubmit}
                        disabled={submitting}
                        className="px-6 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-lg disabled:opacity-50 flex items-center gap-2"
                    >
                        {submitting && <Loader2 className="w-3 h-3 animate-spin" />}
                        Submit Report
                    </button>
                </div>
            </div>
        </div>
    );
}
