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

function statusStyle(status: string) {
  const map: Record<string, string> = {
    OPEN: 'text-yellow-500 bg-yellow-500/10 border-yellow-500/20',
    IN_PROGRESS: 'text-blue-500 bg-blue-500/10 border-blue-500/20',
    PENDING_REVIEW: 'text-violet-500 bg-violet-500/10 border-violet-500/20',
    CLOSED: 'text-green-500 bg-green-500/10 border-green-500/20',
    ARCHIVED: 'text-text-muted bg-surface border-border',
    APPEAL: 'text-orange-500 bg-orange-500/10 border-orange-500/20',
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
    <div className="min-h-screen bg-background">
      <header className="border-b border-border bg-surface sticky top-0 z-10">
        <div className="max-w-4xl mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Shield className="w-5 h-5 text-primary-500" />
            <span className="text-text-primary font-bold">AccommAlly Portal</span>
          </div>
          <button
            onClick={handleLogout}
            className="text-sm text-text-secondary hover:text-text-primary flex items-center gap-2 transition-colors"
          >
            <LogOut className="w-4 h-4" /> Sign Out
          </button>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 py-8">
        <Link
          href="/portal/dashboard/claims"
          className="inline-flex items-center gap-1 text-sm text-text-muted hover:text-text-secondary transition-colors mb-6"
        >
          <ArrowLeft className="w-4 h-4" /> All Claims
        </Link>

        {/* Case Header */}
        {caseLoading && !caseData && (
          <div className="flex justify-center py-8">
            <Loader2 className="w-8 h-8 text-primary-500 animate-spin" />
          </div>
        )}

        {caseError && (
          <div className="bg-surface border border-border rounded-2xl p-8 text-center mb-6">
            <AlertCircle className="w-8 h-8 text-red-400 mx-auto mb-3" />
            <p className="text-text-secondary text-sm mb-4">{caseError}</p>
            <button onClick={fetchStatus} className="text-sm text-primary-500 hover:text-primary-600 font-medium">
              Try again
            </button>
          </div>
        )}

        {caseData && (
          <>
            <div className="bg-surface border border-border rounded-2xl p-6 mb-6 shadow-sm">
              <div className="flex flex-col sm:flex-row justify-between gap-4">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-xs font-mono text-text-muted">{caseData.caseNumber}</span>
                    <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full border text-xs font-semibold ${statusStyle(caseData.status)}`}>
                      {caseData.status === 'CLOSED'
                        ? <CheckCircle className="w-3 h-3" />
                        : <Clock className="w-3 h-3" />}
                      {caseData.status.replace('_', ' ')}
                    </span>
                  </div>
                  <h1 className="text-xl font-bold text-text-primary">{caseData.title}</h1>
                </div>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mt-4">
                <InfoCell icon={<User className="w-3.5 h-3.5" />} label="Examiner" value={caseData.examiner || 'Pending'} />
                <InfoCell icon={<Calendar className="w-3.5 h-3.5" />} label="Filed" value={new Date(caseData.createdAt).toLocaleDateString()} />
                <InfoCell icon={<Clock className="w-3.5 h-3.5" />} label="Updated" value={new Date(caseData.updatedAt).toLocaleDateString()} />
              </div>
            </div>

            {/* Tabs */}
            <div className="flex gap-1 bg-surface border border-border p-1 rounded-xl shadow-sm w-fit mb-6">
              {tabs.map((t) => (
                <button
                  key={t.id}
                  onClick={() => setActiveTab(t.id)}
                  className={`py-2 px-4 rounded-lg text-sm font-medium transition-all flex items-center gap-2 ${
                    activeTab === t.id
                      ? 'bg-primary-500 text-white shadow-sm'
                      : 'text-text-secondary hover:text-text-primary hover:bg-surface-raised'
                  }`}
                >
                  {t.icon} {t.label}
                </button>
              ))}
            </div>

            {/* STATUS TAB */}
            {activeTab === 'status' && (
              <div className="space-y-6">
                {/* Timeline */}
                <div className="bg-surface border border-border rounded-2xl p-6 shadow-sm">
                  <h3 className="font-semibold text-text-primary mb-4 flex items-center gap-2">
                    <Calendar className="w-4 h-4 text-primary-500" /> Process Timeline
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

                {/* Description */}
                {caseData.description && (
                  <div className="bg-surface border border-border rounded-2xl p-6 shadow-sm">
                    <h3 className="font-semibold text-text-primary mb-3">Request Details</h3>
                    <p className="text-text-secondary text-sm whitespace-pre-wrap leading-relaxed">{caseData.description}</p>
                  </div>
                )}

                {/* Accommodations */}
                {caseData.accommodations.length > 0 && (
                  <div className="bg-surface border border-border rounded-2xl p-6 shadow-sm">
                    <h3 className="font-semibold text-text-primary mb-4">Accommodations</h3>
                    <ul className="space-y-3">
                      {caseData.accommodations.map((acc, i) => (
                        <li key={i} className="flex items-start gap-3 p-3 bg-background border border-border rounded-xl">
                          <div className="flex-1">
                            <p className="text-sm font-medium text-text-primary">{acc.type.replace(/_/g, ' ')}</p>
                            {acc.description && <p className="text-xs text-text-muted mt-0.5">{acc.description}</p>}
                          </div>
                          <span className={`text-xs font-semibold px-2 py-0.5 rounded-full border ${
                            acc.status === 'APPROVED' ? 'text-green-500 bg-green-500/10 border-green-500/20' :
                            acc.status === 'REJECTED' ? 'text-red-400 bg-red-400/10 border-red-400/20' :
                            'text-yellow-500 bg-yellow-500/10 border-yellow-500/20'
                          }`}>{acc.status}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            )}

            {/* MESSAGES TAB */}
            {activeTab === 'messages' && (
              <div className="bg-surface border border-border rounded-2xl shadow-sm overflow-hidden">
                <div className="px-6 py-4 border-b border-border bg-background flex items-center justify-between">
                  <h3 className="font-semibold text-text-primary flex items-center gap-2">
                    <MessageSquare className="w-4 h-4 text-primary-500" /> Messages with Your Examiner
                  </h3>
                  <button
                    onClick={fetchMessages}
                    className="p-1.5 hover:bg-surface rounded-lg transition-colors"
                    title="Refresh"
                  >
                    <RefreshCw className={`w-4 h-4 text-primary-500 ${messagesLoading ? 'animate-spin' : ''}`} />
                  </button>
                </div>

                <div className="max-h-96 overflow-y-auto p-4 space-y-3">
                  {messagesLoading && messages.length === 0 ? (
                    <div className="flex justify-center py-8">
                      <Loader2 className="w-6 h-6 text-primary-500 animate-spin" />
                    </div>
                  ) : messages.length === 0 ? (
                    <p className="text-center text-text-secondary py-8 text-sm">
                      No messages yet. Send a message to your examiner below.
                    </p>
                  ) : (
                    messages.map((msg) => (
                      <div
                        key={msg.id}
                        className={`p-4 rounded-xl border ${
                          msg.direction === 'PORTAL_INBOUND'
                            ? 'bg-primary-500/5 border-primary-500/20 ml-4'
                            : 'bg-background border-border mr-4'
                        }`}
                      >
                        <div className="flex items-center gap-2 mb-2">
                          <div className={`w-6 h-6 rounded-full flex items-center justify-center ${msg.direction === 'PORTAL_INBOUND' ? 'bg-primary-500/10' : 'bg-surface-raised'}`}>
                            <User className={`w-3 h-3 ${msg.direction === 'PORTAL_INBOUND' ? 'text-primary-500' : 'text-text-secondary'}`} />
                          </div>
                          <span className="text-sm font-bold text-text-primary">
                            {msg.direction === 'PORTAL_INBOUND' ? 'You' : 'Examiner'}
                          </span>
                          <span className="text-xs text-text-muted ml-auto">
                            {new Date(msg.createdAt).toLocaleString()}
                          </span>
                        </div>
                        {msg.subject && (
                          <p className="text-sm font-semibold text-text-primary mb-2 border-b border-border pb-2">{msg.subject}</p>
                        )}
                        <p className="text-sm text-text-primary whitespace-pre-wrap leading-relaxed">{msg.content}</p>
                      </div>
                    ))
                  )}
                </div>

                <div className="p-4 border-t border-border bg-background space-y-3">
                  {messageAlert && (
                    <div className={`flex items-center gap-2 text-sm p-3 rounded-lg border ${
                      messageAlert.type === 'success'
                        ? 'text-green-700 bg-green-50 border-green-200'
                        : 'text-red-500 bg-red-500/10 border-red-500/20'
                    }`}>
                      {messageAlert.type === 'success' ? <CheckCircle className="w-4 h-4" /> : <AlertCircle className="w-4 h-4" />}
                      {messageAlert.text}
                    </div>
                  )}
                  <input
                    type="text"
                    placeholder="Subject (optional)"
                    value={messageSubject}
                    onChange={(e) => setMessageSubject(e.target.value)}
                    className="w-full bg-surface border border-border rounded-lg px-4 py-2 text-text-primary placeholder-text-muted outline-none focus:ring-2 focus:ring-[#0D9488] text-sm"
                  />
                  <div className="flex gap-3">
                    <textarea
                      placeholder="Type your message..."
                      value={newMessage}
                      onChange={(e) => setNewMessage(e.target.value)}
                      rows={3}
                      className="flex-1 bg-surface border border-border rounded-lg px-4 py-2 text-text-primary placeholder-text-muted outline-none focus:ring-2 focus:ring-[#0D9488] resize-none text-sm"
                    />
                    <button
                      onClick={handleSendMessage}
                      disabled={!newMessage.trim() || sendingMessage}
                      className="self-end px-4 py-2 bg-primary-500 hover:bg-primary-600 disabled:bg-primary-500/50 text-white font-medium rounded-lg transition-all flex items-center gap-2 shadow-sm"
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
                <div className="bg-surface border border-border rounded-2xl p-6 shadow-sm">
                  <h3 className="font-semibold text-text-primary mb-4 flex items-center gap-2">
                    <Upload className="w-4 h-4 text-primary-500" /> Upload a Document
                  </h3>

                  {uploadAlert && (
                    <div className={`flex items-center gap-2 text-sm p-3 rounded-lg border mb-4 ${
                      uploadAlert.type === 'success'
                        ? 'text-green-700 bg-green-50 border-green-200'
                        : 'text-red-500 bg-red-500/10 border-red-500/20'
                    }`}>
                      {uploadAlert.type === 'success' ? <CheckCircle className="w-4 h-4" /> : <AlertCircle className="w-4 h-4" />}
                      {uploadAlert.text}
                    </div>
                  )}

                  <div className="flex flex-col sm:flex-row gap-3">
                    <select
                      value={selectedCategory}
                      onChange={(e) => setSelectedCategory(e.target.value)}
                      className="bg-surface border border-border rounded-lg px-3 py-2 text-text-primary text-sm outline-none focus:ring-2 focus:ring-[#0D9488]"
                    >
                      <option value="MEDICAL">Medical</option>
                      <option value="LEGAL">Legal</option>
                      <option value="HR">HR</option>
                      <option value="CORRESPONDENCE">Correspondence</option>
                      <option value="OTHER">Other</option>
                    </select>
                    <label className="flex-1 flex items-center justify-center gap-2 border-2 border-dashed border-border hover:border-primary-500/50 rounded-xl px-4 py-3 cursor-pointer transition-colors group">
                      {uploading ? (
                        <Loader2 className="w-5 h-5 text-primary-500 animate-spin" />
                      ) : (
                        <>
                          <Upload className="w-5 h-5 text-text-muted group-hover:text-primary-500 transition-colors" />
                          <span className="text-sm text-text-secondary group-hover:text-primary-500 transition-colors">
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
                  <p className="text-xs text-text-muted mt-2">
                    Accepted: PDF, images, Word, Excel, text, ZIP
                  </p>
                </div>

                {/* Document List */}
                <div className="bg-surface border border-border rounded-2xl p-6 shadow-sm">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="font-semibold text-text-primary flex items-center gap-2">
                      <FileText className="w-4 h-4 text-primary-500" /> Documents on File
                    </h3>
                    <button
                      onClick={fetchDocuments}
                      className="p-1.5 hover:bg-background rounded-lg transition-colors"
                      title="Refresh"
                    >
                      <RefreshCw className={`w-4 h-4 text-text-muted ${docsLoading ? 'animate-spin' : ''}`} />
                    </button>
                  </div>

                  {docsLoading && documents.length === 0 ? (
                    <div className="flex justify-center py-6">
                      <Loader2 className="w-6 h-6 text-primary-500 animate-spin" />
                    </div>
                  ) : documents.length === 0 ? (
                    <p className="text-text-secondary text-sm text-center py-6">No documents on file for this claim.</p>
                  ) : (
                    <ul className="space-y-2">
                      {documents.map((doc) => (
                        <li
                          key={doc.id}
                          className="flex items-center justify-between p-3 bg-background border border-border rounded-xl hover:bg-surface-raised transition-colors"
                        >
                          <div className="flex items-center gap-3 min-w-0">
                            <div className="w-8 h-8 rounded-lg bg-primary-500/10 flex items-center justify-center flex-shrink-0">
                              <FileText className="w-4 h-4 text-primary-500" />
                            </div>
                            <div className="min-w-0">
                              <p className="text-sm font-medium text-text-primary truncate">{doc.fileName}</p>
                              <p className="text-xs text-text-muted">
                                {doc.category} · {formatBytes(doc.fileSize)} · {new Date(doc.createdAt).toLocaleDateString()}
                              </p>
                            </div>
                          </div>
                          <a
                            href={`/api/public/portal/documents/${doc.id}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="p-2 hover:bg-surface rounded-lg transition-colors flex-shrink-0 ml-2"
                            title="View/Download"
                          >
                            <Download className="w-4 h-4 text-primary-500" />
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
        <div className={`w-8 h-8 rounded-full flex items-center justify-center border-2 ${
          completed ? 'bg-green-50 border-green-500 text-green-600' :
          active ? 'bg-primary-500/10 border-primary-500 text-primary-500 animate-pulse' :
          'border-border text-border'
        }`}>
          {completed ? <CheckCircle className="w-5 h-5" /> : <div className="w-2 h-2 bg-current rounded-full" />}
        </div>
        <div className="w-0.5 h-full bg-border min-h-[28px]" />
      </div>
      <div className={`pb-6 ${completed || active ? 'opacity-100' : 'opacity-50'}`}>
        <p className="text-text-primary font-medium text-sm">{title}</p>
        {date && <p className="text-xs text-text-muted mt-0.5">{new Date(date).toLocaleDateString()}</p>}
        {active && <p className="text-xs text-primary-500 mt-0.5">In Progress</p>}
      </div>
    </li>
  );
}

function InfoCell({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div className="bg-background border border-border rounded-xl p-3">
      <p className="text-text-muted text-xs flex items-center gap-1 mb-1">
        {icon} {label}
      </p>
      <p className="text-text-primary text-sm font-medium">{value}</p>
    </div>
  );
}

export default function ClaimDetailPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-background flex items-center justify-center">
          <Loader2 className="w-8 h-8 text-primary-500 animate-spin" />
        </div>
      }
    >
      <ClaimDetailInner />
    </Suspense>
  );
}
