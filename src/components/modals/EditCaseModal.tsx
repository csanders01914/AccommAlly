'use client';

import { useState, useEffect } from 'react';
import { X, Save } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Case } from '@prisma/client';

export interface EditCaseData {
    clientName: string;
    program: string;
    venue: string;
    status: string;
    medicalCondition: string;
    category: string;
    description: string;
    preferredStartDate: string;
    clientId?: string;
}

interface EditCaseModalProps {
    isOpen: boolean;
    onClose: () => void;
    caseData: any; // Using any for extended case type convenience
    onSave: (data: EditCaseData) => Promise<void>;
}

export function EditCaseModal({ isOpen, onClose, caseData, onSave }: EditCaseModalProps) {
    const [isLoading, setIsLoading] = useState(false);
    const [clients, setClients] = useState<{ id: string; name: string; code: string | null }[]>([]);
    const [formData, setFormData] = useState<EditCaseData>({
        clientName: '',
        program: '',
        venue: '',
        status: '',
        medicalCondition: '',
        category: '',
        description: '',
        preferredStartDate: '',
        clientId: '',
    });

    useEffect(() => {
        const fetchClients = async () => {
            try {
                const res = await fetch('/api/clients');
                if (res.ok) {
                    const data = await res.json();
                    if (Array.isArray(data)) {
                        setClients(data);
                    }
                }
            } catch (error) {
                console.error('Failed to fetch clients', error);
            }
        };
        fetchClients();
    }, []);

    useEffect(() => {
        if (caseData && isOpen) {
            setFormData({
                clientName: caseData.clientName || '',
                program: caseData.program || '',
                venue: caseData.venue || '',
                status: caseData.status || 'OPEN',
                medicalCondition: caseData.medicalCondition || '',
                category: caseData.category || '',
                description: caseData.description || '',
                preferredStartDate: caseData.preferredStartDate || '',
                clientId: caseData.clientId || caseData.client?.id || '',
            });
        }
    }, [caseData, isOpen]);

    if (!isOpen) return null;

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsLoading(true);
        try {
            await onSave(formData);
            onClose();
        } catch (error) {
            console.error(error);
            // Error handling should be done by parent or toast
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-in fade-in duration-200">
            <div className="bg-white dark:bg-gray-900 rounded-xl shadow-xl w-full max-w-2xl overflow-hidden animate-in zoom-in-95 duration-200">
                <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-800">
                    <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Edit Case Details</h2>
                    <button
                        onClick={onClose}
                        className="p-1 text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors"
                    >
                        <X className="w-5 h-5" />
                    </button>
                </div>

                <form onSubmit={handleSubmit} className="p-6 space-y-4 max-h-[80vh] overflow-y-auto">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Client Name (Claimant)</label>
                            <input
                                type="text"
                                value={formData.clientName}
                                onChange={e => setFormData({ ...formData, clientName: e.target.value })}
                                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 focus:ring-2 focus:ring-blue-500"
                                required
                            />
                        </div>

                        <div className="space-y-2">
                            <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Status</label>
                            <select
                                value={formData.status}
                                onChange={e => setFormData({ ...formData, status: e.target.value })}
                                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 focus:ring-2 focus:ring-blue-500"
                            >
                                <option value="OPEN">OPEN</option>
                                <option value="ACTIVE">ACTIVE</option>
                                <option value="REVIEW">REVIEW</option>
                                <option value="APPEAL">APPEAL</option>
                                <option value="CLOSED">CLOSED</option>
                            </select>
                        </div>

                        <div className="space-y-2">
                            <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Client Code</label>
                            <select
                                value={formData.clientId}
                                onChange={e => setFormData({ ...formData, clientId: e.target.value })}
                                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 focus:ring-2 focus:ring-blue-500"
                            >
                                <option value="">Select Client Code</option>
                                {clients.map(client => (
                                    <option key={client.id} value={client.id}>
                                        {client.code ? `${client.code} - ${client.name}` : client.name}
                                    </option>
                                ))}
                            </select>
                        </div>

                        <div className="space-y-2">
                            <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Program</label>
                            <input
                                type="text"
                                value={formData.program}
                                onChange={e => setFormData({ ...formData, program: e.target.value })}
                                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 focus:ring-2 focus:ring-blue-500"
                            />
                        </div>

                        <div className="space-y-2">
                            <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Venue</label>
                            <input
                                type="text"
                                value={formData.venue}
                                onChange={e => setFormData({ ...formData, venue: e.target.value })}
                                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 focus:ring-2 focus:ring-blue-500"
                            />
                        </div>

                        <div className="space-y-2">
                            <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Category</label>
                            <input
                                type="text"
                                value={formData.category}
                                onChange={e => setFormData({ ...formData, category: e.target.value })}
                                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 focus:ring-2 focus:ring-blue-500"
                            />
                        </div>

                        <div className="space-y-2">
                            <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Preferred Start Date</label>
                            <input
                                type="date"
                                value={formData.preferredStartDate}
                                onChange={e => setFormData({ ...formData, preferredStartDate: e.target.value })}
                                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 focus:ring-2 focus:ring-blue-500"
                            />
                        </div>
                    </div>

                    <div className="space-y-2">
                        <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Medical Condition / Reason</label>
                        <input
                            type="text"
                            value={formData.medicalCondition}
                            onChange={e => setFormData({ ...formData, medicalCondition: e.target.value })}
                            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 focus:ring-2 focus:ring-blue-500"
                        />
                    </div>

                    <div className="space-y-2">
                        <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Description</label>
                        <textarea
                            value={formData.description}
                            onChange={e => setFormData({ ...formData, description: e.target.value })}
                            rows={4}
                            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 focus:ring-2 focus:ring-blue-500"
                        />
                    </div>

                    <div className="flex justify-end gap-3 pt-4 border-t border-gray-200 dark:border-gray-800">
                        <button
                            type="button"
                            onClick={onClose}
                            className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors"
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            disabled={isLoading}
                            className="px-4 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors flex items-center gap-2 disabled:opacity-50"
                        >
                            {isLoading ? (
                                <>Saving...</>
                            ) : (
                                <>
                                    <Save className="w-4 h-4" />
                                    Save Changes
                                </>
                            )}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}
