'use client';

import { useState, useEffect } from 'react';
import { Search, Calendar, User, Download, FileText, Loader2, ArrowLeft, Sheet } from 'lucide-react';
import { useRouter } from 'next/navigation';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import * as XLSX from 'xlsx';

interface AuditLog {
 id: string;
 entityType: string;
 entityId: string;
 action: string;
 field?: string;
 oldValue?: string;
 newValue?: string;
 metadata?: string;
 timestamp: string; // Changed from createdAt
 user: {
 name: string;
 email: string;
 role: string;
 };
}

interface UserOption {
 id: string;
 name: string;
}

export default function AuditLogPage() {
 const router = useRouter();
 const [logs, setLogs] = useState<AuditLog[]>([]);
 const [isLoading, setIsLoading] = useState(true);
 const [users, setUsers] = useState<UserOption[]>([]);

 // Filters
 const [selectedUser, setSelectedUser] = useState('');
 const [startDate, setStartDate] = useState('');
 const [endDate, setEndDate] = useState('');

 useEffect(() => {
 fetchUsers();
 }, []);

 useEffect(() => {
 fetchLogs();
 }, [selectedUser, startDate, endDate]);

 const fetchUsers = async () => {
 try {
 const res = await fetch('/api/admin/users');
 if (res.ok) {
 const data = await res.json();
 setUsers(data);
 }
 } catch (e) {
 console.error('Failed to fetch users', e);
 }
 };

 const fetchLogs = async () => {
 setIsLoading(true);
 try {
 const params = new URLSearchParams();
 if (selectedUser) params.append('userId', selectedUser);
 if (startDate) params.append('startDate', startDate);
 if (endDate) params.append('endDate', endDate);
 params.append('limit', '100');

 const res = await fetch(`/api/audit-logs?${params.toString()}`);
 if (res.ok) {
 const data = await res.json();
 setLogs(data.logs);
 }
 } catch (error) {
 console.error('Failed to fetch audit logs', error);
 } finally {
 setIsLoading(false);
 }
 };

 const fetchExportData = async () => {
 const params = new URLSearchParams();
 if (selectedUser) params.append('userId', selectedUser);
 if (startDate) params.append('startDate', startDate);
 if (endDate) params.append('endDate', endDate);

 const res = await fetch(`/api/audit-logs/export?${params.toString()}`);
 if (!res.ok) throw new Error('Failed to fetch data for export');
 return await res.json() as AuditLog[];
 };

 const handleExportPDF = async () => {
 try {
 const exportData = await fetchExportData();
 const doc = new jsPDF();

 doc.setFontSize(18);
 doc.text('Audit Log Report', 14, 22);
 doc.setFontSize(11);
 doc.setTextColor(100);
 doc.text(`Generated on ${new Date().toLocaleDateString()} ${new Date().toLocaleTimeString()}`, 14, 30);

 let filterText = 'Filters: ';
 if (selectedUser) {
 const u = users.find(u => u.id === selectedUser);
 filterText += `User: ${u?.name || selectedUser}, `;
 }
 if (startDate) filterText += `Start: ${startDate}, `;
 if (endDate) filterText += `End: ${endDate}`;
 if (filterText === 'Filters: ') filterText += 'None';

 doc.text(filterText, 14, 38);

 const tableData = exportData.map(log => [
 new Date(log.timestamp).toLocaleString(),
 log.user.name,
 log.action,
 `${log.entityType} (${log.entityId.substring(0, 8)}...)`,
 formatDetails(log)
 ]);

 autoTable(doc, {
 head: [['Date/Time', 'User', 'Action', 'Entity', 'Details']],
 body: tableData,
 startY: 45,
 styles: { fontSize: 8 },
 headStyles: { fillColor: [66, 133, 244] },
 columnStyles: { 4: { cellWidth: 60 } }
 });

 doc.save(`audit-log-${new Date().toISOString().split('T')[0]}.pdf`);
 } catch (error) {
 console.error('Export failed', error);
 alert('Failed to generate PDF export');
 }
 };

 const handleExportExcel = async () => {
 try {
 const exportData = await fetchExportData();

 const wsData = exportData.map(log => ({
 'Date/Time': new Date(log.timestamp).toLocaleString(),
 'User Name': log.user.name,
 'User Email': log.user.email,
 'User Role': log.user.role,
 'Action': log.action,
 'Entity Type': log.entityType,
 'Entity ID': log.entityId,
 'Field Changed': log.field || '',
 'Old Value': log.oldValue || '',
 'New Value': log.newValue || '',
 'Metadata': log.metadata || ''
 }));

 const ws = XLSX.utils.json_to_sheet(wsData);
 const wb = XLSX.utils.book_new();
 XLSX.utils.book_append_sheet(wb, ws, "Audit Logs");
 XLSX.writeFile(wb, `AccommAlly_Audit_Logs_${new Date().toISOString().split('T')[0]}.xlsx`);
 } catch (error) {
 console.error('Export failed', error);
 alert('Failed to generate Excel export');
 }
 };

 const formatDetails = (log: AuditLog) => {
 if (log.oldValue && log.newValue) {
 // Truncate overly long values for UI
 const oldV = log.oldValue.length > 30 ? log.oldValue.substring(0, 30) + '...' : log.oldValue;
 const newV = log.newValue.length > 30 ? log.newValue.substring(0, 30) + '...' : log.newValue;
 return `${log.field || 'Field'}: ${oldV} -> ${newV}`;
 }
 if (log.metadata) {
 try {
 const parsed = JSON.parse(log.metadata);
 // If parsed is object, format nicely. If not, return as is.
 if (typeof parsed === 'object' && parsed !== null) {
 // Filter out null/undefined values for cleaner display
 return Object.entries(parsed)
 .filter(([_, v]) => v !== null && v !== undefined)
 .map(([k, v]) => {
 let valStr = String(v);
 if (typeof v === 'object') {
 try { valStr = JSON.stringify(v); } catch (e) { valStr = '[Complex Object]'; }
 }
 return `${k}: ${valStr}`;
 })
 .join(', ');
 }
 return String(parsed);
 } catch (e) {
 // Not JSON, return as string
 return log.metadata;
 }
 }
 if (log.field) return `Changed ${log.field}`;
 return '-';
 };

 return (
 <div className="font-sans p-8">
 <div className="max-w-7xl mx-auto space-y-6">

 {/* Header */}
 <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
 <div className="flex items-center gap-4">
 <button
 onClick={() => router.back()}
 className="p-2 hover:bg-surface-raised rounded-lg transition-colors"
 >
 <ArrowLeft className="w-5 h-5 text-text-secondary" />
 </button>
 <div>
 <h1 className="text-2xl font-bold text-text-primary">System Audit Logs</h1>
 <p className="text-text-muted">Track all system activities and changes</p>
 </div>
 </div>
 <div className="flex gap-2">
 <button
 onClick={handleExportExcel}
 className="flex items-center gap-2 px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg shadow-sm transition-colors font-medium text-sm"
 >
 <Sheet className="w-4 h-4" />
 Export Excel
 </button>
 <button
 onClick={handleExportPDF}
 className="flex items-center gap-2 px-4 py-2 bg-surface border border-border text-text-secondary hover:bg-background rounded-lg shadow-sm transition-colors font-medium text-sm"
 >
 <Download className="w-4 h-4" />
 Export PDF
 </button>
 </div>
 </div>

 {/* Filters */}
 <div className="bg-surface rounded-xl border border-border p-4">
 <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
 <div className="relative">
 <label className="block text-[11px] font-semibold uppercase tracking-[0.1em] text-text-muted mb-1.5">User</label>
 <div className="relative">
 <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-muted" />
 <select
 className="w-full pl-10 pr-4 py-2 rounded-lg border border-border bg-background text-text-primary text-sm focus:outline-none focus:ring-2 focus:ring-primary-500/30 focus:border-primary-500 transition-colors appearance-none"
 value={selectedUser}
 onChange={(e) => setSelectedUser(e.target.value)}
 >
 <option value="">All Users</option>
 {users.map(u => (
 <option key={u.id} value={u.id}>{u.name}</option>
 ))}
 </select>
 </div>
 </div>

 <div>
 <label className="block text-[11px] font-semibold uppercase tracking-[0.1em] text-text-muted mb-1.5">Start Date</label>
 <div className="relative">
 <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-muted" />
 <input
 type="date"
 className="w-full pl-10 pr-4 py-2 rounded-lg border border-border bg-background text-text-primary text-sm focus:outline-none focus:ring-2 focus:ring-primary-500/30 focus:border-primary-500 transition-colors"
 value={startDate}
 onChange={(e) => setStartDate(e.target.value)}
 />
 </div>
 </div>

 <div>
 <label className="block text-[11px] font-semibold uppercase tracking-[0.1em] text-text-muted mb-1.5">End Date</label>
 <div className="relative">
 <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-muted" />
 <input
 type="date"
 className="w-full pl-10 pr-4 py-2 rounded-lg border border-border bg-background text-text-primary text-sm focus:outline-none focus:ring-2 focus:ring-primary-500/30 focus:border-primary-500 transition-colors"
 value={endDate}
 onChange={(e) => setEndDate(e.target.value)}
 />
 </div>
 </div>

 <div className="flex items-end">
 <button
 onClick={() => {
 setSelectedUser('');
 setStartDate('');
 setEndDate('');
 }}
 className="px-4 py-2 text-sm text-text-secondary hover:text-text-primary hover:bg-surface-raised rounded-lg transition-colors w-full"
 >
 Clear Filters
 </button>
 </div>
 </div>
 </div>

 {/* Logs List */}
 <div className="bg-surface rounded-xl border border-border overflow-hidden">
 {isLoading ? (
 <div className="flex justify-center py-12">
 <Loader2 className="w-8 h-8 animate-spin text-primary-500" />
 </div>
 ) : logs.length > 0 ? (
 <div className="overflow-x-auto">
 <table className="w-full text-left text-sm">
 <thead className="bg-background border-b border-border">
 <tr>
 <th className="px-6 py-4 text-xs font-semibold text-text-muted uppercase tracking-[0.08em]">Timestamp</th>
 <th className="px-6 py-4 text-xs font-semibold text-text-muted uppercase tracking-[0.08em]">User</th>
 <th className="px-6 py-4 text-xs font-semibold text-text-muted uppercase tracking-[0.08em]">Action</th>
 <th className="px-6 py-4 text-xs font-semibold text-text-muted uppercase tracking-[0.08em]">Entity</th>
 <th className="px-6 py-4 text-xs font-semibold text-text-muted uppercase tracking-[0.08em]">Details</th>
 </tr>
 </thead>
 <tbody className="divide-y divide-[#F3F1EC]">
 {logs.map((log) => (
 <tr key={log.id} className="hover:bg-background transition-colors">
 <td className="px-6 py-4 text-text-muted whitespace-nowrap">
 {new Date(log.timestamp).toLocaleString()}
 </td>
 <td className="px-6 py-4">
 <div className="flex items-center gap-2">
 <div className="w-6 h-6 rounded-full bg-primary-500/10 text-primary-500 flex items-center justify-center text-xs font-bold">
 {log.user.name.charAt(0)}
 </div>
 <span className="font-medium text-text-primary">{log.user.name}</span>
 </div>
 </td>
 <td className="px-6 py-4">
 <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium border ${log.action === 'CREATE' ? 'bg-green-50 text-green-700 border-green-100' :
 log.action === 'UPDATE' ? 'bg-primary-500/8 text-primary-500 border-primary-500/20' :
 log.action === 'DELETE' ? 'bg-red-50 text-red-700 border-red-100' :
 'bg-surface-raised text-text-secondary border-border'
 }`}>
 {log.action}
 </span>
 </td>
 <td className="px-6 py-4">
 <span className="font-mono text-xs bg-surface-raised px-1.5 py-0.5 rounded text-text-secondary">
 {log.entityType}
 </span>
 </td>
 <td className="px-6 py-4">
 <div className="max-w-xs text-text-secondary text-xs font-mono break-all">
 {formatDetails(log)}
 </div>
 </td>
 </tr>
 ))}
 </tbody>
 </table>
 </div>
 ) : (
 <div className="text-center py-12 text-text-muted">
 <FileText className="w-12 h-12 mx-auto mb-3 opacity-20" />
 <p>No audit logs found</p>
 </div>
 )}
 </div>
 </div>
 </div>
 );
}
