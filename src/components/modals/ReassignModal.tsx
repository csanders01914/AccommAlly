'use client';

import { useState, useEffect } from 'react';
import { X, Search, Loader2 } from 'lucide-react';

interface UserOption { id: string; name: string; email: string; role: string; }

interface ReassignModalProps {
 isOpen: boolean;
 onClose: () => void;
 onReassign: (userId: string) => Promise<void>;
 currentItemType: string;
 currentItemTitle?: string;
}

export function ReassignModal({ isOpen, onClose, onReassign, currentItemType, currentItemTitle }: ReassignModalProps) {
 const [users, setUsers] = useState<UserOption[]>([]);
 const [loading, setLoading] = useState(true);
 const [search, setSearch] = useState('');
 const [selectedUser, setSelectedUser] = useState<string | null>(null);
 const [submitting, setSubmitting] = useState(false);

 useEffect(() => {
 if (isOpen) { fetchUsers(); setSelectedUser(null); setSearch(''); }
 }, [isOpen]);

 const fetchUsers = async () => {
 try {
 const res = await fetch('/api/admin/users');
 if (res.ok) setUsers(await res.json());
 } catch (error) { console.error('Failed to fetch users', error); }
 finally { setLoading(false); }
 };

 const handleConfirm = async () => {
 if (!selectedUser) return;
 setSubmitting(true);
 try { await onReassign(selectedUser); onClose(); }
 catch (error) { console.error(error); }
 finally { setSubmitting(false); }
 };

 const filteredUsers = users.filter(u =>
 u.name.toLowerCase().includes(search.toLowerCase()) ||
 u.email.toLowerCase().includes(search.toLowerCase())
 );

 if (!isOpen) return null;

 return (
 <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
 <div className="bg-[#ffffff] rounded-xl shadow-[0_8px_40px_rgba(28,26,23,0.18)] border border-[#E5E2DB] w-full max-w-md overflow-hidden flex flex-col max-h-[80vh]">
 <div className="flex items-center justify-between px-5 py-4 border-b border-[#E5E2DB]">
 <h3 className="text-base font-semibold text-[#1C1A17]">Reassign {currentItemType}</h3>
 <button onClick={onClose} className="p-1.5 hover:bg-[#F3F1EC] rounded-lg transition-colors">
 <X className="w-4 h-4 text-[#8C8880]" />
 </button>
 </div>

 <div className="p-4 space-y-4 flex-1 overflow-hidden flex flex-col">
 <div className="text-sm text-[#5C5850]">
 Reassigning <span className="font-medium text-[#1C1A17]">"{currentItemTitle}"</span> to:
 </div>

 <div className="relative">
 <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-[#8C8880]" />
 <input
 type="text"
 placeholder="Search users…"
 value={search}
 onChange={(e) => setSearch(e.target.value)}
 className="w-full pl-9 pr-3 py-2 text-sm border border-[#E5E2DB] rounded-lg bg-[#FAF6EE] text-[#1C1A17] placeholder-[#8C8880] focus:outline-none focus:ring-2 focus:ring-[#0D9488]/30 focus:border-[#0D9488] transition-colors"
 />
 </div>

 <div className="flex-1 overflow-y-auto space-y-1 border border-[#E5E2DB] rounded-lg p-2">
 {loading ? (
 <div className="flex justify-center p-4"><Loader2 className="animate-spin text-[#0D9488]" /></div>
 ) : (
 filteredUsers.map(user => (
 <button
 key={user.id}
 onClick={() => setSelectedUser(user.id)}
 className={`w-full flex items-center gap-3 p-2 rounded-lg text-left transition-colors ${selectedUser === user.id ? 'bg-[#0D9488]/10 border border-[#0D9488]/20' : 'hover:bg-[#FAF6EE] border border-transparent'}`}
 >
 <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold ${selectedUser === user.id ? 'bg-[#0D9488]/15 text-[#0D9488]' : 'bg-[#F3F1EC] text-[#5C5850]'}`}>
 {user.name.charAt(0)}
 </div>
 <div>
 <div className="text-sm font-medium text-[#1C1A17]">{user.name}</div>
 <div className="text-xs text-[#8C8880]">{user.role}</div>
 </div>
 </button>
 ))
 )}
 </div>
 </div>

 <div className="flex justify-end gap-2 px-4 py-3.5 border-t border-[#E5E2DB] bg-[#FAF6EE]">
 <button onClick={onClose} className="px-4 py-2 text-sm font-medium text-[#5C5850] hover:bg-[#F3F1EC] rounded-lg transition-colors">
 Cancel
 </button>
 <button onClick={handleConfirm} disabled={!selectedUser || submitting} className="flex items-center gap-2 px-4 py-2 text-sm font-semibold text-[#ffffff] bg-[#0D9488] hover:bg-[#0F766E] rounded-lg disabled:opacity-50 transition-colors">
 {submitting && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
 Confirm Reassignment
 </button>
 </div>
 </div>
 </div>
 );
}
