'use client';

import { useState, useEffect, useRef } from 'react';
import { X, Lock, Pencil, Trash2, Send, MessageSquare } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { apiFetch } from '@/lib/api-client';

interface CommentUser {
    id: string;
    name: string;
}

interface AnnotationCommentData {
    id: string;
    type: string;
    content: string;
    deleted: boolean;
    createdAt: string;
    createdBy: CommentUser;
    replies: Omit<AnnotationCommentData, 'replies'>[];
}

interface AnnotationThreadPanelProps {
    resourceType: 'document' | 'message';
    resourceId: string;
    rootCommentId: string | null;
    initialType: 'HIGHLIGHT_PDF' | 'HIGHLIGHT_EMAIL' | 'DOCUMENT_NOTE' | 'EMAIL_NOTE';
    currentUserId: string;
    currentUserName: string;
    onClose: () => void;
    onCreated?: (comment: AnnotationCommentData) => void;
}

const LOCK_MS = 24 * 60 * 60 * 1000;

function isLocked(createdAt: string): boolean {
    return Date.now() - new Date(createdAt).getTime() > LOCK_MS;
}

export function AnnotationThreadPanel({
    resourceType,
    resourceId,
    rootCommentId,
    initialType,
    currentUserId,
    onClose,
    onCreated,
}: AnnotationThreadPanelProps) {
    const [root, setRoot] = useState<AnnotationCommentData | null>(null);
    const [inputText, setInputText] = useState('');
    const [replyText, setReplyText] = useState('');
    const [editingId, setEditingId] = useState<string | null>(null);
    const [editText, setEditText] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const inputRef = useRef<HTMLTextAreaElement>(null);

    const baseUrl = resourceType === 'document'
        ? `/api/documents/${resourceId}/annotation-comments`
        : `/api/messages/${resourceId}/annotation-comments`;

    useEffect(() => {
        if (!rootCommentId) return;
        fetchRoot();
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [rootCommentId]);

    useEffect(() => {
        if (!rootCommentId) {
            inputRef.current?.focus();
        }
    }, [rootCommentId]);

    async function fetchRoot() {
        if (!rootCommentId) return;
        try {
            const res = await fetch(baseUrl);
            if (!res.ok) return;
            const tree: AnnotationCommentData[] = await res.json();
            const found = tree.find(c => c.id === rootCommentId);
            if (found) setRoot(found);
        } catch {
            setError('Failed to load thread');
        }
    }

    async function submitNewRoot() {
        if (!inputText.trim()) return;
        setIsSubmitting(true);
        setError(null);
        try {
            const res = await apiFetch(baseUrl, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ type: initialType, content: inputText.trim() }),
            });
            if (!res.ok) throw new Error('Failed to create');
            const created: AnnotationCommentData = await res.json();
            const withReplies = { ...created, replies: [] };
            setRoot(withReplies);
            setInputText('');
            onCreated?.(withReplies);
        } catch {
            setError('Failed to save note. Please try again.');
        } finally {
            setIsSubmitting(false);
        }
    }

    async function submitReply() {
        if (!replyText.trim() || !root) return;
        setIsSubmitting(true);
        setError(null);
        try {
            const res = await apiFetch(`${baseUrl}/${root.id}/replies`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ content: replyText.trim() }),
            });
            if (!res.ok) throw new Error('Failed to reply');
            const reply = await res.json();
            setRoot(prev => prev ? { ...prev, replies: [...prev.replies, reply] } : prev);
            setReplyText('');
        } catch {
            setError('Failed to post reply. Please try again.');
        } finally {
            setIsSubmitting(false);
        }
    }

    async function saveEdit(commentId: string, isReply: boolean) {
        if (!editText.trim()) return;
        setIsSubmitting(true);
        setError(null);
        try {
            const res = await apiFetch(`${baseUrl}/${commentId}`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ content: editText.trim() }),
            });
            if (!res.ok) {
                const data = await res.json();
                throw new Error(data.error ?? 'Failed to update');
            }
            if (isReply) {
                setRoot(prev => prev ? {
                    ...prev,
                    replies: prev.replies.map(r => r.id === commentId ? { ...r, content: editText.trim() } : r),
                } : prev);
            } else if (root?.id === commentId) {
                setRoot(prev => prev ? { ...prev, content: editText.trim() } : prev);
            }
            setEditingId(null);
        } catch (e: unknown) {
            setError(e instanceof Error ? e.message : 'Failed to update');
        } finally {
            setIsSubmitting(false);
        }
    }

    async function deleteComment(commentId: string, isReply: boolean) {
        setError(null);
        try {
            const res = await apiFetch(`${baseUrl}/${commentId}`, { method: 'DELETE' });
            if (!res.ok) {
                const data = await res.json();
                throw new Error(data.error ?? 'Failed to delete');
            }
            if (isReply) {
                setRoot(prev => prev ? {
                    ...prev,
                    replies: prev.replies.map(r => r.id === commentId ? { ...r, content: '[deleted]', deleted: true } : r),
                } : prev);
            } else if (root?.id === commentId) {
                setRoot(prev => prev ? { ...prev, content: '[deleted]', deleted: true } : prev);
            }
        } catch (e: unknown) {
            setError(e instanceof Error ? e.message : 'Failed to delete');
        }
    }

    function startEdit(commentId: string, currentContent: string) {
        setEditingId(commentId);
        setEditText(currentContent);
    }

    function renderComment(
        comment: Omit<AnnotationCommentData, 'replies'>,
        isReply: boolean
    ) {
        const locked = isLocked(comment.createdAt);
        const isOwner = comment.createdBy.id === currentUserId;
        const isDeleted = comment.deleted;

        return (
            <div key={comment.id} className={`${isReply ? 'ml-6 border-l-2 border-gray-200 dark:border-gray-700 pl-3' : ''} py-2`}>
                <div className="flex items-start justify-between gap-2">
                    <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                            <span className="text-xs font-semibold text-gray-700 dark:text-gray-300 truncate">
                                {comment.createdBy.name}
                            </span>
                            <span className="text-xs text-gray-400 flex-shrink-0">
                                {formatDistanceToNow(new Date(comment.createdAt), { addSuffix: true })}
                            </span>
                            {locked && !isDeleted && (
                                <Lock className="w-3 h-3 text-gray-400 flex-shrink-0" aria-label="Locked — cannot be edited" />
                            )}
                        </div>

                        {editingId === comment.id ? (
                            <div className="space-y-1">
                                <textarea
                                    value={editText}
                                    onChange={e => setEditText(e.target.value)}
                                    className="w-full text-sm border border-gray-300 dark:border-gray-600 rounded px-2 py-1 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 resize-none focus:outline-none focus:ring-1 focus:ring-indigo-500"
                                    rows={3}
                                />
                                <div className="flex gap-1">
                                    <button
                                        onClick={() => saveEdit(comment.id, isReply)}
                                        disabled={isSubmitting || !editText.trim()}
                                        className="text-xs px-2 py-1 bg-indigo-600 text-white rounded hover:bg-indigo-700 disabled:opacity-50"
                                    >
                                        Save
                                    </button>
                                    <button
                                        onClick={() => setEditingId(null)}
                                        className="text-xs px-2 py-1 bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded hover:bg-gray-300"
                                    >
                                        Cancel
                                    </button>
                                </div>
                            </div>
                        ) : (
                            <p className={`text-sm ${isDeleted ? 'italic text-gray-400' : 'text-gray-800 dark:text-gray-200'}`}>
                                {comment.content}
                            </p>
                        )}
                    </div>

                    {isOwner && !locked && !isDeleted && editingId !== comment.id && (
                        <div className="flex gap-1 flex-shrink-0">
                            <button
                                onClick={() => startEdit(comment.id, comment.content)}
                                className="p-1 text-gray-400 hover:text-indigo-600 rounded"
                                title="Edit"
                            >
                                <Pencil className="w-3.5 h-3.5" />
                            </button>
                            <button
                                onClick={() => deleteComment(comment.id, isReply)}
                                className="p-1 text-gray-400 hover:text-red-500 rounded"
                                title="Delete"
                            >
                                <Trash2 className="w-3.5 h-3.5" />
                            </button>
                        </div>
                    )}
                </div>
            </div>
        );
    }

    return (
        <div className="absolute right-0 top-0 h-full w-80 bg-white dark:bg-gray-900 border-l border-gray-200 dark:border-gray-700 shadow-xl flex flex-col z-30">
            {/* Header */}
            <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200 dark:border-gray-700">
                <div className="flex items-center gap-2">
                    <MessageSquare className="w-4 h-4 text-indigo-600" />
                    <span className="text-sm font-semibold text-gray-800 dark:text-gray-200">
                        {root ? 'Thread' : 'New Note'}
                    </span>
                </div>
                <button onClick={onClose} className="p-1 hover:bg-gray-100 dark:hover:bg-gray-800 rounded">
                    <X className="w-4 h-4 text-gray-500" />
                </button>
            </div>

            {/* Thread body */}
            <div className="flex-1 overflow-y-auto px-4 py-2 space-y-1">
                {error && (
                    <p className="text-xs text-red-500 bg-red-50 dark:bg-red-900/20 rounded px-2 py-1">{error}</p>
                )}

                {root ? (
                    <>
                        {renderComment(root, false)}
                        {root.replies.map(reply => renderComment(reply, true))}
                    </>
                ) : (
                    <p className="text-xs text-gray-400 italic">Add the first note below.</p>
                )}
            </div>

            {/* Input */}
            <div className="border-t border-gray-200 dark:border-gray-700 px-4 py-3">
                {!root ? (
                    <div className="space-y-2">
                        <textarea
                            ref={inputRef}
                            value={inputText}
                            onChange={e => setInputText(e.target.value)}
                            placeholder="Write a note..."
                            className="w-full text-sm border border-gray-300 dark:border-gray-600 rounded px-2 py-1 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 resize-none focus:outline-none focus:ring-1 focus:ring-indigo-500"
                            rows={3}
                            onKeyDown={e => { if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) submitNewRoot(); }}
                        />
                        <button
                            onClick={submitNewRoot}
                            disabled={isSubmitting || !inputText.trim()}
                            className="w-full flex items-center justify-center gap-1 text-xs px-3 py-1.5 bg-indigo-600 text-white rounded hover:bg-indigo-700 disabled:opacity-50"
                        >
                            <Send className="w-3 h-3" /> Save Note
                        </button>
                    </div>
                ) : (
                    <div className="space-y-2">
                        <textarea
                            value={replyText}
                            onChange={e => setReplyText(e.target.value)}
                            placeholder="Reply..."
                            className="w-full text-sm border border-gray-300 dark:border-gray-600 rounded px-2 py-1 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 resize-none focus:outline-none focus:ring-1 focus:ring-indigo-500"
                            rows={2}
                            onKeyDown={e => { if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) submitReply(); }}
                        />
                        <button
                            onClick={submitReply}
                            disabled={isSubmitting || !replyText.trim()}
                            className="w-full flex items-center justify-center gap-1 text-xs px-3 py-1.5 bg-indigo-600 text-white rounded hover:bg-indigo-700 disabled:opacity-50"
                        >
                            <Send className="w-3 h-3" /> Reply
                        </button>
                    </div>
                )}
            </div>
        </div>
    );
}
