'use client';

import { useState, useEffect } from 'react';
import { X, ChevronRight, ChevronLeft, Check, Folder, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';

// ==========================================
// Types
// ==========================================

interface Folder {
    id: string;
    name: string;
    color: string;
}

interface RuleWizardModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSave: () => void;
}

type Step = 1 | 2 | 3;

interface RuleState {
    name: string;
    senderContains: string;
    subjectContains: string;
    contentContains: string;
    targetFolderIds: string[];
    actionKeepInInbox: boolean;
    actionMarkAsRead: boolean;
    actionStar: boolean;

    // UI selection states (checkboxes)
    checkedSender: boolean;
    checkedSubject: boolean;
    checkedBody: boolean;
    checkedMove: boolean;
    checkedCopy: boolean;
    checkedRead: boolean;
    checkedStar: boolean;
    checkedEmail: boolean;
    checkedSMS: boolean;
}

// ==========================================
// Component
// ==========================================

export function RuleWizardModal({ isOpen, onClose, onSave }: RuleWizardModalProps) {
    const [step, setStep] = useState<Step>(1);
    const [folders, setFolders] = useState<Folder[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [isSaving, setIsSaving] = useState(false);
    const [error, setError] = useState('');

    // Rule State
    const [rule, setRule] = useState<RuleState>({
        name: '',
        senderContains: '',
        subjectContains: '',
        contentContains: '',
        targetFolderIds: [],
        actionKeepInInbox: false,
        actionMarkAsRead: false,
        actionStar: false,

        checkedSender: false,
        checkedSubject: false,
        checkedBody: false,
        checkedMove: false,
        checkedCopy: false,
        checkedRead: false,
        checkedStar: false,
        checkedEmail: false,
        checkedSMS: false,
    });

    // Editor Popover State
    const [editMode, setEditMode] = useState<{
        field: keyof RuleState;
        type: 'text' | 'folder';
        label: string;
    } | null>(null);
    const [editValue, setEditValue] = useState('');

    useEffect(() => {
        if (isOpen) {
            setStep(1);
            fetchFolders();
            // Reset rule
            setRule({
                name: '',
                senderContains: '',
                subjectContains: '',
                contentContains: '',
                targetFolderIds: [],
                actionKeepInInbox: false,
                actionMarkAsRead: false,
                actionStar: false,
                checkedSender: false,
                checkedSubject: false,
                checkedBody: false,
                checkedMove: false,
                checkedCopy: false,
                checkedRead: false,
                checkedStar: false,
                checkedEmail: false,
                checkedSMS: false,
            });
        }
    }, [isOpen]);

    const fetchFolders = async () => {
        try {
            const res = await fetch('/api/messages/folders');
            if (res.ok) setFolders(await res.json());
        } catch (e) { console.error(e); }
    };

    const handleSave = async () => {
        if (!rule.name) {
            setError('Please specify a name for this rule.');
            return;
        }
        if (rule.targetFolderIds.length === 0 && (rule.checkedMove || rule.checkedCopy)) {
            setError('Please select a folder.');
            return;
        }

        setIsSaving(true);
        setError('');

        try {
            await fetch('/api/messages/rules', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    name: rule.name,
                    senderContains: rule.checkedSender ? rule.senderContains : undefined,
                    subjectContains: rule.checkedSubject ? rule.subjectContains : undefined,
                    contentContains: rule.checkedBody ? rule.contentContains : undefined,
                    targetFolderIds: (rule.checkedMove || rule.checkedCopy) ? rule.targetFolderIds : [],
                    actionKeepInInbox: rule.checkedCopy, // Copy = Keep In Inbox
                    actionMarkAsRead: rule.checkedRead,
                    actionStar: rule.checkedStar,
                    actionSendEmailNotification: rule.checkedEmail,
                    actionSendSMSNotification: rule.checkedSMS,
                })
            });
            onSave();
            onClose();
        } catch (e) {
            setError('Failed to save rule.');
        } finally {
            setIsSaving(false);
        }
    };

    // Helper to render interactive links
    const Link = ({ label, field, type, value }: { label: string, field: keyof RuleState, type: 'text' | 'folder', value?: string | string[] }) => {
        const display = type === 'folder'
            ? (rule.targetFolderIds.length > 0 ? folders.filter(f => rule.targetFolderIds.includes(f.id)).map(f => f.name).join(', ') : label)
            : (value ? `"${value}"` : label);

        return (
            <button
                onClick={() => {
                    setEditMode({ field, type, label });
                    if (type === 'text') setEditValue(rule[field] as string);
                }}
                className="text-blue-600 underline hover:text-blue-800 mx-1"
            >
                {display}
            </button>
        );
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
            <div className="bg-white dark:bg-gray-900 rounded-lg shadow-xl w-full max-w-2xl h-[600px] flex flex-col border border-gray-200 dark:border-gray-800 relative">

                {/* Header */}
                <div className="p-4 border-b border-gray-200 dark:border-gray-800 flex items-center justify-between">
                    <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Rules Wizard</h2>
                    <button onClick={onClose}><X className="w-5 h-5 text-gray-500" /></button>
                </div>

                {/* Main Content Area */}
                <div className="flex-1 flex flex-col min-h-0">

                    {/* Top Pane: Selection List */}
                    <div className="flex-1 overflow-y-auto p-4 border-b border-gray-200 dark:border-gray-800 bg-gray-50 dark:bg-gray-800/20">
                        {step === 1 && (
                            <div className="space-y-1">
                                <p className="text-sm font-medium mb-3 text-gray-700 dark:text-gray-300">Step 1: Select condition(s)</p>
                                <Checkbox label="from [people or public group]" checked={rule.checkedSender} onChange={c => setRule({ ...rule, checkedSender: c })} />
                                <Checkbox label="with [specific words] in the subject" checked={rule.checkedSubject} onChange={c => setRule({ ...rule, checkedSubject: c })} />
                                <Checkbox label="with [specific words] in the body" checked={rule.checkedBody} onChange={c => setRule({ ...rule, checkedBody: c })} />
                            </div>
                        )}
                        {step === 2 && (
                            <div className="space-y-1">
                                <p className="text-sm font-medium mb-3 text-gray-700 dark:text-gray-300">Step 2: Select action(s)</p>
                                <Checkbox
                                    label="move it to the [specified folder]"
                                    checked={rule.checkedMove}
                                    onChange={c => setRule({ ...rule, checkedMove: c, checkedCopy: c ? false : rule.checkedCopy })}
                                />
                                <Checkbox
                                    label="copy it to the [specified folder]"
                                    checked={rule.checkedCopy}
                                    onChange={c => setRule({ ...rule, checkedCopy: c, checkedMove: c ? false : rule.checkedMove })}
                                />
                                <Checkbox label="mark it as [read]" checked={rule.checkedRead} onChange={c => setRule({ ...rule, checkedRead: c })} />
                                <Checkbox label="mark it as [starred]" checked={rule.checkedStar} onChange={c => setRule({ ...rule, checkedStar: c })} />
                                <Checkbox label="send an email notification" checked={rule.checkedEmail} onChange={c => setRule({ ...rule, checkedEmail: c })} />
                                <Checkbox label="send a text message (SMS)" checked={rule.checkedSMS} onChange={c => setRule({ ...rule, checkedSMS: c })} />
                            </div>
                        )}
                        {step === 3 && (
                            <div className="space-y-4">
                                <p className="text-sm font-medium mb-1 text-gray-700 dark:text-gray-300">Step 3: Finish rule setup</p>
                                <div>
                                    <label className="block text-sm text-gray-600 mb-1">Specify a name for this rule:</label>
                                    <input
                                        type="text"
                                        value={rule.name}
                                        onChange={e => setRule({ ...rule, name: e.target.value })}
                                        className="w-full px-3 py-2 border rounded-md text-sm dark:bg-gray-800 dark:border-gray-700"
                                        placeholder="e.g. Project Updates"
                                    />
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Bottom Pane: Description Builder */}
                    <div className="h-40 p-4 bg-white dark:bg-gray-900 overflow-y-auto">
                        <p className="text-sm font-medium mb-2 text-gray-700 dark:text-gray-300">Rule Description (click an underlined value to edit):</p>
                        <div className="p-3 border border-gray-200 dark:border-gray-800 rounded-md text-sm text-gray-600 dark:text-gray-300 leading-relaxed bg-white">
                            Apply this rule after the message arrives

                            {/* Conditions */}
                            {rule.checkedSender && <><br />&nbsp;&nbsp;from <Link label="people or public group" field="senderContains" type="text" value={rule.senderContains} /></>}
                            {rule.checkedSubject && <><br />&nbsp;&nbsp;with <Link label="specific words" field="subjectContains" type="text" value={rule.subjectContains} /> in the subject</>}
                            {rule.checkedBody && <><br />&nbsp;&nbsp;with <Link label="specific words" field="contentContains" type="text" value={rule.contentContains} /> in the body</>}

                            {/* Actions */}
                            {(rule.checkedMove || rule.checkedCopy) && <><br />&nbsp;&nbsp;{rule.checkedMove ? 'move' : 'copy'} it to the <Link label="specified folder" field="targetFolderIds" type="folder" /></>}
                            {rule.checkedRead && <><br />&nbsp;&nbsp;mark it as read</>}
                            {rule.checkedStar && <><br />&nbsp;&nbsp;mark it as starred</>}
                            {rule.checkedEmail && <><br />&nbsp;&nbsp;send an email notification</>}
                            {rule.checkedSMS && <><br />&nbsp;&nbsp;send a text message</>}
                        </div>
                    </div>

                </div>

                {/* Footer Controls */}
                <div className="p-4 border-t border-gray-200 dark:border-gray-800 flex justify-between items-center bg-gray-50 dark:bg-gray-900">
                    <button className="text-sm text-gray-500 hover:text-gray-700">Cancel</button>
                    <div className="flex gap-2">
                        <button
                            disabled={step === 1}
                            onClick={() => setStep(s => Math.max(1, s - 1) as Step)}
                            className="px-4 py-2 text-sm border bg-white dark:bg-gray-800 rounded disabled:opacity-50"
                        >
                            &lt; Back
                        </button>
                        {step < 3 ? (
                            <button
                                onClick={() => setStep(s => Math.min(3, s + 1) as Step)}
                                className="px-4 py-2 text-sm bg-blue-600 text-white rounded hover:bg-blue-700"
                            >
                                Next &gt;
                            </button>
                        ) : (
                            <button
                                onClick={handleSave}
                                disabled={isSaving}
                                className="px-4 py-2 text-sm bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50 flex items-center gap-2"
                            >
                                {isSaving && <Loader2 className="w-3 h-3 animate-spin" />} Finish
                            </button>
                        )}
                    </div>
                </div>

                {/* Editor Popover/Modal */}
                {editMode && (
                    <div className="absolute inset-0 z-50 flex items-center justify-center bg-black/20 backdrop-blur-[1px]">
                        <div className="bg-white dark:bg-gray-800 p-4 rounded-lg shadow-2xl border border-gray-200 dark:border-gray-700 w-80">
                            <h3 className="text-sm font-semibold mb-3">{editMode.label}</h3>

                            {editMode.type === 'text' && (
                                <input
                                    autoFocus
                                    value={editValue}
                                    onChange={e => setEditValue(e.target.value)}
                                    className="w-full px-3 py-2 border rounded text-sm mb-3 dark:bg-gray-900 dark:border-gray-600"
                                />
                            )}

                            {editMode.type === 'folder' && (
                                <div className="space-y-1 mb-3 max-h-40 overflow-y-auto">
                                    {folders.map(f => (
                                        <label key={f.id} className="flex items-center gap-2 px-2 py-1.5 hover:bg-gray-100 dark:hover:bg-gray-700 rounded cursor-pointer text-sm">
                                            <input
                                                type="checkbox"
                                                checked={rule.targetFolderIds.includes(f.id)}
                                                onChange={e => {
                                                    const newIds = e.target.checked
                                                        ? [...rule.targetFolderIds, f.id]
                                                        : rule.targetFolderIds.filter(id => id !== f.id);
                                                    setRule({ ...rule, targetFolderIds: newIds });
                                                }}
                                            />
                                            {f.name}
                                        </label>
                                    ))}
                                    {folders.length === 0 && <p className="text-xs text-gray-500">No folders found.</p>}
                                </div>
                            )}

                            <div className="flex justify-end gap-2">
                                <button onClick={() => setEditMode(null)} className="px-3 py-1 text-xs text-gray-500">Cancel</button>
                                <button
                                    onClick={() => {
                                        if (editMode.type === 'text') setRule({ ...rule, [editMode.field]: editValue });
                                        setEditMode(null);
                                    }}
                                    className="px-3 py-1 text-xs bg-blue-600 text-white rounded"
                                >
                                    OK
                                </button>
                            </div>
                        </div>
                    </div>
                )}

            </div>
        </div>
    );
}

function Checkbox({ label, checked, onChange }: { label: string, checked: boolean, onChange: (c: boolean) => void }) {
    return (
        <label className="flex items-start gap-2 px-2 py-1 hover:bg-blue-50 dark:hover:bg-blue-900/10 rounded cursor-pointer leading-tight">
            <input type="checkbox" checked={checked} onChange={e => onChange(e.target.checked)} className="mt-0.5" />
            <span className="text-sm text-gray-700 dark:text-gray-300">{label}</span>
        </label>
    );
}
