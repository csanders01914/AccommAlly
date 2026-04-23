'use client';
import { apiFetch } from '@/lib/api-client';

import { useState } from 'react';
import { X, Folder, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';

interface CreateFolderModalProps {
 isOpen: boolean;
 onClose: () => void;
 onSuccess: () => void;
}

const FOLDER_COLORS = ['#6366f1','#ef4444','#f97316','#eab308','#22c55e','#06b6d4','#3b82f6','#a855f7','#ec4899','#64748b'];

const labelCls = 'block text-[11px] font-semibold uppercase tracking-[0.1em] text-[#8C8880] mb-1.5';
const inputCls = 'w-full px-3 py-2 text-sm border border-[#E5E2DB] rounded-lg bg-[#ffffff] text-[#1C1A17] placeholder-[#8C8880] focus:outline-none focus:ring-2 focus:ring-[#0D9488]/30 focus:border-[#0D9488] transition-colors';

export function CreateFolderModal({ isOpen, onClose, onSuccess }: CreateFolderModalProps) {
 const [name, setName] = useState('');
 const [color, setColor] = useState('#6366f1');
 const [isLoading, setIsLoading] = useState(false);
 const [error, setError] = useState('');

 if (!isOpen) return null;

 const handleSubmit = async (e: React.FormEvent) => {
 e.preventDefault();
 if (!name.trim()) { setError('Folder name is required'); return; }
 setIsLoading(true); setError('');
 try {
 const res = await apiFetch('/api/messages/folders', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ name: name.trim(), color }) });
 if (!res.ok) { const data = await res.json(); throw new Error(data.error || 'Failed to create folder'); }
 setName(''); setColor('#6366f1');
 onSuccess(); onClose();
 } catch (err: any) { setError(err.message); }
 finally { setIsLoading(false); }
 };

 return (
 <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
 <div className="bg-[#ffffff] rounded-xl shadow-[0_8px_40px_rgba(28,26,23,0.18)] border border-[#E5E2DB] max-w-md w-full overflow-hidden">
 <div className="flex items-center justify-between px-6 py-4 border-b border-[#E5E2DB]">
 <h2 className="text-base font-semibold text-[#1C1A17] flex items-center gap-2">
 <Folder className="w-4 h-4" style={{ color }} />
 Create Folder
 </h2>
 <button onClick={onClose} className="p-1.5 hover:bg-[#F3F1EC] rounded-lg transition-colors">
 <X className="w-4 h-4 text-[#8C8880]" />
 </button>
 </div>

 <form onSubmit={handleSubmit} className="p-6 space-y-4">
 {error && <div className="p-3 text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg">{error}</div>}
 <div>
 <label className={labelCls}>Folder Name</label>
 <input type="text" value={name} onChange={e => setName(e.target.value)} placeholder="e.g., Important, Follow Up, Projects" className={inputCls} autoFocus />
 </div>
 <div>
 <label className={labelCls}>Color</label>
 <div className="flex flex-wrap gap-2">
 {FOLDER_COLORS.map(c => (
 <button key={c} type="button" onClick={() => setColor(c)}
 className={cn('w-8 h-8 rounded-lg transition-all', color === c ? 'ring-2 ring-offset-2 ring-[#8C8880] scale-110' : 'hover:scale-105')}
 style={{ backgroundColor: c }} />
 ))}
 </div>
 </div>
 <div className="flex justify-end gap-3 pt-2">
 <button type="button" onClick={onClose} className="px-4 py-2 text-sm font-medium text-[#5C5850] hover:bg-[#F3F1EC] rounded-lg transition-colors">
 Cancel
 </button>
 <button type="submit" disabled={isLoading} className="flex items-center gap-2 px-4 py-2 text-sm font-semibold text-[#ffffff] bg-[#0D9488] hover:bg-[#0F766E] rounded-lg transition-colors disabled:opacity-50">
 {isLoading && <Loader2 className="w-4 h-4 animate-spin" />}
 Create Folder
 </button>
 </div>
 </form>
 </div>
 </div>
 );
}
