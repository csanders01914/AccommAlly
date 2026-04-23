'use client';
import { apiFetch } from '@/lib/api-client';

import { useState, useEffect } from 'react';
import { X, ToggleLeft, ToggleRight, ChevronDown, ChevronUp, Plus, Trash2, Loader2, Mail, Smartphone, Monitor } from 'lucide-react';
import { cn } from '@/lib/utils';
import { RuleWizardModal } from './RuleWizardModal';

interface Folder { id: string; name: string; color: string; }

interface Rule {
 id: string;
 name: string;
 enabled: boolean;
 priority: number;
 senderContains?: string | null;
 subjectContains?: string | null;
 targetFolders: Folder[];
}

interface UserPreferences {
 notifications?: { email?: boolean; sms?: boolean; };
 display?: { theme?: 'system' | 'light' | 'dark'; density?: 'comfortable' | 'compact'; };
}

interface SettingsModalProps {
 isOpen: boolean;
 onClose: () => void;
 signature: string;
 onSignatureChange: (val: string) => void;
 onSaveSignature: () => void;
 currentUserId: string;
}

const TABS = ['general', 'rules', 'notifications', 'display'] as const;
type Tab = typeof TABS[number];

export function SettingsModal({ isOpen, onClose, signature, onSignatureChange, onSaveSignature, currentUserId }: SettingsModalProps) {
 const [activeTab, setActiveTab] = useState<Tab>('general');
 const [rules, setRules] = useState<Rule[]>([]);
 const [isLoadingRules, setIsLoadingRules] = useState(false);
 const [expandedRule, setExpandedRule] = useState<string | null>(null);
 const [showWizard, setShowWizard] = useState(false);
 const [prefs, setPrefs] = useState<UserPreferences>({});

 useEffect(() => {
 if (isOpen) { fetchRulesData(); fetchUserPrefs(); }
 }, [isOpen]);

 const fetchRulesData = async () => {
 setIsLoadingRules(true);
 try {
 const res = await apiFetch('/api/messages/rules');
 if (res.ok) setRules(await res.json());
 } catch (e) { console.error(e); }
 finally { setIsLoadingRules(false); }
 };

 const fetchUserPrefs = async () => {
 try {
 const res = await apiFetch('/api/auth/me');
 if (res.ok) {
 const data = await res.json();
 const user = data.user;
 const notifications = typeof user.notifications === 'string' ? JSON.parse(user.notifications) : user.notifications || {};
 const display = typeof user.preferences === 'string' ? JSON.parse(user.preferences) : user.preferences || {};
 setPrefs({ notifications, display });
 }
 } catch (e) { console.error(e); }
 };

 const handleToggleRule = async (rule: Rule) => {
 try {
 await fetch(`/api/messages/rules/${rule.id}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ enabled: !rule.enabled }) });
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

 const savePreferences = async (newPrefs: UserPreferences) => {
 setPrefs(newPrefs);
 try {
 await fetch(`/api/users/${currentUserId}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ notifications: newPrefs.notifications, preferences: newPrefs.display }) });
 } catch (e) { console.error('Failed to save prefs', e); }
 };

 if (!isOpen) return null;

 return (
 <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
 <div className="bg-[#ffffff] rounded-xl shadow-[0_8px_40px_rgba(28,26,23,0.18)] border border-[#E5E2DB] w-full max-w-2xl max-h-[85vh] overflow-hidden flex flex-col">
 <div className="flex items-center justify-between px-6 py-4 border-b border-[#E5E2DB]">
 <h2 className="text-base font-semibold text-[#1C1A17]">Messages Settings</h2>
 <button onClick={onClose} className="p-1.5 hover:bg-[#F3F1EC] rounded-lg transition-colors">
 <X className="w-4 h-4 text-[#8C8880]" />
 </button>
 </div>

 <div className="flex border-b border-[#E5E2DB]">
 {TABS.map(tab => (
 <button key={tab} onClick={() => setActiveTab(tab)}
 className={cn('flex-1 py-3 text-sm font-medium border-b-2 transition-colors capitalize',
 activeTab === tab
 ? 'border-[#0D9488] text-[#0D9488]'
 : 'border-transparent text-[#8C8880] hover:text-[#5C5850]'
 )}>
 {tab}
 </button>
 ))}
 </div>

 <div className="flex-1 overflow-y-auto p-6">
 {activeTab === 'general' && (
 <div className="space-y-4">
 <div>
 <p className="text-sm font-semibold text-[#1C1A17] mb-1">Email Signature</p>
 <p className="text-xs text-[#8C8880] mb-3">Automatically append this signature to new messages.</p>
 <textarea
 value={signature}
 onChange={e => onSignatureChange(e.target.value)}
 placeholder={"Jane Doe\nSenior Case Manager\nAccommAlly"}
 className="w-full px-3 py-2.5 text-sm border border-[#E5E2DB] rounded-lg bg-[#FAF6EE] text-[#1C1A17] placeholder-[#8C8880] h-32 resize-none focus:outline-none focus:ring-2 focus:ring-[#0D9488]/30 focus:border-[#0D9488] transition-colors"
 />
 <div className="mt-3 flex justify-end">
 <button onClick={onSaveSignature} className="px-4 py-2 text-sm font-semibold text-[#ffffff] bg-[#0D9488] hover:bg-[#0F766E] rounded-lg transition-colors">
 Save Signature
 </button>
 </div>
 </div>
 </div>
 )}

 {activeTab === 'rules' && (
 <div className="space-y-5">
 <div className="flex items-center justify-between">
 <div>
 <p className="text-sm font-semibold text-[#1C1A17]">Inbound Rules</p>
 <p className="text-xs text-[#8C8880]">Automatically organize incoming messages.</p>
 </div>
 <button onClick={() => setShowWizard(true)} className="flex items-center gap-1.5 text-sm font-semibold text-[#0D9488] hover:text-[#0F766E] transition-colors">
 <Plus className="w-4 h-4" /> Add Rule
 </button>
 </div>

 {isLoadingRules ? (
 <div className="flex justify-center py-8"><Loader2 className="w-6 h-6 animate-spin text-[#0D9488]" /></div>
 ) : rules.length === 0 ? (
 <div className="text-center py-8 bg-[#FAF6EE] rounded-xl border border-dashed border-[#E5E2DB]">
 <p className="text-sm text-[#8C8880]">No rules defined.</p>
 </div>
 ) : (
 <div className="space-y-2">
 {rules.map(rule => (
 <div key={rule.id} className="border border-[#E5E2DB] rounded-lg overflow-hidden">
 <div className="p-3 flex items-center gap-3 bg-[#ffffff]">
 <button onClick={() => handleToggleRule(rule)} className={rule.enabled ? 'text-[#0D9488]' : 'text-[#C8C4BB]'}>
 {rule.enabled ? <ToggleRight className="w-5 h-5" /> : <ToggleLeft className="w-5 h-5" />}
 </button>
 <div className="flex-1 min-w-0">
 <div className="flex items-center gap-2">
 <span className={cn('font-medium text-sm text-[#1C1A17]', !rule.enabled && 'text-[#8C8880]')}>{rule.name}</span>
 <div className="flex gap-1">
 {rule.targetFolders.map(f => (
 <span key={f.id} className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: f.color }} title={f.name} />
 ))}
 </div>
 </div>
 </div>
 <button onClick={() => setExpandedRule(expandedRule === rule.id ? null : rule.id)} className="text-[#8C8880] hover:text-[#5C5850] transition-colors">
 {expandedRule === rule.id ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
 </button>
 <button onClick={() => handleDeleteRule(rule.id)} className="text-[#C8C4BB] hover:text-red-500 transition-colors">
 <Trash2 className="w-4 h-4" />
 </button>
 </div>
 {expandedRule === rule.id && (
 <div className="px-3 pb-3 bg-[#FAF6EE] text-xs text-[#8C8880] grid grid-cols-2 gap-2 border-t border-[#E5E2DB]">
 <div className="pt-2">Sender: {rule.senderContains || 'Any'}</div>
 <div className="pt-2">Subject: {rule.subjectContains || 'Any'}</div>
 <div className="pt-2 col-span-2">Folders: {rule.targetFolders.map(f => f.name).join(', ') || 'None'}</div>
 </div>
 )}
 </div>
 ))}
 </div>
 )}
 </div>
 )}

 {activeTab === 'notifications' && (
 <div className="space-y-4">
 <p className="text-sm font-semibold text-[#1C1A17]">Notification Preferences</p>
 <div className="bg-[#ffffff] rounded-lg border border-[#E5E2DB] divide-y divide-[#F3F1EC]">
 <div className="p-4 flex items-center justify-between">
 <div className="flex items-center gap-3">
 <div className="w-9 h-9 rounded-lg bg-[#F3F1EC] flex items-center justify-center">
 <Mail className="w-4 h-4 text-[#5C5850]" />
 </div>
 <div>
 <p className="text-sm font-medium text-[#1C1A17]">Email Notifications</p>
 <p className="text-xs text-[#8C8880]">Receive emails for new messages</p>
 </div>
 </div>
 <button onClick={() => savePreferences({ ...prefs, notifications: { ...prefs.notifications, email: !prefs.notifications?.email } })}
 className={prefs.notifications?.email ? 'text-[#0D9488]' : 'text-[#C8C4BB]'}>
 {prefs.notifications?.email ? <ToggleRight className="w-8 h-8" /> : <ToggleLeft className="w-8 h-8" />}
 </button>
 </div>
 <div className="p-4 flex items-center justify-between">
 <div className="flex items-center gap-3">
 <div className="w-9 h-9 rounded-lg bg-[#F3F1EC] flex items-center justify-center">
 <Smartphone className="w-4 h-4 text-[#5C5850]" />
 </div>
 <div>
 <p className="text-sm font-medium text-[#1C1A17]">SMS Notifications</p>
 <p className="text-xs text-[#8C8880]">Receive text alerts for urgent items</p>
 </div>
 </div>
 <button onClick={() => savePreferences({ ...prefs, notifications: { ...prefs.notifications, sms: !prefs.notifications?.sms } })}
 className={prefs.notifications?.sms ? 'text-[#0D9488]' : 'text-[#C8C4BB]'}>
 {prefs.notifications?.sms ? <ToggleRight className="w-8 h-8" /> : <ToggleLeft className="w-8 h-8" />}
 </button>
 </div>
 </div>
 </div>
 )}

 {activeTab === 'display' && (
 <div className="space-y-6">
 <div>
 <p className="text-sm font-semibold text-[#1C1A17] mb-3">Theme</p>
 <div className="grid grid-cols-3 gap-3">
 {(['system', 'light', 'dark'] as const).map(theme => (
 <button key={theme} onClick={() => savePreferences({ ...prefs, display: { ...prefs.display, theme } })}
 className={cn('p-3 rounded-lg border text-center transition-all',
 (prefs.display?.theme || 'system') === theme
 ? 'border-[#0D9488]/40 bg-[#0D9488]/8 text-[#0D9488]'
 : 'border-[#E5E2DB] text-[#5C5850] hover:border-[#0D9488]/30 hover:bg-[#FAF6EE]'
 )}>
 <Monitor className="w-6 h-6 mx-auto mb-2 opacity-70" />
 <span className="text-xs font-medium capitalize">{theme}</span>
 </button>
 ))}
 </div>
 </div>
 <div>
 <p className="text-sm font-semibold text-[#1C1A17] mb-3">Message Density</p>
 <div className="grid grid-cols-2 gap-3">
 {(['comfortable', 'compact'] as const).map(density => (
 <button key={density} onClick={() => savePreferences({ ...prefs, display: { ...prefs.display, density } })}
 className={cn('p-3 rounded-lg border text-left transition-all',
 (prefs.display?.density || 'comfortable') === density
 ? 'border-[#0D9488]/40 bg-[#0D9488]/8'
 : 'border-[#E5E2DB] hover:border-[#0D9488]/30 hover:bg-[#FAF6EE]'
 )}>
 <span className="text-sm font-medium text-[#1C1A17] capitalize block">{density}</span>
 <span className="text-xs text-[#8C8880] block mt-0.5">
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

 <RuleWizardModal isOpen={showWizard} onClose={() => setShowWizard(false)} onSave={() => { fetchRulesData(); setShowWizard(false); }} />
 </div>
 );
}

export default SettingsModal;
