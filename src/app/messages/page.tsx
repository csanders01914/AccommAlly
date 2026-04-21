'use client';
import { apiFetch } from '@/lib/api-client';
import DOMPurify from 'dompurify';
import { RichTextEditor } from '@/components/RichTextEditor';
import { LoadTemplateModal } from '@/components/modals/LoadTemplateModal';

import { useState, useEffect, useCallback, useRef, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { Sidebar } from '@/components/Sidebar';
import { CreateFolderModal } from '@/components/modals/CreateFolderModal';
import { SettingsModal } from '@/components/modals/SettingsModal';
import {
    ArrowLeft,
    Mail,
    Plus,
    Inbox,
    Send,
    Star,
    Archive,
    Search,
    Trash2,
    Reply,
    Forward,
    AlertTriangle,
    Globe,
    Calendar,
    X,
    FolderPlus,
    Folder,
    MoreHorizontal,
    Settings,
    Filter,
    FileText,
    Paperclip,
    FolderDown,
    Copy,
    CheckCircle,
    Highlighter,
    StickyNote,
    MessageSquare,
} from 'lucide-react';
import { AnnotationThreadPanel } from '@/components/AnnotationThreadPanel';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';

// Types
type BoxType = 'inbox' | 'sent' | 'starred' | 'archived' | 'junk' | 'trash' | 'folder';

interface MessageFolder {
    id: string;
    name: string;
    color: string;
    icon: string | null;
    position: number;
    _count?: { messages: number };
}

interface Message {
    id: string;
    subject: string;
    body: string;
    createdAt: string;
    read?: boolean;
    isRead?: boolean;
    starred: boolean;
    archived: boolean;
    sender: { id?: string; name: string; email: string };
    recipient: { id?: string; name: string; email: string };
    isExternal?: boolean;
    externalName?: string;
    externalEmail?: string;
    direction?: 'INBOUND' | 'OUTBOUND';
    case?: { id: string; caseNumber: string; clientName?: string } | null;
    attachments?: { id: string; filename: string; size: number; mimeType: string }[];
}

interface Case {
    id: string;
    caseNumber: string;
    clientName?: string;
}

interface UserData {
    id: string;
    name: string;
    email: string;
    role: 'ADMIN' | 'AUDITOR' | 'COORDINATOR'; // Updated to match Sidebar props
    emailSignature?: string;
}

interface ComposeData {
    recipientId: string;
    subject: string;
    body: string;
    caseId: string;
    replyToId: string;
    forwardedFromId: string;
    isExternal: boolean;
    externalEmail: string;
    externalName: string;
}

function MessagesContent() {
    const router = useRouter();
    const [activeBox, setActiveBox] = useState<BoxType>('inbox');
    const [messages, setMessages] = useState<Message[]>([]);
    const [selectedMessage, setSelectedMessage] = useState<Message | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');

    // Compose state
    const [isComposeOpen, setIsComposeOpen] = useState(false);
    const [composeMode, setComposeMode] = useState<'new' | 'reply' | 'forward'>('new');
    const [composeData, setComposeData] = useState<ComposeData>({
        recipientId: '',
        subject: '',
        body: '',
        caseId: '',
        replyToId: '',
        forwardedFromId: '',
        isExternal: false,
        externalEmail: '',
        externalName: ''
    });

    const [pendingAttachments, setPendingAttachments] = useState<File[]>([]);

    // User data
    const [currentUser, setCurrentUser] = useState<UserData | null>(null);
    const [users, setUsers] = useState<UserData[]>([]);
    const [cases, setCases] = useState<Case[]>([]);
    const [unreadCount, setUnreadCount] = useState(0);

    // Folders
    const [folders, setFolders] = useState<MessageFolder[]>([]);
    const [activeFolderId, setActiveFolderId] = useState<string | null>(null);
    const [showCreateFolderModal, setShowCreateFolderModal] = useState(false);
    const [dragOverFolderId, setDragOverFolderId] = useState<string | null>(null);
    const [dragOverBox, setDragOverBox] = useState<BoxType | null>(null);

    // Settings
    const [showSettingsModal, setShowSettingsModal] = useState(false);
    const [signature, setSignature] = useState('');

    // Auth check and load user
    useEffect(() => {
        const loadUser = async () => {
            try {
                const res = await apiFetch('/api/auth/me');
                if (!res.ok) {
                    router.push('/login');
                    return;
                }
                const data = await res.json();
                setCurrentUser(data.user);

                // Fetch unread count
                try {
                    const unreadRes = await apiFetch('/api/messages/unread-count', { cache: 'no-store' });
                    if (unreadRes.ok) {
                        const { count } = await unreadRes.json();
                        setUnreadCount(count);
                    }
                } catch (e) {
                    console.error('Failed to fetch unread count', e);
                }

                // Fetch custom folders
                try {
                    const foldersRes = await apiFetch('/api/messages/folders');
                    if (foldersRes.ok) {
                        const foldersData = await foldersRes.json();
                        setFolders(foldersData);
                    }
                } catch (e) {
                    console.error('Failed to fetch folders', e);
                }

            } catch (e) {
                console.error(e);
                router.push('/login');
            }
        };
        loadUser();
    }, [router]);

    const searchParams = useSearchParams();

    // Handle URL Actions
    useEffect(() => {
        if (searchParams.get('compose') === 'true') {
            const externalEmail = searchParams.get('externalEmail') || '';
            const externalName = searchParams.get('externalName') || '';
            const caseId = searchParams.get('caseId') || '';
            setComposeMode('new');
            setComposeData({
                recipientId: '',
                subject: '',
                body: signature ? `\n\n${signature}` : '',
                caseId,
                replyToId: '',
                forwardedFromId: '',
                isExternal: !!externalEmail,
                externalEmail,
                externalName,
            });
            setIsComposeOpen(true);
            router.replace('/messages', { scroll: false });
        }
    }, [searchParams, router]);

    // Fetch messages
    const fetchMessages = useCallback(async () => {
        setIsLoading(true);
        try {
            // For custom folders, fetch messages assigned to that folder
            if (activeBox === 'folder' && activeFolderId) {
                const res = await fetch(`/api/messages/folders/${activeFolderId}/messages`);
                if (res.ok) {
                    const data = await res.json();
                    setMessages(data);
                } else {
                    setMessages([]);
                }
                setIsLoading(false);
                return;
            }

            // For system boxes: API now supports 'inbox', 'sent', 'starred', 'archived', 'junk', 'trash' natively.
            const url = `/api/messages?box=${activeBox}`;
            const res = await fetch(url);
            if (res.ok) {
                const { data } = await res.json();
                setMessages(data);
            }
        } catch (e) {
            console.error(e);
        } finally {
            setIsLoading(false);
        }
    }, [activeBox, activeFolderId]);

    useEffect(() => {
        fetchMessages();
    }, [fetchMessages]);

    // Fetch users and cases for compose
    const fetchUsersAndCases = async () => {
        try {
            const [usersRes, casesRes] = await Promise.all([
                apiFetch('/api/admin/users'),
                apiFetch('/api/cases/search')
            ]);
            if (usersRes.ok) {
                const data = await usersRes.json();
                setUsers(Array.isArray(data) ? data : data.users || []);
            }
            if (casesRes.ok) {
                const data = await casesRes.json();
                setCases(data.cases || []);
            }
        } catch (e) {
            console.error(e);
        }
    };

    useEffect(() => {
        if (isComposeOpen) {
            fetchUsersAndCases();
        }
    }, [isComposeOpen]);

    // Handle message selection
    const handleSelectMessage = async (msg: Message) => {
        setSelectedMessage(msg);

        // Mark as read if it's unread AND we are the recipient
        // (Avoid marking Sent messages as read when we view them)
        const isRecipient = currentUser?.id && msg.recipient?.id === currentUser.id;

        if (!msg.isRead && isRecipient) {
            try {
                await fetch(`/api/messages/${msg.id}`, {
                    method: 'PATCH',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ read: true })
                });
                setMessages(prev => prev.map(m => m.id === msg.id ? { ...m, isRead: true } : m));

                // Update global unread count
                setUnreadCount(prev => Math.max(0, prev - 1));

                // Update folder counts
                const foldersRes = await apiFetch('/api/messages/folders');
                if (foldersRes.ok) setFolders(await foldersRes.json());
            } catch (e) {
                console.error(e);
            }
        }
    };

    // Star/unstar message
    const handleStar = async (msg: Message) => {
        try {
            await fetch(`/api/messages/${msg.id}`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ starred: !msg.starred })
            });
            setMessages(prev => prev.map(m => m.id === msg.id ? { ...m, starred: !m.starred } : m));
            if (selectedMessage?.id === msg.id) {
                setSelectedMessage({ ...msg, starred: !msg.starred });
            }
        } catch (e) {
            console.error(e);
        }
    };

    // Archive message
    const handleArchive = async (msg: Message) => {
        try {
            await fetch(`/api/messages/${msg.id}`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ archived: !msg.archived })
            });
            fetchMessages();
            setSelectedMessage(null);
        } catch (e) {
            console.error(e);
        }
    };

    // Delete message
    const handleDelete = async (msg: Message) => {
        if (!confirm('Are you sure you want to delete this message?')) return;
        try {
            await fetch(`/api/messages/${msg.id}`, { method: 'DELETE' });
            fetchMessages();
            setSelectedMessage(null);
        } catch (e) {
            console.error(e);
        }
    };

    // Reply to message
    const handleReply = (msg: Message) => {
        setComposeMode('reply');
        setComposeData({
            recipientId: activeBox === 'sent' ? (msg.recipient?.id || '') : (msg.sender?.id || ''), // Reply to original sender, or recipient if viewing sent
            subject: msg.subject?.startsWith('Re:') ? msg.subject : `Re: ${msg.subject || ''}`,
            body: signature ? `\n\n${signature}\n\nOn ${format(new Date(msg.createdAt), 'PPpp')}, ${msg.sender?.name || 'Unknown'} wrote:\n> ${msg.body.replace(/\n/g, '\n> ')}` : `\n\nOn ${format(new Date(msg.createdAt), 'PPpp')}, ${msg.sender?.name || 'Unknown'} wrote:\n> ${msg.body.replace(/\n/g, '\n> ')}`,
            caseId: msg.case?.id || '',
            replyToId: msg.id,
            forwardedFromId: '',
            isExternal: msg.isExternal || false,
            externalEmail: msg.externalEmail || '',
            externalName: msg.externalName || ''
        });
        setIsComposeOpen(true);
    };

    // Forward message
    const handleForward = (msg: Message) => {
        setComposeMode('forward');
        setComposeData({
            recipientId: '',
            subject: msg.subject?.startsWith('Fwd:') ? msg.subject : `Fwd: ${msg.subject || ''}`,
            body: signature ? `\n\n${signature}\n\n---------- Forwarded message ---------\nFrom: ${msg.sender?.name || 'Unknown'}\nDate: ${format(new Date(msg.createdAt), 'PPpp')}\nSubject: ${msg.subject}\nTo: ${msg.recipient?.name || 'Unknown'}\n\n${msg.body}` : `\n\n---------- Forwarded message ---------\nFrom: ${msg.sender?.name || 'Unknown'}\nDate: ${format(new Date(msg.createdAt), 'PPpp')}\nSubject: ${msg.subject}\nTo: ${msg.recipient?.name || 'Unknown'}\n\n${msg.body}`,
            caseId: msg.case?.id || '',
            replyToId: '',
            forwardedFromId: msg.id,
            isExternal: false,
            externalEmail: '',
            externalName: ''
        });
        setIsComposeOpen(true);
    };

    // Add to calendar
    const handleAddToCalendar = (msg: Message) => {
        // Implement calendar logic
        console.log('Add to calendar:', msg);
    };

    // Send message
    const handleSend = async () => {
        const isValid = composeData.isExternal
            ? (composeData.externalEmail && composeData.externalName && composeData.body)
            : (composeData.recipientId && composeData.body);

        if (!isValid) {
            alert('Please select a recipient and enter a message');
            return;
        }

        // Validate attachments client-side
        const MAX_FILE_SIZE = 10 * 1024 * 1024;
        if (pendingAttachments.length > 10) {
            alert('Maximum 10 attachments per message');
            return;
        }
        for (const file of pendingAttachments) {
            if (file.size > MAX_FILE_SIZE) {
                alert(`File "${file.name}" exceeds the 10MB limit`);
                return;
            }
        }

        try {
            const fd = new FormData();
            fd.append('recipientId', composeData.recipientId || '');
            fd.append('subject', composeData.subject || '');
            fd.append('body', composeData.body);
            fd.append('caseId', composeData.caseId || '');
            fd.append('replyToId', composeData.replyToId || '');
            fd.append('forwardedFromId', composeData.forwardedFromId || '');
            fd.append('isExternal', String(composeData.isExternal));
            fd.append('externalEmail', composeData.externalEmail || '');
            fd.append('externalName', composeData.externalName || '');
            for (const file of pendingAttachments) {
                fd.append('attachments', file);
            }

            // Do NOT pass Content-Type header — browser sets multipart boundary automatically for FormData
            const res = await apiFetch('/api/messages', { method: 'POST', body: fd });

            if (res.ok) {
                setIsComposeOpen(false);
                setComposeData({
                    recipientId: '', subject: '', body: '', caseId: '', replyToId: '', forwardedFromId: '',
                    isExternal: false, externalEmail: '', externalName: '',
                });
                setPendingAttachments([]);
                setComposeMode('new');
                if (activeBox === 'sent') fetchMessages();
            } else {
                const data = await res.json();
                alert(data.error || 'Failed to send message');
            }
        } catch (e) {
            console.error(e);
            alert('Failed to send message');
        }
    };

    // Save signature
    const handleSaveSignature = async () => {
        try {
            await fetch(`/api/users/${currentUser?.id}`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ emailSignature: signature })
            });
            setShowSettingsModal(false);
            alert('Signature saved!');
        } catch (e) {
            console.error(e);
        }
    };

    // New compose
    const handleNewMessage = () => {
        setComposeMode('new');
        setComposeData({
            recipientId: '',
            subject: '',
            body: signature ? `\n\n${signature}` : '',
            caseId: '',
            replyToId: '',
            forwardedFromId: '',
            isExternal: false,
            externalEmail: '',
            externalName: ''
        });
        setIsComposeOpen(true);
    };

    // Move Message
    const handleMoveMessage = async (messageId: string, targetFolderId: string) => {
        try {
            const res = await fetch(`/api/messages/${messageId}/move`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ folderId: targetFolderId })
            });

            if (res.ok) {
                // For 'starred', the message stays in its folder - just update the starred flag locally
                if (targetFolderId === 'starred') {
                    setMessages(prev => prev.map(m =>
                        m.id === messageId ? { ...m, starred: true } : m
                    ));
                } else if (activeBox === 'inbox' || activeBox === 'folder') {
                    // For other moves, remove from current view
                    setMessages(prev => prev.filter(m => m.id !== messageId));
                    if (selectedMessage?.id === messageId) setSelectedMessage(null);
                }

                // Refresh folders to update counts
                const foldersRes = await apiFetch('/api/messages/folders');
                if (foldersRes.ok) setFolders(await foldersRes.json());
            } else {
                console.error('Failed to move message');
            }
        } catch (e) {
            console.error(e);
        }
    };

    // Filter messages by search
    const filteredMessages = messages.filter(m =>
        !searchQuery ||
        m.subject?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        m.body.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (m.sender?.name || m.externalName || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
        (m.recipient?.name || '').toLowerCase().includes(searchQuery.toLowerCase())
    );

    const boxCounts = {
        inbox: messages.filter(m => !m.archived).length,
        unread: messages.filter(m => !m.isRead && !m.archived).length,
        starred: messages.filter(m => m.starred).length
    };

    const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

    return (
        <div className="flex min-h-screen app-background">
            {currentUser && <Sidebar user={currentUser} unreadCount={unreadCount} onToggle={setSidebarCollapsed} />}
            <div className={`flex-1 flex flex-col transition-all duration-300 ${sidebarCollapsed ? 'ml-16' : 'ml-64'}`}>
                {/* Header */}
                <div className="bg-[#ffffff] border border-[#E5E2DB] p-4 rounded-xl mx-6 mt-6 mb-2 shadow-sm flex items-center justify-between">
                    <h1 className="text-lg font-semibold text-[#1C1A17] flex items-center gap-2">
                        <Mail className="w-5 h-5 text-[#0D9488]" />
                        Secure Messages
                    </h1>
                    <div className="flex items-center gap-2">
                        <button
                            onClick={() => setShowSettingsModal(true)}
                            className="px-3 py-2 text-sm font-medium text-[#5C5850] hover:bg-[#F3F1EC] rounded-lg transition-colors"
                        >
                            Settings
                        </button>
                        <button
                            onClick={handleNewMessage}
                            className="px-4 py-2 bg-[#0D9488] hover:bg-[#0F766E] text-[#ffffff] rounded-lg text-sm font-semibold flex items-center gap-2 transition-colors"
                        >
                            <Plus className="w-4 h-4" />
                            New Message
                        </button>
                    </div>
                </div>

                {/* Main Content Area */}
                <div className="flex flex-1 overflow-hidden mx-6 mb-6 bg-[#ffffff] rounded-xl border border-[#E5E2DB] shadow-sm">
                    {/* Sidebar (Folders) */}
                    <div className="w-56 bg-[#F8F7F5] border-r border-[#E5E2DB] flex flex-col">
                        <div className="p-3 space-y-1">
                            <SidebarButton
                                icon={Inbox}
                                label="Inbox"
                                count={unreadCount}
                                active={activeBox === 'inbox' || dragOverBox === 'inbox'}
                                onClick={() => { setActiveBox('inbox'); setSelectedMessage(null); }}
                                onDragOver={(e) => { e.preventDefault(); setDragOverBox('inbox'); }}
                                onDragLeave={() => setDragOverBox(null)}
                                onDrop={(e) => {
                                    e.preventDefault();
                                    setDragOverBox(null);
                                    const id = e.dataTransfer.getData('messageId');
                                    if (id) handleMoveMessage(id, 'inbox');
                                }}
                            />
                            <SidebarButton
                                icon={Send}
                                label="Sent"
                                active={activeBox === 'sent'}
                                onClick={() => { setActiveBox('sent'); setSelectedMessage(null); }}
                            />
                            <SidebarButton
                                icon={Star}
                                label="Starred"
                                count={boxCounts.starred}
                                active={activeBox === 'starred' || dragOverBox === 'starred'}
                                onClick={() => { setActiveBox('starred'); setSelectedMessage(null); }}
                                onDragOver={(e) => { e.preventDefault(); setDragOverBox('starred'); }}
                                onDragLeave={() => setDragOverBox(null)}
                                onDrop={(e) => {
                                    e.preventDefault();
                                    setDragOverBox(null);
                                    const id = e.dataTransfer.getData('messageId');
                                    if (id) handleMoveMessage(id, 'starred');
                                }}
                            />
                            <SidebarButton
                                icon={Archive}
                                label="Archived"
                                active={activeBox === 'archived' || dragOverBox === 'archived'}
                                onClick={() => { setActiveBox('archived'); setActiveFolderId(null); setSelectedMessage(null); }}
                                onDragOver={(e) => { e.preventDefault(); setDragOverBox('archived'); }}
                                onDragLeave={() => setDragOverBox(null)}
                                onDrop={(e) => {
                                    e.preventDefault();
                                    setDragOverBox(null);
                                    const id = e.dataTransfer.getData('messageId');
                                    if (id) handleMoveMessage(id, 'archive'); // 'archive' matches backend system folder name
                                }}
                            />
                            <SidebarButton
                                icon={AlertTriangle}
                                label="Junk"
                                active={activeBox === 'junk' || dragOverBox === 'junk'}
                                onClick={() => { setActiveBox('junk'); setActiveFolderId(null); setSelectedMessage(null); }}
                                onDragOver={(e) => { e.preventDefault(); setDragOverBox('junk'); }}
                                onDragLeave={() => setDragOverBox(null)}
                                onDrop={(e) => {
                                    e.preventDefault();
                                    setDragOverBox(null);
                                    const id = e.dataTransfer.getData('messageId');
                                    if (id) handleMoveMessage(id, 'junk');
                                }}
                            />
                            <SidebarButton
                                icon={Trash2}
                                label="Trash"
                                active={activeBox === 'trash' || dragOverBox === 'trash'}
                                onClick={() => { setActiveBox('trash'); setActiveFolderId(null); setSelectedMessage(null); }}
                                onDragOver={(e) => { e.preventDefault(); setDragOverBox('trash'); }}
                                onDragLeave={() => setDragOverBox(null)}
                                onDrop={(e) => {
                                    e.preventDefault();
                                    setDragOverBox(null);
                                    const id = e.dataTransfer.getData('messageId');
                                    if (id) handleMoveMessage(id, 'trash');
                                }}
                            />
                        </div>

                        {/* Custom Folders Section */}
                        <div className="flex-1 border-t border-[#E5E2DB]">
                            <div className="p-3 pb-1 flex items-center justify-between">
                                <span className="text-[11px] font-semibold uppercase tracking-[0.1em] text-[#8C8880]">Folders</span>
                                <button
                                    onClick={() => setShowCreateFolderModal(true)}
                                    className="p-1 hover:bg-[#F3F1EC] rounded text-[#8C8880] hover:text-[#5C5850] transition-colors"
                                    title="Create folder"
                                >
                                    <FolderPlus className="w-4 h-4" />
                                </button>
                            </div>
                            <div className="px-3 space-y-1 pb-3">
                                {folders.length === 0 ? (
                                    <p className="text-xs text-[#8C8880] py-2 text-center">No custom folders</p>
                                ) : (
                                    folders.map(folder => (
                                        <button
                                            key={folder.id}
                                            onClick={() => {
                                                setActiveBox('folder');
                                                setActiveFolderId(folder.id);
                                                setSelectedMessage(null);
                                            }}
                                            onDragOver={(e) => {
                                                e.preventDefault();
                                                setDragOverFolderId(folder.id);
                                            }}
                                            onDragLeave={() => setDragOverFolderId(null)}
                                            onDrop={(e) => {
                                                e.preventDefault();
                                                setDragOverFolderId(null);
                                                const messageId = e.dataTransfer.getData('messageId');
                                                if (messageId) handleMoveMessage(messageId, folder.id);
                                            }}
                                            className={cn(
                                                "w-full text-left px-3 py-2 rounded-lg flex items-center gap-3 font-medium transition-colors text-sm border border-transparent",
                                                activeBox === 'folder' && activeFolderId === folder.id
                                                    ? "bg-[#0D9488]/10 text-[#0D9488] border-[#0D9488]/20"
                                                    : "text-[#5C5850] hover:bg-[#F3F1EC]",
                                                dragOverFolderId === folder.id && "bg-[#0D9488]/5 border-[#0D9488]/20"
                                            )}
                                        >
                                            <Folder className="w-4 h-4" style={{ color: folder.color }} />
                                            <span className="truncate flex-1">{folder.name}</span>
                                            {(folder._count?.messages ?? 0) > 0 && (
                                                <span className="text-xs bg-[#E5E2DB] text-[#5C5850] px-1.5 py-0.5 rounded-full">
                                                    {folder._count?.messages}
                                                </span>
                                            )}
                                        </button>
                                    ))
                                )}
                            </div>
                        </div>
                    </div>

                    {/* Message List */}
                    <div className="w-80 border-r border-[#E5E2DB] bg-[#ffffff] flex flex-col">
                        {/* Search */}
                        <div className="p-3 border-b border-[#E5E2DB]">
                            <div className="relative">
                                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#8C8880]" />
                                <input
                                    type="text"
                                    placeholder="Search messages…"
                                    value={searchQuery}
                                    onChange={e => setSearchQuery(e.target.value)}
                                    className="w-full pl-10 pr-4 py-2 bg-[#F8F7F5] border border-[#E5E2DB] rounded-lg text-sm text-[#1C1A17] placeholder-[#8C8880] focus:outline-none focus:ring-2 focus:ring-[#0D9488]/30 focus:border-[#0D9488] transition-colors"
                                />
                            </div>
                        </div>

                        {/* Messages */}
                        <div className="flex-1 overflow-y-auto">
                            {isLoading ? (
                                <div className="p-8 text-center text-[#8C8880]">Loading…</div>
                            ) : filteredMessages.length === 0 ? (
                                <div className="p-8 text-center text-[#8C8880] font-medium">No messages</div>
                            ) : (
                                <ul className="divide-y divide-[#F3F1EC]">
                                    {filteredMessages.map(msg => (
                                        <MessageListItem
                                            key={msg.id}
                                            message={msg}
                                            isSelected={selectedMessage?.id === msg.id}
                                            activeBox={activeBox}
                                            onClick={() => handleSelectMessage(msg)}
                                            onStar={() => handleStar(msg)}
                                        />
                                    ))}
                                </ul>
                            )}
                        </div>
                    </div>

                    {/* Reading Pane */}
                    <div className="flex-1 bg-[#F8F7F5] overflow-y-auto">
                        {isComposeOpen ? (
                            <ComposeView
                                mode={composeMode}
                                data={composeData}
                                users={users}
                                cases={cases}
                                currentUserId={currentUser?.id || ''}
                                onChange={setComposeData}
                                onSend={handleSend}
                                onClose={() => { setIsComposeOpen(false); setComposeMode('new'); setPendingAttachments([]); }}
                                pendingAttachments={pendingAttachments}
                                onAttach={files => setPendingAttachments(prev => [...prev, ...files])}
                                onRemoveAttachment={filename => setPendingAttachments(prev => prev.filter(f => f.name !== filename))}
                            />
                        ) : selectedMessage ? (
                            <MessageDetail
                                message={selectedMessage}
                                activeBox={activeBox}
                                onReply={() => handleReply(selectedMessage)}
                                onForward={() => handleForward(selectedMessage)}
                                onStar={() => handleStar(selectedMessage)}
                                onArchive={() => handleArchive(selectedMessage)}
                                onDelete={() => handleDelete(selectedMessage)}
                                onAddToCalendar={() => handleAddToCalendar(selectedMessage)}
                                currentUserId={currentUser?.id ?? ''}
                                currentUserName={currentUser?.name ?? ''}
                            />
                        ) : (
                            <div className="h-full flex items-center justify-center">
                                <div className="text-center p-8 bg-[#ffffff] rounded-xl border border-[#E5E2DB] shadow-sm">
                                    <Mail className="w-12 h-12 mx-auto mb-3 text-[#C8C4BB]" />
                                    <p className="text-base font-semibold text-[#1C1A17]">Select a message to read</p>
                                    <p className="text-sm text-[#8C8880] mt-1">Click on a message from the list to view details</p>
                                </div>
                            </div>
                        )}
                    </div>
                </div>

                {/* Settings Modal */}
                {showSettingsModal && (
                    <SettingsModal
                        isOpen={showSettingsModal}
                        signature={signature}
                        onSignatureChange={setSignature}
                        onSaveSignature={handleSaveSignature}
                        onClose={() => setShowSettingsModal(false)}
                        currentUserId={currentUser?.id || ''}
                    />
                )}

                {/* Create Folder Modal */}
                <CreateFolderModal
                    isOpen={showCreateFolderModal}
                    onClose={() => setShowCreateFolderModal(false)}
                    onSuccess={async () => {
                        // Refresh folders
                        try {
                            const res = await apiFetch('/api/messages/folders');
                            if (res.ok) {
                                const data = await res.json();
                                setFolders(data);
                            }
                        } catch (e) {
                            console.error('Failed to refresh folders', e);
                        }
                    }}
                />
            </div>
        </div>
    );
}

