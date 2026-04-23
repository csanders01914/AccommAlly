
import React, { useState, useEffect } from 'react';
import {
 Plus,
 CheckCircle,
 XCircle,
 Clock,
 AlertCircle,
 FileText,
 ChevronRight,
 Ban,
 Download,
 Filter,
 ArrowUpDown,
 Save,
 RotateCcw
} from 'lucide-react';
import { AccommodationModal } from './AccommodationModal';
import { useRouter } from 'next/navigation';
import {
 DndContext,
 closestCenter,
 KeyboardSensor,
 PointerSensor,
 useSensor,
 useSensors,
 DragEndEvent
} from '@dnd-kit/core';
import {
 arrayMove,
 SortableContext,
 horizontalListSortingStrategy
} from '@dnd-kit/sortable';
import { SortableHeader } from '@/components/SortableHeader';

interface DecisioningTabProps {
 caseId: string;
 currentUser: any;
}

export function DecisioningTab({ caseId, currentUser }: DecisioningTabProps) {
 const [accommodations, setAccommodations] = useState<any[]>([]);
 const [filteredAccommodations, setFilteredAccommodations] = useState<any[]>([]);
 const [isLoading, setIsLoading] = useState(true);
 const [isModalOpen, setIsModalOpen] = useState(false);
 const [selectedAccommodation, setSelectedAccommodation] = useState<any | null>(null);

 // Table State
 const [columns, setColumns] = useState([
 { id: 'id', label: 'ID', sortable: true, width: 100 },
 { id: 'type', label: 'Type', sortable: true, width: 200 },
 { id: 'status', label: 'Status', sortable: true, width: 120 },
 { id: 'description', label: 'Description', sortable: false, width: 300 },
 { id: 'startDate', label: 'Start Date', sortable: true, width: 120 },
 { id: 'endDate', label: 'End Date', sortable: true, width: 120 },
 { id: 'lifecycle', label: 'Lifecycle', sortable: true, width: 150 },
 { id: 'decision', label: 'Decision', sortable: true, width: 120 },
 ]);
 const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
 const [sortColumn, setSortColumn] = useState('startDate');
 const [filters, setFilters] = useState<Record<string, string>>({});

 const sensors = useSensors(
 useSensor(PointerSensor),
 useSensor(KeyboardSensor)
 );

 const fetchAccommodations = async () => {
 try {
 setIsLoading(true);
 const res = await fetch(`/api/accommodations?caseId=${caseId}`);
 if (res.ok) {
 const data = await res.json();
 setAccommodations(data);
 setFilteredAccommodations(data);
 }
 } catch (error) {
 console.error('Failed to fetch accommodations', error);
 } finally {
 setIsLoading(false);
 }
 };

 useEffect(() => {
 fetchAccommodations();
 }, [caseId]);

 // Handle Sorting and Filtering
 useEffect(() => {
 let result = [...accommodations];

 // Filter
 Object.entries(filters).forEach(([key, value]) => {
 if (!value) return;
 const q = value.toLowerCase();
 result = result.filter(acc => {
 switch (key) {
 case 'id': return acc.accommodationNumber.toLowerCase().includes(q);
 case 'type': return acc.type.toLowerCase().replace(/_/g, ' ').includes(q) || acc.subtype?.toLowerCase().includes(q);
 case 'status': return acc.status.toLowerCase().includes(q);
 case 'description': return acc.description.toLowerCase().includes(q);
 case 'startDate': return new Date(acc.startDate).toLocaleDateString().includes(q);
 case 'endDate': return acc.endDate ? new Date(acc.endDate).toLocaleDateString().includes(q) : false;
 default: return true;
 }
 });
 });

 // Sort
 result.sort((a, b) => {
 let valA, valB;
 switch (sortColumn) {
 case 'id': valA = a.accommodationNumber; valB = b.accommodationNumber; break;
 case 'type': valA = a.type; valB = b.type; break;
 case 'status': valA = a.status; valB = b.status; break;
 case 'startDate': valA = new Date(a.startDate).getTime(); valB = new Date(b.startDate).getTime(); break;
 case 'endDate': valA = a.endDate ? new Date(a.endDate).getTime() : 0; valB = b.endDate ? new Date(b.endDate).getTime() : 0; break;
 case 'decision': valA = a.decisionDate ? new Date(a.decisionDate).getTime() : 0; valB = b.decisionDate ? new Date(b.decisionDate).getTime() : 0; break;
 case 'lifecycle': valA = a.lifecycleStatus; valB = b.lifecycleStatus; break;
 default: return 0;
 }

 if (valA < valB) return sortOrder === 'asc' ? -1 : 1;
 if (valA > valB) return sortOrder === 'asc' ? 1 : -1;
 return 0;
 });

 setFilteredAccommodations(result);
 }, [accommodations, filters, sortOrder, sortColumn]);


 const handleSave = async (data: any) => {
 try {
 const url = selectedAccommodation
 ? `/api/accommodations/${selectedAccommodation.id}`
 : '/api/accommodations';

 const method = selectedAccommodation ? 'PATCH' : 'POST';

 const res = await fetch(url, {
 method,
 headers: { 'Content-Type': 'application/json' },
 body: JSON.stringify({ ...data, caseId })
 });

 if (!res.ok) throw new Error('Failed to save');

 await fetchAccommodations();
 setIsModalOpen(false);
 setSelectedAccommodation(null);
 } catch (error) {
 console.error(error);
 alert('Failed to save request. Please try again.');
 }
 };

 const handleDragEnd = (event: DragEndEvent) => {
 const { active, over } = event;
 if (active.id !== over?.id) {
 setColumns((items) => {
 const oldIndex = items.findIndex((item) => item.id === active.id);
 const newIndex = items.findIndex((item) => item.id === over?.id);
 return arrayMove(items, oldIndex, newIndex);
 });
 }
 };

 const handleResize = (columnId: string, newWidth: number) => {
 setColumns(prev => prev.map(col =>
 col.id === columnId ? { ...col, width: newWidth } : col
 ));
 };

 const handleExportCSV = () => {
 const headers = columns.map(c => c.label).join(',');
 const rows = filteredAccommodations.map(acc => {
 return columns.map(col => {
 switch (col.id) {
 case 'id': return `"${acc.accommodationNumber}"`;
 case 'type': return `"${acc.type} - ${acc.subtype || ''}"`;
 case 'status': return `"${acc.status}"`;
 case 'description': return `"${acc.description.replace(/"/g, '""')}"`;
 case 'startDate': return `"${new Date(acc.startDate).toLocaleDateString()}"`;
 case 'endDate': return acc.isLongTerm ? '"Indefinite"' : `"${acc.endDate ? new Date(acc.endDate).toLocaleDateString() : ''}"`;
 case 'lifecycle': return `"${acc.lifecycleStatus} - ${acc.lifecycleSubstatus}"`;
 case 'decision': return `"${acc.decisionDate ? new Date(acc.decisionDate).toLocaleDateString() : ''}"`;
 default: return '""';
 }
 }).join(',');
 });
 const csvContent = "data:text/csv;charset=utf-8," + [headers, ...rows].join('\n');
 const encodedUri = encodeURI(csvContent);
 const link = document.createElement("a");
 link.setAttribute("href", encodedUri);
 link.setAttribute("download", `accommodations_${caseId}.csv`);
 document.body.appendChild(link);
 link.click();
 document.body.removeChild(link);
 };

 const getStatusBadge = (status: string) => {
 switch (status) {
 case 'APPROVED': return <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400"><CheckCircle className="w-3 h-3" /> Approved</span>;
 case 'REJECTED': return <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400"><XCircle className="w-3 h-3" /> Rejected</span>;
 case 'VOID': return <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-400"><Ban className="w-3 h-3" /> Void</span>;
 case 'RESCINDED': return <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-400"><Ban className="w-3 h-3" /> Rescinded</span>;
 default: return <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400"><Clock className="w-3 h-3" /> Pending</span>;
 }
 };

 const getLifecycleBadge = (status: string, substatus: string) => {
 if (status === 'OPEN') {
 return <div className="text-xs text-blue-600 dark:text-blue-400 font-medium">Open <span className="text-gray-400 font-normal">({substatus.replace(/_/g, ' ').toLowerCase()})</span></div>;
 }
 return <div className="text-xs text-gray-500 font-medium">Closed <span className="text-gray-400 font-normal">({substatus.replace(/_/g, ' ').toLowerCase()})</span></div>;
 };

 const renderCell = (acc: any, colId: string) => {
 switch (colId) {
 case 'id': return <span className="font-mono text-xs text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/20 px-2 py-0.5 rounded">{acc.accommodationNumber}</span>;
 case 'type': return (
 <div>
 <div className="font-medium text-gray-900 dark:text-white capitalize">{acc.type.replace(/_/g, ' ').toLowerCase()}</div>
 {acc.subtype && <div className="text-xs text-gray-500 font-normal">{acc.subtype}</div>}
 </div>
 );
 case 'status': return getStatusBadge(acc.status);
 case 'description': return <p className="text-gray-600 dark:text-gray-300 truncate text-xs" title={acc.description}>{acc.description}</p>;
 case 'startDate': return <span className="text-gray-700 dark:text-gray-300 font-medium text-xs">{new Date(acc.startDate).toLocaleDateString()}</span>;
 case 'endDate': return acc.isLongTerm ? <span className="text-[10px] text-blue-500 font-medium">Indefinite</span> : <span className="text-gray-700 dark:text-gray-300 font-medium text-xs">{acc.endDate ? new Date(acc.endDate).toLocaleDateString() : '-'}</span>;
 case 'lifecycle': return getLifecycleBadge(acc.lifecycleStatus, acc.lifecycleSubstatus);
 case 'decision': return <span className="text-gray-500 dark:text-gray-400 text-xs">{acc.decisionDate ? new Date(acc.decisionDate).toLocaleDateString() : '-'}</span>;
 default: return null;
 }
 };

 return (
 <div className="space-y-4 animate-in fade-in duration-300 w-full min-w-full">
 {/* Header Controls */}
 <div className="flex flex-col sm:flex-row items-center justify-between gap-4 bg-white dark:bg-gray-800 p-4 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm">
 <div>
 <h2 className="text-lg font-bold text-gray-900 dark:text-white flex items-center gap-2">
 Decisioning & Accommodations
 <span className="px-2 py-0.5 rounded-full bg-gray-100 dark:bg-gray-700 text-xs text-gray-600 dark:text-gray-300">{filteredAccommodations.length}</span>
 </h2>
 <p className="text-sm text-gray-500">Manage request lifecycles and decisions.</p>
 </div>
 <div className="flex items-center gap-2">
 <button onClick={() => setFilters({})} className="p-2 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-white rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors" title="Clear Filters">
 <RotateCcw className="w-4 h-4" />
 </button>
 <button className="p-2 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-white rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors" title="Save Preferences">
 <Save className="w-4 h-4" />
 </button>
 <div className="h-6 w-px bg-gray-200 dark:bg-gray-700 mx-1"></div>
 <button
 onClick={handleExportCSV}
 className="flex items-center gap-2 px-3 py-2 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-700 rounded-lg text-sm font-medium transition-colors"
 >
 <Download className="w-4 h-4" />
 Export
 </button>
 <button
 onClick={() => {
 setSelectedAccommodation(null);
 setIsModalOpen(true);
 }}
 className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg shadow-md hover:shadow-lg font-medium transition-all"
 >
 <Plus className="w-4 h-4" />
 New Request
 </button>
 </div>
 </div>

 {/* Table */}
 {isLoading ? (
 <div className="flex justify-center py-12">
 <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
 </div>
 ) : filteredAccommodations.length > 0 ? (
 <div className="border border-gray-200 dark:border-gray-800 rounded-lg overflow-x-auto bg-white dark:bg-gray-900 shadow-sm">
 <div className="min-w-full inline-block align-middle">
 <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
 <table className="min-w-full table-fixed divide-y divide-gray-200 dark:divide-gray-800">
 <thead className="bg-gray-50 dark:bg-gray-950">
 <tr>
 <SortableContext items={columns.map(c => c.id)} strategy={horizontalListSortingStrategy}>
 {columns.map(col => (
 <SortableHeader
 key={col.id}
 id={col.id}
 onFilter={(val) => setFilters(prev => ({ ...prev, [col.id]: val }))}
 filterValue={filters[col.id]}
 width={col.width}
 onResize={(w) => handleResize(col.id, w)}
 >
 <div
 className="flex items-center gap-1 hover:text-gray-900 dark:hover:text-white cursor-pointer py-1"
 onClick={() => {
 if (col.sortable) {
 if (sortColumn === col.id) {
 setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
 } else {
 setSortColumn(col.id);
 setSortOrder('asc');
 }
 }
 }}
 >
 {col.label}
 {col.sortable && sortColumn === col.id && (
 <ArrowUpDown className={`w-3 h-3 ${sortOrder === 'desc' ? 'transform rotate-180' : ''}`} />
 )}
 </div>
 </SortableHeader>
 ))}
 </SortableContext>
 </tr>
 </thead>
 <tbody className="divide-y divide-gray-100 dark:divide-gray-800 bg-white dark:bg-gray-900">
 {filteredAccommodations.map((acc) => (
 <tr
 key={acc.id}
 onClick={() => {
 setSelectedAccommodation(acc);
 setIsModalOpen(true);
 }}
 className="hover:bg-blue-50/50 dark:hover:bg-blue-900/10 transition-colors cursor-pointer group"
 >
 {columns.map(col => (
 <td key={col.id} className="px-4 py-3 align-middle truncate" style={{ width: col.width }}>
 {renderCell(acc, col.id)}
 </td>
 ))}
 </tr>
 ))}
 </tbody>
 </table>
 </DndContext>
 </div>
 <div className="bg-gray-50 dark:bg-gray-950 border-t border-gray-200 dark:border-gray-800 px-4 py-3 flex items-center justify-between text-xs text-gray-500">
 <span>Showing {filteredAccommodations.length} result(s)</span>
 <div className="flex gap-2">
 {/* Pagination Placeholder */}
 <span className="text-gray-400">Page 1 of 1</span>
 </div>
 </div>
 </div>
 ) : (
 <div className="text-center py-16 bg-white dark:bg-gray-800 rounded-xl border border-dashed border-gray-300 dark:border-gray-700">
 <div className="w-16 h-16 bg-gray-100 dark:bg-gray-700 rounded-full flex items-center justify-center mx-auto mb-4">
 <FileText className="w-8 h-8 text-gray-400" />
 </div>
 <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-1">No requests match criteria</h3>
 <p className="text-gray-500 mb-6 max-w-sm mx-auto">Try clearing filters or create a new accommodation request.</p>
 <div className="flex justify-center gap-3">
 <button onClick={() => setFilters({})} className="text-sm font-medium text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white">Clear Filters</button>
 <span className="text-gray-300">|</span>
 <button
 onClick={() => {
 setSelectedAccommodation(null);
 setIsModalOpen(true);
 }}
 className="text-sm font-medium text-blue-600 hover:text-blue-700"
 >
 New Request
 </button>
 </div>
 </div>
 )}

 <AccommodationModal
 isOpen={isModalOpen}
 onClose={() => setIsModalOpen(false)}
 onSave={handleSave}
 initialData={selectedAccommodation}
 caseId={caseId}
 />
 </div>
 );
}

function Calendar({ className }: { className?: string }) {
 return (
 <svg
 xmlns="http://www.w3.org/2000/svg"
 viewBox="0 0 24 24"
 fill="none"
 stroke="currentColor"
 strokeWidth="2"
 strokeLinecap="round"
 strokeLinejoin="round"
 className={className}
 >
 <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
 <line x1="16" y1="2" x2="16" y2="6" />
 <line x1="8" y1="2" x2="8" y2="6" />
 <line x1="3" y1="10" x2="21" y2="10" />
 </svg>
 )
}
