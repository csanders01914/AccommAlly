'use client';

import { useState, useEffect } from 'react';
import { X, Plus, Trash2, Loader2, Filter, ToggleLeft, ToggleRight, ChevronDown, ChevronUp } from 'lucide-react';
import { cn } from '@/lib/utils';

interface Folder {
    id: string;
    name: string;
    color: string;
}

interface Rule {
    id: string;
    name: string;
    enabled: boolean;
    priority: number;
    senderContains?: string | null;
    senderEquals?: string | null;
    subjectContains?: string | null;
    contentContains?: string | null;
    caseNumberContains?: string | null;
    isExternal?: boolean | null;
    hasAttachment?: boolean | null;
    isHighPriority?: boolean | null;
    targetFolders: Folder[];
}

interface ManageRulesModalProps {
    isOpen: boolean;
    onClose: () => void;
}

export function ManageRulesModal({ isOpen, onClose }: ManageRulesModalProps) {
    const [rules, setRules] = useState<Rule[]>([]);
    const [folders, setFolders] = useState<Folder[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [showCreateForm, setShowCreateForm] = useState(false);
    const [expandedRule, setExpandedRule] = useState<string | null>(null);

    // New rule form state
    const [newRule, setNewRule] = useState({
        name: '',
        senderContains: '',
        subjectContains: '',
        contentContains: '',
        caseNumberContains: '',
        isExternal: false,
        targetFolderIds: [] as string[]
    });
    const [isCreating, setIsCreating] = useState(false);
    const [error, setError] = useState('');

    useEffect(() => {
        if (isOpen) {
            fetchData();
        }
    }, [isOpen]);

    const fetchData = async () => {
        setIsLoading(true);
        try {
            const [rulesRes, foldersRes] = await Promise.all([
                fetch('/api/messages/rules'),
                fetch('/api/messages/folders')
            ]);

            if (rulesRes.ok) {
                const data = await rulesRes.json();
                setRules(data);
            }
            if (foldersRes.ok) {
                const data = await foldersRes.json();
                setFolders(data);
            }
        } catch (e) {
            console.error('Error fetching rules:', e);
        } finally {
            setIsLoading(false);
        }
    };

    const handleToggleRule = async (rule: Rule) => {
        try {
            await fetch(`/api/messages/rules/${rule.id}`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ enabled: !rule.enabled })
            });
            setRules(prev => prev.map(r => r.id === rule.id ? { ...r, enabled: !r.enabled } : r));
        } catch (e) {
            console.error('Error toggling rule:', e);
        }
    };

    const handleDeleteRule = async (ruleId: string) => {
        if (!confirm('Delete this rule?')) return;
        try {
            await fetch(`/api/messages/rules/${ruleId}`, { method: 'DELETE' });
            setRules(prev => prev.filter(r => r.id !== ruleId));
        } catch (e) {
            console.error('Error deleting rule:', e);
        }
    };

    const handleCreateRule = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!newRule.name.trim()) {
            setError('Rule name is required');
            return;
        }
        if (newRule.targetFolderIds.length === 0) {
            setError('Select at least one target folder');
            return;
        }

        setIsCreating(true);
        setError('');

        try {
            const res = await fetch('/api/messages/rules', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    name: newRule.name.trim(),
                    senderContains: newRule.senderContains || null,
                    subjectContains: newRule.subjectContains || null,
                    contentContains: newRule.contentContains || null,
                    caseNumberContains: newRule.caseNumberContains || null,
                    isExternal: newRule.isExternal || null,
                    targetFolderIds: newRule.targetFolderIds
                })
            });

            if (!res.ok) {
                const data = await res.json();
                throw new Error(data.error || 'Failed to create rule');
            }

            const createdRule = await res.json();
            setRules(prev => [...prev, createdRule]);
            setNewRule({
                name: '',
                senderContains: '',
                subjectContains: '',
                contentContains: '',
                caseNumberContains: '',
                isExternal: false,
                targetFolderIds: []
            });
            setShowCreateForm(false);
        } catch (err: any) {
            setError(err.message);
        } finally {
            setIsCreating(false);
        }
    };

    const toggleFolder = (folderId: string) => {
        setNewRule(prev => ({
            ...prev,
            targetFolderIds: prev.targetFolderIds.includes(folderId)
                ? prev.targetFolderIds.filter(id => id !== folderId)
                : [...prev.targetFolderIds, folderId]
        }));
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
            <div className="bg-white dark:bg-gray-900 rounded-xl shadow-xl max-w-2xl w-full max-h-[80vh] overflow-hidden border border-gray-200 dark:border-gray-800 flex flex-col">
                <div className="p-4 border-b border-gray-200 dark:border-gray-800 flex items-center justify-between">
                    <h2 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center gap-2">
                        <Filter className="w-5 h-5" />
                        Inbound Rules
                    </h2>
                    <button onClick={onClose} className="text-gray-500 hover:text-gray-700 dark:hover:text-gray-300">
                        <X className="w-5 h-5" />
                    </button>
                </div>

                <div className="flex-1 overflow-y-auto p-4">
                    {isLoading ? (
                        <div className="flex items-center justify-center py-8">
                            <Loader2 className="w-6 h-6 animate-spin text-gray-400" />
                        </div>
                    ) : (
                        <div className="space-y-4">
                            {/* Rules List */}
                            {rules.length === 0 && !showCreateForm && (
                                <div className="text-center py-8 text-gray-500">
                                    <Filter className="w-10 h-10 mx-auto mb-2 opacity-50" />
                                    <p>No rules yet</p>
                                    <p className="text-sm">Create a rule to automatically sort incoming messages</p>
                                </div>
                            )}

                            {rules.map(rule => (
                                <div
                                    key={rule.id}
                                    className={cn(
                                        "border rounded-lg transition-colors",
                                        rule.enabled
                                            ? "border-gray-200 dark:border-gray-700"
                                            : "border-gray-100 dark:border-gray-800 opacity-60"
                                    )}
                                >
                                    <div className="p-3 flex items-center gap-3">
                                        <button
                                            onClick={() => handleToggleRule(rule)}
                                            className={cn(
                                                "transition-colors",
                                                rule.enabled ? "text-green-500" : "text-gray-400"
                                            )}
                                        >
                                            {rule.enabled ? <ToggleRight className="w-6 h-6" /> : <ToggleLeft className="w-6 h-6" />}
                                        </button>
                                        <div className="flex-1">
                                            <p className="font-medium text-gray-900 dark:text-white">{rule.name}</p>
                                            <div className="flex flex-wrap gap-1 mt-1">
                                                {rule.targetFolders.map(f => (
                                                    <span
                                                        key={f.id}
                                                        className="text-xs px-2 py-0.5 rounded-full"
                                                        style={{ backgroundColor: f.color + '20', color: f.color }}
                                                    >
                                                        {f.name}
                                                    </span>
                                                ))}
                                            </div>
                                        </div>
                                        <button
                                            onClick={() => setExpandedRule(expandedRule === rule.id ? null : rule.id)}
                                            className="p-1 text-gray-400 hover:text-gray-600"
                                        >
                                            {expandedRule === rule.id ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                                        </button>
                                        <button
                                            onClick={() => handleDeleteRule(rule.id)}
                                            className="p-1 text-red-400 hover:text-red-600"
                                        >
                                            <Trash2 className="w-4 h-4" />
                                        </button>
                                    </div>
                                    {expandedRule === rule.id && (
                                        <div className="px-3 pb-3 text-sm text-gray-600 dark:text-gray-400 grid grid-cols-2 gap-2">
                                            {rule.senderContains && <div>Sender contains: <span className="font-medium">{rule.senderContains}</span></div>}
                                            {rule.subjectContains && <div>Subject contains: <span className="font-medium">{rule.subjectContains}</span></div>}
                                            {rule.contentContains && <div>Content contains: <span className="font-medium">{rule.contentContains}</span></div>}
                                            {rule.caseNumberContains && <div>Case # contains: <span className="font-medium">{rule.caseNumberContains}</span></div>}
                                            {rule.isExternal && <div>External only: <span className="font-medium">Yes</span></div>}
                                        </div>
                                    )}
                                </div>
                            ))}

                            {/* Create Form */}
                            {showCreateForm && (
                                <form onSubmit={handleCreateRule} className="border border-indigo-200 dark:border-indigo-800 rounded-lg p-4 bg-indigo-50/50 dark:bg-indigo-900/10 space-y-3">
                                    <h3 className="font-medium text-gray-900 dark:text-white">Create New Rule</h3>

                                    {error && (
                                        <div className="p-2 text-sm text-red-600 bg-red-50 dark:bg-red-900/20 rounded">
                                            {error}
                                        </div>
                                    )}

                                    <input
                                        type="text"
                                        placeholder="Rule name"
                                        value={newRule.name}
                                        onChange={e => setNewRule(prev => ({ ...prev, name: e.target.value }))}
                                        className="w-full px-3 py-2 border rounded text-sm dark:bg-gray-800 dark:border-gray-700"
                                    />

                                    <div className="grid grid-cols-2 gap-2">
                                        <input
                                            type="text"
                                            placeholder="Sender contains..."
                                            value={newRule.senderContains}
                                            onChange={e => setNewRule(prev => ({ ...prev, senderContains: e.target.value }))}
                                            className="px-3 py-2 border rounded text-sm dark:bg-gray-800 dark:border-gray-700"
                                        />
                                        <input
                                            type="text"
                                            placeholder="Subject contains..."
                                            value={newRule.subjectContains}
                                            onChange={e => setNewRule(prev => ({ ...prev, subjectContains: e.target.value }))}
                                            className="px-3 py-2 border rounded text-sm dark:bg-gray-800 dark:border-gray-700"
                                        />
                                        <input
                                            type="text"
                                            placeholder="Content contains..."
                                            value={newRule.contentContains}
                                            onChange={e => setNewRule(prev => ({ ...prev, contentContains: e.target.value }))}
                                            className="px-3 py-2 border rounded text-sm dark:bg-gray-800 dark:border-gray-700"
                                        />
                                        <input
                                            type="text"
                                            placeholder="Case number contains..."
                                            value={newRule.caseNumberContains}
                                            onChange={e => setNewRule(prev => ({ ...prev, caseNumberContains: e.target.value }))}
                                            className="px-3 py-2 border rounded text-sm dark:bg-gray-800 dark:border-gray-700"
                                        />
                                    </div>

                                    <label className="flex items-center gap-2 text-sm">
                                        <input
                                            type="checkbox"
                                            checked={newRule.isExternal}
                                            onChange={e => setNewRule(prev => ({ ...prev, isExternal: e.target.checked }))}
                                            className="rounded"
                                        />
                                        <span>External messages only</span>
                                    </label>

                                    <div>
                                        <p className="text-sm font-medium mb-2">Route to folders:</p>
                                        <div className="flex flex-wrap gap-2">
                                            {folders.map(f => (
                                                <button
                                                    key={f.id}
                                                    type="button"
                                                    onClick={() => toggleFolder(f.id)}
                                                    className={cn(
                                                        "px-3 py-1 rounded-full text-sm border transition-colors",
                                                        newRule.targetFolderIds.includes(f.id)
                                                            ? "border-transparent"
                                                            : "border-gray-300 dark:border-gray-700"
                                                    )}
                                                    style={newRule.targetFolderIds.includes(f.id)
                                                        ? { backgroundColor: f.color, color: 'white' }
                                                        : {}
                                                    }
                                                >
                                                    {f.name}
                                                </button>
                                            ))}
                                            {folders.length === 0 && (
                                                <p className="text-sm text-gray-500">Create a folder first</p>
                                            )}
                                        </div>
                                    </div>

                                    <div className="flex justify-end gap-2">
                                        <button
                                            type="button"
                                            onClick={() => setShowCreateForm(false)}
                                            className="px-3 py-1.5 text-sm text-gray-600 hover:bg-gray-100 rounded transition-colors"
                                        >
                                            Cancel
                                        </button>
                                        <button
                                            type="submit"
                                            disabled={isCreating}
                                            className="px-3 py-1.5 text-sm bg-indigo-600 text-white rounded hover:bg-indigo-700 disabled:opacity-50 flex items-center gap-2"
                                        >
                                            {isCreating && <Loader2 className="w-3 h-3 animate-spin" />}
                                            Create Rule
                                        </button>
                                    </div>
                                </form>
                            )}
                        </div>
                    )}
                </div>

                <div className="p-4 border-t border-gray-200 dark:border-gray-800 flex justify-between">
                    {!showCreateForm && (
                        <button
                            onClick={() => setShowCreateForm(true)}
                            className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-indigo-600 hover:bg-indigo-50 dark:hover:bg-indigo-900/20 rounded-lg transition-colors"
                        >
                            <Plus className="w-4 h-4" />
                            Add Rule
                        </button>
                    )}
                    <button
                        onClick={onClose}
                        className="px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100 rounded-lg transition-colors ml-auto"
                    >
                        Done
                    </button>
                </div>
            </div>
        </div>
    );
}
