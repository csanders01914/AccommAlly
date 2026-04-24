'use client';
import { apiFetch } from '@/lib/api-client';

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
import { AddNoteData } from './modals/AddNoteModal';
import AddNoteModal from './modals/AddNoteModal';
import { TimelineView } from './TimelineView';
import { DecisioningTab } from './case/DecisioningTab';
import { useRouter as useNextRouter } from 'next/navigation';
import dynamic from 'next/dynamic';
const DocumentViewer = dynamic(() => import('./DocumentViewer'), { ssr: false });
import { DownloadOptionsModal } from './modals/DownloadOptionsModal';
import { AddAccommodationModal, AddAccommodationData } from './modals/AddAccommodationModal';
import { AddTaskModal, AddTaskData } from './modals/AddTaskModal';
import { TransferCaseModal } from './modals/TransferCaseModal';
import { TaskDetailModal } from './modals/TaskDetailModal';
import PortalMessagesSection from './PortalMessagesSection';
import { EditCaseModal, EditCaseData } from './modals/EditCaseModal';
import { AddContactModal, AddContactData } from './modals/AddContactModal';
import { CaseTasksTable } from './CaseTasksTable';
import EditNoteModal from './modals/EditNoteModal';
import LinkClaimsModal from './modals/LinkClaimsModal';

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
 annotationCount: number;
};

