'use client';

import React, { useState, useEffect } from 'react';
import {
    format, startOfMonth, endOfMonth, startOfWeek, endOfWeek,
    eachDayOfInterval, addMonths, subMonths, isSameMonth,
    isSameDay, isToday, parseISO, startOfDay
} from 'date-fns';
import { ChevronLeft, ChevronRight, Loader2, Plus } from 'lucide-react';
import {
    DndContext,
    useDraggable,
    useDroppable,
    DragOverlay,
    MouseSensor,
    TouchSensor,
    useSensor,
    useSensors
} from '@dnd-kit/core';
import { cn } from '@/lib/utils';
import { AddTaskModal } from '../AddTaskModal';

// --- Types ---
type Task = {
    id: string;
    title: string;
    dueDate: string;
    priority: string;
    status: string;
    case?: {
        caseNumber: string;
        clientName: string;
    };
};

function DraggableTask({ task }: { task: Task }) {
    const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
        id: task.id,
        data: task,
    });

    const priorityColors = {
        HIGH: 'bg-red-100 text-red-700 border-red-200 dark:bg-red-900/30 dark:text-red-300 dark:border-red-800',
        MEDIUM: 'bg-yellow-100 text-yellow-700 border-yellow-200 dark:bg-yellow-900/30 dark:text-yellow-300 dark:border-yellow-800',
        LOW: 'bg-blue-100 text-blue-700 border-blue-200 dark:bg-blue-900/30 dark:text-blue-300 dark:border-blue-800',
    };

    return (
        <div
            ref={setNodeRef}
            {...listeners}
            {...attributes}
            className={cn(
                "p-2 mb-1 rounded text-xs border cursor-grab active:cursor-grabbing shadow-sm",
                priorityColors[task.priority as keyof typeof priorityColors] || priorityColors.MEDIUM,
                isDragging ? "opacity-50" : "opacity-100"
            )}
        >
            <div className="font-semibold truncate">{task.title}</div>
            {task.case && (
                <div className="text-[10px] opacity-75 truncate">{task.case.clientName}</div>
            )}
        </div>
    );
}

function DroppableDay({ date, children, isCurrentMonth }: { date: Date, children: React.ReactNode, isCurrentMonth: boolean }) {
    // Unique ID for the droppable area: date string
    const dateStr = date.toISOString();
    const { setNodeRef, isOver } = useDroppable({
        id: dateStr,
        data: { date },
    });

    const isCurrentDay = isToday(date);

    return (
        <div
            ref={setNodeRef}
            className={cn(
                "min-h-[100px] border border-gray-700/30 p-2 transition-colors flex flex-col group",
                !isCurrentMonth && "bg-gray-900/50 text-gray-500",
                isCurrentMonth && "bg-gray-800/20",
                isOver && "bg-blue-500/10 border-blue-500/50",
                isCurrentDay && "bg-blue-900/10"
            )}
        >
            <div className={cn(
                "text-sm font-medium mb-2 w-7 h-7 flex items-center justify-center rounded-full",
                isCurrentDay ? "bg-blue-600 text-white" : "text-gray-400"
            )}>
                {format(date, 'd')}
            </div>
            <div className="flex-1 space-y-1">
                {children}
            </div>
            {/* Hover 'add' button could retrieve day logic here */}
        </div>
    );
}

