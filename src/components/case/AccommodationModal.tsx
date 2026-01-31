
import React, { useState, useEffect } from 'react';
import { X, Calendar, FileText, Check, AlertTriangle } from 'lucide-react';
import { AccommodationType, AccommodationStatus, LifecycleStatus, LifecycleSubstatus } from '@prisma/client';

interface AccommodationModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSave: (data: any) => Promise<void>;
    initialData?: any; // If editing
    caseId: string;
}

const ACCOMMODATION_TYPES = [
    { value: 'CHANGE_IN_FUNCTIONS', label: 'Change in Functions' },
    { value: 'ENVIRONMENTAL_MODIFICATION', label: 'Environmental Modification' },
    { value: 'JOB_AID', label: 'Job Aid Accommodation' },
    { value: 'LEAVE_OF_ABSENCE', label: 'Leave of Absence' },
    { value: 'PHYSICAL_ACCOMMODATION', label: 'Physical Accommodation' },
    { value: 'SCHEDULE_MODIFICATION', label: 'Schedule Modification' },
];

export function AccommodationModal({ isOpen, onClose, onSave, initialData, caseId }: AccommodationModalProps) {
    const [isLoading, setIsLoading] = useState(false);

    // Form State
    const [type, setType] = useState<AccommodationType | ''>('');
    const [subtype, setSubtype] = useState('');
    const [description, setDescription] = useState('');
    const [isLongTerm, setIsLongTerm] = useState(false);
    const [startDate, setStartDate] = useState('');
    const [endDate, setEndDate] = useState('');

    // Edit State
    const [status, setStatus] = useState<AccommodationStatus>('PENDING');
    const [lifecycleSubstatus, setLifecycleSubstatus] = useState<LifecycleSubstatus>('PENDING');
    const [decisionDate, setDecisionDate] = useState('');

    useEffect(() => {
        if (isOpen) {
            if (initialData) {
                setType(initialData.type);
                setSubtype(initialData.subtype || '');
                setDescription(initialData.description);
                setIsLongTerm(initialData.isLongTerm);
                setStartDate(initialData.startDate ? new Date(initialData.startDate).toISOString().split('T')[0] : '');
                setEndDate(initialData.endDate ? new Date(initialData.endDate).toISOString().split('T')[0] : '');
                setStatus(initialData.status);
                setLifecycleSubstatus(initialData.lifecycleSubstatus);
                setDecisionDate(initialData.decisionDate ? new Date(initialData.decisionDate).toISOString().split('T')[0] : '');
            } else {
                // Reset for new
                setType('');
                setSubtype('');
                setDescription('');
                setIsLongTerm(false);
                setStartDate('');
                setEndDate('');
                setStatus('PENDING');
                setLifecycleSubstatus('PENDING');
                setDecisionDate('');
            }
        }
    }, [isOpen, initialData]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsLoading(true);
        try {
            await onSave({
                type,
                subtype,
                description,
                isLongTerm,
                startDate,
                endDate: isLongTerm ? null : endDate,
                status,
                lifecycleSubstatus,
                decisionDate: decisionDate || null
            });
            onClose();
        } catch (error) {
            console.error(error);
            alert('Failed to save accommodation');
        } finally {
            setIsLoading(false);
        }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm">
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
                <div className="flex items-center justify-between p-6 border-b border-gray-100 dark:border-gray-700">
                    <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
                        {initialData ? `Edit Accommodation #${initialData.accommodationNumber}` : 'New Accommodation Request'}
                    </h2>
                    <button onClick={onClose} className="text-gray-400 hover:text-gray-500 transition-colors">
                        <X className="w-5 h-5" />
                    </button>
                </div>

                <form onSubmit={handleSubmit} className="p-6 space-y-6">
                    {/* Basic Info */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="space-y-2">
                            <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Type</label>
                            <select
                                required
                                value={type}
                                onChange={(e) => setType(e.target.value as AccommodationType)}
                                className="w-full px-3 py-2 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 focus:ring-2 focus:ring-blue-500 outline-none"
                            >
                                <option value="">Select Type...</option>
                                {ACCOMMODATION_TYPES.map(t => (
                                    <option key={t.value} value={t.value}>{t.label}</option>
                                ))}
                            </select>
                        </div>

                        <div className="space-y-2">
                            <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Subtype</label>
                            <input
                                type="text"
                                value={subtype}
                                onChange={(e) => setSubtype(e.target.value)}
                                placeholder="E.g. Ergonomic Chair"
                                className="w-full px-3 py-2 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 focus:ring-2 focus:ring-blue-500 outline-none"
                            />
                        </div>
                    </div>

                    <div className="space-y-2">
                        <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Description</label>
                        <textarea
                            required
                            rows={3}
                            value={description}
                            onChange={(e) => setDescription(e.target.value)}
                            className="w-full px-3 py-2 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 focus:ring-2 focus:ring-blue-500 outline-none resize-none"
                            placeholder="Describe the requested accommodation..."
                        />
                    </div>

                    {/* Timeline */}
                    <div className="p-4 bg-gray-50 dark:bg-gray-900/50 rounded-lg space-y-4">
                        <div className="flex items-center justify-between">
                            <h3 className="font-medium text-gray-900 dark:text-white flex items-center gap-2">
                                <Calendar className="w-4 h-4" />
                                Timeline
                            </h3>
                            <label className="flex items-center gap-2 text-sm cursor-pointer">
                                <input
                                    type="checkbox"
                                    checked={isLongTerm}
                                    onChange={(e) => setIsLongTerm(e.target.checked)}
                                    className="rounded text-blue-600 focus:ring-blue-500"
                                />
                                Long-Term / Indefinite
                            </label>
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="text-xs text-gray-500 mb-1 block">Start Date</label>
                                <input
                                    type="date"
                                    required
                                    value={startDate}
                                    onChange={(e) => setStartDate(e.target.value)}
                                    className="w-full px-3 py-2 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 focus:ring-2 focus:ring-blue-500 outline-none"
                                />
                            </div>
                            <div>
                                <label className="text-xs text-gray-500 mb-1 block">End Date</label>
                                <input
                                    type="date"
                                    disabled={isLongTerm}
                                    value={endDate}
                                    onChange={(e) => setEndDate(e.target.value)}
                                    className={`w-full px-3 py-2 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 focus:ring-2 focus:ring-blue-500 outline-none transition-opacity ${isLongTerm ? 'opacity-50 cursor-not-allowed' : ''}`}
                                />
                            </div>
                        </div>
                    </div>

                    {/* Status & Decision (Only visible if editing existing) */}
                    {initialData && (
                        <div className="space-y-4 border-t border-gray-100 dark:border-gray-700 pt-4">
                            <h3 className="font-medium text-gray-900 dark:text-white">Request Status</h3>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div className="space-y-2">
                                    <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Decision</label>
                                    <select
                                        value={status}
                                        onChange={(e) => setStatus(e.target.value as AccommodationStatus)}
                                        className="w-full px-3 py-2 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 focus:ring-2 focus:ring-blue-500 outline-none"
                                    >
                                        <option value="PENDING">Pending</option>
                                        <option value="APPROVED">Approved</option>
                                        <option value="REJECTED">Rejected</option>
                                        <option value="VOID">Void</option>
                                        <option value="RESCINDED">Rescinded</option>
                                    </select>
                                </div>
                                <div className="space-y-2">
                                    <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Date of Decision</label>
                                    <input
                                        type="date"
                                        value={decisionDate}
                                        onChange={(e) => setDecisionDate(e.target.value)}
                                        className="w-full px-3 py-2 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 focus:ring-2 focus:ring-blue-500 outline-none"
                                    />
                                </div>
                            </div>

                            <div className="space-y-2">
                                <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Lifecycle Substatus</label>
                                <select
                                    value={lifecycleSubstatus}
                                    onChange={(e) => setLifecycleSubstatus(e.target.value as LifecycleSubstatus)}
                                    className="w-full px-3 py-2 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 focus:ring-2 focus:ring-blue-500 outline-none"
                                >
                                    <option value="PENDING">Pending</option>
                                    <option value="APPROVED">Approved</option>
                                    <option value="MEDICAL_NOT_SUBMITTED">Medical Not Submitted</option>
                                    <option value="NO_LONGER_NEEDED">No Longer Needed</option>
                                    <option value="UNABLE_TO_ACCOMMODATE">Unable to Accommodate</option>
                                    <option value="CANCELLED">Cancelled</option>
                                    <option value="INSUFFICIENT_MEDICAL">Insufficient Medical</option>
                                </select>
                            </div>
                        </div>
                    )}

                    <div className="flex justify-end gap-3 pt-6">
                        <button
                            type="button"
                            onClick={onClose}
                            className="px-4 py-2 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors font-medium"
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            disabled={isLoading}
                            className="px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg shadow-sm transition-all hover:shadow-md font-medium disabled:opacity-50"
                        >
                            {isLoading ? 'Saving...' : initialData ? 'Update Accommodation' : 'Create Request'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}
