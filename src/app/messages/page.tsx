'use client';
import { apiFetch } from '@/lib/api-client';
import DOMPurify from 'dompurify';
import { RichTextEditor } from '@/components/RichTextEditor';
import { LoadTemplateModal } from '@/components/modals/LoadTemplateModal';

import { useState, useEffect, useCallback, Suspense } from 'react';
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
    FileText
} from 'lucide-react';
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
                    router.push('/');
                    return;
                }
                const data = await res.json();
                setCurrentUser(data.user);

                // Fetch unread count
                try {
                    const unreadRes = await apiFetch('/api/messages/unread-count', { cache: 'no-store' });
                    if (unreadRes.ok) {
                        const { count } = await unreadRes.json();
                        console.log('API Count:', count);
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
                router.push('/');
            }
        };
        loadUser();
    }, [router]);

    const searchParams = useSearchParams();

    // Handle URL Actions
    useEffect(() => {
        if (searchParams.get('compose') === 'true') {
            handleNewMessage();
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
                const data = await res.json();
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

        try {
            const res = await apiFetch('/api/messages', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    recipientId: composeData.recipientId,
                    subject: composeData.subject,
                    body: composeData.body,
                    caseId: composeData.caseId || undefined,
                    replyToId: composeData.replyToId || undefined,
                    forwardedFromId: composeData.forwardedFromId || undefined,
                    isExternal: composeData.isExternal,
                    externalEmail: composeData.externalEmail,
                    externalName: composeData.externalName
                })
            });

            if (res.ok) {
                setIsComposeOpen(false);
                setComposeData({
                    recipientId: '', subject: '', body: '', caseId: '', replyToId: '', forwardedFromId: '',
                    isExternal: false, externalEmail: '', externalName: ''
                });
                setComposeMode('new');
                if (activeBox === 'sent') fetchMessages();
            } else {
                alert('Failed to send message');
            }
        } catch (e) {
            console.error(e);
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
                <div className="bg-white/30 dark:bg-gray-900/30 backdrop-blur-md border border-white/20 dark:border-gray-800/30 p-4 rounded-2xl mx-6 mt-6 mb-2 shadow-lg flex items-center justify-between transition-all">
                    <div className="flex items-center gap-3">

                        <h1 className="text-xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
                            <Mail className="w-5 h-5" />
                            Secure Messages
                        </h1>
                    </div>
                    <div className="flex items-center gap-2">
                        <button
                            onClick={() => setShowSettingsModal(true)}
                            className="px-3 py-2 text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg text-sm"
                        >
                            Settings
                        </button>
                        <button
                            onClick={handleNewMessage}
                            className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 text-sm font-medium flex items-center gap-2"
                        >
                            <Plus className="w-4 h-4" />
                            New Message
                        </button>
                    </div>
                </div>

                {/* Main Content Area - Unified Glassmorphic Container */}
                <div className="flex flex-1 overflow-hidden mx-6 mb-6 bg-white/30 dark:bg-gray-800/30 backdrop-blur-md rounded-2xl border border-white/20 dark:border-gray-700/30 shadow-sm">
                    {/* Sidebar (Folders) */}
                    <div className="w-56 bg-transparent border-r border-white/10 dark:border-gray-700/30 flex flex-col">
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
                        <div className="flex-1 border-t border-white/10 dark:border-gray-700/30">
                            <div className="p-3 pb-1 flex items-center justify-between">
                                <span className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Folders</span>
                                <button
                                    onClick={() => setShowCreateFolderModal(true)}
                                    className="p-1 hover:bg-white/20 dark:hover:bg-gray-700/50 rounded text-gray-400 hover:text-gray-600 transition-colors"
                                    title="Create folder"
                                >
                                    <FolderPlus className="w-4 h-4" />
                                </button>
                            </div>
                            <div className="px-3 space-y-1 pb-3">
                                {folders.length === 0 ? (
                                    <p className="text-xs text-gray-400 py-2 text-center">No custom folders</p>
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
                                                    ? "bg-indigo-500/20 text-indigo-700 dark:text-indigo-300 border-indigo-500/30"
                                                    : "text-gray-600 hover:bg-white/10 dark:text-gray-400 dark:hover:bg-gray-700/50",
                                                dragOverFolderId === folder.id && "bg-blue-500/20 border-blue-500/30"
                                            )}
                                        >
                                            <Folder className="w-4 h-4" style={{ color: folder.color }} />
                                            <span className="truncate flex-1">{folder.name}</span>
                                            {(folder._count?.messages ?? 0) > 0 && (
                                                <span className="text-xs bg-white/20 dark:bg-gray-700/50 text-gray-500 px-1.5 py-0.5 rounded-full">
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
                    <div className="w-80 border-r border-white/10 dark:border-gray-700/30 bg-transparent flex flex-col">
                        {/* Search */}
                        <div className="p-3 border-b border-white/10 dark:border-gray-700/30">
                            <div className="relative">
                                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                                <input
                                    type="text"
                                    placeholder="Search messages..."
                                    value={searchQuery}
                                    onChange={e => setSearchQuery(e.target.value)}
                                    className="w-full pl-10 pr-4 py-2 bg-white/40 dark:bg-gray-900/40 border border-white/20 dark:border-gray-700/30 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 outline-none placeholder-gray-500"
                                />
                            </div>
                        </div>

                        {/* Messages */}
                        <div className="flex-1 overflow-y-auto">
                            {isLoading ? (
                                <div className="p-8 text-center text-gray-400">Loading...</div>
                            ) : filteredMessages.length === 0 ? (
                                <div className="p-8 text-center text-gray-600 dark:text-gray-400 font-medium">No messages</div>
                            ) : (
                                <ul className="divide-y divide-white/10 dark:divide-gray-700/30">
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
                    <div className="flex-1 bg-white/5 dark:bg-gray-900/20 overflow-y-auto">
                        {isComposeOpen ? (
                            <ComposeView
                                mode={composeMode}
                                data={composeData}
                                users={users}
                                cases={cases}
                                currentUserId={currentUser?.id || ''}
                                onChange={setComposeData}
                                onSend={handleSend}
                                onClose={() => { setIsComposeOpen(false); setComposeMode('new'); }}
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
                            />
                        ) : (
                            <div className="h-full flex items-center justify-center text-gray-500 dark:text-gray-400">
                                <div className="text-center p-8 bg-white/20 dark:bg-black/20 rounded-2xl backdrop-blur-sm border border-white/10 shadow-sm">
                                    <Mail className="w-12 h-12 mx-auto mb-3 opacity-80" />
                                    <p className="text-lg font-medium text-gray-700 dark:text-gray-200">Select a message to read</p>
                                    <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">Click on a message from the list to view details</p>
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
    onAddToCalendar
}: {
    message: Message;
    activeBox: BoxType;
    onReply: () => void;
    onForward: () => void;
    onStar: () => void;
    onArchive: () => void;
    onDelete: () => void;
    onAddToCalendar: () => void;
}) {
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
        <div className="p-6 max-w-4xl mx-auto">
            <div className="bg-white/40 dark:bg-gray-900/40 backdrop-blur-md rounded-xl shadow-sm border border-white/20 dark:border-gray-700/30 overflow-hidden">
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
                <div className="p-3 border-b border-gray-100 dark:border-gray-800 flex items-center gap-2 bg-gray-50 dark:bg-gray-800/50">
                    <button onClick={onReply} className="p-2 hover:bg-white dark:hover:bg-gray-700 rounded-lg transition-colors" title="Reply">
                        <Reply className="w-4 h-4" />
                    </button>
                    <button onClick={onForward} className="p-2 hover:bg-white dark:hover:bg-gray-700 rounded-lg transition-colors" title="Forward">
                        <Forward className="w-4 h-4" />
                    </button>
                    <div className="w-px h-5 bg-gray-200 dark:bg-gray-700 mx-1" />
                    <button onClick={onStar} className={cn("p-2 hover:bg-white dark:hover:bg-gray-700 rounded-lg transition-colors", message.starred && "text-yellow-500")} title="Star">
                        <Star className={cn("w-4 h-4", message.starred && "fill-current")} />
                    </button>
                    <button onClick={onArchive} className="p-2 hover:bg-white dark:hover:bg-gray-700 rounded-lg transition-colors" title={message.archived ? "Unarchive" : "Archive"}>
                        <Archive className="w-4 h-4" />
                    </button>
                    <button onClick={onAddToCalendar} className="p-2 hover:bg-white dark:hover:bg-gray-700 rounded-lg transition-colors" title="Add to Calendar">
                        <Calendar className="w-4 h-4" />
                    </button>
                    <div className="flex-1" />
                    <button onClick={onDelete} className="p-2 hover:bg-red-50 dark:hover:bg-red-900/20 text-red-500 rounded-lg transition-colors" title="Delete">
                        <Trash2 className="w-4 h-4" />
                    </button>
                </div>

                {/* Header */}
                <div className="p-6 border-b border-gray-100 dark:border-gray-800">
                    <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-4">
                        {message.subject || '(No Subject)'}
                    </h2>
                    <div className="flex items-start gap-4">
                        <div className={cn(
                            "w-10 h-10 rounded-full flex items-center justify-center font-bold flex-shrink-0",
                            message.isExternal
                                ? "bg-amber-100 dark:bg-amber-900/30 text-amber-600"
                                : "bg-indigo-100 dark:bg-indigo-900/30 text-indigo-600"
                        )}>
                            {message.isExternal ? <Globe className="w-5 h-5" /> : displayInitial}
                        </div>
                        <div className="flex-1">
                            <p className="text-sm font-medium text-gray-900 dark:text-white flex items-center gap-2">
                                {activeBox === 'sent' ? `To: ${getRecipientDisplayName()}` : `From: ${getSenderDisplayName()}`}
                                {message.isExternal && (
                                    <span className="text-[10px] px-1.5 py-0.5 bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400 rounded font-medium">
                                        EXTERNAL
                                    </span>
                                )}
                            </p>
                            {message.isExternal && message.externalEmail && (
                                <p className="text-xs text-gray-500 dark:text-gray-400">
                                    {message.externalEmail}
                                </p>
                            )}
                            <p className="text-xs text-gray-500">
                                {format(new Date(message.createdAt), 'PPPP \'at\' p')}
                            </p>
                            {message.case && (
                                <Link
                                    href={`/cases/${message.case.id}`}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="text-xs text-indigo-600 mt-1 font-medium hover:underline block"
                                >
                                    📁 Case: {message.case.caseNumber} - {message.case.clientName}
                                </Link>
                            )}
                        </div>
                    </div>
                </div>

                {/* Body */}
                <div className="p-6">
                    <div
                        className="prose dark:prose-invert max-w-none text-gray-700 dark:text-gray-300 text-sm leading-relaxed"
                        dangerouslySetInnerHTML={{
                            __html: typeof window !== 'undefined'
                                ? DOMPurify.sanitize(message.body)
                                : message.body,
                        }}
                    />
                </div>

                {/* Quick Reply */}
                <div className="p-4 border-t border-gray-100 dark:border-gray-800 bg-gray-50 dark:bg-gray-800/50">
                    <button
                        onClick={onReply}
                        className="w-full text-left p-3 border border-gray-200 dark:border-gray-700 rounded-lg text-gray-400 hover:border-indigo-300 hover:bg-white dark:hover:bg-gray-800 transition-colors"
                    >
                        {message.isExternal ? 'Click to reply (will send external email)...' : 'Click to reply...'}
                    </button>
                </div>
            </div>
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
    onClose
}: {
    mode: 'new' | 'reply' | 'forward';
    data: ComposeData;
    users: UserData[];
    cases: Case[];
    currentUserId: string;
    onChange: (data: ComposeData) => void;
    onSend: () => void;
    onClose: () => void;
}) {
    const modalTitle = mode === 'reply' ? 'Reply' : mode === 'forward' ? 'Forward' : 'New Message';
    const filteredUsers = users.filter(u => u.id !== currentUserId);

    const [showTemplateModal, setShowTemplateModal] = useState(false);

    function handleTemplateLoad(html: string) {
        if (data.body && !confirm('Replace the current message body with the template?')) return;
        onChange({ ...data, body: html });
    }

    return (
        <div className="h-full flex flex-col bg-transparent border-l border-white/10 dark:border-gray-700/30">
            <div className="p-4 border-b border-white/10 dark:border-gray-700/30 flex justify-between items-center bg-white/10 dark:bg-gray-800/30">
                <h2 className="text-lg font-bold flex items-center gap-2">
                    {mode === 'reply' && <Reply className="w-4 h-4" />}
                    {mode === 'forward' && <Forward className="w-4 h-4" />}
                    {mode === 'new' && <Mail className="w-4 h-4" />}
                    {modalTitle}
                </h2>
                <button onClick={onClose} className="p-1 hover:bg-gray-100 dark:hover:bg-gray-800 rounded">
                    <X className="w-5 h-5" />
                </button>
            </div>

            <div className="p-4 space-y-3 overflow-y-auto flex-1">
                <div>
                    <div className="flex items-center justify-between mb-2">
                        <label className="block text-xs font-medium text-gray-500">To</label>
                        <label className="flex items-center gap-2 cursor-pointer">
                            <span className="text-xs text-gray-500">External Email</span>
                            <input
                                type="checkbox"
                                checked={data.isExternal || false}
                                onChange={e => onChange({ ...data, isExternal: e.target.checked, recipientId: '' })}
                                className="w-4 h-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                                disabled={mode === 'reply'}
                            />
                        </label>
                    </div>

                    {data.isExternal ? (
                        <div className="space-y-3">
                            <input
                                type="email"
                                placeholder="Recipient Email"
                                value={data.externalEmail || ''}
                                onChange={e => onChange({ ...data, externalEmail: e.target.value })}
                                className="w-full px-3 py-2 border border-gray-200 dark:border-gray-700 rounded-lg dark:bg-gray-800 text-sm"
                                disabled={mode === 'reply'}
                            />
                            <input
                                type="text"
                                placeholder="Recipient Name"
                                value={data.externalName || ''}
                                onChange={e => onChange({ ...data, externalName: e.target.value })}
                                className="w-full px-3 py-2 border border-gray-200 dark:border-gray-700 rounded-lg dark:bg-gray-800 text-sm"
                                disabled={mode === 'reply'}
                            />
                        </div>
                    ) : (
                        <select
                            value={data.recipientId}
                            onChange={e => onChange({ ...data, recipientId: e.target.value })}
                            className="w-full px-3 py-2 border border-gray-200 dark:border-gray-700 rounded-lg dark:bg-gray-800 text-sm"
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
                    <label className="block text-xs font-medium mb-1 text-gray-500">Subject</label>
                    <input
                        type="text"
                        value={data.subject}
                        onChange={e => onChange({ ...data, subject: e.target.value })}
                        placeholder="Enter subject..."
                        className="w-full px-3 py-2 border border-gray-200 dark:border-gray-700 rounded-lg dark:bg-gray-800 text-sm"
                    />
                </div>

                <div>
                    <label className="block text-xs font-medium mb-1 text-gray-500">Related Case (Optional)</label>
                    <select
                        value={data.caseId}
                        onChange={e => onChange({ ...data, caseId: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-200 dark:border-gray-700 rounded-lg dark:bg-gray-800 text-sm"
                    >
                        <option value="">None</option>
                        {cases.map((c) => (
                            <option key={c.id} value={c.id}>{c.caseNumber} - {c.clientName}</option>
                        ))}
                    </select>
                </div>

                <div>
                    <div className="flex items-center justify-between mb-1">
                        <label className="block text-xs font-medium text-gray-500">Message</label>
                        <button
                            type="button"
                            onClick={() => setShowTemplateModal(true)}
                            className="text-xs text-indigo-500 hover:text-indigo-400 flex items-center gap-1"
                        >
                            <FileText className="w-3 h-3" /> Load Template
                        </button>
                    </div>
                    <RichTextEditor
                        content={data.body}
                        onChange={body => onChange({ ...data, body })}
                        placeholder="Write your message..."
                        minHeight="12rem"
                    />
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

            <div className="p-4 border-t border-gray-100 dark:border-gray-800 flex justify-end gap-3">
                <button onClick={onClose} className="px-4 py-2 text-gray-600 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg text-sm">
                    Cancel
                </button>
                <button
                    onClick={onSend}
                    disabled={(!data.recipientId && !data.isExternal) || (data.isExternal && (!data.externalEmail || !data.externalName)) || !data.body}
                    className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 text-sm font-medium flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
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
        <Suspense fallback={<div className="flex items-center justify-center min-h-screen"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div></div>}>
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
                    ? "bg-indigo-500/10 text-indigo-700 dark:text-indigo-300 shadow-sm border border-indigo-500/20"
                    : "text-gray-600 dark:text-gray-400 hover:bg-white/10 dark:hover:bg-gray-700/50"
            )}
        >
            <Icon className="w-4 h-4" />
            {label}
            {count !== undefined && count > 0 && (
                <span className="ml-auto text-xs bg-indigo-100 dark:bg-indigo-900/30 text-indigo-600 px-1.5 py-0.5 rounded-full">
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
                isSelected ? "bg-indigo-500/10 dark:bg-indigo-500/20 backdrop-blur-sm border-l-2 border-indigo-500" : "hover:bg-white/10 dark:hover:bg-gray-800/30",
                !message.isRead && activeBox !== 'sent' ? "bg-indigo-500/5 dark:bg-indigo-900/20" : ""
            )}
        >
            <div className="flex items-start gap-2">
                <button
                    onClick={e => { e.stopPropagation(); onStar(); }}
                    className={cn(
                        "mt-0.5 flex-shrink-0 transition-colors",
                        message.starred ? "text-yellow-500" : "text-gray-300 hover:text-yellow-400"
                    )}
                >
                    <Star className={cn("w-4 h-4", message.starred && "fill-current")} />
                </button>
                <div className="flex-1 min-w-0">
                    <div className="flex justify-between items-center mb-0.5">
                        <span className={cn(
                            "text-sm truncate",
                            !message.isRead && activeBox !== 'sent' ? "font-bold text-gray-900 dark:text-white" : "font-medium text-gray-700 dark:text-gray-300"
                        )}>
                            {displayName}
                        </span>
                        <span className="text-[10px] text-gray-400 flex-shrink-0 ml-2">
                            {format(new Date(message.createdAt), 'MMM d')}
                        </span>
                    </div>
                    <h4 className={cn(
                        "text-xs mb-0.5 truncate",
                        !message.isRead && activeBox !== 'sent' ? "font-semibold text-gray-900 dark:text-white" : "text-gray-700 dark:text-gray-300"
                    )}>
                        {message.subject || '(No Subject)'}
                    </h4>
                    <p className="text-xs text-gray-600 dark:text-gray-400 line-clamp-1">{message.body}</p>
                </div>
            </div>
        </li>
    );
}
