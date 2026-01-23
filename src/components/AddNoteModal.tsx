'use client';

import { useState, useEffect, useRef } from 'react';
import {
    X,
    Upload,
    Plus,
    Phone,
    FileText,
    Calendar,
    ClipboardList,
    MessageSquare,
    UserPlus,
    Clock,
    CheckSquare,
    Shield
} from 'lucide-react';

// ============================================
// TYPES
// ============================================

export type NoteType = 'GENERAL' | 'PHONE_CALL' | 'MEDICAL_UPDATE' | 'DOCUMENTATION' | 'FOLLOW_UP' | 'CLIENT_REQUEST' | 'AUDIT';

export interface AddNoteData {
    content: string;
    noteType: NoteType;
    claimId?: string;
    returnCallDate?: Date;
    setReturnCall?: boolean;
    createTask?: boolean;
    taskDescription?: string;
    taskDueDate?: Date;
    file?: File;
}

interface ClaimOption {
    id: string;
    caseNumber: string;
    description?: string;
}

interface AddNoteModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSubmit: (data: AddNoteData) => void;
    claims?: ClaimOption[];
    coordinatorName?: string;
    userRole?: 'ADMIN' | 'AUDITOR' | 'COORDINATOR';
}

// ============================================
// CONSTANTS
// ============================================

const NOTE_TYPES: { value: NoteType; label: string; icon: typeof MessageSquare }[] = [
    { value: 'GENERAL', label: 'General Note', icon: MessageSquare },
    { value: 'PHONE_CALL', label: 'Phone Call', icon: Phone },
    { value: 'MEDICAL_UPDATE', label: 'Medical Update', icon: FileText },
    { value: 'DOCUMENTATION', label: 'Documentation', icon: ClipboardList },
    { value: 'FOLLOW_UP', label: 'Follow-Up', icon: Calendar },
    { value: 'CLIENT_REQUEST', label: 'Client Request', icon: UserPlus },
];

// ============================================
// COMPONENT
// ============================================