// Message Detail Component
function MessageDetail({
    message,
    activeBox,
    onReply,
    onForward,
    onStar,
    onArchive,
    onDelete,
    onAddToCalendar,
    currentUserId,
    currentUserName,
}: {
    message: Message;
    activeBox: BoxType;
    onReply: () => void;
    onForward: () => void;
    onStar: () => void;
    onArchive: () => void;
    onDelete: () => void;
    onAddToCalendar: () => void;
    currentUserId: string;
    currentUserName: string;
}) {
    const [savingToCase, setSavingToCase] = useState(false);
    const [savedDCN, setSavedDCN] = useState<string | null>(null);
    const [dcnCopied, setDcnCopied] = useState(false);
    const [saveError, setSaveError] = useState<string | null>(null);

    // Annotation state
    const [emailAnnotations, setEmailAnnotations] = useState<any[]>([]);
    const [selectionToolbar, setSelectionToolbar] = useState<{
        top: number; left: number;
        selectedText: string; selectionStart: number; selectionEnd: number;
    } | null>(null);
    const [selectedHighlightColor, setSelectedHighlightColor] = useState('#FFFF00');
    const [openEmailThreadId, setOpenEmailThreadId] = useState<string | null>(null);
    const [showEmailNotePanel, setShowEmailNotePanel] = useState(false);
    const emailBodyRef = useRef<HTMLDivElement>(null);

    const fetchEmailAnnotations = useCallback(async (msgId: string) => {
        try {
            const res = await fetch(`/api/messages/${msgId}/annotation-comments`);
            if (res.ok) setEmailAnnotations(await res.json());
        } catch {
            // ignore
        }
    }, []);

    useEffect(() => {
        setEmailAnnotations([]);
        setOpenEmailThreadId(null);
        setShowEmailNotePanel(false);
        fetchEmailAnnotations(message.id);
    }, [message.id, fetchEmailAnnotations]);

    const handleEmailMouseUp = useCallback(() => {
        if (!emailBodyRef.current) return;
        const selection = window.getSelection();
        if (!selection || selection.isCollapsed || !selection.toString().trim()) {
            setSelectionToolbar(null);
            return;
        }
        const selectedText = selection.toString().trim();
        const range = selection.getRangeAt(0);
        const rect = range.getBoundingClientRect();
        const containerRect = emailBodyRef.current.getBoundingClientRect();
        const bodyText = emailBodyRef.current.innerText ?? '';
        const selectionStart = bodyText.indexOf(selectedText);
        const selectionEnd = selectionStart >= 0 ? selectionStart + selectedText.length : -1;
        setSelectionToolbar({
            top: rect.top - containerRect.top - 44,
            left: rect.left - containerRect.left,
            selectedText,
            selectionStart: Math.max(0, selectionStart),
            selectionEnd: Math.max(0, selectionEnd),
        });
    }, []);

    const saveEmailHighlight = useCallback(async () => {
        if (!selectionToolbar) return;
        try {
            const res = await apiFetch(`/api/messages/${message.id}/annotation-comments`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    type: 'HIGHLIGHT_EMAIL',
                    content: '',
                    color: selectedHighlightColor,
                    selectedText: selectionToolbar.selectedText,
                    selectionStart: selectionToolbar.selectionStart,
                    selectionEnd: selectionToolbar.selectionEnd,
                }),
            });
            if (res.ok) {
                const created = await res.json();
                setEmailAnnotations(prev => [...prev, { ...created, replies: [] }]);
                setSelectionToolbar(null);
                window.getSelection()?.removeAllRanges();
            }
        } catch {
            // ignore
        }
    }, [selectionToolbar, selectedHighlightColor, message.id]);

    useEffect(() => {
        if (!emailBodyRef.current) return;
        const highlights = emailAnnotations.filter(a => a.type === 'HIGHLIGHT_EMAIL' && !a.deleted);
        if (highlights.length === 0) return;

        highlights.forEach((h: any) => {
            if (!h.selectedText || h.selectionStart < 0) return;
            const bodyEl = emailBodyRef.current!;
            const bodyText = bodyEl.innerText ?? '';
            const startSearch = h.selectionStart - 5 >= 0 ? h.selectionStart - 5 : 0;
            const idx = bodyText.indexOf(h.selectedText, startSearch);
            if (idx < 0) return;

            const walker = document.createTreeWalker(bodyEl, NodeFilter.SHOW_TEXT);
            let charCount = 0;
            let startNode: Text | null = null;
            let startOffset = 0;
            let endNode: Text | null = null;
            let endOffset = 0;
            let node: Text | null;

            while ((node = walker.nextNode() as Text | null)) {
                const nodeLen = node.length;
                if (!startNode && charCount + nodeLen > idx) {
                    startNode = node;
                    startOffset = idx - charCount;
                }
                if (startNode && charCount + nodeLen >= idx + h.selectedText.length) {
                    endNode = node;
                    endOffset = idx + h.selectedText.length - charCount;
                    break;
                }
                charCount += nodeLen;
            }

            if (startNode && endNode) {
                try {
                    const range = document.createRange();
                    range.setStart(startNode, startOffset);
                    range.setEnd(endNode, endOffset);
                    const mark = document.createElement('mark');
                    mark.style.backgroundColor = h.color ? `${h.color}66` : 'rgba(255,255,0,0.4)';
                    mark.style.cursor = 'pointer';
                    mark.dataset.annotationId = h.id;
                    mark.addEventListener('click', () => {
                        setOpenEmailThreadId(h.id);
                        setShowEmailNotePanel(false);
                    });
                    range.surroundContents(mark);
                } catch {
                    // Range may span multiple nodes — skip gracefully
                }
            }
        });
    }, [emailAnnotations]);

    const handleSaveToCase = async () => {
        if (!message.case?.id) return;
        setSavingToCase(true);
        setSaveError(null);
        setSavedDCN(null);
        try {
            const senderName = message.isExternal
                ? (message.externalName || message.externalEmail || 'External Sender')
                : (message.sender?.name || 'Unknown');
            const dateStr = format(new Date(message.createdAt), 'PPPP \'at\' p');
            const htmlContent = `<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><title>${message.subject || '(No Subject)'}</title></head>
<body style="font-family:Arial,sans-serif;max-width:800px;margin:0 auto;padding:24px;color:#111">
  <table style="width:100%;border-bottom:2px solid #e5e7eb;padding-bottom:16px;margin-bottom:16px">
    <tr><td style="color:#6b7280;width:80px">From:</td><td><strong>${senderName}</strong></td></tr>
    <tr><td style="color:#6b7280">Date:</td><td>${dateStr}</td></tr>
    <tr><td style="color:#6b7280">Subject:</td><td><strong>${message.subject || '(No Subject)'}</strong></td></tr>
    <tr><td style="color:#6b7280">Case:</td><td>${message.case.caseNumber}</td></tr>
  </table>
  <div>${message.body}</div>
</body>
</html>`;
            const blob = new Blob([htmlContent], { type: 'text/html' });
            const safeSubject = (message.subject || 'message').replace(/[^a-z0-9]/gi, '_').substring(0, 50);
            const file = new File([blob], `email_${safeSubject}_${Date.now()}.html`, { type: 'text/html' });

            const formData = new FormData();
            formData.append('file', file);
            formData.append('caseId', message.case.id);
            formData.append('category', 'CORRESPONDENCE');

            const res = await apiFetch('/api/documents/upload', { method: 'POST', body: formData });
            if (!res.ok) {
                const data = await res.json().catch(() => ({}));
                throw new Error(data.error || 'Upload failed');
            }
            const result = await res.json();
            setSavedDCN(result.documentControlNumber);
        } catch (err) {
            setSaveError(err instanceof Error ? err.message : 'Failed to save');
        } finally {
            setSavingToCase(false);
        }
    };

    // Handle external vs internal senders
    const isExternalInbound = message.isExternal && message.direction === 'INBOUND';
    const isExternalOutbound = message.isExternal && message.direction === 'OUTBOUND';

    // Get display name - handle external emails
    const getSenderDisplayName = () => {
        if (isExternalInbound) {
            return message.externalName || message.externalEmail || 'External Sender';
        }
        return message.sender?.name || 'Unknown';
    };

    const getRecipientDisplayName = () => {
        if (isExternalOutbound) {
            return message.externalName || message.externalEmail || 'External Recipient';
        }
        return message.recipient?.name || 'Unknown';
    };

    const displayName = activeBox === 'sent' ? getRecipientDisplayName() : getSenderDisplayName();
    const displayInitial = displayName[0]?.toUpperCase() || '?';

    return (
        <div className="relative min-h-full flex">
        <div className="flex-1 p-6">
        <div className="max-w-4xl mx-auto">
            <div className="bg-[#ffffff] rounded-xl shadow-sm border border-[#E5E2DB] overflow-hidden">
                {/* External Email Warning Banner */}
                {isExternalInbound && (
                    <div className="bg-amber-50 dark:bg-amber-900/20 border-b border-amber-200 dark:border-amber-800 px-4 py-3">
                        <div className="flex items-center gap-3">
                            <div className="flex-shrink-0">
                                <AlertTriangle className="w-5 h-5 text-amber-600 dark:text-amber-500" />
                            </div>
                            <div className="flex-1">
                                <p className="text-sm font-semibold text-amber-800 dark:text-amber-200">
                                    External Email Warning
                                </p>
                                <p className="text-xs text-amber-700 dark:text-amber-300 mt-0.5">
                                    This message was received from an external email address outside of AccessAlly.
                                    Exercise caution with any links, attachments, or requests for sensitive information.
                                </p>
                            </div>
                            <Globe className="w-5 h-5 text-amber-500 flex-shrink-0" />
                        </div>
                    </div>
                )}

                {/* Toolbar */}
                <div className="p-3 border-b border-[#E5E2DB] flex items-center gap-2 bg-[#F8F7F5]">
                    <button onClick={onReply} className="p-2 hover:bg-[#F3F1EC] rounded-lg transition-colors text-[#5C5850]" title="Reply">
                        <Reply className="w-4 h-4" />
                    </button>
                    <button onClick={onForward} className="p-2 hover:bg-[#F3F1EC] rounded-lg transition-colors text-[#5C5850]" title="Forward">
                        <Forward className="w-4 h-4" />
                    </button>
                    <div className="w-px h-5 bg-[#E5E2DB] mx-1" />
                    <button onClick={onStar} className={cn("p-2 hover:bg-[#F3F1EC] rounded-lg transition-colors", message.starred ? "text-amber-500" : "text-[#8C8880]")} title="Star">
                        <Star className={cn("w-4 h-4", message.starred && "fill-current")} />
                    </button>
                    <button onClick={onArchive} className="p-2 hover:bg-[#F3F1EC] rounded-lg transition-colors text-[#5C5850]" title={message.archived ? "Unarchive" : "Archive"}>
                        <Archive className="w-4 h-4" />
                    </button>
                    <button onClick={onAddToCalendar} className="p-2 hover:bg-[#F3F1EC] rounded-lg transition-colors text-[#5C5850]" title="Add to Calendar">
                        <Calendar className="w-4 h-4" />
                    </button>
                    <div className="w-px h-5 bg-[#E5E2DB] mx-1" />
                    <button
                        onClick={handleSaveToCase}
                        disabled={!message.case?.id || savingToCase}
                        title={message.case?.id ? 'Save to case documents' : 'No related case — link a case first'}
                        className={cn(
                            "flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors",
                            message.case?.id
                                ? "bg-[#0D9488]/10 text-[#0D9488] hover:bg-[#0D9488]/20"
                                : "text-[#C8C4BB] cursor-not-allowed"
                        )}
                    >
                        {savingToCase ? (
                            <div className="w-3.5 h-3.5 border-2 border-[#0D9488]/30 border-t-[#0D9488] rounded-full animate-spin" />
                        ) : (
                            <FolderDown className="w-3.5 h-3.5" />
                        )}
                        Save to Case
                    </button>
                    <div className="flex-1" />
                    <button onClick={onDelete} className="p-2 hover:bg-red-50 text-red-400 hover:text-red-600 rounded-lg transition-colors" title="Delete">
                        <Trash2 className="w-4 h-4" />
                    </button>
                </div>

                {/* Save to case result banners */}
                {savedDCN && (
                    <div className="flex items-center justify-between gap-3 px-4 py-3 bg-green-50 dark:bg-green-900/20 border-b border-green-200 dark:border-green-800">
                        <div className="flex items-center gap-2 text-sm text-green-800 dark:text-green-200">
                            <CheckCircle className="w-4 h-4 text-green-600 shrink-0" />
                            Saved to case documents. DCN: <code className="font-mono font-semibold">{savedDCN}</code>
                        </div>
                        <div className="flex items-center gap-2 shrink-0">
                            <button
                                onClick={() => { navigator.clipboard.writeText(savedDCN); setDcnCopied(true); setTimeout(() => setDcnCopied(false), 2000); }}
                                className="flex items-center gap-1 px-2 py-1 text-xs font-medium bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
                            >
                                <Copy className="w-3 h-3" />
                                {dcnCopied ? 'Copied!' : 'Copy'}
                            </button>
                            <button onClick={() => setSavedDCN(null)} className="p-1 text-green-600 hover:text-green-800 rounded transition-colors">
                                <X className="w-3.5 h-3.5" />
                            </button>
                        </div>
                    </div>
                )}
                {saveError && (
                    <div className="flex items-center justify-between gap-3 px-4 py-3 bg-red-50 dark:bg-red-900/20 border-b border-red-200 dark:border-red-800 text-sm text-red-700 dark:text-red-300">
                        {saveError}
                        <button onClick={() => setSaveError(null)} className="p-1 rounded transition-colors hover:text-red-900">
                            <X className="w-3.5 h-3.5" />
                        </button>
                    </div>
                )}

                {/* Header */}
                <div className="p-6 border-b border-[#E5E2DB]">
                    <h2 className="text-lg font-semibold text-[#1C1A17] mb-4">
                        {message.subject || '(No Subject)'}
                    </h2>
                    <div className="flex items-start gap-4">
                        <div className={cn(
                            "w-10 h-10 rounded-full flex items-center justify-center font-bold flex-shrink-0 text-sm",
                            message.isExternal
                                ? "bg-amber-50 text-amber-700"
                                : "bg-[#F3F1EC] text-[#5C5850]"
                        )}>
                            {message.isExternal ? <Globe className="w-5 h-5" /> : displayInitial}
                        </div>
                        <div className="flex-1">
                            <p className="text-sm font-medium text-[#1C1A17] flex items-center gap-2">
                                {activeBox === 'sent' ? `To: ${getRecipientDisplayName()}` : `From: ${getSenderDisplayName()}`}
                                {message.isExternal && (
                                    <span className="text-[10px] px-1.5 py-0.5 bg-amber-50 text-amber-700 rounded font-semibold">
                                        EXTERNAL
                                    </span>
                                )}
                            </p>
                            {message.isExternal && message.externalEmail && (
                                <p className="text-xs text-[#8C8880]">{message.externalEmail}</p>
                            )}
                            <p className="text-xs text-[#8C8880]">
                                {format(new Date(message.createdAt), 'PPPP \'at\' p')}
                            </p>
                            {message.case && (
                                <Link
                                    href={`/cases/${message.case.id}`}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="text-xs text-[#0D9488] mt-1 font-medium hover:underline block"
                                >
                                    Case: {message.case.caseNumber} — {message.case.clientName}
                                </Link>
                            )}
                            <button
                                onClick={() => { setShowEmailNotePanel(true); setOpenEmailThreadId(null); }}
                                className="flex items-center gap-1 text-xs text-[#0D9488] hover:text-[#0F766E] mt-1 font-medium transition-colors"
                            >
                                <StickyNote className="w-3.5 h-3.5" /> Add Note
                            </button>
                        </div>
                    </div>
                </div>

                {/* Body */}
                <div className="p-6">
                    <div className="relative">
                        {selectionToolbar && (
                            <div
                                className="absolute z-20 flex items-center gap-1 bg-[#1C1A17] rounded-lg px-2 py-1 shadow-lg"
                                style={{ top: selectionToolbar.top, left: selectionToolbar.left }}
                            >
                                {['#FFFF00', '#00FF00', '#0096FF', '#FF6496', '#FFA500'].map(hex => (
                                    <button
                                        key={hex}
                                        onClick={() => setSelectedHighlightColor(hex)}
                                        className={`w-5 h-5 rounded-full border-2 ${selectedHighlightColor === hex ? 'border-white' : 'border-transparent'}`}
                                        style={{ backgroundColor: `${hex}CC` }}
                                    />
                                ))}
                                <button
                                    onClick={saveEmailHighlight}
                                    className="ml-1 text-xs px-2 py-0.5 bg-[#0D9488] text-[#ffffff] rounded hover:bg-[#0F766E]"
                                >
                                    Highlight
                                </button>
                                <button onClick={() => setSelectionToolbar(null)} className="text-[#8C8880] hover:text-[#ffffff] ml-1">
                                    <X className="w-3 h-3" />
                                </button>
                            </div>
                        )}
                        <div
                            ref={emailBodyRef}
                            className="prose max-w-none text-[#5C5850] text-sm leading-relaxed"
                            dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(message.body) }}
                            onMouseUp={handleEmailMouseUp}
                        />
                    </div>
                </div>

                {/* Attachments */}
                {message.attachments && message.attachments.length > 0 && (
                    <div className="px-6 pb-4">
                        <p className="text-[11px] font-semibold uppercase tracking-[0.1em] text-[#8C8880] mb-2">Attachments</p>
                        <div className="space-y-1">
                            {message.attachments.map(att => (
                                <a
                                    key={att.id}
                                    href={`/api/messages/${message.id}/attachments/${att.id}`}
                                    download={att.filename}
                                    className="flex items-center gap-2 px-3 py-2 bg-[#F8F7F5] border border-[#E5E2DB] rounded-lg hover:bg-[#F3F1EC] transition-colors text-sm"
                                >
                                    <Paperclip className="w-4 h-4 text-[#8C8880] flex-shrink-0" />
                                    <span className="text-[#5C5850] truncate">{att.filename}</span>
                                    <span className="text-[#8C8880] text-xs ml-auto flex-shrink-0">
                                        {att.size < 1024 * 1024
                                            ? `${(att.size / 1024).toFixed(0)} KB`
                                            : `${(att.size / (1024 * 1024)).toFixed(1)} MB`}
                                    </span>
                                </a>
                            ))}
                        </div>
                    </div>
                )}

                {/* Quick Reply */}
                <div className="p-4 border-t border-[#E5E2DB] bg-[#F8F7F5]">
                    <button
                        onClick={onReply}
                        className="w-full text-left p-3 border border-[#E5E2DB] rounded-lg text-[#8C8880] hover:border-[#0D9488]/40 hover:bg-[#ffffff] transition-colors text-sm"
                    >
                        {message.isExternal ? 'Click to reply (will send external email)...' : 'Click to reply...'}
                    </button>
                </div>
            </div>
        </div>
        </div>
        {(openEmailThreadId !== null || showEmailNotePanel) && (
            <AnnotationThreadPanel
                resourceType="message"
                resourceId={message.id}
                rootCommentId={openEmailThreadId}
                initialType={showEmailNotePanel ? 'EMAIL_NOTE' : 'HIGHLIGHT_EMAIL'}
                currentUserId={currentUserId}
                currentUserName={currentUserName}
                onClose={() => { setOpenEmailThreadId(null); setShowEmailNotePanel(false); }}
                onCreated={comment => {
                    setEmailAnnotations(prev => [...prev, { ...comment, replies: [] }]);
                    setShowEmailNotePanel(false);
                    setOpenEmailThreadId(comment.id);
                }}
            />
        )}
        </div>
    );
}

