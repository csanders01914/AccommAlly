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

const labelCls = 'block text-[11px] font-semibold uppercase tracking-[0.1em] text-[#8C8880] mb-1.5';
const inputCls = 'w-full px-3 py-2 text-sm border border-[#E5E2DB] rounded-lg bg-[#ffffff] text-[#1C1A17] placeholder-[#8C8880] focus:outline-none focus:ring-2 focus:ring-[#0D9488]/30 focus:border-[#0D9488] transition-colors';

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
            <div className="bg-[#ffffff] rounded-xl max-w-md w-full shadow-[0_8px_40px_rgba(28,26,23,0.18)] border border-[#E5E2DB]">
                <div className="flex items-center justify-between px-6 py-4 border-b border-[#E5E2DB]">
                    <h2 className="text-base font-semibold text-[#1C1A17]">Add Accommodation</h2>
                    <button onClick={onClose} className="p-1.5 hover:bg-[#F3F1EC] rounded-lg transition-colors">
                        <X className="w-4 h-4 text-[#8C8880]" />
                    </button>
                </div>

                <form onSubmit={handleSubmit} className="p-6 space-y-4">
                    <div>
                        <label className={labelCls}>Type</label>
                        <select required className={inputCls} value={formData.type} onChange={e => setFormData({ ...formData, type: e.target.value })}>
                            <option value="Equipment">Equipment</option>
                            <option value="Schedule Modification">Schedule Modification</option>
                            <option value="Interpreter">Interpreter</option>
                            <option value="Job Coach">Job Coach</option>
                            <option value="Other">Other</option>
                        </select>
                    </div>

                    <div>
                        <label className={labelCls}>Description / Request</label>
                        <textarea
                            required
                            className={inputCls}
                            rows={3}
                            value={formData.request}
                            onChange={e => setFormData({ ...formData, request: e.target.value })}
                        />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className={labelCls}>Start Date</label>
                            <input type="date" required className={inputCls} onChange={e => setFormData({ ...formData, startDate: new Date(e.target.value) })} />
                        </div>
                        <div>
                            <label className={labelCls}>End Date <span className="normal-case font-normal text-[#8C8880]">(optional)</span></label>
                            <input type="date" className={inputCls} onChange={e => setFormData({ ...formData, endDate: e.target.value ? new Date(e.target.value) : undefined })} />
                        </div>
                    </div>

                    <div>
                        <label className={labelCls}>Cost Code</label>
                        <input type="text" required className={inputCls} value={formData.costCode} onChange={e => setFormData({ ...formData, costCode: e.target.value })} />
                    </div>

                    <div className="flex justify-end gap-3 pt-2">
                        <button type="button" onClick={onClose} className="px-4 py-2 text-sm font-medium text-[#5C5850] hover:bg-[#F3F1EC] rounded-lg transition-colors">
                            Cancel
                        </button>
                        <button type="submit" className="px-4 py-2 bg-[#0D9488] hover:bg-[#0F766E] text-[#ffffff] text-sm font-semibold rounded-lg transition-colors">
                            Add Accommodation
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}
