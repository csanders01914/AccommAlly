'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { Document, Page, pdfjs } from 'react-pdf';
import 'react-pdf/dist/Page/TextLayer.css';
import 'react-pdf/dist/Page/AnnotationLayer.css';
import {
 X,
 ChevronLeft,
 ChevronRight,
 ZoomIn,
 ZoomOut,
 Highlighter,
 Trash2,
 Loader2,
 MessageSquare,
 StickyNote,
} from 'lucide-react';
import { AnnotationThreadPanel } from './AnnotationThreadPanel';
import { apiFetch } from '@/lib/api-client';

pdfjs.GlobalWorkerOptions.workerSrc = `//unpkg.com/pdfjs-dist@${pdfjs.version}/build/pdf.worker.min.mjs`;

// ============================================
// TYPES
// ============================================

interface AnnotationComment {
 id: string;
 type: string;
 pageNumber: number | null;
 color: string | null;
 x: number | null;
 y: number | null;
 width: number | null;
 height: number | null;
 content: string;
 deleted: boolean;
 createdAt: string;
 createdBy: { id: string; name: string };
 replies: Omit<AnnotationComment, 'replies'>[];
}

interface DocumentViewerProps {
 documentId: string;
 fileName: string;
 fileType: string;
 currentUserId: string;
 currentUserName: string;
 onClose: () => void;
}

interface PendingHighlight {
 x: number;
 y: number;
 width: number;
 height: number;
}

// ============================================
// CONSTANTS
// ============================================

const HIGHLIGHT_COLORS = [
 { name: 'Yellow', hex: '#FFFF00' },
 { name: 'Green', hex: '#00FF00' },
 { name: 'Blue', hex: '#0096FF' },
 { name: 'Pink', hex: '#FF6496' },
 { name: 'Orange', hex: '#FFA500' },
];

