'use client';

import React from 'react';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { cn } from '@/lib/utils';
import { GripHorizontal } from 'lucide-react';

interface SortableWidgetProps {
    id: string;
    className?: string;
    defaultPosition?: 'full' | 'half' | 'third';
    children: React.ReactNode;
    onRemove?: () => void;
}

export function SortableWidget({ id, className, children, onRemove }: SortableWidgetProps) {
    const {
        attributes,
        listeners,
        setNodeRef,
        transform,
        transition,
        isDragging,
    } = useSortable({ id });

    const style = {
        transform: CSS.Transform.toString(transform),
        transition,
        zIndex: isDragging ? 50 : undefined,
    };

    return (
        <div
            ref={setNodeRef}
            style={style}
            className={cn(
                "relative group bg-white/80 dark:bg-gray-900/40 backdrop-blur-md rounded-xl border border-white/50 dark:border-gray-700/30 shadow-md transition-all h-full flex flex-col",
                isDragging && "shadow-xl ring-2 ring-blue-500/50 opacity-90 scale-[1.02]",
                className
            )}
        >
            {/* Drag Handle - Only visible on hover or dragging */}
            <div
                {...attributes}
                {...listeners}
                className="absolute top-2 right-2 p-1.5 rounded-md hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-400 opacity-0 group-hover:opacity-100 transition-opacity cursor-grab active:cursor-grabbing z-10"
            >
                <GripHorizontal className="w-4 h-4" />
            </div>

            {/* Widget Content */}
            <div className="flex-1 overflow-hidden">
                {children}
            </div>
        </div>
    );
}
