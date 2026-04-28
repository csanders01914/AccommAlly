'use client';

import { apiFetch } from '@/lib/api-client';
import { useEffect, useState, useCallback, useRef } from 'react';
import { useRouter, useParams, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import {
  Shield,
  LogOut,
  ArrowLeft,
  FileText,
  MessageSquare,
  Upload,
  CheckCircle,
  Clock,
  Loader2,
  AlertCircle,
  Send,
  RefreshCw,
  Download,
  User,
  Calendar,
} from 'lucide-react';
import { Suspense } from 'react';

type Tab = 'status' | 'messages' | 'documents';

interface CaseStatus {
  caseNumber: string;
  title: string;
  status: string;
  clientName: string;
  description: string | null;
  createdAt: string;
  updatedAt: string;
  examiner: string | null;
  documents: { id: string; fileName: string; createdAt: string; category: string }[];
  accommodations: { type: string; status: string; description: string | null }[];
}

interface PortalMessage {
  id: string;
  subject: string | null;
  content: string;
  createdAt: string;
  direction: 'PORTAL_INBOUND' | 'PORTAL_OUTBOUND';
}

interface Document {
  id: string;
  fileName: string;
  fileType: string;
  fileSize: number;
  category: string;
  createdAt: string;
}

function statusStyle(status: string): { color: string; bg: string; border: string } {
  const map: Record<string, { color: string; bg: string; border: string }> = {
    OPEN:           { color: '#D97706', bg: 'rgba(217,119,6,0.08)',   border: 'rgba(217,119,6,0.25)' },
    IN_PROGRESS:    { color: '#2563EB', bg: 'rgba(37,99,235,0.08)',   border: 'rgba(37,99,235,0.25)' },
    PENDING_REVIEW: { color: '#7C3AED', bg: 'rgba(124,58,237,0.08)', border: 'rgba(124,58,237,0.25)' },
    CLOSED:         { color: '#059669', bg: 'rgba(5,150,105,0.08)',   border: 'rgba(5,150,105,0.25)' },
    ARCHIVED:       { color: '#8C8880', bg: 'rgba(140,136,128,0.08)', border: 'rgba(140,136,128,0.25)' },
    APPEAL:         { color: '#EA580C', bg: 'rgba(234,88,12,0.08)',   border: 'rgba(234,88,12,0.25)' },
  };
  return map[status] ?? map.OPEN;
}

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function ClaimDetailInner() {
  const router = useRouter();
  const { caseId } = useParams<{ caseId: string }>();
  const searchParams = useSearchParams();
  const initialTab = (searchParams.get('tab') as Tab) || 'status';

  const [activeTab, setActiveTab] = useState<Tab>(initialTab);
  const [caseData, setCaseData] = useState<CaseStatus | null>(null);
  const [caseLoading, setCaseLoading] = useState(true);
  const [caseError, setCaseError] = useState('');

  const [messages, setMessages] = useState<PortalMessage[]>([]);
  const [messagesLoading, setMessagesLoading] = useState(false);
  const [newMessage, setNewMessage] = useState('');
  const [messageSubject, setMessageSubject] = useState('');
  const [sendingMessage, setSendingMessage] = useState(false);
  const [messageAlert, setMessageAlert] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const [documents, setDocuments] = useState<Document[]>([]);
  const [docsLoading, setDocsLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploadAlert, setUploadAlert] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [selectedCategory, setSelectedCategory] = useState('OTHER');

  const fetchStatus = useCallback(() => {
    setCaseLoading(true);
    setCaseError('');
    apiFetch(`/api/public/portal/claims/${caseId}/status`)
      .then(async (res) => {
        if (res.status === 401) { router.push('/portal/login'); throw new Error('Unauthorized'); }
        if (!res.ok) throw new Error('Failed to load claim');
        return res.json();
      })
      .then(setCaseData)
      .catch((err) => { if (err.message !== 'Unauthorized') setCaseError(err.message); })
      .finally(() => setCaseLoading(false));
  }, [caseId, router]);

  const fetchMessages = useCallback(() => {
    setMessagesLoading(true);
    apiFetch(`/api/public/portal/claims/${caseId}/messages`)
      .then(async (res) => {
        if (res.status === 401) { router.push('/portal/login'); return; }
        if (!res.ok) throw new Error('Failed to load messages');
        return res.json();
      })
      .then((data) => data && setMessages(data.messages || []))
      .catch(() => {})
      .finally(() => setMessagesLoading(false));
  }, [caseId, router]);

  const fetchDocuments = useCallback(() => {
    setDocsLoading(true);
    apiFetch(`/api/public/portal/claims/${caseId}/documents`)
      .then(async (res) => {
        if (res.status === 401) { router.push('/portal/login'); return; }
        if (!res.ok) throw new Error('Failed to load documents');
        return res.json();
      })
      .then((data) => data && setDocuments(data.documents || []))
      .catch(() => {})
      .finally(() => setDocsLoading(false));
  }, [caseId, router]);

  useEffect(() => { fetchStatus(); }, [fetchStatus]);
  useEffect(() => {
    if (activeTab === 'messages') fetchMessages();
    if (activeTab === 'documents') fetchDocuments();
  }, [activeTab, fetchMessages, fetchDocuments]);

  const handleSendMessage = async () => {
    if (!newMessage.trim()) return;
    setSendingMessage(true);
    setMessageAlert(null);
    try {
      const res = await apiFetch(`/api/public/portal/claims/${caseId}/messages`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ subject: messageSubject.trim() || null, content: newMessage.trim() }),
      });
      const data = await res.json();
      if (res.ok) {
        setNewMessage('');
        setMessageSubject('');
        setMessageAlert({ type: 'success', text: 'Message sent successfully.' });
        fetchMessages();
        setTimeout(() => setMessageAlert(null), 5000);
      } else {
        setMessageAlert({ type: 'error', text: data.error || 'Failed to send message.' });
      }
    } catch {
      setMessageAlert({ type: 'error', text: 'Failed to send message. Please try again.' });
    } finally {
      setSendingMessage(false);
    }
  };

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    setUploadAlert(null);
    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('category', selectedCategory);
      const res = await apiFetch(`/api/public/portal/claims/${caseId}/documents`, {
        method: 'POST',
        body: formData,
      });
      const data = await res.json();
      if (res.ok) {
        setUploadAlert({ type: 'success', text: `"${file.name}" uploaded successfully.` });
        fetchDocuments();
        if (fileInputRef.current) fileInputRef.current.value = '';
        setTimeout(() => setUploadAlert(null), 6000);
      } else {
        setUploadAlert({ type: 'error', text: data.error || 'Upload failed.' });
      }
    } catch {
      setUploadAlert({ type: 'error', text: 'Upload failed. Please try again.' });
    } finally {
      setUploading(false);
    }
  };

  const handleLogout = async () => {
    await apiFetch('/api/public/portal/logout', { method: 'POST' });
    router.push('/portal');
  };

  const tabs: { id: Tab; label: string; icon: React.ReactNode }[] = [
    { id: 'status', label: 'Status', icon: <FileText className="w-4 h-4" /> },
    { id: 'messages', label: 'Messages', icon: <MessageSquare className="w-4 h-4" /> },
    { id: 'documents', label: 'Documents', icon: <Upload className="w-4 h-4" /> },
  ];

  return (
    <div className="min-h-screen" style={{ backgroundColor: '#FAF6EE' }}>
      {/* Dark branded header */}
      <header className="sticky top-0 z-10" style={{ backgroundColor: '#1C1A17', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
        <div className="max-w-4xl mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div
              className="w-7 h-7 rounded-lg flex items-center justify-center"
              style={{ backgroundColor: '#0D9488' }}
            >
              <Shield className="w-3.5 h-3.5 text-white" aria-hidden="true" />
            </div>
            <span
              className="text-base"
              style={{ fontFamily: 'var(--font-instrument-serif), Georgia, serif', color: '#F0EEE8' }}
            >
              AccommAlly
            </span>
          </div>
          <button
            onClick={handleLogout}
            className="text-sm flex items-center gap-1.5 transition-colors"
            style={{ color: 'rgba(240,238,232,0.55)' }}
            onMouseEnter={(e) => (e.currentTarget.style.color = '#F0EEE8')}
            onMouseLeave={(e) => (e.currentTarget.style.color = 'rgba(240,238,232,0.55)')}
          >
            <LogOut className="w-4 h-4" /> Sign Out
          </button>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 py-8">
        <Link
          href="/portal/dashboard/claims"
          className="inline-flex items-center gap-1 text-sm mb-6 transition-colors"
          style={{ color: '#8C8880' }}
        >
          <ArrowLeft className="w-4 h-4" /> All Claims
        </Link>

        {/* Case Header */}
        {caseLoading && !caseData && (
          <div className="flex justify-center py-8">
            <Loader2 className="w-8 h-8 animate-spin" style={{ color: '#0D9488' }} />
          </div>
        )}

        {caseError && (
          <div
            className="rounded-2xl p-8 text-center mb-6"
            style={{ backgroundColor: '#FFFFFF', border: '1px solid #E5E2DB' }}
          >
            <AlertCircle className="w-8 h-8 mx-auto mb-3" style={{ color: '#DC2626' }} />
            <p className="text-sm mb-4" style={{ color: '#5C5850' }}>{caseError}</p>
            <button onClick={fetchStatus} className="text-sm font-medium" style={{ color: '#0D9488' }}>
              Try again
            </button>
          </div>
        )}

        {caseData && (
          <>
            <div
              className="rounded-2xl p-6 mb-6 shadow-sm"
              style={{ backgroundColor: '#FFFFFF', border: '1px solid #E5E2DB' }}
            >
              <div className="flex flex-col sm:flex-row justify-between gap-4">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-xs font-mono" style={{ color: '#8C8880' }}>{caseData.caseNumber}</span>
                    {(() => {
                      const s = statusStyle(caseData.status);
                      return (
                        <span
                          className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold"
                          style={{ color: s.color, backgroundColor: s.bg, border: `1px solid ${s.border}` }}
                        >
                          {caseData.status === 'CLOSED' ? <CheckCircle className="w-3 h-3" /> : <Clock className="w-3 h-3" />}
                          {caseData.status.replace('_', ' ')}
                        </span>
                      );
                    })()}
                  </div>
                  <h1
                    className="text-xl"
                    style={{ fontFamily: 'var(--font-instrument-serif), Georgia, serif', color: '#1C1A17' }}
                  >
                    {caseData.title}
                  </h1>
                </div>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mt-4">
                <InfoCell icon={<User className="w-3.5 h-3.5" />} label="Examiner" value={caseData.examiner || 'Pending'} />
                <InfoCell icon={<Calendar className="w-3.5 h-3.5" />} label="Filed" value={new Date(caseData.createdAt).toLocaleDateString()} />
                <InfoCell icon={<Clock className="w-3.5 h-3.5" />} label="Updated" value={new Date(caseData.updatedAt).toLocaleDateString()} />
              </div>
            </div>

            {/* Tabs */}
            <div
              className="flex gap-1 p-1 rounded-xl shadow-sm w-fit mb-6"
              style={{ backgroundColor: '#FFFFFF', border: '1px solid #E5E2DB' }}
            >
              {tabs.map((t) => (
                <button
                  key={t.id}
                  onClick={() => setActiveTab(t.id)}
                  className="py-2 px-4 rounded-lg text-sm font-medium transition-all flex items-center gap-2"
                  style={
                    activeTab === t.id
                      ? { backgroundColor: '#0D9488', color: '#FFFFFF' }
                      : { color: '#5C5850', backgroundColor: 'transparent' }
                  }
                  onMouseEnter={(e) => {
                    if (activeTab !== t.id) (e.currentTarget as HTMLElement).style.backgroundColor = '#F3F1EC';
                  }}
                  onMouseLeave={(e) => {
                    if (activeTab !== t.id) (e.currentTarget as HTMLElement).style.backgroundColor = 'transparent';
                  }}
                >
                  {t.icon} {t.label}
                </button>
              ))}
            </div>

            {/* STATUS TAB */}
            {activeTab === 'status' && (
              <div className="space-y-6">
                <div
                  className="rounded-2xl p-6 shadow-sm"
                  style={{ backgroundColor: '#FFFFFF', border: '1px solid #E5E2DB' }}
                >
                  <h3 className="font-semibold mb-4 flex items-center gap-2" style={{ color: '#1C1A17' }}>
                    <Calendar className="w-4 h-4" style={{ color: '#0D9488' }} /> Process Timeline
                  </h3>
                  <ol className="space-y-4">
                    <TimelineStep completed title="Request Submitted" date={caseData.createdAt} />
                    <TimelineStep
                      completed={caseData.status !== 'OPEN'}
                      active={caseData.status === 'OPEN'}
                      title="Coordinator Review"
                    />
                    <TimelineStep
                      completed={caseData.status === 'CLOSED'}
                      title="Decision Made"
                    />
                  </ol>
                </div>

                {caseData.description && (
                  <div
                    className="rounded-2xl p-6 shadow-sm"
                    style={{ backgroundColor: '#FFFFFF', border: '1px solid #E5E2DB' }}
                  >
                    <h3 className="font-semibold mb-3" style={{ color: '#1C1A17' }}>Request Details</h3>
                    <p className="text-sm whitespace-pre-wrap leading-relaxed" style={{ color: '#5C5850' }}>{caseData.description}</p>
                  </div>
                )}

                {caseData.accommodations.length > 0 && (
                  <div
                    className="rounded-2xl p-6 shadow-sm"
                    style={{ backgroundColor: '#FFFFFF', border: '1px solid #E5E2DB' }}
                  >
                    <h3 className="font-semibold mb-4" style={{ color: '#1C1A17' }}>Accommodations</h3>
                    <ul className="space-y-3">
                      {caseData.accommodations.map((acc, i) => (
                        <li
                          key={i}
                          className="flex items-start gap-3 p-3 rounded-xl"
                          style={{ backgroundColor: '#FAF6EE', border: '1px solid #E5E2DB' }}
                        >
                          <div className="flex-1">
                            <p className="text-sm font-medium" style={{ color: '#1C1A17' }}>{acc.type.replace(/_/g, ' ')}</p>
                            {acc.description && <p className="text-xs mt-0.5" style={{ color: '#8C8880' }}>{acc.description}</p>}
                          </div>
                          {(() => {
                            const accStyle =
                              acc.status === 'APPROVED'
                                ? { color: '#059669', bg: 'rgba(5,150,105,0.08)', border: 'rgba(5,150,105,0.25)' }
                                : acc.status === 'REJECTED'
                                ? { color: '#DC2626', bg: 'rgba(220,38,38,0.08)', border: 'rgba(220,38,38,0.25)' }
                                : { color: '#D97706', bg: 'rgba(217,119,6,0.08)', border: 'rgba(217,119,6,0.25)' };
                            return (
                              <span
                                className="text-xs font-semibold px-2 py-0.5 rounded-full flex-shrink-0"
                                style={{ color: accStyle.color, backgroundColor: accStyle.bg, border: `1px solid ${accStyle.border}` }}
                              >
                                {acc.status}
                              </span>
                            );
                          })()}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            )}

            {/* MESSAGES TAB */}
            {activeTab === 'messages' && (
              <div
                className="rounded-2xl shadow-sm overflow-hidden"
                style={{ backgroundColor: '#FFFFFF', border: '1px solid #E5E2DB' }}
              >
                <div
                  className="px-6 py-4 flex items-center justify-between"
                  style={{ borderBottom: '1px solid #E5E2DB', backgroundColor: '#FAF6EE' }}
                >
                  <h3 className="font-semibold flex items-center gap-2" style={{ color: '#1C1A17' }}>
                    <MessageSquare className="w-4 h-4" style={{ color: '#0D9488' }} /> Messages with Your Examiner
                  </h3>
                  <button
                    onClick={fetchMessages}
                    className="p-1.5 rounded-lg transition-colors"
                    title="Refresh"
                    style={{ color: '#0D9488' }}
                  >
                    <RefreshCw className={`w-4 h-4 ${messagesLoading ? 'animate-spin' : ''}`} />
                  </button>
                </div>

                <div className="max-h-96 overflow-y-auto p-4 space-y-3">
                  {messagesLoading && messages.length === 0 ? (
                    <div className="flex justify-center py-8">
                      <Loader2 className="w-6 h-6 animate-spin" style={{ color: '#0D9488' }} />
                    </div>
                  ) : messages.length === 0 ? (
                    <p className="text-center py-8 text-sm" style={{ color: '#5C5850' }}>
                      No messages yet. Send a message to your examiner below.
                    </p>
                  ) : (
                    messages.map((msg) => (
                      <div
                        key={msg.id}
                        className="p-4 rounded-xl"
                        style={
                          msg.direction === 'PORTAL_INBOUND'
                            ? { backgroundColor: 'rgba(13,148,136,0.05)', border: '1px solid rgba(13,148,136,0.18)', marginLeft: '1rem' }
                            : { backgroundColor: '#FAF6EE', border: '1px solid #E5E2DB', marginRight: '1rem' }
                        }
                      >
                        <div className="flex items-center gap-2 mb-2">
                          <div
                            className="w-6 h-6 rounded-full flex items-center justify-center"
                            style={msg.direction === 'PORTAL_INBOUND' ? { backgroundColor: 'rgba(13,148,136,0.1)' } : { backgroundColor: '#F3F1EC' }}
                          >
                            <User
                              className="w-3 h-3"
                              style={{ color: msg.direction === 'PORTAL_INBOUND' ? '#0D9488' : '#5C5850' }}
                            />
                          </div>
                          <span className="text-sm font-bold" style={{ color: '#1C1A17' }}>
                            {msg.direction === 'PORTAL_INBOUND' ? 'You' : 'Examiner'}
                          </span>
                          <span className="text-xs ml-auto" style={{ color: '#8C8880' }}>
                            {new Date(msg.createdAt).toLocaleString()}
                          </span>
                        </div>
                        {msg.subject && (
                          <p
                            className="text-sm font-semibold mb-2 pb-2"
                            style={{ color: '#1C1A17', borderBottom: '1px solid #E5E2DB' }}
                          >
                            {msg.subject}
                          </p>
                        )}
                        <p className="text-sm whitespace-pre-wrap leading-relaxed" style={{ color: '#1C1A17' }}>{msg.content}</p>
                      </div>
                    ))
                  )}
                </div>

                <div className="p-4 space-y-3" style={{ borderTop: '1px solid #E5E2DB', backgroundColor: '#FAF6EE' }}>
                  {messageAlert && (
                    <div
                      className="flex items-center gap-2 text-sm p-3 rounded-lg"
                      style={
                        messageAlert.type === 'success'
                          ? { color: '#059669', backgroundColor: 'rgba(5,150,105,0.08)', border: '1px solid rgba(5,150,105,0.25)' }
                          : { color: '#DC2626', backgroundColor: 'rgba(220,38,38,0.08)', border: '1px solid rgba(220,38,38,0.25)' }
                      }
                    >
                      {messageAlert.type === 'success' ? <CheckCircle className="w-4 h-4" /> : <AlertCircle className="w-4 h-4" />}
                      {messageAlert.text}
                    </div>
                  )}
                  <input
                    type="text"
                    placeholder="Subject (optional)"
                    value={messageSubject}
                    onChange={(e) => setMessageSubject(e.target.value)}
                    className="w-full rounded-lg px-4 py-2 text-sm outline-none transition-all"
                    style={{ backgroundColor: '#FFFFFF', border: '1px solid #E5E2DB', color: '#1C1A17' }}
                    onFocus={(e) => (e.currentTarget.style.boxShadow = '0 0 0 2px #115E59')}
                    onBlur={(e) => (e.currentTarget.style.boxShadow = 'none')}
                  />
                  <div className="flex gap-3">
                    <textarea
                      placeholder="Type your message..."
                      value={newMessage}
                      onChange={(e) => setNewMessage(e.target.value)}
                      rows={3}
                      className="flex-1 rounded-lg px-4 py-2 text-sm outline-none resize-none transition-all"
                      style={{ backgroundColor: '#FFFFFF', border: '1px solid #E5E2DB', color: '#1C1A17' }}
                      onFocus={(e) => (e.currentTarget.style.boxShadow = '0 0 0 2px #115E59')}
                      onBlur={(e) => (e.currentTarget.style.boxShadow = 'none')}
                    />
                    <button
                      onClick={handleSendMessage}
                      disabled={!newMessage.trim() || sendingMessage}
                      className="self-end px-4 py-2 font-medium rounded-lg transition-all flex items-center gap-2 shadow-sm disabled:opacity-50"
                      style={{ backgroundColor: '#0D9488', color: '#FFFFFF' }}
                      onMouseEnter={(e) => !sendingMessage && newMessage.trim() && (e.currentTarget.style.backgroundColor = '#0F766E')}
                      onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = '#0D9488')}
                    >
                      {sendingMessage ? <Loader2 className="w-4 h-4 animate-spin" /> : <><Send className="w-4 h-4" /> Send</>}
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* DOCUMENTS TAB */}
            {activeTab === 'documents' && (
              <div className="space-y-4">
                {/* Upload Card */}
                <div
                  className="rounded-2xl p-6 shadow-sm"
                  style={{ backgroundColor: '#FFFFFF', border: '1px solid #E5E2DB' }}
                >
                  <h3 className="font-semibold mb-4 flex items-center gap-2" style={{ color: '#1C1A17' }}>
                    <Upload className="w-4 h-4" style={{ color: '#0D9488' }} /> Upload a Document
                  </h3>

                  {uploadAlert && (
                    <div
                      className="flex items-center gap-2 text-sm p-3 rounded-lg mb-4"
                      style={
                        uploadAlert.type === 'success'
                          ? { color: '#059669', backgroundColor: 'rgba(5,150,105,0.08)', border: '1px solid rgba(5,150,105,0.25)' }
                          : { color: '#DC2626', backgroundColor: 'rgba(220,38,38,0.08)', border: '1px solid rgba(220,38,38,0.25)' }
                      }
                    >
                      {uploadAlert.type === 'success' ? <CheckCircle className="w-4 h-4" /> : <AlertCircle className="w-4 h-4" />}
                      {uploadAlert.text}
                    </div>
                  )}

                  <div className="flex flex-col sm:flex-row gap-3">
                    <select
                      value={selectedCategory}
                      onChange={(e) => setSelectedCategory(e.target.value)}
                      className="rounded-lg px-3 py-2 text-sm outline-none transition-all"
                      style={{ backgroundColor: '#FFFFFF', border: '1px solid #E5E2DB', color: '#1C1A17' }}
                      onFocus={(e) => (e.currentTarget.style.boxShadow = '0 0 0 2px #115E59')}
                      onBlur={(e) => (e.currentTarget.style.boxShadow = 'none')}
                    >
                      <option value="MEDICAL">Medical</option>
                      <option value="LEGAL">Legal</option>
                      <option value="HR">HR</option>
                      <option value="CORRESPONDENCE">Correspondence</option>
                      <option value="OTHER">Other</option>
                    </select>
                    <label
                      className="flex-1 flex items-center justify-center gap-2 border-2 border-dashed rounded-xl px-4 py-3 cursor-pointer transition-colors group"
                      style={{ borderColor: '#E5E2DB' }}
                      onMouseEnter={(e) => (e.currentTarget.style.borderColor = 'rgba(13,148,136,0.4)')}
                      onMouseLeave={(e) => (e.currentTarget.style.borderColor = '#E5E2DB')}
                    >
                      {uploading ? (
                        <Loader2 className="w-5 h-5 animate-spin" style={{ color: '#0D9488' }} />
                      ) : (
                        <>
                          <Upload className="w-5 h-5" style={{ color: '#8C8880' }} />
                          <span className="text-sm" style={{ color: '#5C5850' }}>
                            Click to select a file (max 10 MB)
                          </span>
                        </>
                      )}
                      <input
                        ref={fileInputRef}
                        type="file"
                        className="sr-only"
                        disabled={uploading}
                        onChange={handleUpload}
                        accept=".pdf,.jpg,.jpeg,.png,.gif,.webp,.tiff,.doc,.docx,.xls,.xlsx,.txt,.zip"
                      />
                    </label>
                  </div>
                  <p className="text-xs mt-2" style={{ color: '#8C8880' }}>
                    Accepted: PDF, images, Word, Excel, text, ZIP
                  </p>
                </div>

                {/* Document List */}
                <div
                  className="rounded-2xl p-6 shadow-sm"
                  style={{ backgroundColor: '#FFFFFF', border: '1px solid #E5E2DB' }}
                >
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="font-semibold flex items-center gap-2" style={{ color: '#1C1A17' }}>
                      <FileText className="w-4 h-4" style={{ color: '#0D9488' }} /> Documents on File
                    </h3>
                    <button
                      onClick={fetchDocuments}
                      className="p-1.5 rounded-lg transition-colors"
                      title="Refresh"
                      style={{ color: '#8C8880' }}
                    >
                      <RefreshCw className={`w-4 h-4 ${docsLoading ? 'animate-spin' : ''}`} />
                    </button>
                  </div>

                  {docsLoading && documents.length === 0 ? (
                    <div className="flex justify-center py-6">
                      <Loader2 className="w-6 h-6 animate-spin" style={{ color: '#0D9488' }} />
                    </div>
                  ) : documents.length === 0 ? (
                    <p className="text-sm text-center py-6" style={{ color: '#5C5850' }}>No documents on file for this claim.</p>
                  ) : (
                    <ul className="space-y-2">
                      {documents.map((doc) => (
                        <li
                          key={doc.id}
                          className="flex items-center justify-between p-3 rounded-xl transition-colors"
                          style={{ backgroundColor: '#FAF6EE', border: '1px solid #E5E2DB' }}
                        >
                          <div className="flex items-center gap-3 min-w-0">
                            <div
                              className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0"
                              style={{ backgroundColor: 'rgba(13,148,136,0.08)' }}
                            >
                              <FileText className="w-4 h-4" style={{ color: '#0D9488' }} />
                            </div>
                            <div className="min-w-0">
                              <p className="text-sm font-medium truncate" style={{ color: '#1C1A17' }}>{doc.fileName}</p>
                              <p className="text-xs" style={{ color: '#8C8880' }}>
                                {doc.category} · {formatBytes(doc.fileSize)} · {new Date(doc.createdAt).toLocaleDateString()}
                              </p>
                            </div>
                          </div>
                          <a
                            href={`/api/public/portal/documents/${doc.id}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="p-2 rounded-lg transition-colors flex-shrink-0 ml-2"
                            title="View/Download"
                            style={{ color: '#0D9488' }}
                          >
                            <Download className="w-4 h-4" />
                          </a>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              </div>
            )}
          </>
        )}
      </main>
    </div>
  );
}

function TimelineStep({
  completed,
  active,
  title,
  date,
}: {
  completed: boolean;
  active?: boolean;
  title: string;
  date?: string;
}) {
  return (
    <li className="flex gap-4">
      <div className="flex flex-col items-center">
        <div
          className="w-8 h-8 rounded-full flex items-center justify-center border-2"
          style={
            completed
              ? { backgroundColor: 'rgba(5,150,105,0.08)', borderColor: '#059669', color: '#059669' }
              : active
              ? { backgroundColor: 'rgba(13,148,136,0.08)', borderColor: '#0D9488', color: '#0D9488' }
              : { backgroundColor: 'transparent', borderColor: '#E5E2DB', color: '#E5E2DB' }
          }
        >
          {completed ? <CheckCircle className="w-5 h-5" /> : <div className="w-2 h-2 bg-current rounded-full" />}
        </div>
        <div className="w-0.5 h-full min-h-[28px]" style={{ backgroundColor: '#E5E2DB' }} />
      </div>
      <div className={`pb-6 ${completed || active ? 'opacity-100' : 'opacity-40'}`}>
        <p className="font-medium text-sm" style={{ color: '#1C1A17' }}>{title}</p>
        {date && <p className="text-xs mt-0.5" style={{ color: '#8C8880' }}>{new Date(date).toLocaleDateString()}</p>}
        {active && <p className="text-xs mt-0.5" style={{ color: '#0D9488' }}>In Progress</p>}
      </div>
    </li>
  );
}

function InfoCell({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div className="rounded-xl p-3" style={{ backgroundColor: '#FAF6EE', border: '1px solid #E5E2DB' }}>
      <p className="text-xs flex items-center gap-1 mb-1" style={{ color: '#8C8880' }}>
        {icon} {label}
      </p>
      <p className="text-sm font-medium" style={{ color: '#1C1A17' }}>{value}</p>
    </div>
  );
}

export default function ClaimDetailPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: '#FAF6EE' }}>
          <Loader2 className="w-8 h-8 animate-spin" style={{ color: '#0D9488' }} />
        </div>
      }
    >
      <ClaimDetailInner />
    </Suspense>
  );
}
