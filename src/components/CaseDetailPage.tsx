'use client';

import { useState, useEffect, useRef } from 'react';
import {
    Phone,
    Mail,
    MapPin,
    Calendar,
    Clock,
    FileText,
    CheckSquare,
    AlertTriangle,
    Plus,
    Upload,
    Download,
    Eye,
    Copy,
    Edit3,
    MoreHorizontal,
    Search,
    User,
    ArrowLeft,
    Send,
    Edit2,
    BookUser,
    Paperclip,
    FolderOpen,
    EyeOff,
    X,
    Trash2,
    Shield,
    Link as LinkIcon,
    Table,
    File,
    ChevronDown
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { User as UserType, Case, Note, Task, Document } from '@prisma/client';
import { AddNoteData } from './AddNoteModal';
import AddNoteModal from './AddNoteModal';
import GenerateDecisionModal from './GenerateDecisionModal';
import { TimelineView } from './TimelineView';
import { DecisioningTab } from './case/DecisioningTab';
import dynamic from 'next/dynamic';
const DocumentViewer = dynamic(() => import('./DocumentViewer'), { ssr: false });
import { DownloadOptionsModal } from './DownloadOptionsModal';
import { AddAccommodationModal, AddAccommodationData } from './AddAccommodationModal';
import { AddTaskModal, AddTaskData } from './AddTaskModal';
import { TransferCaseModal } from './TransferCaseModal';
import { TaskDetailModal } from './TaskDetailModal';
import PortalMessagesSection from './PortalMessagesSection';
import { EditCaseModal, EditCaseData } from './EditCaseModal';
import { AddContactModal, AddContactData } from './AddContactModal';
import { CaseTasksTable } from './CaseTasksTable';
import EditNoteModal from './EditNoteModal';
import LinkClaimsModal from './LinkClaimsModal';

// Local Types
interface Contact {
    id: string;
    name: string;
    role: string;
    email: string;
    phone: string;
    type: string;
    address?: string;
    notes?: string;
}

// Extended Types
type ExtendedNote = Note & {
    author: { name: string | null };
    attachedDocument?: {
        id: string;
        fileName: string;
        fileType: string;
        documentControlNumber: string;
    } | null;
};

type ExtendedTask = Task & {
    assignee: { id?: string; name: string | null };
    createdBy?: { id?: string; name: string | null };
};

type ExtendedDocument = Document & {
    uploadedBy: { name: string | null };
};

type ExtendedCase = Case & {
    tasks: ExtendedTask[];
    notes: ExtendedNote[];
    documents: ExtendedDocument[];
    contacts: Contact[];
    accommodations: any[]; // Placeholder for relation
    medicalCondition?: string | null;
    preferredStartDate?: string | null;
    claimant?: { id: string; claimantNumber: string };
    claimFamily?: { id: string; name: string | null };
};


interface CaseDetailPageProps {
    caseId: string;
    currentUser: UserType;
    initialData?: ExtendedCase;
    onRefresh?: () => void;
    onAddNote?: (data: AddNoteData) => Promise<void>;
    onAddAccommodation?: (data: AddAccommodationData) => Promise<void>;
    onUpdateContact?: (contactId: string, data: Partial<Contact>) => Promise<void>;
    onBack?: () => void;
}

export function CaseDetailPage({
    caseId,
    currentUser,
    initialData,
    onRefresh,
    onAddNote,
    onAddAccommodation,
    onUpdateContact,
    onBack
}: CaseDetailPageProps) {
    const [activeTab, setActiveTab] = useState('dashboard');
    const [caseData, setCaseData] = useState<ExtendedCase | null>(initialData || null);
    const [isLoading, setIsLoading] = useState(!initialData);
    const [error, setError] = useState<string | null>(null);

    // Modal States
    const [isAddNoteModalOpen, setIsAddNoteModalOpen] = useState(false);
    const [isEditModalOpen, setIsEditModalOpen] = useState(false);
    const [isDecisionModalOpen, setIsDecisionModalOpen] = useState(false);
    const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);
    const [isDownloadModalOpen, setIsDownloadModalOpen] = useState(false);
    const [documentToDownload, setDocumentToDownload] = useState<ExtendedDocument | null>(null);
    const [viewingDocument, setViewingDocument] = useState<ExtendedDocument | null>(null);
    const [isAddAccommodationModalOpen, setIsAddAccommodationModalOpen] = useState(false);
    const [isAddTaskModalOpen, setIsAddTaskModalOpen] = useState(false);
    const [isTransferModalOpen, setIsTransferModalOpen] = useState(false);
    const [selectedTask, setSelectedTask] = useState<ExtendedTask | null>(null);
    const [users, setUsers] = useState<{ id: string; name: string; role: string }[]>([]);
    const [showCompletedTasks, setShowCompletedTasks] = useState(false);
    const [userMenuOpen, setUserMenuOpen] = useState(false);
    const [isAddContactModalOpen, setIsAddContactModalOpen] = useState(false);
    const [noteMenuOpen, setNoteMenuOpen] = useState<string | null>(null);

    const [isEditNoteModalOpen, setIsEditNoteModalOpen] = useState(false);
    const [isLinkClaimsModalOpen, setIsLinkClaimsModalOpen] = useState(false);
    const [isExportMenuOpen, setIsExportMenuOpen] = useState(false);

    // Upload State
    const [isUploading, setIsUploading] = useState(false);
    const [uploadError, setUploadError] = useState<string | null>(null);

    const [uploadCategory, setUploadCategory] = useState<string>('OTHER');
    const fileInputRef = useRef<HTMLInputElement>(null);
    const tabsRef = useRef<(HTMLButtonElement | null)[]>([]);

    const handleTabKeyDown = (e: React.KeyboardEvent, index: number) => {
        if (e.key === 'ArrowRight') {
            e.preventDefault();
            const nextIndex = (index + 1) % 7; // 7 tabs
            tabsRef.current[nextIndex]?.focus();
            const newTab = tabsRef.current[nextIndex]?.dataset.tabid || 'dashboard';
            setActiveTab(newTab);
            localStorage.setItem('caseActiveTab', newTab);
        } else if (e.key === 'ArrowLeft') {
            e.preventDefault();
            const nextIndex = (index - 1 + 7) % 7;
            tabsRef.current[nextIndex]?.focus();
            const newTab = tabsRef.current[nextIndex]?.dataset.tabid || 'dashboard';
            setActiveTab(newTab);
            localStorage.setItem('caseActiveTab', newTab);
        }
    };

    useEffect(() => {
        const savedTab = localStorage.getItem('caseActiveTab');
        if (savedTab) {
            setActiveTab(savedTab);
        }
    }, []);


    const fetchUsers = async () => {
        try {
            const res = await fetch('/api/users');
            if (res.ok) {
                const data = await res.json();
                setUsers(data);
            }
        } catch (e) {
            console.error('Failed to fetch users', e);
        }
    };

    const fetchCaseData = async () => {
        try {
            setIsLoading(true);
            const response = await fetch(`/api/cases/${caseId}`);
            if (!response.ok) throw new Error('Failed to fetch case data');
            const data = await response.json();
            setCaseData(data);
        } catch (err) {
            setError(err instanceof Error ? err.message : 'An error occurred');
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        if (!initialData) {
            fetchCaseData();
        } else {
            setCaseData(initialData);
        }
        fetchUsers();
    }, [caseId, initialData]);

    const handleUploadDocument = async (file: File) => {
        if (!file) return;

        setIsUploading(true);
        setUploadError(null);

        try {
            const formData = new FormData();
            formData.append('file', file);
            formData.append('caseId', caseId);
            formData.append('category', uploadCategory);

            const response = await fetch('/api/documents/upload', {
                method: 'POST',
                body: formData,
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.error || 'Upload failed');
            }

            // Refresh data
            await fetchCaseData();
            setIsUploadModalOpen(false);
            if (onRefresh) onRefresh();

        } catch (err) {
            setUploadError(err instanceof Error ? err.message : 'Upload failed');
        } finally {
            setIsUploading(false);
        }
    };

    const handleDownloadDocument = (docId: string, fileName: string, fileType: string) => {
        const doc = caseData?.documents.find((d: ExtendedDocument) => d.id === docId);
        if (doc) {
            setDocumentToDownload(doc);
            setIsDownloadModalOpen(true);
        }
    };

    const executeDownload = async (docId: string, fileName: string, withAnnotations: boolean) => {
        try {
            const url = `/api/documents/${docId}/download?annotations=${withAnnotations}`;

            const link = document.createElement('a');
            link.href = url;
            link.download = fileName;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);

            setIsDownloadModalOpen(false);
            setDocumentToDownload(null);
        } catch (err) {
            console.error('Download failed', err);
            alert('Failed to download document');
        }
    };

    const handleEditCase = async (data: EditCaseData) => {
        try {
            const res = await fetch(`/api/cases/${caseId}`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(data)
            });

            if (!res.ok) throw new Error('Failed to update case');

            await fetchCaseData();
            setIsEditModalOpen(false);
        } catch (error) {
            console.error('Failed to update case', error);
            alert('Failed to update case');
        }
    };

    const handleSubmitNote = async (data: AddNoteData) => {
        if (onAddNote) {
            await onAddNote(data);
            setIsAddNoteModalOpen(false);
        }
    };

    const handleAddTask = async (data: AddTaskData) => {
        try {
            const res = await fetch('/api/tasks', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ ...data, caseId }),
            });

            if (!res.ok) throw new Error('Failed to create task');

            await fetchCaseData(); // Refresh data
            setIsAddTaskModalOpen(false);
        } catch (err) {
            console.error(err);
            alert('Failed to add task');
        }
    };

    const handleTransferCase = async (newOwnerId: string) => {
        try {
            const res = await fetch(`/api/cases/${caseId}/transfer`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ newOwnerId }),
            });

            if (!res.ok) throw new Error('Failed to transfer case');

            await fetchCaseData(); // Refresh data
            setIsTransferModalOpen(false);
            alert('Case transferred successfully');
        } catch (err) {
            console.error(err);
            alert('Failed to transfer case');
        }
    };

    const handleTaskStatusChange = async (taskId: string, status: string) => {
        try {
            const res = await fetch(`/api/tasks/${taskId}`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ status })
            });
            if (res.ok) {
                await fetchCaseData();
            }
        } catch (error) {
            console.error('Failed to update task status', error);
        }
    };

    const handleTaskReassign = async (taskId: string, userId: string) => {
        try {
            const res = await fetch(`/api/tasks/${taskId}`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ assignedToId: userId })
            });
            if (res.ok) {
                await fetchCaseData();
            } else {
                alert('Failed to reassign task');
            }
        } catch (error) {
            console.error('Failed to reassign task', error);
        }
    };

    const handleTaskDelete = async (taskId: string) => {
        if (!confirm('Are you sure you want to delete this task?')) return;
        try {
            const res = await fetch(`/api/tasks/${taskId}`, { method: 'DELETE' });
            if (res.ok) {
                setSelectedTask(null);
                await fetchCaseData();
            }
        } catch (error) { console.error('Failed to delete task', error); }
    };

    const handleAddContact = async (data: AddContactData) => {
        try {
            const res = await fetch(`/api/cases/${caseId}/contacts`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(data),
            });

            if (!res.ok) throw new Error('Failed to create contact');

            await fetchCaseData();
            setIsAddContactModalOpen(false);
        } catch (err) {
            console.error(err);
            alert('Failed to add contact');
        }
    };

    // Check if a note can be edited (within 24 hours)
    const isNoteEditable = (createdAt: Date | string) => {
        const created = new Date(createdAt);
        const now = new Date();
        const hoursDiff = (now.getTime() - created.getTime()) / (1000 * 60 * 60);
        return hoursDiff <= 24;
    };

    const handleCopyNote = async (content: string) => {
        try {
            await navigator.clipboard.writeText(content);
            // Could add a toast notification here
        } catch (err) {
            console.error('Failed to copy:', err);
        }
        setNoteMenuOpen(null);
    };

    const [editingNote, setEditingNote] = useState<ExtendedNote | null>(null);
    const [editNoteContent, setEditNoteContent] = useState('');

    const handleEditNote = (note: ExtendedNote) => {
        if (!isNoteEditable(note.createdAt)) {
            alert('Notes can only be edited within 24 hours of creation.');
            return;
        }
        setEditingNote(note);
        setIsEditNoteModalOpen(true);
        setNoteMenuOpen(null);
    };

    const handleSaveEditNote = async (data: { id: string, content: string }) => {
        try {
            const res = await fetch(`/api/notes/${data.id}`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ content: data.content })
            });
            if (res.ok) {
                await fetchCaseData();
            } else {
                const errorData = await res.json();
                alert(errorData.error || 'Failed to update note');
            }
        } catch (err) {
            console.error('Error updating note:', err);
            alert('Failed to update note');
        }
    };

    const handleExport = async (type: 'PDF' | 'WORD' | 'EXCEL') => {
        setIsExportMenuOpen(false);
        try {
            // Fetch timeline data
            const res = await fetch(`/api/cases/${caseId}/timeline`);
            if (!res.ok) throw new Error('Failed to fetch timeline data');
            const data = await res.json();
            const events = data.timeline;

            const { exportToPDF, exportToExcel, exportToWord } = await import('@/lib/exportUtils');

            if (type === 'PDF') {
                exportToPDF(events, caseData!.caseNumber);
            } else if (type === 'EXCEL') {
                exportToExcel(events, caseData!.caseNumber);
            } else if (type === 'WORD') {
                await exportToWord(events, caseData!.caseNumber);
            }
        } catch (err) {
            console.error('Export failed', err);
            alert('Failed to export timeline');
        }
    };

    if (isLoading) {
        return (
            <div className="flex items-center justify-center min-h-[400px]">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
            </div>
        );
    }

    if (error || !caseData) {
        return (
            <div className="flex flex-col items-center justify-center min-h-[400px] text-gray-500">
                <AlertTriangle className="w-12 h-12 mb-4 text-red-500" />
                <p className="text-lg font-medium">{error || 'Case not found'}</p>
                <button
                    onClick={fetchCaseData}
                    className="mt-4 px-4 py-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                >
                    Try Again
                </button>
            </div>
        );
    }

    // Helper functions
    const getStatusColor = (status: string) => {
        switch (status) {
            case 'REVIEW': return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400';
            case 'ACTIVE': return 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400';
            case 'CLOSED': return 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-400';
            case 'APPEAL': return 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400';
            default: return 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400';
        }
    };

    const isOverdue = (task: Task) => {
        return new Date(task.dueDate) < new Date() && task.status !== 'COMPLETED';
    };

    const taskStatusColors = {
        PENDING: 'text-yellow-600 bg-yellow-50 dark:text-yellow-400 dark:bg-yellow-900/10',
        IN_PROGRESS: 'text-blue-600 bg-blue-50 dark:text-blue-400 dark:bg-blue-900/10',
        COMPLETED: 'text-green-600 bg-green-50 dark:text-green-400 dark:bg-green-900/10',
        CANCELLED: 'text-gray-600 bg-gray-50 dark:text-gray-400 dark:bg-gray-800/50',
    };

    const priorityColors = {
        HIGH: 'text-red-600 bg-red-50 border-red-100 dark:text-red-400 dark:bg-red-900/10 dark:border-red-900/20',
        MEDIUM: 'text-yellow-600 bg-yellow-50 border-yellow-100 dark:text-yellow-400 dark:bg-yellow-900/10 dark:border-yellow-900/20',
        LOW: 'text-green-600 bg-green-50 border-green-100 dark:text-green-400 dark:bg-green-900/10 dark:border-green-900/20',
    };

    const documentCategoryColors = {
        MEDICAL: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-400',
        LEGAL: 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-400',
        HR: 'bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-400',
        CORRESPONDENCE: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400',
        OTHER: 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-400',
    };

    const contactTypeColors = {
        CLAIMANT: 'bg-indigo-100 text-indigo-800 dark:bg-indigo-900/30 dark:text-indigo-400',
        ATTORNEY: 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-400',
        MEDICAL_PROVIDER: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-400',
        EMPLOYER: 'bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-400',
        OTHER: 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-400',
    };

    const isAdmin = currentUser.role === 'ADMIN';
    const isAuditor = (currentUser.role as string) === 'AUDITOR';
    const canViewAuditNotes = isAdmin || isAuditor;
    const now = new Date();

    // Filter notes - hide AUDIT notes from non-Admin/Auditor users
    const visibleNotes = caseData.notes.filter((note: ExtendedNote) => {
        if (note.noteType === 'AUDIT') {
            return canViewAuditNotes;
        }
        return true;
    });

    const formatDate = (date: Date | string | undefined | null) => {
        if (!date) return 'N/A';
        try {
            return new Intl.DateTimeFormat('en-US', {
                month: 'short',
                day: 'numeric',
                year: 'numeric',
            }).format(new Date(date));
        } catch (e) {
            return 'Invalid Date';
        }
    };

    const formatDateTime = (date: Date | string | undefined | null) => {
        if (!date) return 'N/A';
        try {
            return new Intl.DateTimeFormat('en-US', {
                month: 'short',
                day: 'numeric',
                year: 'numeric',
                hour: 'numeric',
                minute: '2-digit',
            }).format(new Date(date));
        } catch (e) {
            return 'Invalid Date';
        }
    };

    const formatFileSize = (bytes: number) => {
        if (bytes === 0) return '0 B';
        const k = 1024;
        const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    };

    return (
        <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
            {/* Header / Ribbon */}
            <div className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 shadow-sm sticky top-0 z-30">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    {/* Top Row: Back, Title, Actions */}
                    <div className="flex items-center justify-between h-16">
                        <div className="flex items-center gap-4">
                            <button
                                onClick={onBack}
                                className="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
                                aria-label="Go Back"
                            >
                                <ArrowLeft className="w-5 h-5" />
                            </button>
                            <div>
                                <h1 className="text-xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
                                    <span className="text-gray-400">#</span>
                                    {caseData.caseNumber}
                                    <span className={`px-2 py-0.5 text-xs rounded-full ${getStatusColor(caseData.status)}`}>
                                        {caseData.status}
                                    </span>
                                    {isAdmin && (
                                        <button
                                            onClick={() => setIsTransferModalOpen(true)}
                                            className="ml-2 text-xs text-blue-600 hover:underline"
                                        >
                                            Transfer Case
                                        </button>
                                    )}
                                </h1>
                                <p className="text-xs text-gray-500">
                                    Created {formatDate(caseData.createdAt)}
                                </p>
                            </div>
                        </div>

                        <div className="flex items-center gap-3">
                            <button
                                onClick={() => setIsAddNoteModalOpen(true)}
                                className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-lg shadow-sm transition-all hover:shadow-md"
                            >
                                <Plus className="w-4 h-4" />
                                Add Note
                            </button>
                            <button
                                onClick={() => setIsUploadModalOpen(true)}
                                className="p-2 text-gray-500 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/30 rounded-lg transition-colors border border-gray-200 dark:border-gray-700"
                                title="Upload Document"
                                aria-label="Upload Document"
                            >
                                <Upload className="w-5 h-5" />
                            </button>
                            <div className="relative">
                                <button
                                    onClick={() => setUserMenuOpen(!userMenuOpen)}
                                    className="p-2 text-gray-500 hover:text-gray-700 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors border border-gray-200 dark:border-gray-700"
                                    aria-label="More Options"
                                    aria-haspopup="true"
                                    aria-expanded={userMenuOpen}
                                >
                                    <MoreHorizontal className="w-5 h-5" />
                                </button>

                                {userMenuOpen && (
                                    <>
                                        <div
                                            className="fixed inset-0 z-40"
                                            onClick={() => setUserMenuOpen(false)}
                                        />
                                        <div className="absolute right-0 mt-2 w-56 bg-white dark:bg-gray-800 rounded-lg shadow-lg ring-1 ring-black ring-opacity-5 z-50 py-1">
                                            <button
                                                onClick={() => {
                                                    setIsDecisionModalOpen(true);
                                                    setUserMenuOpen(false);
                                                }}
                                                className="w-full text-left px-4 py-2 text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700 flex items-center gap-2"
                                            >
                                                <FileText className="w-4 h-4" />
                                                Generate Decision
                                            </button>

                                            {/* Edit Case Action */}
                                            <button
                                                onClick={() => {
                                                    setIsEditModalOpen(true);
                                                    setUserMenuOpen(false);
                                                }}
                                                className="w-full text-left px-4 py-2 text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700 flex items-center gap-2"
                                            >
                                                <Edit2 className="w-4 h-4" />
                                                Edit Case Details
                                            </button>

                                            {(isAdmin || isAuditor) && (
                                                <div className="border-t border-gray-100 dark:border-gray-700 my-1 pt-1">
                                                    <button
                                                        onClick={async () => {
                                                            if (confirm('Are you sure you want to delete this case? This action cannot be undone.')) {
                                                                try {
                                                                    const res = await fetch(`/api/cases/${caseId}`, { method: 'DELETE' });
                                                                    if (res.ok) {
                                                                        alert('Case deleted successfully');
                                                                        if (onBack) onBack();
                                                                    } else {
                                                                        const data = await res.json();
                                                                        alert(data.error || 'Failed to delete case');
                                                                    }
                                                                } catch (err) {
                                                                    console.error(err);
                                                                    alert('Failed to delete case');
                                                                }
                                                            }
                                                            setUserMenuOpen(false);
                                                        }}
                                                        className="w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 flex items-center gap-2"
                                                    >
                                                        <Trash2 className="w-4 h-4" />
                                                        Delete Case
                                                    </button>
                                                </div>
                                            )}
                                        </div>
                                    </>
                                )}
                            </div>
                        </div>
                    </div>

                    {/* Client Ribbon */}
                    <div className="py-4 border-t border-gray-100 dark:border-gray-700 grid grid-cols-1 md:grid-cols-5 gap-4 text-sm">
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-full bg-indigo-100 dark:bg-indigo-900/30 flex items-center justify-center text-indigo-600 dark:text-indigo-400 font-bold text-lg">
                                {caseData.clientName.charAt(0)}
                            </div>
                            <div>
                                <p className="text-xs text-gray-500 dark:text-gray-400">Client Name</p>
                                <p className="font-medium text-gray-900 dark:text-white">{caseData.clientName}</p>
                            </div>
                        </div>
                        <div className="flex items-center gap-3">
                            <div className="p-2 bg-green-50 dark:bg-green-900/10 rounded-lg text-green-600 dark:text-green-400">
                                <Phone className="w-5 h-5" />
                            </div>
                            <div>
                                <p className="text-xs text-gray-500 dark:text-gray-400">Phone</p>
                                <p className="font-medium text-gray-900 dark:text-white font-mono">{caseData.clientPhone || 'N/A'}</p>
                            </div>
                        </div>
                        <div className="flex items-center gap-3">
                            <div className="p-2 bg-blue-50 dark:bg-blue-900/10 rounded-lg text-blue-600 dark:text-blue-400">
                                <Shield className="w-5 h-5" />
                            </div>
                            <div>
                                <p className="text-xs text-gray-500 dark:text-gray-400">Examiner</p>
                                <p className="font-medium text-gray-900 dark:text-white">
                                    {(caseData.tasks.find((t: ExtendedTask) => t.status !== 'COMPLETED') || caseData.tasks[0])?.assignee?.name || 'Unassigned'}
                                </p>
                            </div>
                        </div>
                        <div className="flex items-center gap-3">
                            <div className="p-2 bg-amber-50 dark:bg-amber-900/10 rounded-lg text-amber-600 dark:text-amber-400">
                                <User className="w-5 h-5" />
                            </div>
                            <div>
                                <p className="text-xs text-gray-500 dark:text-gray-400">Claimant ID</p>
                                <div className="flex items-center gap-2">
                                    {caseData.claimant ? (
                                        <a href={`/claimants/${caseData.claimant.claimantNumber}`} className="font-medium text-blue-600 dark:text-blue-400 font-mono hover:underline">
                                            #{caseData.claimant.claimantNumber}
                                        </a>
                                    ) : (
                                        <span className="font-medium text-gray-500 font-mono italic">Not Linked</span>
                                    )}
                                </div>
                                {caseData.claimFamily ? (
                                    <button
                                        onClick={() => setIsLinkClaimsModalOpen(true)}
                                        className="mt-1 flex items-center gap-1 text-[10px] text-green-600 bg-green-50 px-1.5 py-0.5 rounded-full hover:bg-green-100 transition-colors"
                                    >
                                        <LinkIcon className="w-3 h-3" />
                                        {caseData.claimFamily.name || 'Family Linked'}
                                    </button>
                                ) : (
                                    <button
                                        onClick={() => setIsLinkClaimsModalOpen(true)}
                                        className="mt-1 flex items-center gap-1 text-[10px] text-gray-400 hover:text-purple-600 hover:bg-purple-50 px-1.5 py-0.5 rounded-full transition-colors border border-dashed border-gray-300 hover:border-purple-200"
                                    >
                                        <Plus className="w-3 h-3" />
                                        Link Claims
                                    </button>
                                )}
                            </div>
                        </div>
                        <div className="flex items-center gap-3">
                            <div className="p-2 bg-purple-50 dark:bg-purple-900/10 rounded-lg text-purple-600 dark:text-purple-400">
                                <BookUser className="w-5 h-5" />
                            </div>
                            <div>
                                <p className="text-xs text-gray-500 dark:text-gray-400">Program</p>
                                <p className="font-medium text-gray-900 dark:text-white">{caseData.program || 'N/A'}</p>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Navigation Tabs */}
                <div className={cn(
                    "mx-auto px-4 sm:px-6 lg:px-8 mt-1 transition-all duration-300",
                    ['decisioning', 'timeline', 'tasks', 'documents'].includes(activeTab) ? "max-w-full" : "max-w-7xl"
                )}>
                    <div
                        role="tablist"
                        aria-label="Case Sections"
                        className="flex space-x-8 overflow-x-auto scrollbar-hide"
                    >
                        {[
                            { id: 'dashboard', label: 'Dashboard', icon: CheckSquare },
                            { id: 'notes', label: 'Notes', icon: FileText },
                            ...(currentUser.role === 'ADMIN' ? [{ id: 'timeline', label: 'Timeline', icon: Clock }] : []),
                            { id: 'tasks', label: 'Tasks', icon: CheckSquare },
                            { id: 'documents', label: 'Documents', icon: FolderOpen },
                            { id: 'decisioning', label: 'Decisioning', icon: CheckSquare },
                            { id: 'portal', label: 'Portal Messages', icon: Send },
                            { id: 'contacts', label: 'Contacts', icon: BookUser },
                        ].map((tab, idx) => (
                            <button
                                key={tab.id}
                                ref={el => { tabsRef.current[idx] = el }}
                                role="tab"
                                aria-selected={activeTab === tab.id}
                                aria-controls={`panel-${tab.id}`}
                                id={`tab-${tab.id}`}
                                tabIndex={activeTab === tab.id ? 0 : -1}
                                data-tabid={tab.id}
                                onClick={() => setActiveTab(tab.id)}
                                onKeyDown={(e) => handleTabKeyDown(e, idx)}
                                className={`
                                    flex items-center gap-2 py-4 px-1 border-b-2 text-sm font-medium whitespace-nowrap transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 rounded-t-sm
                                    ${activeTab === tab.id
                                        ? 'border-blue-600 text-blue-600 dark:text-blue-400'
                                        : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 dark:text-gray-400 dark:hover:text-gray-300'
                                    }
                                `}
                            >
                                <tab.icon className="w-4 h-4" />
                                {tab.label}
                                {tab.id === 'tasks' && caseData.tasks.filter((t: ExtendedTask) => t.status !== 'COMPLETED' && t.status !== 'CANCELLED').length > 0 && (
                                    <span className="ml-1.5 py-0.5 px-2 bg-blue-100 text-blue-800 text-xs rounded-full">
                                        {caseData.tasks.filter((t: ExtendedTask) => t.status !== 'COMPLETED' && t.status !== 'CANCELLED').length}
                                    </span>
                                )}
                            </button>
                        ))}
                    </div>
                </div>
            </div>

            {/* Main Content Area */}
            <main className={cn(
                "mx-auto px-4 sm:px-6 lg:px-8 py-8 transition-all duration-300",
                ['decisioning', 'timeline', 'tasks', 'documents'].includes(activeTab) ? "max-w-full" : "max-w-7xl"
            )}>
                {/* DASHBOARD TAB */}
                {activeTab === 'dashboard' && (
                    <div
                        role="tabpanel"
                        id="panel-dashboard"
                        aria-labelledby="tab-dashboard"
                        className="grid grid-cols-1 lg:grid-cols-3 gap-8"
                    >
                        {/* Left Column: Summary & Quick Actions */}
                        <div className="lg:col-span-2 space-y-6">
                            {/* Summary Card */}
                            <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 p-6 shadow-sm">
                                <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Case Summary</h2>
                                <dl className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-6">
                                    <div>
                                        <dt className="text-sm font-medium text-gray-500 dark:text-gray-400">Claim Number</dt>
                                        <dd className="mt-1 text-sm text-gray-900 dark:text-white font-mono">{caseData.caseNumber}</dd>
                                    </div>
                                    <div>
                                        <dt className="text-sm font-medium text-gray-500 dark:text-gray-400">Status</dt>
                                        <dd className="mt-1">
                                            <span className={`px-2 py-1 text-xs font-medium rounded-full ${getStatusColor(caseData.status)}`}>
                                                {caseData.status}
                                            </span>
                                        </dd>
                                    </div>

                                    {/* Medical/Reason */}
                                    {caseData.medicalCondition && (
                                        <div className="sm:col-span-2">
                                            <dt className="text-sm font-medium text-gray-500 dark:text-gray-400">Medical Condition / Reason</dt>
                                            <dd className="mt-1 text-sm text-gray-900 dark:text-white bg-red-50 dark:bg-red-900/10 p-2 rounded border border-red-100 dark:border-red-900/20">
                                                {caseData.medicalCondition}
                                            </dd>
                                        </div>
                                    )}

                                    {/* Program & Venue */}
                                    {caseData.program && (
                                        <div>
                                            <dt className="text-sm font-medium text-gray-500 dark:text-gray-400">Program</dt>
                                            <dd className="mt-1 text-sm text-gray-900 dark:text-white">{caseData.program}</dd>
                                        </div>
                                    )}
                                    {caseData.venue && (
                                        <div>
                                            <dt className="text-sm font-medium text-gray-500 dark:text-gray-400">Venue</dt>
                                            <dd className="mt-1 text-sm text-gray-900 dark:text-white">{caseData.venue}</dd>
                                        </div>
                                    )}

                                    {/* Dates */}
                                    {caseData.preferredStartDate && (
                                        <div>
                                            <dt className="text-sm font-medium text-gray-500 dark:text-gray-400">Preferred Start Date</dt>
                                            <dd className="mt-1 text-sm text-gray-900 dark:text-white">{caseData.preferredStartDate}</dd>
                                        </div>
                                    )}
                                    <div>
                                        <dt className="text-sm font-medium text-gray-500 dark:text-gray-400">Projected Return</dt>
                                        <dd className="mt-1 text-sm text-gray-900 dark:text-white">{formatDate(caseData.closedAt)}</dd>
                                    </div>

                                    <div>
                                        <dt className="text-sm font-medium text-gray-500 dark:text-gray-400">Category</dt>
                                        <dd className="mt-1 text-sm text-gray-900 dark:text-white">{caseData.category || 'N/A'}</dd>
                                    </div>

                                    <div className="sm:col-span-2">
                                        <dt className="text-sm font-medium text-gray-500 dark:text-gray-400">Description</dt>
                                        <dd className="mt-1 text-sm text-gray-900 dark:text-white bg-gray-50 dark:bg-gray-800 p-3 rounded-lg border border-gray-100 dark:border-gray-700">
                                            {caseData.description || 'No description provided.'}
                                        </dd>
                                    </div>
                                </dl>
                            </div>

                            {/* Recent Timeline */}
                            <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 p-6 shadow-sm">
                                <div className="flex items-center justify-between mb-4">
                                    <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Recent Activity</h2>
                                    <button onClick={() => setActiveTab('notes')} className="text-sm text-blue-600 hover:text-blue-700">
                                        View All
                                    </button>
                                </div>
                                <div className="flow-root">
                                    <ul className="-mb-8">
                                        {visibleNotes.slice(0, 3).map((note: ExtendedNote, idx: number) => (
                                            <li key={note.id}>
                                                <div className="relative pb-8">
                                                    {idx !== 2 && (
                                                        <span className="absolute top-4 left-4 -ml-px h-full w-0.5 bg-gray-200 dark:bg-gray-700" aria-hidden="true" />
                                                    )}
                                                    <div className="relative flex space-x-3">
                                                        <div className={`h-8 w-8 rounded-full flex items-center justify-center ring-8 ring-white dark:ring-gray-900 ${note.noteType === 'AUDIT' ? 'bg-amber-100 dark:bg-amber-900/30' : 'bg-blue-100 dark:bg-blue-900/30'}`}>
                                                            {note.noteType === 'AUDIT' ? (
                                                                <Shield className="w-4 h-4 text-amber-600 dark:text-amber-400" />
                                                            ) : (
                                                                <FileText className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                                                            )}
                                                        </div>
                                                        <div className="min-w-0 flex-1 pt-1.5 flex justify-between space-x-4">
                                                            <div>
                                                                <p className="text-sm text-gray-500 dark:text-gray-400">
                                                                    Note added by <span className="font-medium text-gray-900 dark:text-white">{note.author.name}</span>
                                                                </p>
                                                                <p className="mt-1 text-sm text-gray-900 dark:text-white line-clamp-2">{note.content}</p>
                                                            </div>
                                                            <div className="text-right text-sm whitespace-nowrap text-gray-500">
                                                                <time dateTime={new Date(note.createdAt).toISOString()}>{formatDate(note.createdAt)}</time>
                                                            </div>
                                                        </div>
                                                    </div>
                                                </div>
                                            </li>
                                        ))}
                                    </ul>
                                </div>
                            </div>
                        </div>

                        {/* Right Column: Tasks & Reminders */}
                        <div className="space-y-6">
                            {/* Urgent Tasks */}
                            <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 p-6 shadow-sm">
                                <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
                                    <AlertTriangle className="w-5 h-5 text-amber-500" />
                                    Priority Tasks
                                </h2>
                                <div className="space-y-3">
                                    {caseData.tasks.filter((t: ExtendedTask) => t.status !== 'COMPLETED').slice(0, 5).map((task: ExtendedTask) => (
                                        <div key={task.id} className="p-3 bg-gray-50 dark:bg-gray-800 rounded-lg flex items-start gap-3">
                                            <input
                                                type="checkbox"
                                                className="mt-1 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                                                aria-label={`Mark ${task.title} as complete`}
                                                onChange={() => handleTaskStatusChange(task.id, 'COMPLETED')}
                                            />
                                            <div className="flex-1">
                                                <p className="text-sm font-medium text-gray-900 dark:text-white">{task.title}</p>
                                                <p className="text-xs text-gray-500 mt-1">Due {formatDate(task.dueDate)}</p>
                                            </div>
                                            <span className={`px-2 py-0.5 text-xs rounded-full ${(priorityColors as any)[task.priority] || 'bg-gray-100'}`}>
                                                {task.priority}
                                            </span>
                                        </div>
                                    ))}
                                    {caseData.tasks.length === 0 && (
                                        <p className="text-sm text-gray-500 text-center py-4">No pending tasks</p>
                                    )}
                                </div>
                                <button className="w-full mt-4 py-2 border border-dashed border-gray-300 rounded-lg text-sm text-gray-500 hover:border-gray-400 hover:text-gray-600 transition-colors">
                                    + Add Quick Task
                                </button>
                            </div>

                            {/* Client Contact Card */}
                            <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 p-6 shadow-sm">
                                <h3 className="font-semibold text-lg text-gray-900 dark:text-white mb-4">Contact Client</h3>
                                <div className="space-y-4">
                                    <div className="flex items-center gap-3 p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
                                        <Phone className="w-5 h-5 text-gray-500" />
                                        <div>
                                            <p className="text-xs text-gray-500 dark:text-gray-400">Phone</p>
                                            <p className="font-mono text-gray-900 dark:text-white">{caseData.clientPhone || 'No number'}</p>
                                        </div>
                                        <button className="ml-auto p-2 text-gray-500 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/30 rounded-full transition-colors">
                                            <Phone className="w-4 h-4" />
                                        </button>
                                    </div>
                                    <div className="flex items-center gap-3 p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
                                        <Mail className="w-5 h-5 text-gray-500" />
                                        <div>
                                            <p className="text-xs text-gray-500 dark:text-gray-400">Email</p>
                                            <p className="truncate max-w-[150px] text-gray-900 dark:text-white">{caseData.clientEmail || 'No email'}</p>
                                        </div>
                                        <button className="ml-auto p-2 text-gray-500 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/30 rounded-full transition-colors">
                                            <Send className="w-4 h-4" />
                                        </button>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                {/* NOTES TAB */}
                {activeTab === 'notes' && (
                    <div className="max-w-4xl mx-auto">
                        <div className="flex items-center justify-between mb-6">
                            <h2 className="text-xl font-bold text-gray-900 dark:text-white">Case Notes</h2>
                            <div className="flex gap-3">
                                <div className="relative">
                                    <input
                                        type="text"
                                        placeholder="Search notes..."
                                        className="pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-sm focus:ring-2 focus:ring-blue-500"
                                    />
                                    <Search className="w-4 h-4 text-gray-400 absolute left-3 top-2.5" />
                                </div>
                                <button
                                    onClick={() => setIsAddNoteModalOpen(true)}
                                    className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-lg transition-colors"
                                >
                                    <Plus className="w-4 h-4" />
                                    Add Note
                                </button>
                            </div>
                        </div>

                        <div className="space-y-4">
                            {visibleNotes.length === 0 ? (
                                <div className="text-center py-12 bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800">
                                    <div className="w-16 h-16 bg-gray-100 dark:bg-gray-800 rounded-full flex items-center justify-center mx-auto mb-4">
                                        <FileText className="w-8 h-8 text-gray-400" />
                                    </div>
                                    <h3 className="text-lg font-medium text-gray-900 dark:text-white">No notes yet</h3>
                                    <p className="text-gray-500 mt-1">Start by adding a new note to this case.</p>
                                </div>
                            ) : (
                                visibleNotes.map((note: ExtendedNote) => {
                                    const isAuditNote = note.noteType === 'AUDIT';
                                    return (
                                        <div key={note.id} className={cn(
                                            "bg-white dark:bg-gray-900 rounded-xl border p-6 shadow-sm hover:shadow-md transition-shadow",
                                            isAuditNote
                                                ? "border-amber-400 dark:border-amber-600 bg-amber-50/50 dark:bg-amber-900/10"
                                                : "border-gray-200 dark:border-gray-800"
                                        )}>
                                            {isAuditNote && (
                                                <div className="flex items-center gap-2 mb-3 text-amber-600 dark:text-amber-400">
                                                    <Shield className="w-4 h-4" />
                                                    <span className="text-xs font-bold uppercase tracking-wide">Audit Note</span>
                                                </div>
                                            )}
                                            <div className="flex items-center justify-between mb-4">
                                                <div className="flex items-center gap-3">
                                                    <div className={cn(
                                                        "p-2 rounded-lg",
                                                        isAuditNote ? 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400' :
                                                            note.noteType === 'PHONE_CALL' ? 'bg-green-100 text-green-700' : 'bg-blue-100 text-blue-700'
                                                    )}>
                                                        {isAuditNote ? <Shield className="w-4 h-4" /> :
                                                            note.noteType === 'PHONE_CALL' ? <Phone className="w-4 h-4" /> : <FileText className="w-4 h-4" />}
                                                    </div>
                                                    <div>
                                                        <span className="text-sm font-medium text-gray-900 dark:text-white capitalize">
                                                            {(note.noteType || 'NOTE').replace('_', ' ').toLowerCase()}
                                                        </span>
                                                    </div>
                                                </div>
                                                <div className="relative">
                                                    <button
                                                        onClick={() => setNoteMenuOpen(noteMenuOpen === note.id ? null : note.id)}
                                                        className="text-gray-400 hover:text-gray-600 p-1 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
                                                        aria-label="Note options"
                                                    >
                                                        <MoreHorizontal className="w-5 h-5" />
                                                    </button>
                                                    {noteMenuOpen === note.id && (
                                                        <>
                                                            <div
                                                                className="fixed inset-0 z-40"
                                                                onClick={() => setNoteMenuOpen(null)}
                                                            />
                                                            <div className="absolute right-0 mt-2 w-48 bg-white dark:bg-gray-800 rounded-lg shadow-lg ring-1 ring-black ring-opacity-5 z-50 py-1">
                                                                <button
                                                                    onClick={() => handleCopyNote(note.content)}
                                                                    className="w-full text-left px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 flex items-center gap-2"
                                                                >
                                                                    <Copy className="w-4 h-4" />
                                                                    Copy Note
                                                                </button>
                                                                {isNoteEditable(note.createdAt) && (note.authorId === currentUser.id || isAdmin) && (
                                                                    <button
                                                                        onClick={() => handleEditNote(note)}
                                                                        className="w-full text-left px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 flex items-center gap-2"
                                                                    >
                                                                        <Edit3 className="w-4 h-4" />
                                                                        Edit Note
                                                                    </button>
                                                                )}
                                                            </div>
                                                        </>
                                                    )}
                                                </div>
                                            </div>
                                            <p className="text-gray-700 dark:text-gray-300 whitespace-pre-wrap">{note.content}</p>
                                            {note.attachedDocument && (
                                                <div className="mt-3 p-3 bg-gray-50 dark:bg-gray-800 rounded-lg flex items-center gap-3">
                                                    <FileText className="w-5 h-5 text-gray-400" />
                                                    <span className="text-sm text-gray-600 dark:text-gray-400">{note.attachedDocument.fileName}</span>
                                                    <button className="ml-auto text-blue-600 hover:text-blue-700 text-sm">Download</button>
                                                </div>
                                            )}
                                            <div className="flex items-center gap-2 mt-4 text-sm text-gray-500">
                                                <span className="font-medium">{note.author.name}</span>
                                                <span>•</span>
                                                <span>{formatDateTime(note.createdAt)}</span>
                                            </div>
                                        </div>
                                    );
                                })
                            )}
                        </div>
                    </div>
                )}

                {/* TIMELINE TAB */}
                {
                    activeTab === 'timeline' && currentUser.role === 'ADMIN' && (
                        <div className="max-w-3xl mx-auto">
                            <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 p-8">
                                <div className="flex items-center gap-3 mb-8">
                                    <div className="relative inline-block text-left">
                                        <button
                                            onClick={() => setIsExportMenuOpen(!isExportMenuOpen)}
                                            className="px-3 py-1.5 text-sm font-medium text-indigo-600 bg-indigo-50 hover:bg-indigo-100 rounded-lg transition-colors border border-indigo-200 flex items-center gap-2"
                                        >
                                            <Download className="w-4 h-4" />
                                            Export
                                            <ChevronDown className={`w-3 h-3 transition-transform ${isExportMenuOpen ? 'rotate-180' : ''}`} />
                                        </button>

                                        {isExportMenuOpen && (
                                            <>
                                                <div className="fixed inset-0 z-10" onClick={() => setIsExportMenuOpen(false)} />
                                                <div className="absolute left-0 mt-2 w-48 bg-white dark:bg-gray-800 rounded-lg shadow-lg ring-1 ring-black ring-opacity-5 z-20 py-1 origin-top-left">
                                                    <button
                                                        onClick={() => handleExport('PDF')}
                                                        className="w-full text-left px-4 py-2 text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-700 flex items-center gap-2"
                                                    >
                                                        <File className="w-4 h-4 text-red-500" />
                                                        Export as PDF
                                                    </button>
                                                    <button
                                                        onClick={() => handleExport('WORD')}
                                                        className="w-full text-left px-4 py-2 text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-700 flex items-center gap-2"
                                                    >
                                                        <FileText className="w-4 h-4 text-blue-600" />
                                                        Export as Word
                                                    </button>
                                                    <button
                                                        onClick={() => handleExport('EXCEL')}
                                                        className="w-full text-left px-4 py-2 text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-700 flex items-center gap-2"
                                                    >
                                                        <Table className="w-4 h-4 text-green-600" />
                                                        Export as Excel
                                                    </button>
                                                </div>
                                            </>
                                        )}
                                    </div>
                                    <div className="flex items-center gap-2 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-lg p-1">
                                        <h2 className="text-xl font-bold text-gray-900 dark:text-white text-center">Case History & Audit Log</h2>
                                    </div>
                                </div>
                                <TimelineView caseId={caseData.id} />
                            </div>
                        </div>
                    )
                }

                {/* TASKS TAB */}
                {
                    activeTab === 'tasks' && (
                        <div className="space-y-6">
                            <div className="flex items-center justify-between">
                                <h2 className="text-xl font-bold text-gray-900 dark:text-white">Tasks</h2>
                                <div className="flex gap-2">
                                    <button
                                        onClick={() => setIsAddTaskModalOpen(true)}
                                        className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-lg transition-colors"
                                    >
                                        <Plus className="w-4 h-4" />
                                        Add Task
                                    </button>
                                </div>
                            </div>

                            <CaseTasksTable
                                tasks={caseData.tasks.map((t: ExtendedTask) => ({ ...t, case: { caseNumber: caseData.caseNumber } }))}
                                users={users}
                                onStatusChange={async (id, status) => { await handleTaskStatusChange(id, status); }}
                                onReassign={handleTaskReassign}
                                onDelete={async (id) => { await handleTaskDelete(id); }}
                                onEdit={(task) => setSelectedTask(task)}
                            />
                        </div>
                    )
                }

                {/* DOCUMENTS TAB */}
                {
                    activeTab === 'documents' && (
                        <div className="space-y-6">
                            <div className="flex items-center justify-between">
                                <h2 className="text-xl font-bold text-gray-900 dark:text-white">Documents</h2>
                                <button
                                    onClick={() => setIsUploadModalOpen(true)}
                                    className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-lg transition-colors"
                                >
                                    <Upload className="w-4 h-4" />
                                    Upload Document
                                </button>
                            </div>

                            {caseData.documents.length === 0 ? (
                                <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 p-12 text-center">
                                    <FolderOpen className="w-12 h-12 text-gray-300 mx-auto mb-4" />
                                    <p className="text-gray-500">No documents uploaded yet</p>
                                </div>
                            ) : (
                                <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 overflow-hidden">
                                    <table className="w-full">
                                        <thead className="bg-gray-50 dark:bg-gray-800/50 border-b border-gray-200 dark:border-gray-700">
                                            <tr className="text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                                                <th className="px-6 py-3">Document</th>
                                                <th className="px-6 py-3">DCN</th>
                                                <th className="px-6 py-3">Category</th>
                                                <th className="px-6 py-3">Size</th>
                                                <th className="px-6 py-3">Uploaded</th>
                                                <th className="px-6 py-3">Actions</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                                            {caseData.documents.map((doc: ExtendedDocument) => (
                                                <tr key={doc.id} className="hover:bg-gray-50 dark:hover:bg-gray-800/50">
                                                    <td className="px-6 py-4">
                                                        <div className="flex items-center gap-3">
                                                            <FileText className="w-5 h-5 text-gray-400" />
                                                            <span className="font-medium text-gray-900 dark:text-white">{doc.fileName}</span>
                                                        </div>
                                                    </td>
                                                    <td className="px-6 py-4">
                                                        <code className="text-sm font-mono text-blue-600 bg-blue-50 dark:bg-blue-900/30 px-2 py-1 rounded">
                                                            {doc.documentControlNumber}
                                                        </code>
                                                    </td>
                                                    <td className="px-6 py-4">
                                                        <span className={`px-2 py-1 text-xs font-medium rounded-full ${(documentCategoryColors as any)[doc.category] || 'bg-gray-100 text-gray-800'}`}>
                                                            {doc.category}
                                                        </span>
                                                    </td>
                                                    <td className="px-6 py-4 text-sm text-gray-600 dark:text-gray-400">
                                                        {formatFileSize(doc.fileSize)}
                                                    </td>
                                                    <td className="px-6 py-4 text-sm text-gray-600 dark:text-gray-400">
                                                        <div>{formatDate(doc.createdAt)}</div>
                                                        <div className="text-xs">by {doc.uploadedBy.name}</div>
                                                    </td>
                                                    <td className="px-6 py-4">
                                                        <div className="flex items-center gap-2">
                                                            <button
                                                                onClick={() => setViewingDocument(doc)}
                                                                className="p-2 text-gray-500 hover:text-green-600 hover:bg-green-50 rounded-lg transition-colors"
                                                                title="View"
                                                                aria-label={`View ${doc.fileName}`}
                                                            >
                                                                <Eye className="w-4 h-4" />
                                                            </button>
                                                            <button
                                                                onClick={() => handleDownloadDocument(doc.id, doc.fileName, doc.fileType)}
                                                                className="p-2 text-gray-500 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                                                                title="Download"
                                                                aria-label={`Download ${doc.fileName}`}
                                                            >
                                                                <Download className="w-4 h-4" />
                                                            </button>
                                                            <button
                                                                className="p-2 text-gray-500 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                                                                aria-label={`Delete ${doc.fileName}`}
                                                            >
                                                                <Trash2 className="w-4 h-4" />
                                                            </button>
                                                        </div>
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            )}
                        </div>
                    )
                }

                {/* ADDRESS BOOK TAB */}
                {
                    activeTab === 'contacts' && (
                        <div className="space-y-6">
                            <div className="flex items-center justify-between">
                                <h2 className="text-xl font-bold text-gray-900 dark:text-white">Address Book</h2>
                                <button
                                    onClick={() => setIsAddContactModalOpen(true)}
                                    className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-lg transition-colors"
                                >
                                    <Plus className="w-4 h-4" />
                                    Add Contact
                                </button>
                            </div>

                            {caseData.contacts.length === 0 ? (
                                <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 p-12 text-center">
                                    <BookUser className="w-12 h-12 text-gray-300 mx-auto mb-4" />
                                    <p className="text-gray-500">No contacts added yet</p>
                                </div>
                            ) : (
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    {caseData.contacts.map((contact: Contact) => (
                                        <div key={contact.id} className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 p-6">
                                            <div className="flex items-start justify-between">
                                                <div>
                                                    <span className={`px-2 py-1 text-xs font-medium rounded-full ${(contactTypeColors as any)[contact.type] || 'bg-gray-100'}`}>
                                                        {contact.type}
                                                    </span>
                                                    <h3 className="font-semibold text-gray-900 dark:text-white mt-2">{contact.name}</h3>
                                                </div>
                                                <button className="p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors">
                                                    <Edit2 className="w-4 h-4" />
                                                </button>
                                            </div>
                                            <div className="space-y-2 mt-4 text-sm">
                                                <div className="flex items-center gap-2 text-gray-600 dark:text-gray-400">
                                                    <Phone className="w-4 h-4" />
                                                    <span>{contact.phone}</span>
                                                </div>
                                                {contact.email && (
                                                    <div className="flex items-center gap-2 text-gray-600 dark:text-gray-400">
                                                        <span className="w-4 h-4 text-center">@</span>
                                                        <span>{contact.email}</span>
                                                    </div>
                                                )}
                                                {contact.address && (
                                                    <p className="text-gray-500 mt-2">{contact.address}</p>
                                                )}
                                                {contact.notes && (
                                                    <p className="text-gray-500 italic mt-2">{contact.notes}</p>
                                                )}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    )
                }


                {/* DECISIONING TAB */}
                {
                    activeTab === 'decisioning' && (
                        <div className="w-full">
                            <DecisioningTab caseId={caseId} currentUser={currentUser} />
                        </div>
                    )
                }

                {/* PORTAL MESSAGES TAB */}
                {
                    activeTab === 'portal' && (
                        <div className="max-w-4xl mx-auto">
                            <div className="mb-6">
                                <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-2">Portal Messages</h2>
                                <p className="text-sm text-gray-500 dark:text-gray-400">
                                    View and respond to messages from {caseData.clientName} via the claimant portal.
                                </p>
                            </div>
                            <PortalMessagesSection
                                caseId={caseId}
                                clientName={caseData.clientName}
                            />
                        </div>
                    )
                }
            </main >

            {/* MODALS */}
            < AddNoteModal
                isOpen={isAddNoteModalOpen}
                onClose={() => setIsAddNoteModalOpen(false)}
                onSubmit={handleSubmitNote}
                claims={[{ id: caseId, caseNumber: caseData.caseNumber }]}
                coordinatorName={currentUser.name}
                userRole={currentUser.role as 'ADMIN' | 'AUDITOR' | 'COORDINATOR'}
                claimantNumber={caseData.claimant?.claimantNumber}
            />

            <AddTaskModal
                isOpen={isAddTaskModalOpen}
                onClose={() => setIsAddTaskModalOpen(false)}
                onSubmit={handleAddTask}
                users={users}
            />

            <TransferCaseModal
                isOpen={isTransferModalOpen}
                onClose={() => setIsTransferModalOpen(false)}
                onSubmit={handleTransferCase}
                users={users}
                currentOwnerName={caseData.tasks.find((t: ExtendedTask) => t.status !== 'COMPLETED')?.assignee.name || 'Unknown'}
            />

            <GenerateDecisionModal
                isOpen={isDecisionModalOpen}
                onClose={() => setIsDecisionModalOpen(false)}
                caseId={caseData.id}
                onSuccess={() => {
                    if (onRefresh) onRefresh();
                }}
            />

            {/* Upload Document Modal */}
            {
                isUploadModalOpen && (
                    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
                        <div className="bg-white dark:bg-gray-900 rounded-xl p-6 w-full max-w-md shadow-lg">
                            <div className="flex items-center justify-between mb-4">
                                <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                                    Upload Document
                                </h3>
                                <button
                                    onClick={() => {
                                        setIsUploadModalOpen(false);
                                        setUploadError(null);
                                    }}
                                    className="p-2 text-gray-400 hover:text-gray-600 rounded-lg"
                                >
                                    <X className="w-5 h-5" />
                                </button>
                            </div>

                            {uploadError && (
                                <div className="mb-4 p-3 bg-red-50 text-red-700 text-sm rounded-lg">
                                    {uploadError}
                                </div>
                            )}

                            <div className="space-y-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                        Category
                                    </label>
                                    <select
                                        value={uploadCategory}
                                        onChange={(e) => setUploadCategory(e.target.value)}
                                        className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500"
                                    >
                                        <option value="MEDICAL">Medical</option>
                                        <option value="LEGAL">Legal</option>
                                        <option value="HR">HR</option>
                                        <option value="CORRESPONDENCE">Correspondence</option>
                                        <option value="OTHER">Other</option>
                                    </select>
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                        Select File
                                    </label>
                                    <input
                                        ref={fileInputRef}
                                        type="file"
                                        className="w-full text-sm text-gray-500 dark:text-gray-400
                                                file:mr-4 file:py-2 file:px-4
                                                file:rounded-lg file:border-0
                                                file:text-sm file:font-medium
                                                file:bg-blue-50 file:text-blue-700
                                                hover:file:bg-blue-100
                                                dark:file:bg-blue-900/30 dark:file:text-blue-400"
                                    />
                                </div>
                            </div>

                            <div className="flex gap-3 mt-6">
                                <button
                                    onClick={() => {
                                        setIsUploadModalOpen(false);
                                        setUploadError(null);
                                    }}
                                    className="flex-1 px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-lg transition-colors"
                                >
                                    Cancel
                                </button>
                                <button
                                    onClick={() => {
                                        const file = fileInputRef.current?.files?.[0];
                                        if (file) {
                                            handleUploadDocument(file);
                                        } else {
                                            setUploadError('Please select a file');
                                        }
                                    }}
                                    disabled={isUploading}
                                    className="flex-1 flex items-center justify-center gap-2 px-4 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 rounded-lg transition-colors"
                                >
                                    {isUploading ? (
                                        <>
                                            <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                            Uploading...
                                        </>
                                    ) : (
                                        <>
                                            <Upload className="w-4 h-4" />
                                            Upload
                                        </>
                                    )}
                                </button>
                            </div>
                        </div>
                    </div>
                )
            }

            {/* Document Viewer Modal */}
            {
                viewingDocument && (
                    <DocumentViewer
                        documentId={viewingDocument.id}
                        fileName={viewingDocument.fileName}
                        fileType={viewingDocument.fileType}
                        currentUserId={currentUser.id}
                        onClose={() => setViewingDocument(null)}
                    />
                )
            }

            {/* Download Options Modal */}
            <DownloadOptionsModal
                isOpen={isDownloadModalOpen}
                onClose={() => {
                    setIsDownloadModalOpen(false);
                    setDocumentToDownload(null);
                }}
                onConfirm={(withAnnotations) => {
                    if (documentToDownload) {
                        executeDownload(documentToDownload.id, documentToDownload.fileName, withAnnotations);
                    }
                }}
                fileName={documentToDownload?.fileName || ''}
            />

            {/* Modals */}
            <EditCaseModal
                isOpen={isEditModalOpen}
                onClose={() => setIsEditModalOpen(false)}
                caseData={caseData}
                onSave={handleEditCase}
            />

            <AddAccommodationModal
                isOpen={isAddAccommodationModalOpen}
                onClose={() => setIsAddAccommodationModalOpen(false)}
                onSubmit={(data) => {
                    if (onAddAccommodation) {
                        onAddAccommodation({ ...data }); // status handled by backend
                    }
                }}
            />
            <AddTaskModal
                isOpen={isAddTaskModalOpen}
                onClose={() => setIsAddTaskModalOpen(false)}
                onSubmit={handleAddTask}
                users={users.map(u => ({ id: u.id, name: u.name }))}
            />

            <TransferCaseModal
                isOpen={isTransferModalOpen}
                onClose={() => setIsTransferModalOpen(false)}
                onSubmit={handleTransferCase}
                users={users.map(u => ({ id: u.id, name: u.name, role: u.role }))}
            />

            {
                selectedTask && (
                    <TaskDetailModal
                        task={selectedTask}
                        onClose={() => setSelectedTask(null)}
                        onStatusChange={handleTaskStatusChange}
                        onDelete={handleTaskDelete}
                        onUpdate={fetchCaseData}
                        users={users}
                    />
                )
            }

            <AddContactModal
                isOpen={isAddContactModalOpen}
                onClose={() => setIsAddContactModalOpen(false)}
                onSubmit={handleAddContact}
            />

            <EditNoteModal
                isOpen={isEditNoteModalOpen}
                onClose={() => setIsEditNoteModalOpen(false)}
                initialData={editingNote ? { id: editingNote.id, content: editingNote.content } : null}
                onSave={handleSaveEditNote}
            />

            <LinkClaimsModal
                isOpen={isLinkClaimsModalOpen}
                onClose={() => setIsLinkClaimsModalOpen(false)}
                caseId={caseId}
                currentFamily={caseData.claimFamily}
                onSuccess={fetchCaseData}
            />
        </div >
    );
}

export default CaseDetailPage;
