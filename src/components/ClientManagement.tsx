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
                    <h2 className="text-xl font-semibold text-gray-900 dark:text-white">Client Management</h2>
                    <p className="text-sm text-gray-500 mt-1">Manage the list of clients available for case creation.</p>
                </div>
            </div>

            {/* Add Client Form */}
            <form onSubmit={handleAddClient} className="bg-gray-50 dark:bg-gray-800/50 p-4 rounded-lg border border-gray-200 dark:border-gray-700 flex gap-4 items-end">
                <div className="flex-1">
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                        Client Name
                    </label>
                    <input
                        type="text"
                        value={newClientName}
                        onChange={(e) => setNewClientName(e.target.value)}
                        placeholder="e.g. Acme Corp"
                        className="w-full px-3 py-2 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                        required
                    />
                </div>
                <div className="w-1/3">
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                        Code (Optional)
                    </label>
                    <input
                        type="text"
                        value={newClientCode}
                        onChange={(e) => setNewClientCode(e.target.value)}
                        placeholder="e.g. ACME"
                        className="w-full px-3 py-2 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                </div>
                <button
                    type="submit"
                    disabled={isLoading || !newClientName.trim()}
                    className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                >
                    {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
                    Add Client
                </button>
            </form>

            {message && (
                <div className={cn("p-3 rounded-md text-sm", message.type === 'success' ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700")}>
                    {message.text}
                </div>
            )}

            {/* Client List */}
            <div className="border rounded-lg overflow-hidden border-gray-200 dark:border-gray-700">
                <table className="w-full text-sm text-left">
                    <thead className="bg-gray-50 dark:bg-gray-800 text-gray-500 font-medium border-b border-gray-200 dark:border-gray-700">
                        <tr>
                            <th className="px-4 py-3">Name</th>
                            <th className="px-4 py-3">Code</th>
                            <th className="px-4 py-3 text-right">Status</th>
                            <th className="px-4 py-3 text-right">Actions</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200 dark:divide-gray-700 bg-white dark:bg-gray-900">
                        {clients.length > 0 ? clients.map(client => (
                            <tr key={client.id}>
                                <td className="px-4 py-3 font-medium text-gray-900 dark:text-white">{client.name}</td>
                                <td className="px-4 py-3 text-gray-500">{client.code || '-'}</td>
                                <td className="px-4 py-3 text-right">
                                    <span className={cn("inline-flex items-center px-2 py-0.5 rounded text-xs font-medium", client.active !== false ? "bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-300" : "bg-gray-100 text-gray-800")}>
                                        {client.active !== false ? 'Active' : 'Inactive'}
                                    </span>
                                </td>
                                <td className="px-4 py-3 text-right">
                                    <button
                                        onClick={() => handleDeleteClient(client.id)}
                                        disabled={deletingId === client.id}
                                        className="text-red-600 hover:text-red-900 dark:text-red-400 dark:hover:text-red-300 disabled:opacity-50"
                                        title="Delete Client"
                                    >
                                        {deletingId === client.id ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
                                    </button>
                                </td>
                            </tr>
                        )) : (
                            <tr>
                                <td colSpan={4} className="px-4 py-8 text-center text-gray-500">No clients found</td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>
        </div>
    );
}