function hexToRgba(hex: string, alpha = 0.4): string {
 const r = parseInt(hex.slice(1, 3), 16);
 const g = parseInt(hex.slice(3, 5), 16);
 const b = parseInt(hex.slice(5, 7), 16);
 return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

// ============================================
// COMPONENT
// ============================================

export function DocumentViewer({
 documentId,
 fileName,
 fileType,
 currentUserId,
 currentUserName,
 onClose,
}: DocumentViewerProps) {
 const [numPages, setNumPages] = useState<number>(0);
 const [currentPage, setCurrentPage] = useState(1);
 const [scale, setScale] = useState(1.0);
 const [isLoading, setIsLoading] = useState(true);

 const [annotations, setAnnotations] = useState<AnnotationComment[]>([]);
 const [selectedColor, setSelectedColor] = useState(HIGHLIGHT_COLORS[0].hex);
 const [isHighlightMode, setIsHighlightMode] = useState(false);
 const [isDrawing, setIsDrawing] = useState(false);
 const [drawStart, setDrawStart] = useState<{ x: number; y: number } | null>(null);
 const [currentDraw, setCurrentDraw] = useState<{ x: number; y: number; width: number; height: number } | null>(null);

 const [pendingHighlight, setPendingHighlight] = useState<PendingHighlight | null>(null);
 const [pendingComment, setPendingComment] = useState('');
 const [isSavingHighlight, setIsSavingHighlight] = useState(false);

 const [openThreadId, setOpenThreadId] = useState<string | null>(null);
 const [showNewNotePanel, setShowNewNotePanel] = useState(false);

 const pageContainerRef = useRef<HTMLDivElement>(null);
 const isPdf = fileType === 'application/pdf';
 const isHtml = fileType === 'text/html' || fileType === 'message/rfc822' || fileType === 'application/vnd.ms-outlook';
 const documentUrl = `/api/documents/${documentId}/view`;

 const fetchAnnotations = useCallback(async () => {
 try {
 const res = await fetch(`/api/documents/${documentId}/annotation-comments`);
 if (res.ok) {
 const data = await res.json();
 setAnnotations(data);
 }
 } catch {
 // silently ignore fetch errors
 }
 }, [documentId]);

 useEffect(() => {
 fetchAnnotations();
 setOpenThreadId(null);
 }, [fetchAnnotations, currentPage]);

 const onDocumentLoadSuccess = ({ numPages }: { numPages: number }) => {
 setNumPages(numPages);
 setIsLoading(false);
 };

 const goToPage = (page: number) => {
 if (page >= 1 && page <= numPages) setCurrentPage(page);
 };

 const zoomIn = () => setScale(prev => Math.min(prev + 0.25, 3));
 const zoomOut = () => setScale(prev => Math.max(prev - 0.25, 0.5));

 // ============================================
 // DRAW HANDLERS
 // ============================================

 const handleMouseDown = (e: React.MouseEvent<HTMLDivElement>) => {
 if (!isHighlightMode || !pageContainerRef.current) return;
 const rect = pageContainerRef.current.getBoundingClientRect();
 const x = ((e.clientX - rect.left) / rect.width) * 100;
 const y = ((e.clientY - rect.top) / rect.height) * 100;
 setIsDrawing(true);
 setDrawStart({ x, y });
 setCurrentDraw({ x, y, width: 0, height: 0 });
 };

 const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
 if (!isDrawing || !drawStart || !pageContainerRef.current) return;
 const rect = pageContainerRef.current.getBoundingClientRect();
 const currentX = ((e.clientX - rect.left) / rect.width) * 100;
 const currentY = ((e.clientY - rect.top) / rect.height) * 100;
 setCurrentDraw({
 x: Math.min(drawStart.x, currentX),
 y: Math.min(drawStart.y, currentY),
 width: Math.abs(currentX - drawStart.x),
 height: Math.abs(currentY - drawStart.y),
 });
 };

 const handleMouseUp = () => {
 if (!isDrawing || !currentDraw) return;
 if (currentDraw.width > 1 && currentDraw.height > 1) {
 setPendingHighlight({ x: currentDraw.x, y: currentDraw.y, width: currentDraw.width, height: currentDraw.height });
 }
 setIsDrawing(false);
 setDrawStart(null);
 setCurrentDraw(null);
 };

 const saveHighlight = async () => {
 if (!pendingHighlight) return;
 setIsSavingHighlight(true);
 try {
 const res = await apiFetch(`/api/documents/${documentId}/annotation-comments`, {
 method: 'POST',
 headers: { 'Content-Type': 'application/json' },
 body: JSON.stringify({
 type: 'HIGHLIGHT_PDF',
 content: pendingComment,
 color: selectedColor,
 pageNumber: currentPage,
 x: pendingHighlight.x,
 y: pendingHighlight.y,
 width: pendingHighlight.width,
 height: pendingHighlight.height,
 }),
 });
 if (res.ok) {
 await fetchAnnotations();
 setPendingHighlight(null);
 setPendingComment('');
 }
 } finally {
 setIsSavingHighlight(false);
 }
 };

 const deleteAnnotation = async (annotationId: string) => {
 const res = await apiFetch(`/api/documents/${documentId}/annotation-comments/${annotationId}`, {
 method: 'DELETE',
 });
 if (res.ok) {
 setAnnotations(prev => prev.filter(a => a.id !== annotationId));
 if (openThreadId === annotationId) setOpenThreadId(null);
 }
 };

 // ============================================
 // KEYBOARD
 // ============================================

 useEffect(() => {
 const handleKeyDown = (e: KeyboardEvent) => {
 if (e.key === 'Escape') {
 if (pendingHighlight) { setPendingHighlight(null); setPendingComment(''); return; }
 if (openThreadId) { setOpenThreadId(null); return; }
 if (showNewNotePanel) { setShowNewNotePanel(false); return; }
 onClose();
 }
 if (e.key === 'ArrowLeft' && !pendingHighlight && !openThreadId) goToPage(currentPage - 1);
 if (e.key === 'ArrowRight' && !pendingHighlight && !openThreadId) goToPage(currentPage + 1);
 };
 window.addEventListener('keydown', handleKeyDown);
 return () => window.removeEventListener('keydown', handleKeyDown);
 // eslint-disable-next-line react-hooks/exhaustive-deps
 }, [currentPage, numPages, onClose, pendingHighlight, openThreadId, showNewNotePanel]);

 const currentPageAnnotations = annotations.filter(
 a => a.type === 'HIGHLIGHT_PDF' && a.pageNumber === currentPage && !a.deleted
 );

 // ============================================
 // RENDER
 // ============================================

 return (
 <div className="fixed inset-0 bg-black/90 z-50 flex flex-col">
 {/* Header */}
 <header className="bg-gray-900 text-white px-4 py-3 flex items-center justify-between shrink-0">
 <div className="flex items-center gap-4">
 <h2 className="font-medium truncate max-w-md">{fileName}</h2>
 {isPdf && numPages > 0 && (
 <span className="text-sm text-text-muted">Page {currentPage} of {numPages}</span>
 )}
 </div>

 <div className="flex items-center gap-2">
 {/* Add Note button */}
 <button
 onClick={() => { setShowNewNotePanel(true); setOpenThreadId(null); }}
 className="flex items-center gap-1 px-2 py-1.5 rounded-lg text-sm hover:bg-gray-700 text-text-muted"
 title="Add document note"
 >
 <StickyNote className="w-4 h-4" />
 <span className="hidden sm:inline">Add Note</span>
 </button>

 {/* Highlight Toggle */}
 {isPdf && (
 <button
 onClick={() => setIsHighlightMode(!isHighlightMode)}
 className={`p-2 rounded-lg transition-colors ${isHighlightMode ? 'bg-yellow-500 text-black' : 'hover:bg-gray-700 text-text-muted'}`}
 title="Toggle Highlight Mode"
 >
 <Highlighter className="w-5 h-5" />
 </button>
 )}

 {/* Color Picker */}
 {isHighlightMode && (
 <div className="flex items-center gap-1 mx-2">
 {HIGHLIGHT_COLORS.map(color => (
 <button
 key={color.name}
 onClick={() => setSelectedColor(color.hex)}
 className={`w-6 h-6 rounded-full border-2 transition-transform ${selectedColor === color.hex ? 'border-white scale-110' : 'border-transparent'}`}
 style={{ backgroundColor: hexToRgba(color.hex, 0.8) }}
 title={color.name}
 />
 ))}
 </div>
 )}

 {/* Zoom */}
 {isPdf && (
 <>
 <div className="w-px h-6 bg-gray-700 mx-2" />
 <button onClick={zoomOut} className="p-2 hover:bg-gray-700 rounded-lg text-text-muted" title="Zoom Out">
 <ZoomOut className="w-5 h-5" />
 </button>
 <span className="text-sm text-text-muted min-w-[60px] text-center">{Math.round(scale * 100)}%</span>
 <button onClick={zoomIn} className="p-2 hover:bg-gray-700 rounded-lg text-text-muted" title="Zoom In">
 <ZoomIn className="w-5 h-5" />
 </button>
 </>
 )}

 {/* Page Nav */}
 {isPdf && numPages > 1 && (
 <>
 <div className="w-px h-6 bg-gray-700 mx-2" />
 <button onClick={() => goToPage(currentPage - 1)} disabled={currentPage <= 1} className="p-2 hover:bg-gray-700 rounded-lg text-text-muted disabled:opacity-40">
 <ChevronLeft className="w-5 h-5" />
 </button>
 <button onClick={() => goToPage(currentPage + 1)} disabled={currentPage >= numPages} className="p-2 hover:bg-gray-700 rounded-lg text-text-muted disabled:opacity-40">
 <ChevronRight className="w-5 h-5" />
 </button>
 </>
 )}

 <div className="w-px h-6 bg-gray-700 mx-2" />
 <button onClick={onClose} className="p-2 hover:bg-gray-700 rounded-lg text-text-muted" title="Close">
 <X className="w-5 h-5" />
 </button>
 </div>
 </header>

 {/* Main Content */}
 <div className="flex flex-1 overflow-hidden relative">
 {/* Thumbnail Sidebar */}
 {isPdf && numPages > 0 && (
 <aside className="w-32 bg-gray-900 overflow-y-auto shrink-0 border-r border-gray-800 p-2">
 <Document file={documentUrl}>
 {Array.from({ length: numPages }, (_, i) => i + 1).map(page => (
 <button
 key={page}
 onClick={() => goToPage(page)}
 className={`w-full mb-2 p-1 rounded transition-all ${currentPage === page ? 'ring-2 ring-blue-500 bg-gray-800' : 'hover:bg-gray-800'}`}
 >
 <Page pageNumber={page} width={100} renderTextLayer={false} renderAnnotationLayer={false} />
 <span className="text-xs text-text-muted mt-1 block">{page}</span>
 </button>
 ))}
 </Document>
 </aside>
 )}

 {/* Document Area */}
 <main className="flex-1 overflow-auto flex items-start justify-center p-4">
 {isLoading && (
 <div className="flex items-center gap-2 text-text-muted mt-20">
 <Loader2 className="w-6 h-6 animate-spin" />
 Loading document...
 </div>
 )}

 {isPdf ? (
 <Document file={documentUrl} onLoadSuccess={onDocumentLoadSuccess} loading={null}>
 <div
 ref={pageContainerRef}
 className={`relative ${isHighlightMode ? 'cursor-crosshair' : ''}`}
 onMouseDown={handleMouseDown}
 onMouseMove={handleMouseMove}
 onMouseUp={handleMouseUp}
 onMouseLeave={handleMouseUp}
 >
 <Page
 pageNumber={currentPage}
 scale={scale}
 renderTextLayer={true}
 renderAnnotationLayer={true}
 className={isHighlightMode ? 'pointer-events-none select-none' : ''}
 />

 {/* Highlight overlays */}
 {currentPageAnnotations.map(annotation => (
 <div
 key={annotation.id}
 className="absolute group z-10 cursor-pointer"
 style={{
 left: `${annotation.x}%`,
 top: `${annotation.y}%`,
 width: `${annotation.width}%`,
 height: `${annotation.height}%`,
 backgroundColor: hexToRgba(annotation.color ?? '#FFFF00'),
 }}
 onClick={e => { e.stopPropagation(); setOpenThreadId(annotation.id); setShowNewNotePanel(false); }}
 >
 <div className="absolute -top-5 right-0 hidden group-hover:flex items-center gap-1 bg-gray-900 rounded px-1 py-0.5">
 <button
 onClick={e => { e.stopPropagation(); setOpenThreadId(annotation.id); setShowNewNotePanel(false); }}
 className="text-white"
 title="Open thread"
 >
 <MessageSquare className="w-3 h-3" />
 </button>
 {annotation.createdBy.id === currentUserId && (
 <button
 onClick={e => { e.stopPropagation(); deleteAnnotation(annotation.id); }}
 className="text-red-400"
 title="Delete highlight"
 >
 <Trash2 className="w-3 h-3" />
 </button>
 )}
 </div>
 </div>
 ))}

 {/* Drawing preview */}
 {currentDraw && (
 <div
 className="absolute pointer-events-none z-20"
 style={{
 left: `${currentDraw.x}%`,
 top: `${currentDraw.y}%`,
 width: `${currentDraw.width}%`,
 height: `${currentDraw.height}%`,
 backgroundColor: hexToRgba(selectedColor),
 border: '1px dashed rgba(0,0,0,0.5)',
 }}
 />
 )}

 {/* Post-draw comment popover */}
 {pendingHighlight && (
 <div
 className="absolute z-30 bg-surface border border-border rounded-lg shadow-xl p-3 w-64"
 style={{ left: `${Math.min(pendingHighlight.x, 60)}%`, top: `${pendingHighlight.y + pendingHighlight.height + 1}%` }}
 >
 <p className="text-xs font-medium text-text-secondary mb-2">Add comment (optional)</p>
 <textarea
 value={pendingComment}
 onChange={e => setPendingComment(e.target.value)}
 placeholder="What does this highlight mean?"
 className="w-full text-sm border border-border-strong rounded px-2 py-1 bg-white text-text-primary resize-none focus:outline-none focus:ring-1 focus:ring-primary-500"
 rows={3}
 autoFocus
 />
 <div className="flex gap-2 mt-2">
 <button
 onClick={saveHighlight}
 disabled={isSavingHighlight}
 className="flex-1 text-xs px-2 py-1.5 bg-primary-500 text-white rounded hover:bg-primary-600 disabled:opacity-50"
 >
 {isSavingHighlight ? 'Saving...' : 'Save'}
 </button>
 <button
 onClick={() => { setPendingHighlight(null); setPendingComment(''); }}
 className="flex-1 text-xs px-2 py-1.5 bg-gray-200 text-text-secondary rounded hover:bg-gray-300"
 >
 Cancel
 </button>
 </div>
 </div>
 )}
 </div>
 </Document>
 ) : isHtml ? (
 <div className="w-full h-[80vh]">
 <iframe
 src={documentUrl}
 title={fileName}
 className="w-full h-full border-0"
 sandbox="allow-same-origin"
 onLoad={() => setIsLoading(false)}
 />
 </div>
 ) : (
 <div ref={pageContainerRef} className="relative">
 <img
 src={documentUrl}
 alt={fileName}
 className="max-w-full max-h-[80vh] object-contain"
 onLoad={() => setIsLoading(false)}
 />
 </div>
 )}
 </main>

 {/* Thread Panel */}
 {(openThreadId || showNewNotePanel) && (
 <AnnotationThreadPanel
 resourceType="document"
 resourceId={documentId}
 rootCommentId={openThreadId}
 initialType="DOCUMENT_NOTE"
 currentUserId={currentUserId}
 currentUserName={currentUserName}
 onClose={() => { setOpenThreadId(null); setShowNewNotePanel(false); }}
 onCreated={comment => {
 setAnnotations(prev => [...prev, {
 ...comment,
 pageNumber: null,
 color: null,
 x: null,
 y: null,
 width: null,
 height: null,
 } as AnnotationComment]);
 setShowNewNotePanel(false);
 setOpenThreadId(comment.id);
 }}
 />
 )}
 </div>
 </div>
 );
}

export default DocumentViewer;
