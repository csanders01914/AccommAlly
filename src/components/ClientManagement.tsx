'use client';
import { apiFetch } from '@/lib/api-client';

import { useState, useEffect } from 'react';
import { Plus, Users, Search, Loader2, Trash2 } from 'lucide-react';
import { cn } from '@/lib/utils';

export function ClientManagement() {
 const [clients, setClients] = useState<{ id: string; name: string; code: string | null; active: boolean }[]>([]);
 const [isLoading, setIsLoading] = useState(false);
 const [newClientName, setNewClientName] = useState('');
 const [newClientCode, setNewClientCode] = useState('');
 const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

 const fetchClients = async () => {
 setIsLoading(true);
 try {
 const res = await apiFetch('/api/clients');
 if (res.ok) {
 const data = await res.json();
 if (Array.isArray(data)) {
 setClients(data);
 } else {
 setClients([]);
 }
 } else {
 setClients([]);
 }
 } catch (error) {
 console.error(error);
 setClients([]);
 } finally {
 setIsLoading(false);
 }
 };

 useEffect(() => {
 fetchClients();
 }, []);

 const handleAddClient = async (e: React.FormEvent) => {
 e.preventDefault();
 setIsLoading(true);
 try {
 const res = await apiFetch('/api/clients', {
 method: 'POST',
 headers: { 'Content-Type': 'application/json' },
 body: JSON.stringify({ name: newClientName, code: newClientCode })
 });
 if (res.ok) {
 const newClient = await res.json();
 setClients(prev => [...prev, newClient].sort((a, b) => a.name.localeCompare(b.name)));
 setNewClientName('');
 setNewClientCode('');
 setMessage({ type: 'success', text: 'Client added successfully' });
 setTimeout(() => setMessage(null), 3000);
 } else {
 const errData = await res.json().catch(() => ({ error: 'Unknown error' }));
 setMessage({ type: 'error', text: errData.error || 'Failed to add client' });
 }
 } catch (e) {
 setMessage({ type: 'error', text: 'Error adding client' });
 } finally {
 setIsLoading(false);
 }
 };

 const [deletingId, setDeletingId] = useState<string | null>(null);

 const handleDeleteClient = async (id: string) => {
 if (!confirm('Are you sure you want to delete this client?')) return;
 setDeletingId(id);
 try {
 const res = await fetch(`/api/clients?id=${id}`, { method: 'DELETE' });
 if (res.ok) {
 setClients(prev => prev.filter(c => c.id !== id));
 setMessage({ type: 'success', text: 'Client deleted successfully' });
 } else {
 setMessage({ type: 'error', text: 'Failed to delete client' });
 }
 } catch (e) {
 setMessage({ type: 'error', text: 'Error deleting client' });
 } finally {
 setDeletingId(null);
 setTimeout(() => setMessage(null), 3000);
 }
 };

 return (
 <div className="space-y-6">
 <div className="flex items-center justify-between">
 <div>
 <h2 className="text-xl font-semibold text-text-primary">Client Management</h2>
 <p className="text-sm text-text-muted mt-1">Manage the list of clients available for case creation.</p>
 </div>
 </div>

 {/* Add Client Form */}
 <form onSubmit={handleAddClient} className="bg-background p-4 rounded-lg border border-border flex gap-4 items-end">
 <div className="flex-1">
 <label className="block text-[11px] font-semibold uppercase tracking-[0.1em] text-text-muted mb-1.5">
 Client Name
 </label>
 <input
 type="text"
 value={newClientName}
 onChange={(e) => setNewClientName(e.target.value)}
 placeholder="e.g. Acme Corp"
 className="w-full px-3 py-2 border border-border bg-surface text-text-primary placeholder-text-muted rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500/30 focus:border-primary-500 transition-colors"
 required
 />
 </div>
 <div className="w-1/3">
 <label className="block text-[11px] font-semibold uppercase tracking-[0.1em] text-text-muted mb-1.5">
 Code (Optional)
 </label>
 <input
 type="text"
 value={newClientCode}
 onChange={(e) => setNewClientCode(e.target.value)}
 placeholder="e.g. ACME"
 className="w-full px-3 py-2 border border-border bg-surface text-text-primary placeholder-text-muted rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500/30 focus:border-primary-500 transition-colors"
 />
 </div>
 <button
 type="submit"
 disabled={isLoading || !newClientName.trim()}
 className="px-4 py-2 bg-primary-500 text-white rounded-lg hover:bg-primary-600 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 transition-colors"
 >
 {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
 Add Client
 </button>
 </form>

 {message && (
 <div className={cn("p-3 rounded-lg text-sm border", message.type === 'success' ? "bg-green-50 text-green-700 border-green-100" : "bg-red-50 text-red-700 border-red-100")}>
 {message.text}
 </div>
 )}

 {/* Client List */}
 <div className="rounded-lg overflow-hidden border border-border">
 <table className="w-full text-sm text-left">
 <thead className="bg-background border-b border-border">
 <tr>
 <th className="px-4 py-3 text-xs font-semibold text-text-muted uppercase tracking-[0.08em]">Name</th>
 <th className="px-4 py-3 text-xs font-semibold text-text-muted uppercase tracking-[0.08em]">Code</th>
 <th className="px-4 py-3 text-xs font-semibold text-text-muted uppercase tracking-[0.08em] text-right">Status</th>
 <th className="px-4 py-3 text-xs font-semibold text-text-muted uppercase tracking-[0.08em] text-right">Actions</th>
 </tr>
 </thead>
 <tbody className="divide-y divide-[#F3F1EC] bg-surface">
 {clients.length > 0 ? clients.map(client => (
 <tr key={client.id} className="hover:bg-background transition-colors">
 <td className="px-4 py-3 font-medium text-text-primary">{client.name}</td>
 <td className="px-4 py-3 text-text-muted">{client.code || '-'}</td>
 <td className="px-4 py-3 text-right">
 <span className={cn("inline-flex items-center px-2 py-0.5 rounded text-xs font-medium", client.active !== false ? "bg-green-100 text-green-800" : "bg-surface-raised text-text-secondary")}>
 {client.active !== false ? 'Active' : 'Inactive'}
 </span>
 </td>
 <td className="px-4 py-3 text-right">
 <button
 onClick={() => handleDeleteClient(client.id)}
 disabled={deletingId === client.id}
 className="text-red-600 hover:text-red-700 disabled:opacity-50"
 title="Delete Client"
 >
 {deletingId === client.id ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
 </button>
 </td>
 </tr>
 )) : (
 <tr>
 <td colSpan={4} className="px-4 py-8 text-center text-text-muted">No clients found</td>
 </tr>
 )}
 </tbody>
 </table>
 </div>
 </div>
 );
}
