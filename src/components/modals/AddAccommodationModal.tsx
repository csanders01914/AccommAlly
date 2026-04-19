'use client';

import { useState } from 'react';
import { X } from 'lucide-react';

export interface AddAccommodationData {
    type: string;
    request: string;
    startDate: Date;
    endDate?: Date;
    costCode: string;
}

interface AddAccommodationModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSubmit: (data: AddAccommodationData) => void;
}

export function AddAccommodationModal({ isOpen, onClose, onSubmit }: AddAccommodationModalProps) {
    const [formData, setFormData] = useState<Partial<AddAccommodationData>>({
        type: 'Equipment',
        costCode: '',
        request: ''
    });

    if (!isOpen) return null;

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (formData.type && formData.request && formData.startDate && formData.costCode) {
            onSubmit(formData as AddAccommodationData);
            onClose();
        }
    };

    return (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
            <div className="bg-white dark:bg-gray-900 rounded-xl max-w-md w-full p-6 shadow-xl">
                <div className="flex items-center justify-between mb-6">
                    <h2 className="text-xl font-bold dark:text-white">Add Accommodation</h2>
                    <button onClick={onClose} className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg">
                        <X className="w-5 h-5 text-gray-500" />
                    </button>
                </div>

                <form onSubmit={handleSubmit} className="space-y-4">
                    <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                            Type
                        </label>
                        <select
                            required
                            className="w-full rounded-lg border border-gray-300 dark:border-gray-700 p-2.5 bg-white dark:bg-gray-800 dark:text-white"
                            value={formData.type}
                            onChange={e => setFormData({ ...formData, type: e.target.value })}
                        >
                            <option value="Equipment">Equipment</option>
                            <option value="Schedule Modification">Schedule Modification</option>
                            <option value="Interpreter">Interpreter</option>
                            <option value="Job Coach">Job Coach</option>
                            <option value="Other">Other</option>
                        </select>
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                            Description / Request
                        </label>
                        <textarea
                            required
                            className="w-full rounded-lg border border-gray-300 dark:border-gray-700 p-2.5 bg-white dark:bg-gray-800 dark:text-white"
                            rows={3}
                            value={formData.request}
                            onChange={e => setFormData({ ...formData, request: e.target.value })}
                        />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                Start Date
                            </label>
                            <input
                                type="date"
                                required
                                className="w-full rounded-lg border border-gray-300 dark:border-gray-700 p-2.5 bg-white dark:bg-gray-800 dark:text-white"
                                onChange={e => setFormData({ ...formData, startDate: new Date(e.target.value) })}
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                End Date (Optional)
                            </label>
                            <input
                                type="date"
                                className="w-full rounded-lg border border-gray-300 dark:border-gray-700 p-2.5 bg-white dark:bg-gray-800 dark:text-white"
                                onChange={e => setFormData({ ...formData, endDate: e.target.value ? new Date(e.target.value) : undefined })}
                            />
                        </div>
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                            Cost Code
                        </label>
                        <input
                            type="text"
                            required
                            className="w-full rounded-lg border border-gray-300 dark:border-gray-700 p-2.5 bg-white dark:bg-gray-800 dark:text-white"
                            value={formData.costCode}
                            onChange={e => setFormData({ ...formData, costCode: e.target.value })}
                        />
                    </div>

                    <div className="flex justify-end gap-3 pt-4">
                        <button
                            type="button"
                            onClick={onClose}
                            className="px-4 py-2 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg"
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium"
                        >
                            Add Accommodation
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}
