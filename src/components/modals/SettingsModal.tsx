'use client';

import { useState, useEffect } from 'react';
import { X, Filter, ToggleLeft, ToggleRight, ChevronDown, ChevronUp, Plus, Trash2, Loader2, Bell, Monitor, Mail, Smartphone } from 'lucide-react';
import { cn } from '@/lib/utils';
import { RuleWizardModal } from './RuleWizardModal';

// ==========================================
// Types
// ==========================================

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

interface UserPreferences {
    notifications?: {
        email?: boolean;
        sms?: boolean;
    };
    display?: {
        theme?: 'system' | 'light' | 'dark';
        density?: 'comfortable' | 'compact';
    };
}

interface SettingsModalProps {
    isOpen: boolean;
    onClose: () => void;
    signature: string;
    onSignatureChange: (val: string) => void;
    onSaveSignature: () => void;
    currentUserId: string; // Needed for fetching specific user settings if API requires it
}

// ==========================================
// Component
// ==========================================

export function SettingsModal({
    isOpen,
    onClose,
    signature,
    onSignatureChange,
    onSaveSignature,
    currentUserId
}: SettingsModalProps) {
    const [activeTab, setActiveTab] = useState<'general' | 'rules' | 'notifications' | 'display'>('general');

    // Rules State
    const [rules, setRules] = useState<Rule[]>([]);
    const [isLoadingRules, setIsLoadingRules] = useState(false);
    const [expandedRule, setExpandedRule] = useState<string | null>(null);
    const [showWizard, setShowWizard] = useState(false);


    // Preferences State
    const [prefs, setPrefs] = useState<UserPreferences>({});
    const [isLoadingPrefs, setIsLoadingPrefs] = useState(false);

    // Initial Load
    useEffect(() => {
        if (isOpen) {
            fetchRulesData();
            fetchUserPrefs();
        }
    }, [isOpen]);

    // ==========================================
    // Fetchers
    // ==========================================

    const fetchRulesData = async () => {
        setIsLoadingRules(true);
        try {
            const rulesRes = await fetch('/api/messages/rules');
            if (rulesRes.ok) setRules(await rulesRes.json());
        } catch (e) {
            console.error(e);
        } finally {
            setIsLoadingRules(false);
        }
    };

    const fetchUserPrefs = async () => {
        setIsLoadingPrefs(true);
        try {
            const res = await fetch('/api/auth/me'); // Or user endpoint
            if (res.ok) {
                const data = await res.json();
                // Assuming data.user contains preferences/notifications
                const user = data.user;
                // Parse if JSON or use direct object
                const notifications = typeof user.notifications === 'string' ? JSON.parse(user.notifications) : user.notifications || {};
                const display = typeof user.preferences === 'string' ? JSON.parse(user.preferences) : user.preferences || {};

                setPrefs({
                    notifications: notifications,
                    display: display
                });
            }
        } catch (e) {
            console.error(e);
        } finally {
            setIsLoadingPrefs(false);
        }
    };

    // ==========================================
    // Handlers - Rules
    // ==========================================

    const handleToggleRule = async (rule: Rule) => {
        try {
            await fetch(`/api/messages/rules/${rule.id}`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ enabled: !rule.enabled })
            });
            setRules(prev => prev.map(r => r.id === rule.id ? { ...r, enabled: !r.enabled } : r));
        } catch (e) { console.error(e); }
    };

    const handleDeleteRule = async (ruleId: string) => {
        if (!confirm('Delete this rule?')) return;
        try {
            await fetch(`/api/messages/rules/${ruleId}`, { method: 'DELETE' });
            setRules(prev => prev.filter(r => r.id !== ruleId));
        } catch (e) { console.error(e); }
    };

    const handleRuleSaved = async () => {
        // Refresh rules
        fetchRulesData();
        setShowWizard(false);
    };

    // ==========================================
    // Handlers - Preferences
    // ==========================================

    const savePreferences = async (newPrefs: UserPreferences) => {
        setPrefs(newPrefs); // Optimistic update
        try {
            await fetch(`/api/users/${currentUserId}`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    notifications: newPrefs.notifications, // Backend should handle JSON stringify if needed or Prisma does it
                    preferences: newPrefs.display
                })
            });
        } catch (e) {
            console.error('Failed to save prefs', e);
        }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
            <div className="bg-white dark:bg-gray-900 rounded-xl shadow-xl w-full max-w-2xl max-h-[85vh] overflow-hidden flex flex-col border border-gray-200 dark:border-gray-800">
                {/* Header */}
                <div className="p-4 border-b border-gray-200 dark:border-gray-800 flex items-center justify-between">
                    <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Messages Settings</h2>
                    <button onClick={onClose} className="p-1 hover:bg-gray-100 dark:hover:bg-gray-800 rounded text-gray-500">
                        <X className="w-5 h-5" />
                    </button>
                </div>

                {/* Tabs */}
                <div className="flex border-b border-gray-200 dark:border-gray-800">
                    {['general', 'rules', 'notifications', 'display'].map(tab => (
                        <button
                            key={tab}
                            onClick={() => setActiveTab(tab as 'general' | 'rules' | 'notifications' | 'display')}
                            className={cn(
                                "flex-1 py-3 text-sm font-medium border-b-2 transition-colors capitalize",
                                activeTab === tab
                                    ? "border-blue-600 text-blue-600 dark:text-blue-400"
                                    : "border-transparent text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
                            )}
                        >
                            {tab}
                        </button>
                    ))}
                </div>

                {/* Content */}
                <div className="flex-1 overflow-y-auto p-6">

                    {/* GENERAL TAB */}
                    {activeTab === 'general' && (
                        <div className="space-y-6">
                            <div>
                                <h3 className="text-sm font-medium text-gray-900 dark:text-white mb-2">Email Signature</h3>
                                <p className="text-xs text-gray-500 mb-3">
                                    Automatically append this signature to new messages.
                                </p>
                                <textarea
                                    value={signature}
                                    onChange={(e) => onSignatureChange(e.target.value)}
                                    placeholder="Examples:\n\nJane Doe\nSenior Case Manager\nAccommAlly"
                                    className="w-full px-4 py-3 border border-gray-300 dark:border-gray-700 rounded-lg bg-gray-50 dark:bg-gray-800/50 text-sm h-32 resize-none focus:ring-2 focus:ring-blue-500 outline-none"
                                />
                                <div className="mt-3 flex justify-end">
                                    <button
                                        onClick={onSaveSignature}
                                        className="px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 transition-colors"
                                    >
                                        Save Signature
                                    </button>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* RULES TAB */}
                    {activeTab === 'rules' && (
                        <div className="space-y-6">
                            <div className="flex items-center justify-between">
                                <div>
                                    <h3 className="text-sm font-medium text-gray-900 dark:text-white">Inbound Rules</h3>
                                    <p className="text-xs text-gray-500">Automatically organize incoming messages.</p>
                                </div>
                                <button
                                    onClick={() => setShowWizard(true)}
                                    className="text-sm font-medium text-blue-600 hover:text-blue-700 flex items-center gap-1"
                                >
                                    <Plus className="w-4 h-4" /> Add Rule
                                </button>
                            </div>

                            {isLoadingRules ? (
                                <div className="flex justify-center py-8"><Loader2 className="w-6 h-6 animate-spin text-gray-400" /></div>
                            ) : (
                                <div className="space-y-3">
                                    {rules.length === 0 ? (
                                        <p className="text-center text-sm text-gray-500 py-6">No rules defined.</p>
                                    ) : (
                                        rules.map(rule => (
                                            <div key={rule.id} className="border border-gray-200 dark:border-gray-800 rounded-lg overflow-hidden">
                                                <div className="p-3 flex items-center gap-3 bg-white dark:bg-gray-900">
                                                    <button onClick={() => handleToggleRule(rule)} className={rule.enabled ? "text-green-500" : "text-gray-300"}>
                                                        {rule.enabled ? <ToggleRight className="w-5 h-5" /> : <ToggleLeft className="w-5 h-5" />}
                                                    </button>
                                                    <div className="flex-1 min-w-0">
                                                        <div className="flex items-center gap-2">
                                                            <span className={cn("font-medium text-sm", !rule.enabled && "text-gray-400")}>{rule.name}</span>
                                                            <div className="flex gap-1">
                                                                {rule.targetFolders.map(f => (
                                                                    <span key={f.id} className="w-2 h-2 rounded-full" style={{ backgroundColor: f.color }} title={f.name} />
                                                                ))}
                                                            </div>
                                                        </div>
                                                    </div>
                                                    <button onClick={() => setExpandedRule(expandedRule === rule.id ? null : rule.id)} className="text-gray-400 hover:text-gray-600">
                                                        {expandedRule === rule.id ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                                                    </button>
                                                    <button onClick={() => handleDeleteRule(rule.id)} className="text-red-300 hover:text-red-500">
                                                        <Trash2 className="w-4 h-4" />
                                                    </button>
                                                </div>
                                                {expandedRule === rule.id && (
                                                    <div className="px-3 pb-3 bg-gray-50 dark:bg-gray-800/20 text-xs text-gray-500 grid grid-cols-2 gap-2 border-t border-gray-100 dark:border-gray-800">
                                                        <div className="pt-2">Sender: {rule.senderContains || "Any"}</div>
                                                        <div className="pt-2">Subject: {rule.subjectContains || "Any"}</div>
                                                        <div className="pt-2 col-span-2">Folders: {rule.targetFolders.map(f => f.name).join(", ")}</div>
                                                    </div>
                                                )}
                                            </div>
                                        ))
                                    )}
                                </div>
                            )}
                        </div>
                    )}

                    {/* NOTIFICATIONS TAB */}
                    {activeTab === 'notifications' && (
                        <div className="space-y-6">
                            <div>
                                <h3 className="text-sm font-medium text-gray-900 dark:text-white mb-2">Notification Preferences</h3>
                                <div className="bg-white dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-800 divide-y divide-gray-100 dark:divide-gray-800">
                                    <div className="p-4 flex items-center justify-between">
                                        <div className="flex items-center gap-3">
                                            <div className="p-2 bg-blue-100 dark:bg-blue-900/30 rounded-lg text-blue-600 dark:text-blue-400">
                                                <Mail className="w-5 h-5" />
                                            </div>
                                            <div>
                                                <p className="text-sm font-medium text-gray-900 dark:text-white">Email Notifications</p>
                                                <p className="text-xs text-gray-500">Receive emails for new messages</p>
                                            </div>
                                        </div>
                                        <button
                                            onClick={() => savePreferences({ ...prefs, notifications: { ...prefs.notifications, email: !prefs.notifications?.email } })}
                                            className={prefs.notifications?.email ? "text-green-500" : "text-gray-300"}
                                        >
                                            {prefs.notifications?.email ? <ToggleRight className="w-8 h-8" /> : <ToggleLeft className="w-8 h-8" />}
                                        </button>
                                    </div>
                                    <div className="p-4 flex items-center justify-between">
                                        <div className="flex items-center gap-3">
                                            <div className="p-2 bg-purple-100 dark:bg-purple-900/30 rounded-lg text-purple-600 dark:text-purple-400">
                                                <Smartphone className="w-5 h-5" />
                                            </div>
                                            <div>
                                                <p className="text-sm font-medium text-gray-900 dark:text-white">SMS Notifications</p>
                                                <p className="text-xs text-gray-500">Receive text alerts for urgent items</p>
                                            </div>
                                        </div>
                                        <button
                                            onClick={() => savePreferences({ ...prefs, notifications: { ...prefs.notifications, sms: !prefs.notifications?.sms } })}
                                            className={prefs.notifications?.sms ? "text-green-500" : "text-gray-300"}
                                        >
                                            {prefs.notifications?.sms ? <ToggleRight className="w-8 h-8" /> : <ToggleLeft className="w-8 h-8" />}
                                        </button>
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* DISPLAY TAB */}
                    {activeTab === 'display' && (
                        <div className="space-y-6">
                            <div>
                                <h3 className="text-sm font-medium text-gray-900 dark:text-white mb-2">Theme</h3>
                                <div className="grid grid-cols-3 gap-3">
                                    {['system', 'light', 'dark'].map(theme => (
                                        <button
                                            key={theme}
                                            onClick={() => savePreferences({ ...prefs, display: { ...prefs.display, theme: theme as 'system' | 'light' | 'dark' } })}
                                            className={cn(
                                                "p-3 rounded-lg border text-center transition-all",
                                                (prefs.display?.theme || 'system') === theme
                                                    ? "border-blue-500 bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300 ring-1 ring-blue-500"
                                                    : "border-gray-200 dark:border-gray-800 text-gray-600 dark:text-gray-400 hover:border-blue-300"
                                            )}
                                        >
                                            <Monitor className="w-6 h-6 mx-auto mb-2 opacity-80" />
                                            <span className="text-xs font-medium capitalize">{theme}</span>
                                        </button>
                                    ))}
                                </div>
                            </div>

                            <div>
                                <h3 className="text-sm font-medium text-gray-900 dark:text-white mb-2">Message Density</h3>
                                <div className="grid grid-cols-2 gap-3">
                                    {['comfortable', 'compact'].map(density => (
                                        <button
                                            key={density}
                                            onClick={() => savePreferences({ ...prefs, display: { ...prefs.display, density: density as 'comfortable' | 'compact' } })}
                                            className={cn(
                                                "p-3 rounded-lg border text-left transition-all",
                                                (prefs.display?.density || 'comfortable') === density
                                                    ? "border-blue-500 bg-blue-50 dark:bg-blue-900/20 ring-1 ring-blue-500"
                                                    : "border-gray-200 dark:border-gray-800 hover:border-blue-300"
                                            )}
                                        >
                                            <span className="text-sm font-medium text-gray-900 dark:text-white capitalize block">{density}</span>
                                            <span className="text-xs text-gray-500 capitalize block mt-1">
                                                {density === 'comfortable' ? 'More white space' : 'More rows visible'}
                                            </span>
                                        </button>
                                    ))}
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            </div>
            {/* Wizard Modal */}
            <RuleWizardModal
                isOpen={showWizard}
                onClose={() => setShowWizard(false)}
                onSave={handleRuleSaved}
            />
        </div>
    );
}

export default SettingsModal;
