'use client';
import { apiFetch } from '@/lib/api-client';

import { useState } from 'react';
import { Loader2, X, Eye, EyeOff } from 'lucide-react';

interface CreateUserModalProps {
 isOpen: boolean;
 onClose: () => void;
 onSuccess: () => void;
}

const labelCls = 'form-label';
const inputCls = 'form-input';

export function CreateUserModal({ isOpen, onClose, onSuccess }: CreateUserModalProps) {
 const [formData, setFormData] = useState({ name: '', email: '', password: '', role: 'COORDINATOR' });
 const [showPassword, setShowPassword] = useState(false);
 const [loading, setLoading] = useState(false);
 const [error, setError] = useState<string | null>(null);

 if (!isOpen) return null;

 const handleSubmit = async (e: React.FormEvent) => {
 e.preventDefault();
 setLoading(true); setError(null);
 try {
 const res = await apiFetch('/api/admin/users', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(formData) });
 if (!res.ok) { const data = await res.json(); throw new Error(data.error || 'Failed to create user'); }
 onSuccess(); onClose();
 setFormData({ name: '', email: '', password: '', role: 'COORDINATOR' });
 } catch (err: any) { setError(err.message); }
 finally { setLoading(false); }
 };

 return (
 <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
 <div className="modal-container w-full max-w-md overflow-hidden">
 <div className="flex items-center justify-between px-6 py-4 border-b border-border bg-background">
 <h2 className="text-base font-semibold text-text-primary">Create New User</h2>
 <button onClick={onClose} className="p-1.5 hover:bg-surface-raised rounded-lg transition-colors">
 <X className="w-4 h-4 text-text-muted" />
 </button>
 </div>

 <form onSubmit={handleSubmit} className="p-6 space-y-4">
 {error && <div className="p-3 bg-red-50 border border-red-200 text-red-600 text-sm rounded-lg">{error}</div>}
 <div>
 <label className={labelCls}>Full Name</label>
 <input type="text" required value={formData.name} onChange={e => setFormData({ ...formData, name: e.target.value })} className={inputCls} />
 </div>
 <div>
 <label className={labelCls}>Email</label>
 <input type="email" required value={formData.email} onChange={e => setFormData({ ...formData, email: e.target.value })} className={inputCls} />
 </div>
 <div>
 <label className={labelCls}>Role</label>
 <select value={formData.role} onChange={e => setFormData({ ...formData, role: e.target.value })} className={inputCls}>
 <option value="COORDINATOR">Coordinator</option>
 <option value="ADMIN">Admin</option>
 </select>
 </div>
 <div>
 <label className={labelCls}>Temporary Password</label>
 <div className="relative">
 <input type={showPassword ? 'text' : 'password'} required minLength={6} value={formData.password} onChange={e => setFormData({ ...formData, password: e.target.value })} className={`${inputCls} pr-10`} />
 <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 text-text-muted hover:text-text-primary transition-colors">
 {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
 </button>
 </div>
 </div>
 <div className="pt-4 flex justify-end gap-3">
 <button type="button" onClick={onClose} className="px-4 py-2 text-sm font-medium text-text-secondary hover:bg-surface-raised rounded-lg transition-colors">
 Cancel
 </button>
 <button type="submit" disabled={loading} className="flex items-center gap-2 px-4 py-2 text-sm font-semibold text-white bg-primary-500 hover:bg-primary-600 rounded-lg disabled:opacity-50 transition-colors">
 {loading && <Loader2 className="w-4 h-4 animate-spin" />}
 Create User
 </button>
 </div>
 </form>
 </div>
 </div>
 );
}