// Compose View Component (Inline)
function ComposeView({
    mode,
    data,
    users,
    cases,
    currentUserId,
    onChange,
    onSend,
    onClose,
    pendingAttachments,
    onAttach,
    onRemoveAttachment,
}: {
    mode: 'new' | 'reply' | 'forward';
    data: ComposeData;
    users: UserData[];
    cases: Case[];
    currentUserId: string;
    onChange: (data: ComposeData) => void;
    onSend: () => void;
    onClose: () => void;
    pendingAttachments: File[];
    onAttach: (files: File[]) => void;
    onRemoveAttachment: (filename: string) => void;
}) {
    const modalTitle = mode === 'reply' ? 'Reply' : mode === 'forward' ? 'Forward' : 'New Message';
    const filteredUsers = users.filter(u => u.id !== currentUserId);

    const [showTemplateModal, setShowTemplateModal] = useState(false);

    function handleTemplateLoad(html: string, caseId: string) {
        if (data.body && !confirm('Replace the current message body with the template?')) return;

        // Extract subject from first heading, falling back to first paragraph text
        const headingMatch = html.match(/<h[1-6][^>]*>(.*?)<\/h[1-6]>/i);
        const paraMatch = html.match(/<p[^>]*>(.*?)<\/p>/i);
        const rawSubject = (headingMatch?.[1] ?? paraMatch?.[1] ?? '').replace(/<[^>]+>/g, '').trim();
        const subject = rawSubject.length > 120 ? rawSubject.slice(0, 120) : rawSubject;

        onChange({ ...data, body: html, isExternal: true, recipientId: '', subject: subject || data.subject, caseId: caseId || data.caseId });
    }

    return (
        <div className="h-full flex flex-col bg-[#ffffff]">
            <div className="p-4 border-b border-[#E5E2DB] flex justify-between items-center bg-[#F8F7F5]">
                <h2 className="text-base font-semibold text-[#1C1A17] flex items-center gap-2">
                    {mode === 'reply' && <Reply className="w-4 h-4 text-[#0D9488]" />}
                    {mode === 'forward' && <Forward className="w-4 h-4 text-[#0D9488]" />}
                    {mode === 'new' && <Mail className="w-4 h-4 text-[#0D9488]" />}
                    {modalTitle}
                </h2>
                <button onClick={onClose} className="p-1.5 hover:bg-[#F3F1EC] rounded-lg transition-colors">
                    <X className="w-4 h-4 text-[#8C8880]" />
                </button>
            </div>

            <div className="p-4 space-y-3 overflow-y-auto flex-1">
                <div>
                    <div className="flex items-center justify-between mb-2">
                        <label className="block text-[11px] font-semibold uppercase tracking-[0.1em] text-[#8C8880]">To</label>
                        <label className="flex items-center gap-2 cursor-pointer">
                            <span className="text-xs text-[#8C8880]">External Email</span>
                            <input
                                type="checkbox"
                                checked={data.isExternal || false}
                                onChange={e => onChange({ ...data, isExternal: e.target.checked, recipientId: '' })}
                                className="w-4 h-4 rounded accent-[#0D9488]"
                                disabled={mode === 'reply'}
                            />
                        </label>
                    </div>

                    {data.isExternal ? (
                        <div className="space-y-2">
                            <input
                                type="email"
                                placeholder="Recipient Email"
                                value={data.externalEmail || ''}
                                onChange={e => onChange({ ...data, externalEmail: e.target.value })}
                                className="w-full px-3 py-2 text-sm border border-[#E5E2DB] rounded-lg bg-[#ffffff] text-[#1C1A17] placeholder-[#8C8880] focus:outline-none focus:ring-2 focus:ring-[#0D9488]/30 focus:border-[#0D9488] transition-colors disabled:opacity-50"
                                disabled={mode === 'reply'}
                            />
                            <input
                                type="text"
                                placeholder="Recipient Name"
                                value={data.externalName || ''}
                                onChange={e => onChange({ ...data, externalName: e.target.value })}
                                className="w-full px-3 py-2 text-sm border border-[#E5E2DB] rounded-lg bg-[#ffffff] text-[#1C1A17] placeholder-[#8C8880] focus:outline-none focus:ring-2 focus:ring-[#0D9488]/30 focus:border-[#0D9488] transition-colors disabled:opacity-50"
                                disabled={mode === 'reply'}
                            />
                        </div>
                    ) : (
                        <select
                            value={data.recipientId}
                            onChange={e => onChange({ ...data, recipientId: e.target.value })}
                            className="w-full px-3 py-2 text-sm border border-[#E5E2DB] rounded-lg bg-[#ffffff] text-[#1C1A17] focus:outline-none focus:ring-2 focus:ring-[#0D9488]/30 focus:border-[#0D9488] transition-colors disabled:opacity-50"
                            disabled={mode === 'reply'}
                        >
                            <option value="">Select Recipient</option>
                            {filteredUsers.map(u => (
                                <option key={u.id} value={u.id}>{u.name} ({u.role})</option>
                            ))}
                        </select>
                    )}
                </div>

                <div>
                    <label className="block text-[11px] font-semibold uppercase tracking-[0.1em] text-[#8C8880] mb-1.5">Subject</label>
                    <input
                        type="text"
                        value={data.subject}
                        onChange={e => onChange({ ...data, subject: e.target.value })}
                        placeholder="Enter subject…"
                        className="w-full px-3 py-2 text-sm border border-[#E5E2DB] rounded-lg bg-[#ffffff] text-[#1C1A17] placeholder-[#8C8880] focus:outline-none focus:ring-2 focus:ring-[#0D9488]/30 focus:border-[#0D9488] transition-colors"
                    />
                </div>

                <div>
                    <label className="block text-[11px] font-semibold uppercase tracking-[0.1em] text-[#8C8880] mb-1.5">Related Case <span className="normal-case font-normal">(Optional)</span></label>
                    <select
                        value={data.caseId}
                        onChange={e => onChange({ ...data, caseId: e.target.value })}
                        className="w-full px-3 py-2 text-sm border border-[#E5E2DB] rounded-lg bg-[#ffffff] text-[#1C1A17] focus:outline-none focus:ring-2 focus:ring-[#0D9488]/30 focus:border-[#0D9488] transition-colors"
                    >
                        <option value="">None</option>
                        {cases.map((c) => (
                            <option key={c.id} value={c.id}>{c.caseNumber} — {c.clientName}</option>
                        ))}
                    </select>
                </div>

                <div>
                    <div className="flex items-center justify-between mb-1.5">
                        <label className="block text-[11px] font-semibold uppercase tracking-[0.1em] text-[#8C8880]">Message</label>
                        <button
                            type="button"
                            onClick={() => setShowTemplateModal(true)}
                            className="text-xs text-[#0D9488] hover:text-[#0F766E] flex items-center gap-1 transition-colors"
                        >
                            <FileText className="w-3 h-3" /> Load Template
                        </button>
                    </div>
                    <RichTextEditor
                        content={data.body}
                        onChange={body => onChange({ ...data, body })}
                        placeholder="Write your message..."
                        minHeight="12rem"
                        onAttach={onAttach}
                    />
                    {pendingAttachments.length > 0 && (
                        <div className="flex flex-wrap gap-2 mt-2">
                            {pendingAttachments.map(file => (
                                <div
                                    key={file.name}
                                    className="flex items-center gap-1.5 px-2 py-1 bg-[#F3F1EC] rounded-full text-xs text-[#5C5850]"
                                >
                                    <Paperclip className="w-3 h-3 flex-shrink-0" />
                                    <span className="max-w-[140px] truncate">{file.name}</span>
                                    <span className="text-gray-400">({(file.size / 1024).toFixed(0)} KB)</span>
                                    <button
                                        type="button"
                                        onClick={() => onRemoveAttachment(file.name)}
                                        className="text-gray-400 hover:text-red-500 ml-0.5"
                                        title="Remove attachment"
                                    >
                                        <X className="w-3 h-3" />
                                    </button>
                                </div>
                            ))}
                        </div>
                    )}
                    {showTemplateModal && (
                        <LoadTemplateModal
                            onClose={() => setShowTemplateModal(false)}
                            onLoad={handleTemplateLoad}
                            linkedCaseId={data.caseId || undefined}
                            cases={cases}
                        />
                    )}
                </div>
            </div>

            <div className="p-4 border-t border-[#E5E2DB] bg-[#F8F7F5] flex justify-end gap-3">
                <button onClick={onClose} className="px-4 py-2 text-sm font-medium text-[#5C5850] hover:bg-[#F3F1EC] rounded-lg transition-colors">
                    Cancel
                </button>
                <button
                    onClick={onSend}
                    disabled={(!data.recipientId && !data.isExternal) || (data.isExternal && (!data.externalEmail || !data.externalName)) || !data.body}
                    className="px-4 py-2 bg-[#0D9488] hover:bg-[#0F766E] text-[#ffffff] rounded-lg text-sm font-semibold flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                    <Send className="w-4 h-4" />
                    Send
                </button>
            </div>
        </div>
    );
}

