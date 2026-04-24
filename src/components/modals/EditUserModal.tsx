import { useState, useEffect } from 'react';
import { Loader2, X, Save } from 'lucide-react';

interface EditUserModalProps {
 isOpen: boolean;
 onClose: () => void;
 onSuccess: () => void;
 user: { id: string; name: string; email: string; role: 'ADMIN' | 'AUDITOR' | 'COORDINATOR'; } | null;
}

const labelCls = 'form-label';
const inputCls = 'form-input';

export function EditUserModal({ isOpen, onClose, onSuccess, user }: EditUserModalProps) {
 const [name, setName] = useState('');
 const [email, setEmail] = useState('');
 const [role, setRole] = useState<'ADMIN' | 'AUDITOR' | 'COORDINATOR'>('COORDINATOR');
 const [isLoading, setIsLoading] = useState(false);
 const [error, setError] = useState('');

 useEffect(() => {
 if (user) { setName(user.name); setEmail(user.email); setRole(user.role); }
 }, [user]);

 if (!isOpen || !user) return null;

 const handleSubmit = async (e: React.FormEvent) => {
 e.preventDefault();
 setError(''); setIsLoading(true);
 try {
 const res = await fetch(`/api/admin/users/${user.id}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ name, email, role }) });
 if (!res.ok) { const data = await res.json(); throw new Error(data.error || 'Failed to update user'); }
 onSuccess(); onClose();
 } catch (err: any) { setError(err.message); }
 finally { setIsLoading(false); }
 };

 return (
 <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
 <div className="modal-container max-w-md w-full overflow-hidden">
 <div className="flex items-center justify-between px-6 py-4 border-b border-border">
 <h2 className="text-base font-semibold text-text-primary">Edit User</h2>
 <button onClick={onClose} className="p-1.5 hover:bg-surface-raised rounded-lg transition-colors">
 <X className="w-4 h-4 text-text-muted" />
 </button>
 </div>

 <form onSubmit={handleSubmit} className="p-6 space-y-4">
 {error && <div className="p-3 text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg">{error}</div>}
 <div>
 <label className={labelCls}>Full Name</label>
 <input type="text" value={name} onChange={(e) => setName(e.target.value)} className={inputCls} required />
 </div>
 <div>
 <label className={labelCls}>Email</label>
 <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} className={inputCls} required />
 </div>
 <div>
 <label className={labelCls}>Role</label>
 <select value={role} onChange={(e) => setRole(e.target.value as any)} className={inputCls}>
 <option value="COORDINATOR">Coordinator</option>
 <option value="AUDITOR">Auditor</option>
 <option value="ADMIN">Admin</option>
 </select>
 </div>
 <div className="flex justify-end gap-3 pt-2">
 <button type="button" onClick={onClose} className="px-4 py-2 text-sm font-medium text-text-secondary hover:bg-surface-raised rounded-lg transition-colors">
 Cancel
 </button>
 <button type="submit" disabled={isLoading} className="flex items-center gap-2 px-4 py-2 text-sm font-semibold text-white bg-primary-500 hover:bg-primary-600 rounded-lg transition-colors disabled:opacity-50">
 {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
 Save Changes
 </button>
 </div>
 </form>
 </div>
 </div>
 );
}
