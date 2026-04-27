'use client';

import { useState, useEffect, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { format, isToday } from 'date-fns';
import {
  ListTodo, FileText, Mail, Phone, Calendar, Plus,
  ChevronRight, AlertTriangle, Clock, Loader2, MessageSquare, X, Check,
} from 'lucide-react';
import { apiFetch } from '@/lib/api-client';
import { Sidebar } from './Sidebar';

// -- Types --------------------------------------------------------------------

interface DashTask {
  id: string;
  title: string;
  description?: string;
  dueDate: string;
  status: string;
  priority: string;
  claimNumber: string;
  case?: { id: string; caseNumber: string } | null;
}

interface DashMessage {
  id: string;
  sender: string;
  subject: string;
  content: string;
  time: string;
  unread: boolean;
}

interface CallReq {
  id: string;
  name: string;
  reason: string;
  urgent: boolean;
  createdAt: string;
  scheduledFor?: string | null;
  case?: { id: string; caseNumber: string; clientName: string } | null;
}

interface DashCase {
  id: string;
  clientName: string;
  caseNumber: string;
  status: string;
  program: string;
  createdAt: string;
}

interface DashData {
  user: { id: string; name: string; role: 'ADMIN' | 'AUDITOR' | 'COORDINATOR'; email: string; preferences?: Record<string, string> };
  tasks: DashTask[];
  taskStats: { totalPending: number; overdue: number };
  messages: DashMessage[];
  unreadMessagesCount: number;
  callRequests: CallReq[];
  recentCases: DashCase[];
}

// -- Small atoms --------------------------------------------------------------

function greeting(): string {
  const h = new Date().getHours();
  if (h < 12) return 'Good morning';
  if (h < 18) return 'Good afternoon';
  return 'Good evening';
}

function StatChip({ label, value, tone = 'neutral' }: {
  label: string; value: number; tone?: 'neutral' | 'danger' | 'accent';
}) {
  const dotColor = tone === 'danger' ? '#F87171' : tone === 'accent' ? '#134E4A' : 'rgba(255,255,255,0.55)';
  const valueColor = tone === 'danger' ? '#FCA5A5' : '#F0EEE8';
  return (
    <div className="inline-flex items-baseline gap-2 px-3 py-1.5 rounded-full border border-white/[0.12] bg-surface/[0.04]">
      <span className="w-1.5 h-1.5 rounded-full self-center flex-shrink-0" style={{ background: dotColor }} />
      <span className="text-sm font-semibold tabular-nums" style={{ color: valueColor }}>{value}</span>
      <span className="text-[11px] font-medium" style={{ color: 'rgba(240,238,232,0.55)' }}>{label}</span>
    </div>
  );
}

function PrioPill({ priority }: { priority: string }) {
  const map: Record<string, string> = {
    HIGH: 'bg-red-50 text-red-800 border-red-200',
    URGENT: 'bg-red-100 text-red-900 border-red-300',
    MEDIUM: 'bg-amber-50 text-amber-800 border-amber-200',
    LOW: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  };
  return (
    <span className={`px-2 py-0.5 rounded-full text-[11px] font-semibold border ${map[priority] ?? map.LOW}`}>
      {priority}
    </span>
  );
}

function StatusDot({ status }: { status: string }) {
  const colors: Record<string, string> = {
    PENDING: '#D97706', IN_PROGRESS: '#2563EB', COMPLETED: '#059669',
    CANCELLED: '#8C8880', OPEN: '#134E4A', CLOSED: '#8C8880',
  };
  const color = colors[status] ?? '#8C8880';
  return (
    <span className="flex items-center gap-1 text-xs font-medium" style={{ color }}>
      <span className="w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ background: color }} />
      {status.replace(/_/g, ' ')}
    </span>
  );
}

function CaseChip({ caseNumber, danger = false }: { caseNumber: string; danger?: boolean }) {
  return (
    <code className={`font-mono text-[11px] px-1.5 py-0.5 rounded ${danger ? 'bg-red-50 text-red-800' : 'bg-surface-raised text-primary-700'}`}>
      {caseNumber}
    </code>
  );
}

function Card({ title, icon: Icon, action, children }: {
  title: string;
  icon: React.ComponentType<{ className?: string }>;
  action?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <section className="bg-surface border border-border rounded-xl shadow-[0_1px_2px_rgba(28,26,23,0.04)] overflow-hidden flex flex-col">
      <header className="flex items-center justify-between px-5 py-3 border-b border-surface-raised">
        <div className="flex items-center gap-2.5">
          <Icon className="w-3.5 h-3.5 text-primary-700" />
          <h3 className="text-sm font-semibold text-text-primary">{title}</h3>
        </div>
        {action}
      </header>
      {children}
    </section>
  );
}

// -- Widget: Tasks ------------------------------------------------------------

function TasksCard({ tasks }: { tasks: DashTask[] }) {
  const now = new Date();
  const isOverdue = (t: DashTask) =>
    t.status !== 'COMPLETED' && !!t.dueDate && new Date(t.dueDate) < now;
  const isDueToday = (t: DashTask) =>
    !!t.dueDate && isToday(new Date(t.dueDate));

  const shown = tasks.slice(0, 6);

  return (
    <Card
      title="My Tasks"
      icon={ListTodo}
      action={
        <Link href="/dashboard/tasks" className="text-xs font-medium text-primary-700 hover:text-text-primary">
          View all &rarr;
        </Link>
      }
    >
      <div className="grid grid-cols-[140px_180px_1fr_16px] gap-4 px-5 py-2.5 bg-background border-b border-border text-[10px] font-semibold uppercase tracking-[0.12em] text-text-muted">
        <div>Due</div>
        <div>Claim #</div>
        <div>Description</div>
        <div />
      </div>
      {shown.length === 0 ? (
        <p className="px-5 py-8 text-sm text-text-muted text-center">No pending tasks.</p>
      ) : (
        shown.map(t => {
          const over = isOverdue(t);
          const today = isDueToday(t);
          return (
            <Link
              key={t.id}
              href={t.case?.id ? `/cases/${t.case.id}` : '/dashboard/tasks'}
              className={`grid grid-cols-[140px_180px_1fr_16px] gap-4 px-5 py-3.5 border-b border-surface-raised items-center transition-colors last:border-b-0 ${over ? 'bg-[rgba(254,242,242,0.45)] hover:bg-[rgba(254,242,242,0.7)]' : 'bg-surface hover:bg-background'}`}
            >
              <div className="flex items-center gap-1.5">
                {over
                  ? <AlertTriangle className="w-3.5 h-3.5 text-red-500 flex-shrink-0" />
                  : <Clock className="w-3.5 h-3.5 text-text-muted flex-shrink-0" />
                }
                <span className={`text-[13px] font-medium tabular-nums ${over ? 'text-red-600' : 'text-text-primary'}`}>
                  {t.dueDate ? format(new Date(t.dueDate), 'MMM d') : '--'}
                </span>
                {today && !over && (
                  <span className="text-[10px] font-semibold tracking-wide text-primary-700">TODAY</span>
                )}
              </div>
              <CaseChip caseNumber={t.claimNumber || t.case?.caseNumber || '--'} danger={over} />
              <div className="min-w-0">
                <p className="text-[13px] text-text-primary truncate leading-snug">{t.title}</p>
                <div className="flex gap-2 items-center mt-0.5">
                  <StatusDot status={t.status} />
                  <PrioPill priority={t.priority} />
                </div>
              </div>
              <ChevronRight className="w-4 h-4 text-border-strong" />
            </Link>
          );
        })
      )}
    </Card>
  );
}

// -- Widget: Recent Cases -----------------------------------------------------

function RecentCasesCard({ cases }: { cases: DashCase[] }) {
  const statusStyle = (s: string) => {
    const map: Record<string, string> = {
      OPEN: 'bg-emerald-50 text-emerald-800 border-emerald-200',
      IN_PROGRESS: 'bg-blue-50 text-blue-800 border-blue-200',
      CLOSED: 'bg-surface-raised text-text-secondary border-border',
    };
    return map[s] ?? map.CLOSED;
  };
  return (
    <Card
      title="Recent Cases"
      icon={FileText}
      action={
        <Link href="/cases" className="text-xs font-medium text-primary-700 hover:text-text-primary">
          All cases &rarr;
        </Link>
      }
    >
      {cases.length === 0 ? (
        <p className="px-5 py-8 text-sm text-text-muted text-center">No recent cases.</p>
      ) : (
        cases.map(c => (
          <Link
            key={c.id}
            href={`/cases/${c.id}`}
            className="flex items-center justify-between px-5 py-3.5 border-b border-surface-raised hover:bg-background transition-colors last:border-b-0"
          >
            <div className="min-w-0">
              <p className="text-[13px] font-medium text-text-primary mb-0.5 truncate">{c.clientName}</p>
              <div className="flex items-center gap-2">
                <CaseChip caseNumber={c.caseNumber} />
                {c.program && <span className="text-[11px] text-text-muted">{c.program}</span>}
              </div>
            </div>
            <span className={`px-2 py-0.5 rounded-full text-[11px] font-medium border flex-shrink-0 ml-3 ${statusStyle(c.status)}`}>
              {c.status.replace(/_/g, ' ')}
            </span>
          </Link>
        ))
      )}
    </Card>
  );
}

// -- Widget: Calendar Peek ----------------------------------------------------

function CalendarCard({ tasks }: { tasks: DashTask[] }) {
  const days = useMemo(() => {
    const today = new Date();
    return [0, 1, 2].map(offset => {
      const d = new Date(today);
      d.setDate(today.getDate() + offset);
      const label = offset === 0 ? 'Today' : offset === 1 ? 'Tomorrow' : format(d, 'EEEE');
      const items = tasks.filter(t => {
        if (!t.dueDate || t.status === 'COMPLETED') return false;
        const td = new Date(t.dueDate);
        return td.getDate() === d.getDate() && td.getMonth() === d.getMonth() && td.getFullYear() === d.getFullYear();
      });
      return { date: d, label, items };
    });
  }, [tasks]);

  return (
    <Card title="This Week" icon={Calendar}>
      <div className="p-5 flex flex-col gap-4">
        {days.map((day, i) => (
          <div key={i}>
            <div className="flex items-baseline gap-2 mb-1.5">
              <span
                className="leading-none"
                style={{ fontFamily: 'var(--font-instrument-serif, Georgia, serif)', fontSize: 22, color: i === 0 ? '#134E4A' : '#1C1A17' }}
              >
                {day.date.getDate()}
              </span>
              <span className={`text-[11px] font-semibold uppercase tracking-[0.15em] ${i === 0 ? 'text-primary-700' : 'text-text-muted'}`}>
                {day.label}
              </span>
            </div>
            {day.items.length === 0 ? (
              <p className="text-xs text-text-muted italic">Nothing due</p>
            ) : (
              <ul className="flex flex-col gap-1">
                {day.items.map(t => (
                  <li key={t.id} className="flex gap-2 text-xs text-text-secondary">
                    <CaseChip caseNumber={t.claimNumber || t.case?.caseNumber || '?'} />
                    <span className="truncate">{t.title}</span>
                  </li>
                ))}
              </ul>
            )}
          </div>
        ))}
      </div>
    </Card>
  );
}

// -- Widget: Quick Actions ----------------------------------------------------

function QuickActionsCard() {
  const actions = [
    { icon: Plus, label: 'New case', href: '/cases/new' },
    { icon: FileText, label: 'Draft decision', href: '/cases' },
    { icon: Mail, label: 'Send message', href: '/messages?compose=true' },
    { icon: Calendar, label: 'Schedule call', href: '/calendar' },
  ];
  return (
    <Card title="Quick Actions" icon={Plus}>
      <div className="p-4 grid grid-cols-2 gap-2.5">
        {actions.map(({ icon: Icon, label, href }) => (
          <Link
            key={label}
            href={href}
            className="flex items-center gap-2.5 px-3 py-2.5 border border-border rounded-lg bg-surface text-[13px] text-text-primary hover:bg-surface-raised hover:border-primary-500 transition-colors"
          >
            <Icon className="w-3.5 h-3.5 text-primary-700 flex-shrink-0" />
            <span>{label}</span>
          </Link>
        ))}
      </div>
    </Card>
  );
}

// -- Widget: Messages ---------------------------------------------------------

function MessagesCard({ messages }: { messages: DashMessage[] }) {
  return (
    <Card
      title="Messages"
      icon={MessageSquare}
      action={
        <Link href="/messages" className="text-xs font-medium text-primary-700 hover:text-text-primary">
          Inbox &rarr;
        </Link>
      }
    >
      {messages.length === 0 ? (
        <p className="px-5 py-6 text-sm text-text-muted text-center">No messages.</p>
      ) : (
        messages.slice(0, 4).map(m => (
          <Link
            key={m.id}
            href="/messages"
            className="flex gap-3 px-4 py-3 border-b border-surface-raised hover:bg-background transition-colors last:border-b-0"
          >
            <div
              className="w-8 h-8 rounded-full flex items-center justify-center text-[11px] font-semibold flex-shrink-0"
              style={{ background: m.unread ? '#134E4A' : '#E5E2DB', color: m.unread ? '#fff' : '#5C5850' }}
            >
              {m.sender.split(' ').map((w: string) => w[0]).slice(0, 2).join('')}
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex justify-between items-baseline gap-2">
                <span className={`text-[13px] truncate ${m.unread ? 'font-semibold text-text-primary' : 'font-medium text-text-primary'}`}>
                  {m.sender}
                </span>
                <span className="text-[11px] text-text-muted flex-shrink-0">
                  {format(new Date(m.time), 'MMM d')}
                </span>
              </div>
              <p className="text-xs text-text-secondary mt-0.5 truncate">{m.subject || m.content}</p>
            </div>
            {m.unread && <span className="w-1.5 h-1.5 rounded-full bg-primary-700 self-center flex-shrink-0" />}
          </Link>
        ))
      )}
    </Card>
  );
}

// -- Widget: Call Requests ----------------------------------------------------

function CallRequestsCard({ calls, onLog }: { calls: CallReq[]; onLog: (call: CallReq) => void }) {
  return (
    <Card title="Call Requests" icon={Phone}>
      {calls.length === 0 ? (
        <p className="px-5 py-6 text-sm text-text-muted text-center">No pending call requests.</p>
      ) : (
        calls.slice(0, 4).map(c => (
          <button
            key={c.id}
            onClick={() => onLog(c)}
            className="w-full flex items-center gap-3 px-4 py-3 border-b border-surface-raised last:border-b-0 hover:bg-background transition-colors text-left"
          >
            <span className="w-8 h-8 rounded-lg bg-surface-raised text-primary-700 flex items-center justify-center flex-shrink-0">
              <Phone className="w-3.5 h-3.5" />
            </span>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-1.5">
                <p className="text-[13px] font-medium text-text-primary truncate">{c.name}</p>
                {c.urgent && (
                  <span className="text-[10px] font-semibold px-1.5 py-0.5 bg-red-50 text-red-700 border border-red-200 rounded-full flex-shrink-0">URGENT</span>
                )}
              </div>
              <p className="text-xs text-text-secondary mt-0.5 truncate">{c.reason}</p>
            </div>
            <span className="text-[11px] text-text-muted font-mono flex-shrink-0 ml-2">
              {c.scheduledFor ? format(new Date(c.scheduledFor), 'MMM d') : format(new Date(c.createdAt), 'MMM d')}
            </span>
          </button>
        ))
      )}
    </Card>
  );
}

// -- Main component -----------------------------------------------------------

export function UserProfileDashboard() {
  const router = useRouter();
  const [data, setData] = useState<DashData | null>(null);
  const [loading, setLoading] = useState(true);
  const [unreadCount, setUnreadCount] = useState(0);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(true);
  const [activeCall, setActiveCall] = useState<CallReq | null>(null);
  const [callNote, setCallNote] = useState('');
  const [callSubmitting, setCallSubmitting] = useState(false);
  const [callError, setCallError] = useState('');

  const handleLogCall = async () => {
    if (!activeCall || !callNote.trim()) return;
    setCallSubmitting(true);
    setCallError('');
    try {
      const res = await apiFetch(`/api/calls/${activeCall.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'COMPLETED', note: callNote.trim() }),
      });
      if (res.ok) {
        setData(prev => prev ? {
          ...prev,
          callRequests: prev.callRequests.filter(c => c.id !== activeCall.id),
        } : prev);
        setActiveCall(null);
        setCallNote('');
      } else {
        const d = await res.json();
        setCallError(d.error || 'Failed to save note.');
      }
    } catch {
      setCallError('An error occurred. Please try again.');
    } finally {
      setCallSubmitting(false);
    }
  };

  useEffect(() => {
    const fetchData = async () => {
      try {
        const res = await apiFetch('/api/dashboard');
        if (res.ok) {
          setData(await res.json());
        } else if (res.status === 401) {
          router.push('/login');
        }
      } catch {
        // handled below via null data
      } finally {
        setLoading(false);
      }
    };
    const fetchUnread = async () => {
      try {
        const res = await apiFetch('/api/messages/unread-count');
        if (res.ok) setUnreadCount((await res.json()).count);
      } catch { /* ignore */ }
    };
    fetchData();
    fetchUnread();
  }, [router]);

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary-700" />
      </div>
    );
  }

  if (!data) {
    return <div className="p-8 text-center text-text-secondary">Failed to load dashboard data.</div>;
  }

  const firstName = data.user.name.split(' ')[0];
  const dateStr = new Intl.DateTimeFormat('en-US', { weekday: 'long', month: 'long', day: 'numeric' }).format(new Date());

  const dueTodayCount = data.tasks.filter(t =>
    t.dueDate && t.status !== 'COMPLETED' && isToday(new Date(t.dueDate))
  ).length;

  return (
    <div className="flex h-screen overflow-hidden bg-background">
      <Sidebar
        user={data.user}
        unreadCount={unreadCount}
        initialCollapsed={sidebarCollapsed}
        onToggle={setSidebarCollapsed}
      />

      <div
        className="flex-1 h-full overflow-y-auto transition-all duration-300"
        style={{ marginLeft: sidebarCollapsed ? 64 : 256 }}
      >
        {/* Editorial greeting band */}
        <section
          className="relative overflow-hidden"
          style={{ background: '#1C1A17', color: '#F0EEE8', padding: '40px 48px 32px' }}
        >
          <div
            aria-hidden
            style={{
              position: 'absolute', inset: 0, pointerEvents: 'none',
              backgroundImage: 'radial-gradient(ellipse at 20% 20%,rgba(13,148,136,0.18) 0%,transparent 55%),radial-gradient(ellipse at 85% 90%,rgba(13,148,136,0.09) 0%,transparent 50%)',
            }}
          />
          <div
            aria-hidden
            style={{
              position: 'absolute', bottom: 0, left: 0, right: 0, height: 1,
              background: 'linear-gradient(to right,transparent,rgba(13,148,136,0.4),transparent)',
            }}
          />
          <div className="relative z-10">
            <p className="text-[11px] font-semibold uppercase tracking-[0.2em] mb-3" style={{ color: 'rgba(240,238,232,0.45)' }}>
              {dateStr}
            </p>
            <h1 style={{ fontFamily: 'var(--font-instrument-serif, Georgia, serif)', fontSize: 36, fontWeight: 400, lineHeight: 1.1, color: '#F0EEE8', margin: 0 }}>
              {greeting()}, {firstName}.
            </h1>
            <div className="flex flex-wrap gap-2 mt-4">
              <StatChip label="pending tasks" value={data.taskStats.totalPending} />
              {data.taskStats.overdue > 0 && <StatChip label="overdue" value={data.taskStats.overdue} tone="danger" />}
              {dueTodayCount > 0 && <StatChip label="due today" value={dueTodayCount} tone="accent" />}
              {data.unreadMessagesCount > 0 && <StatChip label="unread" value={data.unreadMessagesCount} />}
            </div>
          </div>
        </section>

        {/* Widget grid */}
        <div className="p-6 grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-5">
          <div className="xl:col-span-2">
            <TasksCard tasks={data.tasks} />
          </div>
          <CalendarCard tasks={data.tasks} />
          <RecentCasesCard cases={data.recentCases} />
          <MessagesCard messages={data.messages} />
          <div className="flex flex-col gap-5">
            <QuickActionsCard />
            {data.callRequests.length > 0 && <CallRequestsCard calls={data.callRequests} onLog={c => { setActiveCall(c); setCallNote(''); setCallError(''); }} />}
          </div>
        </div>
      </div>

      {/* Return Call Modal */}
      {activeCall && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={() => setActiveCall(null)} />
          <div className="relative bg-surface border border-border rounded-2xl shadow-2xl w-full max-w-md">
            <div className="flex items-center justify-between px-6 py-4 border-b border-border">
              <div className="flex items-center gap-2">
                <Phone className="w-4 h-4 text-primary-700" />
                <h2 className="text-base font-semibold text-text-primary">Log Return Call</h2>
              </div>
              <button onClick={() => setActiveCall(null)} className="text-text-muted hover:text-text-primary transition-colors">
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="px-6 py-4 bg-surface-raised border-b border-border space-y-1">
              <div className="flex items-center gap-2">
                <p className="text-sm font-semibold text-text-primary">{activeCall.name}</p>
                {activeCall.urgent && (
                  <span className="text-[10px] font-semibold px-1.5 py-0.5 bg-red-50 text-red-700 border border-red-200 rounded-full">URGENT</span>
                )}
              </div>
              {activeCall.case && (
                <p className="text-xs text-text-muted font-mono">{activeCall.case.caseNumber}</p>
              )}
              <p className="text-xs text-text-secondary">{activeCall.reason}</p>
            </div>

            <div className="px-6 py-4 space-y-3">
              <label className="block text-sm font-medium text-text-primary">
                Return call notes <span className="text-red-400">*</span>
              </label>
              <textarea
                rows={5}
                value={callNote}
                onChange={e => setCallNote(e.target.value)}
                placeholder="Summarize the call — outcome, next steps, follow-up required..."
                className="w-full bg-background border border-border rounded-xl px-4 py-3 text-sm text-text-primary outline-none focus:ring-2 focus:ring-primary-700 transition-all placeholder-text-muted resize-none"
                autoFocus
              />
              {callError && <p className="text-xs text-red-500">{callError}</p>}
            </div>

            <div className="flex gap-3 px-6 pb-5">
              <button
                onClick={handleLogCall}
                disabled={!callNote.trim() || callSubmitting}
                className="flex-1 flex items-center justify-center gap-2 bg-slate-800 hover:bg-slate-700 disabled:opacity-40 disabled:cursor-not-allowed text-white text-sm font-medium py-2.5 rounded-xl transition-all"
              >
                {callSubmitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <><Check className="w-4 h-4" /> Save &amp; Complete</>}
              </button>
              <button
                onClick={() => setActiveCall(null)}
                className="flex-1 bg-surface border border-border hover:bg-surface-raised text-text-secondary text-sm font-medium py-2.5 rounded-xl transition-all"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
