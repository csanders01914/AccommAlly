'use client';

import { useState, useEffect } from 'react';
import { X, User, Search, Loader2 } from 'lucide-react';

interface UserOption {
    id: string;
    name: string;
    email: string;
    role: string;
}

interface ReassignModalProps {
    isOpen: boolean;
    onClose: () => void;
    onReassign: (userId: string) => Promise<void>;
    currentItemType: string; // 'MESSAGE' | 'TASK' | 'CALL_REQUEST'
    currentItemTitle?: string;
}

export function ReassignModal({
    isOpen,
    onClose,
    onReassign,
    currentItemType,
    currentItemTitle
}: ReassignModalProps) {
    const [users, setUsers] = useState<UserOption[]>([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState('');
    const [selectedUser, setSelectedUser] = useState<string | null>(null);
    const [submitting, setSubmitting] = useState(false);

    useEffect(() => {
        if (isOpen) {
            fetchUsers();
            setSelectedUser(null);
            setSearch('');
        }
    }, [isOpen]);

    const fetchUsers = async () => {
        try {
            const res = await fetch('/api/admin/users');
            if (res.ok) {
                const data = await res.json();
                setUsers(data);
            }
        } catch (error) {
            console.error('Failed to fetch users', error);
        } finally {
            setLoading(false);
        }
    };

    const handleConfirm = async () => {
        if (!selectedUser) return;
        setSubmitting(true);
        try {
            await onReassign(selectedUser);
            onClose();
        } catch (error) {
            console.error(error);
        } finally {
            setSubmitting(false);
        }
    };

    const filteredUsers = users.filter(u =>
        u.name.toLowerCase().includes(search.toLowerCase()) ||
        u.email.toLowerCase().includes(search.toLowerCase())
    );

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4 backdrop-blur-sm">
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-2xl w-full max-w-md overflow-hidden flex flex-col max-h-[80vh]">
                <div className="p-4 border-b border-gray-100 dark:border-gray-700 flex justify-between items-center">
                    <h3 className="font-semibold text-gray-900 dark:text-white">Reassign {currentItemType}</h3>
                    <button onClick={onClose} className="p-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded text-gray-400">
                        <X className="w-5 h-5" />
                    </button>
                </div>

                <div className="p-4 space-y-4 flex-1 overflow-hidden flex flex-col">
                    <div className="text-sm text-gray-500 dark:text-gray-400">
                        Reassigning <span className="font-medium text-gray-900 dark:text-white">"{currentItemTitle}"</span> to:
                    </div>

                    <div className="relative">
                        <Search className="absolute left-3 top-2.5 w-4 h-4 text-gray-400" />
                        <input
                            type="text"
                            placeholder="Search users..."
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            className="w-full pl-9 pr-4 py-2 border border-gray-200 dark:border-gray-700 rounded-lg bg-gray-50 dark:bg-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                    </div>

                    <div className="flex-1 overflow-y-auto space-y-1 border border-gray-100 dark:border-gray-700 rounded-lg p-2">
                        {loading ? (
                            <div className="flex justify-center p-4"><Loader2 className="animate-spin text-blue-600" /></div>
                        ) : (
                            filteredUsers.map(user => (
                                <button
                                    key={user.id}
                                    onClick={() => setSelectedUser(user.id)}
                                    className={`w-full flex items-center gap-3 p-2 rounded-lg text-left transition-colors ${selectedUser === user.id
                                            ? 'bg-blue-50 dark:bg-blue-900/30 border-blue-200 dark:border-blue-800'
                                            : 'hover:bg-gray-50 dark:hover:bg-gray-800'
                                        }`}
                                >
                                    <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold ${selectedUser === user.id ? 'bg-blue-100 text-blue-600' : 'bg-gray-100 dark:bg-gray-700 text-gray-500'
                                        }`}>
                                        {user.name.charAt(0)}
                                    </div>
                                    <div>
                                        <div className="text-sm font-medium text-gray-900 dark:text-white">{user.name}</div>
                                        <div className="text-xs text-gray-500 dark:text-gray-400">{user.role}</div>
                                    </div>
                                </button>
                            ))
                        )}
                    </div>
                </div>

                <div className="p-4 border-t border-gray-100 dark:border-gray-700 bg-gray-50 dark:bg-gray-900 flex justify-end gap-2">
                    <button
                        onClick={onClose}
                        className="px-4 py-2 text-sm font-medium text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg"
                    >
                        Cancel
                    </button>
                    <button
                        onClick={handleConfirm}
                        disabled={!selectedUser || submitting}
                        className="px-4 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-lg disabled:opacity-50 flex items-center gap-2"
                    >
                        {submitting && <Loader2 className="w-3 h-3 animate-spin" />}
                        Confirm Reassignment
                    </button>
                </div>
            </div>
        </div>
    );
}
