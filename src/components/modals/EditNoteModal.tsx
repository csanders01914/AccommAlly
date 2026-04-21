'use client';

import { useState, useEffect } from 'react';
import { X, Save, AlertCircle, Loader2 } from 'lucide-react';

interface EditNoteData { id: string; content: string; }

interface EditNoteModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSave: (data: EditNoteData) => Promise<void>;
    initialData: { id: string; content: string } | null;
}

export default function EditNoteModal({ isOpen, onClose, onSave, initialData }: EditNoteModalProps) {
    const [content, setContent] = useState('');
    const [isSaving, setIsSaving] = useState(false);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        if (isOpen && initialData) { setContent(initialData.content); setError(null); }
    }, [isOpen, initialData]);

    if (!isOpen || !initialData) return null;

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!content.trim()) { setError('Note content cannot be empty'); return; }
        setIsSaving(true); setError(null);
        try { await onSave({ id: initialData.id, content }); onClose(); }
        catch (err: any) { setError(err.message || 'Failed to save note'); }
        finally { setIsSaving(false); }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
            <div className="bg-[#ffffff] rounded-xl shadow-[0_8px_40px_rgba(28,26,23,0.18)] border border-[#E5E2DB] w-full max-w-lg overflow-hidden">
                <div className="flex items-center justify-between px-6 py-4 border-b border-[#E5E2DB]">
                    <h2 className="text-base font-semibold text-[#1C1A17]">Edit Note</h2>
                    <button onClick={onClose} disabled={isSaving} className="p-1.5 hover:bg-[#F3F1EC] rounded-lg transition-colors">
                        <X className="w-4 h-4 text-[#8C8880]" />
                    </button>
                </div>

                <form onSubmit={handleSubmit} className="p-6 space-y-4">
                    {error && (
                        <div className="p-3 bg-red-50 border border-red-200 text-red-600 text-sm rounded-lg flex items-center gap-2">
                            <AlertCircle className="w-4 h-4 flex-shrink-0" /> {error}
                        </div>
                    )}
                    <div>
                        <label className="block text-[11px] font-semibold uppercase tracking-[0.1em] text-[#8C8880] mb-1.5">Note Content</label>
                        <textarea
                            rows={6}
                            className="w-full px-3 py-2.5 rounded-lg border border-[#E5E2DB] bg-[#F8F7F5] text-[#1C1A17] placeholder-[#8C8880] focus:outline-none focus:ring-2 focus:ring-[#0D9488]/30 focus:border-[#0D9488] transition-colors resize-none text-sm"
                            placeholder="Enter note content…"
                            value={content}
                            onChange={(e) => setContent(e.target.value)}
                            disabled={isSaving}
                            required
                        />
                    </div>
                    <div className="flex justify-end gap-3 pt-2">
                        <button type="button" onClick={onClose} disabled={isSaving} className="px-4 py-2 text-sm font-medium text-[#5C5850] hover:bg-[#F3F1EC] rounded-lg transition-colors">
                            Cancel
                        </button>
                        <button type="submit" disabled={isSaving} className="flex items-center gap-2 px-4 py-2 bg-[#0D9488] hover:bg-[#0F766E] text-[#ffffff] rounded-lg text-sm font-semibold transition-colors disabled:opacity-70">
                            {isSaving ? <><Loader2 className="w-4 h-4 animate-spin" /> Saving…</> : <><Save className="w-4 h-4" /> Save Changes</>}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}
