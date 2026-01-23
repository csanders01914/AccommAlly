'use client';

import { useState, useEffect } from 'react';
import { User, X, ArrowRightLeft } from 'lucide-react';

interface UserOption {
    id: string;
    name: string;
    role: string;
}

interface TransferCaseModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSubmit: (newOwnerId: string) => Promise<void>;
    users: UserOption[];
    currentOwnerName?: string;
}

export function TransferCaseModal({
    isOpen,
    onClose,
    onSubmit,
    users,
    currentOwnerName
}: TransferCaseModalProps) {
    const [selectedUserId, setSelectedUserId] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);

    useEffect(() => {
        if (isOpen) {
            setSelectedUserId('');
            setIsSubmitting(false);
        }
    }, [isOpen]);

    const handleBackdropClick = (e: React.MouseEvent) => {
        if (e.target === e.currentTarget) {
            onClose();
        }
    };

    const handleSubmit = async () => {
        if (!selectedUserId) return;

        try {
            setIsSubmitting(true);
            await onSubmit(selectedUserId);
            onClose();
        } catch (err) {
            console.error(err);
        } finally {
            setIsSubmitting(false);
        }
    };

    if (!isOpen) return null;

    // Filter out users who shouldn't be assigned (e.g., maybe filter out the current owner if we had their ID easily, 
    // but for now just showing all coordinators is fine)
    const coordinators = users.filter(u => u.role === 'COORDINATOR' || u.role === 'ADMIN' || u.role === 'PROGRAM_LEAD');

    return (
        <div
            className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4"
            onClick={handleBackdropClick}
        >
            <div
                className="bg-white dark:bg-gray-900 rounded-2xl shadow-2xl w-full max-w-md overflow-hidden flex flex-col"
                role="dialog"
                aria-modal="true"
            >
                {/* Header */}
                <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 dark:border-gray-700">
                    <h2 className="text-xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
                        <ArrowRightLeft className="w-5 h-5 text-indigo-600" />
                        Transfer Case
                    </h2>
                    <button
                        onClick={onClose}
                        className="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors"
                    >
                        <X className="w-5 h-5" />
                    </button>
                </div>

                {/* Body */}
                <div className="p-6 space-y-4">
                    <p className="text-sm text-gray-500 dark:text-gray-400">
                        Transferring this case will reassign all <strong>pending tasks</strong> to the new owner.
                        {currentOwnerName && <span> Currently assigned to: <strong>{currentOwnerName}</strong></span>}
                    </p>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                            New Owner
                        </label>
                        <select
                            value={selectedUserId}
                            onChange={(e) => setSelectedUserId(e.target.value)}
                            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                        >
                            <option value="">Select a coordinator...</option>
                            {coordinators.map(user => (
                                <option key={user.id} value={user.id}>
                                    {user.name} ({user.role})
                                </option>
                            ))}
                        </select>
                    </div>
                </div>

                {/* Footer */}
                <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50">
                    <button
                        onClick={onClose}
                        className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                        disabled={isSubmitting}
                    >
                        Cancel
                    </button>
                    <button
                        onClick={handleSubmit}
                        disabled={!selectedUserId || isSubmitting}
                        className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-indigo-600 rounded-lg hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                    >
                        {isSubmitting ? 'Transferring...' : 'Transfer Case'}
                    </button>
                </div>
            </div>
        </div>
    );
}
