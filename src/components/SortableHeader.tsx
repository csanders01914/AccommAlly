import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { Filter } from 'lucide-react';
import { useState } from 'react';
import { cn } from '@/lib/utils';

interface SortableHeaderProps {
    id: string;
    children: React.ReactNode;
    onClick?: () => void;
    onFilter?: (val: string) => void;
    filterValue?: string;
    width?: number;
    onResize?: (width: number) => void;
}

export function SortableHeader({ id, children, onClick, onFilter, filterValue, width, onResize }: SortableHeaderProps) {
    const {
        attributes,
        listeners,
        setNodeRef,
        transform,
        transition,
        isDragging
    } = useSortable({ id });

    const [isFilterOpen, setIsFilterOpen] = useState(false);

    const style = {
        transform: CSS.Translate.toString(transform),
        transition,
        cursor: 'default', // Cursor handled by inner elements
        touchAction: 'none',
        position: 'relative' as const,
        zIndex: isDragging ? 50 : 'auto',
        opacity: isDragging ? 0.8 : 1,
        width: width,
        minWidth: width,
        maxWidth: width,
        borderRadius: isDragging ? '8px' : '0', // Rounded corners while dragging
    };

    const handleResizePointerDown = (e: React.PointerEvent) => {
        e.preventDefault();
        e.stopPropagation(); // Stop DnD
        const startX = e.clientX;
        const startWidth = width || 100;

        const onMove = (moveEvent: PointerEvent) => {
            const delta = moveEvent.clientX - startX;
            onResize?.(Math.max(50, startWidth + delta));
        };

        const onUp = () => {
            document.removeEventListener('pointermove', onMove);
            document.removeEventListener('pointerup', onUp);
        };

        document.addEventListener('pointermove', onMove);
        document.addEventListener('pointerup', onUp);
    };

    // Keyboard resize support
    const handleResizeKeyDown = (e: React.KeyboardEvent) => {
        if (!width || !onResize) return;
        if (e.key === 'ArrowLeft') {
            e.preventDefault();
            e.stopPropagation();
            onResize(Math.max(50, width - 10));
        } else if (e.key === 'ArrowRight') {
            e.preventDefault();
            e.stopPropagation();
            onResize(width + 10);
        }
    };

    return (
        <th
            ref={setNodeRef}
            style={style}
            className="p-0 bg-transparent border-b border-white/10 dark:border-gray-700/30 select-none group relative overflow-hidden"
            aria-sort={undefined}
        >
            {/* Main Sort Button - Wraps content */}
            <div className="flex w-full h-full items-stretch">
                <button
                    type="button"
                    {...attributes}
                    {...listeners}
                    onClick={() => !isFilterOpen && onClick?.()}
                    className="flex-1 px-4 py-3 text-left font-medium text-gray-700 dark:text-gray-300 hover:bg-white/20 dark:hover:bg-gray-700/50 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-inset truncate flex items-center gap-1"
                >
                    <span className="truncate flex-1">{children}</span>
                </button>

                {onFilter && (
                    <div className="flex items-center pr-1 bg-transparent">
                        <button
                            type="button"
                            aria-label="Filter"
                            aria-haspopup="true"
                            aria-expanded={isFilterOpen}
                            onPointerDown={(e) => e.stopPropagation()} // Prevent DnD
                            onClick={(e) => {
                                e.stopPropagation();
                                setIsFilterOpen(!isFilterOpen);
                            }}
                            className={cn(
                                "p-1.5 rounded hover:bg-white/20 dark:hover:bg-gray-600/50 transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500",
                                filterValue ? "text-blue-600" : "text-gray-400 opacity-0 group-hover:opacity-100 focus:opacity-100"
                            )}
                        >
                            <Filter className="w-3.5 h-3.5" />
                        </button>
                    </div>
                )}
            </div>

            {/* Resize Handle */}
            {onResize && (
                <div
                    role="separator"
                    aria-orientation="vertical"
                    aria-label="Resize Column"
                    aria-valuenow={width}
                    aria-valuemin={50}
                    aria-valuemax={1000}
                    tabIndex={0}
                    onKeyDown={handleResizeKeyDown}
                    onPointerDown={handleResizePointerDown}
                    onClick={(e) => e.stopPropagation()}
                    className="absolute right-0 top-0 bottom-0 w-1.5 cursor-col-resize hover:bg-blue-400 z-10 focus:bg-blue-600 focus:outline-none transition-colors"
                />
            )}

            {isFilterOpen && (
                <>
                    <div
                        className="fixed inset-0 z-40 bg-transparent"
                        onClick={(e) => {
                            e.stopPropagation();
                            setIsFilterOpen(false);
                        }}
                    />
                    <div
                        className="absolute top-full left-0 mt-1 w-48 bg-white dark:bg-gray-800 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700 p-2 z-50 pointer-events-auto cursor-default"
                        onPointerDown={(e) => e.stopPropagation()}
                        onClick={(e) => e.stopPropagation()}
                        role="dialog"
                        aria-label="Filter Column"
                    >
                        <input
                            type="text"
                            placeholder="Filter..."
                            value={filterValue || ''}
                            onChange={(e) => onFilter?.(e.target.value)}
                            className="w-full px-2 py-1 text-xs border border-gray-300 dark:border-gray-600 rounded bg-transparent text-gray-900 dark:text-white focus:outline-none focus:border-blue-500"
                            autoFocus
                        />
                    </div>
                </>
            )}
        </th>
    );
}