export function CalendarView() {
    const [currentDate, setCurrentDate] = useState(new Date());
    const [tasks, setTasks] = useState<Task[]>([]);
    const [loading, setLoading] = useState(false);
    const [activeDragItem, setActiveDragItem] = useState<Task | null>(null);
    const [isTaskModalOpen, setIsTaskModalOpen] = useState(false);

    // Setup fetching range
    const monthStart = startOfMonth(currentDate);
    const monthEnd = endOfMonth(currentDate);
    const calendarStart = startOfWeek(monthStart);
    const calendarEnd = endOfWeek(monthEnd);

    // Fetch tasks
    const fetchTasks = async () => {
        setLoading(true);
        try {
            const startStr = calendarStart.toISOString();
            const endStr = calendarEnd.toISOString();
            const res = await fetch(`/api/tasks?start=${startStr}&end=${endStr}`);
            if (res.ok) {
                const data = await res.json();
                setTasks(data);
            }
        } catch (e) {
            console.error(e);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchTasks();
    }, [currentDate]);

    // Dnd Sensors
    const sensors = useSensors(
        useSensor(MouseSensor, { activationConstraint: { distance: 10 } }),
        useSensor(TouchSensor, { activationConstraint: { delay: 250, tolerance: 5 } })
    );

    const handleDragStart = (event: any) => {
        setActiveDragItem(event.active.data.current);
    };

    const handleDragEnd = async (event: any) => {
        const { active, over } = event;
        setActiveDragItem(null);

        if (!over) return;

        const taskId = active.id;
        const newDateStr = over.id; // We stored ISO string in Droppable ID

        // Optimistic update
        const originalTasks = [...tasks];
        const updatedTasks = tasks.map(t => {
            if (t.id === taskId) {
                return { ...t, dueDate: newDateStr };
            }
            return t;
        });
        setTasks(updatedTasks);

        try {
            const res = await fetch(`/api/tasks/${taskId}`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ dueDate: newDateStr })
            });

            if (!res.ok) {
                throw new Error('Failed to update');
            }
        } catch (e) {
            console.error("Failed to move task", e);
            // Revert
            setTasks(originalTasks);
            // Ideally show toast here
        }
    };

    const days = eachDayOfInterval({ start: calendarStart, end: calendarEnd });

    return (
        <div className="h-full flex flex-col">
            {/* Header */}
            <div className="p-4 flex items-center justify-between border-b border-gray-700">
                <div className="flex items-center gap-4">
                    <h2 className="text-xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-white to-gray-400">
                        {format(currentDate, 'MMMM yyyy')}
                    </h2>
                    <div className="flex gap-1 border border-gray-600 rounded-lg p-1">
                        <button onClick={() => setCurrentDate(subMonths(currentDate, 1))} className="p-1 hover:bg-gray-700 rounded"><ChevronLeft size={20} /></button>
                        <button onClick={() => setCurrentDate(addMonths(currentDate, 1))} className="p-1 hover:bg-gray-700 rounded"><ChevronRight size={20} /></button>
                    </div>
                </div>
                <button
                    onClick={() => setIsTaskModalOpen(true)}
                    className="flex items-center gap-2 bg-blue-600 hover:bg-blue-500 px-3 py-2 rounded-lg text-sm font-medium transition-colors"
                >
                    <Plus size={16} /> New Task
                </button>
            </div>

            {/* Grid Header */}
            <div className="grid grid-cols-7 border-b border-gray-700 bg-gray-900/50">
                {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
                    <div key={day} className="py-2 text-center text-xs font-semibold text-gray-400 uppercase tracking-wider">
                        {day}
                    </div>
                ))}
            </div>

            {/* Grid Body */}
            <DndContext
                sensors={sensors}
                onDragStart={handleDragStart}
                onDragEnd={handleDragEnd}
            >
                <div className="flex-1 grid grid-cols-7 auto-rows-fr overflow-y-auto">
                    {days.map((day) => {
                        const dayTasks = tasks.filter(t => isSameDay(parseISO(t.dueDate), day));
                        return (
                            <DroppableDay
                                key={day.toISOString()}
                                date={day}
                                isCurrentMonth={isSameMonth(day, currentDate)}
                            >
                                {dayTasks.map(task => (
                                    <DraggableTask key={task.id} task={task} />
                                ))}
                            </DroppableDay>
                        );
                    })}
                </div>

                <DragOverlay>
                    {activeDragItem ? (
                        <div className="p-2 rounded text-xs border shadow-lg bg-blue-600 text-white w-[150px] opacity-90 cursor-grabbing">
                            <div className="font-semibold">{activeDragItem.title}</div>
                        </div>
                    ) : null}
                </DragOverlay>
            </DndContext>

            <AddTaskModal
                isOpen={isTaskModalOpen}
                onClose={() => setIsTaskModalOpen(false)}
                onSubmit={async (data) => {
                    try {
                        const res = await fetch('/api/tasks', {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({
                                ...data,
                                dueDate: data.dueDate.toISOString()
                            })
                        });

                        if (res.ok) {
                            fetchTasks();
                        } else {
                            console.error('Failed to create task');
                        }
                    } catch (error) {
                        console.error('Error creating task:', error);
                    }
                }}
            />
        </div>
    );
}
