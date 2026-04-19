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
    Loader2
} from 'lucide-react';

// Configure PDF.js worker
// Configure PDF.js worker
pdfjs.GlobalWorkerOptions.workerSrc = `//unpkg.com/pdfjs-dist@${pdfjs.version}/build/pdf.worker.min.mjs`;

// ============================================
// TYPES
// ============================================

interface Annotation {
    id: string;
    pageNumber: number;
    color: string;
    x: number;
    y: number;
    width: number;
    height: number;
    createdBy?: { id: string; name: string };
}

interface DocumentViewerProps {
    documentId: string;
    fileName: string;
    fileType: string;
    currentUserId: string;
    onClose: () => void;
}

// ============================================
// HIGHLIGHT COLORS
// ============================================

const HIGHLIGHT_COLORS = [
    { name: 'Yellow', value: 'rgba(255, 255, 0, 0.4)' },
    { name: 'Green', value: 'rgba(0, 255, 0, 0.4)' },
    { name: 'Blue', value: 'rgba(0, 150, 255, 0.4)' },
    { name: 'Pink', value: 'rgba(255, 100, 150, 0.4)' },
    { name: 'Orange', value: 'rgba(255, 165, 0, 0.4)' },
];

// ============================================
// COMPONENT
// ============================================

export function DocumentViewer({
    documentId,
    fileName,
    fileType,
    currentUserId,
    onClose,
}: DocumentViewerProps) {
    // PDF state
    const [numPages, setNumPages] = useState<number>(0);
    const [currentPage, setCurrentPage] = useState(1);
    const [scale, setScale] = useState(1.0);
    const [isLoading, setIsLoading] = useState(true);

    // Annotations state
    const [annotations, setAnnotations] = useState<Annotation[]>([]);
    const [selectedColor, setSelectedColor] = useState(HIGHLIGHT_COLORS[0].value);
    const [isHighlightMode, setIsHighlightMode] = useState(false);
    const [isDrawing, setIsDrawing] = useState(false);
    const [drawStart, setDrawStart] = useState<{ x: number; y: number } | null>(null);
    const [currentDraw, setCurrentDraw] = useState<{ x: number; y: number; width: number; height: number } | null>(null);

    // Interaction state
    const [selectedAnnotationId, setSelectedAnnotationId] = useState<string | null>(null);
    const [interactionMode, setInteractionMode] = useState<'NONE' | 'MOVING' | 'RESIZING'>('NONE');
    const [resizeHandle, setResizeHandle] = useState<'top-left' | 'top-right' | 'bottom-left' | 'bottom-right' | null>(null);
    const [dragStart, setDragStart] = useState<{ x: number; y: number } | null>(null);
    const [initialAnnotationState, setInitialAnnotationState] = useState<Annotation | null>(null);

    // Refs
    const pageContainerRef = useRef<HTMLDivElement>(null);
    const canvasRef = useRef<HTMLCanvasElement>(null);

    const isPdf = fileType === 'application/pdf';
    const isHtml = fileType === 'text/html' || fileType === 'message/rfc822' || fileType === 'application/vnd.ms-outlook';
    const documentUrl = `/api/documents/${documentId}/view`;

    // ============================================
    // FETCH ANNOTATIONS
    // ============================================

    const fetchAnnotations = useCallback(async () => {
        try {
            const response = await fetch(`/api/documents/${documentId}/annotations`);
            if (response.ok) {
                const data = await response.json();
                setAnnotations(data);
            }
        } catch (error) {
            console.error('Error fetching annotations:', error);
        }
    }, [documentId]);

    useEffect(() => {
        fetchAnnotations();
        // Clear selection on page change
        setSelectedAnnotationId(null);
    }, [fetchAnnotations, currentPage]);

    // ============================================
    // PDF HANDLERS
    // ============================================

    const onDocumentLoadSuccess = ({ numPages }: { numPages: number }) => {
        setNumPages(numPages);
        setIsLoading(false);
    };

    const goToPage = (page: number) => {
        if (page >= 1 && page <= numPages) {
            setCurrentPage(page);
        }
    };

    const zoomIn = () => setScale(prev => Math.min(prev + 0.25, 3));
    const zoomOut = () => setScale(prev => Math.max(prev - 0.25, 0.5));

    // ============================================
    // ANNOTATION HANDLERS
    // ============================================

    const saveAnnotation = async (annotation: Omit<Annotation, 'id' | 'createdBy'>) => {
        try {
            const response = await fetch(`/api/documents/${documentId}/annotations`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    ...annotation,
                    userId: currentUserId,
                }),
            });
            if (response.ok) {
                await fetchAnnotations();
            }
        } catch (error) {
            console.error('Error saving annotation:', error);
        }
    };

    const updateAnnotation = async (id: string, updates: Partial<Annotation>) => {
        try {
            // Optimistic update
            setAnnotations(prev => prev.map(a => a.id === id ? { ...a, ...updates } : a));

            const response = await fetch(`/api/documents/${documentId}/annotations`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    annotationId: id,
                    ...updates
                }),
            });

            if (!response.ok) {
                // Revert on failure
                fetchAnnotations();
            }
        } catch (error) {
            console.error('Error updating annotation:', error);
            fetchAnnotations();
        }
    };

    const deleteAnnotation = async (annotationId: string) => {
        try {
            const response = await fetch(
                `/api/documents/${documentId}/annotations?annotationId=${annotationId}`,
                { method: 'DELETE' }
            );
            if (response.ok) {
                setAnnotations(prev => prev.filter(a => a.id !== annotationId));
                if (selectedAnnotationId === annotationId) {
                    setSelectedAnnotationId(null);
                }
            }
        } catch (error) {
            console.error('Error deleting annotation:', error);
        }
    };

    // ============================================
    // INTERACTION HANDLERS
    // ============================================

    const handleAnnotationMouseDown = (e: React.MouseEvent, annotation: Annotation) => {
        if (isHighlightMode) return;

        setSelectedAnnotationId(annotation.id);
        setInteractionMode('MOVING'); // Default to moving if not on a handle
        setDragStart({ x: e.clientX, y: e.clientY });
        setInitialAnnotationState({ ...annotation });
    };

    const handleResizeStart = (e: React.MouseEvent, annotation: Annotation, handle: string) => {
        e.stopPropagation();
        setInteractionMode('RESIZING');
        setResizeHandle(handle as any);
        setDragStart({ x: e.clientX, y: e.clientY });
        setInitialAnnotationState({ ...annotation });
    };

    const handleMouseDown = (e: React.MouseEvent<HTMLDivElement>) => {
        // If clicking empty space, clear selection
        if (!isHighlightMode && !isDrawing && interactionMode === 'NONE') {
            // Only clear if we didn't just click an annotation (handled by stopPropagation in annotationMouseDown)
            setSelectedAnnotationId(null);
        }

        if (!isHighlightMode || !pageContainerRef.current) return;

        const rect = pageContainerRef.current.getBoundingClientRect();
        const x = ((e.clientX - rect.left) / rect.width) * 100;
        const y = ((e.clientY - rect.top) / rect.height) * 100;

        setIsDrawing(true);
        setDrawStart({ x, y });
        setCurrentDraw({ x, y, width: 0, height: 0 });
    };

    const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
        if (!pageContainerRef.current) return;
        const rect = pageContainerRef.current.getBoundingClientRect();

        // Handle Drawing
        if (isDrawing && drawStart) {
            const currentX = ((e.clientX - rect.left) / rect.width) * 100;
            const currentY = ((e.clientY - rect.top) / rect.height) * 100;

            const x = Math.min(drawStart.x, currentX);
            const y = Math.min(drawStart.y, currentY);
            const width = Math.abs(currentX - drawStart.x);
            const height = Math.abs(currentY - drawStart.y);

            setCurrentDraw({ x, y, width, height });
            return;
        }

        // Handle Interaction (Move/Resize)
        if (interactionMode !== 'NONE' && dragStart && initialAnnotationState) {
            const deltaXPixels = e.clientX - dragStart.x;
            const deltaYPixels = e.clientY - dragStart.y;

            // Convert pixels to percentage logic
            const deltaXPercent = (deltaXPixels / rect.width) * 100;
            const deltaYPercent = (deltaYPixels / rect.height) * 100;

            if (interactionMode === 'MOVING') {
                const newX = initialAnnotationState.x + deltaXPercent;
                const newY = initialAnnotationState.y + deltaYPercent;

                // Update local state immediately for responsiveness
                setAnnotations(prev => prev.map(a =>
                    a.id === initialAnnotationState.id
                        ? { ...a, x: newX, y: newY }
                        : a
                ));
            } else if (interactionMode === 'RESIZING' && resizeHandle) {
                let newX = initialAnnotationState.x;
                let newY = initialAnnotationState.y;
                let newWidth = initialAnnotationState.width;
                let newHeight = initialAnnotationState.height;

                if (resizeHandle.includes('left')) {
                    newX += deltaXPercent;
                    newWidth -= deltaXPercent;
                } else {
                    newWidth += deltaXPercent;
                }

                if (resizeHandle.includes('top')) {
                    newY += deltaYPercent;
                    newHeight -= deltaYPercent;
                } else {
                    newHeight += deltaYPercent;
                }

                // Prevent negative dimensions
                if (newWidth > 0 && newHeight > 0) {
                    setAnnotations(prev => prev.map(a =>
                        a.id === initialAnnotationState.id
                            ? { ...a, x: newX, y: newY, width: newWidth, height: newHeight }
                            : a
                    ));
                }
            }
        }
    };

    const handleMouseUp = async () => {
        // Finish drawing
        if (isDrawing && currentDraw) {
            // Only save if there's a meaningful selection
            if (currentDraw.width > 1 && currentDraw.height > 1) {
                await saveAnnotation({
                    pageNumber: currentPage,
                    color: selectedColor,
                    x: currentDraw.x,
                    y: currentDraw.y,
                    width: currentDraw.width,
                    height: currentDraw.height,
                });
            }
            setIsDrawing(false);
            setDrawStart(null);
            setCurrentDraw(null);
        }

        // Finish interaction
        if (interactionMode !== 'NONE' && initialAnnotationState) {
            // Find the currently modified annotation to parse final values
            const modified = annotations.find(a => a.id === initialAnnotationState.id);
            if (modified) {
                // Ensure values are normalized
                const updates = {
                    x: modified.x,
                    y: modified.y,
                    width: modified.width,
                    height: modified.height
                };

                // If width/height became negative during resize (flip), normalize them
                if (updates.width < 0) {
                    updates.x += updates.width;
                    updates.width = Math.abs(updates.width);
                }
                if (updates.height < 0) {
                    updates.y += updates.height;
                    updates.height = Math.abs(updates.height);
                }

                await updateAnnotation(modified.id, updates);
            }

            setInteractionMode('NONE');
            setDragStart(null);
            setInitialAnnotationState(null);
            setResizeHandle(null);
        }
    };

    // ============================================
    // KEYBOARD NAVIGATION
    // ============================================

    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key === 'Escape') onClose();
            if (e.key === 'ArrowLeft') goToPage(currentPage - 1);
            if (e.key === 'ArrowRight') goToPage(currentPage + 1);
            if ((e.key === 'Delete' || e.key === 'Backspace') && selectedAnnotationId) {
                deleteAnnotation(selectedAnnotationId);
            }
        };

        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [currentPage, numPages, onClose, selectedAnnotationId]);

    // Filter annotations for current page
    const currentPageAnnotations = annotations.filter(a => a.pageNumber === currentPage);

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
                        <span className="text-sm text-gray-400">
                            Page {currentPage} of {numPages}
                        </span>
                    )}
                </div>

                <div className="flex items-center gap-2">
                    {/* Highlight Toggle */}
                    <button
                        onClick={() => setIsHighlightMode(!isHighlightMode)}
                        className={`p-2 rounded-lg transition-colors ${isHighlightMode
                            ? 'bg-yellow-500 text-black'
                            : 'hover:bg-gray-700 text-gray-300'
                            }`}
                        title="Toggle Highlight Mode"
                    >
                        <Highlighter className="w-5 h-5" />
                    </button>

                    {/* Color Picker */}
                    {isHighlightMode && (
                        <div className="flex items-center gap-1 mx-2">
                            {HIGHLIGHT_COLORS.map((color) => (
                                <button
                                    key={color.name}
                                    onClick={() => setSelectedColor(color.value)}
                                    className={`w-6 h-6 rounded-full border-2 transition-transform ${selectedColor === color.value
                                        ? 'border-white scale-110'
                                        : 'border-transparent'
                                        }`}
                                    style={{ backgroundColor: color.value.replace('0.4', '0.8') }}
                                    title={color.name}
                                />
                            ))}
                        </div>
                    )}

                    {/* Zoom Controls */}
                    {isPdf && (
                        <>
                            <div className="w-px h-6 bg-gray-700 mx-2" />
                            <button
                                onClick={zoomOut}
                                className="p-2 hover:bg-gray-700 rounded-lg text-gray-300"
                                title="Zoom Out"
                            >
                                <ZoomOut className="w-5 h-5" />
                            </button>
                            <span className="text-sm text-gray-400 min-w-[60px] text-center">
                                {Math.round(scale * 100)}%
                            </span>
                            <button
                                onClick={zoomIn}
                                className="p-2 hover:bg-gray-700 rounded-lg text-gray-300"
                                title="Zoom In"
                            >
                                <ZoomIn className="w-5 h-5" />
                            </button>
                        </>
                    )}

                    <div className="w-px h-6 bg-gray-700 mx-2" />
                    <button
                        onClick={onClose}
                        className="p-2 hover:bg-gray-700 rounded-lg text-gray-300"
                        title="Close"
                    >
                        <X className="w-5 h-5" />
                    </button>
                </div>
            </header>

            {/* Main Content */}
            <div className="flex flex-1 overflow-hidden">
                {/* Thumbnail Sidebar */}
                {isPdf && numPages > 0 && (
                    <aside className="w-32 bg-gray-900 overflow-y-auto shrink-0 border-r border-gray-800 p-2">
                        <Document file={documentUrl}>
                            {Array.from({ length: numPages }, (_, i) => i + 1).map((page) => (
                                <button
                                    key={page}
                                    onClick={() => goToPage(page)}
                                    className={`w-full mb-2 p-1 rounded transition-all ${currentPage === page
                                        ? 'ring-2 ring-blue-500 bg-gray-800'
                                        : 'hover:bg-gray-800'
                                        }`}
                                >
                                    <Page
                                        pageNumber={page}
                                        width={100}
                                        renderTextLayer={false}
                                        renderAnnotationLayer={false}
                                    />
                                    <span className="text-xs text-gray-400 mt-1 block">
                                        {page}
                                    </span>
                                </button>
                            ))}
                        </Document>
                    </aside>
                )}

                {/* Document View */}
                <main className="flex-1 overflow-auto flex items-start justify-center p-4">
                    {isLoading && (
                        <div className="flex items-center gap-2 text-gray-400 mt-20">
                            <Loader2 className="w-6 h-6 animate-spin" />
                            Loading document...
                        </div>
                    )}

                    {isPdf ? (
                        <Document
                            file={documentUrl}
                            onLoadSuccess={onDocumentLoadSuccess}
                            loading={null}
                        >
                            <div
                                ref={pageContainerRef}
                                className={`relative ${isHighlightMode ? 'cursor-crosshair z-10' : ''}`}
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

                                {/* Annotation Overlays */}
                                {currentPageAnnotations.map((annotation) => {
                                    const isSelected = selectedAnnotationId === annotation.id;

                                    return (
                                        <div
                                            key={annotation.id}
                                            className={`absolute group transition-colors ${isSelected ? 'z-20 border-2 border-blue-500' : 'z-10'}`}
                                            style={{
                                                left: `${annotation.x}%`,
                                                top: `${annotation.y}%`,
                                                width: `${annotation.width}%`,
                                                height: `${annotation.height}%`,
                                                backgroundColor: annotation.color,
                                                cursor: isHighlightMode ? 'crosshair' : (isSelected ? 'move' : 'pointer'),
                                            }}
                                            onMouseDown={(e) => {
                                                if (isHighlightMode) return;
                                                e.stopPropagation();
                                                handleAnnotationMouseDown(e, annotation);
                                            }}
                                        >
                                            {/* Delete Button (only show if not moving/resizing and hovered/selected) */}
                                            {!interactionMode && (
                                                <button
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        deleteAnnotation(annotation.id);
                                                    }}
                                                    className={`absolute -top-3 -right-3 w-6 h-6 bg-red-500 text-white rounded-full flex items-center justify-center shadow-md transition-opacity ${isSelected || 'opacity-0 group-hover:opacity-100'}`}
                                                    title="Delete highlight"
                                                >
                                                    <Trash2 className="w-3 h-3" />
                                                </button>
                                            )}

                                            {/* Resize Handles (only when selected) */}
                                            {isSelected && !isHighlightMode && (
                                                <>
                                                    <div
                                                        className="absolute -top-1.5 -left-1.5 w-3 h-3 bg-white border border-blue-500 cursor-nw-resize rounded-full"
                                                        onMouseDown={(e) => { e.stopPropagation(); handleResizeStart(e, annotation, 'top-left'); }}
                                                    />
                                                    <div
                                                        className="absolute -top-1.5 -right-1.5 w-3 h-3 bg-white border border-blue-500 cursor-ne-resize rounded-full"
                                                        onMouseDown={(e) => { e.stopPropagation(); handleResizeStart(e, annotation, 'top-right'); }}
                                                    />
                                                    <div
                                                        className="absolute -bottom-1.5 -left-1.5 w-3 h-3 bg-white border border-blue-500 cursor-sw-resize rounded-full"
                                                        onMouseDown={(e) => { e.stopPropagation(); handleResizeStart(e, annotation, 'bottom-left'); }}
                                                    />
                                                    <div
                                                        className="absolute -bottom-1.5 -right-1.5 w-3 h-3 bg-white border border-blue-500 cursor-se-resize rounded-full"
                                                        onMouseDown={(e) => { e.stopPropagation(); handleResizeStart(e, annotation, 'bottom-right'); }}
                                                    />
                                                </>
                                            )}
                                        </div>
                                    );
                                })}

                                {/* Current drawing overlay */}
                                {currentDraw && (
                                    <div
                                        className="absolute pointer-events-none"
                                        style={{
                                            left: `${currentDraw.x}%`,
                                            top: `${currentDraw.y}%`,
                                            width: `${currentDraw.width}%`,
                                            height: `${currentDraw.height}%`,
                                            backgroundColor: selectedColor,
                                            border: '1px dashed rgba(0,0,0,0.5)',
                                        }}
                                    />
                                )}
                            </div>
                        </Document>
                    ) : isHtml ? (
                        /* HTML viewer for email/HTML documents */
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
                        /* Image viewer for non-PDF files */
                        <div
                            ref={pageContainerRef}
                            className={`relative ${isHighlightMode ? 'cursor-crosshair' : ''}`}
                            onMouseDown={handleMouseDown}
                            onMouseMove={handleMouseMove}
                            onMouseUp={handleMouseUp}
                            onMouseLeave={handleMouseUp}
                        >
                            <img
                                src={documentUrl}
                                alt={fileName}
                                className="max-w-full max-h-[80vh] object-contain"
                                onLoad={() => setIsLoading(false)}
                            />

                            {/* Image annotations */}
                            {currentPageAnnotations.map((annotation) => {
                                const isSelected = selectedAnnotationId === annotation.id;

                                return (
                                    <div
                                        key={annotation.id}
                                        className={`absolute group transition-colors ${isSelected ? 'z-20 border-2 border-blue-500' : 'z-10'}`}
                                        style={{
                                            left: `${annotation.x}%`,
                                            top: `${annotation.y}%`,
                                            width: `${annotation.width}%`,
                                            height: `${annotation.height}%`,
                                            backgroundColor: annotation.color,
                                            cursor: isHighlightMode ? 'crosshair' : (isSelected ? 'move' : 'pointer'),
                                        }}
                                        onMouseDown={(e) => {
                                            if (isHighlightMode) return;
                                            e.stopPropagation();
                                            handleAnnotationMouseDown(e, annotation);
                                        }}
                                    >
                                        {!interactionMode && (
                                            <button
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    deleteAnnotation(annotation.id);
                                                }}
                                                className={`absolute -top-3 -right-3 w-6 h-6 bg-red-500 text-white rounded-full flex items-center justify-center shadow-md transition-opacity ${isSelected || 'opacity-0 group-hover:opacity-100'}`}
                                                title="Delete highlight"
                                            >
                                                <Trash2 className="w-3 h-3" />
                                            </button>
                                        )}

                                        {/* Resize Handles */}
                                        {isSelected && !isHighlightMode && (
                                            <>
                                                <div
                                                    className="absolute -top-1.5 -left-1.5 w-3 h-3 bg-white border border-blue-500 cursor-nw-resize rounded-full"
                                                    onMouseDown={(e) => { e.stopPropagation(); handleResizeStart(e, annotation, 'top-left'); }}
                                                />
                                                <div
                                                    className="absolute -top-1.5 -right-1.5 w-3 h-3 bg-white border border-blue-500 cursor-ne-resize rounded-full"
                                                    onMouseDown={(e) => { e.stopPropagation(); handleResizeStart(e, annotation, 'top-right'); }}
                                                />
                                                <div
                                                    className="absolute -bottom-1.5 -left-1.5 w-3 h-3 bg-white border border-blue-500 cursor-sw-resize rounded-full"
                                                    onMouseDown={(e) => { e.stopPropagation(); handleResizeStart(e, annotation, 'bottom-left'); }}
                                                />
                                                <div
                                                    className="absolute -bottom-1.5 -right-1.5 w-3 h-3 bg-white border border-blue-500 cursor-se-resize rounded-full"
                                                    onMouseDown={(e) => { e.stopPropagation(); handleResizeStart(e, annotation, 'bottom-right'); }}
                                                />
                                            </>
                                        )}
                                    </div>
                                );
                            })}

                            {/* Current drawing */}
                            {currentDraw && (
                                <div
                                    className="absolute pointer-events-none"
                                    style={{
                                        left: `${currentDraw.x}%`,
                                        top: `${currentDraw.y}%`,
                                        width: `${currentDraw.width}%`,
                                        height: `${currentDraw.height}%`,
                                        backgroundColor: selectedColor,
                                        border: '1px dashed rgba(0,0,0,0.5)',
                                    }}
                                />
                            )}
                        </div>
                    )}
                </main>
            </div>

            {/* Page Navigation Footer */}
            {isPdf && numPages > 1 && (
                <footer className="bg-gray-900 text-white px-4 py-3 flex items-center justify-center gap-4 shrink-0">
                    <button
                        onClick={() => goToPage(currentPage - 1)}
                        disabled={currentPage <= 1}
                        className="p-2 hover:bg-gray-700 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        <ChevronLeft className="w-5 h-5" />
                    </button>

                    <div className="flex items-center gap-2">
                        <input
                            type="number"
                            min={1}
                            max={numPages}
                            value={currentPage}
                            onChange={(e) => goToPage(parseInt(e.target.value) || 1)}
                            className="w-16 bg-gray-800 border border-gray-700 rounded px-2 py-1 text-center text-sm"
                        />
                        <span className="text-gray-400">/ {numPages}</span>
                    </div>

                    <button
                        onClick={() => goToPage(currentPage + 1)}
                        disabled={currentPage >= numPages}
                        className="p-2 hover:bg-gray-700 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        <ChevronRight className="w-5 h-5" />
                    </button>
                </footer>
            )}
        </div>
    );
}

export default DocumentViewer;