type ExtendedCase = Case & {
 tasks: ExtendedTask[];
 notes: ExtendedNote[];
 documents: ExtendedDocument[];
 contacts: Contact[];
 accommodations: any[]; // Placeholder for relation
 medicalCondition?: string | null;
 preferredStartDate?: string | null;
 medicalDueDate?: string | null;
 claimant?: { id: string; claimantNumber: string; email: string | null; phone: string | null };
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
 const nextRouter = useNextRouter();
 const [activeTab, setActiveTab] = useState('dashboard');
 const [caseData, setCaseData] = useState<ExtendedCase | null>(initialData || null);
 const [isLoading, setIsLoading] = useState(!initialData);
 const [error, setError] = useState<string | null>(null);

 // Modal States
 const [isAddNoteModalOpen, setIsAddNoteModalOpen] = useState(false);
 const [noteModalDefaultType, setNoteModalDefaultType] = useState<'GENERAL' | 'PHONE_CALL' | 'MEDICAL_UPDATE' | 'DOCUMENTATION' | 'FOLLOW_UP' | 'CLIENT_REQUEST' | 'AUDIT'>('GENERAL');
 const [isEditModalOpen, setIsEditModalOpen] = useState(false);
 const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);
 const [isDownloadModalOpen, setIsDownloadModalOpen] = useState(false);
 const [documentToDownload, setDocumentToDownload] = useState<ExtendedDocument | null>(null);
 const [viewingDocument, setViewingDocument] = useState<ExtendedDocument | null>(null);
 const [confirmingDeleteId, setConfirmingDeleteId] = useState<string | null>(null);
 const [deletingDocumentId, setDeletingDocumentId] = useState<string | null>(null);
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

 const [medicalDueDate, setMedicalDueDate] = useState<string>(
 caseData?.medicalDueDate ? caseData.medicalDueDate.toString().split('T')[0] : ''
 );
 const [savingMedDue, setSavingMedDue] = useState(false);

 // Claimant contact inline edit state
 const [editingContactField, setEditingContactField] = useState<'phone' | 'email' | null>(null);
 const [editContactPhone, setEditContactPhone] = useState('');
 const [editContactEmail, setEditContactEmail] = useState('');
 const [savingContactField, setSavingContactField] = useState(false);

 const startEditContact = (field: 'phone' | 'email') => {
 if (field === 'phone') setEditContactPhone(caseData?.clientPhone || '');
 else setEditContactEmail(caseData?.clientEmail || '');
 setEditingContactField(field);
 };

 const cancelEditContact = () => setEditingContactField(null);

 const saveContactField = async (field: 'phone' | 'email') => {
 const value = field === 'phone' ? editContactPhone : editContactEmail;
 setSavingContactField(true);
 try {
 const res = await fetch(`/api/cases/${caseData?.id}`, {
 method: 'PATCH',
 headers: { 'Content-Type': 'application/json' },
 body: JSON.stringify({ [field === 'phone' ? 'clientPhone' : 'clientEmail']: value }),
 });
 if (!res.ok) {
 const data = await res.json().catch(() => ({}));
 throw new Error(data.error || 'Failed to save');
 }
 setCaseData(prev => prev ? {
 ...prev,
 ...(field === 'phone' ? { clientPhone: value } : { clientEmail: value }),
 } : prev);
 setEditingContactField(null);
 } catch (err) {
 console.error('Failed to save contact field:', err);
 alert('Failed to save. Please try again.');
 } finally {
 setSavingContactField(false);
 }
 };

 // Re-sync medical due date when caseData is loaded or refreshed
 useEffect(() => {
 setMedicalDueDate(
 caseData?.medicalDueDate ? caseData.medicalDueDate.toString().split('T')[0] : ''
 );
 }, [caseData?.medicalDueDate]);

 async function saveMedicalDueDate(value: string) {
 const previous = medicalDueDate;
 setMedicalDueDate(value);
 setSavingMedDue(true);
 try {
 const res = await fetch(`/api/cases/${caseData?.id}`, {
 method: 'PATCH',
 headers: { 'Content-Type': 'application/json' },
 body: JSON.stringify({ medicalDueDate: value || null }),
 });
 if (!res.ok) {
 const data = await res.json().catch(() => ({}));
 throw new Error(data.error || 'Failed to save date');
 }
 } catch (err) {
 console.error('Failed to save medical due date:', err);
 setMedicalDueDate(previous);
 alert('Failed to save medical due date');
 } finally {
 setSavingMedDue(false);
 }
 }

 // Upload State
 const [isUploading, setIsUploading] = useState(false);
 const [uploadError, setUploadError] = useState<string | null>(null);

 const [uploadCategory, setUploadCategory] = useState<string>('OTHER');
 const [uploadEmailMode, setUploadEmailMode] = useState(false);
 const [lastUploadedDCN, setLastUploadedDCN] = useState<string | null>(null);
 const [dcnCopied, setDcnCopied] = useState(false);
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
 const res = await apiFetch('/api/users');
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

 const response = await apiFetch('/api/documents/upload', {
 method: 'POST',
 body: formData,
 });

 if (!response.ok) {
 const errorData = await response.json();
 throw new Error(errorData.error || 'Upload failed');
 }

 const result = await response.json();

 await fetchCaseData();
 setIsUploadModalOpen(false);

 if (uploadEmailMode && result.documentControlNumber) {
 setLastUploadedDCN(result.documentControlNumber);
 }

 setUploadEmailMode(false);
 if (onRefresh) onRefresh();

 } catch (err) {
 setUploadError(err instanceof Error ? err.message : 'Upload failed');
 } finally {
 setIsUploading(false);
 }
 };

 const openEmailUpload = () => {
 setUploadEmailMode(true);
 setUploadCategory('CORRESPONDENCE');
 setUploadError(null);
 setIsUploadModalOpen(true);
 };

 const handleDeleteDocument = async (docId: string) => {
 setDeletingDocumentId(docId);
 try {
 const res = await apiFetch(`/api/documents/${docId}`, { method: 'DELETE' });
 if (res.ok) {
 await fetchCaseData();
 } else {
 alert('Failed to delete document. Please try again.');
 }
 } catch {
 alert('Failed to delete document. Please try again.');
 } finally {
 setDeletingDocumentId(null);
 setConfirmingDeleteId(null);
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
 const res = await apiFetch('/api/tasks', {
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
 <div className="flex items-center justify-center min-h-[400px] bg-background">
 <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-primary-500"></div>
 </div>
 );
 }

 if (error || !caseData) {
 return (
 <div className="flex flex-col items-center justify-center min-h-[400px] bg-background">
 <AlertTriangle className="w-10 h-10 mb-4 text-red-500" />
 <p className="text-base font-medium text-text-primary">{error || 'Case not found'}</p>
 <button
 onClick={fetchCaseData}
 className="mt-4 px-4 py-2 text-primary-500 hover:bg-primary-500/10 rounded-lg transition-colors text-sm"
 >
 Try Again
 </button>
 </div>
 );
 }

 // Helper functions
 const getStatusColor = (status: string) => {
 switch (status) {
 case 'REVIEW': return 'bg-yellow-100 text-yellow-800';
 case 'ACTIVE': return 'bg-green-100 text-green-800';
 case 'CLOSED': return 'bg-border text-text-secondary';
 case 'APPEAL': return 'bg-red-100 text-red-800';
 default: return 'bg-primary-500/15 text-primary-500';
 }
 };

 const isOverdue = (task: Task) => {
 return new Date(task.dueDate) < new Date() && task.status !== 'COMPLETED';
 };

 const taskStatusColors = {
 PENDING: 'text-yellow-700 bg-yellow-50',
 IN_PROGRESS: 'text-primary-500 bg-primary-500/10',
 COMPLETED: 'text-green-700 bg-green-50',
 CANCELLED: 'text-text-muted bg-surface-raised',
 };

 const priorityColors = {
 HIGH: 'text-red-600 bg-red-50 border-red-100',
 MEDIUM: 'text-yellow-600 bg-yellow-50 border-yellow-100',
 LOW: 'text-green-600 bg-green-50 border-green-100',
 };

 const documentCategoryColors = {
 MEDICAL: 'bg-success/10 text-success',
 LEGAL: 'bg-primary-100 text-primary-700',
 HR: 'bg-orange-100 text-orange-800',
 CORRESPONDENCE: 'bg-primary-500/10 text-primary-500',
 OTHER: 'bg-surface-raised text-text-secondary',
 };

 const contactTypeColors = {
 CLAIMANT: 'bg-primary-50 text-primary-600',
 ATTORNEY: 'bg-primary-100 text-primary-700',
 MEDICAL_PROVIDER: 'bg-success/10 text-success',
 EMPLOYER: 'bg-orange-100 text-orange-800',
 OTHER: 'bg-surface-raised text-text-secondary',
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
 <div className="min-h-screen bg-sidebar">
 {/* Header / Ribbon — editorial charcoal band */}
 <div className="sticky top-0 z-30" style={{ background: '#1C1A17' }}>
 <div
 aria-hidden
 style={{
 position: 'absolute', inset: 0, pointerEvents: 'none',
 backgroundImage: 'radial-gradient(ellipse at 8% 50%,rgba(13,148,136,0.12) 0%,transparent 55%)',
 }}
 />
 <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
 {/* Top Row: Back, Title, Actions */}
 <div className="flex items-center justify-between h-16">
 <div className="flex items-center gap-4">
 <button
 onClick={onBack}
 className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-[0.15em] text-primary-500 hover:text-primary-500 transition-colors"
 aria-label="Go Back"
 >
 <ArrowLeft className="w-3.5 h-3.5" />
 Cases
 </button>
 <div className="w-px h-5 bg-primary-500/30" />
 <div>
 <h1 className="flex items-center gap-2.5" style={{ fontFamily: 'var(--font-instrument-serif, Georgia, serif)', fontSize: 20, fontWeight: 400, color: '#F0EEE8', margin: 0 }}>
 <span className="font-mono text-primary-500 text-base">{caseData.caseNumber}</span>
 <span className={`px-2 py-0.5 text-[10px] font-semibold uppercase tracking-widest rounded-full ${getStatusColor(caseData.status)}`}>
 {caseData.status}
 </span>
 {isAdmin && (
 <button
 onClick={() => setIsTransferModalOpen(true)}
 className="text-xs text-primary-500 hover:text-primary-500 transition-colors"
 >
 Transfer
 </button>
 )}
 </h1>
 <p className="text-[11px]" style={{ color: 'rgba(240,238,232,0.45)' }}>
 Created {formatDate(caseData.createdAt)}
 </p>
 </div>
 </div>

 <div className="flex items-center gap-2">
 <button
 onClick={() => setIsAddNoteModalOpen(true)}
 className="flex items-center gap-2 px-4 py-2 bg-primary-500 hover:bg-primary-600 text-white text-sm font-semibold rounded-lg transition-colors"
 >
 <Plus className="w-4 h-4" />
 Add Note
 </button>
 <button
 onClick={() => setIsUploadModalOpen(true)}
 className="p-2 text-text-muted hover:text-primary-500 hover:bg-primary-500/10 rounded-lg transition-colors border border-sidebar"
 title="Upload Document"
 aria-label="Upload Document"
 >
 <Upload className="w-5 h-5" />
 </button>
 <div className="relative">
 <button
 onClick={() => setUserMenuOpen(!userMenuOpen)}
 className="p-2 text-text-muted hover:text-sidebar-fg hover:bg-sidebar rounded-lg transition-colors border border-sidebar"
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
 <div className="absolute right-0 mt-2 w-56 bg-surface rounded-xl shadow-lg border border-border z-50 py-1">
 <button
 onClick={() => {
 setIsEditModalOpen(true);
 setUserMenuOpen(false);
 }}
 className="w-full text-left px-4 py-2 text-sm text-text-primary hover:bg-surface-raised flex items-center gap-2"
 >
 <Edit2 className="w-4 h-4" />
 Edit Case Details
 </button>

 {(isAdmin || isAuditor) && (
 <div className="border-t border-border my-1 pt-1">
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
 className="w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-red-50 flex items-center gap-2"
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
 <div className="py-4 border-t grid grid-cols-1 md:grid-cols-5 gap-4 text-sm" style={{ borderColor: 'rgba(13,148,136,0.2)' }}>
 <div className="flex items-center gap-3">
 <div className="w-9 h-9 rounded-full bg-primary-500/20 flex items-center justify-center text-primary-500 font-bold text-base">
 {caseData.clientName.charAt(0)}
 </div>
 <div>
 <p className="text-[10px] font-semibold uppercase tracking-[0.1em]" style={{ color: 'rgba(240,238,232,0.4)' }}>Client</p>
 <p className="font-medium text-sidebar-fg">{caseData.clientName}</p>
 </div>
 </div>
 <div className="flex items-center gap-3">
 <div className="p-2 bg-primary-500/10 rounded-lg text-primary-500">
 <Phone className="w-4 h-4" />
 </div>
 <div>
 <p className="text-[10px] font-semibold uppercase tracking-[0.1em]" style={{ color: 'rgba(240,238,232,0.4)' }}>Phone</p>
 <p className="font-medium text-sidebar-fg font-mono text-sm">{caseData.clientPhone || 'N/A'}</p>
 </div>
 </div>
 <div className="flex items-center gap-3">
 <div className="p-2 bg-primary-500/10 rounded-lg text-primary-500">
 <Shield className="w-4 h-4" />
 </div>
 <div>
 <p className="text-[10px] font-semibold uppercase tracking-[0.1em]" style={{ color: 'rgba(240,238,232,0.4)' }}>Examiner</p>
 <p className="font-medium text-sidebar-fg">
 {(caseData.tasks.find((t: ExtendedTask) => t.status !== 'COMPLETED') || caseData.tasks[0])?.assignee?.name || 'Unassigned'}
 </p>
 </div>
 </div>
 <div className="flex items-center gap-3">
 <div className="p-2 bg-primary-500/10 rounded-lg text-primary-500">
 <User className="w-4 h-4" />
 </div>
 <div>
 <p className="text-[10px] font-semibold uppercase tracking-[0.1em]" style={{ color: 'rgba(240,238,232,0.4)' }}>Claimant ID</p>
 <div className="flex items-center gap-2">
 {caseData.claimant ? (
 <a href={`/claimants/${caseData.claimant.claimantNumber}`} className="font-medium text-primary-500 font-mono hover:underline">
 #{caseData.claimant.claimantNumber}
 </a>
 ) : (
 <span className="font-medium font-mono italic" style={{ color: 'rgba(240,238,232,0.35)' }}>Not Linked</span>
 )}
 </div>
 {caseData.claimFamily ? (
 <button
 onClick={() => setIsLinkClaimsModalOpen(true)}
 className="mt-1 flex items-center gap-1 text-[10px] text-green-400 bg-green-400/10 px-1.5 py-0.5 rounded-full hover:bg-green-400/20 transition-colors"
 >
 <LinkIcon className="w-3 h-3" />
 {caseData.claimFamily.name || 'Family Linked'}
 </button>
 ) : (
 <button
 onClick={() => setIsLinkClaimsModalOpen(true)}
 className="mt-1 flex items-center gap-1 text-[10px] text-text-muted hover:text-primary-500 hover:bg-primary-500/10 px-1.5 py-0.5 rounded-full transition-colors border border-dashed border-sidebar hover:border-primary-500/40"
 >
 <Plus className="w-3 h-3" />
 Link Claims
 </button>
 )}
 </div>
 </div>
 <div className="flex items-center gap-3">
 <div className="p-2 bg-primary-500/10 rounded-lg text-primary-500">
 <BookUser className="w-4 h-4" />
 </div>
 <div>
 <p className="text-[10px] font-semibold uppercase tracking-[0.1em]" style={{ color: 'rgba(240,238,232,0.4)' }}>Program</p>
 <p className="font-medium text-sidebar-fg">{caseData.program || 'N/A'}</p>
 </div>
 </div>
 </div>
 </div>

 {/* Navigation Tabs */}
 <div className={cn(
 "relative z-10 mx-auto px-4 sm:px-6 lg:px-8 transition-all duration-300",
 ['decisioning', 'timeline', 'tasks', 'documents'].includes(activeTab) ? "max-w-full" : "max-w-7xl"
 )}>
 <div
 role="tablist"
 aria-label="Case Sections"
 className="flex space-x-6 overflow-x-auto scrollbar-hide"
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
 flex items-center gap-1.5 py-3.5 px-1 border-b-2 text-[11px] font-semibold uppercase tracking-[0.1em] whitespace-nowrap transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-[#0D9488]
 ${activeTab === tab.id
 ? 'border-primary-500 text-primary-500'
 : 'border-transparent hover:border-primary-500/30'
 }
 `}
 style={activeTab === tab.id ? {} : { color: 'rgba(240,238,232,0.45)' }}
 >
 <tab.icon className="w-3.5 h-3.5" />
 {tab.label}
 {tab.id === 'tasks' && caseData.tasks.filter((t: ExtendedTask) => t.status !== 'COMPLETED' && t.status !== 'CANCELLED').length > 0 && (
 <span className="ml-1 py-0.5 px-1.5 bg-primary-500/20 text-primary-500 text-[10px] rounded-full">
 {caseData.tasks.filter((t: ExtendedTask) => t.status !== 'COMPLETED' && t.status !== 'CANCELLED').length}
 </span>
 )}
 </button>
 ))}
 </div>
 </div>
 {/* Hairline divider */}
 <div aria-hidden style={{ height: 1, background: 'linear-gradient(to right,transparent,rgba(13,148,136,0.4),transparent)' }} />
 </div>

 {/* Main Content Area */}
 <div className="bg-background min-h-[calc(100vh-200px)]">
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
 className="grid grid-cols-1 lg:grid-cols-3 gap-6"
 >
 {/* Left Column: Summary & Quick Actions */}
 <div className="lg:col-span-2 space-y-5">
 {/* Summary Card */}
 <div className="bg-surface rounded-xl border border-border p-6 shadow-[0_1px_2px_rgba(28,26,23,0.04)]">
 <h2 className="text-base font-semibold text-text-primary mb-4">Case Summary</h2>
 <dl className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-5">
 <div>
 <dt className="text-[11px] font-semibold uppercase tracking-[0.08em] text-text-muted">Claim Number</dt>
 <dd className="mt-1 text-sm text-text-primary font-mono">{caseData.caseNumber}</dd>
 </div>
 <div>
 <dt className="text-[11px] font-semibold uppercase tracking-[0.08em] text-text-muted">Status</dt>
 <dd className="mt-1">
 <span className={`px-2 py-1 text-xs font-medium rounded-full ${getStatusColor(caseData.status)}`}>
 {caseData.status}
 </span>
 </dd>
 </div>

 {/* Medical/Reason */}
 {caseData.medicalCondition && (
 <div className="sm:col-span-2">
 <dt className="text-[11px] font-semibold uppercase tracking-[0.08em] text-text-muted">Medical Condition / Reason</dt>
 <dd className="mt-1 text-sm text-text-primary bg-red-50 p-2 rounded border border-red-100">
 {caseData.medicalCondition}
 </dd>
 </div>
 )}

 {/* Program & Venue */}
 {caseData.program && (
 <div>
 <dt className="text-[11px] font-semibold uppercase tracking-[0.08em] text-text-muted">Program</dt>
 <dd className="mt-1 text-sm text-text-primary">{caseData.program}</dd>
 </div>
 )}
 {caseData.venue && (
 <div>
 <dt className="text-[11px] font-semibold uppercase tracking-[0.08em] text-text-muted">Venue</dt>
 <dd className="mt-1 text-sm text-text-primary">{caseData.venue}</dd>
 </div>
 )}

 {/* Dates */}
 {caseData.preferredStartDate && (
 <div>
 <dt className="text-[11px] font-semibold uppercase tracking-[0.08em] text-text-muted">Preferred Start Date</dt>
 <dd className="mt-1 text-sm text-text-primary">{caseData.preferredStartDate}</dd>
 </div>
 )}
 <div>
 <dt className="text-[11px] font-semibold uppercase tracking-[0.08em] text-text-muted">Medical Due Date</dt>
 <dd className="mt-1">
 <input
 type="date"
 value={medicalDueDate}
 onChange={e => saveMedicalDueDate(e.target.value)}
 disabled={savingMedDue}
 className="text-sm text-text-primary bg-transparent border border-border rounded px-2 py-0.5 disabled:opacity-50 focus:outline-none focus:border-primary-500"
 />
 </dd>
 </div>
 <div>
 <dt className="text-[11px] font-semibold uppercase tracking-[0.08em] text-text-muted">Projected Return</dt>
 <dd className="mt-1 text-sm text-text-primary">{formatDate(caseData.closedAt)}</dd>
 </div>

 <div>
 <dt className="text-[11px] font-semibold uppercase tracking-[0.08em] text-text-muted">Category</dt>
 <dd className="mt-1 text-sm text-text-primary">{caseData.category || 'N/A'}</dd>
 </div>

 <div className="sm:col-span-2">
 <dt className="text-[11px] font-semibold uppercase tracking-[0.08em] text-text-muted">Description</dt>
 <dd className="mt-1 text-sm text-text-primary bg-surface-raised p-3 rounded-lg border border-border">
 {caseData.description || 'No description provided.'}
 </dd>
 </div>
 </dl>
 </div>

 {/* Recent Timeline */}
 <div className="bg-surface rounded-xl border border-border p-6 shadow-[0_1px_2px_rgba(28,26,23,0.04)]">
 <div className="flex items-center justify-between mb-4">
 <h2 className="text-base font-semibold text-text-primary">Recent Activity</h2>
 <button onClick={() => setActiveTab('notes')} className="text-sm text-primary-500 hover:text-primary-600">
 View All
 </button>
 </div>
 <div className="flow-root">
 <ul className="-mb-8">
 {visibleNotes.slice(0, 3).map((note: ExtendedNote, idx: number) => (
 <li key={note.id}>
 <div className="relative pb-8">
 {idx !== 2 && (
 <span className="absolute top-4 left-4 -ml-px h-full w-0.5 bg-border" aria-hidden="true" />
 )}
 <div className="relative flex space-x-3">
 <div className={`h-8 w-8 rounded-full flex items-center justify-center ring-8 ring-[#ffffff] ${note.noteType === 'AUDIT' ? 'bg-amber-100' : 'bg-primary-500/10'}`}>
 {note.noteType === 'AUDIT' ? (
 <Shield className="w-4 h-4 text-amber-600" />
 ) : (
 <FileText className="w-4 h-4 text-primary-500" />
 )}
 </div>
 <div className="min-w-0 flex-1 pt-1.5 flex justify-between space-x-4">
 <div>
 <p className="text-sm text-text-muted">
 Note added by <span className="font-medium text-text-primary">{note.author.name}</span>
 </p>
 <p className="mt-1 text-sm text-text-primary line-clamp-2">{note.content}</p>
 </div>
 <div className="text-right text-sm whitespace-nowrap text-text-muted">
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
 <div className="space-y-5">
 {/* Urgent Tasks */}
 <div className="bg-surface rounded-xl border border-border p-6 shadow-[0_1px_2px_rgba(28,26,23,0.04)]">
 <h2 className="text-base font-semibold text-text-primary mb-4 flex items-center gap-2">
 <AlertTriangle className="w-4 h-4 text-amber-500" />
 Priority Tasks
 </h2>
 <div className="space-y-2.5">
 {caseData.tasks.filter((t: ExtendedTask) => t.status !== 'COMPLETED').slice(0, 5).map((task: ExtendedTask) => (
 <div key={task.id} className="p-3 bg-surface-raised rounded-lg flex items-start gap-3">
 <input
 type="checkbox"
 className="mt-1 rounded border-border-strong text-primary-500 focus:ring-[#0D9488]"
 aria-label={`Mark ${task.title} as complete`}
 onChange={() => handleTaskStatusChange(task.id, 'COMPLETED')}
 />
 <div className="flex-1">
 <p className="text-sm font-medium text-text-primary">{task.title}</p>
 <p className="text-xs text-text-muted mt-0.5">Due {formatDate(task.dueDate)}</p>
 </div>
 <span className={`px-2 py-0.5 text-xs rounded-full ${(priorityColors as any)[task.priority] || 'bg-surface-raised'}`}>
 {task.priority}
 </span>
 </div>
 ))}
 {caseData.tasks.length === 0 && (
 <p className="text-sm text-text-muted text-center py-4">No pending tasks</p>
 )}
 </div>
 <button
 onClick={() => setIsAddTaskModalOpen(true)}
 className="w-full mt-4 py-2 border border-dashed border-border-strong rounded-lg text-sm text-text-muted hover:border-primary-500 hover:text-primary-500 transition-colors"
 >
 + Add Quick Task
 </button>
 </div>

 {/* Client Contact Card */}
 <div className="bg-surface rounded-xl border border-border p-6 shadow-[0_1px_2px_rgba(28,26,23,0.04)]">
 <h3 className="font-semibold text-base text-text-primary mb-4">Contact Client</h3>
 <div className="space-y-3">
 <div className="flex items-center gap-3 p-3 bg-surface-raised rounded-lg">
 <Phone className="w-4 h-4 text-text-muted" />
 <div>
 <p className="text-[11px] text-text-muted">Phone</p>
 <p className="font-mono text-sm text-text-primary">{caseData.clientPhone || 'No number'}</p>
 </div>
 <button
 onClick={() => { setNoteModalDefaultType('PHONE_CALL'); setIsAddNoteModalOpen(true); }}
 title="Log a call"
 className="ml-auto p-2 text-text-muted hover:text-primary-500 hover:bg-primary-500/10 rounded-full transition-colors"
 >
 <Phone className="w-4 h-4" />
 </button>
 </div>
 <div className="flex items-center gap-3 p-3 bg-surface-raised rounded-lg">
 <Mail className="w-4 h-4 text-text-muted" />
 <div>
 <p className="text-[11px] text-text-muted">Email</p>
 <p className="truncate max-w-[150px] text-sm text-text-primary">{caseData.clientEmail || 'No email'}</p>
 </div>
 <button
 onClick={() => {
 if (!caseData.clientEmail) return;
 const params = new URLSearchParams({
 compose: 'true',
 externalEmail: caseData.clientEmail,
 externalName: caseData.clientName || '',
 caseId: caseData.id,
 });
 nextRouter.push(`/messages?${params.toString()}`);
 }}
 disabled={!caseData.clientEmail}
 title="Send email"
 className="ml-auto p-2 text-text-muted hover:text-primary-500 hover:bg-primary-500/10 rounded-full transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
 >
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
 <div className="flex items-center justify-between mb-5">
 <h2 className="text-lg font-semibold text-text-primary">Case Notes</h2>
 <div className="flex gap-2.5">
 <div className="relative">
 <input
 type="text"
 placeholder="Search notes..."
 className="pl-9 pr-4 py-2 border border-border rounded-lg bg-surface text-sm text-text-primary placeholder-text-muted focus:outline-none focus:ring-2 focus:ring-primary-500/30 focus:border-primary-500"
 />
 <Search className="w-4 h-4 text-text-muted absolute left-3 top-2.5" />
 </div>
 <button
 onClick={() => setIsAddNoteModalOpen(true)}
 className="flex items-center gap-2 px-4 py-2 bg-primary-500 hover:bg-primary-600 text-white text-sm font-semibold rounded-lg transition-colors"
 >
 <Plus className="w-4 h-4" />
 Add Note
 </button>
 </div>
 </div>

 <div className="space-y-3">
 {visibleNotes.length === 0 ? (
 <div className="text-center py-12 bg-surface rounded-xl border border-border">
 <div className="w-16 h-16 bg-surface-raised rounded-full flex items-center justify-center mx-auto mb-4">
 <FileText className="w-8 h-8 text-border-strong" />
 </div>
 <h3 className="text-base font-medium text-text-primary">No notes yet</h3>
 <p className="text-text-muted mt-1 text-sm">Start by adding a new note to this case.</p>
 </div>
 ) : (
 visibleNotes.map((note: ExtendedNote) => {
 const isAuditNote = note.noteType === 'AUDIT';
 return (
 <div key={note.id} className={cn(
 "rounded-xl border p-5 shadow-[0_1px_2px_rgba(28,26,23,0.04)]",
 isAuditNote
 ? "border-amber-300 bg-amber-50/60"
 : "bg-surface border-border"
 )}>
 {isAuditNote && (
 <div className="flex items-center gap-2 mb-3 text-amber-600">
 <Shield className="w-4 h-4" />
 <span className="text-xs font-bold uppercase tracking-wide">Audit Note</span>
 </div>
 )}
 <div className="flex items-center justify-between mb-3">
 <div className="flex items-center gap-2.5">
 <div className={cn(
 "p-1.5 rounded-lg",
 isAuditNote ? 'bg-amber-100 text-amber-700' :
 note.noteType === 'PHONE_CALL' ? 'bg-green-100 text-green-700' : 'bg-primary-500/10 text-primary-500'
 )}>
 {isAuditNote ? <Shield className="w-3.5 h-3.5" /> :
 note.noteType === 'PHONE_CALL' ? <Phone className="w-3.5 h-3.5" /> : <FileText className="w-3.5 h-3.5" />}
 </div>
 <span className="text-sm font-medium text-text-primary capitalize">
 {(note.noteType || 'NOTE').replace('_', ' ').toLowerCase()}
 </span>
 </div>
 <div className="relative">
 <button
 onClick={() => setNoteMenuOpen(noteMenuOpen === note.id ? null : note.id)}
 className="text-border-strong hover:text-text-secondary p-1 rounded-lg hover:bg-surface-raised transition-colors"
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
 <div className="absolute right-0 mt-2 w-48 bg-surface rounded-xl shadow-lg border border-border z-50 py-1">
 <button
 onClick={() => handleCopyNote(note.content)}
 className="w-full text-left px-4 py-2 text-sm text-text-primary hover:bg-surface-raised flex items-center gap-2"
 >
 <Copy className="w-4 h-4" />
 Copy Note
 </button>
 {isNoteEditable(note.createdAt) && (note.authorId === currentUser.id || isAdmin) && (
 <button
 onClick={() => handleEditNote(note)}
 className="w-full text-left px-4 py-2 text-sm text-text-primary hover:bg-surface-raised flex items-center gap-2"
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
 <p className="text-text-secondary whitespace-pre-wrap text-sm">{note.content}</p>
 {note.attachedDocument && (
 <div className="mt-3 p-3 bg-surface-raised rounded-lg flex items-center gap-3">
 <FileText className="w-4 h-4 text-text-muted" />
 <span className="text-sm text-text-secondary">{note.attachedDocument.fileName}</span>
 <button className="ml-auto text-primary-500 hover:text-primary-600 text-sm">Download</button>
 </div>
 )}
 <div className="flex items-center gap-2 mt-3 text-xs text-text-muted">
 <span className="font-medium text-text-secondary">{note.author.name}</span>
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
 <div className="bg-surface rounded-xl border border-border p-8 shadow-[0_1px_2px_rgba(28,26,23,0.04)]">
 <div className="flex items-center gap-3 mb-8">
 <div className="relative inline-block text-left">
 <button
 onClick={() => setIsExportMenuOpen(!isExportMenuOpen)}
 className="px-3 py-1.5 text-sm font-semibold text-primary-500 bg-primary-500/10 hover:bg-primary-500/20 rounded-lg transition-colors border border-primary-500/20 flex items-center gap-2"
 >
 <Download className="w-4 h-4" />
 Export
 <ChevronDown className={`w-3 h-3 transition-transform ${isExportMenuOpen ? 'rotate-180' : ''}`} />
 </button>

 {isExportMenuOpen && (
 <>
 <div className="fixed inset-0 z-10" onClick={() => setIsExportMenuOpen(false)} />
 <div className="absolute left-0 mt-2 w-48 bg-surface rounded-xl shadow-lg border border-border z-20 py-1 origin-top-left">
 <button
 onClick={() => handleExport('PDF')}
 className="w-full text-left px-4 py-2 text-sm text-text-primary hover:bg-surface-raised flex items-center gap-2"
 >
 <File className="w-4 h-4 text-red-500" />
 Export as PDF
 </button>
 <button
 onClick={() => handleExport('WORD')}
 className="w-full text-left px-4 py-2 text-sm text-text-primary hover:bg-surface-raised flex items-center gap-2"
 >
 <FileText className="w-4 h-4 text-primary-500" />
 Export as Word
 </button>
 <button
 onClick={() => handleExport('EXCEL')}
 className="w-full text-left px-4 py-2 text-sm text-text-primary hover:bg-surface-raised flex items-center gap-2"
 >
 <Table className="w-4 h-4 text-green-600" />
 Export as Excel
 </button>
 </div>
 </>
 )}
 </div>
 <h2 className="text-lg font-semibold text-text-primary">Case History & Audit Log</h2>
 </div>
 <TimelineView caseId={caseData.id} />
 </div>
 </div>
 )
 }

 {/* TASKS TAB */}
 {
 activeTab === 'tasks' && (
 <div className="space-y-5">
 <div className="flex items-center justify-between">
 <h2 className="text-lg font-semibold text-text-primary">Tasks</h2>
 <div className="flex gap-2">
 <button
 onClick={() => setIsAddTaskModalOpen(true)}
 className="flex items-center gap-2 px-4 py-2 bg-primary-500 hover:bg-primary-600 text-white text-sm font-semibold rounded-lg transition-colors"
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
 <div className="space-y-5">
 <div className="flex items-center justify-between">
 <h2 className="text-lg font-semibold text-text-primary">Documents</h2>
 <div className="flex items-center gap-2">
 <button
 onClick={openEmailUpload}
 className="flex items-center gap-2 px-4 py-2 bg-surface border border-border hover:bg-surface-raised text-text-secondary text-sm font-medium rounded-lg transition-colors"
 >
 <Mail className="w-4 h-4" />
 Upload Email
 </button>
 <button
 onClick={() => { setUploadEmailMode(false); setUploadCategory('OTHER'); setIsUploadModalOpen(true); }}
 className="flex items-center gap-2 px-4 py-2 bg-primary-500 hover:bg-primary-600 text-white text-sm font-semibold rounded-lg transition-colors"
 >
 <Upload className="w-4 h-4" />
 Upload Document
 </button>
 </div>
 </div>

 {/* Post-upload DCN banner */}
 {lastUploadedDCN && (
 <div className="flex items-center justify-between gap-4 p-4 bg-green-50 border border-green-200 rounded-xl">
 <div className="flex items-center gap-3">
 <Mail className="w-5 h-5 text-green-600 shrink-0" />
 <div>
 <p className="text-sm font-medium text-green-800">Email uploaded successfully</p>
 <p className="text-xs text-green-600 mt-0.5">
 DCN assigned: <code className="font-mono font-semibold">{lastUploadedDCN}</code>
 </p>
 </div>
 </div>
 <div className="flex items-center gap-2 shrink-0">
 <button
 onClick={() => {
 navigator.clipboard.writeText(lastUploadedDCN);
 setDcnCopied(true);
 setTimeout(() => setDcnCopied(false), 2000);
 }}
 className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium bg-green-600 hover:bg-green-700 text-white rounded-lg transition-colors"
 >
 <Copy className="w-3.5 h-3.5" />
 {dcnCopied ? 'Copied!' : 'Copy DCN'}
 </button>
 <button onClick={() => setLastUploadedDCN(null)} className="p-1.5 text-green-600 hover:text-green-800 rounded-lg transition-colors">
 <X className="w-4 h-4" />
 </button>
 </div>
 </div>
 )}

 {caseData.documents.length === 0 ? (
 <div className="bg-surface rounded-xl border border-border p-12 text-center">
 <FolderOpen className="w-12 h-12 text-border-strong mx-auto mb-4" />
 <p className="text-text-muted text-sm">No documents uploaded yet</p>
 </div>
 ) : (
 <div className="bg-surface rounded-xl border border-border overflow-hidden shadow-[0_1px_2px_rgba(28,26,23,0.04)]">
 <table className="w-full">
 <thead className="bg-background border-b border-border">
 <tr className="text-left text-[10px] font-semibold text-text-muted uppercase tracking-[0.1em]">
 <th className="px-6 py-3">Document</th>
 <th className="px-6 py-3">DCN</th>
 <th className="px-6 py-3">Category</th>
 <th className="px-6 py-3">Size</th>
 <th className="px-6 py-3">Uploaded</th>
 <th className="px-6 py-3">Actions</th>
 </tr>
 </thead>
 <tbody className="divide-y divide-[#F3F1EC]">
 {caseData.documents.map((doc: ExtendedDocument) => (
 <tr key={doc.id} className="hover:bg-background transition-colors">
 <td className="px-6 py-4">
 <div className="flex items-center gap-3">
 <FileText className="w-4 h-4 text-border-strong" />
 <span className="font-medium text-text-primary text-sm">{doc.fileName}</span>
 </div>
 </td>
 <td className="px-6 py-4">
 <code className="text-sm font-mono text-primary-500 bg-primary-500/10 px-2 py-1 rounded">
 {doc.documentControlNumber}
 </code>
 </td>
 <td className="px-6 py-4">
 <span className={`px-2 py-1 text-xs font-medium rounded-full ${(documentCategoryColors as any)[doc.category] || 'bg-surface-raised text-text-primary'}`}>
 {doc.category}
 </span>
 </td>
 <td className="px-6 py-4 text-sm text-text-muted">
 {formatFileSize(doc.fileSize)}
 </td>
 <td className="px-6 py-4 text-sm text-text-muted">
 <div>{formatDate(doc.createdAt)}</div>
 <div className="text-xs">by {doc.uploadedBy.name}</div>
 </td>
 <td className="px-6 py-4">
 {confirmingDeleteId === doc.id ? (
 <div className="flex items-center gap-2">
 <span className="text-xs text-red-600">
 {doc.annotationCount > 0
 ? `Has ${doc.annotationCount} annotation(s). Delete permanently?`
 : 'Delete permanently?'}
 </span>
 <button
 onClick={() => setConfirmingDeleteId(null)}
 aria-label={`Cancel delete ${doc.fileName}`}
 className="px-2 py-1 text-xs text-text-secondary hover:text-text-primary border border-border rounded transition-colors"
 >
 Cancel
 </button>
 <button
 onClick={() => handleDeleteDocument(doc.id)}
 disabled={deletingDocumentId === doc.id}
 aria-label={`Confirm delete ${doc.fileName}`}
 className="px-2 py-1 text-xs text-white bg-red-600 hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed rounded transition-colors"
 >
 {deletingDocumentId === doc.id ? 'Deleting…' : 'Delete'}
 </button>
 </div>
 ) : (
 <div className="flex items-center gap-1">
 <button
 onClick={() => setViewingDocument(doc)}
 className="p-2 text-text-muted hover:text-primary-500 hover:bg-primary-500/10 rounded-lg transition-colors"
 title="View"
 aria-label={`View ${doc.fileName}`}
 >
 <Eye className="w-4 h-4" />
 </button>
 <button
 onClick={() => handleDownloadDocument(doc.id, doc.fileName, doc.fileType)}
 className="p-2 text-text-muted hover:text-primary-500 hover:bg-primary-500/10 rounded-lg transition-colors"
 title="Download"
 aria-label={`Download ${doc.fileName}`}
 >
 <Download className="w-4 h-4" />
 </button>
 <button
 onClick={() => setConfirmingDeleteId(doc.id)}
 className="p-2 text-text-muted hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
 title="Delete"
 aria-label={`Delete ${doc.fileName}`}
 >
 <Trash2 className="w-4 h-4" />
 </button>
 </div>
 )}
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
 <div className="space-y-5">
 {/* Claimant Contact Info */}
 <div className="bg-surface rounded-xl border border-border p-6 shadow-[0_1px_2px_rgba(28,26,23,0.04)]">
 <h2 className="text-base font-semibold text-text-primary mb-4">Claimant Contact Info</h2>
 <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
 {/* Phone */}
 <div className="flex items-center gap-3 p-3 bg-surface-raised rounded-lg">
 <Phone className="w-4 h-4 text-text-muted shrink-0" />
 <div className="flex-1 min-w-0">
 <p className="text-[11px] text-text-muted mb-1">Phone</p>
 {editingContactField === 'phone' ? (
 <div className="flex items-center gap-2">
 <input
 type="tel"
 value={editContactPhone}
 onChange={e => setEditContactPhone(e.target.value)}
 onKeyDown={e => { if (e.key === 'Enter') saveContactField('phone'); if (e.key === 'Escape') cancelEditContact(); }}
 className="flex-1 px-2 py-1 text-sm border border-primary-500 rounded bg-surface focus:outline-none focus:ring-2 focus:ring-primary-500/30"
 autoFocus
 disabled={savingContactField}
 />
 <button onClick={() => saveContactField('phone')} disabled={savingContactField} className="text-xs px-2 py-1 bg-primary-500 text-white rounded hover:bg-primary-600 disabled:opacity-50 transition-colors">Save</button>
 <button onClick={cancelEditContact} disabled={savingContactField} className="text-xs px-2 py-1 bg-border text-text-secondary rounded hover:bg-border-strong transition-colors">Cancel</button>
 </div>
 ) : (
 <div className="flex items-center justify-between">
 <p className="font-mono text-sm text-text-primary">{caseData.clientPhone || <span className="text-border-strong italic text-sm font-normal">Not set</span>}</p>
 <button onClick={() => startEditContact('phone')} className="ml-2 p-1 text-border-strong hover:text-primary-500 hover:bg-primary-500/10 rounded transition-colors">
 <Edit2 className="w-3.5 h-3.5" />
 </button>
 </div>
 )}
 </div>
 </div>
 {/* Email */}
 <div className="flex items-center gap-3 p-3 bg-surface-raised rounded-lg">
 <Mail className="w-4 h-4 text-text-muted shrink-0" />
 <div className="flex-1 min-w-0">
 <p className="text-[11px] text-text-muted mb-1">Email</p>
 {editingContactField === 'email' ? (
 <div className="flex items-center gap-2">
 <input
 type="email"
 value={editContactEmail}
 onChange={e => setEditContactEmail(e.target.value)}
 onKeyDown={e => { if (e.key === 'Enter') saveContactField('email'); if (e.key === 'Escape') cancelEditContact(); }}
 className="flex-1 px-2 py-1 text-sm border border-primary-500 rounded bg-surface focus:outline-none focus:ring-2 focus:ring-primary-500/30"
 autoFocus
 disabled={savingContactField}
 />
 <button onClick={() => saveContactField('email')} disabled={savingContactField} className="text-xs px-2 py-1 bg-primary-500 text-white rounded hover:bg-primary-600 disabled:opacity-50 transition-colors">Save</button>
 <button onClick={cancelEditContact} disabled={savingContactField} className="text-xs px-2 py-1 bg-border text-text-secondary rounded hover:bg-border-strong transition-colors">Cancel</button>
 </div>
 ) : (
 <div className="flex items-center justify-between">
 <p className="text-sm text-text-primary truncate">{caseData.clientEmail || <span className="text-border-strong italic text-sm font-normal">Not set</span>}</p>
 <button onClick={() => startEditContact('email')} className="ml-2 p-1 text-border-strong hover:text-primary-500 hover:bg-primary-500/10 rounded transition-colors shrink-0">
 <Edit2 className="w-3.5 h-3.5" />
 </button>
 </div>
 )}
 </div>
 </div>
 </div>
 </div>

 <div className="flex items-center justify-between">
 <h2 className="text-lg font-semibold text-text-primary">Address Book</h2>
 <button
 onClick={() => setIsAddContactModalOpen(true)}
 className="flex items-center gap-2 px-4 py-2 bg-primary-500 hover:bg-primary-600 text-white text-sm font-semibold rounded-lg transition-colors"
 >
 <Plus className="w-4 h-4" />
 Add Contact
 </button>
 </div>

 {caseData.contacts.length === 0 ? (
 <div className="bg-surface rounded-xl border border-border p-12 text-center">
 <BookUser className="w-12 h-12 text-border-strong mx-auto mb-4" />
 <p className="text-text-muted text-sm">No contacts added yet</p>
 </div>
 ) : (
 <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
 {caseData.contacts.map((contact: Contact) => (
 <div key={contact.id} className="bg-surface rounded-xl border border-border p-5 shadow-[0_1px_2px_rgba(28,26,23,0.04)]">
 <div className="flex items-start justify-between">
 <div>
 <span className={`px-2 py-1 text-xs font-medium rounded-full ${(contactTypeColors as any)[contact.type] || 'bg-surface-raised'}`}>
 {contact.type}
 </span>
 <h3 className="font-semibold text-text-primary mt-2">{contact.name}</h3>
 </div>
 <button className="p-2 text-border-strong hover:text-primary-500 hover:bg-primary-500/10 rounded-lg transition-colors">
 <Edit2 className="w-4 h-4" />
 </button>
 </div>
 <div className="space-y-2 mt-4 text-sm">
 <div className="flex items-center gap-2 text-text-secondary">
 <Phone className="w-4 h-4" />
 <span>{contact.phone}</span>
 </div>
 {contact.email && (
 <div className="flex items-center gap-2 text-text-secondary">
 <span className="w-4 h-4 text-center">@</span>
 <span>{contact.email}</span>
 </div>
 )}
 {contact.address && (
 <p className="text-text-muted mt-2">{contact.address}</p>
 )}
 {contact.notes && (
 <p className="text-text-muted italic mt-2">{contact.notes}</p>
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
 <div className="mb-5">
 <h2 className="text-lg font-semibold text-text-primary mb-1">Portal Messages</h2>
 <p className="text-sm text-text-muted">
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
 </main>
 </div>{/* /bg-background */}

 {/* MODALS */}
 < AddNoteModal
 isOpen={isAddNoteModalOpen}
 onClose={() => { setIsAddNoteModalOpen(false); setNoteModalDefaultType('GENERAL'); }}
 onSubmit={handleSubmitNote}
 claims={[{ id: caseId, caseNumber: caseData.caseNumber }]}
 coordinatorName={currentUser.name}
 userRole={currentUser.role as 'ADMIN' | 'AUDITOR' | 'COORDINATOR'}
 claimantNumber={caseData.claimant?.claimantNumber}
 defaultNoteType={noteModalDefaultType}
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

 {/* Upload Document / Email Modal */}
 {
 isUploadModalOpen && (
 <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
 <div className="bg-surface rounded-xl p-6 w-full max-w-md shadow-lg border border-border">
 <div className="flex items-center justify-between mb-4">
 <h3 className="text-base font-semibold text-text-primary flex items-center gap-2">
 {uploadEmailMode ? <><Mail className="w-4 h-4 text-primary-500" /> Upload Received Email</> : 'Upload Document'}
 </h3>
 <button
 onClick={() => {
 setIsUploadModalOpen(false);
 setUploadEmailMode(false);
 setUploadError(null);
 }}
 className="p-2 text-text-muted hover:text-text-primary rounded-lg transition-colors"
 >
 <X className="w-5 h-5" />
 </button>
 </div>

 {uploadEmailMode && (
 <p className="mb-4 text-sm text-text-muted">
 Upload a received email file (.eml or .msg). A DCN will be assigned automatically and shown after upload.
 </p>
 )}

 {uploadError && (
 <div className="mb-4 p-3 bg-red-50 text-red-700 text-sm rounded-lg border border-red-100">
 {uploadError}
 </div>
 )}

 <div className="space-y-4">
 {uploadEmailMode ? (
 <div className="flex items-center gap-2 px-3 py-2 bg-primary-500/10 border border-primary-500/20 rounded-lg text-sm text-primary-500">
 <Mail className="w-4 h-4 shrink-0" />
 Category: <span className="font-medium">Correspondence</span>
 </div>
 ) : (
 <div>
 <label className="block text-[11px] font-semibold uppercase tracking-[0.08em] text-text-muted mb-1.5">
 Category
 </label>
 <select
 value={uploadCategory}
 onChange={(e) => setUploadCategory(e.target.value)}
 className="w-full px-3 py-2 border border-border rounded-lg bg-surface text-text-primary focus:outline-none focus:ring-2 focus:ring-primary-500/30 focus:border-primary-500 text-sm"
 >
 <option value="MEDICAL">Medical</option>
 <option value="LEGAL">Legal</option>
 <option value="HR">HR</option>
 <option value="CORRESPONDENCE">Correspondence</option>
 <option value="OTHER">Other</option>
 </select>
 </div>
 )}

 <div>
 <label className="block text-[11px] font-semibold uppercase tracking-[0.08em] text-text-muted mb-1.5">
 {uploadEmailMode ? 'Select Email File (.eml or .msg)' : 'Select File'}
 </label>
 <input
 ref={fileInputRef}
 type="file"
 accept={uploadEmailMode ? '.eml,.msg' : undefined}
 className="w-full text-sm text-text-secondary file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-semibold file:bg-primary-500/10 file:text-primary-500 hover:file:bg-primary-500/20"
 />
 </div>
 </div>

 <div className="flex gap-3 mt-6">
 <button
 onClick={() => {
 setIsUploadModalOpen(false);
 setUploadEmailMode(false);
 setUploadError(null);
 }}
 className="flex-1 px-4 py-2 text-sm font-medium text-text-secondary bg-surface-raised hover:bg-border rounded-lg transition-colors"
 >
 Cancel
 </button>
 <button
 onClick={() => {
 const file = fileInputRef.current?.files?.[0];
 if (file) {
 handleUploadDocument(file);
 } else {
 setUploadError(uploadEmailMode ? 'Please select an .eml or .msg file' : 'Please select a file');
 }
 }}
 disabled={isUploading}
 className="flex-1 flex items-center justify-center gap-2 px-4 py-2 text-sm font-semibold text-white bg-primary-500 hover:bg-primary-600 disabled:opacity-50 rounded-lg transition-colors"
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
 currentUserName={currentUser.name ?? ''}
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
