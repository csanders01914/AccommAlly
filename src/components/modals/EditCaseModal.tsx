'use client';

import { useState, useEffect } from 'react';
import { X, Save } from 'lucide-react';

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
    caseData: any;
    onSave: (data: EditCaseData) => Promise<void>;
}

const labelCls = 'block text-[11px] font-semibold uppercase tracking-[0.1em] text-[#8C8880] mb-1.5';
const inputCls = 'w-full px-3 py-2 text-sm border border-[#E5E2DB] rounded-lg bg-[#ffffff] text-[#1C1A17] placeholder-[#8C8880] focus:outline-none focus:ring-2 focus:ring-[#0D9488]/30 focus:border-[#0D9488] transition-colors';

export function EditCaseModal({ isOpen, onClose, caseData, onSave }: EditCaseModalProps) {
    const [isLoading, setIsLoading] = useState(false);
    const [clients, setClients] = useState<{ id: string; name: string; code: string | null }[]>([]);
    const [formData, setFormData] = useState<EditCaseData>({ clientName: '', program: '', venue: '', status: '', medicalCondition: '', category: '', description: '', preferredStartDate: '', clientId: '' });

    useEffect(() => {
        fetch('/api/clients').then(r => r.ok ? r.json() : []).then(data => Array.isArray(data) && setClients(data)).catch(console.error);
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
        try { await onSave(formData); onClose(); }
        catch (error) { console.error(error); }
        finally { setIsLoading(false); }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
            <div className="bg-[#ffffff] rounded-xl shadow-[0_8px_40px_rgba(28,26,23,0.18)] border border-[#E5E2DB] w-full max-w-2xl overflow-hidden">
                <div className="flex items-center justify-between px-6 py-4 border-b border-[#E5E2DB]">
                    <h2 className="text-base font-semibold text-[#1C1A17]">Edit Case Details</h2>
                    <button onClick={onClose} className="p-1.5 hover:bg-[#F3F1EC] rounded-lg transition-colors">
                        <X className="w-4 h-4 text-[#8C8880]" />
                    </button>
                </div>

                <form onSubmit={handleSubmit} className="p-6 space-y-4 max-h-[80vh] overflow-y-auto">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                            <label className={labelCls}>Client Name (Claimant)</label>
                            <input type="text" value={formData.clientName} onChange={e => setFormData({ ...formData, clientName: e.target.value })} className={inputCls} required />
                        </div>
                        <div>
                            <label className={labelCls}>Status</label>
                            <select value={formData.status} onChange={e => setFormData({ ...formData, status: e.target.value })} className={inputCls}>
                                <option value="OPEN">OPEN</option>
                                <option value="ACTIVE">ACTIVE</option>
                                <option value="REVIEW">REVIEW</option>
                                <option value="APPEAL">APPEAL</option>
                                <option value="CLOSED">CLOSED</option>
                            </select>
                        </div>
                        <div>
                            <label className={labelCls}>Client Code</label>
                            <select value={formData.clientId} onChange={e => setFormData({ ...formData, clientId: e.target.value })} className={inputCls}>
                                <option value="">Select Client Code</option>
                                {clients.map(client => <option key={client.id} value={client.id}>{client.code ? `${client.code} - ${client.name}` : client.name}</option>)}
                            </select>
                        </div>
                        <div>
                            <label className={labelCls}>Program</label>
                            <input type="text" value={formData.program} onChange={e => setFormData({ ...formData, program: e.target.value })} className={inputCls} />
                        </div>
                        <div>
                            <label className={labelCls}>Venue</label>
                            <input type="text" value={formData.venue} onChange={e => setFormData({ ...formData, venue: e.target.value })} className={inputCls} />
                        </div>
                        <div>
                            <label className={labelCls}>Category</label>
                            <input type="text" value={formData.category} onChange={e => setFormData({ ...formData, category: e.target.value })} className={inputCls} />
                        </div>
                        <div>
                            <label className={labelCls}>Preferred Start Date</label>
                            <input type="date" value={formData.preferredStartDate} onChange={e => setFormData({ ...formData, preferredStartDate: e.target.value })} className={inputCls} />
                        </div>
                    </div>

                    <div>
                        <label className={labelCls}>Medical Condition / Reason</label>
                        <input type="text" value={formData.medicalCondition} onChange={e => setFormData({ ...formData, medicalCondition: e.target.value })} className={inputCls} />
                    </div>
                    <div>
                        <label className={labelCls}>Description</label>
                        <textarea value={formData.description} onChange={e => setFormData({ ...formData, description: e.target.value })} rows={4} className={`${inputCls} resize-none`} />
                    </div>

                    <div className="flex justify-end gap-3 pt-4 border-t border-[#E5E2DB]">
                        <button type="button" onClick={onClose} className="px-4 py-2 text-sm font-medium text-[#5C5850] hover:bg-[#F3F1EC] rounded-lg transition-colors">
                            Cancel
                        </button>
                        <button type="submit" disabled={isLoading} className="flex items-center gap-2 px-4 py-2 text-sm font-semibold text-[#ffffff] bg-[#0D9488] hover:bg-[#0F766E] rounded-lg transition-colors disabled:opacity-50">
                            {isLoading ? 'Saving…' : <><Save className="w-4 h-4" /> Save Changes</>}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}