export function AddNoteModal({
    isOpen,
    onClose,
    onSubmit,
    claims = [],
    coordinatorName = 'Coordinator',
    userRole,
}: AddNoteModalProps) {
    const [content, setContent] = useState('');
    const [noteType, setNoteType] = useState<NoteType>('GENERAL');
    const [selectedClaimId, setSelectedClaimId] = useState<string>('');
    const [showReturnCall, setShowReturnCall] = useState(false);
    const [returnCallDate, setReturnCallDate] = useState('');
    const [returnCallTime, setReturnCallTime] = useState('');
    const [showCreateTask, setShowCreateTask] = useState(false);
    const [taskDescription, setTaskDescription] = useState('');
    const [taskDueDate, setTaskDueDate] = useState('');
    const [selectedFile, setSelectedFile] = useState<File | null>(null);

    const modalRef = useRef<HTMLDivElement>(null);
    const textareaRef = useRef<HTMLTextAreaElement>(null);

    // Reset form when modal opens
    useEffect(() => {
        if (isOpen) {
            setContent('');
            setNoteType('GENERAL');
            // Auto-select the claim if there's only one (we're already in that case)
            setSelectedClaimId(claims.length === 1 ? claims[0].id : '');
            setShowReturnCall(false);
            setReturnCallDate('');
            setReturnCallTime('');
            setShowCreateTask(false);
            setTaskDescription('');
            setTaskDueDate('');
            setSelectedFile(null);

            // Focus textarea after modal opens
            setTimeout(() => textareaRef.current?.focus(), 100);
        }
    }, [isOpen, claims]);

    // Handle Escape key
    useEffect(() => {
        const handleEscape = (e: KeyboardEvent) => {
            if (e.key === 'Escape' && isOpen) {
                onClose();
            }
        };
        document.addEventListener('keydown', handleEscape);
        return () => document.removeEventListener('keydown', handleEscape);
    }, [isOpen, onClose]);

    // Handle click outside
    const handleBackdropClick = (e: React.MouseEvent) => {
        if (e.target === e.currentTarget) {
            onClose();
        }
    };

    const handleSubmit = () => {
        if (!content.trim()) return;

        const data: AddNoteData = {
            content: content.trim(),
            noteType,
            claimId: selectedClaimId || undefined,
            file: selectedFile || undefined,
        };

        // Add return call if set
        if (showReturnCall && returnCallDate) {
            const dateTime = returnCallTime
                ? new Date(`${returnCallDate}T${returnCallTime}`)
                : new Date(returnCallDate);
            data.returnCallDate = dateTime;
        }

        // Add task if set
        if (showCreateTask && taskDescription.trim()) {
            data.createTask = true;
            data.taskDescription = taskDescription.trim();
            data.taskDueDate = taskDueDate ? new Date(taskDueDate) : undefined;
        }

        onSubmit(data);
        onClose();
    };

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            setSelectedFile(file);
        }
    };

    const clearFile = () => {
        setSelectedFile(null);
    };

    if (!isOpen) return null;

    return (
        <div
            className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4"
            onClick={handleBackdropClick}
        >
            <div
                ref={modalRef}
                className="bg-white dark:bg-gray-900 rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-hidden flex flex-col"
                role="dialog"
                aria-modal="true"
                aria-labelledby="modal-title"
            >
                {/* Header */}
                <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 dark:border-gray-700">
                    <h2 id="modal-title" className="text-xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
                        <Plus className="w-5 h-5 text-blue-600" />
                        Add Note
                    </h2>
                    <button
                        onClick={onClose}
                        className="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors"
                        aria-label="Close modal"
                    >
                        <X className="w-5 h-5" />
                    </button>
                </div>

                {/* Body */}
                <div className="flex-1 overflow-y-auto p-6 space-y-6">
                    {/* Note Type & Claim Selection Row */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {/* Note Type */}
                        <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                Note Type
                            </label>
                            <select
                                value={noteType}
                                onChange={(e) => setNoteType(e.target.value as NoteType)}
                                className={`w-full px-4 py-2.5 border rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:outline-none focus:ring-2 ${noteType === 'AUDIT' ? 'border-amber-400 focus:ring-amber-500' : 'border-gray-300 dark:border-gray-600 focus:ring-blue-500'}`}
                            >
                                {NOTE_TYPES.map((type) => (
                                    <option key={type.value} value={type.value}>
                                        {type.label}
                                    </option>
                                ))}
                                {/* AUDIT note type - only for ADMIN and AUDITOR */}
                                {(userRole === 'ADMIN' || userRole === 'AUDITOR') && (
                                    <option value="AUDIT" className="text-amber-600">
                                        🛡️ Audit Note
                                    </option>
                                )}
                            </select>
                            {noteType === 'AUDIT' && (
                                <p className="mt-1 text-xs text-amber-600 dark:text-amber-400 flex items-center gap-1">
                                    <Shield className="w-3 h-3" />
                                    Audit notes are only visible to Admins and Auditors
                                </p>
                            )}
                        </div>

                        {/* Claim Number Selection */}
                        {claims.length > 0 && (
                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                    Claim Number
                                </label>
                                <select
                                    value={selectedClaimId}
                                    onChange={(e) => setSelectedClaimId(e.target.value)}
                                    className="w-full px-4 py-2.5 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                                >
                                    <option value="">All claims (general)</option>
                                    {claims.map((claim) => (
                                        <option key={claim.id} value={claim.id}>
                                            {claim.caseNumber}
                                            {claim.description ? ` - ${claim.description}` : ''}
                                        </option>
                                    ))}
                                </select>
                            </div>
                        )}
                    </div>

                    {/* Note Content */}
                    <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                            Note Content <span className="text-red-500">*</span>
                        </label>
                        <textarea
                            ref={textareaRef}
                            value={content}
                            onChange={(e) => setContent(e.target.value)}
                            placeholder="Enter note details..."
                            rows={5}
                            className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                        />
                    </div>

                    {/* File Attachment */}
                    <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                            Attach Document
                        </label>
                        {selectedFile ? (
                            <div className="flex items-center gap-3 p-3 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg">
                                <FileText className="w-5 h-5 text-blue-600" />
                                <span className="flex-1 text-sm text-gray-700 dark:text-gray-300 truncate">
                                    {selectedFile.name}
                                </span>
                                <button
                                    onClick={clearFile}
                                    className="p-1 text-gray-400 hover:text-red-500 rounded"
                                >
                                    <X className="w-4 h-4" />
                                </button>
                            </div>
                        ) : (
                            <label className="flex items-center gap-2 px-4 py-3 border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-lg cursor-pointer hover:border-blue-400 dark:hover:border-blue-500 transition-colors">
                                <input
                                    type="file"
                                    onChange={handleFileChange}
                                    className="hidden"
                                />
                                <Upload className="w-5 h-5 text-gray-400" />
                                <span className="text-sm text-gray-600 dark:text-gray-400">
                                    Click to upload (DCN auto-assigned)
                                </span>
                            </label>
                        )}
                    </div>

                    {/* Optional Actions */}
                    <div className="space-y-4 pt-2 border-t border-gray-200 dark:border-gray-700">
                        {/* Return Call Toggle */}
                        <div>
                            <label className="flex items-center gap-3 cursor-pointer">
                                <input
                                    type="checkbox"
                                    checked={showReturnCall}
                                    onChange={(e) => setShowReturnCall(e.target.checked)}
                                    className="w-5 h-5 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                                />
                                <div className="flex items-center gap-2">
                                    <Phone className="w-4 h-4 text-amber-500" />
                                    <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                                        Set Return Call
                                    </span>
                                </div>
                            </label>
                            {showReturnCall && (
                                <div className="mt-3 ml-8 grid grid-cols-2 gap-3">
                                    <div>
                                        <label className="block text-xs text-gray-500 mb-1">Date</label>
                                        <input
                                            type="date"
                                            value={returnCallDate}
                                            onChange={(e) => setReturnCallDate(e.target.value)}
                                            className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-xs text-gray-500 mb-1">Time (optional)</label>
                                        <input
                                            type="time"
                                            value={returnCallTime}
                                            onChange={(e) => setReturnCallTime(e.target.value)}
                                            className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                                        />
                                    </div>
                                </div>
                            )}
                        </div>

                        {/* Create Task Toggle */}
                        <div>
                            <label className="flex items-center gap-3 cursor-pointer">
                                <input
                                    type="checkbox"
                                    checked={showCreateTask}
                                    onChange={(e) => setShowCreateTask(e.target.checked)}
                                    className="w-5 h-5 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                                />
                                <div className="flex items-center gap-2">
                                    <CheckSquare className="w-4 h-4 text-emerald-500" />
                                    <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                                        Create Task for {coordinatorName}
                                    </span>
                                </div>
                            </label>
                            {showCreateTask && (
                                <div className="mt-3 ml-8 space-y-3">
                                    <div>
                                        <label className="block text-xs text-gray-500 mb-1">Task Description</label>
                                        <input
                                            type="text"
                                            value={taskDescription}
                                            onChange={(e) => setTaskDescription(e.target.value)}
                                            placeholder="Describe the task..."
                                            className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
                                        />
                                    </div>
                                    <div className="w-1/2">
                                        <label className="block text-xs text-gray-500 mb-1">Due Date (optional)</label>
                                        <input
                                            type="date"
                                            value={taskDueDate}
                                            onChange={(e) => setTaskDueDate(e.target.value)}
                                            className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                                        />
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                </div>

                {/* Footer */}
                <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50">
                    <button
                        onClick={onClose}
                        className="px-4 py-2.5 text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                    >
                        Cancel
                    </button>
                    <button
                        onClick={handleSubmit}
                        disabled={!content.trim()}
                        className="flex items-center gap-2 px-5 py-2.5 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                    >
                        <Plus className="w-4 h-4" />
                        Add Note
                    </button>
                </div>
            </div>
        </div>
    );
}

export default AddNoteModal;