export default function MessagesPage() {
    return (
        <Suspense fallback={<div className="flex items-center justify-center min-h-screen bg-[#F8F7F5]"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#0D9488]"></div></div>}>
            <MessagesContent />
        </Suspense>
    );
}

// Sidebar Button Component
function SidebarButton({ icon: Icon, label, count, active, onClick, onDrop, onDragOver, onDragLeave }: {
    icon: React.ComponentType<{ className?: string }>;
    label: string;
    count?: number;
    active: boolean;
    onClick: () => void;
    onDrop?: (e: React.DragEvent) => void;
    onDragOver?: (e: React.DragEvent) => void;
    onDragLeave?: (e: React.DragEvent) => void;
}) {
    // Local state for drag visual feedback if needed, 
    // but typically the parent controls it or we use CSS pseudo-classes? 
    // HTML5 dnd doesn't trigger :active like that.
    // Let's rely on the parent passing props if we want complex verified state, 
    // OR just use simple onDragOver styling here if passed.

    // Actually, to keep it simple, let's just accept the event handlers and the caller manages state/logic.
    // But we might want visual feedback.

    return (
        <button
            onClick={onClick}
            onDrop={onDrop}
            onDragOver={onDragOver}
            onDragLeave={onDragLeave}
            className={cn(
                "w-full text-left px-3 py-2.5 rounded-lg flex items-center gap-3 font-medium transition-colors text-sm",
                active
                    ? "bg-[#0D9488]/10 text-[#0D9488] border border-[#0D9488]/20"
                    : "text-[#5C5850] hover:bg-[#F3F1EC] border border-transparent"
            )}
        >
            <Icon className="w-4 h-4" />
            {label}
            {count !== undefined && count > 0 && (
                <span className="ml-auto text-xs bg-[#0D9488]/10 text-[#0D9488] px-1.5 py-0.5 rounded-full font-semibold">
                    {count}
                </span>
            )}
        </button>
    );
}

// Message List Item Component
function MessageListItem({
    message,
    isSelected,
    activeBox,
    onClick,
    onStar
}: {
    message: Message;
    isSelected: boolean;
    activeBox: BoxType;
    onClick: () => void;
    onStar: () => void;
}) {
    // Handle display name for external emails
    const getDisplayName = () => {
        if (message.isExternal) {
            if (activeBox === 'sent') {
                return message.externalName || message.externalEmail || 'External Recipient';
            }
            return message.externalName || message.externalEmail || 'External Sender';
        }
        return activeBox === 'sent' ? (message.recipient?.name || 'Unknown') : (message.sender?.name || 'Unknown');
    };
    const displayName = getDisplayName();

    const handleDragStart = (e: React.DragEvent) => {
        e.dataTransfer.setData('messageId', message.id);
        e.dataTransfer.effectAllowed = 'move';
        // Optional: Set ghost image or style
    };

    return (
        <li
            onClick={onClick}
            draggable
            onDragStart={handleDragStart}
            className={cn(
                "p-3 cursor-pointer transition-colors relative group cursor-grab active:cursor-grabbing",
                isSelected ? "bg-[#0D9488]/8 border-l-2 border-[#0D9488]" : "hover:bg-[#F8F7F5] border-l-2 border-transparent",
                !message.isRead && activeBox !== 'sent' ? "bg-[#0D9488]/5" : ""
            )}
        >
            <div className="flex items-start gap-2">
                <button
                    onClick={e => { e.stopPropagation(); onStar(); }}
                    className={cn(
                        "mt-0.5 flex-shrink-0 transition-colors",
                        message.starred ? "text-amber-400" : "text-[#C8C4BB] hover:text-amber-400"
                    )}
                >
                    <Star className={cn("w-4 h-4", message.starred && "fill-current")} />
                </button>
                <div className="flex-1 min-w-0">
                    <div className="flex justify-between items-center mb-0.5">
                        <span className={cn(
                            "text-sm truncate",
                            !message.isRead && activeBox !== 'sent' ? "font-bold text-[#1C1A17]" : "font-medium text-[#5C5850]"
                        )}>
                            {displayName}
                        </span>
                        <span className="text-[10px] text-[#8C8880] flex-shrink-0 ml-2">
                            {format(new Date(message.createdAt), 'MMM d')}
                        </span>
                    </div>
                    <h4 className={cn(
                        "text-xs mb-0.5 truncate",
                        !message.isRead && activeBox !== 'sent' ? "font-semibold text-[#1C1A17]" : "text-[#5C5850]"
                    )}>
                        {message.subject || '(No Subject)'}
                    </h4>
                    <p className="text-xs text-[#8C8880] line-clamp-1">{message.body}</p>
                </div>
            </div>
        </li>
    );
}
